# Bishweshwar Shome — Engineering Portfolio & Technical Knowledge Hub

> Production personal portfolio and systems engineering knowledge base for **Bishweshwar Shome** ([bishweshwar.com](https://bishweshwar.com)).

[![Built with Astro](https://img.shields.io/badge/Built_with-Astro_4-FF5D01?style=flat&logo=astro)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ⚡ Architecture & Tech Stack

- **Core Engine**: [Astro 4](https://astro.build/) (Static Site Generation / SSG).
- **Language**: Strict [TypeScript](https://www.typescriptlang.org/).
- **Content Engine**: Astro Content Collections (`src/content/`) with Zod schema validation.
- **Styling**: Pure CSS Design System (`src/styles/global.css`) utilizing CSS custom properties, WCAG 2.2 AA accessibility, and zero external CSS runtime dependencies.
- **Interactivity**: Vanilla TypeScript islands (`QuantumSimulator.astro`, `RateLimiterBenchmark.astro`, `ThemeToggle.astro`).
- **SEO & Feeds**: Automatic XML sitemap generation (`/sitemap-index.xml`), RSS 2.0 feed (`/rss.xml`), Schema.org JSON-LD (`Person`, `WebSite`), and Open Graph tags.

---

## 📂 Project Structure

```text
bishweshwar-com/
├── public/
│   ├── favicon.svg             # Terminal prompt SVG favicon
│   └── robots.txt              # Crawler instructions & sitemap link
├── src/
│   ├── components/             # Reusable UI components & interactive islands
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── QuantumSimulator.astro
│   │   ├── RateLimiterBenchmark.astro
│   │   └── ThemeToggle.astro
│   ├── content/                # Typed Markdown/MDX content collections
│   │   ├── blog/               # Migrated technical articles
│   │   ├── labs/               # In-depth laboratory experiments
│   │   ├── projects/           # Architectural project case studies
│   │   └── config.ts           # Zod schema definitions
│   ├── data/
│   │   └── site.ts             # Verified career facts & site configuration
│   ├── layouts/
│   │   ├── ArticleLayout.astro # Layout for blog & labs with reading time & tags
│   │   └── BaseLayout.astro    # Global HTML5 shell & SEO meta
│   ├── pages/
│   │   ├── 404.astro           # Custom technical 404 page
│   │   ├── about.astro         # Background, philosophy & education
│   │   ├── contact.astro       # Accessible contact form with anti-spam
│   │   ├── experience.astro    # Career history timeline
│   │   ├── index.astro         # Engineering portfolio homepage
│   │   ├── resume.astro        # Web résumé with print-to-PDF styles
│   │   ├── blog/               # Article catalog & dynamic slugs
│   │   ├── labs/               # Discipline categories & deep dives
│   │   ├── projects/           # Project gallery & case study pages
│   │   └── rss.xml.ts          # RSS 2.0 endpoint
│   └── styles/
│       └── global.css          # Design system, dark/light theme, typography
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js `18.19+` or `20+`
- npm `9+`

### 2. Installation
```bash
npm install
```

### 3. Local Development
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### 4. Type Check & Production Build
```bash
npm run check  # Runs tsc --noEmit
npm run build  # Builds 100% static HTML output to dist/
```

### 5. Preview Static Bundle Locally
```bash
npm run preview
```

---

## ☁️ Deployment (Cloudflare Pages)

The website compiles to 100% static assets inside `dist/`.

1. Connect the repository to **Cloudflare Pages**.
2. Set the build settings:
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: `18.19` or `20+` (set environment variable `NODE_VERSION = 20` or `18.19.1`).

---

## 📄 License

Distributed under the MIT License.
