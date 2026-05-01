import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadRoot = path.join(process.cwd(), "storage", "uploads");

export type StoredUploadedFile = {
  filename: string;
  mimeType: string;
  size: number;
  relativePath: string;
  absolutePath: string;
  buffer: Buffer;
};

export async function storeUploadedFile({
  capsuleId,
  filename,
  mimeType,
  buffer,
}: {
  capsuleId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<StoredUploadedFile> {
  const safeCapsuleId = sanitizePathSegment(capsuleId);
  const safeFilename = sanitizeFilename(filename);
  const directory = path.join(uploadRoot, safeCapsuleId);
  const storedFilename = `${randomUUID()}-${safeFilename}`;
  const absolutePath = path.join(directory, storedFilename);
  const relativePath = path.join("storage", "uploads", safeCapsuleId, storedFilename);

  await mkdir(directory, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    filename: safeFilename,
    mimeType,
    size: buffer.byteLength,
    relativePath,
    absolutePath,
    buffer,
  };
}

export async function clearUploadedFiles() {
  await rm(uploadRoot, { recursive: true, force: true });
}

function sanitizeFilename(value: string): string {
  const normalized = value
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-");

  return normalized.length > 0 ? normalized : "uploaded-document";
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
