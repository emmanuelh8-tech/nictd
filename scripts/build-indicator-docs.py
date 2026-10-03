# build-indicator-docs.py — build the NICTD indicator Excel workbook from the catalogue data.
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "deliverables")
os.makedirs(OUT_DIR, exist_ok=True)

# ---- catalogue: (domain, name, code, unit, tier, channel, source_agency, frequency, how_to_collect) ----
INDICATORS = [
    # Connectivity
    ("Connectivity", "Internet penetration", "internet_penetration", "% of population", "public", "Survey", "LISGIS / LTA", "Annual", "National household ICT survey — individuals using the internet in the last 3 months, per county."),
    ("Connectivity", "Mobile-cellular subscriptions", "mobile_subscriptions", "per 100 people", "public", "Operator feed", "LTA (operator returns)", "Annual", "Active mobile-cellular SIM counts from operators, normalized per 100 inhabitants."),
    ("Connectivity", "Active mobile-broadband subscriptions", "mobile_broadband_subs", "per 100 people", "public", "Operator feed", "LTA (operator returns)", "Biennial", "Active 3G+ data subscriptions from operators, per 100 inhabitants."),
    ("Connectivity", "Fixed broadband subscriptions", "fixed_broadband_subs", "per 100 people", "public", "Operator feed", "LTA / ISPs", "Biennial", "Fixed (wired) broadband subscriber counts filed by ISPs, per 100 inhabitants."),
    ("Connectivity", "Urban connectivity", "urban_connectivity", "% of urban population", "public", "Survey", "LISGIS", "Annual", "Household survey, urban enumeration areas — share with regular internet access."),
    ("Connectivity", "Rural connectivity", "rural_connectivity", "% of rural population", "public", "Survey", "LISGIS", "Annual", "Household survey, rural enumeration areas — share with regular internet access."),
    ("Connectivity", "Gender access gap", "gender_access_gap", "percentage points", "public", "Survey", "LISGIS", "Annual", "Household survey — male minus female internet-use rate (percentage points)."),
    ("Connectivity", "Youth access (15-24)", "youth_access", "% of age group", "registered", "Survey", "LISGIS", "Biennial", "Household survey, ages 15-24 — internet use in the age group."),
    # Access & Infrastructure
    ("Access & Infrastructure", "Cell tower density", "cell_towers", "towers per 1,000 km2", "public", "Operator feed", "LTA site registry", "Annual", "Active macro cell sites from the site registry, divided by county land area (per 1,000 km2)."),
    ("Access & Infrastructure", "Population covered by 4G", "mobile_network_coverage", "% of population", "public", "Operator feed", "LTA / operators", "Biennial", "Operator 4G coverage-engineering polygons overlaid on the population grid; share of population covered."),
    ("Access & Infrastructure", "Fiber backbone coverage", "fiber_coverage", "% of districts", "public", "Manual upload", "LTA / MoPT backbone unit", "Biennial", "Backbone route survey — share of administrative districts within 10 km of the fiber backbone."),
    ("Access & Infrastructure", "Fixed broadband access points", "broadband_points", "access points", "public", "Operator feed", "LTA / ISPs", "Annual", "Registered fixed broadband access points (ISP POPs, public access sites) — absolute count per county."),
    ("Access & Infrastructure", "Schools connected to the internet", "school_connectivity", "% of schools", "registered", "Manual upload", "Ministry of Education (EMIS)", "Annual", "EMIS school census — share of primary/secondary schools with a working internet connection."),
    ("Access & Infrastructure", "Students per learning device", "student_device_ratio", "students per device", "registered", "Manual upload", "Ministry of Education (EMIS)", "Annual", "School census — enrolment divided by internet-capable learning devices, in connected schools."),
    # Affordability
    ("Affordability", "Mobile data-and-voice basket", "mobile_basket_price", "% of GNI per capita", "public", "Manual upload", "LTA tariffs + LISGIS income", "Biennial", "Priced entry-level mobile data-and-voice basket as a % of GNI per capita (county income from survey)."),
    ("Affordability", "Fixed-broadband basket", "broadband_basket_price", "% of GNI per capita", "public", "Manual upload", "LTA tariffs + LISGIS income", "Annual", "Priced entry-level fixed-broadband basket as a % of GNI per capita."),
    ("Affordability", "Smartphone ownership", "smartphone_ownership", "% of adults", "public", "Survey", "LISGIS", "Biennial", "Household survey device-ownership module — adults owning an internet-capable smartphone."),
    ("Affordability", "Average data consumption", "data_consumption", "GB / user / month", "registered", "Operator feed", "LTA / operators", "Annual", "Aggregate mobile data traffic divided by active data subscribers (GB per user per month)."),
    ("Affordability", "Access - lowest income band", "low_income_access", "% of band", "stakeholder", "Survey", "LISGIS", "Biennial", "Household survey — internet use within the lowest household-income quintile."),
    # Market Structure
    ("Market Structure", "Registered ICT businesses", "ict_businesses", "businesses", "public", "Manual upload", "MoPT / business registry", "Biennial", "National business registry filtered to ICT-sector businesses — absolute count per county."),
    ("Market Structure", "ICT sector employment", "ict_employment", "jobs", "registered", "Manual upload", "MoPT / sector returns", "Annual", "Formal employment reported by registered ICT businesses — job counts per county."),
    ("Market Structure", "ICT sector investment", "sector_investment", "US$ millions / yr", "stakeholder", "Manual upload", "MoPT", "Biennial", "Disclosed annual public + private ICT investment (US$ millions)."),
    ("Market Structure", "Registered mobile money accounts", "mobile_money_accounts", "per 100 adults", "public", "Manual upload", "Central Bank of Liberia", "Biennial", "Registered mobile-money accounts from CBL reporting, per 100 adults."),
    # Digital Trust & Governance
    ("Digital Trust & Governance", "Data protection framework score", "data_protection_index", "index (0-100)", "public", "Manual upload", "ICT Statistics & Policy Unit", "Biennial", "Annual expert scoring (0-100) of data-protection laws and institutional capacity in force. National figure applied to counties."),
    ("Digital Trust & Governance", "Digital ID coverage", "digital_id_coverage", "% of adults", "public", "Manual upload", "National ID authority", "Annual", "Registered digital/national IDs usable online, divided by adult population."),
    ("Digital Trust & Governance", "E-government services score", "egov_services_index", "index (0-100)", "registered", "Manual upload", "ICT Statistics & Policy Unit", "Annual", "Structured audit (0-100) of government services available online. National figure applied to counties."),
    ("Digital Trust & Governance", "Cybersecurity incidents reported", "cyber_incidents_reported", "incidents / yr", "stakeholder", "Manual upload", "National CERT", "Biennial", "Cybersecurity incidents formally reported to the national CERT (count per year)."),
    # Sustainability / E-Waste
    ("Sustainability / E-Waste", "E-waste generated", "ewaste_generated", "kg per capita", "public", "Manual upload", "EPA / MoPT", "Biennial", "Device import/take-back registry modelled to kg of e-waste generated per capita."),
    ("Sustainability / E-Waste", "E-waste formally collected", "ewaste_collection_rate", "% of e-waste generated", "public", "Manual upload", "EPA / registered recyclers", "Biennial", "Formally collected/recycled e-waste tonnage divided by e-waste generated (%)."),
    ("Sustainability / E-Waste", "ICT sector renewable electricity", "ict_renewable_energy", "% of ICT electricity use", "registered", "Manual upload", "EPA + operators", "Annual", "Share of ICT-sector electricity consumption sourced from renewables (%)."),
]

