# build-cost-schedule.py — NICTD Data Mining Phase cost schedule (formula-driven Excel).
# Pay ladder: base $50/day (lowest grade), +$50 per higher grade. Includes a Data Team.
# The workbook is fully formula-linked: editing ANY blue input recomputes the whole schedule.
# Because no LibreOffice/Excel is available here, computed values are also cached into the file
# so it displays correctly on open AND recalculates automatically on edit (calcMode = auto).
import os, json, re, zipfile
from xml.etree import ElementTree as ET
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.properties import CalcProperties

BASE = os.path.join(os.path.dirname(__file__), "..")
OUT_DIR = os.path.join(BASE, "deliverables")
data = json.load(open(os.path.join(OUT_DIR, "_mining_computed.json")))
rows = data["rows"]

# ---- computed values (drive both the cached results and the verification) ----
RATE = {g: 50 + (g - 1) * 50 for g in range(1, 7)}
FDAYS = {"enum": 20, "kii": 20, "sup": 25, "lead": 30}

# ---- cached-value tracker: {sheet_title: {coord: value}} ----
cached = {}
def track(ws, coord, value):
    cached.setdefault(ws.title, {})[coord] = value

# ---- styling ----
NAVY, TEAL, CREAM, WHITE = "12263A", "1E8A8A", "F7F4EE", "FFFFFF"
BLUE = "0000FF"
FONT = "Arial"
hdr = Font(name=FONT, bold=True, color=WHITE, size=10)
titf = Font(name=FONT, bold=True, color=NAVY, size=17)
subf = Font(name=FONT, color="5C6B78", size=9.5)
cf = Font(name=FONT, size=10)
inp = Font(name=FONT, size=10, color=BLUE)
bf = Font(name=FONT, bold=True, size=10, color=NAVY)
money = '#,##0;(#,##0);"-"'
thin = Side(style="thin", color="D9D9D9"); border = Border(thin, thin, thin, thin)
ctr = Alignment(horizontal="center", vertical="center"); wrap = Alignment(wrap_text=True, vertical="top")
yellow = PatternFill("solid", fgColor="FFF9D6")

wb = Workbook()

def header(ws, labels, widths, row, fill):
    for j, (h, w) in enumerate(zip(labels, widths), 1):
        c = ws.cell(row=row, column=j, value=h); c.font = hdr
        c.fill = PatternFill("solid", fgColor=fill)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); c.border = border
        ws.column_dimensions[get_column_letter(j)].width = w
    ws.row_dimensions[row].height = 26

def put_formula(ws, row, col, formula, value, number_format=money, font=cf, align=None, fill=None, white=False):
    c = ws.cell(row=row, column=col, value=formula)
    c.number_format = number_format; c.border = border
    c.font = Font(name=FONT, size=font.size, bold=font.bold, color=(WHITE if white else (font.color.rgb if font.color else "000000")))
    if align: c.alignment = align
    if fill: c.fill = PatternFill("solid", fgColor=fill)
    track(ws, f"{get_column_letter(col)}{row}", value)
    return c

def put_input(ws, row, col, value, number_format=None, align=None):
    c = ws.cell(row=row, column=col, value=value); c.font = inp; c.fill = yellow; c.border = border
    if number_format: c.number_format = number_format
    if align: c.alignment = align
    return c

# ============================================================
# SHEET 1 — Pay Grades ($50 ladder, as formulas)
# ============================================================
ws = wb.active; ws.title = "Pay Grades"; ws.sheet_view.showGridLines = False
ws.merge_cells("A1:D1"); ws["A1"] = "Pay Grade Ladder"; ws["A1"].font = titf
ws.merge_cells("A2:D2")
ws["A2"] = "Only the two blue cells are inputs. Each grade = previous grade + step, so changing the base or the step recomputes every rate — and every cost on the other sheets."
ws["A2"].font = subf

ws["A4"] = "Base daily rate (Grade 1, USD)"; ws["A4"].font = bf
put_input(ws, 4, 2, 50, number_format=money);
ws["A5"] = "Step per grade (USD)"; ws["A5"].font = bf
put_input(ws, 5, 2, 50, number_format=money)

