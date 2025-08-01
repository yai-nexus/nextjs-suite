import { NextRequest, NextResponse } from 'next/server';
import { definePlugin, PluginRegistry, createMiddleware } from '@yai-nextjs/plugin-support';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

let users: User[] = [
  {
    id: '1',
    username: 'demo_user',
    email: 'demo@example.com',
    name: 'Demo User',
    avatar: 'https://via.placeholder.com/150',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    id: '2',
    username: 'tech_writer',
    email: 'writer@example.com',
    name: 'Technical Writer',
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-01T09:00:00Z',
  },
];

// 日志中间件
const loggingMiddleware = createMiddleware(
  'user-logging',
  async (request: NextRequest, next: () => Promise<NextResponse>) => {
    const start = Date.now();
    const url = new URL(request.url);
    
    console.log(`[User Plugin] ${request.method} ${url.pathname} - Start`);
    
    const response = await next();
    
    const duration = Date.now() - start;
    console.log(`[User Plugin] ${request.method} ${url.pathname} - ${response.status} (${duration}ms)`);
    
    return response;
  },
  { priority: 10 }
);

async function getUsers(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const search = url.searchParams.get('search');
  
  let filteredUsers = users;
  
  if (search) {
    filteredUsers = users.filter(user =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  const paginatedUsers = filteredUsers.slice(offset, offset + limit);
  
  return NextResponse.json({
    users: paginatedUsers,
    total: filteredUsers.length,
    limit,
    offset,
  });
}

async function createUser(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, email, name, avatar } = body;
    
    if (!username || !email || !name) {
      return NextResponse.json(
        { error: 'Username, email, and name are required' },
        { status: 400 }
      );
    }
    
    // 检查用户名和邮箱是否已存在
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      );
    }
    
    const newUser: User = {
      id: Date.now().toString(),
      username,
      email,
      name,
      avatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }
}

async function getUser(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(user);
}

async function updateUser(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { username, email, name, avatar } = body;
    
    // 检查用户名和邮箱冲突（排除当前用户）
    if (username || email) {
      const existingUser = users.find(u => 
        u.id !== id && (u.username === username || u.email === email)
      );
      if (existingUser) {
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 409 }
        );
      }
    }
    
    users[userIndex] = {
      ...users[userIndex],
      ...(username && { username }),
      ...(email && { email }),
      ...(name && { name }),
      ...(avatar !== undefined && { avatar }),
      updatedAt: new Date().toISOString(),
    };
    
    return NextResponse.json(users[userIndex]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }
}

async function deleteUser(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  
  users.splice(userIndex, 1);
  
  return NextResponse.json({ success: true });
}

const userPlugin = definePlugin({
  name: 'user-plugin',
  version: '1.0.0',
  description: '用户插件 - 提供用户管理的 CRUD 操作',
  author: 'YAI Team',
  keywords: ['user', 'auth', 'profile'],
  routes: {
    '/api/users': {
      GET: getUsers,
      POST: createUser,
    },
    '/api/users/:id': {
      GET: getUser,
      PUT: updateUser,
      DELETE: deleteUser,
    },
  },
  middlewares: [loggingMiddleware],
  hooks: {
    onInit: () => {
      console.log('User plugin initialized');
    },
    onRouteRegister: (path: string, method: string) => {
      console.log(`User route registered: ${method} ${path}`);
    },
    onRequest: async (request: NextRequest) => {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/users')) {
        console.log(`User plugin handling request: ${request.method} ${url.pathname}`);
      }
    },
  },
});

// 自动注册插件
const registry = PluginRegistry.getInstance();
registry.register(userPlugin);

export default userPlugin;
export { User };