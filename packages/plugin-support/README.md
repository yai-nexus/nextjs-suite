# @yai-nextjs/plugin-support

Next.js 15+ App Router 的插件化路由注册系统，让 Monorepo 中的 Next.js 应用支持真正的插件化架构。

## 🚀 特性

- ✅ **完全类型安全** - 完整的 TypeScript 支持
- ✅ **Next.js 15+ 兼容** - 专为 App Router 设计
- ✅ **装饰器支持** - 优雅的路由定义方式
- ✅ **中间件系统** - 强大的请求处理链
- ✅ **插件生命周期** - 完整的钩子系统
- ✅ **开发友好** - 详细的调试信息
- ✅ **生产就绪** - 高性能和错误处理

## 📦 安装

```bash
pnpm add @yai-nextjs/plugin-support
```

## 🎯 快速开始

### 1. 创建插件

```typescript
// packages/blog-plugin/src/index.ts
import { definePlugin, NextRequest, NextResponse } from '@yai-nextjs/plugin-support';

const blogPlugin = definePlugin({
  name: 'blog-plugin',
  version: '1.0.0',
  description: '博客管理插件',
  routes: {
    '/api/blog/posts': {
      GET: async (request: NextRequest) => {
        return NextResponse.json({ posts: [] });
      },
      POST: async (request: NextRequest) => {
        const body = await request.json();
        return NextResponse.json({ id: '1', ...body }, { status: 201 });
      }
    }
  }
});

// 自动注册插件
import { PluginRegistry } from '@yai-nextjs/plugin-support';
PluginRegistry.getInstance().register(blogPlugin);

export default blogPlugin;
```

### 2. 设置 Next.js 路由处理器

```typescript
// app/api/[...slug]/route.ts
import { createHandler } from '@yai-nextjs/plugin-support';

// 导入所有插件以触发注册
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
export const PATCH = handler.PATCH;
export const HEAD = handler.HEAD;
export const OPTIONS = handler.OPTIONS;
```

### 3. 使用装饰器 (可选)

```typescript
import { Plugin, Route, GET, POST } from '@yai-nextjs/plugin-support/decorators';

@Plugin({
  name: 'user-plugin',
  version: '1.0.0',
  description: '用户管理插件'
})
export class UserPlugin {
  @GET('/api/users')
  async getUsers(request: NextRequest) {
    return NextResponse.json({ users: [] });
  }

  @POST('/api/users')
  async createUser(request: NextRequest) {
    const body = await request.json();
    return NextResponse.json({ id: '1', ...body }, { status: 201 });
  }

  @GET('/api/users/:id')
  async getUser(request: NextRequest) {
    // 参数会自动提取到 context.params 中
    return NextResponse.json({ id: '1', name: 'John' });
  }
}
```

## 📖 核心概念

### 插件注册中心 (PluginRegistry)

插件注册中心是系统的核心，负责管理所有插件的注册、路由映射和生命周期。

```typescript
import { PluginRegistry } from '@yai-nextjs/plugin-support';

const registry = PluginRegistry.getInstance();

// 注册插件
registry.register(myPlugin);

// 获取插件信息
const plugin = registry.getPlugin('plugin-name');

// 获取统计信息
const stats = registry.getStats();

// 启用/禁用插件
registry.disablePlugin('plugin-name');
registry.enablePlugin('plugin-name');
```

### 路由处理

所有插件路由通过 Next.js 的 `[...slug]` 动态路由统一处理：

```typescript
// 路由匹配示例
const match = registry.getHandler('/api/users/123', 'GET');
if (match) {
  const response = await registry.executeRoute(match, request);
}
```

### 中间件系统

支持强大的中间件链，可以处理认证、日志、缓存等横切关注点：

```typescript
import { createMiddleware } from '@yai-nextjs/plugin-support';

const authMiddleware = createMiddleware(
  'auth',
  async (request, next) => {
    const token = request.headers.get('authorization');
    if (!token) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return await next();
  },
  { priority: 10 }
);

const plugin = definePlugin({
  // ...
  middlewares: [authMiddleware]
});
```

### 生命周期钩子

插件可以响应不同的生命周期事件：

```typescript
const plugin = definePlugin({
  // ...
  hooks: {
    onInit: () => console.log('Plugin initialized'),
    onDestroy: () => console.log('Plugin destroyed'),
    onRouteRegister: (path, method) => console.log(`Route ${method} ${path} registered`),
    onRequest: async (request) => console.log(`Processing ${request.url}`),
    onResponse: async (response) => console.log(`Response: ${response.status}`),
    onError: async (error, request) => console.error('Plugin error:', error)
  }
});
```

## 🔌 高级用法

