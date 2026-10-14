// Reading file contents, with allocation failures mapped to E_OUT_OF_MEMORY.

import { isOutOfMemory, toolErrors } from "@/lib/errors";

type NamedBlob = Blob & { name?: string };

export async function readAsArrayBuffer(file: NamedBlob): Promise<ArrayBuffer> {
  try {
    return await file.arrayBuffer();
  } catch (error) {
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    throw toolErrors.corrupt(file.name ?? "The file", error);
  }
}

export async function readAsText(file: NamedBlob): Promise<string> {
  try {
    return await file.text();
  } catch (error) {
    if (isOutOfMemory(error)) throw toolErrors.outOfMemory(error);
    throw toolErrors.corrupt(file.name ?? "The file", error);
  }
}
