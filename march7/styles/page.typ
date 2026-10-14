// Only page furniture is absolutely positioned. It never reserves body space.
#let decorations(theme, asset) = {
  let c = theme.colors
  place(top + left, dx: 8mm, dy: 8mm,
    rect(width: 194mm, height: 281mm, stroke: 0.8pt + c.blue))
  place(top + left, dx: 9.2mm, dy: 9.2mm,
    rect(width: 191.6mm, height: 278.6mm, stroke: 0.35pt + c.pink))
  place(top + left, dx: 8mm, dy: 8mm,
    rect(width: 1.5mm, height: 44mm, fill: c.blue, stroke: none))
  place(top + right, dx: -8mm, dy: 8mm,
    rect(width: 26mm, height: 1.5mm, fill: c.pink, stroke: none))
  place(bottom + left, dx: 8mm, dy: -8mm,
    rect(width: 26mm, height: 1.5mm, fill: c.pink, stroke: none))
  // Corner ornaments stay outside the body's 18 mm horizontal inset.
  place(top + left, dx: 2.5mm, dy: 2.5mm,
    asset(theme.assets.flower, width: 13mm))
  place(top + right, dx: -3mm, dy: 4mm,
    asset(theme.assets.ticket, height: 24mm))
  place(bottom + left, dx: 3mm, dy: -4mm,
    asset(theme.assets.ticket, height: 24mm))
  place(bottom + right, dx: -2.5mm, dy: -2.5mm,
    asset(theme.assets.flower, width: 13mm))
}

#let resume-page(theme, asset, body) = {
  set page(width: theme.page.width, height: theme.page.height,
    margin: theme.page.margin, fill: theme.colors.paper,
    background: decorations(theme, asset))
  set text(font: theme.fonts.body, size: theme.sizes.body,
    fill: theme.colors.ink, lang: "zh", region: "CN")
  set par(leading: theme.spacing.leading, spacing: theme.spacing.paragraph, justify: false)
  body
}
