// Non-destructive viewport: keep the supplied source image unchanged.
// Crop coordinates are source pixels, stored with the character content.
#let portrait(character, asset, width: 30mm, height: 40mm) = {
  let crop = character.at("portrait_crop", default: none)
  if crop == none {
    asset(character.portrait, width: width, height: height, fit: "cover")
  } else {
    assert(crop.width > 0 and crop.height > 0, message: "Portrait crop must have positive dimensions")
    assert(crop.x >= 0 and crop.y >= 0 and crop.x + crop.width <= crop.source_width and crop.y + crop.height <= crop.source_height,
      message: "Portrait crop must lie inside its source image")
    let scale = calc.max(width / crop.width, height / crop.height)
    let dx = -crop.x * scale + (width - crop.width * scale) / 2
    let dy = -crop.y * scale + (height - crop.height * scale) / 2
    box(width: width, height: height, clip: true)[
      #place(top + left, dx: dx, dy: dy,
        asset(character.portrait, width: crop.source_width * scale,
          height: crop.source_height * scale))
    ]
  }
}
