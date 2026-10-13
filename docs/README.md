# Sprigkit Documentation

This folder is the single source of truth for what Sprigkit is, how it looks, and how it is built.
Code must follow these documents. When a decision changes, update the relevant document in the same change.

## Reading order

New to the project (human or AI assistant)? Read in this order:

1. [01-product/product.md](01-product/product.md): what we are building and why
2. [01-product/mvp-scope.md](01-product/mvp-scope.md): exactly what is in and out of the MVP
3. [02-design/design-system.md](02-design/design-system.md): visual identity, tokens, components, motion
4. [04-architecture/architecture.md](04-architecture/architecture.md): stack, structure, patterns
5. [04-architecture/tool-registry.md](04-architecture/tool-registry.md): how tools are defined and wired
6. [04-architecture/tool-specifications.md](04-architecture/tool-specifications.md): behaviour of every tool
7. [04-architecture/dependencies-licenses.md](04-architecture/dependencies-licenses.md): approved libraries
8. [06-delivery/implementation-roadmap.md](06-delivery/implementation-roadmap.md): the build plan, then the **current phase** file in [06-delivery/phases/](06-delivery/phases/README.md)

AI coding sessions also follow [../CLAUDE.md](../CLAUDE.md).

## Precedence

If two documents disagree:

1. The **more specific** document wins (e.g. `tool-specifications.md` beats `mvp-scope.md` on a tool's behaviour).
2. If equally specific, the **more recently updated** document wins.
3. Fix the conflict in the same change and record the decision in [06-delivery/risks-and-decisions.md](06-delivery/risks-and-decisions.md).

## Labels used throughout

| Label | Meaning |
|---|---|
| **[Verified]** | Checked against official documentation or a primary source on the date given |
| **[Target]** | A planning goal; adjust after real testing |
| **[Estimate]** | An informed guess, not a measurement |
| **[Decision]** | Agreed and binding until changed |
| **[Open]** | Not yet decided |

No document may contain invented traffic, keyword-volume, keyword-difficulty, or revenue figures.

## Index

Status: ✅ Written · 📝 Planned · ➖ Not needed

### 01-product: vision, users, scope
| File | Status | Purpose |
|---|---|---|
| [product.md](01-product/product.md) | ✅ | Product requirements: vision, users, goals, constraints, metrics, risks, decisions |
| requirements.md | ➖ | Merged into existing docs (D-12): functional → mvp-scope.md + tool-specifications.md; non-functional → product.md + architecture.md |
| [mvp-scope.md](01-product/mvp-scope.md) | ✅ | MVP tools, global features, deferred items, Definition of Done |
| [competitor-research.md](01-product/competitor-research.md) | ✅ | Competitor analysis and differentiation |

### 02-design: identity, UI, motion, accessibility
| File | Status | Purpose |
|---|---|---|
| [brand-identity.md](02-design/brand-identity.md) | ✅ | Name, logo, tagline, personality |
| [design-system.md](02-design/design-system.md) | ✅ | Tokens, typography, components, motion tokens, layout patterns |
| [ui-ux-specification.md](02-design/ui-ux-specification.md) | ✅ | Screen-by-screen layouts and interactions |
| [information-architecture.md](02-design/information-architecture.md) | ✅ | Sitemap, URLs, navigation, internal linking |
| [content-voice-ux-copy.md](02-design/content-voice-ux-copy.md) | ✅ | Voice, tone, microcopy, error messages |
| [motion-design.md](02-design/motion-design.md) | ✅ | Detailed choreography per interaction |
| [accessibility.md](02-design/accessibility.md) | ✅ | WCAG 2.2 AA requirements and test procedure |

### 03-seo-growth: search, AI search, content, revenue
| File | Status | Purpose |
|---|---|---|
| seo-strategy.md | 📝 | Technical and on-page SEO strategy |
| [keyword-research.md](03-seo-growth/keyword-research.md) | ✅ | Keyword findings, final slugs (from free sources only) |
| page-seo-specs.md | 📝 | Per-page title, meta, H1, FAQs, schema, links |
| geo-strategy.md | 📝 | AI-assisted search visibility |
| content-strategy.md | 📝 | Guides and topical authority plan |
| monetization.md | 📝 | Revenue models and sequencing |

### 04-architecture: how it is built
| File | Status | Purpose |
|---|---|---|
| [architecture.md](04-architecture/architecture.md) | ✅ | Stack, folder structure, rendering, workers, PWA, CSP, CI/CD |
| [tool-registry.md](04-architecture/tool-registry.md) | ✅ | Tool definition schema and how it drives the site |
| [tool-specifications.md](04-architecture/tool-specifications.md) | ✅ | Inputs, options, processing, errors and tests per tool |
| [dependencies-licenses.md](04-architecture/dependencies-licenses.md) | ✅ | License policy and dependency register |
| security-privacy.md | 📝 | Threat model, CSP details, data-handling rules |
| [coding-standards.md](04-architecture/coding-standards.md) | ✅ | Conventions and step-by-step contribution guide |

### 05-quality: correctness, performance, release gates
| File | Status | Purpose |
|---|---|---|
| [testing-strategy.md](05-quality/testing-strategy.md) | ✅ | Unit, E2E, visual, accessibility testing |
| [browser-device-support.md](05-quality/browser-device-support.md) | ✅ | Support matrix (initial; device results in Phase 9) and device limits |
| [performance.md](05-quality/performance.md) | ✅ | Budgets and measurement |
| acceptance-criteria.md | 📝 | Release gates per tool and per page |

### 06-delivery: shipping and operating
| File | Status | Purpose |
|---|---|---|
| [implementation-roadmap.md](06-delivery/implementation-roadmap.md) | ✅ | Master plan: phases, milestones, dependencies, doc schedule |
| [phases/](06-delivery/phases/README.md) | ✅ | One file per phase (0–11): tasks, exit criteria, risks; current phase and status |
| [deployment.md](06-delivery/deployment.md) | ✅ | Cloudflare setup, environments, rollback |
| analytics-monitoring.md | 📝 | Analytics, Search Console, error monitoring |
| launch-checklist.md | 📝 | Pre-launch and launch-day steps |
| maintenance.md | 📝 | Updates, bug triage, monthly reviews, tool retirement |
| [risks-and-decisions.md](06-delivery/risks-and-decisions.md) | ✅ | Decision log (ADR-style) and risk register |

### 07-legal: public policies
| File | Status | Purpose |
|---|---|---|
| privacy-policy.md | 📝 | Public privacy policy |
| terms-of-use.md | 📝 | Public terms of use |
