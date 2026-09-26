import { VoiceProvider } from "./VoiceProvider";

export class NullVoiceProvider implements VoiceProvider {
  name = "null";

  async transcribe(audioBlob: ArrayBuffer, format?: string): Promise<{ text: string; confidence?: number }> {
    const error: any = new Error("Voice transcription is not implemented yet (501 Not Implemented)");
    error.statusCode = 501;
    error.code = "not_implemented";
    throw error;
  }

  async synthesize(text: string, voiceProfile?: any): Promise<{ audioBlob: ArrayBuffer; format: string }> {
    const error: any = new Error("Voice synthesis is not implemented yet (501 Not Implemented)");
    error.statusCode = 501;
    error.code = "not_implemented";
    throw error;
  }
}
