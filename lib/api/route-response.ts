import { NextResponse } from "next/server";

import {
  ApiServiceError,
  apiErrorBody,
} from "@/lib/api/capsule-service";
import { UploadDocumentError } from "@/lib/documents/upload-service";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function validationError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return jsonResponse(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    400,
  );
}

export function handleApiRouteError(error: unknown) {
  if (error instanceof ApiServiceError) {
    return jsonResponse(apiErrorBody(error), error.status);
  }

  if (error instanceof UploadDocumentError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      error.status,
    );
  }

  console.error(error);

  return jsonResponse(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected API error.",
      },
    },
    500,
  );
}
