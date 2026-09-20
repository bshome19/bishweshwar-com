# Portfolio Build Plan

## Phase 0 — Content discovery

Before implementation, inspect all supplied material:

- Resume
- LinkedIn
- GitHub
- Medium
- User-provided project documents

Create `content/content-inventory.md` containing:

| Area | Source | Facts found | Destination | Confidence |
|---|---|---|---|---|
| Profile | LinkedIn | ... | Home/About | High |
| Experience | Resume | ... | Experience | High |
| Projects | GitHub | ... | Projects/Labs | Medium |
| Writing | Medium | ... | Blog | High |

Do not publish uncertain facts without review.

## Phase 1 — Product definition

Define:

- Audience
- Positioning
- Navigation
- Page hierarchy
- Content taxonomy
- CTA strategy
- Visual language
- Accessibility requirements

Primary audiences:

1. Engineering recruiters / hiring managers
2. Software engineers
3. Technical readers
4. Developers interested in experiments
5. People who want to contact Bishweshwar

## Phase 2 — UX

Design for:

- Mobile first
- Desktop
- Tablet
- Keyboard navigation
- Reduced motion
- Dark/light theme if implemented

Important UX principle:

**Technical depth should be discoverable without making the homepage overwhelming.**

Home should communicate who Bishweshwar is in seconds; Labs and Blog should reward deeper exploration.

## Phase 3 — Implementation

Recommended implementation order:

```text
Foundation
  ↓
Layout
  ↓
Navigation
  ↓
Home
  ↓
About
  ↓
Experience
  ↓
Projects
  ↓
Labs
  ↓
Blog
  ↓
Resume
  ↓
Contact
  ↓
SEO/performance/accessibility
```

## Phase 4 — Content migration

For each Medium post:

- Preserve title
- Preserve publication date when known
- Preserve original article meaning
- Convert to Markdown/MDX
- Clean formatting
- Preserve code examples
- Preserve useful diagrams/images only when rights/source are clear
- Add canonical/source metadata if the article remains on Medium

Do not silently rewrite technical claims.

## Phase 5 — Quality

Run:

```bash
npm run check
npm run lint
npm run build
```

Also manually verify:

- 320px-ish mobile
- 768px tablet
- 1280px desktop
- large desktop
- keyboard-only interaction
- reduced-motion preference
- dark/light themes if enabled

## Phase 6 — Deployment

Target:

```text
GitHub
   ↓
CI/build
   ↓
Cloudflare Pages
   ↓
Cloudflare DNS
   ↓
bishweshwar.com
```

Do not expose secrets in the repository.

## Phase 7 — Post-launch

Future enhancements should be incremental:

- Search
- Newsletter
- RSS improvements
- Interactive quantum circuits
- Benchmark visualizations
- WebAssembly experiments
- WebGPU experiments
- Public API demos
- Project status pages
