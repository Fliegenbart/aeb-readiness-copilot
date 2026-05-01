import { getPayloadPreviewForApi } from "@/lib/api/capsule-service";
import {
  handleApiRouteError,
  jsonResponse,
} from "@/lib/api/route-response";
import { prisma } from "@/lib/db/prisma";

type PayloadRouteProps = {
  params: Promise<{ id: string; target: string }>;
};

export async function GET(_request: Request, { params }: PayloadRouteProps) {
  try {
    const { id, target } = await params;
    const preview = await getPayloadPreviewForApi(prisma, id, target);

    return jsonResponse(preview);
  } catch (error) {
    return handleApiRouteError(error);
  }
}
