import { resetDemoDataForApi } from "@/lib/api/demo-service";
import {
  handleApiRouteError,
  jsonResponse,
} from "@/lib/api/route-response";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  try {
    const result = await resetDemoDataForApi(prisma);

    return jsonResponse(result);
  } catch (error) {
    return handleApiRouteError(error);
  }
}
