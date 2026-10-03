# build-data-mining-plan.py — compute the NICTD Data Mining Phase sampling & field-team plan
# from real county data, and emit an Excel workbook. Prints computed totals for reuse in docs.
import os, math, json
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "deliverables")
os.makedirs(OUT_DIR, exist_ok=True)

# ---- real county data (from Supabase counties table) ----
# name, capital, population, area_km2, urban_share
COUNTIES = [
    ("Montserrado", "Bensonville", 1761000, 1909, 0.85),
    ("Nimba", "Sanniquellie", 621000, 11551, 0.24),
    ("Bong", "Gbarnga", 470000, 8754, 0.28),
    ("Lofa", "Voinjama", 397000, 9982, 0.20),
    ("Grand Bassa", "Buchanan", 288000, 7936, 0.32),
    ("Margibi", "Kakata", 280000, 2616, 0.45),
    ("Maryland", "Harper", 173000, 2297, 0.28),
    ("Grand Cape Mount", "Robertsport", 165000, 5162, 0.18),
    ("Grand Gedeh", "Zwedru", 156000, 10484, 0.25),
    ("Sinoe", "Greenville", 125000, 10137, 0.14),
    ("Bomi", "Tubmanburg", 110000, 1932, 0.30),
    ("Gbarpolu", "Bopolu", 100000, 9689, 0.12),
    ("River Cess", "Cestos City", 96000, 5594, 0.08),
    ("River Gee", "Fish Town", 89000, 5113, 0.10),
    ("Grand Kru", "Barclayville", 78000, 3895, 0.10),
]

# ---- methodology parameters (documented, adjustable) ----
HH_SIZE = 5.0            # average household size (Liberia)
Z = 1.96                # 95% confidence
P = 0.5                 # max-variance proportion (conservative)
E = 0.05                # ±5% margin of error at county level
DEFF = 1.5              # design effect for 2-stage cluster sampling
RESPONSE = 0.88         # expected response rate (12% non-response inflation)
HH_PER_EA = 20          # households sampled per enumeration area (cluster)
ENUM_PER_DAY = 6        # completed household interviews per enumerator per day (CAPI)
FIELD_DAYS = 15         # working days of fieldwork per county (3 weeks)
ENUM_PER_SUP = 5        # enumerators per field supervisor (span of control)

def band_multiplier(pop):
    # larger counties get more sample so district & urban/rural sub-analysis stays reliable
    if pop >= 1_000_000: return 2.0
    if pop >= 400_000:   return 1.4
    if pop >= 250_000:   return 1.2
    return 1.0

n0 = (Z * Z * P * (1 - P)) / (E * E)   # base Cochran sample (~384)

rows = []
for (name, cap, pop, area, urban) in COUNTIES:
    N_hh = pop / HH_SIZE
    n_fpc = n0 / (1 + (n0 - 1) / N_hh)            # finite population correction
    band = band_multiplier(pop)
    n_eff = n_fpc * band                           # effective (precision) target
    completed = n_eff * DEFF                        # inflate for clustering
    issued = completed / RESPONSE                   # inflate for non-response
    completed = int(math.ceil(completed / 10) * 10)
    issued = int(math.ceil(issued / 10) * 10)
    eas = int(math.ceil(issued / HH_PER_EA))
    urban_eas = int(round(eas * urban))
    rural_eas = eas - urban_eas
    enumerators = int(math.ceil(completed / (ENUM_PER_DAY * FIELD_DAYS)))
    supervisors = max(1, int(math.ceil(enumerators / ENUM_PER_SUP)))
    research_lead = 1
    kii = 3 if pop >= 400_000 else 2                # facility/key-informant collectors (schools, shops, sites)
    field_total = enumerators + supervisors + research_lead + kii
    rows.append({
        "county": name, "capital": cap, "population": pop, "urban_share": urban,
        "households": int(round(N_hh)), "band": band,
        "completed": completed, "issued": issued,
        "eas": eas, "urban_eas": urban_eas, "rural_eas": rural_eas,
        "enumerators": enumerators, "supervisors": supervisors,
        "research_lead": research_lead, "kii": kii, "field_total": field_total,
    })

tot = lambda k: sum(r[k] for r in rows)
totals = {k: tot(k) for k in ["completed", "issued", "eas", "urban_eas", "rural_eas",
                              "enumerators", "supervisors", "research_lead", "kii", "field_total"]}

# ---------- Excel workbook ----------
NAVY, TEAL, GOLD, CREAM, WHITE = "12263A", "1E8A8A", "C8102E", "F7F4EE", "FFFFFF"
FONT = "Arial"
hdr = Font(name=FONT, bold=True, color=WHITE, size=10)
titf = Font(name=FONT, bold=True, color=NAVY, size=17)
subf = Font(name=FONT, color="5C6B78", size=9.5)
cf = Font(name=FONT, size=10)
bf = Font(name=FONT, bold=True, size=10, color=NAVY)
thin = Side(style="thin", color="D9D9D9"); border = Border(thin, thin, thin, thin)
ctr = Alignment(horizontal="center", vertical="center"); wrap = Alignment(wrap_text=True, vertical="top")

