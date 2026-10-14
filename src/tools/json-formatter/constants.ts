// Light constants shared by the UI and logic.ts. The UI imports only this
// file eagerly; the parser (logic.ts) loads on the first input.

/** Inputs above this size are processed in the worker (tool-specifications §5.1). */
export const WORKER_THRESHOLD = 1024 * 1024;

/**
 * Minified output longer than this is not shown in the editor (a single line
 * that long is slow to render); it can still be copied or downloaded.
 */
export const LONG_LINE_LIMIT = 1024 * 1024;

export const SAMPLE_JSON = `{
  "id": 4815162342,
  "name": "Sprigkit sample order",
  "createdAt": "2026-10-14T09:30:00Z",
  "paid": true,
  "coupon": null,
  "customer": { "name": "Ada Lovelace", "email": "ada@example.com", "tags": ["vip", "newsletter"] },
  "items": [
    { "sku": "PAPER-A4", "quantity": 2, "price": 4.5 },
    { "sku": "INK-BLACK", "quantity": 1, "price": 18.99 }
  ],
  "trackingNumber": 123456789012345678901
}
`;
