# Basic Usage Example

这是一个展示如何使用 `@yai-nextjs/plugin-support` 的基础示例应用。

## 项目结构

```
basic-usage/
├── apps/
│   └── web/                    # Next.js 主应用
│       ├── src/
│       │   └── app/
│       │       └── api/
│       │           └── [...slug]/
│       │               └── route.ts    # 统一 API 入口
│       ├── package.json
│       └── next.config.js
├── packages/
│   ├── blog-plugin/            # 博客插件
│   ├── user-plugin/            # 用户插件
│   └── shared/                 # 共享工具
├── package.json
└── turbo.json
```

## 功能特性

### 📝 博客插件 (Blog Plugin)
- **路由**: `/api/blog/posts`
- **功能**: 博客文章的 CRUD 操作
- **特点**: 
  - 支持分页查询
  - 完整的增删改查
  - 插件生命周期钩子

### 👤 用户插件 (User Plugin)
- **路由**: `/api/users`
- **功能**: 用户管理的 CRUD 操作
- **特点**:
  - 用户搜索功能
  - 数据验证
  - 自定义中间件（日志记录）
  - 冲突检测（用户名/邮箱唯一性）

### 🔧 共享工具 (Shared Utilities)
- API 响应格式化
- 分页处理
- 错误处理
- 数据验证工具

## 快速开始

### 1. 安装依赖

从项目根目录运行：

\`\`\`bash
cd examples/basic-usage
pnpm install
\`\`\`

### 2. 启动开发服务器

\`\`\`bash
pnpm dev
\`\`\`

### 3. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## API 测试

### 博客 API

\`\`\`bash
# 获取所有博客文章
curl http://localhost:3000/api/blog/posts

# 创建新文章
curl -X POST http://localhost:3000/api/blog/posts \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "新文章标题",
    "content": "文章内容",
    "author": "作者名"
  }'

# 获取特定文章
curl http://localhost:3000/api/blog/posts/1

# 更新文章
curl -X PUT http://localhost:3000/api/blog/posts/1 \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "更新后的标题"
  }'

# 删除文章
curl -X DELETE http://localhost:3000/api/blog/posts/1
\`\`\`

### 用户 API

\`\`\`bash
# 获取所有用户
curl http://localhost:3000/api/users

# 搜索用户
curl "http://localhost:3000/api/users?search=demo&limit=5&offset=0"

# 创建新用户
curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "newuser",
    "email": "new@example.com",
    "name": "New User"
  }'

# 获取特定用户
curl http://localhost:3000/api/users/1

# 更新用户
curl -X PUT http://localhost:3000/api/users/1 \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Updated Name"
  }'

# 删除用户
curl -X DELETE http://localhost:3000/api/users/1
\`\`\`

## 核心概念演示

### 1. 插件注册

每个插件都通过 \`definePlugin\` 创建配置，并自动注册到插件注册中心：

\`\`\`typescript
const blogPlugin = definePlugin({
  name: 'blog-plugin',
  version: '1.0.0',
  description: '博客插件',
  routes: {
    '/api/blog/posts': {
      GET: getPosts,
      POST: createPost,
    },
    '/api/blog/posts/:id': {
      GET: getPost,
      PUT: updatePost,
      DELETE: deletePost,
    },
  },
});
\`\`\`

### 2. 统一路由处理

Next.js App Router 的 \`[...slug]\` 动态路由作为统一入口：

\`\`\`typescript
import { createHandler } from '@yai-nextjs/plugin-support';

const handler = createHandler({
  enableMiddleware: true,
  enableCors: true,
});

export const GET = handler.GET;
export const POST = handler.POST;
// ... 其他 HTTP 方法
\`\`\`

### 3. 中间件系统

插件可以注册中间件来处理横切关注点：

\`\`\`typescript
const loggingMiddleware = createMiddleware(
  'user-logging',
  async (request, next) => {
    console.log(\`Processing: \${request.method} \${request.url}\`);
    const response = await next();
    console.log(\`Response: \${response.status}\`);
    return response;
  }
);
\`\`\`

### 4. 生命周期钩子

插件可以响应不同的生命周期事件：

\`\`\`typescript
hooks: {
  onInit: () => console.log('Plugin initialized'),
  onRouteRegister: (path, method) => console.log(\`Route registered: \${method} \${path}\`),
  onRequest: (request) => console.log(\`Handling request: \${request.url}\`),
}
\`\`\`

## 开发指南

### 创建新插件

1. 在 \`packages/\` 目录下创建新文件夹
2. 创建 \`package.json\` 和 \`tsconfig.json\`
3. 实现插件逻辑并使用 \`definePlugin\`
4. 在主应用中导入插件以触发注册

### 扩展功能

- 添加更多路由处理器
- 实现自定义中间件
- 添加数据持久化
- 集成认证系统
- 添加缓存层

## 调试

开发模式下，插件系统会输出详细的调试信息：

- 插件注册日志
- 路由匹配日志
- 中间件执行日志
- 错误详细信息

查看浏览器控制台和终端输出获取调试信息。