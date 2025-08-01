# 使用示例

本文档提供了 `@yai-nextjs/plugin-support` 的详细使用示例。

## 基础示例

### 简单的 CRUD 插件

```typescript
import { definePlugin, NextRequest, NextResponse, PluginRegistry } from '@yai-nextjs/plugin-support';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

let todos: Todo[] = [];

const todoPlugin = definePlugin({
  name: 'todo-plugin',
  version: '1.0.0',
  description: 'Simple todo management plugin',
  routes: {
    '/api/todos': {
      GET: async (request: NextRequest) => {
        const url = new URL(request.url);
        const completed = url.searchParams.get('completed');
        
        let filteredTodos = todos;
        if (completed !== null) {
          filteredTodos = todos.filter(todo => 
            todo.completed === (completed === 'true')
          );
        }
        
        return NextResponse.json({ todos: filteredTodos });
      },
      
      POST: async (request: NextRequest) => {
        const body = await request.json();
        const todo: Todo = {
          id: Date.now().toString(),
          title: body.title,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        todos.push(todo);
        return NextResponse.json(todo, { status: 201 });
      }
    },
    
    '/api/todos/:id': {
      GET: async (request: NextRequest) => {
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        const todo = todos.find(t => t.id === id);
        
        if (!todo) {
          return NextResponse.json(
            { error: 'Todo not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json(todo);
      },
      
      PUT: async (request: NextRequest) => {
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        const body = await request.json();
        
        const todoIndex = todos.findIndex(t => t.id === id);
        if (todoIndex === -1) {
          return NextResponse.json(
            { error: 'Todo not found' },
            { status: 404 }
          );
        }
        
        todos[todoIndex] = { ...todos[todoIndex], ...body };
        return NextResponse.json(todos[todoIndex]);
      },
      
      DELETE: async (request: NextRequest) => {
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();
        
        const todoIndex = todos.findIndex(t => t.id === id);
        if (todoIndex === -1) {
          return NextResponse.json(
            { error: 'Todo not found' },
            { status: 404 }
          );
        }
        
        todos.splice(todoIndex, 1);
        return NextResponse.json({ success: true });
      }
    }
  },
  
  hooks: {
    onInit: () => {
      console.log('Todo plugin initialized');
    },
    onRouteRegister: (path, method) => {
      console.log(`Todo route registered: ${method} ${path}`);
    }
  }
});

// 注册插件
PluginRegistry.getInstance().register(todoPlugin);
```

## 装饰器示例

### 使用装饰器的博客插件

```typescript
import { Plugin, GET, POST, PUT, DELETE, Middleware } from '@yai-nextjs/plugin-support/decorators';
import { NextRequest, NextResponse } from 'next/server';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
}

@Plugin({
  name: 'blog-plugin',
  version: '2.0.0',
  description: 'Advanced blog management with decorators',
  author: 'YAI Team'
})
export class BlogPlugin {
  private posts: BlogPost[] = [];

  @Middleware({
    name: 'blog-logger',
    priority: 10
  })
  async logRequests(request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse> {
    const start = Date.now();
    console.log(`[Blog] ${request.method} ${request.url} - Start`);
    
    const response = await next();
    
    const duration = Date.now() - start;
    console.log(`[Blog] ${request.method} ${request.url} - ${response.status} (${duration}ms)`);
    
    return response;
  }

  @GET('/api/blog/posts')
  async getPosts(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const author = url.searchParams.get('author');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    let filteredPosts = this.posts;
    
    if (author) {
      filteredPosts = this.posts.filter(post => 
        post.author.toLowerCase().includes(author.toLowerCase())
      );
    }
    
    const paginatedPosts = filteredPosts.slice(offset, offset + limit);
    
    return NextResponse.json({
      posts: paginatedPosts,
      total: filteredPosts.length,
      limit,
      offset
    });
  }

  @POST('/api/blog/posts')
  async createPost(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      
      if (!body.title || !body.content || !body.author) {
        return NextResponse.json(
          { error: 'Title, content, and author are required' },
          { status: 400 }
        );
      }
      
      const post: BlogPost = {
        id: Date.now().toString(),
        title: body.title,
        content: body.content,
        author: body.author,
        publishedAt: new Date().toISOString()
      };
      
      this.posts.push(post);
      
      return NextResponse.json(post, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }
  }

  @GET('/api/blog/posts/:id')
  async getPost(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    const post = this.posts.find(p => p.id === id);
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(post);
  }

  @PUT('/api/blog/posts/:id')
  async updatePost(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    const postIndex = this.posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    try {
      const body = await request.json();
      
      this.posts[postIndex] = {
        ...this.posts[postIndex],
        ...body,
        id // 保持原ID不变
      };
      
      return NextResponse.json(this.posts[postIndex]);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }
  }

  @DELETE('/api/blog/posts/:id')
  async deletePost(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    const postIndex = this.posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    this.posts.splice(postIndex, 1);
    
    return NextResponse.json({ success: true });
  }
}

// 插件会自动注册（autoRegister: true 是默认值）
```

