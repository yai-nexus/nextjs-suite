# API 参考

本文档详细介绍了 `@yai-nextjs/plugin-support` 的完整 API。

## 核心 API

### PluginRegistry

插件注册中心，负责管理所有插件的注册和路由映射。

#### 静态方法

##### `getInstance(options?: PluginRegistryOptions): PluginRegistry`

获取插件注册中心的单例实例。

**参数:**
- `options` (可选): 注册中心配置选项

**返回:** PluginRegistry 实例

**示例:**
```typescript
const registry = PluginRegistry.getInstance({
  enableDebug: true,
  maxPlugins: 50
});
```

##### `reset(): void`

重置插件注册中心实例（主要用于测试）。

#### 实例方法

##### `register(plugin: PluginConfig): void`

注册一个插件到注册中心。

**参数:**
- `plugin`: 插件配置对象

**抛出异常:**
- `PluginValidationError`: 插件配置验证失败
- `PluginRegistrationError`: 插件注册失败（如插件名重复、路由冲突等）

**示例:**
```typescript
const plugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  routes: {
    '/api/test': {
      GET: async () => new NextResponse('test')
    }
  }
});

registry.register(plugin);
```

##### `unregister(pluginName: string): boolean`

从注册中心卸载指定插件。

**参数:**
- `pluginName`: 插件名称

**返回:** 是否成功卸载

##### `getHandler(path: string, method: HttpMethod): RouteMatch | null`

获取指定路径和方法的路由处理器。

**参数:**
- `path`: 请求路径
- `method`: HTTP 方法

**返回:** 路由匹配结果或 null

##### `executeRoute(match: RouteMatch, request: NextRequest): Promise<NextResponse>`

执行路由处理器。

**参数:**
- `match`: 路由匹配结果
- `request`: Next.js 请求对象

**返回:** Next.js 响应对象

##### `getPlugin(name: string): PluginMetadata | undefined`

获取指定名称的插件元数据。

##### `getAllPlugins(): PluginMetadata[]`

获取所有已注册的插件列表。

##### `getEnabledPlugins(): PluginMetadata[]`

获取所有已启用的插件列表。

##### `getStats(): PluginStats`

获取插件注册中心的统计信息。

**返回:**
```typescript
interface PluginStats {
  totalPlugins: number;
  enabledPlugins: number;
  totalRoutes: number;
  totalMiddlewares: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}
```

##### `enablePlugin(name: string): boolean`

启用指定插件。

##### `disablePlugin(name: string): boolean`

禁用指定插件。

##### `clear(): void`

清除所有已注册的插件。

### PluginRouter

插件路由器，负责处理 HTTP 请求和响应。

#### 构造函数

```typescript
constructor(registry?: PluginRegistry, options?: RouterOptions)
```

**参数:**
- `registry` (可选): 插件注册中心实例
- `options` (可选): 路由器配置选项

#### 方法

##### `handle(request: NextRequest): Promise<NextResponse>`

处理 HTTP 请求。

**参数:**
- `request`: Next.js 请求对象

**返回:** Next.js 响应对象

##### `setRegistry(registry: PluginRegistry): void`

设置插件注册中心。

##### `getRegistry(): PluginRegistry`

获取当前使用的插件注册中心。

##### `updateOptions(options: Partial<RouterOptions>): void`

更新路由器配置选项。

## 工具函数

### definePlugin

创建插件配置对象。

```typescript
function definePlugin<T extends PluginConfig>(config: T): T
```

**参数:**
- `config`: 插件配置

**返回:** 带有默认值的插件配置

**示例:**
```typescript
const plugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  description: '我的插件',
  routes: {
    '/api/test': {
      GET: async () => new NextResponse('test')
    }
  }
});
```

### createRouteHandler

创建类型安全的路由处理器。

```typescript
function createRouteHandler<TRequest = any, TResponse = any>(
  handler: (
    request: NextRequest & { body?: TRequest },
    context: PluginContext
  ) => Promise<NextResponse> | NextResponse
): RouteHandler<TRequest, TResponse>
```

**类型参数:**
- `TRequest`: 请求体类型
- `TResponse`: 响应体类型

### createMiddleware

创建中间件配置。

```typescript
function createMiddleware(
  name: string,
  handler: MiddlewareFunction,
  options?: {
    priority?: number;
    routes?: string[];
  }
): MiddlewareConfig
```

### createHandler

创建 Next.js App Router 处理器。

