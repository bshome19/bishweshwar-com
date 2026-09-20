# Architecture — Bishweshwar.com

## 1. Architectural objective

Create a content-first, statically generated website with selective interactivity.

Core properties:

- Fast
- SEO-friendly
- Accessible
- Easy to maintain
- Git-based content workflow
- No unnecessary backend
- Easy migration between hosts
- Capable of adding interactive technical labs later

## 2. High-level architecture

```text
                         ┌──────────────────┐
                         │   GitHub Repo    │
                         │ Astro + TS + MDX │
                         └────────┬─────────┘
                                  │
                                  │ CI / Build
                                  ▼
                         ┌──────────────────┐
                         │ Cloudflare Pages │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Cloudflare DNS   │
                         └────────┬─────────┘
                                  │
                                  ▼
                         bishweshwar.com
```

## 3. Content architecture

```text
src/
├── content/
│   ├── blog/
│   ├── projects/
│   └── labs/
│       ├── go/
│       ├── rust/
│       ├── quantum/
│       ├── cryptography/
│       ├── distributed-systems/
│       └── ai/
│
├── components/
├── layouts/
├── pages/
├── styles/
└── data/
```

Prefer Astro Content Collections for structured content.

## 4. Content collections

### Blog

Suggested fields:

```ts
{
  title: string,
  description: string,
  pubDate: Date,
  updatedDate?: Date,
  category: "go" | "distributed-systems" | "rust" | "quantum" | "cryptography" | "ai",
  tags: string[],
  draft: boolean,
  featured?: boolean,
  externalUrl?: string,
  canonicalUrl?: string,
  readingTime?: number
}
```

### Projects

```ts
{
  title: string,
  description: string,
  status: "active" | "completed" | "archived",
  technologies: string[],
  github?: string,
  liveUrl?: string,
  featured?: boolean,
  category?: string
}
```

### Labs

```ts
{
  title: string,
  description: string,
  category: "go" | "rust" | "quantum" | "cryptography" | "distributed-systems" | "ai",
  status: "experiment" | "active" | "completed",
  technologies: string[],
  github?: string,
  demoUrl?: string,
  featured?: boolean
}
```

## 5. Rendering strategy

Default:

**Static generation.**

Use client-side JavaScript only when interaction requires it.

Examples where JS is justified:

- Quantum circuit editor
- Interactive benchmark chart
- Code playground
- Search
- Theme switcher
- Filter controls

Avoid turning every page into a client-rendered application.

## 6. React usage

React is optional and should be isolated to interactive islands.

Example:

```text
Astro page
 ├── static article content
 ├── static project cards
 └── React island
       └── InteractiveQuantumCircuit
```

Do not use React merely for static text.

## 7. Backend strategy

No backend is required for:

- Home
- About
- Experience
- Projects
- Labs documentation
- Blog
- Resume

Possible serverless functionality:

- Contact form
- Email notification
- Analytics

If a future lab needs a Go service:

```text
api.bishweshwar.com
        ↓
Go service
        ↓
Cloud/VPS/container
```

Keep that infrastructure independent from the static website.

## 8. Routing

```text
/
/about
/experience
/projects
/projects/[slug]
/labs
/labs/go
/labs/rust
/labs/quantum
/labs/cryptography
/labs/distributed-systems
/labs/ai
/labs/[category]/[slug]
/blog
/blog/[slug]
/resume
/contact
```

## 9. SEO

Every indexable page must have:

- Unique `<title>`
- Meta description
- Canonical URL
- Open Graph metadata
- Twitter/X card metadata where appropriate
- Correct heading hierarchy
- Sitemap inclusion

Site-level structured data:

- Person
- WebSite

Blog structured data:

- Article

Resume/experience pages may use relevant schema only where truthful.

## 10. Accessibility

Target WCAG 2.2 AA principles.

Requirements:

- Semantic HTML
- Visible focus states
- Keyboard navigation
- Proper labels
- Sufficient contrast
- Skip-to-content link
- Alt text
- No color-only meaning
- Reduced-motion support
- Logical heading structure

## 11. Performance

Targets:

- Minimal JavaScript
- Optimized images
- Modern image formats
- Lazy-load noncritical images
- Preload only truly critical assets
- Avoid unnecessary third-party scripts
- Use system/local fonts unless a web font is justified
- Keep blog pages mostly static HTML

## 12. Security

- No secrets in Git
- Environment variables for sensitive configuration
- Sanitize/validate contact input
- Rate-limit or protect contact endpoint
- Add spam protection
- Do not expose internal API credentials
- Keep dependencies updated

## 13. Observability

Start simple:

- Build logs
- Deployment logs
- Privacy-conscious analytics if desired
- Error monitoring only when useful

Do not add an observability stack just for the sake of complexity.
