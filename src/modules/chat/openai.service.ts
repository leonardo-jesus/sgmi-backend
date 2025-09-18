import OpenAI from 'openai';
import { CHAT_ENV, HAS_OPENAI_KEY } from './env';

// Tipos do nosso app
export type Role = 'user' | 'assistant' | 'system';
export interface ChatMessage {
  role: Role;
  content: string;
}

// Tipagem esperada pelo SDK (evita o erro do "name" requerido no union)
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

let client: OpenAI | null = null;
if (HAS_OPENAI_KEY) {
  client = new OpenAI({ apiKey: CHAT_ENV.OPENAI_API_KEY });
}

export async function chatComplete(messages: ChatMessage[]) {
  // Sem chave e mock habilitado → resposta simulada
  if (!HAS_OPENAI_KEY && CHAT_ENV.MOCK_WHEN_NO_KEY) {
    const lastUser =
      [...(messages || [])].reverse().find((m) => m.role === 'user')?.content ??
      '';
    const hint = lastUser
      ? ` Você disse: "${lastUser.slice(0, 80)}"${lastUser.length > 80 ? '…' : ''}`
      : '';
    return {
      role: 'assistant' as const,
      content: `⚠️ Modo demonstração (sem OPENAI_API_KEY). Posso te ajudar quando a chave estiver configurada.${hint}`,
    };
  }

  // Sanitize + limita histórico (custo/latência)
  const safe = (messages || [])
    .filter(
      (m) => m && typeof m.content === 'string' && m.content.trim().length > 0
    )
    .map((m) => ({
      role:
        m.role === 'assistant' || m.role === 'system' || m.role === 'user'
          ? m.role
          : 'user',
      content: m.content.toString(),
    }))
    .slice(-CHAT_ENV.MAX_HISTORY);

  // Converte para o tipo do SDK (narrowing por 'role')
  const sdkMessages: ChatCompletionMessageParam[] = safe.map((m) => {
    if (m.role === 'system') return { role: 'system', content: m.content };
    if (m.role === 'assistant')
      return { role: 'assistant', content: m.content };
    return { role: 'user', content: m.content };
  });

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), CHAT_ENV.TIMEOUT_MS);

  try {
    const completion = await client!.chat.completions.create(
      {
        model: CHAT_ENV.OPENAI_MODEL,
        temperature: CHAT_ENV.TEMPERATURE,
        // ⬇️ usa o array tipado do SDK para evitar o erro TS2769
        messages: sdkMessages,
      },
      { signal: controller.signal }
    );

    const content =
      completion.choices?.[0]?.message?.content?.trim() ??
      'Desculpe, não consegui gerar uma resposta agora.';
    return { role: 'assistant' as const, content };
  } finally {
    clearTimeout(t);
  }
}
