// Markdown 语法补全数据
export const markdownSuggestions = {
  // 代码块触发器
  '```': {
    group: '代码块',
    items: [
      {
        icon: '📝',
        title: 'JavaScript',
        desc: 'JavaScript 代码块',
        insert: 'javascript\n// 在此输入代码\n```',
      },
      {
        icon: '🐍',
        title: 'Python',
        desc: 'Python 代码块',
        insert: 'python\n# 在此输入代码\n```',
      },
      {
        icon: '🌐',
        title: 'HTML',
        desc: 'HTML 代码块',
        insert: 'html\n<!-- 在此输入代码 -->\n```',
      },
      {
        icon: '🎨',
        title: 'CSS',
        desc: 'CSS 代码块',
        insert: 'css\n/* 在此输入代码 */\n```',
      },
      {
        icon: '☕',
        title: 'Java',
        desc: 'Java 代码块',
        insert: 'java\n// 在此输入代码\n```',
      },
      {
        icon: '🔷',
        title: 'TypeScript',
        desc: 'TypeScript 代码块',
        insert: 'typescript\n// 在此输入代码\n```',
      },
      {
        icon: '📊',
        title: 'Mermaid',
        desc: 'Mermaid 图表',
        insert: 'mermaid\ngraph TD\n    A[开始] --> B[结束]\n```',
      },
      {
        icon: '📄',
        title: 'JSON',
        desc: 'JSON 数据',
        insert: 'json\n{\n  "key": "value"\n}\n```',
      },
      {
        icon: '🔧',
        title: 'Bash',
        desc: 'Bash 脚本',
        insert: 'bash\n# 在此输入命令\n```',
      },
      {
        icon: '📋',
        title: 'Markdown',
        desc: 'Markdown 代码块',
        insert: 'markdown\n# 在此输入 Markdown\n```',
      },
      {
        icon: '🔤',
        title: '纯文本',
        desc: '纯文本代码块',
        insert: 'text\n在此输入文本\n```',
      },
      {
        icon: '📊',
        title: 'SQL',
        desc: 'SQL 查询',
        insert: 'sql\nSELECT * FROM table;\n```',
      },
    ],
  },
  // 标题触发器
  '#': {
    group: '标题',
    items: [
      { icon: 'H1', title: '一级标题', desc: '# 标题', insert: '# ' },
      { icon: 'H2', title: '二级标题', desc: '## 标题', insert: '## ' },
      { icon: 'H3', title: '三级标题', desc: '### 标题', insert: '### ' },
      { icon: 'H4', title: '四级标题', desc: '#### 标题', insert: '#### ' },
      { icon: 'H5', title: '五级标题', desc: '##### 标题', insert: '##### ' },
      { icon: 'H6', title: '六级标题', desc: '###### 标题', insert: '###### ' },
    ],
  },
  // 列表触发器
  '-': {
    group: '列表',
    items: [
      { icon: '•', title: '无序列表', desc: '- 项目', insert: '- ' },
      { icon: '1.', title: '有序列表', desc: '1. 项目', insert: '1. ' },
      { icon: '✓', title: '任务列表', desc: '- [ ] 任务', insert: '- [ ] ' },
      { icon: '✓', title: '已完成任务', desc: '- [x] 任务', insert: '- [x] ' },
    ],
  },
  // 文本格式触发器
  '*': {
    group: '文本格式',
    items: [
      { icon: 'B', title: '粗体', desc: '**粗体**', insert: '**粗体**' },
      { icon: 'I', title: '斜体', desc: '*斜体*', insert: '*斜体*' },
      { icon: 'S', title: '删除线', desc: '~~删除线~~', insert: '~~删除线~~' },
      { icon: 'C', title: '行内代码', desc: '`代码`', insert: '`代码`' },
      { icon: 'H', title: '高亮', desc: '==高亮==', insert: '==高亮==' },
    ],
  },
  // 引用触发器
  '>': {
    group: '引用',
    items: [
      { icon: '❝', title: '引用', desc: '> 引用内容', insert: '> ' },
      { icon: '❝❝', title: '嵌套引用', desc: '> > 嵌套引用', insert: '> > ' },
    ],
  },
  // 链接和图片触发器
  '[': {
    group: '链接与图片',
    items: [
      { icon: '🔗', title: '链接', desc: '[文本](url)', insert: '[文本](url)' },
      { icon: '🖼️', title: '图片', desc: '![alt](url)', insert: '![alt](url)' },
      {
        icon: '📎',
        title: '引用链接',
        desc: '[文本][ref]',
        insert: '[文本][ref]',
      },
    ],
  },
  // 表格触发器
  '|': {
    group: '表格',
    items: [
      {
        icon: '📊',
        title: '表格',
        desc: 'Markdown 表格',
        insert:
          '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |',
      },
    ],
  },
  // 分隔线触发器
  '---': {
    group: '分隔线',
    items: [
      { icon: '—', title: '分隔线', desc: '---', insert: '---' },
      { icon: '***', title: '分隔线', desc: '***', insert: '***' },
    ],
  },
  // 其他触发器
  '!': {
    group: '其他',
    items: [
      { icon: '🖼️', title: '图片', desc: '![alt](url)', insert: '![alt](url)' },
    ],
  },
};
