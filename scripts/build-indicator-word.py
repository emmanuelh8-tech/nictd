# build-indicator-word.py — NICTD indicator catalogue + collection guide as a formatted Word document.
import os
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "deliverables")
os.makedirs(OUT_DIR, exist_ok=True)

NAVY = RGBColor(0x12, 0x26, 0x3A)
TEAL = RGBColor(0x1E, 0x8A, 0x8A)
GREY = RGBColor(0x5C, 0x6B, 0x78)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
NAVY_HEX = "12263A"
TEAL_HEX = "1E8A8A"
CREAM_HEX = "F7F4EE"

# (domain, name, code, unit, tier, channel, agency, freq, how)
INDICATORS = [
    ("Connectivity", "Internet penetration", "internet_penetration", "% of population", "public", "Survey", "LISGIS / LTA", "Annual", "National household ICT survey - individuals using the internet in the last 3 months, per county."),
    ("Connectivity", "Mobile-cellular subscriptions", "mobile_subscriptions", "per 100 people", "public", "Operator feed", "LTA (operator returns)", "Annual", "Active mobile-cellular SIM counts from operators, normalized per 100 inhabitants."),
    ("Connectivity", "Active mobile-broadband subscriptions", "mobile_broadband_subs", "per 100 people", "public", "Operator feed", "LTA (operator returns)", "Biennial", "Active 3G+ data subscriptions from operators, per 100 inhabitants."),
    ("Connectivity", "Fixed broadband subscriptions", "fixed_broadband_subs", "per 100 people", "public", "Operator feed", "LTA / ISPs", "Biennial", "Fixed (wired) broadband subscriber counts filed by ISPs, per 100 inhabitants."),
    ("Connectivity", "Urban connectivity", "urban_connectivity", "% of urban population", "public", "Survey", "LISGIS", "Annual", "Household survey, urban enumeration areas - share with regular internet access."),
    ("Connectivity", "Rural connectivity", "rural_connectivity", "% of rural population", "public", "Survey", "LISGIS", "Annual", "Household survey, rural enumeration areas - share with regular internet access."),
    ("Connectivity", "Gender access gap", "gender_access_gap", "percentage points", "public", "Survey", "LISGIS", "Annual", "Household survey - male minus female internet-use rate (percentage points)."),
    ("Connectivity", "Youth access (15-24)", "youth_access", "% of age group", "registered", "Survey", "LISGIS", "Biennial", "Household survey, ages 15-24 - internet use in the age group."),
    ("Access & Infrastructure", "Cell tower density", "cell_towers", "towers per 1,000 km2", "public", "Operator feed", "LTA site registry", "Annual", "Active macro cell sites from the site registry, divided by county land area (per 1,000 km2)."),
    ("Access & Infrastructure", "Population covered by 4G", "mobile_network_coverage", "% of population", "public", "Operator feed", "LTA / operators", "Biennial", "Operator 4G coverage-engineering polygons overlaid on the population grid; share of population covered."),
    ("Access & Infrastructure", "Fiber backbone coverage", "fiber_coverage", "% of districts", "public", "Manual upload", "LTA / MoPT backbone unit", "Biennial", "Backbone route survey - share of administrative districts within 10 km of the fiber backbone."),
    ("Access & Infrastructure", "Fixed broadband access points", "broadband_points", "access points", "public", "Operator feed", "LTA / ISPs", "Annual", "Registered fixed broadband access points (ISP POPs, public access sites) - absolute count per county."),
    ("Access & Infrastructure", "Schools connected to the internet", "school_connectivity", "% of schools", "registered", "Manual upload", "Ministry of Education (EMIS)", "Annual", "EMIS school census - share of primary/secondary schools with a working internet connection."),
    ("Access & Infrastructure", "Students per learning device", "student_device_ratio", "students per device", "registered", "Manual upload", "Ministry of Education (EMIS)", "Annual", "School census - enrolment divided by internet-capable learning devices, in connected schools."),
    ("Affordability", "Mobile data-and-voice basket", "mobile_basket_price", "% of GNI per capita", "public", "Manual upload", "LTA tariffs + LISGIS income", "Biennial", "Priced entry-level mobile data-and-voice basket as a % of GNI per capita (county income from survey)."),
    ("Affordability", "Fixed-broadband basket", "broadband_basket_price", "% of GNI per capita", "public", "Manual upload", "LTA tariffs + LISGIS income", "Annual", "Priced entry-level fixed-broadband basket as a % of GNI per capita."),
    ("Affordability", "Smartphone ownership", "smartphone_ownership", "% of adults", "public", "Survey", "LISGIS", "Biennial", "Household survey device-ownership module - adults owning an internet-capable smartphone."),
    ("Affordability", "Average data consumption", "data_consumption", "GB / user / month", "registered", "Operator feed", "LTA / operators", "Annual", "Aggregate mobile data traffic divided by active data subscribers (GB per user per month)."),
    ("Affordability", "Access - lowest income band", "low_income_access", "% of band", "stakeholder", "Survey", "LISGIS", "Biennial", "Household survey - internet use within the lowest household-income quintile."),
    ("Market Structure", "Registered ICT businesses", "ict_businesses", "businesses", "public", "Manual upload", "MoPT / business registry", "Biennial", "National business registry filtered to ICT-sector businesses - absolute count per county."),
    ("Market Structure", "ICT sector employment", "ict_employment", "jobs", "registered", "Manual upload", "MoPT / sector returns", "Annual", "Formal employment reported by registered ICT businesses - job counts per county."),
    ("Market Structure", "ICT sector investment", "sector_investment", "US$ millions / yr", "stakeholder", "Manual upload", "MoPT", "Biennial", "Disclosed annual public + private ICT investment (US$ millions)."),
    ("Market Structure", "Registered mobile money accounts", "mobile_money_accounts", "per 100 adults", "public", "Manual upload", "Central Bank of Liberia", "Biennial", "Registered mobile-money accounts from CBL reporting, per 100 adults."),
    ("Digital Trust & Governance", "Data protection framework score", "data_protection_index", "index (0-100)", "public", "Manual upload", "ICT Statistics & Policy Unit", "Biennial", "Annual expert scoring (0-100) of data-protection laws and institutional capacity in force. National figure applied to counties."),
    ("Digital Trust & Governance", "Digital ID coverage", "digital_id_coverage", "% of adults", "public", "Manual upload", "National ID authority", "Annual", "Registered digital/national IDs usable online, divided by adult population."),
    ("Digital Trust & Governance", "E-government services score", "egov_services_index", "index (0-100)", "registered", "Manual upload", "ICT Statistics & Policy Unit", "Annual", "Structured audit (0-100) of government services available online. National figure applied to counties."),
    ("Digital Trust & Governance", "Cybersecurity incidents reported", "cyber_incidents_reported", "incidents / yr", "stakeholder", "Manual upload", "National CERT", "Biennial", "Cybersecurity incidents formally reported to the national CERT (count per year)."),
    ("Sustainability / E-Waste", "E-waste generated", "ewaste_generated", "kg per capita", "public", "Manual upload", "EPA / MoPT", "Biennial", "Device import/take-back registry modelled to kg of e-waste generated per capita."),
    ("Sustainability / E-Waste", "E-waste formally collected", "ewaste_collection_rate", "% of e-waste generated", "public", "Manual upload", "EPA / registered recyclers", "Biennial", "Formally collected/recycled e-waste tonnage divided by e-waste generated (%)."),
    ("Sustainability / E-Waste", "ICT sector renewable electricity", "ict_renewable_energy", "% of ICT electricity use", "registered", "Manual upload", "EPA + operators", "Annual", "Share of ICT-sector electricity consumption sourced from renewables (%)."),
]

