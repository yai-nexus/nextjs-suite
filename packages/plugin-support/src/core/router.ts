import { NextRequest, NextResponse } from 'next/server';
import { PluginRegistry } from './registry.js';
import { HttpMethod, PluginRouteError } from './types.js';
import { debugCollector, debugMiddlewareExecution, debugError } from '../utils/debug.js';
import { defaultLogger } from '../utils/logger.js';

export interface RouterOptions {
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

export class PluginRouter {
  private registry: PluginRegistry;
  private options: RouterOptions;

  constructor(registry?: PluginRegistry, options: RouterOptions = {}) {
    this.registry = registry || PluginRegistry.getInstance();
    this.options = {
      enableMiddleware: options.enableMiddleware ?? true,
      enableCors: options.enableCors ?? true,
      corsOptions: {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: [],
        credentials: true,
        maxAge: 86400,
        ...options.corsOptions,
      },
      errorHandler: options.errorHandler || this.defaultErrorHandler.bind(this),
    };
  }

  async handle(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method as HttpMethod;

      if (this.options.enableCors && method === 'OPTIONS') {
        return this.handleCors(request);
      }

      const match = this.registry.getHandler(path, method);
      
      if (!match) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Not Found',
            message: `No handler found for ${method} ${path}`,
          }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (!match.plugin.enabled) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Plugin Disabled',
            message: `Plugin '${match.plugin.name}' is currently disabled`,
          }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      let response: NextResponse;

      if (this.options.enableMiddleware && match.middlewares.length > 0) {
        response = await this.executeWithMiddleware(match, request);
      } else {
        response = await this.registry.executeRoute(match, request);
      }

      if (this.options.enableCors) {
        response = this.applyCorsHeaders(response, request);
      }

      const executionTime = Date.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        debugCollector.info(`Request handled successfully`, {
          method,
          path,
          plugin: match.plugin.name,
          status: response.status,
          executionTime: `${executionTime}ms`,
        });
      }

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        debugError(error as Error, {
          path: new URL(request.url).pathname,
          method: request.method as HttpMethod,
        });
      }

      return this.options.errorHandler!(error as Error, request);
    }
  }

  private async executeWithMiddleware(
    match: any,
    request: NextRequest
  ): Promise<NextResponse> {
    let currentIndex = 0;
    
    const next = async (): Promise<NextResponse> => {
      if (currentIndex >= match.middlewares.length) {
        return await this.registry.executeRoute(match, request);
      }

      const middleware = match.middlewares[currentIndex++];
      const startTime = Date.now();
      
      try {
        const result = await middleware(request, next);
        
        const executionTime = Date.now() - startTime;
        
        if (process.env.NODE_ENV === 'development') {
          debugMiddlewareExecution(
            (middleware as any).name || 'anonymous',
            new URL(request.url).pathname,
            request.method as HttpMethod,
            executionTime
          );
        }
        
        return result;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          debugError(error as Error, {
            plugin: match.plugin.name,
            path: request.url,
            method: request.method as HttpMethod,
          });
        }
        throw error;
      }
    };

    return await next();
  }

  private handleCors(request: NextRequest): NextResponse {
    const { corsOptions } = this.options;
    const headers = new Headers();

    if (typeof corsOptions!.origin === 'boolean') {
      headers.set('Access-Control-Allow-Origin', corsOptions!.origin ? '*' : 'null');
    } else if (typeof corsOptions!.origin === 'string') {
      headers.set('Access-Control-Allow-Origin', corsOptions!.origin);
    } else if (Array.isArray(corsOptions!.origin)) {
      const requestOrigin = request.headers.get('origin');
      if (requestOrigin && corsOptions!.origin.includes(requestOrigin)) {
        headers.set('Access-Control-Allow-Origin', requestOrigin);
      }
    }

    if (corsOptions!.methods) {
      headers.set('Access-Control-Allow-Methods', corsOptions!.methods.join(', '));
    }

    if (corsOptions!.allowedHeaders) {
      headers.set('Access-Control-Allow-Headers', corsOptions!.allowedHeaders.join(', '));
    }

    if (corsOptions!.exposedHeaders && corsOptions!.exposedHeaders.length > 0) {
      headers.set('Access-Control-Expose-Headers', corsOptions!.exposedHeaders.join(', '));
    }

    if (corsOptions!.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (corsOptions!.maxAge) {
      headers.set('Access-Control-Max-Age', corsOptions!.maxAge.toString());
    }

    return new NextResponse(null, { status: 204, headers });
  }

  private applyCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
    const { corsOptions } = this.options;
    
    if (typeof corsOptions!.origin === 'boolean') {
      response.headers.set('Access-Control-Allow-Origin', corsOptions!.origin ? '*' : 'null');
    } else if (typeof corsOptions!.origin === 'string') {
      response.headers.set('Access-Control-Allow-Origin', corsOptions!.origin);
    } else if (Array.isArray(corsOptions!.origin)) {
      const requestOrigin = request.headers.get('origin');
      if (requestOrigin && corsOptions!.origin.includes(requestOrigin)) {
        response.headers.set('Access-Control-Allow-Origin', requestOrigin);
      }
    }

    if (corsOptions!.exposedHeaders && corsOptions!.exposedHeaders.length > 0) {
      response.headers.set('Access-Control-Expose-Headers', corsOptions!.exposedHeaders.join(', '));
    }

    if (corsOptions!.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  }

  private defaultErrorHandler(error: Error, request: NextRequest): NextResponse {
    const url = new URL(request.url);
    
    defaultLogger.error(`Router error for ${request.method} ${url.pathname}:`, error);

    if (error instanceof PluginRouteError) {
      return new NextResponse(
        JSON.stringify({
          error: error.name,
          message: error.message,
          code: error.code,
          plugin: error.pluginName,
        }),
        {
          status: error.statusCode || 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: error.stack }),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  setRegistry(registry: PluginRegistry): void {
    this.registry = registry;
  }

  getRegistry(): PluginRegistry {
    return this.registry;
  }

  updateOptions(options: Partial<RouterOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (options.corsOptions) {
      this.options.corsOptions = { ...this.options.corsOptions, ...options.corsOptions };
    }
  }
}