---
version: 1
slug: "updates-slug"
primary_target: "updates-slug"
related_targets: ["views.js","server.js","public/styles.css"]
---

## Surface

Route `/updates/<slug>`: the page a single ICT Trends update opens. Opened from the homepage carousel (the open panel and its Read update button). Mode: **Read**.

- Audience: the public, researchers and journalists reading one NICTD update.
- Job: read the whole update, know when it was published and what kind it is, then move to an earlier or later one.
- User decisions (2026-10-02): text and photo only, with no live data panels; only this page, so the existing `/updates` list stays as it is; figures that are demonstration data are labelled. The user delegated the layout choice ("use the one you recommend for a professional look"): the dealt lead.
- Content limits: an update is a title, a category, a date and one or two sentences. The photo is the update's news-library slot, so it is illustrative.

## Direction contract

THESIS: Each update is a dated entry in NICTD's record, read like a product changelog. It refuses the category default of a pill-tagged card stack under a hero banner.

OWN-WORLD: NICTD's own system. White paper; navy #0B2C63 for the headline and date; ink #17233A for the text; NICTD blue #1C5BB8 for links; flag red #C8102E only on the demonstration-data notice. Fraunces for the headline and the large date, Inter for everything else. Hairline rules; no cards, no pills, no kicker.

STORY: The reader sees the publication date and the kind of update, reads it in full, sees its photo, is told plainly when a figure is demonstration data, and steps on through the record.

FIRST VIEWPORT: A breadcrumb (Updates / title). A left rail across 3 of 12 columns: the day set large in Fraunces, the month and year beneath, and the category under a hairline. A right column across 9: the Fraunces headline, the update at lead size, and the 16:9 photo starting inside the first viewport. Signature interaction: the date rail stays pinned beside the entry while it is read, and the record below lists every other update by date with this one's place shown. Motion grammar: nothing animates in; the content is visible at rest, and hover changes only colour and underline.

FORM: changelog entry; position 3 of my ordered list of seven; seed key 945814e8.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Amendments after the finish review (2026-10-02)

- Links use the site's own link colour, `--teal-dark` #14448A (`a` in styles.css), rather than #1C5BB8. On this page, matching every other page wins over the contract's value.
- The rail carries Earlier and Later links to the neighbouring updates by their real titles, under the category. This replaces an "Entry N of M" count, which read against the newest-first record. They are hidden on phones, where the record follows the photo closely.
- The demonstration notice sits directly under the update text, before the photo, so the label stays next to the figures it covers.
- The concept seed 945814e8 is the key printed by `concept-seed --scope surface --mode read` (source: api) in this session.

## Amendments after the user's type and motion request (2026-10-02)

- Type: Besley replaces Fraunces and Public Sans replaces Inter, chosen by the user from a specimen ("Public notice") for the whole app.
- Motion replaces "nothing animates in". On arrival:
  - the headline's words rise through masks;
  - the text and the demonstration note fade up;
  - the photo uncovers from the top while settling from 1.06 to 1 in scale.
  This is the same grammar as the News & notices list (brief `updates`), at the user's request for "animation and all". Reduced motion keeps only short fades.
- The breadcrumb's middle step reads "News & notices", the list page's new title.
