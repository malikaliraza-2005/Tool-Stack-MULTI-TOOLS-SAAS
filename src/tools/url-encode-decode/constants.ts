// Samples the UI imports eagerly; the codec (logic.ts) loads on the first input.

export const SAMPLES = {
  encode: "Grüße & greetings: 50% off? Yes! 👋",
  decode: "Gr%C3%BC%C3%9Fe%20%26%20greetings%3A%2050%25%20off%3F%20Yes!%20%F0%9F%91%8B",
  parse:
    "https://ada:secret@shop.example.com:8443/search/caf%C3%A9?q=coffee+beans&tag=fair&tag=organic&page=2#results",
} as const;
