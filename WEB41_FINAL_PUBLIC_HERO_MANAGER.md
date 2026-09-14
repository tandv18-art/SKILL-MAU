# WEB41 — Final public hero manager polish

## Goal
Make the public TÔI LÀ AI homepage easier to operate without code changes.

## Public hero
- Hero uses full-image slides only.
- The image frame is larger and visually balanced against the copy.
- Subtle decorative polish remains lightweight.
- One World Check-in visual remains as a fallback.
- A short benefit line sits under the main CTAs.
- Mobile uses a shorter responsive image ratio while preserving left / center / right focus.

## Owner-managed slider
Owner page: `/hero-admin`

The page lets the site admin upload JPG/PNG/WEBP images, keep up to 8 images, reorder them, enable or disable them, add an optional short caption, choose crop focus, remove images, and save without touching GitHub or Vercel.

Browser-side preparation resizes large photos before upload to keep the homepage light.

## Authorization
No new admin table or migration is introduced. An authenticated Neon Auth user with role `admin` can manage the Hero. The original workspace-owner check remains only as a compatibility fallback. Other accounts fail closed.

## Storage
The existing private Vercel Blob store is reused.
- images: `site/hero/...`
- versioned configs: `site/hero-config/...`
- browser delivery: `/api/hero-image?path=...`

The Blob store remains private. Public image delivery only accepts sanitized managed Hero paths and returns cached image bytes. Upload, save, and delete require admin authorization.

## Auth polish
Stale auth error parameters are removed once a valid signed-in session exists. If Google returns an unlinked-account error, the UI tells the user to use the existing email and password account.

## Verified Preview acceptance
- real photo upload: PASS
- save / reorder / delete: PASS
- private Blob image delivery: PASS
- public Hero renders saved photos: PASS
- final Vercel Preview: READY
- Vercel status: SUCCESS

## Safety invariants
- AI Social Post Kit is unchanged.
- Facebook and TikTok publishing are unchanged.
- No database migration is added.
- No billable AI call is added.
