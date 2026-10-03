const fs = require('fs');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
        WidthType, ShadingType, AlignmentType, BorderStyle, LevelFormat } = d;

function H1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } });
}
function H2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } });
}
function H3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 100 } });
}
function P(text, opts) {
  opts = opts || {};
  return new Paragraph({
    spacing: { after: opts.after === undefined ? 120 : opts.after },
    children: [new TextRun({ text, italics: !!opts.italics, bold: !!opts.bold })],
  });
}
function PLead(lead, rest) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: lead, bold: true }), new TextRun({ text: rest })],
  });
}
function BUL(text) {
  return new Paragraph({ text, numbering: { reference: 'bullets', level: 0 }, spacing: { after: 80 } });
}
function BULLead(lead, rest) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text: lead, bold: true }), new TextRun({ text: rest })],
  });
}
function SPACER() { return new Paragraph({ text: '', spacing: { after: 60 } }); }

function cell(text, widthDxa, opts) {
  opts = opts || {};
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text, bold: !!opts.bold, size: 20 })],
    })],
  });
}

function makeTable(headers, rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' };
  return new Table({
    columnWidths: widths,
    width: { size: widths.reduce(function (a, b) { return a + b; }, 0), type: WidthType.DXA },
    borders: { top: border, bottom: border, left: border, right: border,
               insideHorizontal: border, insideVertical: border },
    rows: [new TableRow({
      tableHeader: true,
      children: headers.map(function (h, i) { return cell(h, widths[i], { bold: true, shade: 'E8E8E8' }); }),
    })].concat(rows.map(function (r) {
      return new TableRow({ children: r.map(function (c, i) { return cell(c, widths[i]); }) });
    })),
  });
}

const W3 = [2600, 3300, 3460];
const body = [];

/* ==================== ORIGINAL DOCUMENT — UNCHANGED THROUGH AUGUST 4 ==================== */

body.push(H1("Liberia's Cocaine Case"));
body.push(P('As of Monday, July 13, 2026', { italics: true }));

body.push(H2('Overview'));
body.push(P('Liberia is prosecuting its largest known narcotics case in years: an alleged attempt to smuggle 237.6 kilograms of cocaine (worth an estimated $19.2 million) out of Roberts International Airport (RIA), disguised as Maggi seasoning cubes and lappas fabric bound for England. A month after the seizure, only one of six named defendants is in custody; the rest are fugitives or overseas. The case has exposed alleged bribery attempts, a Senate revolt over the pace of the probe, and questions about a key suspect’s mysterious 2024 release from prison on an earlier drug charge.'));

body.push(H2('Timeline'));
body.push(PLead('May 2026', ' — A similarly disguised shipment moves through the same corridor and is later found to have been delivered in the UK — likely a dry run for the June operation.'));
body.push(PLead('June 5, 2026', ' — Paul J. King, Operations Manager of Global Logistics Services (GLS), allegedly arranges for six boxes to be shipped to England via Brussels Airlines. Cash and cargo are collected from King’s residence before he leaves Liberia.'));
body.push(PLead('June 7–8, 2026', ' — Airport screening flags the cargo over a weight discrepancy. Inspection uncovers 198 plates of cocaine. LDEA confirms the substance using UN drug-testing kits — one of Liberia’s largest-ever drug seizures. Investigators later allege bribery attempts to recover the shipment.'));
body.push(PLead('Mid-June 2026', ' — President Joseph Boakai orders a Joint National Security Investigation, escalating the case to a multi-agency, transnational probe.'));
body.push(PLead('June 29–30, 2026', ' — With no public arrests after three weeks, senators accuse the investigation of moving too slowly and force a special Senate hearing.'));
body.push(PLead('July 1, 2026', ' — Police Inspector General Gregory Coleman tells the Senate arrests are imminent. The Senate separately orders a probe into how suspect Michael Browne was released from prison in 2024 after an earlier drug conviction.'));
body.push(PLead('July 2, 2026', ' — Officials describe Liberia as a drug-trafficking transit corridor, not a source country, and say the probe is being split between the domestic and international dimensions of the network.'));
body.push(PLead('July 4, 2026', ' — Police charge five individuals plus GLS as a company. Paul King is arrested and jailed at Monrovia Central Prison — the only suspect within Liberia’s jurisdiction. The other four are charged in absentia.'));
body.push(PLead('July 7, 2026', ' — A preliminary hearing opens in Monrovia City Court; the court rejects photocopied evidence, forcing prosecutors to produce certified originals.'));
body.push(PLead('July 8, 2026', ' — King’s defense argues he was in the US at the time and returned voluntarily to clear his name; the court grants a full preliminary hearing.'));
body.push(PLead('July 8–10, 2026', ' — Prosecution witnesses (LDEA and LNP Anti-Narcotics Unit officials) testify to the alleged chain of custody and cargo discrepancies. The state rests July 10.'));
body.push(PLead('July 13, 2026 (as of original report)', ' — Final arguments are expected to conclude before Magistrate Ben Barco, who will rule on whether to send the case to Criminal Court “C” for trial.'));

body.push(H2('Who’s Involved'));
body.push(makeTable(['Name', 'Alleged Role', 'Status'], [
  ['Paul J. King', 'GLS Operations Manager; arranged the shipment', 'In custody, Monrovia Central Prison'],
  ['Michael U.S. Browne (“US Marshall”)', 'Alleged organizer; prior 2024 drug conviction', 'Fugitive, charged in absentia'],
  ['Oscar J. Browne', 'RIA employee, allegedly involved', 'At large, charged in absentia'],
  ['Emmanuel Kpah/Kpeh', 'Allegedly moved cash/boxes', 'At large, charged in absentia'],
  ['Ousman/Usman Ali', 'UK-based consignee', 'Overseas, charged in absentia'],
  ['Global Logistics Services (GLS)', 'Cargo company', 'Charged as a corporate entity'],
], W3));
body.push(SPACER());

body.push(H2('Key Officials'));
body.push(BUL('President Joseph Nyuma Boakai — ordered the national security task force'));
body.push(BUL('Cllr. N. Oswald Tweh — Justice Minister, supervising the probe'));
body.push(BUL('Col. Gregory O.W. Coleman — Police Inspector General, public face of the investigation'));
body.push(BUL('Nyonblee Karnga-Lawrence — Senate Pro Tempore, ordered the Browne release probe'));
body.push(BUL('Sens. Edwin Snowe and Amara Konneh — forced the July 1 Senate hearing'));
body.push(BUL('Cllr. Amara Sheriff — King’s defense counsel'));
body.push(BUL('Magistrate Ben Barco — presiding over the preliminary hearing'));

