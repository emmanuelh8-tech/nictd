---
version: 2
slug: "careers"
primary_target: "careers"
related_targets: ["views.js","server.js","public/styles.css","public/careers.js","docs/sql/job-applications.sql","careers-apply"]
---

## Surface

Routes `/careers` (recruitment page) and `/careers/apply/<role>` (one application page per role). Mode: **Persuade**. The visitor decides to apply and then applies on the role's own page.

- Audience: young Liberians looking for field, research and data work. Many are on phones.
- User decisions (2026-10-03):
  - **Reference:** "use this design and animation on my careers page … i want the same", pinned to the Sharplink site from the screenshots and video the user supplied.
  - **Form:** the application form must not show on the Careers page. It opens on its own page when the visitor applies for a role, and that page should be improved.
  - **3D:** a chrome Liberian star, drawn live in WebGL, replaces the reference's chrome renders. No AI images. Sharplink's own assets, wordmark and copy are not used.
  - **Type:** Public Sans (the app's text face) for headings on these two pages, at light weights to match the reference's thin grotesk. Besley stays on the rest of the site.
  - Every fact on the page comes from the existing Careers content and the `CAREER_ROLES` list.
- Constraints:
  - Applications hold personal data. The `job_applications` table is insert-only (`docs/sql/job-applications.sql`, still to be run by the user).
  - CVs are stored outside /public.
  - Three.js 0.169 comes from jsDelivr, the project's existing convention in niip-3d. The page must work without it.

## Direction contract

THESIS: NICTD recruitment as a precision instrument. One chrome star travels the page as its constant object while the sections pass from black through NICTD blue to ice white. It refuses the banner, pill-tagged job cards and on-page form of the old page.

OWN-WORLD:
- Gradient fields: off-black #05070C, navy #0B1E45, NICTD blue #1C4C9E to #4F7FCF, ice #DCE6F1, near-white #F4F6F8.
- One electric accent, #2F66D8, on the arrow tabs and markers.
- Light-weight Public Sans headlines and uppercase micro-type for labels and buttons.
- Every edge square (radius 0): white buttons with a separate blue arrow tab, dark translucent secondary buttons.
- Dashed technical callouts around the star, and small blue square markers.

STORY: The visitor meets the star and the line "Careers at NICTD. Built and run by Liberians." They see who the work is for, scroll the open roles one at a time beside the turning star, learn how joining works, read the FAQ, and apply on the role's page.

FIRST VIEWPORT:
- Black-to-navy field.
- Left: a two-tone headline that decodes letter by letter.
- Two buttons: See open roles and How to join.
- Right: the chrome star, large, turning, with dashed callout boxes and connectors.
- Bottom left: a subtext of 20 words or fewer.

Signature interaction: the open roles are a scroll-pinned list. The role at the centre of the screen brightens and its title decodes; the others dim. Each role turns a different point of the star to the front.

Motion grammar:
- One curve, cubic-bezier(.16,1,.3,1).
- Letters decode in random order.
- Paragraph words fill as they scroll through.
- The star dissolves to a dashed wireframe in the black section.
- The FAQ opens with an animated height.
- The closing wordmark rises.
- Reduced motion shows the final states with no movement.

FORM: Sharplink-pinned reference build. No concept roll: a user-pinned direction beats the roll.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Amendments after the first finish review (2026-10-03, rebuild of the star)

- The star is a machined chrome emblem: an extruded Lone Star with a deep smooth bevel (creased normals) and a low ridge on each face, lit by a photographic room environment with hard specular bars. Blue appears only as a faint bounce.
- It sways within about 32 degrees of face-on instead of spinning, so it always reads as a star. In the roles each role has its own pose, and a dashed callout box marks that role's point.
- The hero overlay is denser and anchored to the star's real points: boxes on four points with leaders and dotted lines converging on the centre, small boxes on the inner corners, and boxes on the ring.
- Dimmed roles dim only their words; the Apply button stays at full strength.
- Display headings are Public Sans 300. The dark section's heading measure is narrower, and the star sits further right there.
- The apply page's form sections carry the square blue markers, and the success button is the dark variant on the light panel.

## Amendment: the NIIS icon replaces the star (2026-10-03, at the user's request)

- The user supplied the NIIS app icon ("NIIS, Powered by NIAA") and asked for it to replace the star as a 3D object, keeping its colours and look.
- The icon is built in Three.js from the flat image's layout and colours:
  - an extruded rounded-square frame with a blue-to-violet gradient;
  - a recessed white panel;
  - four colour pills;
  - a blue lens rim with a steel handle and silver collar;
  - a frosted chart card with three shaded bars and a red arrow;
  - the NIIS / Powered by NIAA wordmark in extruded type.
- Its plastic parts skip the filmic tone curve, so the brand colours stay true. Only the metal keeps the dark studio's reflections.
- The bezel ring is now a halo behind the icon. Callouts anchor to the icon's parts; in the roles they mark lines (field), handle (supervision), lens (research), bars (data) and arrow (mapping).
- 2026-10-03, at the user's request:
  - The dotted callout overlay round the icon is removed.
  - The icon uses Liberia's colours only:
    - frame: light blue to flag blue;
    - pills: two reds and two blues;
    - bars: light blue, flag blue and red;
    - arrow: flag red;
    - wordmark: flag navy.
  - The closing wordmark reads NIIS.
- 2026-10-03, at the user's request:
  - The ring is removed, and the 3D Liberia seal replaces the NIIS icon. The seal is traced from its artwork into a gold, bevelled, extruded body with a relief face.
  - The user added the seal image `public/img/brand/images (51).jpg`. It is a JPEG with a baked-in checkerboard, so it was cleaned into `seal-large.png`: real transparency, 4× upscale to 1590×1682, smoothed edges, colour bleed under the edge.
  - A 316 KB copy, `seal-large.webp`, is the one the page loads.
  - The face texture is kept at full resolution (up to 2048 px). Its edges use alpha-to-coverage, and the body's outline is Chaikin-smoothed.
