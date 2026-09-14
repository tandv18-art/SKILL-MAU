# WEB41 — Final public hero manager polish

## Goal
Make the public TÔI LÀ AI homepage easier to operate without code changes.

## Public hero
- Hero uses only full-image visual slides.
- Product-card / portrait-card / prompt-card showcase images are no longer mounted by the runtime.
- Desktop hero gives more space to the image frame and removes the slight 3D skew.
- Decorative background polish stays subtle and CSS-only.
- One World Check-in image remains as the safe fallback if no managed config is available.

## Owner-managed slider
Owner page: `/hero-admin`

The page lets the site owner:
- upload JPG/PNG/WEBP images;
- keep up to 8 images;
- reorder images;
- turn individual images on/off;
- optionally add a short caption;
- choose left/center/right crop focus;
- remove images;
- save changes without GitHub or Vercel.

Browser-side upload preparation resizes photos to a maximum 1800×1150 and converts them to JPEG before upload to keep the site light.

## Authorization
No new admin table or migration is introduced. The authenticated user must match the oldest `workspace_accounts` row. This pins site-owner access to the original workspace account while later customer accounts remain non-admin.

## Storage
Reuses the existing Vercel Blob connection:
- images: `site/hero/...`
- immutable versioned configs: `site/hero-config/...`

Public hero GET is read-only. Upload/save/delete require the owner check and fail closed.

## Safety invariants
- AI Social Post Kit is unchanged.
- Main-site real PayOS checkout stays locked.
- No Facebook/TikTok publish change.
- No video gate change.
- No database migration.
- No provider-billable AI call is added.
