// Light constants shared by the UI and logic.ts. The UI imports only this
// file eagerly; the codec (logic.ts) loads on the first input.

/** Text inputs above this size are processed in the worker; files always are. */
export const WORKER_THRESHOLD = 1024 * 1024;

/**
 * Output longer than this on a single line is not shown in the editor (a
 * line that long is slow to render); it can still be copied or downloaded.
 */
export const LONG_LINE_LIMIT = 1024 * 1024;

export const SAMPLE_TEXT = "Hello, Ondevo! 👋 Grüße aus Köln · こんにちは · مرحبا";

/** SAMPLE_TEXT encoded, for the Decode sample. */
export const SAMPLE_BASE64 =
  "SGVsbG8sIE9uZGV2byEg8J+RiyBHcsO8w59lIGF1cyBLw7ZsbiDCtyDjgZPjgpPjgavjgaHjga8gwrcg2YXYsdit2KjYpw==";