wb = Workbook()

def style_header(ws, labels, widths, row, fill):
    for j, (h, w) in enumerate(zip(labels, widths), 1):
        c = ws.cell(row=row, column=j, value=h); c.font = hdr
        c.fill = PatternFill("solid", fgColor=fill); c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = border; ws.column_dimensions[get_column_letter(j)].width = w
    ws.row_dimensions[row].height = 28

# ---- Sheet 1: Source Triage ----
ws = wb.active; ws.title = "1 - Source Triage"; ws.sheet_view.showGridLines = False
ws.merge_cells("A1:D1"); ws["A1"] = "Layer 0 — Data Source Triage"; ws["A1"].font = titf
ws.merge_cells("A2:D2"); ws["A2"] = "Which of the 30 indicators actually need FIELD data mining vs. an operator feed or an administrative data request."; ws["A2"].font = subf
triage = [
    ("Field — Household Survey (7)", "internet_penetration, urban_connectivity, rural_connectivity, gender_access_gap, youth_access, smartphone_ownership, low_income_access", "Face-to-face / CAPI interview with household + one random adult, across urban & rural enumeration areas in all 15 counties.", "THIS PHASE"),
    ("Field — Facility / Key-Informant (2)", "school_connectivity, student_device_ratio", "School-visit checklist at sampled schools (EMIS frame); observation + head-teacher interview.", "THIS PHASE"),
    ("Field — Price Audit (2)", "mobile_basket_price, broadband_basket_price", "Tariff/price audit at operator shops in county capitals; combined with GNI/income from the survey.", "THIS PHASE"),
    ("Operator feed — no field (7)", "mobile_subscriptions, mobile_broadband_subs, fixed_broadband_subs, cell_towers, mobile_network_coverage, broadband_points, data_consumption", "Periodic returns from operators & ISPs via the LTA. A data-sharing request, not fieldwork.", "Desk / feed"),
    ("Administrative / desk — no field (12)", "fiber_coverage, ict_businesses, ict_employment, sector_investment, mobile_money_accounts, data_protection_index, digital_id_coverage, egov_services_index, cyber_incidents_reported, ewaste_generated, ewaste_collection_rate, ict_renewable_energy", "Registers & agency reports (MoPT, CBL, EPA, CERT, ID authority, ICT Policy Unit). Desk collection + expert scoring.", "Desk / request"),
]
style_header(ws, ["Collection mode", "Indicators", "How gathered", "Scope"], [30, 46, 50, 14], 4, NAVY)
r = 5
for mode, inds, how, scope in triage:
    ws.cell(row=r, column=1, value=mode).font = bf
    ws.cell(row=r, column=2, value=inds).font = cf
    ws.cell(row=r, column=3, value=how).font = cf
    sc = ws.cell(row=r, column=4, value=scope); sc.font = cf; sc.alignment = ctr
    sc.fill = PatternFill("solid", fgColor="FBE4E4" if scope == "THIS PHASE" else "EEF1F4")
    for col in range(1, 5):
        cell = ws.cell(row=r, column=col); cell.border = border
        if col in (1, 2, 3): cell.alignment = wrap
    ws.row_dimensions[r].height = 58
    r += 1

# ---- Sheet 2: County Sampling Plan ----
ws2 = wb.create_sheet("2 - Sampling Plan"); ws2.sheet_view.showGridLines = False
ws2.merge_cells("A1:I1"); ws2["A1"] = "Layer 1 — County Sampling Plan (household survey)"; ws2["A1"].font = titf
ws2.merge_cells("A2:I2"); ws2["A2"] = f"Cochran base n0={n0:.0f} (95% CI, p=0.5, ±5%) × finite-population correction × design effect {DEFF} ÷ response {RESPONSE:.0%}. Large counties scaled for sub-county analysis."; ws2["A2"].font = subf
cols2 = ["County", "Population", "Households (est.)", "Urban %", "Sample band", "Completed target", "Issued sample", "Enum. areas", "Urban / Rural EAs"]
style_header(ws2, cols2, [18, 13, 16, 9, 11, 15, 13, 11, 16], 4, TEAL)
r = 5
for row in rows:
    vals = [row["county"], row["population"], row["households"], f"{row['urban_share']:.0%}",
            f"×{row['band']}", row["completed"], row["issued"], row["eas"], f"{row['urban_eas']} / {row['rural_eas']}"]
    for j, v in enumerate(vals, 1):
        c = ws2.cell(row=r, column=j, value=v); c.font = cf; c.border = border
        if j >= 2: c.alignment = ctr
        if r % 2 == 0: c.fill = PatternFill("solid", fgColor=CREAM)
    r += 1
# totals row
tvals = ["NATIONAL TOTAL", sum(c[2] for c in COUNTIES), sum(r2["households"] for r2 in rows), "", "",
         totals["completed"], totals["issued"], totals["eas"], f"{totals['urban_eas']} / {totals['rural_eas']}"]
