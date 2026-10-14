# 三月七 · 星穹列车岗位申请

一页 A4 角色求职简历。正文与姓名均为可编辑文本；正面证件照直接使用用户拼图右上角的原始像素，仅在左下角文字及其抗锯齿边缘的局部蒙版内合成 imagegen 生成的衣料修补素材，保存为 `assets/march7-portrait-clean.png`。已核对蒙版外像素差异为零，原始拼图保留不变。按用户要求删除 UID，技术栈包含长夜月人格的记忆命途能力。目标岗位是本次求职创作设定，不是游戏正式职称。

## 文件结构

```text
main.typ                      排版入口与内容组装
config/character.json         角色资料、章节名、全部正文与图片路径
config/theme.typ              阵营主题、字号、间距、纸张与素材配置
components/header.typ         姓名、求职方向和证件照
components/portrait.typ       原图证件照视口与可选裁切配置
components/sections.typ       章节标题、技术栈、专业能力
components/project.typ        单条项目经历（职责一句、成果一句）
styles/page.typ               公共页面规则与独立定位的边框装饰
assets/                       肖像、原作参考与原作装饰
assets/express-ticket-redrawn.png  开拓者简历模板同款金色列车票素材
assets/march7-flower.png       按原版角色花饰重绘的透明装饰
assets/reference/             未改写的原版立绘参考
docs/flower-prompt.txt         花饰来源、处理性质和完整提示词
assets/fonts/                 Noto Sans SC 全字库及 SIL OFL 许可证
scripts/build.py              编译、单页及文本完整性检查、可选 PNG 渲染
docs/SOURCES.md                情节依据、改写边界、素材来源
docs/portrait-prompt.txt       正面肖像生成提示词与工具记录
docs/QA.md                    本次成品检查记录
output/pdf/                   单页 PDF 与渲染预览
```

## 推荐构建方式