body.push(H2('What’s Contested'));
body.push(BULLead('Why the delay?', ' Nearly a month passed between seizure and any arrest, fueling public speculation — some unsubstantiated — about official protection. The government says no evidence has publicly linked any official to the case.'));
body.push(BULLead('The Browne question:', ' How a man convicted in a 2024 drug case walked free and resurfaced at the center of a far bigger bust is now under separate legislative investigation.'));
body.push(BULLead('GLS-Menzies’ airport concession:', ' Some senators want it suspended pending the outcome.'));
body.push(BULLead('International reach:', ' Officials frame Liberia as a transit corridor for cocaine moving from South America to Europe, and say they’re pursuing Interpol notices for suspects abroad.'));

body.push(H2('For the Record'));
body.push(BUL('All named individuals are presumed innocent unless convicted by a Liberian court.'));
body.push(BUL('Some details (arrest specifics, additional suspects) vary slightly across Liberian outlets. Confirm today’s magistrate ruling with a same-day source before publishing.'));
body.push(BUL('This is fast-moving; check for developments after July 13, particularly the probable-cause ruling and any new arrests from the ongoing manhunt.'));

/* -------------------- July 14–24 update — unchanged -------------------- */

body.push(H1('Latest Update: Updates July 14–24, 2026'));

body.push(H2('Overview of New Developments'));
body.push(P('Since July 13, the case has moved on two fronts: Paul King’s case reached a ruling and was sent to trial, and a second, far larger cocaine seizure emerged in Duazon that has since dwarfed the original RIA case in scale. A protest movement tied to the case also triggered a separate controversy involving the police chief.'));

body.push(H2('Timeline Continued'));
body.push(PLead('July 14, 2026', ' — Final arguments conclude before Magistrate Ben Barco. Prosecution evidence includes the seized cocaine, a $2,150 shipping-fee receipt, King’s statement, and testimony from security personnel. Defense argues King was in the US when the shipment was arranged, returned voluntarily, and had no reason to suspect narcotics given a clean 2024 shipping history. Barco reserves ruling, initially scheduled for delivery the same day.'));
body.push(PLead('July 15, 2026', ' — Magistrate Barco delivers his ruling. Testimony from LDEA Chief Investigator Col. Moses L. Meah and LNP Anti-Narcotics Superintendent Joseph M. Kaiffa, backed by documentary and physical evidence, is found to establish probable cause that King and others conspired to possess and export controlled substances. The court dismisses defense objections over chain of custody, rules two cited U.S. legal precedents non-controlling in Liberia, and forwards King and co-defendants to Criminal Court “C” for full trial. All defendants have pleaded not guilty. The ruling also draws attention to the absence of the alleged shipper from the current indictment, despite that individual being named in investigative documents.'));
body.push(PLead('July 16, 2026', ' — Cllr. Arthur T. Johnson publicly cautions the government to follow due process and avoid political pressure in the case. Police ground a vehicle being used to publicize a planned July 17 protest.'));
body.push(PLead('July 16–17, 2026', ' — The STAND-led “Save Liberia Protest Coalition” holds a nationwide demonstration against the Boakai administration, themed “Lead or Leave Now: The 2nd Coming,” citing the cocaine case as a central grievance and giving the LDEA 48 hours to publicly name everyone connected to the RIA shipment.'));
body.push(PLead('July 20, 2026', ' — STAND Chairman Mulbah K. Morlu accuses the Boakai government of “selective justice,” saying police surrounded his home with armed officers over a recovered pistol while showing no comparable urgency toward cocaine-case suspects. A dispute breaks out between Police Inspector General Gregory Coleman and Morlu over a firearm police say was stolen from an officer during the protest; Coleman holds a press conference demanding its return, and Morlu signals no intention of complying. The ruling Unity Party questions the protest’s timing. Publishes analysis framing the case as a test of President Boakai’s legacy, drawing parallels to the Weah-era $100 million cocaine case, and noting that charges so far have concentrated on lower-level figures while any financiers or protectors remain unidentified.'));
body.push(PLead('July 20–21, 2026', ' — Several persons of interest are apprehended on July 20. Intelligence from preliminary interrogations leads investigators to a property in Duazon, Margibi County, along the RIA highway. On July 21, a joint security team executes a court-issued search-and-seizure warrant on a warehouse in the VOA Community, Duazon, seizing 3,971 kilograms of cocaine — nearly 17 times the weight of the original RIA haul. Two foreign nationals are arrested at the scene: Johann David Garces Grajales (dual Colombian/Spanish national) and Srdan Seles (Serbian national), both found in possession of a firearm. Several Liberians are also arrested.'));
body.push(PLead('July 22–23, 2026', ' — Police chief Gregory Coleman confirms to the BBC that the substance is cocaine, worth an estimated $370 million — the largest seizure in the country’s recent history, tied to a trafficking network under surveillance since 2018–2023. Five suspects face trafficking and conspiracy charges, four in absentia; fugitives are being pursued via arrest warrants and international cooperation. Justice Minister Oswald Tweh confirms the two foreign detainees are assisting investigators, though their names have since leaked despite being officially withheld. VP Jeremiah Koung vows accountability “regardless of who you are.” Senators Konneh, Dillon, and Snowe renew calls for a broader inquiry into why large seizures keep producing no timely arrests.'));

body.push(H2('Updated Status Table'));
body.push(makeTable(['Name', 'Alleged Role', 'Status'], [
  ['Paul J. King', 'GLS Operations Manager; arranged RIA shipment', 'In custody; bound over for trial at Criminal Court “C”'],
  ['Michael U.S. Browne (“US Marshall”)', 'Alleged organizer; prior 2024 drug conviction', 'Fugitive, charged in absentia'],
  ['Oscar J. Browne', 'RIA employee, allegedly involved', 'Fugitive, charged in absentia'],
  ['Emmanuel Kpah/Kpeh', 'Allegedly moved cash/boxes', 'Fugitive, charged in absentia'],
  ['Ousman/Usman Ali', 'UK-based consignee', 'Overseas, charged in absentia'],
  ['Global Logistics Services (GLS)', 'Cargo company', 'Charged as a corporate entity'],
  ['Johann David Garces Grajales', 'Duazon warehouse; dual Colombian/Spanish national', 'New: in custody'],
  ['Srdan Seles', 'Duazon warehouse; Serbian national', 'New: in custody'],
  ['Several unnamed Liberians', 'Duazon warehouse', 'New: several in custody, some charged in absentia'],
], W3));
body.push(SPACER());

