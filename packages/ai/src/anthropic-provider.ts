import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMChatRequest,
  LLMChatResult,
  LLMMessage,
  LLMStopReason,
  LLMStreamEvents,
  LLMToolUseBlock,
} from "@jarvis/shared";
import type { LLMProvider } from "./llm-provider.js";

/**
 * Implementação concreta de `LLMProvider` usando a API da Anthropic.
 * Suporta streaming de texto e tool use (function calling) nativo do Claude.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY ausente. Defina no arquivo .env (veja .env.example).",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async chat(request: LLMChatRequest, events?: LLMStreamEvents): Promise<LLMChatResult> {
    const messages = request.messages.map(toAnthropicMessage);
    const tools = request.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }));

    const stream = this.client.messages.stream({
      model: request.model,
      system: request.system,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    if (events?.onTextDelta) {
      stream.on("text", (delta) => events.onTextDelta?.(delta));
    }

    const final = await stream.finalMessage();

    let text = "";
    const toolCalls: LLMToolUseBlock[] = [];
    for (const block of final.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    return {
      text,
      toolCalls,
      stopReason: mapStopReason(final.stop_reason),
      model: final.model,
      usage: final.usage
        ? {
            inputTokens: final.usage.input_tokens,
            outputTokens: final.usage.output_tokens,
          }
        : undefined,
    };
  }
}

function toAnthropicMessage(message: LLMMessage): Anthropic.MessageParam {
  if (typeof message.content === "string") {
    return { role: message.role, content: message.content };
  }

  const content: Anthropic.ContentBlockParam[] = message.content.map((block) => {
    switch (block.type) {
      case "text":
        return { type: "text", text: block.text };
      case "tool_use":
        return {
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        };
      case "tool_result":
        return {
          type: "tool_result",
          tool_use_id: block.toolUseId,
          content: block.content,
          is_error: block.isError,
        };
    }
  });

  return { role: message.role, content };
}

function mapStopReason(reason: Anthropic.Message["stop_reason"]): LLMStopReason {
  switch (reason) {
    case "end_turn":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "max_tokens":
      return "max_tokens";
    case "stop_sequence":
      return "stop_sequence";
    default:
      return "end_turn";
  }
}
