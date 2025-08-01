import { NextRequest, NextResponse } from 'next/server';
import { PluginRouter } from '../core/router.js';
import { PluginRegistry } from '../core/registry.js';

export interface CreateHandlerOptions {
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

export function createHandler(options: CreateHandlerOptions = {}) {
  const registry = options.registry || PluginRegistry.getInstance();
  const router = new PluginRouter(registry, {
    enableMiddleware: options.enableMiddleware,
    enableCors: options.enableCors,
    corsOptions: options.corsOptions as any,
    errorHandler: options.errorHandler,
  });

  return {
    async GET(request: NextRequest): Promise<NextResponse> {
      return router.handle(request);
    },

    async POST(request: NextRequest): Promise<NextResponse> {
      return router.handle(request);
    },

    async PUT(request: NextRequest): Promise<NextResponse> {
      return router.handle(request);
    },

    async DELETE(request: NextRequest): Promise<NextResponse> {
      return router.handle(request);
    },

    async PATCH(request: NextRequest): Promise<NextResponse> {
      return router.handle(request);
    },

    async HEAD(request: NextRequest): Promise<NextResponse> {
      return router.handle(request);
    },

    async OPTIONS(request: NextRequest): Promise<NextResponse> {
      return router.handle(request);
    },
  };
}

export function createApiHandler(options: CreateHandlerOptions = {}) {
  return createHandler(options);
}