// 预设模板列表
export const templates = [
  {
    name: '流程图',
    description: '展示业务流程和决策逻辑',
    content: `# 流程图示例

\`\`\`mermaid
graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E
    
    style A fill:#007acc,stroke:#333,stroke-width:2px
    style E fill:#4ec9b0,stroke:#333,stroke-width:2px
\`\`\`

## 使用说明

- 使用 \`graph TD\` 定义从上到下的流程图
- 使用 \`graph LR\` 定义从左到右的流程图
- 使用 \`|标签|\` 定义条件分支
- 使用 \`style\` 自定义节点样式
`,
  },
  {
    name: '时序图',
    description: '展示系统间的交互顺序',
    content: `# 时序图示例

\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库
    
    用户->>前端: 发起请求
    前端->>后端: API 调用
    后端->>数据库: 查询数据
    数据库-->>后端: 返回结果
    后端-->>前端: JSON 响应
    前端-->>用户: 显示数据
    
    Note over 用户,数据库: 完整的请求响应流程
\`\`\`

## 使用说明

- 使用 \`participant\` 定义参与者
- 使用 \`->>\` 表示同步消息
- 使用 \`-->>\` 表示异步消息
- 使用 \`Note over\` 添加注释
`,
  },
  {
    name: '甘特图',
    description: '项目进度和时间规划',
    content: `# 项目计划甘特图

\`\`\`mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 需求分析
    需求调研       :a1, 2024-01-01, 7d
    需求文档       :a2, after a1, 5d
    section 开发
    前端开发       :b1, 2024-01-15, 14d
    后端开发       :b2, 2024-01-15, 14d
    section 测试
    集成测试       :c1, after b1, 7d
    上线部署       :c2, after c1, 2d
\`\`\`

## 使用说明

- 使用 \`section\` 定义任务分组
- 使用 \`after\` 定义任务依赖关系
- 使用数字+单位定义持续时间（d=天, w=周, m=月）
`,
  },
  {
    name: '状态图',
    description: '展示系统状态转换',
    content: `# 状态图示例

\`\`\`mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中: 开始处理
    处理中 --> 已完成: 处理成功
    处理中 --> 已拒绝: 处理失败
    已完成 --> [*]
    已拒绝 --> [*]
    
    note right of 处理中
        正在执行业务逻辑
    end note
\`\`\`

## 使用说明

- 使用 \`[*]\` 表示开始/结束状态
- 使用 \`-->\` 定义状态转换
- 使用 \`:\` 添加转换条件
- 使用 \`note\` 添加注释
`,
  },
  {
    name: '类图',
    description: '展示类之间的关系',
    content: `# 类图示例

\`\`\`mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +eat()
        +sleep()
    }
    
    class Dog {
        +String breed
        +bark()
    }
    
    class Cat {
        +String color
        +meow()
    }
    
    Animal <|-- Dog
    Animal <|-- Cat
\`\`\`

## 使用说明

- 使用 \`class\` 定义类
- 使用 \`+\` 表示公有成员
- 使用 \`-\` 表示私有成员
- 使用 \`<|--\` 表示继承关系
`,
  },
  {
    name: 'ER图',
    description: '数据库实体关系图',
    content: `# ER图示例

\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    
    USER {
        int id PK
        string name
        string email
    }
    
    ORDER {
        int id PK
        int user_id FK
        datetime created_at
    }
    
    ORDER_ITEM {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
    }
    
    PRODUCT {
        int id PK
        string name
        decimal price
    }
\`\`\`

## 使用说明

- 使用 \`||--o{\` 表示一对多关系
- 使用 \`||--|{\` 表示强制一对多关系
- 使用 \`PK\` 标记主键
- 使用 \`FK\` 标记外键
`,
  },
  {
    name: '思维导图',
    description: '展示思维结构和层次',
    content: `# 思维导图示例

\`\`\`mermaid
mindmap
  root((Markdown))
    基础语法
      标题
      列表
      链接
      图片
    高级语法
      表格
      代码块
      引用
      分割线
    扩展功能
      Mermaid图表
      数学公式
      脚注
      任务列表
\`\`\`

## 使用说明

- 使用 \`mindmap\` 定义思维导图
- 使用 \`()\` 定义圆形节点
- 使用 \`[]\` 定义方形节点
- 使用缩进表示层级关系
`,
  },
  {
    name: '饼图',
    description: '展示数据占比',
    content: `# 饼图示例

\`\`\`mermaid
pie title 项目时间分配
    "需求分析" : 20
    "开发" : 50
    "测试" : 20
    "部署" : 10
\`\`\`

## 使用说明

- 使用 \`pie\` 定义饼图
- 使用 \`title\` 设置图表标题
- 使用 \`"标签" : 数值\` 定义数据项
`,
  },
  {
    name: 'Git图',
    description: '展示Git提交历史',
    content: `# Git图示例

\`\`\`mermaid
gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    commit
\`\`\`

## 使用说明

- 使用 \`commit\` 表示提交
- 使用 \`branch\` 创建分支
- 使用 \`checkout\` 切换分支
- 使用 \`merge\` 合并分支
`,
  },
  {
    name: '用户旅程图',
    description: '展示用户体验流程',
    content: `# 用户旅程图示例

\`\`\`mermaid
journey
    title 用户注册流程
    section 访问网站
      打开首页: 5: 用户
      点击注册: 4: 用户
    section 填写信息
      输入邮箱: 3: 用户
      输入密码: 3: 用户
      验证邮箱: 2: 用户
    section 完成注册
      收到验证邮件: 4: 用户
      点击验证链接: 5: 用户
      注册成功: 5: 用户
\`\`\`

## 使用说明

- 使用 \`journey\` 定义旅程图
- 使用 \`section\` 定义阶段
- 使用 \`任务: 评分: 角色\` 定义任务
- 评分范围 1-5，5 表示满意度最高
`,
  },
];
