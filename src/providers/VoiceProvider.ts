export interface VoiceProvider {
  name: string;
  transcribe(audioBlob: ArrayBuffer, format?: string): Promise<{ text: string; confidence?: number }>;
  synthesize(text: string, voiceProfile?: any): Promise<{ audioBlob: ArrayBuffer; format: string }>;
}