doc = Document()
st = doc.styles["Normal"]
st.font.name = "Arial"
st.font.size = Pt(10)

def shade(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), hex_color)
    tcPr.append(sh)

def set_cell(cell, text, bold=False, color=None, size=9, align=None, white=False):
    cell.text = ""
    p = cell.paragraphs[0]
    if align: p.alignment = align
    run = p.add_run(str(text))
    run.font.name = "Arial"; run.font.size = Pt(size); run.font.bold = bold
    if white: run.font.color.rgb = WHITE
    elif color: run.font.color.rgb = color

def header_row(table, labels, fill=NAVY_HEX):
    for j, lab in enumerate(labels):
        c = table.rows[0].cells[j]
        set_cell(c, lab, bold=True, size=9, white=True)
        shade(c, fill)

def set_widths(table, widths):
    for row in table.rows:
        for j, w in enumerate(widths):
            row.cells[j].width = Inches(w)

# ---- Title ----
t = doc.add_paragraph()
r = t.add_run("National ICT Database of Liberia (NICTD)")
r.font.name = "Arial"; r.font.size = Pt(20); r.font.bold = True; r.font.color.rgb = NAVY
sub = doc.add_paragraph()
r = sub.add_run("Indicator Catalogue & Data Collection Guide")
r.font.name = "Arial"; r.font.size = Pt(13); r.font.color.rgb = TEAL
meta = doc.add_paragraph()
r = meta.add_run("30 indicators across 6 domains - each collected for all 15 counties as a yearly time series. "
                 "Prepared for the ICT Statistics & Policy Unit, Ministry of Posts & Telecommunications.")
