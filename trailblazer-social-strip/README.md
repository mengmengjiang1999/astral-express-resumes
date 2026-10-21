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
| `about_me`、`location` | 个人属性（可写性格、MBTI 或年龄段）、常驻城市或出没地 |
| `tagline` | 页首邀请短句，默认“下一站，认识你。” |
| `fandoms`、`favorites` | 主坑作品 / 游戏、主推角色 |
| `same_fans`、`looking_for` | 同担接受情况、想认识的同好或一起做的事 |
| `cp`、`boundaries`、`preferences` | CP 态度（嗑哪些、不嗑或拒所有 CP）、其他雷点 / 边界、相处习惯，分别填写 |
| `contact_platform`、`contact` | 联系平台与账号 |
| `uid` | 游戏 UID |
| `contact_note` | 添加好友时的备注要求 |
| `event`、`message` | 相遇漫展 / 摊位、一句自我介绍或现场留言 |
| `closing` | 页脚短句 |
| `portrait` | 头像图片的项目内相对路径 |
| `qr_image` | 联系二维码路径；尚未提供时为 `null` |

默认的“你的昵称”“填写主推角色”等均是模板占位；以“例：”开头的短句只是写法示例，不代表使用者真实资料。昵称处直接填 CN，不再显示主题说明。各行留有细线；将主坑、我推、同担、想扩、CP 态度、雷点、相处、相遇或留言设为 `""`，可保留空白横线用于手写。长内容可自然换行，但建议每项只写一条短句；如果超过一页，构建会拒绝覆盖成品，应精简内容。

### 怎样写得像一张扩列条

先让对方看清“你是谁、喜欢什么、能一起做什么”，再补充必要的相处偏好。以下都是可自行选择或改写的例子，不需要全部照填：

| 位置 | 填写思路与示例 |
| --- | --- |
| 昵称 / 属性 / 坐标 | CN + 两三个自我标签 + 常驻城市；属性可写“慢热 / INFP”，也可以留空 |
| 主坑 / 我推 | 主坑写作品、我推写角色，例如“星穹铁道 / 其他作品”与“开拓者 / 其他角色” |
| 同担 | 独立说明同推同一角色是否可以扩，例如“同担欢迎”或“同担慎扩”；按自己的真实偏好填写 |
| 想扩 | 写可聊、可一起做的事，例如“同坑聊天 / 同城约展”“聊剧情 / 游戏搭子” |
| CP 态度 / 雷点 | 可以写具体嗑的 CP、“不嗑 CP”或“拒所有 CP”，无需一定有喜欢的配对；其他雷点单独填写 |
| 相处 | 写实际的互动习惯，例如“慢热 / 随缘回消息”“可躺列 / 熟后话多”，不必罗列长规则 |
| 留言 / 联系方式 | 留一句邀请、账号或二维码，以及“漫展 + CN”的好友验证备注；游戏 UID 可留空 |

“CP 态度”中的示例是不同选项，使用时选择符合自己的情况，不要整行照填。若不希望接触任何 CP 内容，可以直接写“拒所有 CP”；单写“不嗑 CP”或留空，不会自动表达这一边界。模板不预设使用者嗑 CP，也不预设使用者拒绝所有 CP。

### 内容参考

2026-10-21 查阅公开扩列自介与模板，参考其信息组织方式，未复制他人的姓名、账号、个人经历或完整文案：

- [QooApp：扩列扩列！！！](https://notes.qoo-app.com/note/3531703)：昵称、坐标、主坑、主推、同担接受情况与雷点分别交代，因此增加独立的“同担”一行。
- [微博：扩列条 / 属性表](https://www.weibo.com/6758518172/Po80ayv20)：将我推、CP 偏好、希望结识的人与个人社交习惯分开表达，参考这种区分拆开“CP”和“雷点”。
- [二次元扩列自介条生成器](https://ivanamamiya.github.io/self-intro-template/)：按基础信息、主坑、扩列诉求和边界分区，参考其短句形式，为“想扩”和“相处”提供填写示例。

本模板面向漫展小卡，只保留适合快速浏览的字段，主题感由配色、头像、边框和车票表达。

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