body.push(H2('What’s Newly Contested'));
body.push(BULLead('Selective accountability:', ' Analysts and opposition figures argue charges remain concentrated on lower-level cargo, screening, and logistics staff, while any financiers or political protectors remain unidentified — a pattern critics say echoes the collapsed Weah-era $100 million case.'));
body.push(BULLead('The protest/gun dispute:', ' Has visibly diverted public and press attention from the underlying financial and political questions in the case.'));
body.push(BULLead('Duazon scale:', ' How a nearly 4-metric-ton stockpile — dwarfing the RIA seizure — sat undetected in a residential compound near the airport highway is now the central open question and is fueling fresh legislative demands for accountability.'));
body.push(BULLead('International reach, expanded:', ' With Colombian, Spanish, and Serbian nationals now implicated, officials are leaning further into the “transit corridor” framing and pursuing international cooperation on extraditions.'));

body.push(SPACER());
body.push(PLead('July 24', ' — STAND Chairman Mulbah Morlu calls for an international investigation, warning Liberia risks becoming a “narco-state.” Colombia’s honorary consulate in Monrovia disputes any link to Duazon suspect Johann David Garces Grajales, questioning the authenticity of his Colombian passport. Separately, Police intelligence Chief Olufemi Briggs, Blaye, Kwabo, and NSA operative Jamal Robert are detained and interrogated after suspects name them as having helped move the narcotics; none is charged at this point. Police Commissioner Johnny Bolar Dean is arrested and dismissed over an alleged $10,000 bribe to secure favourable treatment for two Duazon suspects in custody.'));
body.push(PLead('July 29', ' — Prosecutors formally indict 12 defendants in the Duazon case at Paynesville City Magisterial Court: Grajales, Srdan Seles, Edison Brown, Mohammed Alpha Bah, Jammel V. Jallah, Christopher Sayee, Christian L. Nyantee, Caycee Nelson, “Sekou,” Nana Tom, “Michael,” and “Abednego.” The charge sheet alleges the scheme traces back to 2024, including an earlier aircraft-based smuggling attempt.'));
body.push(PLead('July 30', ' — Coleman announces Blaye (Financial Crime Division chief) and Kwabo (Highway Patrol chief) are charged and sent to court, accused of escorting the cocaine by police vehicle from a landing site to a holding location and splitting a $10,000 payoff. Coleman discloses a September 2025 internal memo had already warned President Boakai that traffickers had a foothold in the anti-narcotics apparatus, and says the operation was “sanctioned by state actors at very, very senior level,” with investigators now examining individuals who held presidential appointments between 2019 and 2023.'));
body.push(PLead('July 30-31', ' — The Executive Mansion dismisses, suspends, or recalls at least ten officials across RIA, LNP, NSA, LDEA, and the Ministry of Gender, Children and Social Protection: Mark Egon Kuiah (RIA deputy director for operations), Johnny Bolar Dean, Patrick Doe (NSA deputy director), Patrick Komasu (NSA agent seconded to LDEA), Mohammed O. Gbowrah (RIA security director), Moses Jallah (LDEA deputy commander, RIA), and four referred to the Ministry of Justice for prosecution — NSA agents Jammel V. Jallah and Christian L. Nyantee, NSA’s Albenigo Janior, and Caycee Nelson (procurement director, Ministry of Gender), who allegedly recruited an airport contact into the scheme.'));
body.push(PLead('July 30', ' — All 4.2 tons of cocaine from both cases (~$336 million combined) are destroyed at the LMHRA site in Mambah-Kaba District under court order, samples retained for trial. The Justice Ministry discloses the total prosecution count for the first time: 12 in the Duazon case, 5 in the RIA case.'));
body.push(PLead('August 1', ' — Coverage highlights LDEA officer Col. Sheriff Abdullah for a separate, unrelated cocaine interdiction at RIA (3.355 kg, ~$181,000), with calls for better resourcing of LDEA field officers.'));
body.push(PLead('August 3', ' — The DEA is now working in-country; Morocco has offered support, with outreach underway to Rwanda and the Netherlands. Senator Amara Konneh welcomes the dismissals but says they stop at “low- and mid-level officers,” calling for the investigation to reach senior figures regardless of political affiliation. Separately, it is reported that Kuiah, before his dismissal, signed a July 13 letter to the Liberia Maritime Authority — as self-described agent for a company called Madris Group of Companies — requesting docking privileges for a vessel he described as disabled at sea. LiMA denied the request, noting the vessel was still in Sierra Leonean waters when it was made. The vessel is the IB Atlantic IV.'));
body.push(PLead('August 4', ' — Liberian troops pursue the IB Atlantic IV off Rivercess under a search-and-seizure order after it drifted into Liberian waters; authorities report a possible at-sea transfer attempt by a smaller boat. Kuiah has not been charged but is reportedly cooperating with investigators.'));

