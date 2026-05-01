import type { AebTarget, EvidenceCapsuleWithRelations } from "@/lib/domain/types";
import {
  buildAebPayloadPreview,
  getAebAdapter,
} from "@/lib/aeb/adapters";
import type { AebPayloadPreview } from "@/lib/aeb/types";

export type MockAebPayloadPreview = AebPayloadPreview;

export function createMockAebPayloadPreview(
  capsule: EvidenceCapsuleWithRelations,
  target: AebTarget = "CUSTOMS_BROKER_INTEGRATION",
): MockAebPayloadPreview {
  return buildAebPayloadPreview(capsule, target);
}

export { getAebAdapter };
