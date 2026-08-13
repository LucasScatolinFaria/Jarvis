/**
 * Níveis de permissão do sistema (docs/ARCHITECTURE.md, seção "Segurança").
 *
 * Toda ferramenta declara o nível mínimo necessário para ser executada.
 * O `PermissionEngine` (packages/security) compara esse nível com o nível
 * máximo concedido à sessão/usuário para decidir `allow` | `confirm` | `deny`.
 */
export enum PermissionLevel {
  /** Somente leitura: consultar dados, sem qualquer efeito colateral. */
  L0_READ_ONLY = 0,
  /** Ações simples e reversíveis (abrir um app, tocar/pausar mídia). */
  L1_SIMPLE_ACTION = 1,
  /** Criar/editar/mover arquivos do usuário. */
  L2_FILE_MODIFICATION = 2,
  /** Executar comandos de terminal ou scripts. */
  L3_COMMAND_EXECUTION = 3,
  /** Ações administrativas do sistema operacional. */
  L4_ADMIN_ACTION = 4,
  /** Ações críticas e potencialmente destrutivas/irreversíveis. */
  L5_CRITICAL_ACTION = 5,
}

export type PermissionDecision = "allow" | "confirm" | "deny";

export interface PermissionEvaluation {
  decision: PermissionDecision;
  reason: string;
  toolLevel: PermissionLevel;
  maxLevel: PermissionLevel;
}

export function permissionLevelLabel(level: PermissionLevel): string {
  switch (level) {
    case PermissionLevel.L0_READ_ONLY:
      return "LEVEL 0 · Somente leitura";
    case PermissionLevel.L1_SIMPLE_ACTION:
      return "LEVEL 1 · Ação simples";
    case PermissionLevel.L2_FILE_MODIFICATION:
      return "LEVEL 2 · Alteração de arquivos";
    case PermissionLevel.L3_COMMAND_EXECUTION:
      return "LEVEL 3 · Execução de comandos";
    case PermissionLevel.L4_ADMIN_ACTION:
      return "LEVEL 4 · Ação administrativa";
    case PermissionLevel.L5_CRITICAL_ACTION:
      return "LEVEL 5 · Ação crítica";
    default:
      return "LEVEL desconhecido";
  }
}
