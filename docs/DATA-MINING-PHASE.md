# NICTD — Data Mining Phase (Field Data Gathering Design)

**National ICT Database of Liberia · ICT Statistics & Policy Unit, Ministry of Posts & Telecommunications**

This document designs *how the data actually gets collected from the ground* — the fieldwork operation that feeds the platform. It answers, per county: how many researchers, how many field data collectors, what sample size, where and what is collected, how long it takes, and what the questionnaires look like. It is built in **7 layers**, each answering one operational question.

> Grounded in the real 15-county population, urban-share and area data in the database. All staffing and sample numbers are **computed** (see `scripts/build-data-mining-plan.py`) and tabulated county-by-county in `deliverables/NICTD-Data-Mining-Phase.xlsx`. This design is the field arm of the pipeline defined in `docs/DATA-COLLECTION-SOP.md`.

---

## Headline numbers (national, all 15 counties)

| Metric | Value |
|---|---|
| Household interviews (completed / issued) | **9,980 / 11,360** |
| Enumeration areas (clusters) | **574** (170 urban · 404 rural) |
| Field data collectors (enumerators) | **118** |
| Field supervisors | **31** |
| County research leads | **15** (1 per county) |
| Facility / key-informant collectors | **33** |
| **Research cadre** (leads + supervisors + KII) | **79** |
| **Total field workforce** | **197** |
| Duration (design → upload) | **≈ 11 weeks** |

---

## Layer 0 — What actually needs field mining (source triage)

Not all 30 indicators are collected in the field. Triaging first prevents sending enumerators after numbers that are really a phone call to an operator or a letter to an agency.

| Collection mode | # | Indicators | This phase? |
|---|---|---|---|
| **Field — Household survey** | 7 | internet_penetration, urban_connectivity, rural_connectivity, gender_access_gap, youth_access, smartphone_ownership, low_income_access | **Yes — core** |
| **Field — Facility / key-informant** | 2 | school_connectivity, student_device_ratio | **Yes** |
| **Field — Price audit** | 2 | mobile_basket_price, broadband_basket_price | **Yes (light)** |
| Operator feed — no field | 7 | mobile_subscriptions, mobile_broadband_subs, fixed_broadband_subs, cell_towers, mobile_network_coverage, broadband_points, data_consumption | No — data request |
| Administrative / desk — no field | 12 | fiber_coverage, ict_businesses, ict_employment, sector_investment, mobile_money_accounts, data_protection_index, digital_id_coverage, egov_services_index, cyber_incidents_reported, ewaste_generated, ewaste_collection_rate, ict_renewable_energy | No — desk / request |

**So the field operation exists mainly to produce the 7 household-survey indicators**, plus light facility visits (schools) and a price audit. The other 19 are gathered without leaving a desk. This is the single most cost-saving decision in the plan.

---

## Layer 1 — Sampling design (what sample size, and why)

**Instrument frame:** a two-stage stratified cluster sample. Stage 1 selects **enumeration areas (EAs)** within each county, stratified by **urban / rural**; stage 2 selects **20 households per EA**; one random adult (18+) is interviewed for the individual-level questions.

**Sample-size formula (per county):**

```
n0  = Z²·p·(1−p) / e²           = 1.96²·0.5·0.5 / 0.05²  ≈ 384   (95% confidence, ±5%, max variance)
nFPC = n0 / (1 + (n0−1)/N_hh)    finite-population correction on county household count
n_eff = nFPC × band              larger counties scaled up for sub-county analysis (×1.0 to ×2.0)
completed = n_eff × DEFF(1.5)    design effect for cluster sampling
issued    = completed / 0.88     12% non-response inflation
```

- **Average household size** 5.0 · **households** = population ÷ 5.
- **Sample band** — small/medium counties ×1.0; 250k–400k ×1.2; 400k–1M ×1.4; ≥1M ×2.0. This gives the big counties enough sample to break results down by district and by urban/rural, while every county still meets the ±5% county-level precision floor.

**Result — completed interviews range from 570 (smallest counties) to 1,160 (Montserrado):**