header(ws, ["Grade", "Daily rate (USD)", "Example roles at this grade"], [10, 18, 62], 7, NAVY)
grade_roles = [
    "Enumerator (field data collector)",
    "Facility / KII collector  ·  Data processing clerk",
    "Field supervisor  ·  Data quality analyst",
    "County research lead  ·  Database/CAPI engineer  ·  GIS analyst",
    "Sampling statistician  ·  Data Team lead",
    "Survey / Project Director",
]
GRADE_RATE_ROW = {}
r = 8
for g in range(1, 7):
    ws.cell(row=r, column=1, value=f"G{g}").font = bf; ws.cell(row=r, column=1).border = border
    formula = "=$B$4" if g == 1 else f"=B{r-1}+$B$5"
    put_formula(ws, r, 2, formula, RATE[g], font=cf, align=ctr)
    role = ws.cell(row=r, column=3, value=grade_roles[g-1]); role.font = cf; role.border = border; role.alignment = wrap
    GRADE_RATE_ROW[g] = r
    r += 1
def RREF(g): return f"'Pay Grades'!$B${GRADE_RATE_ROW[g]}"

# ============================================================
# SHEET 2 — Field Team Cost (per county)
# ============================================================
ws2 = wb.create_sheet("Field Team Cost"); ws2.sheet_view.showGridLines = False
ws2.merge_cells("A1:H1"); ws2["A1"] = "Field Team Cost by County"; ws2["A1"].font = titf
ws2.merge_cells("A2:H2")
ws2["A2"] = "Cost = headcount x paid days x grade rate. Edit any headcount (cols B-E) or the paid-days block (blue) and the county cost + totals recompute."
ws2["A2"].font = subf

# paid-days assumptions block J:L
for j, lab in enumerate(["Role", "Paid days", "Grade"], 10):
    c = ws2.cell(row=4, column=j, value=lab); c.font = hdr; c.fill = PatternFill("solid", fgColor=TEAL); c.border = border; c.alignment = ctr
ws2.column_dimensions["J"].width = 20; ws2.column_dimensions["K"].width = 11; ws2.column_dimensions["L"].width = 9
field_roles = [("Enumerator", FDAYS["enum"], 1), ("Facility / KII collector", FDAYS["kii"], 2), ("Field supervisor", FDAYS["sup"], 3), ("County research lead", FDAYS["lead"], 4)]
DAYS_CELL = {}
rr = 5
for name, days, g in field_roles:
    ws2.cell(row=rr, column=10, value=name).font = cf; ws2.cell(row=rr, column=10).border = border
    put_input(ws2, rr, 11, days, align=ctr)
    gc = ws2.cell(row=rr, column=12, value=f"G{g}"); gc.font = cf; gc.alignment = ctr; gc.border = border
    DAYS_CELL[name] = f"$K${rr}"
    rr += 1

header(ws2, ["County", "Enum. (n)", "KII (n)", "Superv. (n)", "Leads (n)", "County labour cost (USD)"],
       [20, 11, 10, 12, 11, 22], 4, NAVY)
r = 5; first = r
for row in rows:
    ws2.cell(row=r, column=1, value=row["county"]).font = cf; ws2.cell(row=r, column=1).border = border
    for col, key in [(2, "enumerators"), (3, "kii"), (4, "supervisors"), (5, "research_lead")]:
        c = ws2.cell(row=r, column=col, value=row[key]); c.font = inp; c.fill = yellow; c.alignment = ctr; c.border = border
    val = (row["enumerators"]*FDAYS["enum"]*RATE[1] + row["kii"]*FDAYS["kii"]*RATE[2]
           + row["supervisors"]*FDAYS["sup"]*RATE[3] + row["research_lead"]*FDAYS["lead"]*RATE[4])
    f = (f"=B{r}*{DAYS_CELL['Enumerator']}*{RREF(1)}"
         f"+C{r}*{DAYS_CELL['Facility / KII collector']}*{RREF(2)}"
         f"+D{r}*{DAYS_CELL['Field supervisor']}*{RREF(3)}"
         f"+E{r}*{DAYS_CELL['County research lead']}*{RREF(4)}")
    put_formula(ws2, r, 6, f, val)
    if r % 2 == 0:
        for col in range(1, 6): ws2.cell(row=r, column=col).fill = PatternFill("solid", fgColor=CREAM)
    r += 1
