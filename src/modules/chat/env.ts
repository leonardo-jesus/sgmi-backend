import 'dotenv/config';

export const CHAT_ENV = {
  // Se a chave não existir, deixamos string vazia e ativamos MOCK
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  TEMPERATURE: Number(process.env.OPENAI_TEMPERATURE ?? 0.3),
  MAX_HISTORY: Number(process.env.CHAT_MAX_HISTORY ?? 20),
  TIMEOUT_MS: Number(process.env.CHAT_TIMEOUT_MS ?? 30000),

  /**
   * Quando true e não houver OPENAI_API_KEY, o serviço responde com mensagem mock.
   * Você pode desativar definindo CHAT_MOCK_WHEN_NO_KEY=false no .env
   */
  MOCK_WHEN_NO_KEY:
    (process.env.CHAT_MOCK_WHEN_NO_KEY ?? 'true').toLowerCase() !== 'false',
};

export const HAS_OPENAI_KEY = CHAT_ENV.OPENAI_API_KEY.length > 0;