COUNTIES = ["Bomi", "Bong", "Gbarpolu", "Grand Bassa", "Grand Cape Mount", "Grand Gedeh",
            "Grand Kru", "Lofa", "Margibi", "Maryland", "Montserrado", "Nimba",
            "River Cess", "River Gee", "Sinoe"]

# ---- palette ----
NAVY = "12263A"
TEAL = "1E8A8A"
CLAY = "C1673D"
GOLD = "C8102E"
CREAM = "F7F4EE"
LIGHT = "EAF0F0"
WHITE = "FFFFFF"

FONT = "Arial"
hdr_font = Font(name=FONT, bold=True, color=WHITE, size=11)
title_font = Font(name=FONT, bold=True, color=NAVY, size=18)
sub_font = Font(name=FONT, color="5C6B78", size=10)
cell_font = Font(name=FONT, size=10)
code_font = Font(name=FONT, size=10, color=TEAL)
dom_font = Font(name=FONT, bold=True, color=WHITE, size=11)

thin = Side(style="thin", color="D9D9D9")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap_top = Alignment(wrap_text=True, vertical="top")
center = Alignment(horizontal="center", vertical="center")

DOMAIN_FILL = {
    "Connectivity": TEAL,
    "Access & Infrastructure": NAVY,
    "Affordability": CLAY,
    "Market Structure": "1C3E5A",
    "Digital Trust & Governance": "8A5A2B",
    "Sustainability / E-Waste": "2E6B4F",
}

