import { describe, expect, it } from "vitest";

import {
  MAX_DEMO_UPLOAD_BYTES,
  UploadDocumentError,
  validateDemoUploadFile,
} from "@/lib/documents/upload-service";

describe("upload service validation", () => {
  it("accepts supported demo document types within the size limit", () => {
    expect(() =>
      validateDemoUploadFile(fileLike("invoice.csv", 1024)),
    ).not.toThrow();
    expect(() =>
      validateDemoUploadFile(fileLike("packing-list.xlsx", 2048)),
    ).not.toThrow();
    expect(() =>
      validateDemoUploadFile(fileLike("end-use.txt", 512)),
    ).not.toThrow();
    expect(() =>
      validateDemoUploadFile(fileLike("datasheet.pdf", 4096)),
    ).not.toThrow();
  });

  it("rejects unsupported file types with a typed upload error", () => {
    expect(() => validateDemoUploadFile(fileLike("invoice.exe", 1024))).toThrow(
      UploadDocumentError,
    );
    expect(() => validateDemoUploadFile(fileLike("invoice.exe", 1024))).toThrow(
      expect.objectContaining({
        code: "UNSUPPORTED_FILE_TYPE",
        status: 400,
      }),
    );
  });

  it("rejects oversized uploads before storage", () => {
    expect(() =>
      validateDemoUploadFile(fileLike("invoice.csv", MAX_DEMO_UPLOAD_BYTES + 1)),
    ).toThrow(
      expect.objectContaining({
        code: "FILE_TOO_LARGE",
        status: 413,
      }),
    );
  });
});

function fileLike(name: string, size: number): File {
  return {
    name,
    size,
    type: "",
  } as File;
}
