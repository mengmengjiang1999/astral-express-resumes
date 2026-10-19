#let ink = rgb("ECE6D9")
#let gold = rgb("C5AA77")
#let muted = rgb("B6B0A5")
#let panel = rgb("302E2A")
#let red = rgb("813D4B")
// Keep the established palette; adjust hierarchy and rhythm from these tokens.
#let sizes = (body: 9.2pt, item: 11pt, project: 11.5pt, section: 16pt, small: 7.5pt)
#let spacing = (section: 3.5mm, section-content: 2.2mm, project: 3.5mm)
#let resume(body) = {
 set document(title: "无名客档案 · 星穹列车", author: "非官方同人创作")
 set page(paper: "a4", margin: (x: 17mm, top: 15mm, bottom: 15mm), fill: rgb("242321"),
 background: image("assets/frame.svg", width: 100%, height: 100%),
 footer-descent: 0mm,
 footer: [#line(length: 100%, stroke: 0.5pt + gold)
 #v(2.5mm)#grid(columns: (1fr, auto), align: horizon,
  text(size: 9pt, fill: gold, font: ("Songti SC", "Noto Serif CJK SC"))[愿此行，终抵群星。],
  text(size: 7pt, fill: gold)[AE — 001　 /　01])])
 set text(font: ("PingFang SC", "Noto Sans CJK SC", "Arial Unicode MS"), size: sizes.body, fill: ink, lang: "zh")
 set par(leading: 0.45em, spacing: 0pt)
 set block(spacing: 0pt)
 body
}
#let section(n, title, en) = {
 block(width: 100%, above: spacing.section, below: spacing.section-content,
 sticky: true, fill: panel, stroke: (left: 2.5pt + red),
 inset: (x: 3mm, y: 1.8mm))[
  #grid(columns: (10mm, 1fr, auto), column-gutter: 2mm, align: horizon,
   text(size: sizes.section, weight: "bold", fill: gold, n),
   text(size: sizes.section, weight: "bold", title),
   text(size: sizes.small, tracking: 0.5pt, fill: gold, en))
 ]
}
#let stop(n, title, tag, duty, outcome) = block(breakable: false, below: spacing.project)[
 #grid(columns: (9mm, 1fr), column-gutter: 2mm,
  text(fill: gold, size: sizes.project, weight: "bold", n),
  [#grid(columns: (1fr, auto), column-gutter: 2mm, align: horizon,
    text(size: sizes.project, weight: "bold", title),
    text(size: sizes.small, fill: muted, tag))
   #v(1.3mm)
   #grid(columns: (16mm, 1fr), column-gutter: 1.8mm, row-gutter: 1.2mm,
    text(size: sizes.body, fill: muted)[项目职责], text(size: sizes.body, fill: rgb("D6D0C5"), duty),
    text(size: sizes.body, fill: muted)[项目成果], text(size: sizes.body, fill: rgb("D6D0C5"), outcome))
  ])
]
#let path-row(title, body) = (
 text(size: sizes.item, weight: "bold", fill: gold, title),
 text(size: sizes.body, body),
)
#let fact(title, en, body) = [
 #text(size: 10.5pt, weight: "bold", fill: gold, title)
 #h(1.5mm)#text(size: 6.5pt, fill: muted, en)
 #v(1.5mm)#text(size: sizes.body, body)
]
#let skill(title, subtitle, body) = grid.cell(
 inset: (x: 2.5mm, y: 2mm), stroke: (top: 0.8pt + gold),
)[
 #text(size: sizes.item, weight: "bold", fill: gold, title)
 #h(1.5mm)#text(size: 8pt, fill: muted, subtitle)
 #v(1.3mm)#text(size: sizes.body, body)
]
#let header(uid) = {
 grid(columns: (1fr, 31mm), column-gutter: 7mm, align: horizon,
  [#grid(columns: (54mm, 1fr), column-gutter: 6mm, align: horizon,
   [#text(size: 34pt, weight: "bold", font: ("Songti SC", "Noto Serif CJK SC"))[开拓者]
    #v(3mm)
    #text(size: 10pt, fill: gold)[UID: #if uid == "" [#box(width: 30mm)[#line(length: 100%, stroke: 0.4pt + gold)]] else [#uid]]
    #v(2.5mm)#text(size: 9pt, fill: muted)[星穹列车 · 无名客]
   ],
   block(stroke: (left: 1.5pt + red), inset: (left: 4mm, y: 1mm))[
    #text(size: 9pt, fill: muted)[求职意向]
    #v(2.5mm)#text(size: 12.5pt, weight: "bold")[项目执行 / 危机应对]
    #v(2.5mm)#text(size: 9pt, fill: gold)[具备跨世界行动经验]
   ])],
  block(stroke: 0.7pt + gold, inset: 1.5mm, fill: rgb("49423A"))[
   #image("assets/stelle-id.png", width: 27mm, height: 40.5mm, fit: "contain")
  ])
}
