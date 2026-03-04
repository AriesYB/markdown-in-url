# Markdown-in-URL

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deployed-brightgreen) ![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-Deployed-orange) ![Status](https://img.shields.io/badge/Status-Online-success) ![Platform](https://img.shields.io/badge/Platform-Web-lightgrey)

> 通过 URL 链接分享 Markdown 内容，无需后端服务器

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
- **纯前端实现**：无需后端服务器，数据完全在浏览器中处理

### 📸 图片上传功能

支持多种图片上传方式，让 Markdown 编辑更加便捷：

- **粘贴上传**：直接粘贴图片（Ctrl+V）即可上传
- **拖拽上传**：将图片拖入编辑器自动上传
- **多种图床**：支持公共图床、自建 Cloudflare R2/S3
- **Base64 编码**：图片直接嵌入文档（适合小图）
- **上传进度**：实时显示上传状态和进度

### 🔗 短链接生成

使用 Cloudflare Workers 生成短链接，解决 URL 长度限制问题：

- **自动生成**：配置 Cloudflare 后自动生成短链接
- **永久存储**：内容存储在 Cloudflare KV 中
- **快速访问**：短链接更易分享和记忆

## URL 分享原理

### 参数格式

- 链接传递数据

```
domain + /markdown-in-url/?data=xxx
```

- 拉取markdown文件并渲染

```
domain + /markdown-in-url/?source=xxx.md
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

## 技术栈

- **React 19**：UI 框架
- **Vite**：构建工具
- **marked.js**：Markdown 解析
- **mermaid.js**：图表渲染
- **highlight.js**：代码高亮
- **LZString**：数据压缩

## 图片上传功能

### 支持的上传方式

1. **粘贴上传** - 在编辑器中按 Ctrl+V 粘贴剪贴板中的图片
2. **拖拽上传** - 将图片文件拖入编辑器区域
3. **点击上传** - 点击工具栏的图片按钮选择文件

### 图床配置

#### 公共图床（默认）
- 提供的临时图床服务
- 带过期时间和安全验证
- 适合临时分享和测试

#### 自建图床
支持配置你自己的 Cloudflare R2 或 AWS S3：

1. **Cloudflare R2**（推荐）
   - 无出站流量费用
   - 全球 CDN 加速
   - 配置简单

2. **AWS S3**
   - 稳定可靠
   - 全球可用
   - 需配置访问密钥

#### Base64 编码
- 图片直接嵌入 Markdown 文档
- 无需外部图床
- 适合小图片和图标
- 不推荐用于大图（会导致文档过大）

### 安全机制

公共图床实现了多层安全防护，防止被盗刷：

- **请求签名验证** - 每个上传请求都带有唯一 HMAC 签名
- **频率限制** - 限制每分钟上传次数（默认 10 次/分钟）
- **站点标识验证** - 验证请求来源
- **时间戳验证** - 防止重放攻击（5分钟有效期）

配置指南请参考 [图床配置指南](docs/SETUP_GUIDE.md)，详细的安全配置说明请参考 [安全配置文档](docs/SECURITY.md)。

## 短链接功能

### 功能说明

当 Markdown 内容较大时，URL 编码后的链接可能过长，不便分享。短链接功能通过 Cloudflare Workers 将内容存储到 KV 数据库，生成简短的分享链接。

### 配置步骤

1. **准备 Cloudflare 账号**
   - 注册 Cloudflare 账号（免费即可）
   - 创建 Workers 和 KV 数据库

2. **配置 Workers**
   - 部署提供的 Workers 脚本
   - 绑定 KV 命名空间

3. **在应用中配置**
   - 打开应用设置
   - 输入你的 Workers 域名
   - 保存配置

4. **生成短链接**
   - 点击"生成分享链接"
   - 系统自动生成短链接
   - 复制分享即可

### 优势

- **无长度限制** - 支持任意大小的 Markdown 内容
- **永久存储** - 内容存储在 Cloudflare KV 中
- **快速访问** - 全球 CDN 加速
- **完全免费** - Cloudflare 免费套餐足够使用

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
2. **URL 长度**：内容过大时建议使用短链接功能
3. **图片存储**：公共图床有过期时间，重要图片建议使用自建图床
4. **安全性**：仅用于临时分享，不要在 URL 中传递敏感信息
5. **浏览器兼容性**：建议使用现代浏览器（Chrome、Firefox、Edge、Safari）

## 本地运行

1. 克隆或下载本项目 `git clone https://github.com/AriesYB/markdown-in-url.git`
2. 安装依赖 `npm install`
3. 启动开发服务器 `npm run dev`
4. 构建生产版本 `npm run build`

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

Copyright (c) 2026 AriesYB