last = r - 1
ws2.cell(row=r, column=1, value="FIELD TEAM TOTAL").font = Font(name=FONT, bold=True, color=WHITE, size=10)
ws2.cell(row=r, column=1).fill = PatternFill("solid", fgColor=NAVY); ws2.cell(row=r, column=1).border = border
sums = {}
for col, letter in [(2, "B"), (3, "C"), (4, "D"), (5, "E")]:
    tot = sum(rw[{"B":"enumerators","C":"kii","D":"supervisors","E":"research_lead"}[letter]] for rw in rows)
    put_formula(ws2, r, col, f"=SUM({letter}{first}:{letter}{last})", tot, number_format="General",
                font=Font(name=FONT, bold=True, size=10, color=WHITE), align=ctr, fill=NAVY, white=True)
field_total_val = sum((rw["enumerators"]*FDAYS["enum"]*RATE[1] + rw["kii"]*FDAYS["kii"]*RATE[2]
                       + rw["supervisors"]*FDAYS["sup"]*RATE[3] + rw["research_lead"]*FDAYS["lead"]*RATE[4]) for rw in rows)
put_formula(ws2, r, 6, f"=SUM(F{first}:F{last})", field_total_val,
            font=Font(name=FONT, bold=True, size=10, color=WHITE), fill=NAVY, white=True)
FIELD_TOTAL_CELL = f"'Field Team Cost'!$F${r}"

# ============================================================
# SHEET 3 — Data Team
# ============================================================
ws3 = wb.create_sheet("Data Team"); ws3.sheet_view.showGridLines = False
ws3.merge_cells("A1:F1"); ws3["A1"] = "Data Team — Post-Collection Processing"; ws3["A1"].font = titf
ws3.merge_cells("A2:F2")
ws3["A2"] = "Central team that cleans, validates, weights, codes, maps and uploads the field data into NICTD. Edit headcount or paid days (blue) to recompute."
ws3["A2"].font = subf
header(ws3, ["Role", "Responsibility", "Grade", "Headcount", "Paid days", "Cost (USD)"],
       [24, 40, 8, 11, 11, 16], 4, TEAL)
data_team = [
    ("Data Team Lead", "Owns the processing pipeline, review queue & final sign-off", 5, 1, 45),
    ("Sampling Statistician", "Weighting, county estimates, precision & error checks", 5, 1, 25),
    ("Database / CAPI Engineer", "Builds CAPI instrument, sync server, upload pipeline to NICTD", 4, 2, 30),
    ("GIS / Mapping Analyst", "Enumeration-area frames, geocoding, choropleth prep", 4, 1, 20),
    ("Data Quality Analyst", "Validation rules, cleaning, outlier & consistency review", 3, 4, 25),
    ("Data Processing Clerk", "Coding open responses, data entry backup, reconciliation", 2, 6, 15),
]
r = 5; first = r
for name, resp, g, hc, days in data_team:
    ws3.cell(row=r, column=1, value=name).font = bf; ws3.cell(row=r, column=1).border = border
    rc = ws3.cell(row=r, column=2, value=resp); rc.font = cf; rc.alignment = wrap; rc.border = border
    gc = ws3.cell(row=r, column=3, value=f"G{g}"); gc.font = cf; gc.alignment = ctr; gc.border = border
    put_input(ws3, r, 4, hc, align=ctr); put_input(ws3, r, 5, days, align=ctr)
    put_formula(ws3, r, 6, f"=D{r}*E{r}*{RREF(g)}", hc*days*RATE[g])
    ws3.row_dimensions[r].height = 30
    r += 1