body.push(H2('Updated Status Table (as of August 4, 2026)'));
body.push(H3('RIA / $19.2M Case — 5 Charged'));
body.push(makeTable(['Name', 'Alleged Role', 'Status'], [
  ['Paul J. King', 'GLS Operations Manager', 'In custody, bound over for trial'],
  ['Michael U.S. Browne, Oscar J. Browne, Emmanuel Kpah/Kpeh, Ousman/Usman Ali', 'Various roles', 'Fugitives/overseas, charged in absentia'],
  ['Global Logistics Services', 'Cargo company', 'Charged as corporate entity'],
], W3));
body.push(SPACER());
body.push(H3('Duazon Case / $317.68M — 12 Indicted July 29'));
body.push(makeTable(['Name', 'Alleged Role', 'Status'], [
  ['Johann David Garces Grajales, Srdan Seles', 'Warehouse principals', 'In custody'],
  ['Edison Brown, Mohammed Alpha Bah, Jammel V. Jallah, Christopher Sayee, Christian L. Nyantee, Caycee Nelson, “Sekou,” Nana Tom, “Michael,” “Abednego”', 'Various roles alleged', 'Status mixed; further unidentified suspects noted'],
], W3));
body.push(SPACER());
body.push(H3('Police/Security Track'));
body.push(makeTable(['Name', 'Alleged Role', 'Status'], [
  ['Anthony T. Blaye, Wadell Kwabo', 'LNP commanders — alleged escort', 'Charged, detained, bound for trial'],
  ['Johnny Bolar Dean', 'Police Commissioner', 'Dismissed; alleged $10,000 bribe'],
  ['Olufemi Briggs, Jamal Robert', 'Intelligence chief / NSA operative', 'Detained/interrogated, not charged'],
  ['Mark Egon Kuiah', 'RIA Deputy Director for Operations', 'Dismissed, not charged, cooperating; named in IB Atlantic IV letter'],
  ['Patrick Doe, Patrick Komasu, Mohammed O. Gbowrah, Moses Jallah', 'NSA / RIA / LDEA officials', 'Dismissed/suspended'],
  ['Jammel V. Jallah, Christian L. Nyantee, Albenigo Janior, Caycee Nelson', 'NSA agents; Ministry of Gender procurement director', 'Dismissed, referred for prosecution'],
], W3));
body.push(SPACER());
body.push(H3('New Development: IB Atlantic IV'));
body.push(P('Cargo vessel pursued by Liberian troops off Rivercess under a search-and-seizure order, after Kuiah vouched for it in a July 13 letter pre-dismissal. Possible at-sea transfer attempt reported. Outcome pending.'));

/* ======================= NEW SECTION: AUGUST 5 – SEPTEMBER 3, 2026 ======================= */

body.push(H1('Latest Update: August 5 – September 3, 2026'));
body.push(P('Compiled Thursday, September 3, 2026', { italics: true }));

body.push(H2('Overview of New Developments'));
body.push(P('In the month since August 4 the story stopped being a cargo-handling prosecution and became a political crisis. Three things define the period. First, former Vice President Jewel Howard-Taylor was stopped at Roberts International Airport on August 19, charged with drug trafficking and money laundering, and remanded to Monrovia Central Prison — the highest-ranking Liberian ever charged in a narcotics case. Second, Liberia’s entire drug-enforcement and prosecutorial leadership turned over: the LDEA got its fifth head in 30 months, and on September 2 President Boakai removed Justice Minister Oswald Tweh and Solicitor General Augustine Fayiah, the two officials who had been the public face of the prosecution. Third, the legal foundations of both cases came under serious attack — the RIA indictment returned August 27 is already being picked apart by senior defense lawyers, and the Margibi trial had to be restarted with a sequestered jury after tampering.'));
body.push(P('The IB Atlantic IV chase ended outside Liberia: Ivorian authorities seized the vessel, and it remains unconfirmed whether any narcotics were aboard.'));
body.push(PLead('Note on figures:', ' Officials have settled on roughly US$317 million for the Duazon seizure (revised down from the initial US$370 million) and roughly US$19.2–19.3 million for the RIA seizure — about US$336 million combined. Outlets still use the older $370M number interchangeably.'));

body.push(H2('Timeline Continued'));

