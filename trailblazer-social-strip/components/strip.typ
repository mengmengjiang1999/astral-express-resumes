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
 if value == none { return () }
 let values = if type(value) == array { value } else { (value,) }
 values.filter(item => item.trim() != "")
}
#let present(value) = paragraphs(value).len() > 0

// New fields take precedence, including explicit empty values. Legacy values are
// migrated only when the corresponding new field is absent.
#let legacy-paragraphs(profile, fields) = {
 let result = ()
 for (label, key) in fields {
  for item in paragraphs(profile.at(key, default: "")) {
   result.push(if label == "" { item } else { label + "：" + item })
  }
 }
 result
}
#let normalize-profile(input) = {
 let about = if "about_me" in input { paragraphs(input.about_me) } else {
  legacy-paragraphs(input, (("", "intro"), ("坐标", "location"), ("称呼", "call_me")))
 }
 let other = if "other" in input { paragraphs(input.other) } else {
  legacy-paragraphs(input, (
   ("兴趣", "interests"), ("CP 态度", "cp"), ("想扩", "looking_for"),
   ("日常", "preferences"), ("出没", "event"), ("留言", "message"), ("同担", "same_fans"),
  ))
 }
 let contacts = if "contacts" in input { input.contacts } else { () }
 if not ("contacts" in input) {
  if ("contact_platform", "contact", "contact_note", "show_qr", "qr_image").any(key => key in input) {
   contacts.push((
    id: "legacy-contact", platform: input.at("contact_platform", default: ""),
    account: input.at("contact", default: ""), note: input.at("contact_note", default: ""),
    show_qr: input.at("show_qr", default: input.at("qr_image", default: none) != none),
    qr_image: input.at("qr_image", default: none),
   ))
  }
 }
 (
  nickname: input.nickname, about_me: about, other: other, contacts: contacts,
  tagline: input.at("tagline", default: ""), uid: input.at("uid", default: ""),
  fandoms: input.at("fandoms", default: ""), favorites: input.at("favorites", default: ""),
  boundaries: input.at("boundaries", default: ""),
  portrait: input.at("portrait", default: "assets/stelle-id.png"),
 )
}

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

#let section(number, title, c) = block(
 width: 100%, above: 3mm, below: 2.2mm, sticky: true,
 fill: c.panel, stroke: (left: 1.8pt + c.red), inset: (x: 2mm, y: 1.3mm),
)[
 #grid(columns: (6mm, 1fr), column-gutter: 1.5mm, align: horizon,
  text(size: 11.2pt, weight: "bold", fill: c.gold, number),
  text(size: 11.2pt, weight: "bold", fill: c.ink, title),
 )
]

#let qr-slot(contact, c, asset) = block(
 width: 28mm, height: 28mm, fill: white,
 stroke: 0.5pt + c.border, inset: 1mm,
)[
 #if contact.at("qr_image", default: none) != none {
  image(asset(contact.qr_image), width: 26mm, height: 26mm, fit: "contain")
 } else {
  align(center + horizon)[
   #text(size: 8pt, weight: "bold", fill: rgb("6A6258"))[二维码待替换]
   #v(1.8mm)
   #text(size: 6.8pt, fill: rgb("6A6258"))[放入这一平台的二维码]
  ]
 }
]

#let show-qr(contact) = contact.at("show_qr", default: contact.at("qr_image", default: none) != none)
#let contact-present(contact) = show-qr(contact) or (
 "platform", "account", "note").any(key => present(contact.at(key, default: "")))

// Account IDs can be unbroken Latin strings. Measure graphemes so they wrap
// inside the fixed column without shrinking text or changing the account.
#let account-text(value, c, width: 30.5mm, size: 9pt) = context {
 for (i, row) in value.split("\n").enumerate() {
  if i > 0 { linebreak() }
  let line = ""
  for cluster in row.clusters() {
   let candidate = line + cluster
   if line != "" and measure(text(size: size, candidate)).width > width {
    text(size: size, fill: c.ink, line)
    linebreak()
    line = cluster
   } else {
    line = candidate
   }
  }
  text(size: size, fill: c.ink, line)
 }
}