| County | Population | Urban % | Completed | Issued | EAs (Urban/Rural) |
|---|---|---|---|---|---|
| Montserrado | 1,761,000 | 85% | 1,160 | 1,310 | 66 (56/10) |
| Nimba | 621,000 | 24% | 810 | 920 | 46 (11/35) |
| Bong | 470,000 | 28% | 810 | 920 | 46 (13/33) |
| Lofa | 397,000 | 20% | 690 | 790 | 40 (8/32) |
| Grand Bassa | 288,000 | 32% | 690 | 790 | 40 (13/27) |
| Margibi | 280,000 | 45% | 690 | 790 | 40 (18/22) |
| Maryland | 173,000 | 28% | 570 | 650 | 33 (9/24) |
| Grand Cape Mount | 165,000 | 18% | 570 | 650 | 33 (6/27) |
| Grand Gedeh | 156,000 | 25% | 570 | 650 | 33 (8/25) |
| Sinoe | 125,000 | 14% | 570 | 650 | 33 (5/28) |
| Bomi | 110,000 | 30% | 570 | 650 | 33 (10/23) |
| Gbarpolu | 100,000 | 12% | 570 | 650 | 33 (4/29) |
| River Cess | 96,000 | 8% | 570 | 650 | 33 (3/30) |
| River Gee | 89,000 | 10% | 570 | 650 | 33 (3/30) |
| Grand Kru | 78,000 | 10% | 570 | 640 | 32 (3/29) |
| **National** | **4,809,000** | — | **9,980** | **11,360** | **574 (170/404)** |

> **Why the smallest counties don't get a tiny sample:** county-level precision depends on the *absolute* sample, not the population share. A county of 78,000 still needs ~570 completed interviews to estimate internet penetration to ±5%. This is the standard result and why national household surveys (DHS-style) sample roughly equal numbers per region.

---

## Layer 2 — Field team structure (how many researchers & collectors per county)

**Roles (four tiers):**

1. **Enumerators (data collectors)** — conduct the household interviews on CAPI tablets. Productivity assumed **6 completed interviews / day** over a **15-day** county fieldwork window. `enumerators = ceil(completed ÷ (6 × 15))`.
2. **Field supervisors** — one per **5 enumerators**; verify GPS/consent, re-interview spot-checks, manage the EA route.
3. **County research lead** — **1 per county**; owns sampling fidelity, quality, and the link to the central methodology team.
4. **Facility / key-informant (KII) collectors** — **2 per county (3 in the largest 3)**; run the school-visit checklists and the price audit, and interview key informants.

**"Researchers per county"** = research lead + supervisors + KII collectors (the trained research cadre, distinct from the enumerators who are the field data collectors).

| County | Data collectors (enumerators) | Supervisors | Research lead | KII collectors | **Researchers/county** | **Total field team** |
|---|---|---|---|---|---|---|
| Montserrado | 13 | 3 | 1 | 3 | **7** | **20** |
| Nimba | 9 | 2 | 1 | 3 | **6** | **15** |
| Bong | 9 | 2 | 1 | 3 | **6** | **15** |
| Lofa | 8 | 2 | 1 | 2 | **5** | **13** |
| Grand Bassa | 8 | 2 | 1 | 2 | **5** | **13** |
| Margibi | 8 | 2 | 1 | 2 | **5** | **13** |
| Maryland | 7 | 2 | 1 | 2 | **5** | **12** |
| Grand Cape Mount | 7 | 2 | 1 | 2 | **5** | **12** |
| Grand Gedeh | 7 | 2 | 1 | 2 | **5** | **12** |
| Sinoe | 7 | 2 | 1 | 2 | **5** | **12** |
| Bomi | 7 | 2 | 1 | 2 | **5** | **12** |
| Gbarpolu | 7 | 2 | 1 | 2 | **5** | **12** |
| River Cess | 7 | 2 | 1 | 2 | **5** | **12** |
| River Gee | 7 | 2 | 1 | 2 | **5** | **12** |
| Grand Kru | 7 | 2 | 1 | 2 | **5** | **12** |
| **National** | **118** | **31** | **15** | **33** | **79** | **197** |

Plus a small **central team** (not county-based): 1 survey director, 1 sampling statistician, 2 CAPI/data managers, 2 quality-assurance analysts ≈ **6 headquarters staff**.

---

## Layer 3 — Geography & logistics (where the data is collected)

- **Where:** every county, split across **urban EAs** (county capital + towns) and **rural EAs** (villages/clan areas). The urban/rural EA split follows each county's urban share — e.g. Montserrado is 56 urban / 10 rural EAs; River Cess is 3 urban / 30 rural.
- **Base of operations:** each team is hosted at the **county capital** (Montserrado→Bensonville/Monrovia, Nimba→Sanniquellie, etc.) and radiates to districts.
- **Access reality:** the large, low-density south-east (Grand Gedeh, Sinoe, River Gee, Grand Kru) and forested north-west (Gbarpolu, Lofa) need **4×4 transport and 1–2 extra travel days per remote EA** built into the 15-day window. Montserrado is compact but dense — more EAs, shorter travel.
- **What is collected on site:** the household questionnaire (Layer 5), plus at sampled schools a **facility checklist** (connectivity, devices), and in the capital a **tariff price sheet** from operator shops.
- **Mode:** **CAPI** (tablet) with offline sync — GPS-stamped, so submissions map straight onto the platform's county structure and validation rules.

