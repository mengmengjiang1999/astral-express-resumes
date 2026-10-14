#import "portrait.typ": portrait

#let header(character, theme, asset) = {
  let c = theme.colors
  grid(columns: (1fr, auto), align: horizon,
    [#text(size: 8pt, weight: "bold", tracking: 1.5pt, theme.labels.brand)
      #h(2mm)#text(size: 7.5pt, fill: c.muted, "星穹列车")],
    text(size: 7.5pt, fill: c.muted, theme.labels.document),
  )
  v(2.5mm)
  line(length: 100%, stroke: 0.8pt + c.pink)
  v(5mm)
  grid(columns: (1fr, 32mm), column-gutter: 9mm,
    [
      #grid(columns: (1fr, 1.1fr), column-gutter: theme.header.group-gap,
        [
          #text(size: theme.sizes.name, weight: "bold", fill: c.heading, character.name)
          #v(theme.header.identity-gap)
          #text(size: theme.sizes.roman-name, tracking: 1pt, fill: c.muted, character.roman_name)
          #v(theme.header.identity-gap)
          #text(size: theme.sizes.affiliation, fill: c.muted, character.affiliation)
        ],
        block(stroke: (left: 0.8pt + c.pink), inset: (left: theme.header.role-inset, top: 1mm, bottom: 1mm))[
          #text(size: theme.sizes.label, fill: c.muted, "应聘岗位")
          #v(3mm)
          #text(size: theme.sizes.role, weight: "bold", fill: c.heading, character.role)
          #v(3mm)
          #text(size: theme.sizes.specialty, fill: c.muted, character.specialty)
        ],
      )
      #v(theme.header.summary-gap)
      #character.summary
    ],
    [
      #block(stroke: 0.8pt + c.pink, inset: 1mm,
        portrait(character, asset))
    ],
  )
}