## 中间件示例

### 认证中间件插件

```typescript
import { 
  definePlugin, 
  createMiddleware, 
  NextRequest, 
  NextResponse 
} from '@yai-nextjs/plugin-support';

// 模拟的用户数据库
const users = new Map([
  ['token123', { id: '1', name: 'John Doe', role: 'admin' }],
  ['token456', { id: '2', name: 'Jane Smith', role: 'user' }]
]);

// 认证中间件
const authMiddleware = createMiddleware(
  'auth',
  async (request: NextRequest, next: () => Promise<NextResponse>) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    const user = users.get(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // 将用户信息添加到请求头中，供后续处理使用
    const modifiedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'x-user-id': user.id,
        'x-user-name': user.name,
        'x-user-role': user.role
      },
      body: request.body
    });
    
    return await next();
  },
  { priority: 100 } // 高优先级，最先执行
);

// 权限检查中间件
const adminOnlyMiddleware = createMiddleware(
  'admin-only',
  async (request: NextRequest, next: () => Promise<NextResponse>) => {
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return await next();
  },
  { 
    priority: 90,
    routes: ['/api/admin'] // 只应用到管理路由
  }
);

const protectedPlugin = definePlugin({
  name: 'protected-plugin',
  version: '1.0.0',
  description: 'Plugin with authentication and authorization',
  routes: {
    '/api/profile': {
      GET: async (request: NextRequest) => {
        const userId = request.headers.get('x-user-id');
        const userName = request.headers.get('x-user-name');
        
        return NextResponse.json({
          id: userId,
          name: userName,
          message: 'This is your profile'
        });
      }
    },
    
    '/api/admin/users': {
      GET: async (request: NextRequest) => {
        const allUsers = Array.from(users.values());
        return NextResponse.json({ users: allUsers });
      }
    }
  },
  
  middlewares: [authMiddleware, adminOnlyMiddleware]
});
```

### 缓存中间件

```typescript
import { createMiddleware } from '@yai-nextjs/plugin-support';

// 简单的内存缓存
const cache = new Map<string, { data: string; expires: number }>();

const cacheMiddleware = createMiddleware(
  'cache',
  async (request: NextRequest, next: () => Promise<NextResponse>) => {
    // 只缓存 GET 请求
    if (request.method !== 'GET') {
      return await next();
    }
    
    const cacheKey = `cache:${request.url}`;
    const cached = cache.get(cacheKey);
    
    // 检查缓存是否存在且未过期
    if (cached && cached.expires > Date.now()) {
      console.log('Cache hit:', cacheKey);
      return new NextResponse(cached.data, {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      });
    }
    
    // 执行实际的处理
    const response = await next();
    
    // 缓存成功的响应（状态码 200-299）
    if (response.ok) {
      const responseText = await response.text();
      const expires = Date.now() + 5 * 60 * 1000; // 5分钟缓存
      
      cache.set(cacheKey, { data: responseText, expires });
      console.log('Cache miss, stored:', cacheKey);
      
      // 返回新的响应对象（因为原始响应的流已被读取）
      return new NextResponse(responseText, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-Cache': 'MISS'
        }
      });
    }
    
    return response;
  },
  { priority: 50 }
);
```

