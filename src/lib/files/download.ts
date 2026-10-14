// Downloads via Blob + object URL; the URL is revoked after use (tool-specifications §2.2).

// Long enough for every browser to start reading the blob after the click:
// Safari and Firefox can fail when the URL is revoked synchronously.
export const REVOKE_AFTER_MS = 10_000;

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

export function downloadText(text: string, filename: string, type = "text/plain"): void {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
}