---

## Layer 4 — Timeline (how long)

Counties run **in parallel** (each has its own team), so the 15-county scope does not multiply the fieldwork clock.

| Stage | Activity | Duration |
|---|---|---|
| 1 | Design, sampling frame & EA selection | 2 weeks |
| 2 | Instrument development & CAPI programming | 2 weeks (parallel with 1) |
| 3 | Recruitment & training of field teams | 1 week |
| 4 | Pilot / pre-test (2 counties) | 3 days |
| 5 | **Main fieldwork — all 15 counties in parallel** | **3 weeks** |
| 6 | Data cleaning, validation & weighting | 2 weeks |
| 7 | Analysis, county estimates & upload to NICTD | 1 week |
| | **Total** | **≈ 11 weeks** |

---

## Layer 5 — Instruments (what the questionnaires look like)

Three instruments. The **household questionnaire** is the core; the facility checklist and price sheet are short.

### 5A — Household ICT Survey (CAPI) — module map

Each module maps to the indicators it produces, so nothing is asked that the platform doesn't use.

| Module | Produces (indicator) | Level |
|---|---|---|
| A. Identification & consent | (frame, GPS, urban/rural) | Household |
| B. Household roster | denominators, age/sex weights | Household |
| C. Household ICT assets | smartphone_ownership | Household |
| D. Individual internet use | internet_penetration, urban/rural_connectivity | Random adult |
| E. Gender & youth module | gender_access_gap, youth_access | Adult + roster |
| F. Affordability & income | low_income_access, basket denominators | Household |

**Sample questions (abridged — full instrument in `deliverables/NICTD-Data-Mining-Phase.docx`):**

- **B1.** How many people usually live in this household? *(number)*
- **B2.** For each member: age, sex, highest education. *(roster grid)*
- **C1.** Does anyone in this household own a mobile phone? → **C2.** Is any of them a smartphone (internet-capable)? *(Yes/No)*
- **D1.** Have you personally used the internet in the last 3 months? *(Yes / No / Don't know)* → **produces internet_penetration**
- **D2.** Where do you usually access it? *(home / mobile data / work / school / public wifi / cyber café)*
- **D3.** How often? *(daily / weekly / monthly / less)*
- **E1.** *(asked of both an adult male and adult female where present)* Do you personally use the internet? *(Yes/No)* → **the male–female difference produces gender_access_gap**
- **E2.** *(members 15–24)* Have you used the internet in the last 3 months? → **produces youth_access**
- **F1.** In a usual month, roughly how much does this household spend on mobile airtime and data? *(LRD/USD)*
- **F2.** Household income band. *(quintile bands)* → the lowest band's D1 rate **produces low_income_access**

Answer types are closed-ended (coded) wherever possible for clean coding; a "Don't know / Refused" code is available on every question.

### 5B — School facility checklist (KII)
At each sampled school: Is there a working internet connection? *(Yes/No/Sometimes)* → **school_connectivity**; number of internet-capable learning devices ÷ enrolment → **student_device_ratio**; plus a 3-question head-teacher interview on reliability and use.

### 5C — Tariff price sheet (price audit)
In each county capital, record the cheapest entry-level mobile data-and-voice bundle and fixed-broadband plan from each operator/ISP shop → combined with GNI/income to compute **mobile_basket_price** and **broadband_basket_price**.

---

## Layer 6 — From field to platform (how it lands in NICTD)

1. **Capture** — CAPI tablets, offline, GPS-stamped, one record per household/adult.
2. **Sync & clean** — nightly upload to the survey server; range/skip/consistency checks; supervisor re-interview reconciliation.
3. **Weight & aggregate** — apply sampling weights; compute the **county-level indicator values** (and national aggregate).
4. **Format** — export to the platform's bulk-upload shape: `indicator_code, county, year, value, source` (the same template in `templates/` and `deliverables/NICTD-Indicators.xlsx`).
5. **Ingest** — an administrator bulk-uploads the CSV in the **Content Studio**; it passes automated validation, then the **human quality-review queue**, then publishes live to the Data Explorer, dashboards, API and downloads.

This closes the loop: the field operation designed here produces exactly the rows the platform's `survey`-channel pipeline expects.

---

## Assumptions & levers (all adjustable in `scripts/build-data-mining-plan.py`)

- Precision ±5% at county level; **tighten to ±3%** and every county's sample ~roughly doubles.
- Enumerator productivity 6/day and a 15-day window → raise either and the enumerator count falls.
- Household size 5.0; design effect 1.5; response rate 88%; 20 households/EA — all standard, all editable.
- Bands scale the big counties for sub-county analysis; drop them and all counties converge to ~570 completed.