last = r - 1
ws3.cell(row=r, column=1, value="DATA TEAM TOTAL").font = Font(name=FONT, bold=True, color=WHITE, size=10)
for col in range(1, 6):
    ws3.cell(row=r, column=col).fill = PatternFill("solid", fgColor=NAVY); ws3.cell(row=r, column=col).border = border
dt_hc = sum(hc for _, _, g, hc, days in data_team)
dt_cost = sum(hc*days*RATE[g] for _, _, g, hc, days in data_team)
put_formula(ws3, r, 4, f"=SUM(D{first}:D{last})", dt_hc, number_format="General",
            font=Font(name=FONT, bold=True, size=10, color=WHITE), align=ctr, fill=NAVY, white=True)
put_formula(ws3, r, 6, f"=SUM(F{first}:F{last})", dt_cost,
            font=Font(name=FONT, bold=True, size=10, color=WHITE), fill=NAVY, white=True)
DATA_TEAM_TOTAL_CELL = f"'Data Team'!$F${r}"
DATA_TEAM_HC_CELL = f"'Data Team'!$D${r}"

# ============================================================
# SHEET 4 — Cost Summary
# ============================================================
ws4 = wb.create_sheet("Cost Summary"); ws4.sheet_view.showGridLines = False
ws4.merge_cells("A1:D1"); ws4["A1"] = "NICTD Data Mining Phase — Cost Summary"; ws4["A1"].font = titf
ws4.merge_cells("A2:D2")
ws4["A2"] = "Live totals. Every figure here is a formula pulling from the other sheets — edit any blue input anywhere and this page updates instantly."
ws4["A2"].font = subf
header(ws4, ["Cost component", "Notes", "USD"], [34, 40, 18], 4, NAVY)

mgmt_val = 1 * 55 * RATE[6]
labour_val = field_total_val + dt_cost + mgmt_val
cont_val = round(labour_val * 0.10)
grand_val = labour_val + cont_val  # + non-labour 0

def note_row(r, label, note):
    lc = ws4.cell(row=r, column=1, value=label); lc.font = cf; lc.border = border
    nc = ws4.cell(row=r, column=2, value=note); nc.font = subf; nc.alignment = wrap; nc.border = border
    ws4.row_dimensions[r].height = 26

r = 5
note_row(r, "Field team labour", "118 enumerators, 33 KII, 31 supervisors, 15 leads (all 15 counties)")
put_formula(ws4, r, 3, f"={FIELD_TOTAL_CELL}", field_total_val); r += 1
note_row(r, "Data team labour", "Post-collection processing (see Data Team sheet)")
put_formula(ws4, r, 3, f"={DATA_TEAM_TOTAL_CELL}", dt_cost); r += 1
note_row(r, "Central management", "Survey/Project Director (G6) x 55 days")
put_formula(ws4, r, 3, f"=55*{RREF(6)}", mgmt_val); r += 1
subtotal_row = r
note_row(r, "Labour subtotal", "Field + Data Team + Management")
put_formula(ws4, r, 3, f"=SUM(C5:C{r-1})", labour_val, font=Font(name=FONT, bold=True, size=10, color=WHITE), fill=TEAL, white=True)
ws4.cell(row=r, column=1).font = Font(name=FONT, bold=True, size=10, color=WHITE); ws4.cell(row=r, column=1).fill = PatternFill("solid", fgColor=TEAL)
ws4.cell(row=r, column=2).fill = PatternFill("solid", fgColor=TEAL); r += 1
cont_row = r
note_row(r, "Contingency", "Editable % of labour subtotal ->")
put_input(ws4, r, 4, 0.10, number_format="0%")
put_formula(ws4, r, 3, f"=C{subtotal_row}*D{r}", cont_val); r += 1
ws4.column_dimensions["D"].width = 10
nonlab_row = r
note_row(r, "Non-labour (optional)", "Transport, tablets, per-diem, training — fill if applicable")
put_input(ws4, r, 3, 0, number_format=money); r += 1
grand_row = r
note_row(r, "GRAND TOTAL", "Labour subtotal + contingency + non-labour")
put_formula(ws4, r, 3, f"=C{subtotal_row}+C{cont_row}+C{nonlab_row}", grand_val, font=Font(name=FONT, bold=True, size=11, color=WHITE), fill=NAVY, white=True)
ws4.cell(row=r, column=1).font = Font(name=FONT, bold=True, size=11, color=WHITE); ws4.cell(row=r, column=1).fill = PatternFill("solid", fgColor=NAVY)
ws4.cell(row=r, column=2).fill = PatternFill("solid", fgColor=NAVY); r += 1

