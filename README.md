# Markdown 在线预览工具

一个支持 Mermaid 图表的 Markdown 在线编辑器和预览工具，可通过 URL 参数分享内容。

## 功能特点

- 📝 **在线编辑**：左侧编辑 Markdown，右侧实时预览
- 👁️ **实时预览**：输入即渲染，无需手动刷新
- 🔗 **URL 分享**：生成包含内容的分享链接，方便他人查看
- 🎨 **Mermaid 支持**：完整支持各种 Mermaid 图表类型
- 💻 **代码高亮**：支持多种编程语言语法高亮
- 🌙 **主题切换**：支持深色/浅色主题
- 📋 **预设模板**：提供丰富的 Mermaid 图表模板
- 💾 **本地保存**：自动保存到浏览器本地存储
- 📄 **导出功能**：支持导出 HTML 和 PDF

## 在线使用

直接访问部署地址即可使用：

- GitHub Pages: `https://ariesyb.github.io/markdown-preview/`
- Gitee Pages: `https://ariesyb.gitee.io/markdown-preview/`

## 本地运行

1. 克隆或下载本项目
2. 直接用浏览器打开 `index.html` 文件

## 使用方法

### 基本使用

1. 在左侧编辑器输入 Markdown 内容
2. 右侧实时预览渲染结果
3. 点击"生成分享链接"按钮
4. 链接自动复制到剪贴板
5. 分享链接给他人，打开即可查看

### 快捷键

- `Ctrl + S`：保存到本地存储
- `Ctrl + Enter`：刷新预览

### Mermaid 图表

在 Markdown 中使用以下语法创建图表：

```markdown
\`\`\`mermaid
graph TD
A[开始] --> B[结束]
\`\`\`
```

支持的图表类型：

- 流程图 (graph)
- 时序图 (sequenceDiagram)
- 甘特图 (gantt)
- 状态图 (stateDiagram)
- 类图 (classDiagram)
- ER图 (erDiagram)
- 思维导图 (mindmap)
- 饼图 (pie)
- Git图 (gitGraph)
- 用户旅程图 (journey)

### 预设模板

点击右上角的"模板"按钮，可以加载各种 Mermaid 图表示例模板。

## URL 参数说明

### 参数格式

```
https://ariesyb.github.io/markdown-preview/?data=<compressed_base64_data>
```

### 数据编码

数据经过以下编码流程：

1. LZString 压缩（压缩率约 50-70%）
2. Base64 编码
3. URL 安全编码（替换 +/ 为 -\_）

### 压缩效果

| 内容大小 | 原始字符数 | 压缩后字符数 | 压缩率 |
| -------- | ---------- | ------------ | ------ |
| 小文档   | 500        | 280          | 58%    |
| 中文档   | 2000       | 850          | 68%    |
| 大文档   | 10000      | 3800         | 71%    |

### URL 长度限制

- 浏览器 URL 限制约 2000-8000 字符
- 使用 LZString 压缩后，通常可支持 10KB-50KB 的 Markdown 内容
- 超大文件建议使用其他方式（如文件上传）

## 部署指南

### GitHub Pages 部署

1. 创建 GitHub 仓库
2. 将项目文件推送到仓库
3. 在仓库设置中启用 Pages：
   - 进入 `Settings` → `Pages`
   - 选择 `Source` 为 `main` 分支
   - 点击 `Save`
4. 等待部署完成，访问生成的 URL

```bash
# 初始化仓库
git init
git add .
git commit -m "Initial commit"
git branch -M main

# 添加远程仓库
git remote add origin https://github.com/AriesYB/markdown-preview.git

# 推送代码
git push -u origin main
```

### Gitee Pages 部署

1. 创建 Gitee 仓库
2. 将项目文件推送到仓库
3. 在仓库设置中启用 Pages：
   - 进入 `服务` → `Gitee Pages`
   - 点击 `启动`
4. 等待部署完成，访问生成的 URL

```bash
# 添加 Gitee 远程仓库
git remote add gitee https://gitee.com/AriesYB/markdown-preview.git

# 推送到 Gitee
git push gitee main
```

## 书签脚本

创建一个书签，名称设为"Markdown 预览"，URL 为：

```javascript
javascript: (function () {
  const text = window.getSelection().toString() || prompt('输入 Markdown:');
  if (text) {
    const compressed = LZString.compressToUTF16(text);
    const encoded = btoa(unescape(encodeURIComponent(compressed)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    window.open(
      `https://ariesyb.github.io/markdown-preview/?data=${encoded}`,
      '_blank',
    );
  }
})();
```

使用方法：

1. 在浏览器中创建新书签
2. 将上述代码粘贴到 URL 栏
3. 选中网页中的 Markdown 文本，点击书签即可预览

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
markdown-preview/
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

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2024-01-23)

- 初始版本发布
- 支持 Markdown 编辑和实时预览
- 支持 Mermaid 图表渲染
- 支持 URL 参数分享
- 支持主题切换
- 提供预设模板
