import { Router } from 'express';
import type { Request, Response } from 'express';
import { chatComplete, ChatMessage } from './openai.service.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();

// ===== Prompt do SGMI (melhorado)
const SYSTEM_PROMPT_SGMI = `Você é o Assistente do SGMI (Sistema de Gestão de Produção Industrial).
Objetivo: ajudar usuários a entender e operar o SGMI com segurança e eficiência.

Regras de resposta:
- Escreva em português do Brasil, de forma clara e objetiva.
- Se a intenção do usuário estiver ambígua, faça 1 pergunta curta para clarificar antes de agir.
- Quando descrever passos no sistema, use itens numerados curtos (1–2 linhas cada).
- Se a dúvida for sobre conceitos do negócio (produção, lotes, ordens, relatórios), explique de forma prática.
- Se não tiver certeza, diga explicitamente que não sabe e sugira onde verificar (menu, relatório, tela).
- Não invente funcionalidades. Quando necessário, peça mais contexto (ex.: “Qual módulo/tela?”).

Formato sugerido:
- Resposta direta em 1–3 parágrafos curtos.
- Opcional: uma seção “Próximos passos” com 2–4 bullets quando couber.
`;

// ===== Carrega contexto leve (docs/sgmi-faq.md)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FAQ_PATH = path.resolve(__dirname, '../../../docs/sgmi-faq.md');

let FAQ_TEXT = '';
try {
  FAQ_TEXT = fs.readFileSync(FAQ_PATH, 'utf8');
  console.log(`[chat] FAQ carregado (${FAQ_PATH}, ${FAQ_TEXT.length} chars)`);
} catch {
  console.warn(`[chat] FAQ não encontrado em ${FAQ_PATH} (ok, contexto leve desativado).`);
}

// Seleciona até ~1500 chars mais relevantes do FAQ com base na última pergunta
function pickContext(query: string, text: string, maxChars = 1500): string {
  if (!text) return '';
  const parts = text.split(/\n{2,}/g).map(t => t.trim()).filter(Boolean);
  if (!query) return parts.slice(0, 6).join('\n\n').slice(0, maxChars);

  const qTokens = query.toLowerCase().split(/\W+/).filter(t => t.length >= 3);
  const scored = parts.map(p => {
    const l = p.toLowerCase();
    let score = 0;
    for (const t of qTokens) {
      const hits = l.split(t).length - 1;
      score += hits * 5;
    }
    // leve viés para parágrafos médios
    score += Math.min(p.length, 400) / 400;
    return { p, score };
  }).sort((a, b) => b.score - a.score);

  const out: string[] = [];
  let total = 0;
  for (const { p } of scored) {
    if (total + p.length + 2 > maxChars) break;
    out.push(p);
    total += p.length + 2;
    if (out.length >= 6) break;
  }
  return out.join('\n\n');
}

function buildMessagesForSGMI(messages: ChatMessage[]): ChatMessage[] {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const ctx = pickContext(lastUser, FAQ_TEXT);

  const preamble: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT_SGMI }];
  if (ctx) {
    preamble.push({
      role: 'system',
      content: `Contexto do SGMI (use apenas se pertinente; se não houver resposta no contexto, admita e peça detalhes):\n${ctx}`
    });
  }
  return [...preamble, ...messages];
}

/**
 * POST /api/chat
 * Header OBRIGATÓRIO: x-tenant: sgmi
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const tenant = (req.header('x-tenant') || '').toLowerCase();
    if (tenant !== 'sgmi') {
      return res.status(403).json({ error: 'Tenant não autorizado.' });
    }

    const { messages } = req.body as { messages: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages obrigatório' });
    }

    const msgs = buildMessagesForSGMI(messages);
    const answer = await chatComplete(msgs);
    return res.json(answer);
  } catch (err: any) {
    console.error('Chat error:', err?.message || err);
    return res.status(500).json({ error: 'Erro no servidor de chat.' });
  }
});

export default router;
