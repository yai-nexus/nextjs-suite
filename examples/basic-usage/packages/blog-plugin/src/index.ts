import { NextRequest, NextResponse } from 'next/server';
import { definePlugin, PluginRegistry } from '@yai-nextjs/plugin-support';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

let posts: BlogPost[] = [
  {
    id: '1',
    title: '第一篇博客文章',
    content: '这是一篇使用插件系统创建的示例博客文章。',
    author: 'Demo User',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Next.js 插件系统介绍',
    content: '本文介绍如何使用 @yai-nextjs/plugin-support 构建可扩展的 Next.js 应用。',
    author: 'Technical Writer',
    createdAt: '2024-01-02T14:30:00Z',
    updatedAt: '2024-01-02T14:30:00Z',
  },
];

async function getPosts(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  
  const paginatedPosts = posts.slice(offset, offset + limit);
  
  return NextResponse.json({
    posts: paginatedPosts,
    total: posts.length,
    limit,
    offset,
  });
}

async function createPost(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { title, content, author } = body;
    
    if (!title || !content || !author) {
      return NextResponse.json(
        { error: 'Title, content, and author are required' },
        { status: 400 }
      );
    }
    
    const newPost: BlogPost = {
      id: Date.now().toString(),
      title,
      content,
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    posts.push(newPost);
    
    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }
}

async function getPost(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  
  const post = posts.find(p => p.id === id);
  
  if (!post) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(post);
}

async function updatePost(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    const postIndex = posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { title, content, author } = body;
    
    posts[postIndex] = {
      ...posts[postIndex],
      ...(title && { title }),
      ...(content && { content }),
      ...(author && { author }),
      updatedAt: new Date().toISOString(),
    };
    
    return NextResponse.json(posts[postIndex]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }
}

async function deletePost(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  
  const postIndex = posts.findIndex(p => p.id === id);
  
  if (postIndex === -1) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    );
  }
  
  posts.splice(postIndex, 1);
  
  return NextResponse.json({ success: true });
}

const blogPlugin = definePlugin({
  name: 'blog-plugin',
  version: '1.0.0',
  description: '博客插件 - 提供博客文章的 CRUD 操作',
  author: 'YAI Team',
  keywords: ['blog', 'cms', 'content'],
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
  hooks: {
    onInit: () => {
      console.log('Blog plugin initialized');
    },
    onRouteRegister: (path: string, method: string) => {
      console.log(`Blog route registered: ${method} ${path}`);
    },
  },
});

// 自动注册插件
const registry = PluginRegistry.getInstance();
registry.register(blogPlugin);

export default blogPlugin;
export { BlogPost };