### 限流中间件

```typescript
import { createRateLimitMiddleware } from '@yai-nextjs/plugin-support';

const rateLimitMiddleware = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  maxRequests: 100, // 每个窗口最多100个请求
  keyGenerator: (request: NextRequest) => {
    // 根据IP地址限流
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  },
  rateLimitResponse: () => {
    return NextResponse.json(
      { 
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: '15 minutes'
      },
      { status: 429 }
    );
  }
});
```

## 错误处理示例

### 自定义错误处理器

```typescript
import { ErrorHandler, createHandler } from '@yai-nextjs/plugin-support';

class CustomError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'CustomError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public fields: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

const errorHandler = new ErrorHandler({
  includeStack: process.env.NODE_ENV === 'development',
  logErrors: true
});

// 添加自定义错误处理器
errorHandler.addCustomHandler('CustomError', (error: CustomError) => ({
  status: error.statusCode,
  message: error.message
}));

errorHandler.addCustomHandler('ValidationError', (error: ValidationError) => ({
  status: 400,
  message: `Validation failed: ${(error as ValidationError).fields.join(', ')}`
}));

const handler = createHandler({
  errorHandler: errorHandler.handle.bind(errorHandler)
});

// 在插件中使用自定义错误
const errorExamplePlugin = definePlugin({
  name: 'error-example-plugin',
  version: '1.0.0',
  routes: {
    '/api/validate': {
      POST: async (request: NextRequest) => {
        const body = await request.json();
        
        const requiredFields = ['name', 'email'];
        const missingFields = requiredFields.filter(field => !body[field]);
        
        if (missingFields.length > 0) {
          throw new ValidationError('Missing required fields', missingFields);
        }
        
        if (body.email && !body.email.includes('@')) {
          throw new CustomError('Invalid email format', 400);
        }
        
        return NextResponse.json({ message: 'Validation passed' });
      }
    }
  }
});
```

## 高级示例

### 数据库集成插件

```typescript
import { definePlugin, createMiddleware } from '@yai-nextjs/plugin-support';

// 模拟数据库连接
class Database {
  private connected = false;
  
  async connect() {
    console.log('Connecting to database...');
    this.connected = true;
  }
  
  async disconnect() {
    console.log('Disconnecting from database...');
    this.connected = false;
  }
  
  async query(sql: string, params: any[] = []) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    console.log('Executing query:', sql, params);
    // 模拟查询结果
    return { rows: [], affectedRows: 0 };
  }
}

const db = new Database();

// 数据库连接中间件
const dbMiddleware = createMiddleware(
  'database',
  async (request: NextRequest, next: () => Promise<NextResponse>) => {
    try {
      if (!db.connected) {
        await db.connect();
      }
      
      const response = await next();
      return response;
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
  },
  { priority: 95 }
);

const databasePlugin = definePlugin({
  name: 'database-plugin',
  version: '1.0.0',
  description: 'Plugin with database integration',
  routes: {
    '/api/db/users': {
      GET: async (request: NextRequest) => {
        const result = await db.query('SELECT * FROM users');
        return NextResponse.json({ users: result.rows });
      },
      
      POST: async (request: NextRequest) => {
        const body = await request.json();
        const result = await db.query(
          'INSERT INTO users (name, email) VALUES (?, ?)',
          [body.name, body.email]
        );
        
        return NextResponse.json(
          { 
            id: result.insertId,
            message: 'User created successfully'
          },
          { status: 201 }
        );
      }
    }
  },
  
  middlewares: [dbMiddleware],
  
  hooks: {
    onInit: async () => {
      await db.connect();
      console.log('Database plugin initialized');
    },
    
    onDestroy: async () => {
      await db.disconnect();
      console.log('Database plugin destroyed');
    }
  }
});
```

### WebSocket 集成示例

