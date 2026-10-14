#import "template.typ": *
#show: resume

// 在引号中填写你的 UID；留空时显示填写横线。
#let uid = ""
#grid(columns: (1fr, auto), text(size: 8pt, tracking: 2pt, fill: gold)[ASTRAL EXPRESS], text(size: 7pt, fill: gold)[求职简历 / CURRICULUM VITAE])
#v(5mm)
// 依用户提供的胸前车票参考重绘，小尺寸边框装饰。
#place(top + left, dx: 178mm, dy: 237mm)[
 #image("assets/express-ticket-redrawn.png", height: 22mm)
]
#grid(columns: (1fr, 34mm), gutter: 8mm, align: horizon,
 [#text(size: 38pt, weight: "bold", font: ("Songti SC", "Noto Serif CJK SC"))[开拓者]
 #v(2mm)#text(size: 13pt, fill: gold)[UID: #if uid == "" [#box(width: 44mm)[#line(length: 100%, stroke: 0.4pt + gold)]] else [#uid]]
 #v(5mm)#block(fill: red, inset: (x: 3mm, y: 1.5mm))[#text(size: 9pt)[求职意向 · 项目执行 / 危机应对]]
 #v(2mm)#text(size: 8pt, fill: muted)[星穹列车 · 无名客　 /　具备跨世界行动经验]],
 block(stroke: 0.7pt + gold, inset: 1.5mm, fill: rgb("49423A"))[
 #image("assets/stelle-id.png", width: 27mm, height: 40.5mm, fit: "cover")
 ])
#v(5mm)
#block(stroke: (top: 0.6pt + gold, bottom: 0.6pt + gold), inset: (y: 3mm))[
 #grid(columns: (1fr, 1fr, 1fr),
 [#text(size: 6.5pt, fill: muted)[EXPERIENCE / 项目背景] #v(1mm)跨区域危机处理],
 [#text(size: 6.5pt, fill: muted)[AFFILIATION / 所属] #v(1mm)星穹列车 · 列车组],
 [#text(size: 6.5pt, fill: muted)[STRENGTH / 核心优势] #v(1mm)#text(fill: gold)[执行 · 调查 · 协作]])
]

#section("01", "技术栈", "COMBAT PATHS")
#block(fill: panel, inset: 2mm)[
 #set par(spacing: 0pt, leading: 0.35em)
 #grid(columns: (27mm, 1fr), column-gutter: 3mm, row-gutter: 1.2mm,
  text(size: 8.5pt, weight: "bold", fill: gold)[毁灭 · 物理], text(size: 8pt)[以球棒实施单体与扩散打击，承担正面突破任务。],
  text(size: 8.5pt, weight: "bold", fill: gold)[存护 · 火], text(size: 8pt)[以炎枪吸引火力、提供护盾，保护团队行动空间。],
  text(size: 8.5pt, weight: "bold", fill: gold)[同谐 · 虚数], text(size: 8pt)[提高击破特攻，协助队友造成超击破伤害。],
  text(size: 8.5pt, weight: "bold", fill: gold)[记忆 · 冰], text(size: 8pt)[召唤忆灵迷迷，提供行动提前与真实伤害支援。],
  text(size: 8.5pt, weight: "bold", fill: gold)[欢愉 · 雷], text(size: 8pt)[协助队友施放欢愉技，参与欢愉体系协同输出。],
 )
]
#section("02", "专业能力", "CORE COMPETENCIES")
#grid(columns: (1fr, 1fr), column-gutter: 5mm, row-gutter: 2mm,
 [#set par(spacing: 0pt, leading: 0.35em)
 #text(size: 8.5pt, weight: "bold", fill: gold)[现场执行 · 应变 / 抗压]
 #v(0.8mm)#text(size: 8pt)[适应陌生环境与突发变化；能在高风险任务中承担突破、守护和协同支援职责。]],
 [#set par(spacing: 0pt, leading: 0.35em)
 #text(size: 8.5pt, weight: "bold", fill: gold)[调查分析 · 线索 / 判断]
 #v(0.8mm)#text(size: 8pt)[通过实地探索、访谈与信息比对推进调查，在不完整信息下逐步明确问题。]],
 [#set par(spacing: 0pt, leading: 0.35em)
 #text(size: 8.5pt, weight: "bold", fill: gold)[沟通协调 · 跨阵营 / 合作]
 #v(0.8mm)#text(size: 8pt)[理解不同群体的立场与需求，寻找共同目标，推动临时伙伴形成行动合力。]],
 [#set par(spacing: 0pt, leading: 0.35em)
 #text(size: 8.5pt, weight: "bold", fill: gold)[学习适应 · 成长 / 责任]
 #v(0.8mm)#text(size: 8pt)[在旅途中掌握不同命途的能力，并根据任务调整角色；重视承诺与团队成果。]],
)
#section("03", "项目经历", "PROJECT EXPERIENCE")
#stop("01", "空间站入侵应急处置", "空间站「黑塔」 / 应急执行", [
*项目职责：* 配合空间站与列车组应对反物质军团入侵，在突发战斗中快速适应现场环境。\
*项目成果：* 击败末日兽，完成首次高风险协同行动，维护黑塔空间站安全。
])
#stop("02", "贝洛伯格星核危机处理", "雅利洛-VI / 调查与协调", [
*项目职责：* 调查星核引发的寒潮与裂界侵蚀，协调当地各方应对城市生存危机。\
*项目成果：* 协助封印星核，推动贝洛伯格地表城区与地下居民区恢复往来。
])
#stop("03", "罗浮异常事件联合应对", "仙舟「罗浮」 / 联合作战", [
*项目职责：* 随列车组追查药王秘传与建木异变，配合仙舟伙伴开展调查及现场行动。\
*项目成果：* 与景元、丹恒等共同迎战幻胧，协助化解危机，巩固列车与仙舟的合作关系。
])
#stop("04", "匹诺康尼梦境危机处置", "匹诺康尼 / 复杂问题解决", [
*项目职责：* 追踪钟表匠遗产线索，整合多方信息，识别梦境异常及背后的控制机制。\
*项目成果：* 承接米哈伊尔的意志，与伙伴共同打破秩序之梦，为梦中众人争取醒来的选择。
])

#stop("05", "翁法罗斯逐火行动与危机应对", "翁法罗斯 / 多方协作", [
*项目职责：* 与黄金裔同行，调查逐火之旅及轮回背后的真相，参与应对铁墓威胁。\
*项目成果：* 配合列车组与银河联军开展内外协同，参与铁墓决战，推进共同作战目标。
])
#stop("06", "二相乐园危机应对", "二相乐园 / 应急协调", [
*项目职责：* 应对归寂引发的危机，与列车组及当地伙伴协同行动，推进现场救援与风险处置。\
*项目成果：* 在兽蜕苏醒、乐园面临威胁时承接领航职责，协同列车组搭载避难民众撤离。
])
