import { getCapsuleDetailForApi } from "@/lib/api/capsule-service";
import {
  handleApiRouteError,
  jsonResponse,
} from "@/lib/api/route-response";
import { prisma } from "@/lib/db/prisma";

type CapsuleRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: CapsuleRouteProps) {
  try {
    const { id } = await params;
    const capsule = await getCapsuleDetailForApi(prisma, id);

    return jsonResponse(capsule);
  } catch (error) {
    return handleApiRouteError(error);
  }
}