需要 Python 3.9 或以上。首次安装依赖需要联网；以后使用随包字体离线编译，不使用任何远程 Typst 包。

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/build.py
```

Windows 激活虚拟环境使用 `.venv\Scripts\activate`。构建脚本从自身位置解析根目录，不依赖 shell 当前目录。默认成品位于 `output/pdf/march7-resume.pdf`。编译器和 pypdf 已锁定版本。

安装 Poppler 后可生成检查图：

```sh
python scripts/build.py --preview
```

也可使用 Typst CLI 0.15.0：

```sh
typst compile --root . --font-path assets/fonts --ignore-system-fonts main.typ output/pdf/march7-resume.pdf
```

CLI 直接编译不执行项目内的单页与文本检查；修改内容后建议用 Python 构建脚本。在线 Typst 编辑器中上传整个目录，保留层级，选择 `main.typ` 作为入口，并确保随包字体已识别。

## 换角色与日常编辑

1. 修改 `config/character.json` 中的 `name`、`roman_name`、阵营、岗位及正文。
2. 替换 `portrait` 指向的图片，建议为 3:4 正面肩部肖像；所有素材路径均相对于项目根目录，不填写本机绝对路径。若使用整张证件照，删除 `portrait_crop` 字段即可；若从拼图中取图，在该字段填写原图像素尺寸 `source_width/source_height` 与选区 `x/y/width/height`。当前使用去字后的独立证件照，无 `portrait_crop` 字段，按比例居中填入 30 × 40 mm 框；`portrait_source` 记录原始拼图及右上角选区，仅供追溯。
3. 每条项目只保留一条 `duty` 和一条 `outcome`，分别写具体风险与个人行动、实际结果与团队边界；使用简历式省略主语的表述，不写「我」，以队员、导师、地区代表等必要角色称谓替代接洽人物姓名。不要把同伴、主角或组织的成果全部写给角色。
4. 若换阵营，修改 `config/theme.typ` 的配色与 `assets`，不需要修改正文组件。更长的标题可在主题中适度调整字号。
5. 复制角色 JSON 后可独立构建：`python scripts/build.py --character config/another-character.json --output output/pdf/another-character.pdf`。
6. 重新构建并检查 PNG；脚本在超过一页时拒绝覆盖成品，优先精简内容，再调整主题间距，不建议将正文缩小到 9pt 以下。

页首采用横向分组：左侧为姓名、英文名和阵营身份，中间为应聘岗位与专长，右侧为证件照；简介位于左侧两组信息下方。`header.group-gap/identity-gap/role-inset/summary-gap` 控制组间距离、身份组内间距、岗位分隔线内边距与简介上方留白；`sizes.roman-name/affiliation/role/specialty` 控制相应字号。布局使用自然排版网格，更换文字后无需调整绝对坐标。

三个主章节采用全宽浅蓝标题带与粉色侧线分区。主题中的 `sizes.section` 控制主标题（18pt），`sizes.project-title` 控制项目标题（12pt），`sizes.item` 控制技术与能力小标题（11.2pt），`sizes.body` 控制正文（10pt），`sizes.toolkit-body` 控制技术卡片说明（9.2pt）；`sizes.section-number` 和 `sizes.section-english` 分别控制章节编号（18pt）与英文副标题（8pt），`section-banner.inset-y` 控制标题条上下留白（2mm），`section-banner.number-width` 控制编号栏宽度（9mm）。修改时应保持主标题大于内部标题、内部标题大于对应正文。

技术栈当前为两列四项，列数与横纵间距由主题的 `toolkit` 配置控制；内容数量变化时自动换行。项目标题下方不显示地点副标题；JSON 中的 `location` 仅作编辑资料保留。项目数由数组决定，当前为五项；`spacing.section/project/leading/project-rows` 控制章节、项目、正文行距与职责成果间距，一页可容纳的文字有限。正文全部进入自然排版流，项目块不跨页；只有边框、页角色条、车票和四瓣花使用独立定位。页尾弹性留白为内容维护预留空间，不是用固定坐标放置段落。

当前主题以三月七的冰蓝、樱粉为印象色：`heading` 控制蓝色标题，`accent` 控制深粉编号，`ice/blush` 控制技术卡片底色，`blue/pink` 控制双线页框与卡片顶线。装饰通过主题 `assets.ticket/flower` 的相对路径加载；四瓣花 PNG 按原版立绘的白色四瓣、青蓝外缘、粉色内纹和白色圆心重绘，不按主题自动改色；替换时请同时核对 `assets/reference` 中的原版立绘。车票直接复用开拓者简历模板的透明 PNG，保留金色票身、分叉轨道纹样与红色底边；原模板注明它是依游戏胸前车票重绘的素材，并非游戏原始导出文件。四角位置与尺寸集中在 `styles/page.typ` 的 `decorations` 函数，独立于正文排版。

新增角色需要重新核对剧情，构建脚本只能检查结构、页数和文字完整性，无法判断故事事实或自动替代视觉审阅。

## 版本与素材

项目经历包括黑塔空间站救援、贝洛伯格联络、仙舟初花习剑录、翁法罗斯同伴防护，以及二相乐园危机期间在千星城整理公司部门立场的事例；技术栈按用户设定将长夜月人格的记忆命途能力纳入三月七整体履历，包括忆灵召唤、队伍忆灵强化与积累忆质后的冰属性群攻。保留原版三月七外观，不声称是截至当前版本的全量履历。习剑项目选用剑斗取胜路线，不合并互斥分支；这些编辑依据仅保留在说明文件中，简历页面不包含模板说明、创作声明或分支备注。

星穹列车是所属组织，无名客是身份，存护是原版战斗命途，两者不混用。材料中的角色、游戏图片归原权利人所有；本项目是非官方角色创作。字体按随包 SIL OFL 许可证分发。

去字素材：`assets/march7-portrait-clean.png`；本次完整提示词见 `docs/portrait-cleanup-prompt.txt`。

如需复现局部去字，安装 Node.js 的 `sharp` 包并运行 `node scripts/restore-original-portrait.cjs`；修补素材与蒙版位于 `assets/reference`，逐像素检查记录见 `docs/portrait-pixel-check.json`。普通 PDF 构建无需 Node.js。
