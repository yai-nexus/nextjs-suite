# Next.js Suite - Plugin Support Ecosystem

> **Next.js 15+ App Router 的插件化路由注册系统 Monorepo**

一个完整的 Next.js 插件化生态系统，让你能够构建真正模块化和可扩展的 Next.js 应用。

## 🎯 项目概述

**库名**：`@yai-nextjs/plugin-support`  
**定位**：Next.js 15+ App Router 的插件化路由注册系统  
**愿景**：让 Monorepo 中的 Next.js 应用支持真正的插件化架构

## ✨ 核心特性

- ✅ **完全类型安全** - 100% TypeScript 支持，完整的类型推导
- ✅ **Next.js 15+ 兼容** - 专为最新的 App Router 设计
- ✅ **装饰器支持** - 优雅的 `@Route`、`@Plugin` 装饰器
- ✅ **强大的中间件系统** - 支持认证、缓存、限流等
- ✅ **插件生命周期钩子** - 完整的 `onInit`、`onRequest` 等钩子
- ✅ **开发者友好** - 详细的调试信息和错误提示  
- ✅ **生产就绪** - 高性能、错误处理、监控支持

## 📦 项目结构

```
nextjs-suite/
├── packages/
│   ├── plugin-support/          # 🎯 核心库
│   ├── create-plugin/           # 🛠️ 插件脚手架工具
│   ├── plugin-cli/              # 📟 插件管理 CLI
│   └── plugin-devtools/         # 🔧 开发者工具
├── examples/
│   ├── basic-usage/             # 📝 基础使用示例
│   ├── advanced-monorepo/       # 🏗️ 高级 Monorepo 示例
│   ├── plugin-marketplace/      # 🛒 插件市场示例
│   └── performance-demo/        # ⚡ 性能测试示例
├── tools/
│   ├── build-scripts/           # 🔨 构建脚本
│   ├── test-utils/              # 🧪 测试工具
│   └── benchmarks/              # 📊 性能基准测试
└── plugins/                     # 🔌 官方插件示例
    ├── auth-plugin/             # 🔐 认证插件
    ├── logging-plugin/          # 📝 日志插件
    └── metrics-plugin/          # 📈 监控插件
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建所有包

```bash
pnpm build
```

### 3. 运行基础示例

```bash
cd examples/basic-usage
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看示例应用。

## 💫 核心概念演示

### 简单的插件定义

```typescript
import { definePlugin, NextRequest, NextResponse } from '@yai-nextjs/plugin-support';

const blogPlugin = definePlugin({
  name: 'blog-plugin',
  version: '1.0.0',
  description: '博客管理插件',
  routes: {
    '/api/blog/posts': {
      GET: async () => NextResponse.json({ posts: [] }),
      POST: async (request: NextRequest) => {
        const body = await request.json();
        return NextResponse.json({ id: '1', ...body }, { status: 201 });
      }
    }
  }
});
```

### 装饰器方式（更优雅）

```typescript
import { Plugin, GET, POST } from '@yai-nextjs/plugin-support/decorators';

@Plugin({
  name: 'user-plugin',
  version: '1.0.0'
})
export class UserPlugin {
  @GET('/api/users')
  async getUsers() {
    return NextResponse.json({ users: [] });
  }

  @POST('/api/users')
  async createUser(request: NextRequest) {
    const body = await request.json();
    return NextResponse.json({ id: '1', ...body }, { status: 201 });
  }
}
```

### Next.js App Router 集成

```typescript
// app/api/[...slug]/route.ts
import { createHandler } from '@yai-nextjs/plugin-support';

// 导入插件触发自动注册
import '@/plugins/blog-plugin';
import '@/plugins/user-plugin';

const handler = createHandler({
  enableMiddleware: true,
  enableCors: true,
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
// ... 其他 HTTP 方法
```

## 📖 核心包说明

### [@yai-nextjs/plugin-support](./packages/plugin-support/README.md)

核心插件支持库，提供：
- 插件注册中心 (PluginRegistry)
- 路由处理器 (PluginRouter)  
- 中间件系统
- 类型安全的 API
- 装饰器支持

### [@yai-nextjs/create-plugin](./packages/create-plugin/README.md) (计划中)

插件脚手架工具：
```bash
npx @yai-nextjs/create-plugin my-awesome-plugin
```

### [@yai-nextjs/plugin-cli](./packages/plugin-cli/README.md) (计划中)

