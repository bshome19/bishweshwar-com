# Design System — Bishweshwar.com

## Design principles

1. Technical credibility over decoration.
2. Content should be the visual focus.
3. Strong typography.
4. Excellent readability.
5. Subtle interaction.
6. Consistent spacing.
7. Mobile-first.
8. Accessible by default.

## Visual language

The site should combine:

- Editorial documentation
- Modern developer tooling
- Personal research notebook
- Professional engineering portfolio

Avoid the appearance of:

- Generic SaaS landing page
- Crypto marketing website
- AI-generated portfolio
- Excessively flashy developer landing page

## Typography

Use a highly readable primary sans-serif.

Use a monospace font selectively for:

- Code
- Technical labels
- Commands
- Architecture snippets
- Small metadata

Do not use monospace for long-form article prose.

## Layout

Use a constrained reading width for articles.

Suggested conceptual widths:

```text
Global content: 1100–1200px
Article text:   680–780px
Wide labs:      1100–1300px
```

Treat these as design guidance, not hard requirements.

## Animation

Animation should communicate state or hierarchy.

Allowed:

- Subtle hover
- Small entrance transitions
- Expand/collapse
- Interactive lab transitions

Avoid:

- Constant motion
- Parallax-heavy layouts
- Scroll-jacking
- Long page-load animations

Honor:

```css
@media (prefers-reduced-motion: reduce)
```

## Dark mode

If implemented, make it a true design system rather than simply inverting colors.

Code blocks, borders, muted text, links, and surfaces need deliberate dark-mode values.

## Cards

Cards should be used for meaningful grouping, not every paragraph.

## Icons

Use a consistent icon library or simple SVGs.

Do not mix many icon styles.

## Images

Prefer:

- User-provided images
- Project screenshots
- Diagrams
- Original technical visualizations

Avoid generic stock imagery.
