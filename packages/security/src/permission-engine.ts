import {
  PermissionLevel,
  permissionLevelLabel,
  type PermissionEvaluation,
} from "@jarvis/shared";

/**
 * Motor de decisão de permissões (docs/ARCHITECTURE.md, seção "Segurança").
 *
 * Regra:
 *  - toolLevel > maxLevel                        -> deny
 *  - toolLevel >= L4_ADMIN_ACTION (ou forçado)    -> confirm
 *  - caso contrário                                -> allow
 *
 * `PermissionEngine` não sabe nada sobre ferramentas, WebSocket ou UI — ele
 * só compara níveis e retorna uma decisão. Quem usa a decisão (o
 * AgentOrchestrator) é responsável por agir sobre ela.
 */
export class PermissionEngine {
  constructor(private readonly maxLevel: PermissionLevel) {}

  evaluate(
    toolLevel: PermissionLevel,
    options: { forceConfirm?: boolean } = {},
  ): PermissionEvaluation {
    if (toolLevel > this.maxLevel) {
      return {
        decision: "deny",
        reason: `${permissionLevelLabel(toolLevel)} excede o nível máximo permitido nesta sessão (${permissionLevelLabel(this.maxLevel)}).`,
        toolLevel,
        maxLevel: this.maxLevel,
      };
    }

    if (options.forceConfirm || toolLevel >= PermissionLevel.L4_ADMIN_ACTION) {
      return {
        decision: "confirm",
        reason: `${permissionLevelLabel(toolLevel)} requer confirmação explícita do usuário antes de executar.`,
        toolLevel,
        maxLevel: this.maxLevel,
      };
    }

    return {
      decision: "allow",
      reason: `${permissionLevelLabel(toolLevel)} está dentro do nível permitido (${permissionLevelLabel(this.maxLevel)}).`,
      toolLevel,
      maxLevel: this.maxLevel,
    };
  }

  getMaxLevel(): PermissionLevel {
    return this.maxLevel;
  }
}