r.font.name = "Arial"; r.font.size = Pt(9.5); r.font.color.rgb = GREY

# ============ TABLE 1: Indicator Catalogue ============
h1 = doc.add_paragraph()
r = h1.add_run("Table 1 - Indicator Catalogue")
r.font.name = "Arial"; r.font.size = Pt(13); r.font.bold = True; r.font.color.rgb = NAVY

cat_cols = ["Domain", "Indicator", "Indicator code", "Unit", "Tier"]
cat_w = [1.25, 1.9, 1.55, 1.2, 0.75]
table = doc.add_table(rows=1, cols=len(cat_cols))
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.style = "Table Grid"
header_row(table, cat_cols)
zebra = False
prev_domain = None
for (domain, name, code, unit, tier, ch, agency, freq, how) in INDICATORS:
    if domain != prev_domain:
        zebra = not zebra if prev_domain is not None else False
        prev_domain = domain
    row = table.add_row().cells
    set_cell(row[0], domain)
    set_cell(row[1], name)
    set_cell(row[2], code, color=TEAL)
    set_cell(row[3], unit)
    set_cell(row[4], tier, align=WD_ALIGN_PARAGRAPH.CENTER)
    if zebra:
        for c in row: shade(c, CREAM_HEX)
set_widths(table, cat_w)

doc.add_paragraph()

# ============ TABLE 2: Collection Guide ============
h2 = doc.add_paragraph()
r = h2.add_run("Table 2 - Data Collection Guide")
r.font.name = "Arial"; r.font.size = Pt(13); r.font.bold = True; r.font.color.rgb = NAVY
gp = doc.add_paragraph()
r = gp.add_run("Each indicator mapped to its source agency, ingestion channel, reporting frequency and collection method.")
r.font.name = "Arial"; r.font.size = Pt(9.5); r.font.color.rgb = GREY

guide_cols = ["Indicator", "Source agency", "Channel", "Freq.", "How to collect"]
guide_w = [1.55, 1.35, 0.9, 0.65, 2.2]
table2 = doc.add_table(rows=1, cols=len(guide_cols))
table2.alignment = WD_TABLE_ALIGNMENT.CENTER
table2.style = "Table Grid"
header_row(table2, guide_cols, fill=TEAL_HEX)
prev_domain = None
for (domain, name, code, unit, tier, ch, agency, freq, how) in INDICATORS:
    if domain != prev_domain:
        prev_domain = domain
        drow = table2.add_row().cells
        drow[0].merge(drow[1]).merge(drow[2]).merge(drow[3]).merge(drow[4])
        set_cell(drow[0], domain, bold=True, white=True, size=9.5)
        shade(drow[0], NAVY_HEX)
    row = table2.add_row().cells
    set_cell(row[0], name)
    set_cell(row[1], agency)
    set_cell(row[2], ch, align=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(row[3], freq, align=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell(row[4], how)
set_widths(table2, guide_w)

# ============ How the data is collected ============
doc.add_paragraph()
h3 = doc.add_paragraph()
r = h3.add_run("How the data is collected")
r.font.name = "Arial"; r.font.size = Pt(13); r.font.bold = True; r.font.color.rgb = NAVY
for line in [
    ("Three ingestion channels. ", "Survey (national household ICT survey via LISGIS) for demand-side indicators; Operator feed (periodic returns from operators and ISPs via the LTA) for supply-side indicators; Manual upload (admin CSV in the Content Studio) for agency registers and index scores."),
    ("Pipeline. ", "Every value flows Collect -> Validate (automatic range/type checks) -> Human review (admin approve/reject in the quality queue) -> Publish. No figure reaches the public front end without passing validation and review."),
    ("Upload format. ", "The bulk uploader expects exactly five columns: indicator_code, county, year, value, source. Use the county name as listed, or 'National' for the country-level figure."),
    ("Current status. ", "All values in the platform are demonstration data. This catalogue is the plan to replace them, indicator by indicator, with real agency returns through the three channels above."),
]:
    p = doc.add_paragraph()
    rb = p.add_run(line[0]); rb.font.name = "Arial"; rb.font.size = Pt(10); rb.font.bold = True; rb.font.color.rgb = NAVY
    rt = p.add_run(line[1]); rt.font.name = "Arial"; rt.font.size = Pt(10)

path = os.path.abspath(os.path.join(OUT_DIR, "NICTD-Indicators.docx"))
doc.save(path)
print("WROTE", path)
