import { recomputeCapsuleForApi } from "@/lib/api/capsule-service";
import {
  handleApiRouteError,
  jsonResponse,
} from "@/lib/api/route-response";
import { prisma } from "@/lib/db/prisma";

type RecomputeRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  { params }: RecomputeRouteProps,
) {
  try {
    const { id } = await params;
    const result = await recomputeCapsuleForApi(prisma, id);

    return jsonResponse(result);
  } catch (error) {
    return handleApiRouteError(error);
  }
}
