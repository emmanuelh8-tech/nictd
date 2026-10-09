# NIIS — Data Collection Standard Operating Procedure (SOP)

**National ICT Database of Liberia · ICT Statistics & Policy Unit, Ministry of Posts & Telecommunications**

This SOP defines *what* the platform tracks, *who* supplies each figure, *how* it enters the system, and the *quality gate* every value passes before publication. It covers all **30 indicators**, each collected for the **15 counties** and stored as a yearly time series.

> Companion files: `templates/nictd-indicator-dictionary.csv` (full metadata + how-to-collect per indicator) and `templates/nictd-collection-template-<year>.csv` (blank, upload-ready fill sheet). Regenerate both with `node scripts/gen-collection-template.js`.

---

## 1. Collection channels

Every data point enters through one of three channels (the `channel` field on a submission):

| Channel | Code | Best for | Mechanism |
|---|---|---|---|
| **Survey** | `survey` | Demand-side, county-disaggregated indicators (penetration, ownership, income/gender/age splits) | National household ICT survey, disaggregated by enumeration area, run by LISGIS |
| **Operator feed** | `operator_feed` | Supply-side indicators (subscriptions, coverage, towers, traffic) | Periodic returns / data-sharing feeds from licensed operators & ISPs via the LTA |
| **Manual upload** | `manual` | Agency-sourced registers & index scores (business registry, mobile money, schools, e-waste, CERT, governance indices) | Admin CSV bulk upload or single-row form in the Content Studio |

---

## 2. The data pipeline (collect → validate → review → publish)

```
 Source agency ──► Submission ──► Automated validation ──► Human quality review ──► Published
 (survey/feed/     (data_          (range & type checks;    (admin approve/reject    (live data_points;
  registry)         submissions)     flags out-of-range)      in the review queue)     visible + downloadable)
```

1. **Collect** — the source agency compiles the county figures for the reporting year.
2. **Submit** — values enter `data_submissions` via one of the three channels.
3. **Validate (automatic)** — range/type checks run on submission (e.g. a `%` value > 100, or `mobile_subscriptions` > 160 per 100, is flagged, not silently accepted).
4. **Review (human)** — an administrator approves or rejects each submission in the **quality-review queue** (`/admin` → Data quality review).
5. **Publish** — approved values upsert into `data_points` and appear immediately in the Data Explorer, dashboards, API, and downloads.

No figure reaches the public front end without passing steps 3 and 4.

---

## 3. Indicator → source → channel → frequency map

### Connectivity (8)
| Indicator | Code | Source agency | Channel | Frequency |
|---|---|---|---|---|
| Internet penetration | `internet_penetration` | LISGIS / LTA | Survey | Annual |
| Mobile-cellular subscriptions | `mobile_subscriptions` | LTA (operator returns) | Operator feed | Annual |
| Active mobile-broadband subscriptions | `mobile_broadband_subs` | LTA (operator returns) | Operator feed | Biennial |
| Fixed broadband subscriptions | `fixed_broadband_subs` | LTA / ISPs | Operator feed | Biennial |
| Urban connectivity | `urban_connectivity` | LISGIS | Survey | Annual |
| Rural connectivity | `rural_connectivity` | LISGIS | Survey | Annual |
| Gender access gap | `gender_access_gap` | LISGIS | Survey | Annual |
| Youth access (15–24) | `youth_access` | LISGIS | Survey | Biennial |

### Access & Infrastructure (6)
| Indicator | Code | Source agency | Channel | Frequency |
|---|---|---|---|---|
| Cell tower density | `cell_towers` | LTA site registry | Operator feed | Annual |
| Population covered by 4G | `mobile_network_coverage` | LTA / operators | Operator feed | Biennial |
| Fiber backbone coverage | `fiber_coverage` | LTA / MoPT backbone unit | Manual upload | Biennial |
| Fixed broadband access points | `broadband_points` | LTA / ISPs | Operator feed | Annual |
| Schools connected to the internet | `school_connectivity` | Ministry of Education (EMIS) | Manual upload | Annual |
| Students per learning device | `student_device_ratio` | Ministry of Education (EMIS) | Manual upload | Annual |

### Affordability (5)
| Indicator | Code | Source agency | Channel | Frequency |
|---|---|---|---|---|
| Mobile data-and-voice basket | `mobile_basket_price` | LTA tariffs + LISGIS income | Manual upload | Biennial |
| Fixed-broadband basket | `broadband_basket_price` | LTA tariffs + LISGIS income | Manual upload | Annual |
| Smartphone ownership | `smartphone_ownership` | LISGIS | Survey | Biennial |
| Average data consumption | `data_consumption` | LTA / operators | Operator feed | Annual |
| Access — lowest income band | `low_income_access` | LISGIS | Survey | Biennial |

