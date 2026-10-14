// Each project is one unbreakable flow block; never position body text by y.
#let project(item, theme) = block(above: 0pt, below: theme.spacing.project, breakable: false)[
  #grid(columns: (8mm, 1fr), column-gutter: 2mm,
    text(size: 11pt, weight: "bold", fill: theme.colors.accent, item.id),
    [
      #grid(columns: (1fr, auto), align: horizon,
        text(size: theme.sizes.project-title, weight: "bold", item.title),
        text(size: theme.sizes.small, fill: theme.colors.muted, item.role),
      )
      #v(1.8mm)
      #grid(columns: (9mm, 1fr), column-gutter: 1.3mm, row-gutter: theme.spacing.project-rows,
        text(size: theme.sizes.label, fill: theme.colors.muted, "职责"), item.duty,
        text(size: theme.sizes.label, fill: theme.colors.muted, "成果"), item.outcome,
      )
    ],
  )
]
