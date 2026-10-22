# 星穹列车在线编辑器

选择开拓者简历或漫展扩列条，在网页中修改资料、切换深浅配色、上传头像或二维码，预览并下载 PDF / PNG。

- 简历保持单页 A4。内容超过一页会提示精简，禁止导出截断的简历。
- 扩列条宽 80 mm，高度随内容伸缩。About me 在头像左侧，下方依次为「坑 / 我推 / NG / 其他 / 联系方式」，空栏目自动隐藏并连续编号；CP 内容按需写在我推、NG 或其他中，也可以完全不写。
- 联系方式可自由添加 QQ、微信、小红书、B站或自定义平台，最多 12 项。每项独立填写平台、账号、备注、上传二维码，支持删除及上移/下移；关闭二维码区域即可只留文字。图片跟随对应组件，不受排序影响。
- 预览与 PDF 由同一次 Typst 排版生成；PNG 从同一预览导出，像素尺寸按 300 dpi 计算。过长图片超出浏览器画布限制时仍可下载完整 PDF。
- “保存资料”会把当前模板的文字与上传图片下载成 JSON；“导入资料”恢复该文件。新资料版本为 v2，仍支持导入旧 v1 资料：旧介绍和城市迁入 About me，旧补充字段迁入其他，原联系方式与二维码迁入独立组件。网页不自动保存，不使用账号、后端服务或统计脚本。
- 文字与图片只传入本机 Web Worker，不上传服务器。首次使用需要加载约 41 MB 中文字体与排版引擎；所有资源从当前站点加载，不依赖第三方字体 CDN。

## 本地开发

需要 Node.js 22.12+。

```sh
cd web
npm ci
npm run dev
```

```sh
BASE_PATH=/astral-express-resumes/ npm run build
npm run preview
```

访问终端显示的地址下 `/astral-express-resumes/`。`npm run build` 自动从仓库原模板复制必要源码、JSON、图片和字体到临时 `public/`，无需维护另一套模板。`public/`、`dist/`、`node_modules/` 不提交。

## GitHub Pages

仓库 Settings → Pages → Build and deployment 选择 **GitHub Actions**。`.github/workflows/pages.yml` 在相关文件推送到 `main` 后构建并发布 `web/dist`，也支持手动运行。

站点地址：<https://mengmengjiang1999.github.io/astral-express-resumes/>。

如果复制到其他仓库，修改工作流中的 `BASE_PATH` 为对应的仓库子路径；用户主页仓库使用 `/`。全部模板、字体、图片和 WASM 路径均基于该目录。

## 实现与验证

`src/compiler-worker.js` 加载原 Typst 源码，映射 JSON 与图片到内存文件系统，生成同一文档的 SVG 和 PDF。浏览器编译器与渲染器锁定为 `0.8.0-rc3`（Typst 0.15.0）。简历通过各自 `config/profile.json` 编辑，扩列条使用已有配置接口。

`src/main.js` 管理每种模板独立的资料、图片与当前生成版本。修改内容立即禁用旧成品下载；只有当前版本成功排版才重新启用。上传仅接受可解码的 PNG / JPG，单张最大 5 MB、当前模板图片合计最大 20 MB。导入资料文件最大 30 MB。

浏览器测试默认通过本机 Google Chrome 运行：

```sh
npm run build
# 测试会自动启动生产预览服务
npm test
```

字体及其许可证位于原模板 `trailblazer-social-strip/assets/fonts/`。本项目为非官方同人创作，素材说明见仓库各模板 README。
