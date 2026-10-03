---
version: 1
slug: "updates"
primary_target: "updates"
related_targets: ["views.js","public/styles.css","updates-slug"]
---

## Surface

Route `/updates`, titled **News & notices**: every NICTD update in date order, each title opening its own page (`/updates/<slug>`, see the `updates-slug` brief). Mode: **Read**.

- Audience: the public, researchers and journalists scanning what NICTD has published.
- Job: see what has been published and when, narrow it by kind, and open any update by its title.
- User decisions (2026-10-02):
  - "headers of trend clickable";
  - "remove all normal ai slob fonts and make it beautiful with animation";
  - the type pairing chosen from a specimen, option A "Public notice": Besley for headings, and Public Sans for text and figures, across the whole app. It replaces Fraunces, Inter, Manrope, Chakra Petch and the Georgia headings.
- Content limits:
  - every word comes from the `updates` table: title, body, category, published_on;
  - the photo is the update's news-library slot, as on the single page;
  - figures that are demonstration data are marked.

## Direction contract

THESIS: The same dated record as the single update page, set as a public notice board: each entry is ruled into the record, then written.

OWN-WORLD:
- NICTD's own system, as on `updates-slug`: white paper, navy #0B2C63, ink #17233A, the site's link colour #14448A, and flag red only on demonstration-data marks.
- Besley (a Clarendon) for the page title, entry titles and the day numerals; Public Sans for everything else.
- Hairline rules; no cards, no pills, no kicker. The old "News & notices" kicker becomes the page's own title.

STORY: The reader sees the title and how many updates there are. They filter by kind if they want, scan the dated entries, and open one by its title or photo.

FIRST VIEWPORT:
- Breadcrumb, then the large Besley title with the lede and a count line ("5 updates · latest 30 Jun 2026").
- A text filter row (All, News, Announcements, Data refresh, each with its count; the active one underlined).
- Then the entries. Each entry has three columns across 12: a date rail (2: the day large, the month and year, the category), the text (6: the Besley title as the link, the update text, a demonstration mark when it states figures), and a 16:9 photo (4).

MOTION (the user asked for it):
- One authored idea: an entry is ruled, then written. As each entry enters the viewport, its top hairline draws left to right. Then the day and title rise through a mask, the text fades up, and the photo uncovers from the top while settling from 1.06 to 1 in scale.
- The page title's words rise through a mask on load.
- Hover draws the title's underline from the left and eases the photo in by 3%.
- Filtering uses a view transition where the browser has one.
- Everything is visible when scripts fail. Reduced motion keeps only short opacity fades.

FORM: changelog index, the sibling of the `updates-slug` entry page.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review and the comparison record.

## Amendments after the finish review (2026-10-02)

- No concept roll ran for this surface. It is the index sibling of `updates-slug` and inherits that page's form and seed key, 945814e8.
- Each update keeps one photo wherever it appears: the carousel, this list and its own page. The photo is counted from the oldest update, so it stays fixed as new updates are published. The homepage now fetches every update for this, and the carousel still shows the latest eight.
- The homepage carousel's category and date sit under each title as a byline, not above it.
- On phones the filter is a single row that scrolls sideways if it must.
- Text selection is navy on both pages.
- Printing shows every entry at rest.
