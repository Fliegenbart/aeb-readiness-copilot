import { prisma } from "@/lib/db/prisma";
import {
  listCapsulesForApi,
  parseCapsuleListFilters,
} from "@/lib/api/capsule-service";
import {
  handleApiRouteError,
  jsonResponse,
} from "@/lib/api/route-response";

export async function GET(request: Request) {
  try {
    const filters = parseCapsuleListFilters(new URL(request.url).searchParams);
    const result = await listCapsulesForApi(prisma, filters);

    return jsonResponse(result);
  } catch (error) {
    return handleApiRouteError(error);
  }
}