body.push(PLead('August 5, 2026', ' — Resident Judge Victoria Worlobah Duncan of the 13th Judicial Circuit Court in Kakata sentences Quita Dolo Kosso (also reported as Quati Dolo / Quita Kosso Dolo) to five years in prison after accepting a plea agreement. Kosso was arrested at RIA on July 12, 2025, arriving from Bangkok aboard Kenya Airways KQ887 with 3.355 kg of cocaine in her luggage, valued at US$181,008 — the same interdiction credited to Col. Sheriff Abdullah in the August 1 coverage above. Her plea is the first conviction to come out of any of the airport cases. Several co-defendants, including LDEA officers, remain on trial over the shipment, an alleged bribery attempt, and conspiracy; another defendant has also pleaded guilty, and the rest deny wrongdoing.'));
body.push(PLead('August 5, 2026', ' — Analysis published on why the suspects may never see an American courtroom. The obstacle is “nexus”: without evidence the cocaine targeted US territory, commerce or persons, federal statutes (the Maritime Drug Law Enforcement Act; 21 U.S.C. §§ 959 and 963) do not confer jurisdiction. Sam Gaye, Director of the Executive Protection Agency, contrasts the current case with the DEA-run 2010 Operation Relentless sting that took Russian pilot Konstantin Yaroshenko to a US court — “the drugs were bound for Europe” this time. Reporting in the same period notes that Monrovia Central Prison Chief of Operations Jackson Kolako has been arrested for allegedly aiding suspects, and that Mark Kuiah remains dismissed but uncharged.'));
body.push(PLead('August 6, 2026', ' — Foreign Minister Sara Beysolow Nyanti uses the MICAT press briefing to reject the “narco-state” framing and lay out the diplomatic track. She names the United States, United Kingdom, Netherlands, Germany, Belgium, Morocco and Rwanda as partners assisting the probe, and says discussions with advisors at the White House Situation Room and the US National Security Council — initiated at the request of the Inspector General of Police and supported by the Solicitor General — brought US Department of Justice personnel into Liberia within 24 to 48 hours. She stresses any prosecution will happen in Liberia under Liberian law. Responding to allegations linking diplomatic cargo to trafficking, she clarifies that the Ministry does not handle or inspect diplomatic shipments: under the Vienna Convention embassies are entitled to duty-free pouches, the Chief of Protocol only verifies diplomatic status, and the Liberia Revenue Authority processes the request. She challenges anyone with evidence to take it to the Joint Security and the National Security Council.'));
body.push(PLead('August 6, 2026', ' — The Open Society Foundation – Liberia issues a statement of “full and unreserved support” for Nyanti and condemns what it calls baseless allegations, after Spoon Talk host Stanton Witherspoon named her, Minister Mamaka Bility and a port director on air in connection with the cartel investigation. The statement credits Nyanti with the DEA escalation and with mobilising partnerships across the US, UK, EU, Serbia, Spain, the Netherlands and Morocco. Separately, unverified reports circulate that IG Gregory Coleman has stepped back from leading the investigation and stopped fronting press conferences; neither the LNP, the Ministry of Justice, the Executive Mansion nor the US Embassy confirms any change.'));
body.push(PLead('August 7, 2026', ' — Coleman publicly commits that all cases arising from the seizures will be pursued on credible evidence, due process and lawful authority.'));
body.push(PLead('August 8, 2026', ' — LDEA Officer-in-Charge Fitzgerald T. M. Biago asks to recuse himself from his duties amid allegations that he received a Toyota pickup from an individual associated with a drug-trafficking organisation. President Boakai acknowledges the request and instructs Justice Minister Tweh to open an immediate, comprehensive investigation.'));
body.push(PLead('Early August 2026', ' — The IB Atlantic IV story ends abroad. The 41-year-old Comoros-flagged general cargo ship — first spotted drifting near York Island, Tewor District, Grand Cape Mount County, and declaring Lomé, Togo as its destination — evades Liberian pursuit for over a week. Liberia’s Coast Guard has no vessel built for a long-range chase. The ship is intercepted and seized by Ivorian security authorities and held at an Ivorian port; Liberia works to secure a Sea Shepherd Global vessel to escort it back, and the AFL later confirms possession following a coordinated regional operation. It remains unclear whether any narcotics were found aboard — no contraband has been publicly confirmed.'));
body.push(PLead('August 10, 2026', ' — Boakai orders Tweh to report on the Biago allegations within 48 hours, and nominates retired Major General Daniel Dee Ziankahn Jr. — former Minister of National Defense and, most recently, Military Advisor to the President — as Director General of the LDEA, with Precious Rue as Deputy Director General for Operations and Prince Mulbah as Deputy Director General for Administration. All three take up duties immediately in an acting capacity pending Senate confirmation. It is the LDEA’s fifth leadership team in 30 months.'));
body.push(PLead('August 10, 2026', ' — In Kakata, newly assigned Resident Circuit Judge Roosevelt Z. Willie of the 13th Judicial Circuit orders the selection of a 15-member sequestered jury for the major Margibi narcotics trial, citing evidence that jurors were tampered with during the May 2026 term and had to be discharged. “These cases can’t be tried without a jury, especially sequestered jurors,” he says. Jury selection is set for August 13.'));
body.push(PLead('August 11–13, 2026', ' — Biago is suspended indefinitely from the Liberia National Police after the Ministry of Justice report: the investigation did not establish involvement in narcotics trafficking but identified ethical concerns requiring further inquiry. Civil society welcomes the 48-hour probe; commentators describe the LDEA as an agency in crisis. Jury selection proceeds in Kakata on August 13, complicated by the fact that the 13th Circuit has no sequestration facility — the Judiciary has to book a hotel in Kakata and hire caterers. Judge Willie warns that he will dismiss cases over prolonged pretrial detention, tells judicial officers “our job does not call for a popularity contest or public clamour,” and discloses five attempts on his life, including an incident at his residence on June 25, 2025.'));
body.push(PLead('August 17, 2026', ' — In a separate but adjacent accountability case, trial opens at Criminal Court “C” against 13 defendants in the Saudi rice matter — including former Foreign Minister Dee-Maxwell Saah Kemayah and former Internal Affairs Minister Varney A. Sirleaf — over 25,054 of 29,412 donated 25kg bags (US$425,918 of a US$500,000 donation) allegedly stolen or misapplied. Criminal Court “C” had ruled on August 11 that the matter should proceed. It is not connected to the narcotics cases, but it competes for the same court and the same prosecutorial capacity.'));
body.push(PLead('August 19, 2026', ' — Former Vice President Jewel Howard-Taylor (VP 2018–2024) is stopped by security at Roberts International Airport as she prepares to fly to Accra for a women’s forum, and taken to Liberia National Police headquarters. A police charge sheet is filed the same day. Justice Minister Tweh says the charges rest on “credible available evidence” and that she will face grand jury indictment before prosecution. Officials state that her case and the Duazon seizure are not connected — hers arises from the wider transnational network investigation.'));
body.push(PLead('August 21, 2026', ' — Her scheduled court appearance slips after the LNP grants a one-day extension over reported health complications; she had suffered an asthma attack and elevated blood pressure in custody.'));
body.push(PLead('August 25, 2026', ' — A writ of arrest is issued and Howard-Taylor appears before the Monrovia City Court. The court rejects her lawyers’ request that she remain at a Monrovia hospital or receive humanitarian accommodation, and remands her to Monrovia Central Prison to await trial.'));
body.push(PLead('August 26, 2026', ' — The court denies home confinement. The same day President Boakai delivers a special national address on illicit drug trafficking: “We will identify you. We will pursue you. We will find you. And we will deal with you in accordance with the rule of law.” He pledges that no one will be protected or persecuted because of political affiliation, public office, wealth or influence — “there will be no sacred cows” — while defending due process for Howard-Taylor.'));
body.push(PLead('August 26–27, 2026', ' — At the Edward Wilmot Blyden Intellectual Discourse hosted by the Press Union of Liberia, Senator Amara Konneh presses two demands. On the suspended officials: charge them or reinstate them — “Suspending officials and burning confiscated drugs are the easy part. Securing a conviction in court is the hard part,” citing the Weah-era case that collapsed for want of evidence handling and financial investigation. On procurement: publish the paperwork behind a roughly US$1.5 million Liberia National Police vehicle fleet — pickups, jeeps, motorcycles and ambulances, including ten Toyota Land Cruiser Prados — after allegations that some vehicles were registered to private individuals. He asks for PPCC approvals, GSA asset-registration records, Ministry of Finance payment vouchers and LRA duty-waiver documentation: “If the cars are GOL property, the documents will exonerate the police, build their credibility, and strengthen the cocaine case.”'));
body.push(PLead('August 27, 2026', ' — A grand jury returns the indictment in the RIA case at Criminal Court “C” against 11 named and unnamed defendants — a materially different line-up from the five charged in July. Named: Paul J. King (GLS); George Wah Harris, alias Leroy Harris, owner of the Private Bar Entertainment Center in Paynesville; Michael U.S. Browne, alias Rahim/Polo Bah; Emmanuel Kpah; Philip Yeoh Jr.; Mohammed O. Gbowrah (RIA Security Director); Moses Jallah (LDEA officer); Oscar J. Browne; and Usman Ali (UK consignee). The Private Bar Entertainment Center is charged as a corporate entity but listed as “TO BE IDENTIFIED.” Note that GLS, charged as a company in July, does not appear on this list, while two dismissed security officials now do.'));
body.push(PLead('Late August 2026', ' — Howard-Taylor’s defense opens two fronts. It files a Petition for Habeas Corpus seeking her immediate release on the ground that she is held without a valid grand jury indictment, contrary to Article 21(h) of the Constitution, and announces an appeal to the Supreme Court against the Monrovia City Court’s refusal of compassionate detention. Politically, Nimba County Senator Samuel Kogar demands that IG Coleman resign or be dismissed over an alleged conflict of interest and calls for an investigation into the President’s son, Joseph N. Boakai Jr., who denies any involvement in illegal drug activity or any use of his relationship with the Presidency to influence government decisions. Bong County Representative Marvin Cole rallies county support behind Howard-Taylor, alleging selective justice.'));
body.push(PLead('August 28, 2026', ' — The preliminary examination set for this date does not proceed; prosecutors ask the court to move it to September 2.'));
body.push(PLead('September 1, 2026', ' — At 7:54 a.m. Howard-Taylor’s lawyers file a Request for Continuance with Stipendiary Magistrate Cllr. L. Ben Barco, asking that the examination move from Tuesday to Wednesday so a doctor familiar with her medical history — a cardiologist — can examine her first; the defense also seeks her medical records. The same day the MDR expels Senator Kogar over his criticism of the government, and the Coalition for Democratic Change calls Boakai’s August 26 address “dishonest and nefarious,” demands an independent probe into alleged cartel infiltration of the security institutions, and points to the President’s son having been named in a video by an alleged cartel figure while facing no accountability.'));
body.push(PLead('September 2, 2026', ' — Former President George Weah returns to Liberia, giving the opposition a focal point. The Monrovia City Court reassigns Howard-Taylor’s preliminary examination again — to Friday, September 4 at 10:00 a.m. And the Executive Mansion announces that President Boakai has removed Justice Minister and Attorney General Cllr. N. Oswald Tweh, in post since February 2024, and Solicitor General Augustine Fayiah, appointing Cllr. Betty M. Lamin-Blamo — a former Solicitor General under President Sirleaf with extensive Supreme Court litigation experience — as Minister of Justice and Attorney General, and Cllr. Abrahim Boimah Sillah Sr. as Solicitor General. The Executive Mansion frames it as part of “the President’s continuing effort to strengthen key government institutions” and gives no case-specific explanation. The two removed officials had been leading the prosecution of Howard-Taylor. Social media allegations had attempted to link Tweh’s official vehicle to individuals in the investigation; no credible evidence of personal wrongdoing has been produced.'));
body.push(PLead('September 3, 2026 (today)', ' — Senior Liberian criminal lawyers publicly warn that the August 27 RIA indictment may not survive a Motion to Quash. Howard-Taylor’s preliminary examination now stands for tomorrow, September 4, before Magistrate Barco, with the habeas petition and the Supreme Court appeal both live.'));

