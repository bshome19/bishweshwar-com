# SEO and Discoverability

## Global

Set:

- Site title
- Description
- Canonical base URL
- Robots policy
- Sitemap
- RSS feed

## Page metadata

Every public page needs:

```text
title
description
canonical
OpenGraph title
OpenGraph description
OpenGraph image where appropriate
```

## Person schema

Use JSON-LD `Person` only with information the user has explicitly made public.

Potential properties:

- name
- url
- sameAs
- jobTitle
- worksFor

Do not infer private details.

## Article schema

Blog posts should use Article/BlogPosting structured data where appropriate.

Include only factual metadata.

## Technical SEO

- Semantic URLs
- Correct heading hierarchy
- Internal links
- Breadcrumbs where useful
- XML sitemap
- RSS
- Canonical URLs
- 404 page
- Redirect strategy when slugs change

## Social sharing

Create a consistent Open Graph image system.

Possible pattern:

```text
Bishweshwar
Article title
Category
```

Avoid rendering giant amounts of text into OG images.
