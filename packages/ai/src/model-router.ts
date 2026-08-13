import type { ModelTaskHint } from "@jarvis/shared";

/**
 * ModelRouter (docs/ARCHITECTURE.md seção B.6 / seção 37 do briefing).
 *
 * Decide, por requisição, qual modelo usar — sem exigir que o chamador saiba
 * nomes de modelo específicos de provedor. Fase 1: heurísticas baseadas em
 * tamanho/palavras-chave da mensagem. Fases futuras podem trocar isto por um
 * classificador aprendido, sem alterar quem consome `ModelRouter.select()`.
 */
export interface ModelRouterConfig {
  fast: string;
  default: string;
  advanced: string;
}

export interface ModelSelectionInput {
  text: string;
  /** Quando o chamador já sabe o tipo de tarefa, pula a heurística. */
  hint?: ModelTaskHint;
}

const ADVANCED_KEYWORDS =
  /\b(analis[ae]|planeje|planejamento|arquitetura|refator[ae]|revise (o|a) c[oó]digo|projeto inteiro|estrat[eé]gia|compare|investig[ae])\b/i;

// `\b` do JS é ASCII-only e não reconhece vogais acentuadas como parte de
// palavra — "olá" ou "são" no fim da string quebrariam o boundary. Em vez
// disso, usamos uma negative lookahead Unicode-aware: só casa se o próximo
// caractere (se houver) não for letra/número, tratando "á"/"ã" corretamente.
const FAST_GREETING_PATTERN =
  /^(oi|ol[aá]|e a[íi]|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|tchau|que horas s[aã]o|hora atual)(?![\p{L}\p{N}])/iu;

const ADVANCED_LENGTH_THRESHOLD = 600;
const FAST_LENGTH_THRESHOLD = 48;

export class ModelRouter {
  constructor(private readonly config: ModelRouterConfig) {}

  select(input: ModelSelectionInput): string {
    if (input.hint) {
      return this.resolveHint(input.hint);
    }

    const text = input.text.trim();

    if (text.length > ADVANCED_LENGTH_THRESHOLD || ADVANCED_KEYWORDS.test(text)) {
      return this.config.advanced;
    }

    if (text.length <= FAST_LENGTH_THRESHOLD && FAST_GREETING_PATTERN.test(text)) {
      return this.config.fast;
    }

    return this.config.default;
  }

  private resolveHint(hint: ModelTaskHint): string {
    switch (hint) {
      case "fast":
        return this.config.fast;
      case "advanced":
      case "coding":
      case "vision":
        return this.config.advanced;
      case "default":
      default:
        return this.config.default;
    }
  }
}
