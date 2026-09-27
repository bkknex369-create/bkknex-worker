import { AiProvider } from "./AiProvider";
import { VoiceProvider } from "./VoiceProvider";
import { OpenAiProvider } from "./openai/OpenAiProvider";
import { ZaiProvider } from "./zai/ZaiProvider";
import { GeminiProvider } from "./gemini/GeminiProvider";
import { WorkersAiProvider } from "./workersAi/WorkersAiProvider";
import { NullVoiceProvider } from "./NullVoiceProvider";

export type { AiProvider, VoiceProvider };

export interface ProviderRegistry {
  getAiProvider(): AiProvider;
  getVoiceProvider(): VoiceProvider;
}

/** Bindings/vars the registry reads from. `AI` is the Workers AI binding
 * (`[ai]` in wrangler.toml); everything else is a plain string var/secret. */
export interface ProviderEnv {
  [key: string]: string | Ai | undefined;
  AI?: Ai;
}

export class ProviderRegistryImpl implements ProviderRegistry {
  private env: ProviderEnv;

  constructor(env: ProviderEnv) {
    this.env = env;
  }

  getAiProvider(): AiProvider {
    const provider = (this.env["AI_PROVIDER"] as string) || "workers-ai";

    if (provider === "workers-ai") {
      const ai = this.env["AI"];
      if (!ai) {
        throw new Error(
          "Workers AI binding not found: add `[ai]\\nbinding = \"AI\"` to wrangler.toml"
        );
      }
      return new WorkersAiProvider(ai);
    }

    const apiKey = this.env[this.getApiKeyEnvName(provider)] as string | undefined;
    if (!apiKey) {
      throw new Error(`API key not found for provider: ${provider}`);
    }

    switch (provider) {
      case "openai":
        return new OpenAiProvider(apiKey);
      case "zai":
        return new ZaiProvider(apiKey);
      case "gemini":
        return new GeminiProvider(apiKey);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  getVoiceProvider(): VoiceProvider {
    const provider = (this.env["VOICE_PROVIDER"] as string) || "null";

    if (provider === "null") {
      return new NullVoiceProvider();
    }

    const apiKey = this.env[this.getApiKeyEnvName(provider)];
    if (!apiKey) {
      throw new Error(`API key not found for voice provider: ${provider}`);
    }

    throw new Error(`Unknown voice provider: ${provider}`);
  }

  private getApiKeyEnvName(provider: string): string {
    const mapping: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      zai: "ZAI_API_KEY",
      gemini: "GEMINI_API_KEY",
    };
    return mapping[provider] || `${provider.toUpperCase()}_API_KEY`;
  }
}