### 类型安全的路由处理器

```typescript
interface CreateUserRequest {
  name: string;
  email: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const createUser = createRouteHandler<CreateUserRequest, UserResponse>(
  async (request, context) => {
    const body = await request.json();
    // TypeScript 会自动推断类型
    return NextResponse.json({
      id: '1',
      name: body.name,
      email: body.email,
      createdAt: new Date().toISOString()
    });
  }
);
```

### 自定义错误处理

```typescript
import { ErrorHandler } from '@yai-nextjs/plugin-support';

const errorHandler = new ErrorHandler({
  includeStack: process.env.NODE_ENV === 'development',
  logErrors: true
});

errorHandler.addCustomHandler('ValidationError', (error) => ({
  status: 400,
  message: `Validation failed: ${error.message}`
}));

const handler = createHandler({
  errorHandler: errorHandler.handle.bind(errorHandler)
});
```

### 插件间通信

```typescript
// 插件可以通过注册中心获取其他插件信息
const registry = PluginRegistry.getInstance();
const userPlugin = registry.getPlugin('user-plugin');

if (userPlugin && userPlugin.enabled) {
  // 调用其他插件的功能
}
```

## 🛠️ 开发工具

### 调试模式

开发环境下会自动启用详细的调试信息：

```typescript
// 设置环境变量启用调试
process.env.NODE_ENV = 'development';

// 或手动启用
const registry = PluginRegistry.getInstance({
  enableDebug: true
});
```

### 性能监控

```typescript
import { getDebugStats } from '@yai-nextjs/plugin-support';

const stats = getDebugStats();
console.log('Plugin Stats:', stats);
```

## 📊 最佳实践

### 1. 插件结构

```
packages/my-plugin/
├── src/
│   ├── handlers/     # 路由处理器
│   ├── middleware/   # 中间件
│   ├── types/        # 类型定义
│   ├── utils/        # 工具函数
│   └── index.ts      # 插件入口
├── __tests__/        # 测试文件
├── package.json
└── tsconfig.json
```

### 2. 错误处理

```typescript
const plugin = definePlugin({
  routes: {
    '/api/users': {
      POST: async (request) => {
        try {
          const body = await request.json();
          // 处理逻辑
          return NextResponse.json(result);
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
          );
        }
      }
    }
  }
});
```

### 3. 数据验证

```typescript
import { validateRequiredFields } from '@yai-nextjs/shared';

const createUser = async (request: NextRequest) => {
  const body = await request.json();
  const missingFields = validateRequiredFields(body, ['name', 'email']);
  
  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing fields: ${missingFields.join(', ')}` },
      { status: 400 }
    );
  }
  
  // 处理创建逻辑
};
```

### 4. 缓存策略

```typescript
const cacheMiddleware = createMiddleware(
  'cache',
  async (request, next) => {
    const cacheKey = `cache:${request.url}`;
    const cached = await getFromCache(cacheKey);
    
    if (cached) {
      return new NextResponse(cached);
    }
    
    const response = await next();
    await setCache(cacheKey, await response.text());
    
    return response;
  }
);
```

## 🧪 测试

### 单元测试

```typescript
import { PluginRegistry } from '@yai-nextjs/plugin-support';
import { NextRequest } from 'next/server';

describe('MyPlugin', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    PluginRegistry.reset();
    registry = PluginRegistry.getInstance();
  });

  it('should handle GET requests', async () => {
    registry.register(myPlugin);
    
    const match = registry.getHandler('/api/test', 'GET');
    expect(match).toBeDefined();
    
    const request = new NextRequest('http://localhost/api/test');
    const response = await registry.executeRoute(match!, request);
    
    expect(response.status).toBe(200);
  });
});
```

### 集成测试

```typescript
import { createHandler } from '@yai-nextjs/plugin-support';

describe('Integration Tests', () => {
  it('should handle full request flow', async () => {
    const handler = createHandler();
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'John' })
    });
    
    const response = await handler.POST(request);
    expect(response.status).toBe(201);
  });
});
```

## 📚 API 参考

详细的 API 文档请参考：

- [核心 API](./docs/API.md) - 完整的 API 参考
- [类型定义](./docs/TYPES.md) - TypeScript 类型说明
- [示例代码](./docs/EXAMPLES.md) - 更多使用示例

## 🤝 贡献

我们欢迎社区贡献！请查看 [贡献指南](../../CONTRIBUTING.md) 了解更多信息。

## 📄 许可证

MIT License - 详见 [LICENSE](../../LICENSE) 文件。

## 🔗 相关链接

- [Next.js 官方文档](https://nextjs.org/docs)
- [示例项目](../../examples)
- [更新日志](./CHANGELOG.md)