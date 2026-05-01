import {
  handleApiRouteError,
  jsonResponse,
} from "@/lib/api/route-response";
import { prisma } from "@/lib/db/prisma";
import { resolveRemediationTaskById } from "@/lib/remediation/task-service";

type ResolveTaskRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  { params }: ResolveTaskRouteProps,
) {
  try {
    const { id } = await params;
    const task = await resolveRemediationTaskById(prisma, id, "api");

    if (!task) {
      return jsonResponse(
        {
          error: {
            code: "TASK_NOT_FOUND",
            message: "Remediation task not found.",
          },
        },
        404,
      );
    }

    return jsonResponse({ task });
  } catch (error) {
    return handleApiRouteError(error);
  }
}
