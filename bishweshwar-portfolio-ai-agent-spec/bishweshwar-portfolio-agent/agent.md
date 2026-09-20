# AI Coding Agent Instructions — Bishweshwar.com

You are the primary AI software engineer responsible for implementing this website.

## Mission

Build a production-quality personal technical portfolio at `bishweshwar.com`.

The site must communicate:

- Who Bishweshwar is
- His engineering experience
- What he builds
- What he is learning/exploring
- His technical writing
- His experiments/labs
- How to contact him

## Non-negotiable rules

### 1. Never fabricate

Never invent:

- Job titles
- Employment dates
- Employers
- Education
- Skills
- Metrics
- Project impact
- GitHub stars
- Users
- Performance numbers
- Certifications
- Publications
- Awards

If a value is unavailable, omit it or use a clearly marked TODO.

### 2. Source priority

When information is available:

1. Explicit current user instructions
2. User-provided resume
3. User-provided LinkedIn information
4. User-provided GitHub information
5. User-provided Medium content
6. Other user-provided project documentation

Do not treat scraped/generated summaries as authoritative over original sources.

### 3. Do not over-design

Avoid:

- Generic "developer portfolio" templates
- Excessive gradients
- Unnecessary animations
- Giant hero text consuming the screen
- Fake terminal animations
- Skill bars
- Percentage-based skill ratings
- Decorative code that conveys no information
- Stock photos that do not add value

The visual identity should feel technical, calm, intelligent, and intentional.

### 4. Content-first

A technically strong article should remain readable without JavaScript.

Blog content should be Markdown/MDX wherever possible.

### 5. Performance-first

Prefer server/static rendering.

Use React islands only where interactivity provides real value.

### 6. Accessibility-first

Do not sacrifice keyboard navigation or semantic HTML for visual effects.

## Brand direction

Desired personality:

- Engineer
- Builder
- Curious researcher
- Systems thinker
- Technical writer
- Experimental

Visual direction:

- Clean
- Minimal
- Technical
- Editorial
- Slightly experimental
- High information density without clutter

Do not lock the site into a single color palette before reviewing content and visual references.

## Homepage requirements

The homepage should answer:

1. Who is Bishweshwar?
2. What does he work on?
3. What is he interested in?
4. What has he built?
5. What can I read?
6. How can I contact him?

Suggested structure:

```text
Header
  ↓
Hero
  ↓
Current focus
  ↓
Selected experience
  ↓
Featured projects
  ↓
Labs
  ↓
Latest technical writing
  ↓
Short about section
  ↓
Contact CTA
  ↓
Footer
```

## Hero guidance

Avoid vague phrases such as:

> "Passionate software engineer who loves technology."

Prefer concrete positioning based on verified source material.

Possible information hierarchy:

- Name
- Current role
- Core engineering areas
- Short statement of current interests
- Primary CTA: View work / Read writing
- Secondary CTA: Resume / GitHub

## Experience page

Use a timeline or editorial structure.

For each role:

- Employer
- Title
- Location if verified
- Dates if verified
- Responsibilities
- Technical areas
- Selected accomplishments, only when sourced

Do not turn every bullet into marketing language.

## Projects

Each project should answer:

- What is it?
- Why does it exist?
- What did Bishweshwar build?
- Architecture
- Technologies
- Interesting technical decisions
- Result/status
- GitHub/demo links

## Labs

Labs are a signature part of the website.

Categories:

```text
Go
Rust
Quantum Computing
Cryptography
Distributed Systems
AI
```

Each lab should support a depth ladder:

```text
Lab card
  ↓
Overview
  ↓
Problem
  ↓
Theory
  ↓
Architecture
  ↓
Implementation
  ↓
Results / benchmarks
  ↓
What I learned
  ↓
Source code
```

Do not present experiments as completed research unless the supplied material supports that claim.

## Blog

Blog categories:

- Go
- Distributed Systems
- Rust
- Quantum Computing
- Cryptography
- AI

Features:

- Listing page
- Category filters
- Tags
- Article pages
- Reading time
- Date
- Related posts
- Previous/next article
- RSS
- Syntax highlighting
- Copy-code button
- Good typography

## Resume

The resume route should provide:

- Web résumé
- Downloadable PDF
- Print-friendly styling

The web résumé should not merely embed the PDF.

## Contact

Provide:

- Contact form
- Email if explicitly supplied
- LinkedIn
- GitHub

Never expose private email or personal information unless the user explicitly supplied it for public use.

Contact form requirements:

- Client-side validation
- Server-side validation where applicable
- Spam mitigation
- Success state
- Failure state
- Accessible labels

## Components

Start with reusable primitives:

```text
Header
Footer
Container
Section
Button
Link
Badge
Card
ProjectCard
LabCard
BlogCard
ExperienceItem
Tag
Breadcrumbs
CodeBlock
TableOfContents
ThemeToggle
SocialLinks
ContactForm
```

Do not create abstractions before repeated patterns actually exist.

## Content workflow

Keep content separate from layout.

Example:

```text
src/content/blog/*.mdx
src/content/projects/*.mdx
src/content/labs/**/*.mdx
```

## Git workflow

Use small logical commits.

Suggested:

```text
feat: initialize astro site
feat: add global layout
feat: add homepage
feat: add experience
feat: add projects
feat: add labs
feat: add blog system
feat: add resume
feat: add contact
feat: add SEO
perf: optimize images and bundles
a11y: improve keyboard navigation
```

## Before coding

Create a TODO checklist from the supplied source material.

Do not start inventing content to fill empty sections.

## Before completion

Run:

```bash
npm install
npm run check
npm run lint
npm run build
```

Fix errors instead of hiding them.

Then inspect every route.

## Acceptance test

A recruiter should understand the professional profile quickly.

A senior engineer should be able to explore technical depth.

A technical reader should be able to read blog posts comfortably.

A developer should be able to find GitHub/source code.

The site should feel like a real personal engineering platform, not an AI-generated template.