body.push(H2('The Howard-Taylor Case: What the State Alleges'));
body.push(P('The prosecution’s theory rests on meetings and money rather than on any allegation that she handled narcotics. Per the writ and charge sheet:'));
body.push(BUL('2021 — Sheikh Bashiru Kante allegedly brings foreign nationals to Liberia, where a conspiracy forms to move cocaine from Liberia onward to Europe.'));
body.push(BUL('2022 — Kante allegedly introduces them to Howard-Taylor at her Congo Town residence; she is subsequently invited to Dubai, where the state says she met network leader Nikola Ivancic and discussed using Liberia as a transit route.'));
body.push(BUL('Alleged payments totalling about US$135,000: US$45,000 received in Dubai from Ivancic (described as shopping expenses); US$75,000 to her Jewel Star Fish Foundation; and US$15,000 requested and received through Kante in August 2026.'));
body.push(BUL('Nine counts, including unlicensed importation and exportation of controlled drugs, unlicensed sale and distribution, illicit trafficking, criminal facilitation, criminal solicitation, criminal conspiracy, money laundering, aiding the consummation of a crime, and abuse of office.'));
body.push(P('Named co-conspirators: Sheikh Bashiru Kante (domestic, alleged intermediary); and charged in absentia — Nikola Ivancic (Croatian, alleged ring leader), Mihovil Vrovac (Croatian, alias “Michael”), and Taras Zadereiko (Ukrainian, alias “Tony”). The government says it is pursuing all domestic and international measures to secure their extradition.'));
body.push(P('Her position: she denies every allegation; her lawyers call the case baseless and politically motivated, and she requested the preliminary examination. She is presumed innocent unless convicted.'));

body.push(H2('Why the RIA Indictment Is Under Attack'));
body.push(P('Defense counsel and outside litigators point to nine defects in the August 27 charging instrument. These are contested claims, not court findings — but they set the agenda for the motions to come:'));
body.push(BUL('Forensic foundation: the indictment describes a “white powdery-like substance suspected to be illicit drugs” without a certified chemical analysis. “You cannot indict 200kg of cocaine based on a scanner image,” one senior criminal litigator argues; GC-MS results and certificates have not been produced.'));
body.push(BUL('Quantity variance: the instrument refers both to 200 kg and to 198 plates, an internal contradiction.'));
body.push(BUL('Invalid corporate defendant: a company charged as “TO BE IDENTIFIED” cannot satisfy incorporation-pleading requirements.'));
body.push(BUL('Misjoinder: officers said to have refused bribes are nonetheless charged as co-conspirators.'));
body.push(BUL('Insufficient mens rea as to King — no pleaded facts establishing guilty knowledge.'));
body.push(BUL('Hearsay: the allegations against Harris are said to lack a direct evidentiary link.'));
body.push(BUL('No money-laundering predicate: the transactions cited are legitimate freight fees, not criminal proceeds.'));
body.push(BUL('Illegal search: a Sunday search conducted by private security without a warrant or a magistrate.'));
body.push(BUL('Prior bad acts: a May 20 allegation offered without conviction documentation.'));
body.push(P('Expect motions to quash and motions for severance. The prosecution’s answer will have to be certified forensic certificates, complete chain-of-custody documentation, and laboratory analysis — exactly the areas Senator Konneh warned about when he pointed to the collapse of the Weah-era case.'));

body.push(H2('Updated Status Tables (as of September 3, 2026)'));

