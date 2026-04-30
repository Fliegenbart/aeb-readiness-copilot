import { describe, expect, it } from "vitest";

import {
  getConfiguredExtractionProviderName,
  getExtractionProvider,
} from "@/lib/extraction/config";
import { MockAIProvider } from "@/lib/extraction/providers/mock-ai-provider";

describe("extraction provider configuration", () => {
  it("defaults to the deterministic provider", () => {
    expect(getConfiguredExtractionProviderName({})).toBe("deterministic");
  });

  it("keeps OpenAI disabled when no API key is present", () => {
    const resolution = getExtractionProvider({ EXTRACTION_PROVIDER: "openai" });

    expect(resolution.requestedProvider).toBe("openai");
    expect(resolution.activeProvider).toBe("deterministic");
    expect(resolution.disabledReason).toMatch(/OPENAI_API_KEY/);
  });
});

describe("MockAIProvider", () => {
  it("returns fixture-based fields while marking uncertain values for review", () => {
    const provider = new MockAIProvider();

    const fields = provider.extract(
      "Supplier declaration: origin wording appears present",
      "supplier-evidence",
      { shipmentReference: "EU-DE-4288" },
    );

    expect(fields).toHaveLength(2);
    expect(fields.some((field) => field.provider === "mock-ai")).toBe(true);
    expect(fields.some((field) => field.needsReview)).toBe(true);
    expect(fields.some((field) => field.isAcceptedEvidence === false)).toBe(true);
  });
});
