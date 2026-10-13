# Sprigkit

Private, browser-based PDF, image and developer tools. All processing happens in the browser; nothing is uploaded.

- Product and technical documentation: [docs/README.md](docs/README.md)
- Rules for AI coding sessions: [CLAUDE.md](CLAUDE.md)

## Development

Requires Node.js 24 (see `.node-version`).

```
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to out/
npm run serve        # serve out/ with production headers on http://127.0.0.1:4173
```

Checks: `npm run typecheck`, `lint`, `test`, `e2e`, `lhci`, `licenses`. See [CLAUDE.md](CLAUDE.md#commands).

## License

Copyright © 2026 Ali Raza. All rights reserved. The source is publicly visible but not licensed for reuse (decision D-13 in [risks-and-decisions.md](docs/06-delivery/risks-and-decisions.md)). Third-party packages keep their own licenses.
