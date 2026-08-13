/**
 * Validador de comandos de terminal (docs/ARCHITECTURE.md, seção 19 do
 * briefing original). Usado por qualquer ferramenta que execute comandos de
 * shell (Fase 4+) para detectar padrões destrutivos ANTES da execução,
 * independentemente do nível de permissão da ferramenta em si.
 *
 * Isto é uma defesa em profundidade: mesmo uma ferramenta L3 "genérica" de
 * execução de comando não deve rodar `rm -rf /` sem confirmação extra.
 */

export interface DestructivePattern {
  pattern: RegExp;
  description: string;
}

export interface CommandValidationResult {
  dangerous: boolean;
  matchedRule?: string;
  command: string;
}

const DESTRUCTIVE_PATTERNS: DestructivePattern[] = [
  { pattern: /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i, description: "Remoção recursiva forçada de arquivos (rm -rf)" },
  { pattern: /\bdel\s+(\/[sf]\s*)+/i, description: "Exclusão forçada/recursiva de arquivos (Windows)" },
  { pattern: /\bremove-item\b.*-recurse.*-force/i, description: "Remoção recursiva forçada (PowerShell)" },
  { pattern: /\bformat\s+[a-z]:/i, description: "Formatação de unidade de disco" },
  { pattern: /\bshutdown\b|\brestart-computer\b/i, description: "Desligamento ou reinício do sistema" },
  { pattern: /\bdiskpart\b/i, description: "Utilitário de particionamento de disco" },
  { pattern: /\bdrop\s+(table|database|schema)\b/i, description: "Remoção de tabela, schema ou banco de dados" },
  { pattern: /\bgit\s+push\s+.*--force\b/i, description: "Push forçado (pode sobrescrever histórico remoto)" },
  { pattern: /\bgit\s+reset\s+--hard\b/i, description: "Reset destrutivo do repositório local" },
  { pattern: /\bmkfs\b/i, description: "Criação de sistema de arquivos (apaga dados existentes)" },
  { pattern: />\s*\/dev\/sd[a-z]/i, description: "Escrita direta em dispositivo de bloco" },
  { pattern: /\breg\s+delete\b/i, description: "Remoção de chave de registro do Windows" },
  { pattern: /\bnet\s+user\b.*\/delete\b/i, description: "Remoção de conta de usuário do sistema" },
];

export class CommandValidator {
  /** Retorna se o comando corresponde a algum padrão destrutivo conhecido. */
  validate(command: string): CommandValidationResult {
    for (const rule of DESTRUCTIVE_PATTERNS) {
      if (rule.pattern.test(command)) {
        return { dangerous: true, matchedRule: rule.description, command };
      }
    }
    return { dangerous: false, command };
  }
}
