import type { PermissionLevel } from "@jarvis/shared";

export type ConnectionStatus = "connecting" | "online" | "offline";

export type ToolCardStatus = "running" | "success" | "error" | "awaiting_confirmation" | "denied";

export type TimelineEntry =
  | {
      kind: "message";
      id: string;
      role: "user" | "assistant";
      text: string;
      createdAt: string;
      streaming?: boolean;
    }
  | {
      kind: "tool";
      id: string;
      name: string;
      input: unknown;
      permissionLevel: PermissionLevel;
      status: ToolCardStatus;
      result?: unknown;
      error?: string;
      durationMs?: number;
      expiresAt?: string;
    }
  | {
      kind: "system";
      id: string;
      level: "info" | "error";
      text: string;
      createdAt: string;
    };

export interface PendingConfirmation {
  requestId: string;
  tool: string;
  input: unknown;
  permissionLevel: PermissionLevel;
  expiresAt: string;
}