for j, v in enumerate(tvals, 1):
    c = ws2.cell(row=r, column=j, value=v); c.font = Font(name=FONT, bold=True, size=10, color=WHITE)
    c.fill = PatternFill("solid", fgColor=NAVY); c.border = border
    if j >= 2: c.alignment = ctr
ws2.freeze_panes = "A5"

# ---- Sheet 3: County Field Teams ----
ws3 = wb.create_sheet("3 - Field Teams"); ws3.sheet_view.showGridLines = False
ws3.merge_cells("A1:H1"); ws3["A1"] = "Layer 2 — County Field Teams"; ws3["A1"].font = titf
ws3.merge_cells("A2:H2"); ws3["A2"] = f"Enumerators = completed ÷ ({ENUM_PER_DAY}/day × {FIELD_DAYS} days). Supervisor per {ENUM_PER_SUP} enumerators. 1 research lead + facility/KII collectors per county."; ws3["A2"].font = subf
cols3 = ["County", "Data collectors (enumerators)", "Field supervisors", "County research lead", "Facility / KII collectors", "Researchers per county (leads+sup+KII)", "Total field team"]
style_header(ws3, cols3, [18, 22, 15, 16, 18, 22, 15], 4, TEAL)
r = 5
for row in rows:
    researchers = row["research_lead"] + row["supervisors"] + row["kii"]
    vals = [row["county"], row["enumerators"], row["supervisors"], row["research_lead"], row["kii"], researchers, row["field_total"]]
    for j, v in enumerate(vals, 1):
        c = ws3.cell(row=r, column=j, value=v); c.font = cf; c.border = border
        if j >= 2: c.alignment = ctr
        if r % 2 == 0: c.fill = PatternFill("solid", fgColor=CREAM)
    r += 1
researchers_total = totals["research_lead"] + totals["supervisors"] + totals["kii"]
tvals = ["NATIONAL TOTAL", totals["enumerators"], totals["supervisors"], totals["research_lead"], totals["kii"], researchers_total, totals["field_total"]]
for j, v in enumerate(tvals, 1):
    c = ws3.cell(row=r, column=j, value=v); c.font = Font(name=FONT, bold=True, size=10, color=WHITE)
    c.fill = PatternFill("solid", fgColor=NAVY); c.border = border
    if j >= 2: c.alignment = ctr
ws3.freeze_panes = "A5"

# ---- Sheet 4: Timeline ----
ws4 = wb.create_sheet("4 - Timeline"); ws4.sheet_view.showGridLines = False
ws4.merge_cells("A1:D1"); ws4["A1"] = "Layer 3 — Phase Timeline (≈11 weeks)"; ws4["A1"].font = titf
ws4.merge_cells("A2:D2"); ws4["A2"] = "Counties run in parallel (each has its own team), so fieldwork is ~3 weeks regardless of the 15-county scope."; ws4["A2"].font = subf
stages = [
    ("Stage 1", "Design, sampling frame & EA selection", "2 weeks", "Sampling statistician, ICT Policy Unit"),
    ("Stage 2", "Instrument development & CAPI programming", "2 weeks (parallel)", "Survey methodologist, data team"),
    ("Stage 3", "Recruitment & training of field teams", "1 week", "County research leads, supervisors"),
    ("Stage 4", "Pilot / pre-test (2 counties)", "3 days", "Pilot teams"),
    ("Stage 5", "Main fieldwork — all 15 counties in parallel", "3 weeks", "All enumerators & supervisors"),
    ("Stage 6", "Data cleaning, validation & weighting", "2 weeks", "Data team, statistician"),
    ("Stage 7", "Analysis, county estimates & upload to NICTD", "1 week", "Analysts + platform admins"),
]
style_header(ws4, ["Stage", "Activity", "Duration", "Lead"], [10, 42, 18, 34], 4, TEAL)
r = 5
for s, a, d, l in stages:
    for j, v in enumerate([s, a, d, l], 1):
        c = ws4.cell(row=r, column=j, value=v); c.font = cf; c.border = border
        if j in (2, 4): c.alignment = wrap
        if r % 2 == 0: c.fill = PatternFill("solid", fgColor=CREAM)
    ws4.row_dimensions[r].height = 20
    r += 1

path = os.path.abspath(os.path.join(OUT_DIR, "NICTD-Data-Mining-Phase.xlsx"))
wb.save(path)

print("WROTE", path)
print("PARAMS n0=%.1f DEFF=%s response=%.2f" % (n0, DEFF, RESPONSE))
print("TOTALS", json.dumps(totals))
print("researchers_total(leads+sup+kii)=", researchers_total)
print("per-county sample range: %d–%d completed" % (min(r2["completed"] for r2 in rows), max(r2["completed"] for r2 in rows)))
# machine-readable dump for the docs
with open(os.path.join(OUT_DIR, "_mining_computed.json"), "w") as f:
    json.dump({"rows": rows, "totals": totals, "researchers_total": researchers_total,
               "params": {"n0": round(n0, 1), "hh_size": HH_SIZE, "deff": DEFF, "response": RESPONSE,
                          "enum_per_day": ENUM_PER_DAY, "field_days": FIELD_DAYS, "hh_per_ea": HH_PER_EA}}, f, indent=1)
