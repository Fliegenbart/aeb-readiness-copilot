import type { SourceDocumentType } from "@prisma/client";
import {
  handleApiRouteError,
  jsonResponse,
  validationError,
} from "@/lib/api/route-response";
import { prisma } from "@/lib/db/prisma";
import { uploadSourceDocument } from "@/lib/documents/upload-service";

type DocumentsRouteProps = {
  params: Promise<{ id: string }>;
};

const sourceDocumentTypes: SourceDocumentType[] = [
  "commercialInvoice",
  "packingList",
  "erpExport",
  "technicalDatasheet",
  "endUseStatement",
  "supplierEvidence",
  "brokerEmail",
  "other",
];

export async function POST(request: Request, { params }: DocumentsRouteProps) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = formData.get("documentType");

    if (!(file instanceof File)) {
      return validationError("MISSING_FILE", "Missing file upload.");
    }

    if (
      typeof documentType !== "string" ||
      !sourceDocumentTypes.includes(documentType as SourceDocumentType)
    ) {
      return validationError(
        "INVALID_SOURCE_DOCUMENT_TYPE",
        "Missing or unsupported source document type.",
        { allowedValues: sourceDocumentTypes },
      );
    }

    const result = await uploadSourceDocument(prisma, {
      capsuleId: id,
      file,
      documentType: documentType as SourceDocumentType,
    });

    return jsonResponse(result, 201);
  } catch (error) {
    return handleApiRouteError(error);
  }
}
