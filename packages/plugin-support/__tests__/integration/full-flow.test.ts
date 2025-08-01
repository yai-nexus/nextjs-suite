import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { PluginRegistry } from '../../src/core/registry.js';
import { PluginRouter } from '../../src/core/router.js';
import { createHandler } from '../../src/handlers/create-handler.js';
import { definePlugin, createMiddleware } from '../../src/core/types.js';

describe('Full Flow Integration', () => {
  let registry: PluginRegistry;
  let router: PluginRouter;

  beforeEach(() => {
    PluginRegistry.reset();
    registry = PluginRegistry.getInstance();
    router = new PluginRouter(registry);
  });

  afterEach(() => {
    registry.clear();
  });

  it('should handle complete plugin lifecycle', async () => {
    const executionLog: string[] = [];

    // Create middleware
    const loggingMiddleware = createMiddleware(
      'logging',
      async (request, next) => {
        executionLog.push('middleware-start');
        const response = await next();
        executionLog.push('middleware-end');
        return response;
      },
      { priority: 10 }
    );

    // Create plugin with hooks
    const testPlugin = definePlugin({
      name: 'integration-test-plugin',
      version: '1.0.0',
      description: 'Integration test plugin',
      routes: {
        '/api/users': {
          GET: async (request) => {
            executionLog.push('route-handler');
            const url = new URL(request.url);
            const limit = url.searchParams.get('limit') || '10';
            return NextResponse.json({
              users: [],
              limit: parseInt(limit),
            });
          },
          POST: async (request) => {
            const body = await request.json();
            executionLog.push('create-user');
            return NextResponse.json({
              id: '1',
              ...body,
              createdAt: new Date().toISOString(),
            }, { status: 201 });
          },
        },
        '/api/users/:id': {
          GET: async (request) => {
            const url = new URL(request.url);
            const id = url.pathname.split('/').pop();
            executionLog.push(`get-user-${id}`);
            return NextResponse.json({
              id,
              name: `User ${id}`,
            });
          },
        },
      },
      middlewares: [loggingMiddleware],
      hooks: {
        onInit: () => {
          executionLog.push('plugin-init');
        },
        onRouteRegister: (path, method) => {
          executionLog.push(`route-registered-${method}-${path}`);
        },
        onRequest: async (request) => {
          executionLog.push('hook-request');
        },
      },
    });

    // Register plugin
    registry.register(testPlugin);

    // Verify plugin initialization
    expect(executionLog).toContain('plugin-init');
    expect(executionLog).toContain('route-registered-GET-/api/users');
    expect(executionLog).toContain('route-registered-POST-/api/users');
    expect(executionLog).toContain('route-registered-GET-/api/users/:id');

    // Test GET /api/users
    const getUsersRequest = new NextRequest('http://localhost/api/users?limit=5');
    const getUsersResponse = await router.handle(getUsersRequest);
    const getUsersData = await getUsersResponse.json();

    expect(getUsersResponse.status).toBe(200);
    expect(getUsersData.limit).toBe(5);
    expect(executionLog).toContain('middleware-start');
    expect(executionLog).toContain('route-handler');
    expect(executionLog).toContain('middleware-end');

    // Clear execution log for next test
    executionLog.length = 0;

    // Test POST /api/users
    const createUserRequest = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const createUserResponse = await router.handle(createUserRequest);
    const createUserData = await createUserResponse.json();

    expect(createUserResponse.status).toBe(201);
    expect(createUserData.name).toBe('John Doe');
    expect(createUserData.email).toBe('john@example.com');
    expect(createUserData.id).toBe('1');
    expect(executionLog).toContain('create-user');

    // Clear execution log for next test
    executionLog.length = 0;

    // Test GET /api/users/:id with parameter extraction
    const getUserRequest = new NextRequest('http://localhost/api/users/123');
    const getUserResponse = await router.handle(getUserRequest);
    const getUserData = await getUserResponse.json();

    expect(getUserResponse.status).toBe(200);
    expect(getUserData.id).toBe('123');
    expect(getUserData.name).toBe('User 123');
    expect(executionLog).toContain('get-user-123');

    // Test plugin statistics
    const stats = registry.getStats();
    expect(stats.totalPlugins).toBe(1);
    expect(stats.enabledPlugins).toBe(1);
    expect(stats.totalRoutes).toBe(3);
    expect(stats.totalMiddlewares).toBe(1);

    // Test plugin disable/enable
    registry.disablePlugin('integration-test-plugin');
    const disabledRequest = new NextRequest('http://localhost/api/users');
    const disabledResponse = await router.handle(disabledRequest);
    expect(disabledResponse.status).toBe(503);

    registry.enablePlugin('integration-test-plugin');
    const enabledRequest = new NextRequest('http://localhost/api/users');
    const enabledResponse = await router.handle(enabledRequest);
    expect(enabledResponse.status).toBe(200);

    // Test plugin unregistration
    const unregistered = registry.unregister('integration-test-plugin');
    expect(unregistered).toBe(true);

    const notFoundRequest = new NextRequest('http://localhost/api/users');
    const notFoundResponse = await router.handle(notFoundRequest);
    expect(notFoundResponse.status).toBe(404);
  });

  it('should handle multiple plugins with route conflicts', () => {
    const plugin1 = definePlugin({
      name: 'plugin1',
      version: '1.0.0',
      routes: {
        '/api/shared': {
          GET: async () => new NextResponse('plugin1'),
        },
      },
    });

    const plugin2 = definePlugin({
      name: 'plugin2',
      version: '1.0.0',
      routes: {
        '/api/shared': {
          GET: async () => new NextResponse('plugin2'), // Conflict!
        },
      },
    });

    registry.register(plugin1);

    expect(() => registry.register(plugin2)).toThrow();
  });

  it('should handle middleware execution order', async () => {
    const executionOrder: string[] = [];

    const middleware1 = createMiddleware(
      'middleware1',
      async (request, next) => {
        executionOrder.push('middleware1-start');
        const response = await next();
        executionOrder.push('middleware1-end');
        return response;
      },
      { priority: 10 }
    );

    const middleware2 = createMiddleware(
      'middleware2',
      async (request, next) => {
        executionOrder.push('middleware2-start');
        const response = await next();
        executionOrder.push('middleware2-end');
        return response;
      },
      { priority: 20 } // Higher priority, should execute first
    );

    const testPlugin = definePlugin({
      name: 'middleware-test',
      version: '1.0.0',
      routes: {
        '/api/test': {
          GET: async () => {
            executionOrder.push('handler');
            return new NextResponse('test');
          },
        },
      },
      middlewares: [middleware1, middleware2],
    });

    registry.register(testPlugin);

    const request = new NextRequest('http://localhost/api/test');
    await router.handle(request);

    // Higher priority middleware should execute first
    expect(executionOrder).toEqual([
      'middleware2-start',
      'middleware1-start',
      'handler',
      'middleware1-end',
      'middleware2-end',
    ]);
  });

  it('should use createHandler with full integration', async () => {
    const testPlugin = definePlugin({
      name: 'handler-test',
      version: '1.0.0',
      routes: {
        '/api/handler-test': {
          GET: async () => new NextResponse('handler test'),
          POST: async (request) => {
            const body = await request.json();
            return NextResponse.json({ echo: body });
          },
        },
      },
    });

    registry.register(testPlugin);

    const handler = createHandler({
      registry,
      enableCors: true,
      corsOptions: {
        origin: 'http://localhost:3000',
      },
    });

    // Test GET
    const getRequest = new NextRequest('http://localhost/api/handler-test');
    const getResponse = await handler.GET(getRequest);
    expect(await getResponse.text()).toBe('handler test');

    // Test POST
    const postRequest = new NextRequest('http://localhost/api/handler-test', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const postResponse = await handler.POST(postRequest);
    const postData = await postResponse.json();
    expect(postData.echo.message).toBe('hello');

    // Test CORS
    const corsRequest = new NextRequest('http://localhost/api/handler-test', {
      method: 'OPTIONS',
    });
    const corsResponse = await handler.OPTIONS(corsRequest);
    expect(corsResponse.status).toBe(204);
    expect(corsResponse.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });
});