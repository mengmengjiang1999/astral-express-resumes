#import "template.typ": *

// 内容集中在 JSON；可用 --input profile=config/your-profile.json 切换资料。
#let profile = json(sys.inputs.at("profile", default: "config/profile.json"))
#assert(profile.name.trim() != "", message: "name 不能为空")
#assert(profile.name.clusters().len() <= 10, message: "name 最多 10 个字符")
#show: body => resume(profile, body)

#grid(columns: (1fr, auto), text(size: 8pt, tracking: 2pt, fill: gold)[ASTRAL EXPRESS], text(size: 7pt, fill: gold)[求职简历 / CURRICULUM VITAE])
#v(3.5mm)
// 依用户提供的胸前车票参考重绘，小尺寸边框装饰。
#place(top + left, dx: 178mm, dy: 237mm)[
 #image("assets/express-ticket-redrawn.png", height: 22mm)
]
#header(profile)

// 空数组不留标题或空白占位。其余字段按原有字号自然排版。
#if profile.facts.len() > 0 {
 v(3mm)
 block(stroke: (top: 0.6pt + gold, bottom: 0.6pt + gold), inset: (y: 2.5mm))[
  #grid(columns: (1fr,) * calc.min(profile.facts.len(), 3), column-gutter: 4mm, row-gutter: 2.5mm,
   ..profile.facts.map(item => fact(item.title, item.en, item.body)))
 ]
}

#let section-number = 0
#if profile.paths.len() > 0 {
 section-number += 1
 section(numbering("01", section-number), profile.sections.paths.title, profile.sections.paths.en)
 block(inset: 2.5mm)[
  #grid(columns: (28mm, 1fr), column-gutter: 3mm, row-gutter: 1.6mm, align: horizon,
   ..profile.paths.map(item => path-row(item.title, item.body)).flatten())
 ]
}
#if profile.skills.len() > 0 {
 section-number += 1
 section(numbering("01", section-number), profile.sections.skills.title, profile.sections.skills.en)
 grid(columns: (1fr, 1fr), column-gutter: 4mm, row-gutter: 2.5mm,
  ..profile.skills.map(item => skill(item.title, item.subtitle, item.body)))
}
#if profile.projects.len() > 0 {
 section-number += 1
 section(numbering("01", section-number), profile.sections.projects.title, profile.sections.projects.en)
 for (index, item) in profile.projects.enumerate() {
  stop(numbering("01", index + 1), item.title, item.tag, item.duty, item.outcome)
 }
}
