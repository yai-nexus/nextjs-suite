# 类型定义

本文档详细说明了 `@yai-nextjs/plugin-support` 中的所有 TypeScript 类型定义。

## 核心类型

### HttpMethod

支持的 HTTP 方法类型。

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
```

### RouteHandler

路由处理器函数类型。

```typescript
interface RouteHandler<TRequest = any, TResponse = any> {
  (request: NextRequest & { body?: TRequest }): Promise<NextResponse> | NextResponse;
}
```

**类型参数:**
- `TRequest`: 请求体类型
- `TResponse`: 响应体类型

### RouteConfig

路由配置类型，定义插件的所有路由。

```typescript
interface RouteConfig {
  [path: string]: {
    [K in HttpMethod]?: RouteHandler<any, any>;
  };
}
```

**示例:**
```typescript
const routes: RouteConfig = {
  '/api/users': {
    GET: async () => new NextResponse('users list'),
    POST: async (request) => {
      const body = await request.json();
      return NextResponse.json(body);
    }
  },
  '/api/users/:id': {
    GET: async () => new NextResponse('user detail'),
    PUT: async () => new NextResponse('user updated'),
    DELETE: async () => new NextResponse('user deleted')
  }
};
```

## 中间件类型

### MiddlewareFunction

中间件函数类型。

```typescript
interface MiddlewareFunction {
  (request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse>;
}
```

### MiddlewareConfig

中间件配置类型。

```typescript
interface MiddlewareConfig {
  name: string;
  handler: MiddlewareFunction;
  priority?: number;
  routes?: string[];
}
```

**字段说明:**
- `name`: 中间件名称，用于标识和调试
- `handler`: 中间件处理函数
- `priority`: 优先级，数值越高越先执行（默认: 0）
- `routes`: 应用的路由列表，为空则应用到所有路由

## 插件类型

### PluginMetadata

插件元数据类型。

```typescript
interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: string[];
  createdAt: Date;
  enabled: boolean;
}
```

### PluginConfig

完整的插件配置类型。

```typescript
interface PluginConfig extends PluginMetadata {
  routes: RouteConfig;
  middlewares?: MiddlewareConfig[];
  hooks?: PluginHooks;
}
```

### PluginHooks

插件生命周期钩子类型。

```typescript
interface PluginHooks {
  onInit?: () => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
  onRouteRegister?: (path: string, method: HttpMethod) => void;
  onRouteUnregister?: (path: string, method: HttpMethod) => void;
  onRequest?: (request: NextRequest) => void | Promise<void>;
  onResponse?: (response: NextResponse) => void | Promise<void>;
  onError?: (error: Error, request: NextRequest) => void | Promise<void>;
}
```

**钩子说明:**
- `onInit`: 插件初始化时调用
- `onDestroy`: 插件销毁时调用
- `onRouteRegister`: 路由注册时调用
- `onRouteUnregister`: 路由注销时调用
- `onRequest`: 处理请求前调用
- `onResponse`: 处理响应后调用
- `onError`: 发生错误时调用

## 上下文类型

### PluginContext

插件上下文类型，包含请求处理所需的信息。

```typescript
interface PluginContext {
  request: NextRequest;
  params: Record<string, string>;
  searchParams: URLSearchParams;
  headers: Headers;
  cookies: Record<string, string>;
}
```

**字段说明:**
- `request`: Next.js 请求对象
- `params`: 路径参数（如 `/users/:id` 中的 `id`）
- `searchParams`: 查询参数
- `headers`: 请求头
- `cookies`: Cookie 对象

## 路由匹配类型

### RouteMatch

路由匹配结果类型。

```typescript
interface RouteMatch {
  plugin: PluginMetadata;
  handler: RouteHandler;
  params: Record<string, string>;
  middlewares: MiddlewareFunction[];
}
```

## 配置类型

### PluginRegistryOptions

插件注册中心配置选项。

```typescript
interface PluginRegistryOptions {
  enableDebug?: boolean;
  enableHotReload?: boolean;
  maxPlugins?: number;
  routePrefix?: string;
}
```

**默认值:**
- `enableDebug`: 开发环境为 `true`，生产环境为 `false`
- `enableHotReload`: 开发环境为 `true`，生产环境为 `false`
- `maxPlugins`: `100`
- `routePrefix`: `'/api'`

### RouterOptions

路由器配置选项。

```typescript
interface RouterOptions {
  enableMiddleware?: boolean;
  enableCors?: boolean;
  corsOptions?: {
    origin?: string | string[] | boolean;
    methods?: HttpMethod[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  errorHandler?: (error: Error, request: NextRequest) => NextResponse;
}
```

### CreateHandlerOptions

处理器创建选项。

```typescript
interface CreateHandlerOptions {
  registry?: PluginRegistry;
  enableMiddleware?: boolean;
  enableCors?: boolean;
  corsOptions?: {
    origin?: string | string[] | boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  errorHandler?: (error: Error, request: NextRequest) => NextResponse;
}
```

## 错误类型

### PluginError

插件错误基础接口。

```typescript
interface PluginError extends Error {
  pluginName: string;
  code: string;
  statusCode?: number;
  details?: any;
}
```

### 具体错误类

#### PluginValidationError

插件验证错误。

```typescript
class PluginValidationError extends Error implements PluginError {
  pluginName: string;
  code: string;
  statusCode: number;
}
```

#### PluginRegistrationError

插件注册错误。

```typescript
class PluginRegistrationError extends Error implements PluginError {
  pluginName: string;
  code: string;
  statusCode: number;
}
```

#### PluginRouteError

插件路由错误。

```typescript
class PluginRouteError extends Error implements PluginError {
  pluginName: string;
  code: string;
  statusCode: number;
}
```

## 统计类型

### PluginStats

插件统计信息类型。

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

## 装饰器类型

### PluginDecoratorOptions

插件装饰器选项。

```typescript
interface PluginDecoratorOptions {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: string[];
  middlewares?: MiddlewareConfig[];
  hooks?: PluginHooks;
  autoRegister?: boolean;
}
```

### RouteDecoratorOptions

路由装饰器选项。

```typescript
interface RouteDecoratorOptions {
  middleware?: string[];
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
  };
  auth?: boolean;
  cors?: boolean;
  cache?: {
    maxAge?: number;
    staleWhileRevalidate?: number;
  };
}
```

### MiddlewareDecoratorOptions

中间件装饰器选项。

```typescript
interface MiddlewareDecoratorOptions {
  name?: string;
  priority?: number;
  routes?: string[];
  enabled?: boolean;
}
```

## 日志类型

### LogLevel

日志级别枚举。

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}
```

### LoggerOptions

日志器配置选项。

```typescript
interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  enableColors?: boolean;
  enableTimestamp?: boolean;
}
```

## 验证类型

### ValidationRule

验证规则类型。

```typescript
interface ValidationRule<T = any> {
  name: string;
  validate: (value: T) => boolean | string;
  message?: string;
}
```

### ErrorHandlerOptions

错误处理器选项。

```typescript
interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  customErrorMap?: Map<string, (error: Error) => { status: number; message: string }>;
}
```

## 工具类型

### 类型守卫函数

```typescript
// 检查是否为插件错误
function isPluginError(error: any): error is PluginError;

// 检查是否为有效的 HTTP 方法
function isValidHttpMethod(method: string): method is HttpMethod;

// 检查是否为有效的路由配置
function isValidRouteConfig(config: any): config is RouteConfig;
```

## 泛型工具类型

### 提取路由参数类型

```typescript
type ExtractRouteParams<T extends string> = 
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractRouteParams<Rest>
    : T extends `${infer _Start}:${infer Param}`
    ? { [K in Param]: string }
    : {};

// 使用示例
type UserRouteParams = ExtractRouteParams<'/api/users/:id'>; // { id: string }
type PostRouteParams = ExtractRouteParams<'/api/posts/:postId/comments/:commentId'>; // { postId: string; commentId: string }
```

### 插件类型推断

```typescript
type InferPluginRoutes<T extends PluginConfig> = T['routes'];
type InferPluginMiddlewares<T extends PluginConfig> = T['middlewares'];
type InferPluginHooks<T extends PluginConfig> = T['hooks'];
```

## 示例用法

### 创建类型安全的插件

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

const userPlugin = definePlugin({
  name: 'user-plugin',
  version: '1.0.0',
  routes: {
    '/api/users': {
      GET: async (): Promise<NextResponse> => {
        const users: User[] = [];
        return NextResponse.json(users);
      },
      POST: createRouteHandler<CreateUserRequest, User>(
        async (request, context) => {
          const body = await request.json();
          const user: User = {
            id: '1',
            name: body.name,
            email: body.email
          };
          return NextResponse.json(user);
        }
      )
    }
  }
});
```

### 使用装饰器的类型安全插件

```typescript
@Plugin({
  name: 'typed-user-plugin',
  version: '1.0.0'
})
class TypedUserPlugin {
  @GET('/api/users')
  async getUsers(): Promise<NextResponse> {
    const users: User[] = [];
    return NextResponse.json(users);
  }

  @POST('/api/users')
  async createUser(request: NextRequest): Promise<NextResponse> {
    const body: CreateUserRequest = await request.json();
    const user: User = {
      id: '1',
      name: body.name,
      email: body.email
    };
    return NextResponse.json(user);
  }
}
```