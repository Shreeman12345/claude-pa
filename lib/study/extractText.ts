import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import officeParser from "officeparser";

const TEXT_EXTENSIONS = ["pdf", "docx", "pptx", "xlsx", "doc", "ppt", "odt", "odp", "ods"];
const IMAGE_EXTENSIONS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isTextExtractable(fileName: string): boolean {
  return TEXT_EXTENSIONS.includes(extensionOf(fileName));
}

export function imageMimeType(fileName: string): string | null {
  return IMAGE_EXTENSIONS[extensionOf(fileName)] ?? null;
}

export async function extractTextFromFile(blob: Blob, fileName: string): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), `${randomUUID()}-${fileName}`);
  await fs.writeFile(tmpPath, buffer);
  try {
    return await officeParser.parseOfficeAsync(tmpPath);
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
