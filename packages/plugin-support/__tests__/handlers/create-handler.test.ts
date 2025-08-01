import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { createHandler } from '../../src/handlers/create-handler.js';
import { PluginRegistry } from '../../src/core/registry.js';
import { definePlugin } from '../../src/core/types.js';

describe('createHandler', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    PluginRegistry.reset();
    registry = PluginRegistry.getInstance();
  });

  afterEach(() => {
    registry.clear();
  });

  it('should create handler with all HTTP methods', () => {
    const handler = createHandler();

    expect(typeof handler.GET).toBe('function');
    expect(typeof handler.POST).toBe('function');
    expect(typeof handler.PUT).toBe('function');
    expect(typeof handler.DELETE).toBe('function');
    expect(typeof handler.PATCH).toBe('function');
    expect(typeof handler.HEAD).toBe('function');
    expect(typeof handler.OPTIONS).toBe('function');
  });

  it('should handle GET requests', async () => {
    const testPlugin = definePlugin({
      name: 'test-plugin',
      version: '1.0.0',
      routes: {
        '/api/test': {
          GET: async () => new NextResponse('GET response'),
        },
      },
    });

    registry.register(testPlugin);

    const handler = createHandler({ registry });
    const request = new NextRequest('http://localhost/api/test', { method: 'GET' });
    
    const response = await handler.GET(request);
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(await response.text()).toBe('GET response');
  });

  it('should handle POST requests', async () => {
    const testPlugin = definePlugin({
      name: 'test-plugin',
      version: '1.0.0',
      routes: {
        '/api/test': {
          POST: async (request) => {
            const body = await request.json();
            return NextResponse.json({ received: body });
          },
        },
      },
    });

    registry.register(testPlugin);

    const handler = createHandler({ registry });
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ message: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const response = await handler.POST(request);
    const responseData = await response.json();
    
    expect(response).toBeInstanceOf(NextResponse);
    expect(responseData.received.message).toBe('test');
  });

  it('should return 404 for non-existent routes', async () => {
    const handler = createHandler({ registry });
    const request = new NextRequest('http://localhost/api/nonexistent', { method: 'GET' });
    
    const response = await handler.GET(request);
    const responseData = await response.json();
    
    expect(response.status).toBe(404);
    expect(responseData.error).toBe('Not Found');
  });

  it('should handle CORS preflight requests', async () => {
    const handler = createHandler({
      registry,
      enableCors: true,
      corsOptions: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    const request = new NextRequest('http://localhost/api/test', { method: 'OPTIONS' });
    
    const response = await handler.OPTIONS(request);
    
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('should handle disabled plugins', async () => {
    const testPlugin = definePlugin({
      name: 'test-plugin',
      version: '1.0.0',
      routes: {
        '/api/test': {
          GET: async () => new NextResponse('test'),
        },
      },
    });

    registry.register(testPlugin);
    registry.disablePlugin('test-plugin');

    const handler = createHandler({ registry });
    const request = new NextRequest('http://localhost/api/test', { method: 'GET' });
    
    const response = await handler.GET(request);
    const responseData = await response.json();
    
    expect(response.status).toBe(503);
    expect(responseData.error).toBe('Plugin Disabled');
  });

  it('should use custom error handler', async () => {
    const customErrorHandler = (error: Error) => {
      return new NextResponse('Custom error: ' + error.message, { status: 500 });
    };

    const testPlugin = definePlugin({
      name: 'test-plugin',
      version: '1.0.0',
      routes: {
        '/api/test': {
          GET: async () => {
            throw new Error('Test error');
          },
        },
      },
    });

    registry.register(testPlugin);

    const handler = createHandler({
      registry,
      errorHandler: customErrorHandler,
    });

    const request = new NextRequest('http://localhost/api/test', { method: 'GET' });
    
    const response = await handler.GET(request);
    
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Custom error: Test error');
  });

  it('should handle middleware when enabled', async () => {
    let middlewareExecuted = false;

    const testPlugin = definePlugin({
      name: 'test-plugin',
      version: '1.0.0',
      routes: {
        '/api/test': {
          GET: async () => new NextResponse('test'),
        },
      },
      middlewares: [
        {
          name: 'test-middleware',
          handler: async (request, next) => {
            middlewareExecuted = true;
            return await next();
          },
        },
      ],
    });

    registry.register(testPlugin);

    const handler = createHandler({
      registry,
      enableMiddleware: true,
    });

    const request = new NextRequest('http://localhost/api/test', { method: 'GET' });
    
    await handler.GET(request);
    
    expect(middlewareExecuted).toBe(true);
  });

  it('should skip middleware when disabled', async () => {
    let middlewareExecuted = false;

    const testPlugin = definePlugin({
      name: 'test-plugin',
      version: '1.0.0',
      routes: {
        '/api/test': {
          GET: async () => new NextResponse('test'),
        },
      },
      middlewares: [
        {
          name: 'test-middleware',
          handler: async (request, next) => {
            middlewareExecuted = true;
            return await next();
          },
        },
      ],
    });

    registry.register(testPlugin);

    const handler = createHandler({
      registry,
      enableMiddleware: false,
    });

    const request = new NextRequest('http://localhost/api/test', { method: 'GET' });
    
    await handler.GET(request);
    
    expect(middlewareExecuted).toBe(false);
  });
});