```typescript
import { definePlugin } from '@yai-nextjs/plugin-support';

// 模拟 WebSocket 连接管理
class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  
  addConnection(id: string, ws: WebSocket) {
    this.connections.set(id, ws);
    console.log(`WebSocket connection added: ${id}`);
  }
  
  removeConnection(id: string) {
    this.connections.delete(id);
    console.log(`WebSocket connection removed: ${id}`);
  }
  
  broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((ws, id) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        this.removeConnection(id);
      }
    });
  }
  
  getConnectionCount() {
    return this.connections.size;
  }
}

const wsManager = new WebSocketManager();

const websocketPlugin = definePlugin({
  name: 'websocket-plugin',
  version: '1.0.0',
  description: 'WebSocket integration plugin',
  routes: {
    '/api/ws/broadcast': {
      POST: async (request: NextRequest) => {
        const body = await request.json();
        
        wsManager.broadcast({
          type: 'message',
          data: body,
          timestamp: new Date().toISOString()
        });
        
        return NextResponse.json({
          message: 'Message broadcasted',
          connections: wsManager.getConnectionCount()
        });
      }
    },
    
    '/api/ws/stats': {
      GET: async () => {
        return NextResponse.json({
          connections: wsManager.getConnectionCount(),
          status: 'active'
        });
      }
    }
  }
});
```

## 测试示例

### 插件单元测试

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PluginRegistry } from '@yai-nextjs/plugin-support';
import { NextRequest } from 'next/server';
import { todoPlugin } from './todo-plugin'; // 假设上面的todo插件

describe('TodoPlugin', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    PluginRegistry.reset();
    registry = PluginRegistry.getInstance();
    registry.register(todoPlugin);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('GET /api/todos', () => {
    it('should return empty todos list initially', async () => {
      const match = registry.getHandler('/api/todos', 'GET');
      expect(match).toBeDefined();

      const request = new NextRequest('http://localhost/api/todos');
      const response = await registry.executeRoute(match!, request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.todos).toEqual([]);
    });

    it('should filter todos by completed status', async () => {
      // 先创建一些测试数据
      const createMatch = registry.getHandler('/api/todos', 'POST');
      const createRequest1 = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Todo 1' })
      });
      await registry.executeRoute(createMatch!, createRequest1);

      const createRequest2 = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Todo 2' })
      });
      await registry.executeRoute(createMatch!, createRequest2);

      // 测试过滤
      const match = registry.getHandler('/api/todos', 'GET');
      const request = new NextRequest('http://localhost/api/todos?completed=false');
      const response = await registry.executeRoute(match!, request);
      const data = await response.json();

      expect(data.todos).toHaveLength(2);
      expect(data.todos.every((todo: any) => !todo.completed)).toBe(true);
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const match = registry.getHandler('/api/todos', 'POST');
      const request = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Todo' })
      });

      const response = await registry.executeRoute(match!, request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New Todo');
      expect(data.completed).toBe(false);
      expect(data.id).toBeDefined();
      expect(data.createdAt).toBeDefined();
    });
  });
});
```

### 集成测试示例

```typescript
import { createHandler } from '@yai-nextjs/plugin-support';
import { todoPlugin, blogPlugin } from './plugins';

describe('Full Integration Test', () => {
  const handler = createHandler();

  beforeAll(() => {
    // 插件通常在导入时自动注册
    // 这里我们确保它们已注册
  });

  it('should handle todo and blog operations', async () => {
    // 测试创建 todo
    const createTodoRequest = new NextRequest('http://localhost/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title: 'Integration Test Todo' })
    });

    const todoResponse = await handler.POST(createTodoRequest);
    expect(todoResponse.status).toBe(201);

    // 测试创建 blog post
    const createPostRequest = new NextRequest('http://localhost/api/blog/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Integration Test Post',
        content: 'This is a test post',
        author: 'Test Author'
      })
    });

    const postResponse = await handler.POST(createPostRequest);
    expect(postResponse.status).toBe(201);

    // 验证数据
    const getTodosRequest = new NextRequest('http://localhost/api/todos');
    const todosResponse = await handler.GET(getTodosRequest);
    const todosData = await todosResponse.json();
    expect(todosData.todos).toHaveLength(1);

    const getPostsRequest = new NextRequest('http://localhost/api/blog/posts');
    const postsResponse = await handler.GET(getPostsRequest);
    const postsData = await postsResponse.json();
    expect(postsData.posts).toHaveLength(1);
  });
});