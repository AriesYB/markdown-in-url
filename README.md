# markdown-in-url

> 通过 URL 链接分享 Markdown 内容，无需后端服务器

你是否遇到过这种问题，本地编写了Markdown，想快速分享给同事或朋友临时查看，但又想避免使用第三方软件（又卡又需要登录），那么本工具 perfectly 适合你！

## 在线使用

- Cloudflare Pages: [https://markdown-in-url.pages.dev/](https://markdown-in-url.pages.dev/)
- GitHub Pages: [https://ariesyb.github.io/markdown-in-url/](https://ariesyb.github.io/markdown-in-url/)

## 核心特点

### 🔗 URL 链接分享

这是本工具最大的特色！将 Markdown 内容编码到 URL 中，生成一个可分享的链接：

- **一键生成**：点击"生成分享链接"按钮即可
- **即开即用**：接收者打开链接即可查看，无需登录或注册
- **纯前端实现**：无需后端服务器，数据完全在浏览器中处理

### 功能

- 👁️ **在线预览**：左侧编辑 Markdown，右侧实时预览渲染结果
- 🎨 **Mermaid 图表**：完整支持各种 Mermaid 图表类型
- 💻 **代码高亮**：支持多种编程语言语法高亮
- 🌙 **主题切换**：支持深色/浅色主题
- 📋 **预设模板**：提供丰富的 Mermaid 图表模板
- 💾 **本地保存**：自动保存到浏览器本地存储
- 📄 **导出功能**：支持导出 HTML 和 PDF

## 本地运行

1. 克隆或下载本项目 `git clone https://github.com/AriesYB/markdown-in-url`
2. 直接用浏览器打开 `index.html` 文件

## URL 分享原理

### 参数格式

```
https://ariesyb.github.io/markdown-in-url/?data=<compressed_base64_data>
```

### 数据编码流程

1. **LZString 压缩**：使用专为 URL 优化的压缩方法，压缩率约 60-80%
2. **URL 安全编码**：压缩结果直接为 URL 安全字符，无需额外编码

### 压缩效果

| 内容大小 | 原始字符数 | 压缩后字符数 | 压缩率 |
| -------- | ---------- | ------------ | ------ |
| 小文档   | 500        | 180          | 64%    |
| 中文档   | 2000       | 520          | 74%    |
| 大文档   | 10000      | 2200         | 78%    |

### URL 长度限制

- 浏览器 URL 限制约 2000-8000 字符
- 使用优化的 LZString 压缩后，通常可支持 15KB-60KB 的 Markdown 内容
- 超大文件建议使用其他方式（如文件上传）

## 技术栈

- **HTML5**：页面结构
- **CSS3**：样式设计
- **JavaScript (ES6+)**：核心逻辑
- **marked.js**：Markdown 解析
- **mermaid.js**：图表渲染
- **highlight.js**：代码高亮
- **LZString**：数据压缩

## 项目结构

```
markdown-in-url/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   └── app.js          # 核心逻辑
├── templates/
│   └── examples.js     # 预设模板
└── README.md           # 使用说明
```

## 注意事项

1. **CDN 可用性**：确保 CDN 服务在国内可访问，或使用国内镜像
2. **URL 长度**：内容过大时 URL 可能超出浏览器限制
3. **安全性**：仅用于临时分享，不要在 URL 中传递敏感信息
4. **浏览器兼容性**：建议使用现代浏览器（Chrome、Firefox、Edge、Safari）

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

Copyright (c) 2026 AriesYB
