#import "config/theme.typ": theme
#import "styles/page.typ": resume-page
#import "components/header.typ": header
#import "components/sections.typ": section-heading, toolkit, abilities
#import "components/project.typ": project

// Paths resolve from this entry file, independent of component locations.
#let character = json(sys.inputs.at("character", default: "config/character.json"))
#let asset(path, ..options) = image(path, ..options)
#set document(title: character.name + "｜开拓行动支援岗位简历", author: character.name)
#show: body => resume-page(theme, asset, body)

#header(character, theme, asset)
#section-heading("01", character.sections.stack, theme)
#toolkit(character.stack, theme)
#section-heading("02", character.sections.abilities, theme)
#abilities(character.abilities, theme)
#section-heading("03", character.sections.projects, theme)
#for item in character.projects { project(item, theme) }

#v(1fr)
#line(length: 100%, stroke: 0.5pt + theme.colors.line)
#v(2mm)
#text(size: 8.3pt, fill: theme.colors.muted, character.closing)
