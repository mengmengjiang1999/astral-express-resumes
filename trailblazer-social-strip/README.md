# 开拓者 · 漫展扩列条模板

沿用开拓者简历的金色、酒红、双线斜角边框与列车票装饰，提供深色和浅色两版。**宽度固定为 80 mm，高度随内容自动伸缩**。正文为 9 pt，栏目标题为 11.2 pt。正文区域没有卡片底色；只有栏目标题保留分区色，二维码保留白色底。

页首在昵称下提供 **About me** 自由介绍，右侧头像与昵称顶端对齐，头像下方留有独立 UID 区域。尾部固定为“愿此行，终抵群星！”，不可通过资料修改。正文依次为 **坑、我推、NG、其他、联系方式**；没有填写的栏目自动隐藏，编号连续。每个平台的二维码、账号和备注组成一项独立联系方式。

## 成品

![深浅两版对照](output/images/trailblazer-strip-comparison.png)

| 配色 | 单张 PDF | 预览 | 高清 PNG |
| --- | --- | --- | --- |
| 深色 | [下载](output/pdf/trailblazer-strip-dark.pdf) | [查看](output/images/trailblazer-strip-dark-preview.png) | [600 dpi](output/images/trailblazer-strip-dark-600dpi.png) |
| 浅色 | [下载](output/pdf/trailblazer-strip-light.pdf) | [查看](output/images/trailblazer-strip-light-preview.png) | [600 dpi](output/images/trailblazer-strip-light-600dpi.png) |

默认资料另有 [A4 裁切拼版](output/pdf/trailblazer-strip-a4-print.pdf)：两页分别为深色与浅色，每页两张，带裁切标记。按 **100% / 实际大小** 打印，不选“适合页面”。实际尺寸记录在 [manifest.json](output/manifest.json) 中。

## 长短内容如何适配

![简短版与标准版](output/images/trailblazer-strip-lengths.png)

- **短版**：[config/examples/short.json](config/examples/short.json)，短自介、喜欢的作品与角色，1 项纯文字联系方式。
- **常规版**：[config/profile.json](config/profile.json)，五个栏目齐全，QQ、微信各有独立二维码占位。

简短版与标准版使用同一份排版；标准版填写更多内容时同样会自动变长，不需要手动选择尺寸。About me 在头像左侧自然换行并向下扩展；正文段落使用完整内容宽度。联系方式为双列，每格约 30.5 mm，奇数项的最后一格靠左。空段落与空栏目不保留空白，边框和车票随页面高度调整。

长条 PDF 和 PNG 保持完整内容。**高度超过 267 mm 时，不生成 A4 拼版**，构建会提示并移除该输出目录旧的 A4 文件，避免误印。可用长图在线分享，或把单张 PDF 按实际尺寸交给支持长条纸张的打印服务。单张 PDF 是净尺寸、无出血；专业印刷所需出血按印厂要求另行处理。

## 填写资料

编辑 `config/profile.json`，一次构建同时更新两种配色。除 `nickname` 外，文本字段可以省略或留空。

| 字段 | 用途 |
| --- | --- |
| `nickname` | 昵称 / CN，必填，最多 24 个字符；长昵称可换行 |
| `about_me` | 昵称下的自由介绍，可写城市、性格、状态与互动习惯，无需重复填写 CN |
| `tagline` | 页首短句 |
| `fandoms` | “坑”：喜欢的游戏、动漫、小说、电影或圈子 |
| `favorites` | “我推”：喜欢的角色、组合或人物 |
| `boundaries` | “NG”：希望避开的话题或行为 |
| `other` | “其他”：作品以外的兴趣、日常、约展、留言等自由补充 |
| `contacts` | 联系方式数组，支持 0 至 12 项；顺序即展示顺序 |
| `uid` | 头像下方的游戏 UID；留空时保留填写横线 |
| `portrait` | 头像的项目内相对路径；省略时使用 `assets/stelle-id.png` |

`about_me`、`fandoms`、`favorites`、`boundaries`、`other` 支持字符串或字符串数组，每项是一段。字符串中也可以用 `\n` 手动换行。以下两种写法都可以：

```json
"fandoms": "星穹铁道 / 喜欢的动漫 / 最近在读的小说"
```

```json
"about_me": [
  "填写自己的常驻城市、性格或近期状态。",
  "这里可以继续介绍日常习惯、喜欢的话题和想认识的朋友。"
]
```

想删除一栏，可省略对应键，或使用 `""`、`[]`。不设置独立的城市、兴趣、CP、想扩或日常小条目；这些内容可自行归入 About me、NG 或其他，不需要填满模板。

### 多个联系方式与二维码

每项使用独立的 `id`，长度为 1 至 64 个字符，只允许 ASCII 字母、数字、下划线和连字符，不能重复。`id` 是识别标记，不会印在成品上。

