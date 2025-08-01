import { createHandler } from '@yai-nextjs/plugin-support';

// 导入插件以确保它们被注册
import '@yai-nextjs/blog-plugin';
import '@yai-nextjs/user-plugin';

const handler = createHandler({
  enableMiddleware: true,
  enableCors: true,
  corsOptions: {
    origin: process.env.NODE_ENV === 'development' ? true : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
export const PATCH = handler.PATCH;
export const HEAD = handler.HEAD;
export const OPTIONS = handler.OPTIONS;