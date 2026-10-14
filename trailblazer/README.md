# 星穹列车 · 开拓者求职简历

暖炭灰、暗酒红与旧金色单页 Typst 模板。名称为开拓者，UID 位于名称下方，证件照采用用户提供的图片，按原始 2:3 比例展示。

内容以游戏主线为基础改写为求职主题：求职意向、项目职责、项目成果及专业能力。属非官方同人二创，含空间站至二相乐园的主线剧情节选；不代表现实任职经历。

## 编辑
- main.typ：修改内容；顶部 `#let uid = ""` 的引号内填写 UID。
- template.typ：配色、字体、组件布局。
- assets/stelle-id.png：当前证件照（用户提供）。
- assets/frame.svg：原创边框。

本地编译：`typst compile main.typ stelle-cv.pdf`
网页端上传两个 typ 文件及 assets 文件夹。字体默认 PingFang SC / Songti SC，可替换为 Noto CJK；换字体后检查分页。

历史图片保留在 assets 中但未使用：stelle.png 来源为 Mar-7th/StarRailRes，stelle-front.jpg 来源为 The Nerd Stash 的游戏截图。角色素材版权归原权利人。

新增经历参考：
- 翁法罗斯：https://www.hoyoverse.com/en-us/news/160640
- 二相乐园：发行方 4.1 新闻稿回顾的 4.0 阶段成果，https://prtimes.jp/main/html/rd/p/000000396.000096124.html
二相乐园条目只描述参赛前期的阶段成果，不宣称整段故事已完成。

车票装饰：assets/express-ticket-redrawn.png，通过内置 imagegen 按用户证件照胸前车票重绘，非游戏原始导出素材。提示词：提取胸前细长金色车票，保留分叉轨道纹样与红色底边，正面端正、透明背景、高清赛璐璐风格，不添加文字。

专业能力同时保留五种已实装命途（毁灭·物理、存护·火、同谐·虚数、记忆·冰、欢愉·雷）与四项通用职业能力。欢愉实装依据：https://sr.mihoyo.com/news/163630?lang=en-us&nav=news&type=news

## 第 06 项更新（2026-10-12）
更新至 4.6 千星城主线，替换此前仅至击败火花的早期经历。将已发生的撤离与调查写为阶段成果，不把钓猎行动写成已经彻底解决贪饕。
参考：
- 官方版本与章节：https://hsr.hoyoverse.com/zh-cn/news/166468
- 撤离与领航职责：https://wiki.biligame.com/sr/挥掷千星的筹码
- 生研院调查：https://wiki.biligame.com/sr/知识、沉默、擦肩而过
- 钓猎行动：https://wiki.biligame.com/sr/命路歧图/月升之前，与兽共舞
