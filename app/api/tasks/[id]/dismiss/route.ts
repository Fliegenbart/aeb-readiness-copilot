import {
  handleApiRouteError,
  jsonResponse,
  validationError,
} from "@/lib/api/route-response";
import { prisma } from "@/lib/db/prisma";
import { dismissRemediationTaskById } from "@/lib/remediation/task-service";

type DismissTaskRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: DismissTaskRouteProps,
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    const dismissedReason =
      typeof body.dismissedReason === "string"
        ? body.dismissedReason.trim()
        : typeof body.reason === "string"
          ? body.reason.trim()
          : "";

    if (!dismissedReason) {
      return validationError(
        "MISSING_DISMISS_REASON",
        "A dismissal reason is required.",
      );
    }

    const task = await dismissRemediationTaskById(
      prisma,
      id,
      dismissedReason,
      "api",
    );

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

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();

    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
