// Section banners remain in document flow; only the page border is positioned.
#let section-heading(number, section, theme) = block(
  width: 100%, above: theme.spacing.section, below: 3mm, sticky: true,
  fill: theme.colors.ice, stroke: (left: 2.5pt + theme.colors.pink),
  inset: (left: 3mm, right: 3mm, top: theme.section-banner.inset-y, bottom: theme.section-banner.inset-y),
)[
  #grid(columns: (theme.section-banner.number-width, 1fr, auto), align: horizon, column-gutter: 2mm,
    text(size: theme.sizes.section-number, fill: theme.colors.accent, weight: "bold", number),
    text(size: theme.sizes.section, fill: theme.colors.heading, weight: "bold", section.title),
    text(size: theme.sizes.section-english, tracking: 0.8pt, fill: theme.colors.muted, section.english),
  )
]

#let toolkit(items, theme) = grid(
  columns: (1fr,) * theme.toolkit.columns,
  column-gutter: theme.toolkit.column-gap, row-gutter: theme.toolkit.row-gap,
  ..items.enumerate().map(pair => {
    let (index, item) = pair
    let blue-card = calc.rem(index, 2) == 0
    grid.cell(inset: (top: 2.8mm, bottom: 2.8mm, left: 3mm, right: 3mm),
    fill: if blue-card { theme.colors.ice } else { theme.colors.blush },
    stroke: (top: 1.2pt + if blue-card { theme.colors.blue } else { theme.colors.pink }))[
    #text(weight: "bold", size: theme.sizes.item, item.name)
    #v(1.8mm)
    #text(size: theme.sizes.toolkit-body, item.detail)
    ]
  }),
)

#let abilities(items, theme) = {
  for item in items {
    block(above: 0pt, below: 2.8mm, breakable: false)[
      #grid(columns: (21mm, 1fr), column-gutter: 2mm,
        text(size: theme.sizes.item, weight: "bold", fill: theme.colors.heading, item.name),
        item.detail,
      )
    ]
  }
}
