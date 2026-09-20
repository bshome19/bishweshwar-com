# Deployment

## Target

Recommended initial deployment:

```text
GitHub → Cloudflare Pages → bishweshwar.com
```

## Domain

Register the domain independently from hosting if desired.

Use Cloudflare DNS for the domain.

## Environment variables

Keep secrets outside Git.

Example:

```text
PUBLIC_SITE_URL
CONTACT_ENDPOINT
CONTACT_PUBLIC_KEY
```

Never commit:

```text
.env
.env.local
API tokens
private keys
SMTP passwords
```

## CI

CI should run:

```bash
npm ci
npm run check
npm run lint
npm run build
```

Pull requests should fail if checks fail.

## Production checks

After deployment:

- Open homepage
- Test all navigation
- Test contact form
- Test resume download
- Test blog links
- Test GitHub/LinkedIn links
- Check canonical URLs
- Check sitemap
- Check RSS
- Check 404
- Check mobile layout

## Rollback

Deployment must be reversible through the hosting provider's previous successful deployment/version.

## Future APIs

If technical labs require backend infrastructure:

```text
api.bishweshwar.com
```

Deploy the API independently.

Possible stack:

- Go
- Rust
- Docker
- VPS/cloud container

Do not introduce backend infrastructure until a feature requires it.