TIER_FILL = {"public": "E3F2E9", "registered": "FBF0DC", "stakeholder": "FBE4E4"}

wb = Workbook()

# ============================================================
# SHEET 1 — Indicator Catalogue
# ============================================================
ws = wb.active
ws.title = "Indicator Catalogue"
ws.sheet_view.showGridLines = False

ws.merge_cells("A1:E1")
ws["A1"] = "NICTD — Indicator Catalogue"
ws["A1"].font = title_font
ws.merge_cells("A2:E2")
ws["A2"] = "National ICT Database of Liberia — 30 indicators across 6 domains, each collected for all 15 counties as a yearly time series."
ws["A2"].font = sub_font
ws.row_dimensions[1].height = 26
ws.row_dimensions[2].height = 16

headers = ["Domain", "Indicator", "Indicator code", "Unit", "Access tier"]
widths = [26, 40, 26, 22, 14]
hrow = 4
for j, (h, w) in enumerate(zip(headers, widths), start=1):
    c = ws.cell(row=hrow, column=j, value=h)
    c.font = hdr_font
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(horizontal="left", vertical="center")
    c.border = border
    ws.column_dimensions[get_column_letter(j)].width = w
ws.row_dimensions[hrow].height = 20

r = hrow + 1
for (domain, name, code, unit, tier, ch, agency, freq, how) in INDICATORS:
    ws.cell(row=r, column=1, value=domain).font = cell_font
    ws.cell(row=r, column=2, value=name).font = cell_font
    cc = ws.cell(row=r, column=3, value=code); cc.font = code_font
    ws.cell(row=r, column=4, value=unit).font = cell_font
    tc = ws.cell(row=r, column=5, value=tier)
    tc.font = cell_font
    tc.fill = PatternFill("solid", fgColor=TIER_FILL.get(tier, WHITE))
    tc.alignment = center
    for col in range(1, 6):
        cell = ws.cell(row=r, column=col)
        cell.border = border
        if col != 5:
            cell.alignment = wrap_top
        if r % 2 == 0:
            if col != 5:
                cell.fill = PatternFill("solid", fgColor=CREAM)
    r += 1
ws.freeze_panes = "A5"
ws.auto_filter.ref = f"A{hrow}:E{r-1}"

# ============================================================
# SHEET 2 — Collection Guide (source -> channel -> frequency)
# ============================================================
ws2 = wb.create_sheet("Collection Guide")
ws2.sheet_view.showGridLines = False
ws2.merge_cells("A1:F1")
ws2["A1"] = "NICTD — Data Collection Guide"
ws2["A1"].font = title_font
ws2.merge_cells("A2:F2")
ws2["A2"] = "Each indicator mapped to its source agency, ingestion channel, reporting frequency, and collection method."
ws2["A2"].font = sub_font
ws2.row_dimensions[1].height = 26

headers2 = ["Indicator", "Source agency", "Channel", "Frequency", "Access tier", "How to collect"]
widths2 = [34, 26, 16, 14, 14, 60]
hrow2 = 4
for j, (h, w) in enumerate(zip(headers2, widths2), start=1):
    c = ws2.cell(row=hrow2, column=j, value=h)
    c.font = hdr_font
    c.fill = PatternFill("solid", fgColor=TEAL)
    c.alignment = Alignment(horizontal="left", vertical="center")
    c.border = border
    ws2.column_dimensions[get_column_letter(j)].width = w
ws2.row_dimensions[hrow2].height = 20