body.push(H3('RIA / US$19.2M Case — Grand Jury Indictment, August 27'));
body.push(makeTable(['Name', 'Alleged Role', 'Status'], [
  ['Paul J. King', 'GLS General Manager for Operations', 'In custody; indicted, awaiting trial at Criminal Court “C”'],
  ['George Wah Harris (alias Leroy Harris)', 'Owner, Private Bar Entertainment Center, Paynesville', 'Newly named in the August 27 indictment'],
  ['Michael U.S. Browne (alias Rahim/Raheem Bah, Polo Bah, “US Marshall”)', 'Alleged organizer; prior 2024 drug case', 'Fugitive — reported to have crossed into Sierra Leone; no arrest confirmed'],
  ['Oscar J. Browne', 'RIA employee', 'Fugitive / charged in absentia'],
  ['Emmanuel Kpah', 'Allegedly moved cash/boxes', 'Fugitive / charged in absentia'],
  ['Usman Ali', 'UK-based consignee', 'Overseas / charged in absentia'],
  ['Philip Yeoh Jr.', 'Newly named', 'Indicted August 27'],
  ['Mohammed O. Gbowrah', 'RIA Security Director (dismissed July 30–31)', 'Now indicted — moved from dismissal to defendant'],
  ['Moses Jallah', 'LDEA officer, RIA (dismissed July 30–31)', 'Now indicted — moved from dismissal to defendant'],
  ['Private Bar Entertainment Center', 'Corporate defendant', 'Charged but listed “TO BE IDENTIFIED” — a pleaded defect'],
  ['Global Logistics Services (GLS)', 'Cargo company charged in July', 'Does not appear among the 11 named on August 27 — verify before publishing'],
], W3));
body.push(SPACER());

body.push(H3('Howard-Taylor Track — Transnational Network'));
body.push(makeTable(['Name', 'Alleged Role', 'Status'], [
  ['Jewel Howard-Taylor', 'Former Vice President (2018–2024); alleged facilitation and receipt of payments', 'Charged Aug 19; remanded to Monrovia Central Prison Aug 25; preliminary examination Sept 4; habeas petition and Supreme Court appeal pending'],
  ['Sheikh Bashiru Kante', 'Alleged intermediary who introduced the network', 'Named as co-conspirator'],
  ['Nikola Ivancic', 'Croatian; alleged cartel ring leader', 'Charged in absentia; extradition sought'],
  ['Mihovil Vrovac (“Michael”)', 'Croatian', 'Charged in absentia; extradition sought'],
  ['Taras Zadereiko (“Tony”)', 'Ukrainian', 'Charged in absentia; extradition sought'],
], W3));
body.push(SPACER());

body.push(H3('Duazon Case / US$317M — 12 Indicted July 29'));
body.push(makeTable(['Name', 'Alleged Role', 'Status'], [
  ['Johann David Garces Grajales, Srdan Seles', 'Warehouse principals (Colombian/Spanish; Serbian)', 'In custody; Colombia’s honorary consulate continues to dispute Grajales’s passport'],
  ['Edison Brown, Mohammed Alpha Bah, Jammel V. Jallah, Christopher Sayee, Christian L. Nyantee, Caycee Nelson, “Sekou,” Nana Tom, “Michael,” “Abednego”', 'Various roles alleged', 'Mixed; several in absentia. A jury tampering incident forced the Margibi proceedings to restart with a 15-member sequestered jury (selection Aug 13, Judge Roosevelt Z. Willie, Kakata)'],
], W3));
body.push(SPACER());

body.push(H3('Police / Security / Government Track — Changes Since August 4'));
body.push(makeTable(['Name', 'Role', 'Status as of September 3'], [
  ['Cllr. N. Oswald Tweh', 'Minister of Justice / Attorney General', 'REMOVED September 2; replaced by Cllr. Betty M. Lamin-Blamo. No wrongdoing established'],
  ['Augustine Fayiah', 'Solicitor General', 'REMOVED September 2; replaced by Cllr. Abrahim Boimah Sillah Sr.'],
  ['Fitzgerald T. M. Biago', 'LDEA Officer-in-Charge', 'Recused Aug 8; suspended indefinitely from the LNP after MOJ report — no narcotics involvement established, ethics concerns under further inquiry'],
  ['Maj. Gen. (Ret.) Daniel Dee Ziankahn Jr.', 'LDEA Director General', 'NEW — appointed Aug 10 (acting, pending Senate confirmation). Precious Rue and Prince Mulbah named deputies'],
  ['Col. Gregory O.W. Coleman', 'Inspector General of Police', 'Still IG. Facing resignation/recusal demands from Sen. Kogar, the EFFL and the LPP over conflict of interest; reports that he has stepped back from the public lead are unconfirmed'],
  ['Jackson Kolako', 'Chief of Operations, Monrovia Central Prison', 'NEW — arrested for allegedly aiding suspects'],
  ['Mark Egon Kuiah', 'Former RIA Deputy Director for Operations', 'Still dismissed and uncharged; central to the IB Atlantic IV letter'],
  ['Anthony T. Blaye, Wadell Kwabo, Johnny Bolar Dean, Patrick Doe, Patrick Komasu, Albenigo Janior, Olufemi Briggs, Jamal Robert', 'LNP / NSA officials from the July actions', 'No publicly reported change since July 30–31 — the gap Sen. Konneh is pressing with “charge them or reinstate them”'],
], [2600, 2900, 3860]));
body.push(SPACER());

body.push(H3('IB Atlantic IV — Resolved, Inconclusively'));
body.push(P('Seized by Ivorian security authorities and held at an Ivorian port after evading Liberian pursuit for over a week. Comoros-flagged, 41 years old, declared destination Lomé, Togo. Liberia sought a Sea Shepherd Global vessel to escort it back; the AFL later confirmed possession after a coordinated regional operation. No narcotics have been publicly confirmed aboard. The episode is now cited mainly as evidence of Liberia’s maritime blind spot — a coast guard with no vessel capable of a long-range chase.'));

