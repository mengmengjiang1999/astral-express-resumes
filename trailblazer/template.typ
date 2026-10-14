#let ink = rgb("ECE6D9")
#let gold = rgb("C5AA77")
#let muted = rgb("B6B0A5")
#let panel = rgb("302E2A")
#let red = rgb("813D4B")
#let resume(body) = {
 set document(title: "无名客档案 · 星穹列车", author: "非官方同人创作")
 set page(paper: "a4", margin: (x: 17mm, top: 15mm, bottom: 15mm), fill: rgb("242321"),
 background: image("assets/frame.svg", width: 100%, height: 100%),
 footer-descent: 0mm,
 footer: [#line(length: 100%, stroke: 0.5pt + gold)
 #v(2mm)#grid(columns: (1fr, auto), [], text(size: 7pt, fill: gold)[AE — 001　 /　01])
 #v(1.5mm)
 #align(center, text(size: 9pt, fill: gold, font: ("Songti SC", "Noto Serif CJK SC"))[愿此行，终抵群星。])])
 set text(font: ("PingFang SC", "Noto Sans CJK SC", "Arial Unicode MS"), size: 9pt, fill: ink, lang: "zh")
 set par(leading: 0.7em)
 set block(spacing: 0pt)
 body
}
#let section(n, title, en) = {
 v(2mm)
 grid(columns: (9mm, auto, 1fr), gutter: 2mm, align: horizon,
 block(width: 8mm, fill: red, inset: (y: 1mm))[#align(center, text(size: 8pt, fill: ink, n))],
 text(size: 12pt, weight: "bold", title), align(right, text(size: 7pt, fill: gold, en)))
 v(2mm)
 line(length: 100%, stroke: 0.4pt + gold)
 v(1.5mm, weak: false)
}
#let stop(n, title, tag, body) = {
 grid(columns: (11mm, 1fr), gutter: 2mm,
 [#text(fill: gold, size: 15pt, font: "Times New Roman")[#n]
 #v(2mm)#h(2.5mm)#line(end: (0pt, 4mm), stroke: 0.5pt + gold)],
 [#grid(columns: (1fr, auto), align: horizon, text(size: 11pt, weight: "bold", title), text(size: 7pt, fill: gold, tag))
 #v(2mm)#text(size: 9pt, fill: rgb("D6D0C5"))[#body]])
 v(1.5mm, weak: false)
}
#let skill(title, subtitle, body) = block(fill: panel, inset: 2.5mm, stroke: (left: 1.5pt + gold))[
 #text(size: 10pt, weight: "bold", fill: gold)[#title] #h(1mm)#text(size: 7pt, fill: muted)[#subtitle]
 #v(1.5mm)#text(size: 8pt)[#body]
]
