# Fort Trails

A shared travel log for you and your crew: visited forts/places, a wishlist with
voting, photo albums per place, and a trip planner (itinerary + checklist).

Built with Next.js (App Router). Data is shared across everyone who opens the
deployed site — there's no login, just a "your name" field stored on each
device so contributions are attributed.

## What's inside

- `app/page.js` — the whole UI (Overview, Visited, Wishlist, Gallery, Planner)
- `app/api/entries` — CRUD for visited/wishlist places
- `app/api/trips` — CRUD for trip plans (itinerary + checklist)
- `app/api/upload` — handles photo uploads to Vercel Blob
- `lib/store.js` — data layer (Upstash Redis in production, a local JSON file
  for local dev so you can run it without setting anything up first)

## Password-protecting the site

The whole site (pages + API) is gated behind a single shared password when you
set an `APP_PASSWORD` environment variable in Vercel:

- Project → **Settings → Environment Variables** → add `APP_PASSWORD` with
  whatever password you want your crew to use → redeploy.
- Visiting the site now redirects to `/login` until the right password is
  entered; it's remembered for 30 days via a cookie.
- Leave `APP_PASSWORD` unset (or delete it) to turn the gate off entirely —
  the site behaves exactly as before, open to anyone with the link.
- There's a **Log out** link at the bottom of the left rail if anyone needs
  to clear their session on a shared device.

This is a single shared password for the whole crew, not per-person accounts
— simplest option for a small friend group. Let me know if you'd rather each
person have their own login later on.

## Deploy to Vercel (recommended path)

1. **Push this folder to a GitHub repo.**
   ```
   cd fort-trails
   git init
   git add .
   git commit -m "Fort Trails"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import the repo in Vercel** — vercel.com → Add New → Project → pick your repo.
   Framework preset should auto-detect as Next.js. Click Deploy — it will
   build fine even without storage attached yet (it'll just have nowhere to
   save data until step 3).

3. **Attach storage** (do this once, from your Vercel project dashboard):
   - Go to your project → **Storage** tab → **Create Database**.
   - **Blob** — this handles photo file storage. Pick it, create it, connect
     it to this project. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically.
   - **Redis** (via the Marketplace — Upstash is the usual option) — this is
     where entries/trips/wishlist data lives. Create it, connect it to this
     project, and Vercel injects `UPSTASH_REDIS_REST_URL` /
     `UPSTASH_REDIS_REST_TOKEN` automatically.
     (Note: Vercel's old built-in "KV" product was retired and replaced by
     this Marketplace Redis flow — Upstash has a free tier that's plenty for
     a friend group's trip log.)

4. **Redeploy** once storage is attached (Vercel → Deployments → ⋯ → Redeploy),
   so the new environment variables are picked up.

5. Open the deployed URL, tap **Set your name** in the bottom-left, and start
   logging. Share the URL with your friends — everyone sees the same data.

## Running locally

```
npm install
npm run dev
```

Without KV configured, local dev automatically falls back to a JSON file at
`.local-data/db.json` so you can try things out. Photo upload needs
`BLOB_READ_WRITE_TOKEN` even locally — easiest way is to run
`vercel env pull .env.local` after attaching Blob storage on Vercel, or just
test uploads after deploying.

## Regions, map, and coordinates

- **Region field** is now a dropdown of all 36 Maharashtra districts, plus
  any custom categories your crew adds via "+ Add new category" in the
  logging form. Custom categories are shared/stored for everyone (`/api/categories`).
- **Overview map** is a real, pannable/zoomable map (Leaflet + OpenStreetMap
  tiles) — completely free, no API key or billing needed, unlike Google Maps.
  Only entries with latitude/longitude show up as pins.
- **Adding coordinates**: in the logging form, you can either
  - type them in directly,
  - click **Auto-locate from name**, which does a free lookup (OpenStreetMap's
    Nominatim geocoding service) based on the place name + region, or
  - click **Use my current location**, handy if you're logging a visit while
    actually standing at the fort.
- Coordinates are optional — places without them just won't have a pin, and
  still show up fine everywhere else in the app.

## Notes / things you may want to extend

- **Real map coordinates**: the trail map on Overview currently places pins
  using a deterministic-but-fake position per name (no map API is wired in).
  Swapping in real lat/long (e.g. via a geocoding call when you add a place)
  is a natural next step.
- **Photo deletion** removes the reference from the entry but doesn't delete
  the underlying Blob file — fine for a small crew, but worth adding if
  storage usage matters to you.
- **No auth**: anyone with the link can add/edit/delete. Fine for a private
  link shared with friends; add a simple shared password or Vercel's
  password-protection (Pro plan) if you want a gate.
