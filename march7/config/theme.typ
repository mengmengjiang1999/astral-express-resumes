// Shared visual tokens. Replace this dictionary to introduce another faction.
#let theme = (
  colors: (
    ink: rgb("30465E"), heading: rgb("38658B"), accent: rgb("A65C84"),
    paper: rgb("FCFCFF"), muted: rgb("65768C"), line: rgb("D5DDEE"),
    blue: rgb("7FBDDC"), ice: rgb("EAF5FC"), pink: rgb("E8B1CC"),
    blush: rgb("FCF0F6"), white: rgb("FFFFFF"),
  ),
  fonts: (body: "Noto Sans SC", latin: "Noto Sans SC"),
  sizes: (body: 10pt, small: 7.8pt, label: 8.5pt, section: 18pt, name: 31pt, roman-name: 9pt, affiliation: 8.3pt, role: 12pt, specialty: 8.5pt, item: 11.2pt, project-title: 12pt, section-number: 18pt, section-english: 8pt, toolkit-body: 9.2pt),
  spacing: (section: 5mm, paragraph: 1.8mm, project: 5.1mm, leading: 0.5em, project-rows: 1.8mm),
  section-banner: (inset-y: 2mm, number-width: 9mm),
  toolkit: (columns: 2, column-gap: 4mm, row-gap: 3mm),
  header: (group-gap: 7mm, identity-gap: 2mm, role-inset: 4mm, summary-gap: 5mm),
  page: (width: 210mm, height: 297mm, inset: 8mm,
    margin: (top: 16mm, bottom: 17mm, left: 18mm, right: 18mm)),
  assets: (train: "assets/express-train.png", path: "assets/preservation.png",
    ticket: "assets/express-ticket-redrawn.png", flower: "assets/march7-flower.png"),
  labels: (brand: "ASTRAL EXPRESS", document: "开拓行动 · 岗位申请", footer: "TRAILBLAZE WITH COMPANIONS"),
)
