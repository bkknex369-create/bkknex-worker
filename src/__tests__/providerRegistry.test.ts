import { ProviderRegistryImpl } from "../providers";
import { WorkersAiProvider } from "../providers/workersAi/WorkersAiProvider";
import { OpenAiProvider } from "../providers/openai/OpenAiProvider";

function fakeAi(): Ai {
  return { run: jest.fn() } as unknown as Ai;
}

describe("ProviderRegistryImpl.getAiProvider", () => {
  it("defaults to Workers AI when AI_PROVIDER is unset", () => {
    const registry = new ProviderRegistryImpl({ AI: fakeAi() });
    expect(registry.getAiProvider()).toBeInstanceOf(WorkersAiProvider);
  });

  it("selects Workers AI explicitly via AI_PROVIDER=workers-ai", () => {
    const registry = new ProviderRegistryImpl({ AI_PROVIDER: "workers-ai", AI: fakeAi() });
    expect(registry.getAiProvider()).toBeInstanceOf(WorkersAiProvider);
  });

  it("throws a clear, actionable error when the AI binding is missing", () => {
    const registry = new ProviderRegistryImpl({ AI_PROVIDER: "workers-ai" });
    expect(() => registry.getAiProvider()).toThrow(/\[ai\]/);
  });

  it("still supports selecting OpenAI via an API key (future-provider path preserved)", () => {
    const registry = new ProviderRegistryImpl({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "sk-test",
    });
    expect(registry.getAiProvider()).toBeInstanceOf(OpenAiProvider);
  });

  it("throws when a non-Workers-AI provider is selected without its API key", () => {
    const registry = new ProviderRegistryImpl({ AI_PROVIDER: "openai" });
    expect(() => registry.getAiProvider()).toThrow(/API key not found/);
  });

  it("throws for an unknown provider name", () => {
    const registry = new ProviderRegistryImpl({
      AI_PROVIDER: "mystery",
      MYSTERY_API_KEY: "x",
    });
    expect(() => registry.getAiProvider()).toThrow(/Unknown AI provider/);
  });
});
