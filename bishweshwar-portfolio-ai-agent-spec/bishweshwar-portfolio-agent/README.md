# Bishweshwar.com — AI Build Specification

This repository contains the product, content, architecture, UX, SEO, deployment, and AI-agent instructions for building **bishweshwar.com**, a personal technical portfolio and engineering knowledge hub.

## Goal

Build a polished, fast, technically credible personal website for Bishweshwar that functions as:

- Personal brand / engineering profile
- Resume and career history
- Technical blog
- Project showcase
- Experimental lab / research playground
- Contact hub
- Long-term home for technical writing and experiments

The site should feel like an **engineer's personal laboratory and knowledge base**, not a generic portfolio template.

## Source material

The site may be populated from user-provided:

1. Resume PDF
2. LinkedIn profile / exported information
3. GitHub profile and repositories
4. Medium profile and selected posts
5. User-provided project notes
6. User-approved images/headshot, if any

### Truthfulness rule

Do not invent employment dates, titles, metrics, project claims, publications, certifications, skills, achievements, or technical details.

When sources conflict:
- Prefer the most recent user-provided source.
- If still ambiguous, keep the information conservative or mark it for review.
- Never fabricate missing information.

## Recommended stack

- Astro
- TypeScript
- Markdown/MDX for articles and technical content
- React only for genuinely interactive components
- CSS with a maintainable design-token system
- GitHub for source control
- Cloudflare Pages for hosting/deployment
- Cloudflare DNS
- Optional serverless/API endpoint for contact handling

Avoid a database unless a concrete feature requires one.

## Primary navigation

Home | About | Experience | Projects | Labs | Blog | Resume | Contact

## Information architecture

```text
bishweshwar.com
│
├── /
│   └── Intro + what you're currently building
│
├── /about
│   └── Background + engineering journey
│
├── /experience
│   └── F5 + previous experience
│
├── /projects
│   └── Production/personal projects
│
├── /labs
│   ├── /go
│   ├── /rust
│   ├── /quantum
│   ├── /cryptography
│   ├── /distributed-systems
│   └── /ai
│
├── /blog
│   ├── Go
│   ├── Distributed Systems
│   ├── Rust
│   ├── Quantum Computing
│   └── Cryptography
│
├── /resume
│   ├── Interactive résumé
│   └── Download PDF
│
└── /contact
    ├── Contact form
    ├── LinkedIn
    └── GitHub
```

## Build order

1. Read every supplied source.
2. Produce a content inventory before coding.
3. Establish design tokens and responsive shell.
4. Implement global navigation/footer.
5. Implement Home and About.
6. Implement Experience.
7. Implement Projects.
8. Implement Labs.
9. Implement Blog/MDX pipeline.
10. Implement Resume.
11. Implement Contact.
12. Add SEO, sitemap, RSS, Open Graph, structured data.
13. Add accessibility.
14. Add performance optimization.
15. Add tests/lint/type checking.
16. Build production output and inspect every route at mobile/tablet/desktop widths.
17. Fix content, layout, accessibility, and broken-link issues.
18. Document deployment and maintenance.

## Definition of done

The site is complete when:

- All core routes work.
- No placeholder text remains.
- Content is sourced from supplied material.
- Mobile and desktop layouts are polished.
- Keyboard navigation works.
- Images have meaningful alt text.
- Pages have titles/descriptions/canonical URLs.
- Sitemap and RSS work where applicable.
- Blog posts have article metadata.
- Resume PDF is downloadable.
- Contact form has validation and spam protection.
- Lighthouse-style performance concerns are addressed.
- `npm run build` succeeds.
- No TypeScript/lint errors remain.
- README documents local development and deployment.