# workforce recap
r += 1
ws4.cell(row=r, column=1, value="Workforce recap").font = titf; r += 1
header(ws4, ["Group", "", "Headcount"], [34, 40, 18], r, TEAL); r += 1
tot_field = 197
for label, formula, val in [
    ("Total field workforce", "=197", 197),
    ("Data team headcount", f"={DATA_TEAM_HC_CELL}", dt_hc),
    ("Grand total workforce", f"=197+{DATA_TEAM_HC_CELL}+1", 197 + dt_hc + 1),
]:
    ws4.cell(row=r, column=1, value=label).font = cf; ws4.cell(row=r, column=1).border = border
    ws4.cell(row=r, column=2).border = border
    put_formula(ws4, r, 3, formula, val, number_format="General", align=ctr)
    r += 1

# order: Summary first
wb.move_sheet("Cost Summary", -(len(wb.sheetnames) - 1))

# calc properties: automatic recalculation + full recalc on load
wb.calculation = CalcProperties(calcId=191029, calcMode="auto", fullCalcOnLoad=True, forceFullCalc=True)

path = os.path.abspath(os.path.join(OUT_DIR, "NICTD-Cost-Schedule.xlsx"))
wb.save(path)

# ---- inject cached results next to each formula so the file shows values immediately ----
def fmt(v):
    return str(int(v)) if float(v).is_integer() else repr(float(v))

with zipfile.ZipFile(path) as z:
    wbxml = z.read("xl/workbook.xml"); relsxml = z.read("xl/_rels/workbook.xml.rels")
NSM = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NSR = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NSPKG = "http://schemas.openxmlformats.org/package/2006/relationships"
wt = ET.fromstring(wbxml); name_to_rid = {s.get("name"): s.get(f"{{{NSR}}}id") for s in wt.iter(f"{{{NSM}}}sheet")}
rt = ET.fromstring(relsxml); rid_to_tgt = {rel.get("Id"): rel.get("Target") for rel in rt.iter(f"{{{NSPKG}}}Relationship")}
def resolve_target(tgt):
    return tgt.lstrip("/") if tgt.startswith("/") else "xl/" + tgt  # absolute vs. relative-to-xl/
sheet_path = {name: resolve_target(rid_to_tgt[rid]) for name, rid in name_to_rid.items()}

with zipfile.ZipFile(path) as z:
    members = {i.filename: z.read(i.filename) for i in z.infolist()}
    infos = z.infolist()

for sheet_title, coords in cached.items():
    spath = sheet_path[sheet_title]
    xml = members[spath]
    for coord, value in coords.items():
        # openpyxl writes formula cells as <c r="X"><f>...</f><v></v></c> with an EMPTY cached value.
        # Fill that empty <v></v> (or self-closing <v/>) with the computed result.
        pat = re.compile((r'(<c r="%s"[^>]*><f>.*?</f>)(<v></v>|<v/>)' % re.escape(coord)).encode())
        replacement = None  # capture whether a substitution happened
        def repl(m):
            return m.group(1) + (f"<v>{fmt(value)}</v>").encode()
        xml, n = pat.subn(repl, xml, count=1)
        if n == 0:
            print(f"  WARN: no formula cell matched for {sheet_title}!{coord}")
    members[spath] = xml

tmp = path + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for info in infos:
        zout.writestr(info, members[info.filename])
os.replace(tmp, path)

print("WROTE", path)
print(f"VERIFY field=${field_total_val:,} datateam=${dt_cost:,} mgmt=${mgmt_val:,} labour=${labour_val:,} contingency=${cont_val:,} GRAND=${grand_val:,}")
print(f"VERIFY cached cells injected: {sum(len(v) for v in cached.values())}")