### Market Structure (4)
| Indicator | Code | Source agency | Channel | Frequency |
|---|---|---|---|---|
| Registered ICT businesses | `ict_businesses` | MoPT / business registry | Manual upload | Biennial |
| ICT sector employment | `ict_employment` | MoPT / sector returns | Manual upload | Annual |
| ICT sector investment | `sector_investment` | MoPT | Manual upload | Biennial |
| Registered mobile money accounts | `mobile_money_accounts` | Central Bank of Liberia | Manual upload | Biennial |

### Digital Trust & Governance (4)
| Indicator | Code | Source agency | Channel | Frequency |
|---|---|---|---|---|
| Data protection framework score | `data_protection_index` | ICT Statistics & Policy Unit | Manual upload | Biennial |
| Digital ID coverage | `digital_id_coverage` | National ID authority | Manual upload | Annual |
| E-government services score | `egov_services_index` | ICT Statistics & Policy Unit | Manual upload | Annual |
| Cybersecurity incidents reported | `cyber_incidents_reported` | National CERT | Manual upload | Biennial |

### Sustainability / E-Waste (3)
| Indicator | Code | Source agency | Channel | Frequency |
|---|---|---|---|---|
| E-waste generated | `ewaste_generated` | EPA / MoPT | Manual upload | Biennial |
| E-waste formally collected | `ewaste_collection_rate` | EPA / registered recyclers | Manual upload | Biennial |
| ICT sector renewable electricity | `ict_renewable_energy` | EPA + operators | Manual upload | Annual |

---

## 4. How to submit data (manual / CSV channel)

The bulk uploader (Content Studio → **Bulk CSV upload**, or `POST /admin/data/bulk`) expects **exactly these five columns**:

```
indicator_code, county, year, value, source
```

- **indicator_code** — must match a code from the tables above (e.g. `internet_penetration`).
- **county** — a county name exactly as listed, **or** `National` for the country-level aggregate.
- **year** — four-digit reporting year (e.g. `2026`).
- **value** — the numeric figure in the indicator's unit (see dictionary CSV).
- **source** — free text citing the origin (e.g. `2026 household survey, wave 1`). Optional but recommended.

**Steps for the data steward:**
1. Open `templates/nictd-collection-template-<year>.csv` (450 blank county rows for the year).
2. Send the relevant rows to each source agency (filter by indicator), or fill from received reports.
3. Enter each `value`; add a `source` note. Leave rows you can't yet fill blank and delete them before upload (blank-value rows are skipped/flagged).
4. Log in as an administrator → **Admin Panel → Content Studio → Bulk CSV upload** → paste or upload the completed CSV.
5. Confirm the result banner (e.g. *"Published N data point(s); skipped M"*) and spot-check the Data Explorer.

> **County vs National:** collect county-level values; the national figure is published as a separate `National` row. For genuinely national indicators (governance index scores, CERT incidents), fill the `National` row and, if a county breakdown isn't available, repeat the national figure across counties or leave county rows out.

---

## 5. Roles & responsibilities

| Role | Responsibility |
|---|---|
| **Source agency focal point** | Compiles county figures for its indicators each reporting cycle; signs off on accuracy. |
| **Data steward (ICT Statistics & Policy Unit)** | Consolidates agency returns into the CSV template, submits via the appropriate channel, chases missing values. |
| **Administrator (platform)** | Runs the bulk upload, works the quality-review queue (approve/reject), publishes, and monitors validation flags. |
| **Reviewer / statistician** | Second-checks flagged submissions and outliers before approval. |

---

## 6. Validation rules (automatic, at submission)

- Value must be a non-negative number.
- For `%`-unit and index indicators, values above 100 are **flagged** for review.
- `mobile_subscriptions` above 160 per 100 is **flagged** (implausible for the unit).
- Flagged submissions are held in the queue with a note; they are never auto-published.
- Additional per-indicator plausibility bands can be added in `validateSubmission()` (server) as real ranges are established.

---

## 7. Reporting calendar (recommended)

- **Annual indicators** — collect Q1, submit and publish by end of Q1 for the prior year.
- **Biennial indicators** — collect on odd/even alternating years per the frequency column above.
- **Operator feeds** — ingest quarterly where agreements allow; publish the year-end consolidated figure.
- Each published refresh should be announced via the **Updates** section (Content Studio → New update, category *data refresh*).

---

## 8. Data-sharing prerequisites (before live collection)

- Formal MOUs / data-sharing agreements with: **LTA**, **LISGIS**, **Ministry of Education (EMIS)**, **Central Bank of Liberia**, **EPA**, **National CERT**, and the **National ID authority**.
- Agreed definitions and units per indicator (the dictionary CSV is the reference).
- A privacy safeguard: only aggregate, anonymized, county-level statistics are collected — no individual-level personal data.

> **Current status:** all values in the platform are labelled **demonstration data**. This SOP is the plan to replace them, indicator by indicator, with real agency returns through the three channels above.