#let contact-card(contact, c, asset) = block(width: 100%, breakable: false)[
 #if show-qr(contact) {
  qr-slot(contact, c, asset)
  v(2.2mm)
 }
 #if present(contact.at("platform", default: "")) {
  text(size: 9.5pt, weight: "bold", fill: c.gold, contact.platform)
  v(1.4mm)
 }
 #if present(contact.at("account", default: "")) {
  account-text(contact.account, c)
 }
 #if present(contact.at("note", default: "")) {
  v(1.6mm)
  text(size: 8pt, fill: c.muted, contact.note)
 }
]

#let strip(raw-profile, c, asset) = {
 let profile = normalize-profile(raw-profile)
 set document(title: "开拓者 · 漫展扩列条", author: "非官方同人模板")
 set text(font: "Noto Sans SC", size: 9pt, fill: c.ink, lang: "zh")
 set par(leading: 0.5em, spacing: 0pt)
 set block(spacing: 0pt)
 let field(key) = profile.at(key, default: "")
 let header = [
  #grid(columns: (1fr, auto), align: horizon,
   text(size: 6.8pt, tracking: 0.9pt, fill: c.gold)[ASTRAL EXPRESS],
   text(size: 7pt, weight: "bold", fill: c.gold)[开拓者扩列条],
  )
  #v(4mm)
  #grid(columns: (1fr, 24mm), column-gutter: 5mm, align: top,
   [#text(size: if profile.nickname.clusters().len() <= 4 { 22pt } else if profile.nickname.clusters().len() <= 6 { 17pt } else { 13pt },
     font: "Noto Serif CJK SC", weight: "bold", profile.nickname)
    #if present(field("about_me")) {
     v(2.5mm)
     text(size: 9.5pt, weight: "bold", fill: c.gold)[About me]
     v(1.5mm)
     prose(field("about_me"), c)
    }
   ],
   [
    #block(stroke: 0.55pt + c.gold, inset: 1mm, fill: c.portrait)[
     #image(asset(profile.at("portrait", default: "assets/stelle-id.png")), width: 22mm, height: 33mm, fit: "contain")
    ]
    #v(1.5mm)
    #align(center, account-text("UID：" + if present(field("uid")) { field("uid") } else { "__________" }, c, width: 24mm, size: 7pt))
   ],
  )
  #if present(field("tagline")) {
   v(2.5mm)
   text(size: 10.5pt, fill: c.gold, field("tagline"))
  }
 ]
 let sections = (("坑", "fandoms"), ("我推", "favorites"), ("NG", "boundaries"), ("其他", "other"))
 let contacts = profile.contacts.filter(contact => contact-present(contact))
 let body = [
  #header
  #let number = 0
  #for (title, key) in sections {
   if present(field(key)) {
    number += 1
    section("0" + str(number), title, c)
    prose(field(key), c)
   }
  }
  #if contacts.len() > 0 {
   number += 1
   section("0" + str(number), "联系方式", c)
   grid(columns: (1fr, 1fr), column-gutter: 4mm, row-gutter: 4mm, align: top,
    ..contacts.map(contact => contact-card(contact, c, asset)))
  }
  #v(5mm)
  #line(length: 100%, stroke: 0.4pt + c.gold)
  #v(2mm)
  #align(center, text(size: 9pt, fill: c.gold)[愿此行，终抵群星！])
 ]
 // Measure once at the final content width; no font shrinking or page clipping.
 context {
  let height = measure(body, width: 65mm).height + 14.5mm
  let header-height = measure(header, width: 65mm).height + 8.5mm
  page(width: 80mm, height: height, margin: (left: 7mm, right: 8mm, top: 7mm, bottom: 7mm),
   fill: c.paper, background: decorations(c, height, header-height), body)
 }
}
