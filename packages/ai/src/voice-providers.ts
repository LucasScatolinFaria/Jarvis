/**
 * Contratos do pipeline de voz (docs/ARCHITECTURE.md seção B.7 / seção 35 do
 * briefing original).
 *
 * Estas interfaces são definidas já na Fase 1 para que o formato de
 * requisição/resposta de voz seja estável desde já, mas NENHUMA
 * implementação concreta existe ainda — isso é escopo da Fase 3. Não há
 * nenhum código no orquestrador ou na API que dependa delas por enquanto.
 * Ver docs/ARCHITECTURE.md seção F (roadmap) para o plano de implementação
 * (wake word e VAD locais, STT local com fallback em nuvem, TTS em nuvem
 * com opção local).
 */

export interface TranscriptionResult {
  text: string;
  /** 0–1, confiança do reconhecimento, quando o provedor expõe essa métrica. */
  confidence?: number;
  language?: string;
}

export interface SpeechToTextProvider {
  readonly name: string;
  transcribe(audio: Uint8Array, options?: { language?: string }): Promise<TranscriptionResult>;
}

export interface SynthesizedSpeech {
  audio: Uint8Array;
  mimeType: string;
}

export interface TextToSpeechProvider {
  readonly name: string;
  synthesize(text: string, options?: { voice?: string; speed?: number }): Promise<SynthesizedSpeech>;
}

export interface WakeWordProvider {
  readonly name: string;
  start(onDetected: () => void): Promise<void>;
  stop(): Promise<void>;
}
