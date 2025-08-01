import { describe, it, expect } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import {
  definePlugin,
  createRouteHandler,
  createMiddleware,
  PluginValidationError,
  PluginRegistrationError,
  PluginRouteError,
} from '../../src/core/types.js';

describe('Types', () => {
  describe('definePlugin', () => {
    it('should create plugin with default values', () => {
      const plugin = definePlugin({
        name: 'test-plugin',
        version: '1.0.0',
        routes: {
          '/api/test': {
            GET: async () => new NextResponse('test'),
          },
        },
      });

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.enabled).toBe(true);
      expect(plugin.createdAt).toBeInstanceOf(Date);
    });

    it('should preserve provided metadata', () => {
      const plugin = definePlugin({
        name: 'test-plugin',
        version: '2.0.0',
        description: 'Test description',
        author: 'Test Author',
        keywords: ['test', 'plugin'],
        routes: {
          '/api/test': {
            GET: async () => new NextResponse('test'),
          },
        },
      });

      expect(plugin.description).toBe('Test description');
      expect(plugin.author).toBe('Test Author');
      expect(plugin.keywords).toEqual(['test', 'plugin']);
    });
  });

  describe('createRouteHandler', () => {
    it('should create a route handler with context', async () => {
      const handler = createRouteHandler(async (request, context) => {
        expect(context.request).toBe(request);
        expect(context.params).toBeDefined();
        expect(context.searchParams).toBeDefined();
        return new NextResponse('handled');
      });

      const request = new NextRequest('http://localhost/api/test?param=value');
      const response = await handler(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(await response.text()).toBe('handled');
    });
  });

  describe('createMiddleware', () => {
    it('should create middleware with default options', () => {
      const middleware = createMiddleware(
        'test-middleware',
        async (request, next) => {
          return await next();
        }
      );

      expect(middleware.name).toBe('test-middleware');
      expect(middleware.priority).toBe(0);
      expect(middleware.routes).toBeUndefined();
      expect(typeof middleware.handler).toBe('function');
    });

    it('should create middleware with custom options', () => {
      const middleware = createMiddleware(
        'test-middleware',
        async (request, next) => {
          return await next();
        },
        {
          priority: 10,
          routes: ['/api/protected'],
        }
      );

      expect(middleware.priority).toBe(10);
      expect(middleware.routes).toEqual(['/api/protected']);
    });
  });

  describe('Error Classes', () => {
    describe('PluginValidationError', () => {
      it('should create error with correct properties', () => {
        const error = new PluginValidationError(
          'test-plugin',
          'Validation failed',
          'VALIDATION_ERROR',
          400
        );

        expect(error.name).toBe('PluginValidationError');
        expect(error.pluginName).toBe('test-plugin');
        expect(error.message).toBe('Validation failed');
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.statusCode).toBe(400);
      });

      it('should use default values', () => {
        const error = new PluginValidationError('test-plugin', 'Validation failed');

        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.statusCode).toBe(400);
      });
    });

    describe('PluginRegistrationError', () => {
      it('should create error with correct properties', () => {
        const error = new PluginRegistrationError(
          'test-plugin',
          'Registration failed',
          'REGISTRATION_ERROR',
          500
        );

        expect(error.name).toBe('PluginRegistrationError');
        expect(error.pluginName).toBe('test-plugin');
        expect(error.message).toBe('Registration failed');
        expect(error.code).toBe('REGISTRATION_ERROR');
        expect(error.statusCode).toBe(500);
      });
    });

    describe('PluginRouteError', () => {
      it('should create error with correct properties', () => {
        const error = new PluginRouteError(
          'test-plugin',
          'Route not found',
          'ROUTE_ERROR',
          404
        );

        expect(error.name).toBe('PluginRouteError');
        expect(error.pluginName).toBe('test-plugin');
        expect(error.message).toBe('Route not found');
        expect(error.code).toBe('ROUTE_ERROR');
        expect(error.statusCode).toBe(404);
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety for route handlers', async () => {
      interface TestRequest {
        name: string;
      }

      interface TestResponse {
        message: string;
      }

      const handler = createRouteHandler<TestRequest, TestResponse>(
        async (request, context) => {
          // Type checking would occur at compile time
          return new NextResponse(JSON.stringify({ message: 'success' }));
        }
      );

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      });

      const response = await handler(request);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle different HTTP methods', () => {
      const routes = {
        '/api/test': {
          GET: async () => new NextResponse('get'),
          POST: async () => new NextResponse('post'),
          PUT: async () => new NextResponse('put'),
          DELETE: async () => new NextResponse('delete'),
          PATCH: async () => new NextResponse('patch'),
          HEAD: async () => new NextResponse('head'),
          OPTIONS: async () => new NextResponse('options'),
        },
      };

      const plugin = definePlugin({
        name: 'test-plugin',
        version: '1.0.0',
        routes,
      });

      expect(Object.keys(plugin.routes['/api/test'])).toHaveLength(7);
    });
  });
});