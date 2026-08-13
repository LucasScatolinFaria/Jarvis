import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PermissionDecision, PermissionLevel } from "@jarvis/shared";
import type { Logger } from "@jarvis/observability";

/**
 * Registro de auditoria (docs/ARCHITECTURE.md, seção "Segurança" / seção 48
 * do briefing original).
 *
 * Toda execução de ferramenta — permitida, negada ou pendente de
 * confirmação — gera uma entrada aqui. Na Fase 1 isso é um arquivo JSONL
 * local (`data/audit.log`); na Fase 2 a mesma interface passa a gravar na
 * tabela `audit_logs` do Postgres sem exigir mudança nos chamadores.
 */
export interface AuditEntry {
  timestamp: string;
  sessionId: string;
  requestId: string;
  actor: "user" | "agent";
  tool: string;
  permissionLevel: PermissionLevel;
  decision: PermissionDecision;
  input?: unknown;
  result: "success" | "error" | "denied" | "pending_confirmation" | "confirmed" | "rejected" | "timeout";
  error?: string;
  durationMs?: number;
}

export interface AuditSink {
  log(entry: Omit<AuditEntry, "timestamp">): Promise<void>;
}

export class FileAuditLogger implements AuditSink {
  private ready: Promise<void>;

  constructor(
    private readonly filePath: string,
    private readonly logger?: Logger,
  ) {
    this.ready = mkdir(dirname(filePath), { recursive: true }).then(() => undefined);
  }

  async log(entry: Omit<AuditEntry, "timestamp">): Promise<void> {
    const fullEntry: AuditEntry = { timestamp: new Date().toISOString(), ...entry };
    await this.ready;
    try {
      await appendFile(this.filePath, JSON.stringify(fullEntry) + "\n", "utf-8");
    } catch (error) {
      // Auditoria nunca deve derrubar o fluxo principal do agente — registra
      // no logger de aplicação e segue em frente.
      this.logger?.error({ err: error }, "Falha ao gravar log de auditoria");
    }
    this.logger?.info(
      { audit: fullEntry },
      `[audit] ${fullEntry.tool} · ${fullEntry.decision} · ${fullEntry.result}`,
    );
  }
}
