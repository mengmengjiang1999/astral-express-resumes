# 开拓者 · 漫展扩列条模板

沿用开拓者简历的金色、酒红、双线斜角边框与列车票装饰，提供深色和浅色两版。成品尺寸 **80 × 180 mm**，竖向长条；两版共用同一份资料和排版，所有内容区均不填底色，仅章节标题带分区。

## 成品

![深浅两版对照](output/images/trailblazer-strip-comparison.png)

| 配色 | 单张 PDF | 预览 | 高清 PNG |
| --- | --- | --- | --- |
| 深色 | [下载](output/pdf/trailblazer-strip-dark.pdf) | [查看](output/images/trailblazer-strip-dark-preview.png) | [600 dpi](output/images/trailblazer-strip-dark-600dpi.png) |
| 浅色 | [下载](output/pdf/trailblazer-strip-light.pdf) | [查看](output/images/trailblazer-strip-light-preview.png) | [600 dpi](output/images/trailblazer-strip-light-600dpi.png) |

[A4 裁切拼版](output/pdf/trailblazer-strip-a4-print.pdf)：两页分别为深色与浅色，每页放置两张同色扩列条，带裁切标记。按 **100% / 实际大小** 打印，不选“适合页面”。单张 PDF 为净尺寸、无出血；拼版用于普通打印后裁切。专业印刷如需出血，按印厂要求另行处理。

## 填写资料

编辑 `config/profile.json`，构建一次即可更新两种配色。

| 字段 | 用途 |
| --- | --- |
| `nickname` | 昵称 / CN，最多 8 个字符 |
| `call_me`、`location` | 希望怎样称呼、常驻城市或出没地 |
| `tagline` | 页首邀请短句，默认“下一站，认识你。” |
| `favorites`、`fandoms`、`looking_for` | 主推角色、同坑作品、希望认识的同好 |
| `cp`、`preferences` | CP 偏好 / 雷点、相处习惯 |
| `contact_platform`、`contact` | 联系平台与账号 |
| `uid` | 游戏 UID |
| `contact_note` | 添加好友时的备注要求 |
| `event`、`message` | 相遇漫展 / 摊位、一句自我介绍或现场留言 |
| `closing` | 页脚短句 |
| `portrait` | 头像图片的项目内相对路径 |
| `qr_image` | 联系二维码路径；尚未提供时为 `null` |

默认的“你的昵称”“填写主推角色”等均是模板占位，不代表使用者真实资料。各行留有细线；将主推、同坑、想扩、CP / 雷点、相处、相遇或留言设为 `""`，可保留空白横线用于手写。长内容可自然换行，但建议每项只写一条短句；如果超过一页，构建会拒绝覆盖成品，应精简内容。

二维码区域是明确标注的待替换框，不是可扫描的假码。使用时将完整二维码图放入 `assets/`，例如 `assets/contact-qr.png`，然后设置：

```json
"qr_image": "assets/contact-qr.png"
```

二维码展示区为 28 × 28 mm 白底框，图像在其中以 24 × 24 mm 等比显示，并保留额外白边；请使用包含完整静区的原始二维码，不裁去自身白边，打印后用手机实际扫码确认。公开发布模板时保留默认占位；个人填写版可本地导出，不必将真实账号与二维码提交到公开仓库。

## 构建

需要 Python 3.9+，首次安装依赖需联网；字体和素材均随项目保存，后续编译无需远程 Typst 包。

```sh
cd trailblazer-social-strip
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
# 安装 Poppler 后，生成两版 PDF、预览、600 dpi 图及 A4 拼版
python scripts/build.py
```

Windows 激活命令为 `.venv\Scripts\activate`。Poppler 需提供 `pdftoppm`；macOS 可通过 `brew install poppler` 安装。脚本从自身位置解析项目目录，不依赖当前工作目录。

也可以用 Typst CLI 单独编译：

```sh
typst compile --root . --font-path assets/fonts --ignore-system-fonts --input theme=dark main.typ output/pdf/trailblazer-strip-dark.pdf
typst compile --root . --font-path assets/fonts --ignore-system-fonts --input theme=light main.typ output/pdf/trailblazer-strip-light.pdf
```

在线编辑时上传整个目录并保留层级，入口为 `main.typ`；无输入时默认深色。在线编辑器也可直接将入口中的默认 `"dark"` 改为 `"light"`。常规调整只需修改 `config/profile.json`；颜色位于 `config/themes.typ`，版式位于 `components/strip.typ`。

## 素材与字体

- 肖像和透明车票直接复制自仓库中已确认的开拓者简历，文件像素未改变；照片等比展示，车票放在页面右侧边缘。
- 车票是参考角色胸前装饰重绘的素材，不是游戏原始导出文件；来源说明见[开拓者简历](../trailblazer/README.md)。
- 原简历的双线与斜角边框语言适配为 80 × 180 mm 长条，保留暖炭灰 / 暖白、金色和酒红的两套配色。
- “下一站，认识你”“共同航向”“同行小约定”“下一站见”为本模板创作文案，不标注为游戏角色原台词。
- 使用随包 Noto Sans SC 和 Noto Serif CJK SC Bold，保留 `assets/fonts/` 中的 SIL OFL 许可；不依赖系统中文字体。
- 本项目为非官方同人模板，角色与游戏素材版权归原权利人所有。
