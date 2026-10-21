// Decorations follow the measured page height; body content stays in normal flow.
#let at(x, y, body) = place(top + left, dx: x, dy: y, body)
#let decorations(c, height, header-height) = {
 at(0mm, 0mm, rect(width: 80mm, height: header-height, fill: c.header, stroke: none))
 at(0mm, 0mm, rect(width: 0.9mm, height: height, fill: c.red, stroke: none))
 at(3mm, 3mm, rect(width: 74mm, height: height - 6mm, fill: none, stroke: 0.45pt + c.border))
 at(4.2mm, 4.2mm, rect(width: 71.6mm, height: height - 8.4mm, fill: none, stroke: 0.2pt + c.border.transparentize(65%)))
 at(3mm, 10mm, line(end: (7mm, -7mm), stroke: 0.45pt + c.border))
 at(70mm, 3mm, line(end: (7mm, 7mm), stroke: 0.45pt + c.border))
 at(3mm, height - 10mm, line(end: (7mm, 7mm), stroke: 0.45pt + c.border))
 at(70mm, height - 3mm, line(end: (7mm, -7mm), stroke: 0.45pt + c.border))
 at(72.2mm, height - 27mm, image("../assets/express-ticket-redrawn.png", height: 18mm))
}

#let paragraphs(value) = {
 let values = if type(value) == array { value } else { (value,) }
 values.filter(item => item.trim() != "")
}
#let present(value) = paragraphs(value).len() > 0
#let prose(value, c) = {
 for (i, paragraph) in paragraphs(value).enumerate() {
  if i > 0 { v(1.6mm) }
  par(justify: false)[
   #for (j, row) in paragraph.split("\n").enumerate() {
    if j > 0 { linebreak() }
    text(size: 9pt, fill: c.ink, row)
   }
  ]
 }
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

// Short entries remain inline. Lists and longer prose get the full content width.
#let entry(label, value, c) = if present(value) {
 let items = paragraphs(value)
 let stacked = items.len() > 1 or items.any(item => item.contains("\n") or item.clusters().len() > 28)
 block(width: 100%, below: 2mm, breakable: false)[
  #if stacked {
   text(size: 9.5pt, weight: "bold", fill: c.gold, label)
   v(1.5mm)
   prose(value, c)
   v(1.4mm)
   line(length: 100%, stroke: 0.25pt + c.border.transparentize(35%))
  } else {
   grid(columns: (14mm, 1fr), column-gutter: 2mm, align: top,
    text(size: 9.5pt, weight: "bold", fill: c.gold, label),
    [#prose(value, c)
     #v(1.4mm)
     #line(length: 100%, stroke: 0.25pt + c.border.transparentize(35%))],
   )
  }
 ]
}

#let qr-slot(profile, c, asset) = block(
 width: 28mm, height: 28mm, fill: white,
 stroke: 0.5pt + c.border, inset: 2mm,
)[
 #if profile.at("qr_image", default: none) != none {
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
 set text(font: "Noto Sans SC", size: 9pt, fill: c.ink, lang: "zh")
 set par(leading: 0.5em, spacing: 0pt)
 set block(spacing: 0pt)
 let field(key) = profile.at(key, default: "")
 let show-qr = profile.at("show_qr", default: true)
 let header = [
  #grid(columns: (1fr, auto), align: horizon,
   text(size: 6.8pt, tracking: 0.9pt, fill: c.gold)[ASTRAL EXPRESS],
   text(size: 7pt, weight: "bold", fill: c.gold)[同好扩列],
  )
  #v(4mm)
  #grid(columns: (1fr, 24mm), column-gutter: 5mm, align: horizon,
   [#text(size: if profile.nickname.clusters().len() <= 4 { 22pt } else if profile.nickname.clusters().len() <= 6 { 17pt } else { 13pt },
     font: "Noto Serif CJK SC", weight: "bold", profile.nickname)
    #if present(field("intro")) {
     v(3mm)
     text(size: 8.5pt, fill: c.muted, field("intro"))
    }
    #if present(field("location")) {
     v(1.8mm)
     text(size: 8.5pt, fill: c.muted)[坐标　#field("location")]
    }
   ],
   block(stroke: 0.55pt + c.gold, inset: 1mm, fill: c.portrait)[
    #image(asset(profile.at("portrait", default: "assets/stelle-id.png")), width: 22mm, height: 33mm, fit: "contain")
   ],
  )
  #if present(field("tagline")) {
   v(2.5mm)
   text(size: 10.5pt, fill: c.gold, field("tagline"))
  }
 ]
 let personal = (("主坑", "fandoms"), ("我推", "favorites"), ("兴趣", "interests"))
 let social = (("想扩", "looking_for"), ("CP 态度", "cp"), ("日常", "preferences"), ("NG", "boundaries"))
 let contact-details = [
  #if present(field("contact_platform")) or present(field("contact")) {
   if present(field("contact_platform")) {
    text(size: 9.5pt, weight: "bold", fill: c.gold, field("contact_platform"))
    v(1.8mm)
   }
   text(size: 9pt, field("contact"))
  }
  #if present(field("uid")) {
   v(3mm)
   text(size: 8pt, fill: c.muted)[游戏 UID]
   v(1.2mm)
   text(size: 9pt, field("uid"))
  }
 ]
 let body = [
  #header
  #let number = 0
  #if personal.any(item => present(field(item.at(1)))) {
   number += 1
   section("0" + str(number), "个人属性", "喜欢的事物", c)
   for (label, key) in personal { entry(label, field(key), c) }
  }
  #if social.any(item => present(field(item.at(1)))) {
   number += 1
   section("0" + str(number), "同行小约定", "相处 / 边界", c)
   for (label, key) in social { entry(label, field(key), c) }
  }
  #if show-qr or ("contact_platform", "contact", "uid", "contact_note", "event", "message").any(key => present(field(key))) {
   number += 1
   section("0" + str(number), "下一站见", "联系方式", c)
   if show-qr {
    if present(field("contact_platform")) or present(field("contact")) or present(field("uid")) {
     grid(columns: (28mm, 1fr), column-gutter: 4mm, align: horizon,
      qr-slot(profile, c, asset), contact-details)
    } else {
     qr-slot(profile, c, asset)
    }
   } else if present(field("contact_platform")) or present(field("contact")) or present(field("uid")) {
    contact-details
   }
   if present(field("contact_note")) {
    v(2mm)
    text(size: 7.5pt, fill: c.muted, field("contact_note"))
   }
   if present(field("event")) or present(field("message")) {
    v(3mm)
    entry("出没", field("event"), c)
    entry("留言", field("message"), c)
   }
  }
  #v(5mm)
  #line(length: 100%, stroke: 0.4pt + c.gold)
  #if present(field("closing")) {
   v(2mm)
   align(center, text(size: 9pt, fill: c.gold, field("closing")))
  }
 ]
 // Measure once at the final content width; no font shrinking or page clipping.
 context {
  let height = measure(body, width: 65mm).height + 14.5mm
  let header-height = measure(header, width: 65mm).height + 8.5mm
  page(width: 80mm, height: height, margin: (left: 7mm, right: 8mm, top: 7mm, bottom: 7mm),
   fill: c.paper, background: decorations(c, height, header-height), body)
 }
}