```typescript
function createHandler(options?: CreateHandlerOptions): {
  GET: (request: NextRequest) => Promise<NextResponse>;
  POST: (request: NextRequest) => Promise<NextResponse>;
  PUT: (request: NextRequest) => Promise<NextResponse>;
  DELETE: (request: NextRequest) => Promise<NextResponse>;
  PATCH: (request: NextRequest) => Promise<NextResponse>;
  HEAD: (request: NextRequest) => Promise<NextResponse>;
  OPTIONS: (request: NextRequest) => Promise<NextResponse>;
}
```

## 装饰器 API

### @Plugin

类装饰器，用于标记插件类。

```typescript
@Plugin(options?: PluginDecoratorOptions)
```

**选项:**
```typescript
interface PluginDecoratorOptions {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  keywords?: string[];
  autoRegister?: boolean;
}
```

### @Route

方法装饰器，用于定义路由处理器。

```typescript
@Route(method: HttpMethod, path: string, options?: RouteDecoratorOptions)
```

### HTTP 方法装饰器

便捷的 HTTP 方法装饰器：

- `@GET(path: string, options?: RouteDecoratorOptions)`
- `@POST(path: string, options?: RouteDecoratorOptions)`
- `@PUT(path: string, options?: RouteDecoratorOptions)`
- `@DELETE(path: string, options?: RouteDecoratorOptions)`
- `@PATCH(path: string, options?: RouteDecoratorOptions)`
- `@HEAD(path: string, options?: RouteDecoratorOptions)`
- `@OPTIONS(path: string, options?: RouteDecoratorOptions)`

### @Middleware

方法装饰器，用于定义中间件。

```typescript
@Middleware(options?: MiddlewareDecoratorOptions)
```

## 中间件工具

### MiddlewareChain

中间件链管理器。

#### 方法

##### `add(middleware: MiddlewareFunction | MiddlewareConfig): void`

添加中间件到链中。

##### `remove(middleware: MiddlewareFunction): boolean`

从链中移除中间件。

##### `execute(request: NextRequest, finalHandler: () => Promise<NextResponse>): Promise<NextResponse>`

执行中间件链。

### 预置中间件

#### createCorsMiddleware

创建 CORS 中间件。

```typescript
function createCorsMiddleware(options?: {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}): MiddlewareFunction
```

#### createLoggingMiddleware

创建日志中间件。

```typescript
function createLoggingMiddleware(options?: {
  logRequests?: boolean;
  logResponses?: boolean;
  includeBody?: boolean;
  includeHeaders?: boolean;
}): MiddlewareFunction
```

#### createAuthMiddleware

创建认证中间件。

```typescript
function createAuthMiddleware(options: {
  validateToken: (token: string) => Promise<boolean> | boolean;
  extractToken?: (request: NextRequest) => string | null;
  unauthorizedResponse?: () => NextResponse;
}): MiddlewareFunction
```

#### createRateLimitMiddleware

创建限流中间件。

```typescript
function createRateLimitMiddleware(options?: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (request: NextRequest) => string;
  store?: Map<string, { count: number; resetTime: number }>;
  rateLimitResponse?: () => NextResponse;
}): MiddlewareFunction
```

## 错误处理

### ErrorHandler

错误处理器类。

#### 构造函数

```typescript
constructor(options?: ErrorHandlerOptions)
```

#### 方法

##### `handle(error: Error, request: NextRequest): NextResponse`

处理错误并返回响应。

##### `addCustomHandler(errorName: string, handler: (error: Error) => { status: number; message: string }): void`

添加自定义错误处理器。

### 错误类

#### PluginValidationError

插件验证错误。

```typescript
class PluginValidationError extends Error {
  pluginName: string;
  code: string;
  statusCode: number;
}
```

#### PluginRegistrationError

插件注册错误。

#### PluginRouteError

插件路由错误。

## 工具类

### Logger

日志记录器。

#### 方法

- `debug(message: string, ...args: any[]): void`
- `info(message: string, ...args: any[]): void`
- `warn(message: string, ...args: any[]): void`
- `error(message: string, ...args: any[]): void`
- `setLevel(level: LogLevel): void`

### Validator

数据验证器。

#### 方法

##### `addRule<T>(field: string, rule: ValidationRule<T>): void`

添加验证规则。

##### `validate<T extends Record<string, any>>(data: T, context?: string): { isValid: boolean; errors: string[] }`

执行验证。

## 类型定义

详细的类型定义请参考 [TYPES.md](./TYPES.md)。