body.push(H2('What’s Newly Contested'));
body.push(BULLead('Whether the cases can actually be won.', ' This is the new centre of gravity. Two record seizures, roughly 30 defendants across three tracks, a jury tampered with in Margibi, and an RIA indictment that senior litigators say lacks certified forensic analysis. Konneh’s framing has become the consensus test: suspending officials and burning drugs is the easy part.'));
body.push(BULLead('Why the prosecution’s leadership was replaced mid-case.', ' Removing the Justice Minister and Solicitor General on September 2 — two days before a former Vice President’s preliminary examination — has been read three ways: routine institutional strengthening (the government’s account), a response to unproven social-media allegations about Tweh’s vehicle, or a signal about the direction of the prosecution. No official explanation ties it to the drug cases.'));
body.push(BULLead('Selective justice, now with names attached.', ' The opposition’s complaint has moved from “lower-level figures only” to a specific asymmetry: a former Vice President from the previous administration is in Central Prison while the President’s son, named publicly in a video by an alleged cartel figure, has not been invited for questioning. Kogar, the CDC and Rep. Marvin Cole all press this; Boakai Jr. denies wrongdoing. Kogar was expelled from the MDR on September 1 over his criticism.'));
body.push(BULLead('The IG’s position.', ' Coleman disclosed in July that the operation was “sanctioned by state actors at very, very senior level” and that a September 2025 memo had warned the President. Since then the EFFL has demanded his suspension, the LPP has called for him to recuse himself, and Kogar has demanded his resignation — largely on conflict-of-interest grounds arising from police officers being among the accused. He remains in post.'));
body.push(BULLead('The police vehicle fleet.', ' Konneh’s procurement question (~US$1.5M, ten Prados among them, some reportedly registered to private individuals) is unresolved and is the one thread that could connect the drug allegations to documentary evidence either way.'));
body.push(BULLead('Jurisdiction and where any trial happens.', ' Liberia insists prosecution will be domestic. US involvement is investigative support, not a parallel prosecution — and on the current facts (cocaine bound for Europe) US federal statutes likely do not reach the conduct. Extradition of the Croatian and Ukrainian defendants, not American charges, is the realistic international route.'));
body.push(BULLead('LDEA institutional stability.', ' Five leadership teams in 30 months, an OIC suspended over an ethics finding, and a deputy commander now among the RIA indictees. Konneh’s broader argument — that the seizure should be turned into a lasting drug-enforcement system rather than a sequence of firings — has not yet been answered with structural reform.'));

body.push(H2('Corrections and Clarifications to Earlier Entries'));
body.push(BULLead('Duazon valuation.', ' The US$370 million figure used in the July 22–23 entry was an initial estimate; investigators revised it to about US$317 million (some outlets: US$317.68M), for roughly US$336 million across both cases. Both figures are still in circulation.'));
body.push(BULLead('The August 1 entry and the August 5 sentencing are the same seizure.', ' The 3.355 kg / US$181,008 RIA interdiction credited to Col. Sheriff Abdullah is the Quita Dolo Kosso case, which produced the first conviction on August 5, 2026.'));
body.push(BULLead('The RIA defendant list changed on August 27.', ' The five-defendants-plus-GLS line-up from July is superseded by the grand jury’s 11 named and unnamed defendants. Two officials dismissed on July 30–31 (Gbowrah, Jallah) are now defendants; GLS does not appear among the named eleven, and Private Bar Entertainment Center appears instead. Confirm against the indictment itself before publishing.'));
body.push(BULLead('Judicial assignment in Margibi.', ' Judge Victoria Worlobah Duncan handled the Kosso matter through the August 5 sentencing; Judge Roosevelt Z. Willie is the resident judge running the sequestered-jury narcotics trial in Kakata from August 10 onward.'));
body.push(BULLead('A reporting conflict to be aware of.', ' At least one Monrovia outlet has labelled the Kakata sequestered-jury proceeding the “US$317M drug trial” while naming defendants (Toni Obi, Henry Ike) who do not appear on the July 29 Duazon indictment, and dating the tampered jury to the May 2026 term — which predates the July 21 Duazon seizure. The Margibi docket appears to hold more than one narcotics case, and coverage is conflating them. Verify which case any Kakata report actually concerns before relying on it.'));

body.push(H2('Open Questions Going Into September'));
body.push(BUL('Does the September 4 preliminary examination proceed, and does Magistrate Barco find probable cause against Howard-Taylor? Does the Supreme Court take the detention appeal or the habeas petition first?'));
body.push(BUL('Will the new Justice Minister and Solicitor General maintain the same prosecution theory, or reopen charging decisions in either case?'));
body.push(BUL('Do the RIA motions to quash succeed — and can the state produce certified forensic analysis and chain-of-custody records for either seizure?'));
body.push(BUL('Are the July-suspended police and NSA officials charged, or reinstated?'));
body.push(BUL('Is Michael U.S. Browne located? He remains the most consequential fugitive and no arrest has been reported.'));
body.push(BUL('Does anyone above the operational tier — the financiers Coleman referred to as “state actors at very, very senior level”, or officials appointed between 2019 and 2023 — get named?'));
body.push(BUL('Does the Liberia National Police vehicle documentation get published?'));
body.push(BUL('Does anything come of the IB Atlantic IV in Ivorian custody?'));

body.push(H2('For the Record'));
body.push(BUL('All named individuals are presumed innocent unless convicted by a Liberian court. Jewel Howard-Taylor has not been indicted by a grand jury as of September 3, 2026; she is charged and detained pending preliminary examination.'));
body.push(BUL('Allegations against Ministers Sara Beysolow Nyanti and Mamaka Bility originated on a talk programme, not from any charging instrument or official investigative finding. No evidence has been produced publicly and neither has been charged.'));
body.push(BUL('Joseph N. Boakai Jr. has not been charged and denies the allegations. The claim originates from opposition statements and a video attributed to an alleged cartel figure.'));
body.push(BUL('No wrongdoing has been established against Cllr. Oswald Tweh; the vehicle allegation circulated on social media and remains unsubstantiated.'));
body.push(BUL('Values, weights, and defendant lists still vary across Liberian outlets. Where this document notes a conflict, treat it as unresolved rather than settled.'));
body.push(BUL('Next hard date: Friday, September 4, 2026, 10:00 a.m. — Howard-Taylor preliminary examination, Monrovia City Court.'));

/* ================================= ASSEMBLE ================================= */

const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 460, hanging: 260 } } },
      }],
    }],
  },
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22 }, paragraph: { spacing: { line: 276 } } },
      heading1: { run: { font: 'Calibri', size: 32, bold: true, color: '1F3864' } },
      heading2: { run: { font: 'Calibri', size: 26, bold: true, color: '2E5395' } },
      heading3: { run: { font: 'Calibri', size: 23, bold: true, color: '333333' } },
    },
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then(function (buf) {
  fs.writeFileSync(process.argv[2] || 'Liberia-Cocaine-Case-Update.docx', buf);
  console.log('written:', process.argv[2]);
});
