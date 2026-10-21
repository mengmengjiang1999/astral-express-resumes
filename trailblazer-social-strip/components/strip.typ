// Only the border, header wash and edge ticket use independent positioning.
#let at(x, y, body) = place(top + left, dx: x, dy: y, body)
#let decorations(c) = {
 at(0mm, 0mm, rect(width: 80mm, height: 54.5mm, fill: c.header, stroke: none))
 at(0mm, 0mm, rect(width: 0.9mm, height: 180mm, fill: c.red, stroke: none))
 at(3mm, 3mm, rect(width: 74mm, height: 174mm, fill: none, stroke: 0.45pt + c.border))
 at(4.2mm, 4.2mm, rect(width: 71.6mm, height: 171.6mm, fill: none, stroke: 0.2pt + c.border.transparentize(65%)))
 at(3mm, 10mm, line(end: (7mm, -7mm), stroke: 0.45pt + c.border))
 at(70mm, 3mm, line(end: (7mm, 7mm), stroke: 0.45pt + c.border))
 at(3mm, 170mm, line(end: (7mm, 7mm), stroke: 0.45pt + c.border))
 at(70mm, 177mm, line(end: (7mm, -7mm), stroke: 0.45pt + c.border))
 at(72.2mm, 151mm, image("../assets/express-ticket-redrawn.png", height: 20mm))
}

#let section(number, title, hint, c) = block(
 width: 100%, above: 3mm, below: 2.2mm, sticky: true,
 fill: c.panel, stroke: (left: 1.8pt + c.red), inset: (x: 2mm, y: 1.3mm),
)[
 #grid(columns: (6mm, 1fr, auto), column-gutter: 1.5mm, align: horizon,
  text(size: 11.2pt, weight: "bold", fill: c.gold, number),
  text(size: 11.2pt, weight: "bold", fill: c.ink, title),
  text(size: 6.5pt, fill: c.muted, hint),
 )
]

#let entry(label, value, c, label-width: 10mm) = block(below: 1.7mm, breakable: false)[
 #grid(columns: (label-width, 1fr), column-gutter: 2mm, align: top,
  text(size: 9.5pt, weight: "bold", fill: c.gold, label),
  [#text(size: 9pt, fill: c.ink, if value == "" { [#h(1pt)] } else { value })
   #v(1.3mm)
   #line(length: 100%, stroke: 0.25pt + c.border.transparentize(35%))],
 )
]

#let qr-slot(profile, c, asset) = block(
 width: 28mm, height: 28mm, fill: white,
 stroke: 0.5pt + c.border, inset: 2mm,
)[
 #if profile.qr_image != none {
  image(asset(profile.qr_image), width: 24mm, height: 24mm, fit: "contain")
 } else {
  align(center + horizon)[
   #text(size: 8.5pt, weight: "bold", fill: rgb("6A6258"))[二维码待替换]
   #v(1.8mm)
   #text(size: 7pt, fill: rgb("6A6258"))[放入你的联系二维码]
  ]
 }
]

#let strip(profile, c, asset) = {
 set document(title: "开拓者 · 漫展扩列条", author: "非官方同人模板")
 set page(width: 80mm, height: 180mm, margin: (x: 7mm, top: 7mm, bottom: 7mm),
  fill: c.paper, background: decorations(c))
 set text(font: "Noto Sans SC", size: 9pt, fill: c.ink, lang: "zh")
 set par(leading: 0.45em, spacing: 0pt)
 set block(spacing: 0pt)
 grid(columns: (1fr, auto), align: horizon,
  text(size: 6.8pt, tracking: 0.9pt, fill: c.gold)[ASTRAL EXPRESS],
  text(size: 7pt, weight: "bold", fill: c.gold)[同好扩列],
 )
 v(4mm)
 grid(columns: (1fr, 24mm), column-gutter: 5mm, align: horizon,
  [#text(size: if profile.nickname.clusters().len() <= 4 { 22pt } else if profile.nickname.clusters().len() <= 6 { 17pt } else { 13pt },
    font: "Noto Serif CJK SC", weight: "bold", profile.nickname)
   #v(3mm)
   #text(size: 8.5pt, fill: c.muted)[属性　#profile.about_me]
   #v(1.8mm)
   #text(size: 8.5pt, fill: c.muted)[坐标　#profile.location]
  ],
  block(stroke: 0.55pt + c.gold, inset: 1mm, fill: c.portrait)[
   #image(asset(profile.portrait), width: 22mm, height: 33mm, fit: "contain")
  ],
 )
 v(2.5mm)
 text(size: 10.5pt, fill: c.gold, profile.tagline)

 section("01", "共同航向", "主坑 / 我推", c)
 entry("主坑", profile.fandoms, c)
 entry("我推", profile.favorites, c)
 entry("同担", profile.same_fans, c)
 entry("想扩", profile.looking_for, c)

 section("02", "同行小约定", "相处偏好", c)
 entry("CP", profile.cp, c)
 entry("雷点", profile.boundaries, c)
 entry("相处", profile.preferences, c)

 section("03", "下一站见", "联系方式", c)
 grid(columns: (28mm, 1fr), column-gutter: 4mm, align: horizon,
  qr-slot(profile, c, asset),
  [#text(size: 9.5pt, weight: "bold", fill: c.gold, profile.contact_platform)
   #v(1.8mm)
   #text(size: 9pt, profile.contact)
   #v(3mm)
   #text(size: 8pt, fill: c.muted)[游戏 UID]
   #v(1.2mm)
   #text(size: 9pt, profile.uid)
  ],
 )
 v(2mm)
 text(size: 7.5pt, fill: c.muted, profile.contact_note)
 v(4mm)
 block(width: 62mm)[
  #entry("相遇", profile.event, c)
  #entry("留言", profile.message, c)
 ]
 v(1fr)
 line(length: 100%, stroke: 0.4pt + c.gold)
 v(2mm)
 align(center, text(size: 9pt, fill: c.gold, profile.closing))
}
