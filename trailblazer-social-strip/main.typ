#import "config/themes.typ": themes
#import "components/strip.typ": strip
#let theme-name = sys.inputs.at("theme", default: "dark")
#assert(theme-name in ("dark", "light"), message: "theme must be dark or light")
#let profile = json(sys.inputs.at("profile", default: "config/profile.json"))
#assert(profile.nickname.clusters().len() <= 24, message: "昵称请控制在 24 个字符以内")
#let asset(path) = "/" + path
#strip(profile, themes.at(theme-name), asset)