```json
"contacts": [
  {
    "id": "qq",
    "platform": "QQ",
    "account": "填写 QQ 账号",
    "note": "加好友请备注 CN",
    "show_qr": true,
    "qr_image": "assets/qq-qr.png"
  },
  {
    "id": "wechat",
    "platform": "微信",
    "account": "填写微信号",
    "note": "只展示文字也可以",
    "show_qr": false,
    "qr_image": null
  }
]
```

`platform`、`account`、`note` 都是可省略的字符串。不填写 `show_qr` 时，仅在 `qr_image` 有图片路径时显示二维码，否则为纯文字项。设为 `false` 时只隐藏这一项的二维码，平台、账号和备注仍显示；显式设为 `true` 且图片省略或为 `null` 时使用明确标注的待替换框，不是假二维码。`contacts: []` 隐藏整个联系方式栏目；关闭二维码且所有文字都为空的单项也隐藏。没有空格的长账号会在格内换行，字符完整保留。

二维码图像以 **26 × 26 mm** 等比放入 **28 × 28 mm** 白底框，额外保留 1 mm 白边。请使用保留完整静区的二维码，打印后实际扫码确认。将每个平台的完整二维码分别放进 `assets/`，填写各自路径即可。素材路径必须位于本项目内且文件存在，不能填写网址或项目外路径。

标准版与简短版的昵称占位为“你的CN”，其余使用同一套虚构扩列资料，方便直接预览填写效果。城市、喜好和互动习惯均为编写示例，没有复制参考中的私人资料。联系方式明确标注为示例账号，二维码保留待替换框；使用前请换成自己的资料。个人填写版可在本地导出，无需把真实账号和二维码提交到公开仓库。

### 旧版配置迁移

旧版 CLI 配置继续可以使用。模板会在**对应新键不存在时**进行以下转换；如果新键已存在，就以新键为准，包括空字符串、空数组。

| 旧字段 | 新位置 |
| --- | --- |
| `intro`、`location`、`call_me` | `about_me`，城市和称呼保留说明文字 |
| `interests`、`cp`、`looking_for`、`preferences`、`event`、`message`、`same_fans` | `other`，分段并保留原文 |
| `contact_platform`、`contact`、`contact_note`、`show_qr`、`qr_image` | `contacts` 中的一项 |
| `uid` | 头像下方的 UID 区域 |

`nickname`、`tagline`、`fandoms`、`favorites`、`boundaries`、`portrait` 保持同名。旧 `closing` 字段会被忽略，尾部始终使用固定短句。建议迁移后删除旧字段，避免产生两套资料。`contacts: []` 表示主动清空联系方式，旧的顶层联系方式不会重新出现。构建器会检查字段类型、重复 ID、未知键和素材路径，并核对所有实际显示的正文和联系文字；ID 与图片路径不会被当成正文。

## 构建

需要 Python 3.9+、Poppler（提供 `pdftoppm`）。首次安装依赖需联网，字体和素材均随项目保存，后续编译无需远程 Typst 包。

```sh
cd trailblazer-social-strip
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/build.py
```

Windows 激活命令为 `.venv\Scripts\activate`；macOS 可通过 `brew install poppler` 安装 Poppler。构建脚本从自身位置解析项目目录，不依赖当前工作目录。

导出不同长度时，为每份资料选择自己的输出目录，避免覆盖默认成品：

```sh
python scripts/build.py --profile config/examples/short.json --output-dir output/short
```

每次构建都会生成两版 PDF、180 dpi 预览、600 dpi 图片、配色对照图和 `manifest.json`。可放入 A4 时另生成拼版。发布输出前会检查单页、80 mm 宽以及全部非空可见文字是否完整。简短版对照图另保存为 `output/images/trailblazer-strip-short-comparison.png`，两种示例总览为 `trailblazer-strip-lengths.png`。

也可以用 Typst CLI 单独编译，页面高度同样自动适配：

```sh
typst compile --root . --font-path assets/fonts --ignore-system-fonts --input theme=dark main.typ output/pdf/trailblazer-strip-dark.pdf
typst compile --root . --font-path assets/fonts --ignore-system-fonts --input theme=light main.typ output/pdf/trailblazer-strip-light.pdf
```

在线编辑时上传整个目录并保留层级，入口为 `main.typ`，无输入时默认深色。颜色位于 `config/themes.typ`，排版和旧配置转换位于 `components/strip.typ`。

## 内容与素材

- 正文固定为“坑、我推、NG、其他、联系方式”五类，无小字副标题；空栏目隐藏并连续编号。
- 肖像和透明车票直接复用已确认的开拓者简历素材，图片像素未改变；来源说明见[开拓者简历](../trailblazer/README.md)。
- 保留暖炭灰 / 暖白、金色、酒红两套配色，以及双线、斜角和边缘车票。页首短句默认使用“愿此行，终抵群星”。
- 随包使用 Noto Sans SC 和 Noto Serif CJK SC Bold，保留 `assets/fonts/` 中的 SIL OFL 许可。
- 本项目为非官方同人模板，角色与游戏素材版权归原权利人所有。
