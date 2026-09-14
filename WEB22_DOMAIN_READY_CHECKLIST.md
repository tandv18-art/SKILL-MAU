# WEB22 — TÔI LÀ AI main site domain readiness

## Canonical public host

- Canonical: `https://toilaai.net/`
- `www.toilaai.net` must be added in Vercel as a redirecting project domain to `https://toilaai.net` with HTTP 301 when the domain is attached.
- Do not point DNS until a Production deployment exists for project `skill-mau`.

## Public surfaces

- `/` — main TÔI LÀ AI website
- `/privacy` — public privacy policy
- `/terms` — public terms
- `/robots.txt`
- `/sitemap.xml`
- `/favicon.svg`
- `/toilaai-social-card.png` — 1200×630 social share image

## Safety invariants

- Main-site PayOS checkout remains locked (`CHECKOUT_LIVE_ENABLED=false`).
- WEB21 `PAYOS_PAYMENTS_ENABLED` remains OFF.
- AI Social Post Kit remains a technically separate Web App linked at `https://ai-social-post-kit.vercel.app`.
- No Facebook/TikTok publishing or video gates are changed.

## Domain cutover sequence

1. Finish review of WEB21 and WEB22 Preview.
2. Merge WEB21 to `main`, then merge/rebase WEB22 delta onto `main`.
3. Verify `skill-mau` Production deployment is READY and runtime errors are zero.
4. In Vercel project `skill-mau`, add `toilaai.net` as the primary production domain.
5. Add `www.toilaai.net` as a 301 redirect to `https://toilaai.net`.
6. Use the exact DNS records Vercel displays for the registrar; do not guess DNS values.
7. Wait for Vercel to report both domains configured/verified and SSL issued.
8. Revalidate `/`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, favicon and social-card URLs on the real domain.
9. Confirm canonical/OG metadata still points to the apex domain.
10. Keep main-site payment OFF until a separate commercial go-live approval.
