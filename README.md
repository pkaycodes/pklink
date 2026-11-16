# PKLink

**Anything you want to share. One scan away.**

**Live site:** <https://site-1e61daf990414aa78567f4776a59d442.freebuff.page/>

PKLink turns a message, photos, a video, a document or a link into a beautiful page with a shareable link and a QR code you can print. No app is needed on the other end — just a phone camera.

Built for the things people actually share in Ghana and beyond: a shop menu, a wedding invitation, a CV, a product catalogue, a memorial page, a payment request, a Wi-Fi password, a portfolio.

## What you can make

- **Text pages** — a title, subtitle and blocks of text with headings and paragraphs.
- **Photo galleries** — upload images and add captions.
- **Video pages** — share an MP4, WebM, MOV or OGG clip.
- **Documents** — attach a PDF, Word, Excel, PowerPoint, CSV, text file or ZIP.
- **Link pages** — a button that points anywhere on the web.
- **Mixed pages** — combine text, media and links in any order, up to 60 blocks.

Every page is live at `/p/<slug>` the moment it is published. Pages can be set to expire after a date. The QR code encodes that address, so it works with any scanner and survives a printed poster.

## Access modes

| Mode | Who can open it |
| --- | --- |
| Public | Anyone with the link or QR code; search engines may index it |
| Unlisted | Anyone with the link; search engines are asked to stay out |
| Password | Visitors must enter a password you set |
| Private | Only you, while signed in |

Access is checked on the server. Private and password-protected content is never sent to the browser until the visitor is allowed to see it.

## QR codes

- Pick foreground and background colours.
- Add a logo and choose its size.
- Toggle rounded modules.
- Download a crisp PNG or SVG, or print the page directly.
- Each page keeps its own QR settings.

## Accounts and analytics

- Start as a guest — up to 5 pages, stored against a browser cookie.
- Create an account to keep pages across devices; guest work can be claimed when you sign up.
- See total scans, unique visitors, device mix, approximate countries, a 14-day chart and the latest scans.
- No third-party analytics, pixels or ad trackers.

## Stack

- **Framework:** Next.js 16 (App Router, Server Actions) and React 19
- **Styling:** Tailwind CSS 4, hand-built components, Lucide icons
- **Runtime:** Cloudflare Workers through OpenNext (`@opennextjs/cloudflare`)
- **Database:** Cloudflare D1 (SQLite), schema created automatically on first request
- **Files:** Cloudflare R2 for images, video and documents
- **Auth:** email + password, PBKDF2-SHA-256 hashing, HTTP-only session cookies

## Run it locally

Requires **Node.js 20.9+**, a Cloudflare account and Wrangler (installed by the project).

```bash
npm install
npx wrangler login
```

Create the D1 database and R2 bucket:

```bash
npx wrangler d1 create pklink
npx wrangler r2 bucket create pklink-files
```

Copy the `database_id` Wrangler prints into `wrangler.jsonc`. The checked-in ID is a placeholder. Then:

```bash
npm run dev
```

Open <http://localhost:3000>. The dev server uses the bindings declared in `wrangler.jsonc`; the schema initialises on the first request.

Useful checks:

```bash
npm run typecheck
npm run build
```

### Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Canonical origin used in QR links, for example `https://pklink.example`. Optional locally. |

The D1 binding is `DB` and the R2 binding is `FILES`. Both are declared in `wrangler.jsonc`.

### Upload limits

| Kind | Formats | Limit |
| --- | --- | --- |
| Images | JPEG, PNG, WebP, GIF, AVIF | 12 MB |
| Video | MP4, WebM, MOV, OGG | 80 MB |
| Documents | PDF, Office, CSV, Markdown, text, ZIP, audio | 20 MB |

## Deploy to Cloudflare

```bash
npx opennextjs-cloudflare build
npx wrangler deploy
```

The Worker serves the Next.js app, D1 and R2 from one deployment. Set `NEXT_PUBLIC_APP_URL` to the production origin so QR codes point at the right host.

## Project layout

```
app/                 pages, server actions and API routes
app/p/[slug]/        public page renderer
app/dashboard/       page list, editor, QR studio and scan stats
components/          editor, QR panel, article renderer and UI pieces
lib/                 D1 access, auth, validation, media, analytics and types
proxy.ts             guest identity cookie
wrangler.jsonc       D1 + R2 bindings and Worker configuration
```

## Privacy notes

- Passwords are hashed with PBKDF2-SHA-256 at 100,000 iterations.
- Password unlocks use signed, HTTP-only cookies.
- Visitor hashes are salted with a per-install secret before storage.
- Page content is only returned after the server has checked the access mode.
- The app does not load third-party scripts, fonts or analytics.

## Status

PKLink is an early working product. The core flow — create, publish, scan, edit, analyse and delete — works end to end on Cloudflare. Billing, custom domains and team accounts are not part of this version.