插件管理 CLI：
```bash
npx @yai-nextjs/plugin-cli list
npx @yai-nextjs/plugin-cli install auth-plugin
```

## 🏗️ 开发状态

### ✅ Phase 1: MVP (v0.1.0) - 已完成

- [x] 核心插件注册系统
- [x] 基础路由处理
- [x] TypeScript 支持
- [x] 基础示例应用
- [x] 完整的测试套件
- [x] 详细文档

### 🚧 Phase 2: 增强功能 (v0.2.0) - 开发中

- [ ] 装饰器支持 (部分完成)
- [ ] 完整的中间件系统 (部分完成)
- [ ] 插件生命周期钩子 (已完成)
- [ ] 开发者工具

### 📅 Phase 3: 工具链 (v0.3.0) - 计划中

- [ ] CLI 工具
- [ ] 插件脚手架
- [ ] 性能监控
- [ ] 可视化调试

### 🎯 Phase 4: 生态系统 (v1.0.0) - 计划中

- [ ] 插件市场
- [ ] 官方插件库
- [ ] 完整文档站点
- [ ] 生产级稳定性

## 🏃‍♂️ 示例应用

### [基础使用示例](./examples/basic-usage/README.md)

展示如何创建简单的博客和用户管理插件：

```bash
cd examples/basic-usage
pnpm dev
```

**功能包括：**
- 博客文章 CRUD
- 用户管理 CRUD  
- 中间件日志记录
- 错误处理
- API 测试界面

### [高级 Monorepo 示例](./examples/advanced-monorepo/README.md) (计划中)

展示企业级 Monorepo 架构：
- 多应用支持 (Admin、API、Web、Mobile)
- 插件间通信
- 共享组件库
- 统一的构建和部署

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行核心库测试
cd packages/plugin-support
pnpm test

# 运行示例应用测试
cd examples/basic-usage
pnpm test
```

## 📚 文档

- [快速开始指南](./packages/plugin-support/README.md)
- [完整 API 参考](./packages/plugin-support/docs/API.md)
- [类型定义说明](./packages/plugin-support/docs/TYPES.md)
- [使用示例集合](./packages/plugin-support/docs/EXAMPLES.md)

## 🛠️ 开发环境

### 技术栈

- **构建工具**: Turborepo
- **包管理**: pnpm
- **构建系统**: Rollup + SWC
- **测试框架**: Jest + Testing Library
- **文档**: Nextra (Next.js based)
- **CI/CD**: GitHub Actions
- **发布**: Changesets

### 开发流程

```bash
# 克隆项目
git clone https://github.com/yai-dev/nextjs-suite.git
cd nextjs-suite

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 运行测试
pnpm test

# 构建所有包
pnpm build

# 发布新版本
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

## 🎯 设计原则

### 1. 开发者体验优先
- 完整的 TypeScript 支持
- 详细的错误信息和调试
- 优雅的装饰器 API
- 丰富的文档和示例

### 2. 性能至上
- 最小的运行时开销
- 高效的路由匹配算法
- 智能的中间件执行
- 生产级的错误处理

### 3. 可扩展性
- 插件化架构
- 中间件系统
- 生命周期钩子
- 插件间通信

### 4. 类型安全
- 100% TypeScript 覆盖
- 泛型路由处理器
- 编译时类型检查
- 智能的类型推导

## 🤝 贡献指南

我们欢迎社区贡献！请查看 [贡献指南](./CONTRIBUTING.md) 了解如何参与。

### 贡献方式

- 🐛 报告 Bug
- 💡 提出新功能建议  
- 📖 改进文档
- 🧪 编写测试
- 💻 提交代码

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件。

## 🔗 相关链接

- [Next.js 官方文档](https://nextjs.org/docs)
- [Turborepo 文档](https://turbo.build/repo/docs)
- [TypeScript 装饰器](https://www.typescriptlang.org/docs/handbook/decorators.html)

## 📊 项目统计

![GitHub stars](https://img.shields.io/github/stars/yai-dev/nextjs-suite?style=social)
![GitHub forks](https://img.shields.io/github/forks/yai-dev/nextjs-suite?style=social)
![GitHub issues](https://img.shields.io/github/issues/yai-dev/nextjs-suite)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yai-dev/nextjs-suite)
![GitHub license](https://img.shields.io/github/license/yai-dev/nextjs-suite)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

**🚀 让我们一起构建更强大的 Next.js 生态系统！**

</div>