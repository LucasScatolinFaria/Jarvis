import pino from "pino";

export type Logger = pino.Logger;

export interface CreateLoggerOptions {
  name: string;
  level?: string;
  pretty?: boolean;
}

/**
 * Cria um logger estruturado (JSON em produção, formatado em desenvolvimento).
 * Todo módulo deve criar o seu com `createLogger({ name: "<pacote>" })` em vez
 * de usar `console.log` diretamente — isso mantém os logs correlacionáveis.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const isProduction = process.env.NODE_ENV === "production";
  const pretty = options.pretty ?? !isProduction;

  return pino({
    name: options.name,
    level: options.level ?? process.env.LOG_LEVEL ?? "info",
    transport: pretty
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  });
}
