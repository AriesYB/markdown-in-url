# Markdown-in-URL

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deployed-brightgreen) ![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-Deployed-orange) ![Status](https://img.shields.io/badge/Status-Online-success) ![Platform](https://img.shields.io/badge/Platform-Web-lightgrey)

> 通过 URL 链接分享 Markdown 内容，长链分享无需后端服务器，短链接和图床功能可选后端支持

你是否遇到过这种问题，本地编写了Markdown，想快速分享给同事或朋友临时查看，但又想避免使用第三方软件（又卡又需要登录），那么本工具 perfectly 适合你！

[在markdown-in-url中预览本markdown](https://markdown-in-url.pages.dev/?source=https://raw.githubusercontent.com/AriesYB/markdown-in-url/refs/heads/master/README.md)

## 在线使用

- Cloudflare Pages: [https://markdown-in-url.pages.dev/](https://markdown-in-url.pages.dev/)
- GitHub Pages: [https://ariesyb.github.io/markdown-in-url/](https://ariesyb.github.io/markdown-in-url/)

<img src="https://markdown-in-url.pages.dev/img/main_flow.svg" alt="主要流程">

## 核心特点

### 🔗 URL 链接分享

这是本工具最大的特色！将 Markdown 内容编码到 URL 中，生成一个可分享的链接：

- **一键生成**：点击"生成分享链接"按钮即可
- **即开即用**：接收者打开链接即可查看，无需登录或注册
- **长链纯前端**：长链接方式完全在浏览器中处理，无需后端服务器
- **短链后端支持**：短链接白嫖 Cloudflare Workers

### 📸 图片上传功能

支持多种图片上传方式，让 Markdown 编辑更加便捷：

- **粘贴上传**：直接粘贴图片（Ctrl+V）即可上传
- **拖拽上传**：将图片拖入编辑器自动上传
- **公共图床**：白嫖cloudflare
- **Base64 编码**：图片直接嵌入文档（纯前端，适合小图）
- **上传进度**：实时显示上传状态和进度

### 🔗 短链接生成

使用 Cloudflare Workers 生成短链接，解决 URL 长度限制问题：

- **自动生成**：配置 Cloudflare Workers 后自动生成短链接
- **快速访问**：短链接更易分享和记忆
- **本地缓存**：短链在浏览器有缓存，过期继续使用

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

## 技术栈

- **React 19**：UI 框架
- **Vite**：构建工具
- **marked.js**：Markdown 解析
- **mermaid.js**：图表渲染
- **highlight.js**：代码高亮
- **LZString**：数据压缩

## 项目结构

```
markdown-in-url/
├── index.html          # 入口文件
├── public/
│   └── img/
│       ├── icon.svg        # 图标
│       └── main_flow.svg   # 流程图
├── src/
│   ├── App.jsx         # 根组件
│   ├── main.jsx         # 应用入口
│   ├── components/      # 组件目录
│   │   ├── Editor.jsx      # 编辑器组件
│   │   ├── Preview.jsx     # 预览组件
│   │   ├── Autocomplete.jsx # 自动补全组件
│   │   ├── TableOfContents.jsx # 目录组件
│   │   ├── TemplateModal.jsx # 模板弹窗
│   │   └── Toast.jsx       # 提示组件
│   ├── data/           # 数据目录
│   │   ├── autocomplete.js # 自动补全数据
│   │   └── templates.js    # 预设模板
│   ├── hooks/          # 自定义 Hooks
│   │   ├── useDebounce.js  # 防抖 Hook
│   │   ├── useLocalStorage.js # 本地存储 Hook
│   │   ├── useUndoRedo.js  # 撤销重做 Hook
│   │   └── useUploadManager.js # 上传管理 Hook
│   └── utils/          # 工具函数
│       ├── encoding.js    # 编码解码工具
│       ├── imageUpload.js # 图片上传工具
│       ├── cloudflareAPI.js # Cloudflare API
│       ├── exportHelper.js # 导出辅助工具
│       └── secureUpload.js # 安全上传工具
├── package.json        # 项目配置
├── vite.config.js      # Vite 配置
└── README.md           # 使用说明
```

## 注意事项

1. **可用性**：Cloudflare Pages 可在国内可访问，GitHub Pages 国内访问不稳定
2. **功能说明**：
   - 长链分享：纯前端实现，无需任何后端服务
   - 短链接：需要配置 Cloudflare Workers 后端
   - 图床上传：公共图床和自建图床需要后端，Base64 编码为纯前端
3. **URL 长度**：内容过大时建议使用短链接功能（需配置后端）
4. **图片存储**：公共图床有过期时间，重要图片建议使用自建图床或 Base64 编码
5. **安全性**：仅用于临时分享，不要在 URL 中传递敏感信息
6. **浏览器兼容性**：建议使用现代浏览器（Chrome、Firefox、Edge、Safari）

## 本地运行

1. 克隆或下载本项目 `git clone https://github.com/AriesYB/markdown-in-url.git`
2. 安装依赖 `npm install`
3. 启动开发服务器 `npm run dev`
4. 构建生产版本 `npm run build`

## 部署说明

### 纯前端部署（长链分享）

本项目可以直接部署到任何静态托管服务，无需后端服务器：

- **Cloudflare Pages**（推荐）：全球 CDN，国内可访问
- **GitHub Pages**：免费托管，国内访问可能不稳定
- **Vercel**：快速部署，自动 HTTPS
- **Netlify**：简单易用，持续部署

纯前端部署后，长链分享功能完全可用，无需任何后端配置。

### 后端功能部署（可选）

如需使用短链接和图床上传功能，需要额外部署后端服务：

1. **短链接功能**：部署 Cloudflare Workers + KV
2. **图床上传**：配置 Cloudflare R2/S3 或使用公共图床


## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

Copyright (c) 2026 AriesYB