CH_FILL = {"Survey": "E3F2E9", "Operator feed": "E4F3F1", "Manual upload": "FBF0DC"}
r = hrow2 + 1
current_domain = None
for (domain, name, code, unit, tier, ch, agency, freq, how) in INDICATORS:
    if domain != current_domain:
        current_domain = domain
        ws2.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
        dc = ws2.cell(row=r, column=1, value=domain)
        dc.font = dom_font
        dc.fill = PatternFill("solid", fgColor=DOMAIN_FILL.get(domain, NAVY))
        dc.alignment = Alignment(horizontal="left", vertical="center")
        ws2.row_dimensions[r].height = 18
        r += 1
    ws2.cell(row=r, column=1, value=name).font = cell_font
    ws2.cell(row=r, column=2, value=agency).font = cell_font
    chc = ws2.cell(row=r, column=3, value=ch)
    chc.font = cell_font
    chc.fill = PatternFill("solid", fgColor=CH_FILL.get(ch, WHITE))
    chc.alignment = center
    ws2.cell(row=r, column=4, value=freq).font = cell_font
    ws2.cell(row=r, column=4).alignment = center
    tc = ws2.cell(row=r, column=5, value=tier); tc.font = cell_font
    tc.fill = PatternFill("solid", fgColor=TIER_FILL.get(tier, WHITE)); tc.alignment = center
    ws2.cell(row=r, column=6, value=how).font = cell_font
    for col in range(1, 7):
        cell = ws2.cell(row=r, column=col)
        cell.border = border
        if col in (1, 2, 6):
            cell.alignment = wrap_top
    r += 1
ws2.freeze_panes = "A5"

# ============================================================
# SHEET 3 — Collection Template (fillable, upload-ready)
# ============================================================
ws3 = wb.create_sheet("Collection Template 2026")
ws3.sheet_view.showGridLines = False
ws3.merge_cells("A1:E1")
ws3["A1"] = "NICTD — Collection Template (2026)"
ws3["A1"].font = title_font
ws3.merge_cells("A2:E2")
ws3["A2"] = ("Fill the 'value' column for each indicator x county, add a 'source' note, then bulk-upload in the Admin Content Studio. "
             "Columns must stay exactly: indicator_code, county, year, value, source. Use 'National' as county for the country-level figure.")
ws3["A2"].font = sub_font
ws3.row_dimensions[2].height = 28

tmpl_headers = ["indicator_code", "county", "year", "value", "source"]
tmpl_widths = [26, 20, 10, 14, 40]
hrow3 = 4
for j, (h, w) in enumerate(zip(tmpl_headers, tmpl_widths), start=1):
    c = ws3.cell(row=hrow3, column=j, value=h)
    c.font = hdr_font
    c.fill = PatternFill("solid", fgColor=GOLD)
    c.alignment = Alignment(horizontal="left", vertical="center")
    c.border = border
    ws3.column_dimensions[get_column_letter(j)].width = w
ws3.row_dimensions[hrow3].height = 20

# one example row (yellow) so the filler sees the expected format, then the blank grid
ex_fill = PatternFill("solid", fgColor="FFFDE7")
example = ["internet_penetration", "Montserrado", 2026, 52.3, "2026 household survey, wave 1 (EXAMPLE ROW - delete before upload)"]
r = hrow3 + 1
for j, v in enumerate(example, start=1):
    c = ws3.cell(row=r, column=j, value=v)
    c.font = Font(name=FONT, size=10, italic=True, color="8A6A1F")
    c.fill = ex_fill
    c.border = border
r += 1
val_fill = PatternFill("solid", fgColor="FFFFF3")
for (domain, name, code, unit, tier, ch, agency, freq, how) in INDICATORS:
    for county in COUNTIES:
        ws3.cell(row=r, column=1, value=code).font = code_font
        ws3.cell(row=r, column=2, value=county).font = cell_font
        ws3.cell(row=r, column=3, value=2026).font = cell_font
        vc = ws3.cell(row=r, column=4, value=None)  # blank value to fill
        vc.fill = val_fill
        ws3.cell(row=r, column=5, value=None)
        for col in range(1, 6):
            ws3.cell(row=r, column=col).border = border
        r += 1
ws3.freeze_panes = "A5"

path = os.path.abspath(os.path.join(OUT_DIR, "NICTD-Indicators.xlsx"))
wb.save(path)
print("WROTE", path)
print("rows in template sheet:", r - (hrow3 + 1), "(incl. 1 example)")
