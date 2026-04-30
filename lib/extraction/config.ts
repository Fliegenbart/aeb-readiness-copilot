import { DeterministicProvider } from "@/lib/extraction/providers/deterministic-provider";
import { MockAIProvider } from "@/lib/extraction/providers/mock-ai-provider";
import { OpenAIProvider } from "@/lib/extraction/providers/openai-provider";
import type {
  EvidenceExtractionProvider,
  ExtractionProviderName,
} from "@/lib/extraction/types";

type ExtractionEnv = {
  [key: string]: string | undefined;
  EXTRACTION_PROVIDER?: string;
  OPENAI_API_KEY?: string;
};

export type ExtractionProviderResolution = {
  provider: EvidenceExtractionProvider;
  requestedProvider: ExtractionProviderName;
  activeProvider: ExtractionProviderName;
  disabledReason?: string;
};

const providerNames: ExtractionProviderName[] = [
  "deterministic",
  "mock-ai",
  "openai",
];

export function getConfiguredExtractionProviderName(
  env: ExtractionEnv = process.env,
): ExtractionProviderName {
  const requested = env.EXTRACTION_PROVIDER;

  if (providerNames.includes(requested as ExtractionProviderName)) {
    return requested as ExtractionProviderName;
  }

  return "deterministic";
}

export function getExtractionProvider(
  env: ExtractionEnv = process.env,
): ExtractionProviderResolution {
  const requestedProvider = getConfiguredExtractionProviderName(env);

  if (requestedProvider === "mock-ai") {
    return {
      provider: new MockAIProvider(),
      requestedProvider,
      activeProvider: "mock-ai",
    };
  }

  if (requestedProvider === "openai") {
    if (env.OPENAI_API_KEY) {
      return {
        provider: new OpenAIProvider(env.OPENAI_API_KEY),
        requestedProvider,
        activeProvider: "openai",
      };
    }

    return {
      provider: new DeterministicProvider(),
      requestedProvider,
      activeProvider: "deterministic",
      disabledReason:
        "OpenAIProvider disabled because OPENAI_API_KEY is not present.",
    };
  }

  return {
    provider: new DeterministicProvider(),
    requestedProvider,
    activeProvider: "deterministic",
  };
}
