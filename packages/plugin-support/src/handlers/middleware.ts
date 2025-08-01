import { NextRequest, NextResponse } from 'next/server';
import { MiddlewareFunction, MiddlewareConfig } from '../core/types.js';
import { defaultLogger } from '../utils/logger.js';

export interface MiddlewareChainOptions {
  continueOnError?: boolean;
  timeout?: number;
  maxExecutionTime?: number;
}

export class MiddlewareChain {
  private middlewares: MiddlewareFunction[] = [];
  private options: MiddlewareChainOptions;

  constructor(options: MiddlewareChainOptions = {}) {
    this.options = {
      continueOnError: options.continueOnError ?? false,
      timeout: options.timeout ?? 30000, // 30 seconds
      maxExecutionTime: options.maxExecutionTime ?? 5000, // 5 seconds per middleware
    };
  }

  add(middleware: MiddlewareFunction | MiddlewareConfig): void {
    if (typeof middleware === 'function') {
      this.middlewares.push(middleware);
    } else {
      this.middlewares.push(middleware.handler);
    }
  }

  remove(middleware: MiddlewareFunction): boolean {
    const index = this.middlewares.indexOf(middleware);
    if (index > -1) {
      this.middlewares.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.middlewares.length = 0;
  }

  async execute(
    request: NextRequest,
    finalHandler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    let currentIndex = 0;
    const startTime = Date.now();

    const next = async (): Promise<NextResponse> => {
      if (Date.now() - startTime > this.options.timeout!) {
        throw new Error('Middleware chain execution timeout');
      }

      if (currentIndex >= this.middlewares.length) {
        return await finalHandler();
      }

      const middleware = this.middlewares[currentIndex++];
      const middlewareStartTime = Date.now();

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Middleware execution timeout after ${this.options.maxExecutionTime}ms`));
          }, this.options.maxExecutionTime);
        });

        const middlewarePromise = middleware(request, next);
        const result = await Promise.race([middlewarePromise, timeoutPromise]);

        const executionTime = Date.now() - middlewareStartTime;
        
        if (process.env.NODE_ENV === 'development') {
          defaultLogger.debug(`Middleware executed`, {
            middleware: (middleware as any).name || 'anonymous',
            executionTime: `${executionTime}ms`,
          });
        }

        return result;
      } catch (error) {
        const executionTime = Date.now() - middlewareStartTime;
        
        defaultLogger.error(`Middleware error`, {
          middleware: (middleware as any).name || 'anonymous',
          executionTime: `${executionTime}ms`,
          error: error instanceof Error ? error.message : String(error),
        });

        if (this.options.continueOnError) {
          return await next();
        } else {
          throw error;
        }
      }
    };

    return await next();
  }

  getMiddlewares(): MiddlewareFunction[] {
    return [...this.middlewares];
  }

  getCount(): number {
    return this.middlewares.length;
  }
}

export function createCorsMiddleware(options: {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
} = {}): MiddlewareFunction {
  return async (request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse> => {
    if (request.method === 'OPTIONS') {
      const headers = new Headers();

      if (typeof options.origin === 'boolean') {
        headers.set('Access-Control-Allow-Origin', options.origin ? '*' : 'null');
      } else if (typeof options.origin === 'string') {
        headers.set('Access-Control-Allow-Origin', options.origin);
      } else if (Array.isArray(options.origin)) {
        const requestOrigin = request.headers.get('origin');
        if (requestOrigin && options.origin.includes(requestOrigin)) {
          headers.set('Access-Control-Allow-Origin', requestOrigin);
        }
      }

      if (options.methods) {
        headers.set('Access-Control-Allow-Methods', options.methods.join(', '));
      }

      if (options.allowedHeaders) {
        headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
      }

      if (options.credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true');
      }

      if (options.maxAge) {
        headers.set('Access-Control-Max-Age', options.maxAge.toString());
      }

      return new NextResponse(null, { status: 204, headers });
    }

    const response = await next();

    if (typeof options.origin === 'boolean') {
      response.headers.set('Access-Control-Allow-Origin', options.origin ? '*' : 'null');
    } else if (typeof options.origin === 'string') {
      response.headers.set('Access-Control-Allow-Origin', options.origin);
    } else if (Array.isArray(options.origin)) {
      const requestOrigin = request.headers.get('origin');
      if (requestOrigin && options.origin.includes(requestOrigin)) {
        response.headers.set('Access-Control-Allow-Origin', requestOrigin);
      }
    }

    if (options.exposedHeaders && options.exposedHeaders.length > 0) {
      response.headers.set('Access-Control-Expose-Headers', options.exposedHeaders.join(', '));
    }

    if (options.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  };
}

export function createLoggingMiddleware(options: {
  logRequests?: boolean;
  logResponses?: boolean;
  includeBody?: boolean;
  includeHeaders?: boolean;
} = {}): MiddlewareFunction {
  const {
    logRequests = true,
    logResponses = true,
    includeBody = false,
    includeHeaders = false,
  } = options;

  return async (request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);

    if (logRequests) {
      const requestLog: any = {
        method: request.method,
        url: url.pathname + url.search,
        timestamp: new Date().toISOString(),
      };

      if (includeHeaders) {
        requestLog.headers = Object.fromEntries(request.headers.entries());
      }

      if (includeBody && request.body) {
        try {
          const body = await request.text();
          requestLog.body = body;
          request = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: body,
          });
        } catch (error) {
          defaultLogger.warn('Failed to read request body for logging', error);
        }
      }

      defaultLogger.info('Request received', requestLog);
    }

    const response = await next();
    const executionTime = Date.now() - startTime;

    if (logResponses) {
      const responseLog: any = {
        method: request.method,
        url: url.pathname + url.search,
        status: response.status,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
      };

      if (includeHeaders) {
        responseLog.headers = Object.fromEntries(response.headers.entries());
      }

      defaultLogger.info('Response sent', responseLog);
    }

    return response;
  };
}

export function createAuthMiddleware(options: {
  validateToken: (token: string) => Promise<boolean> | boolean;
  extractToken?: (request: NextRequest) => string | null;
  unauthorizedResponse?: () => NextResponse;
} = {} as any): MiddlewareFunction {
  const extractToken = options.extractToken || ((request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  });

  const unauthorizedResponse = options.unauthorizedResponse || (() => {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  });

  return async (request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse> => {
    const token = extractToken(request);
    
    if (!token) {
      return unauthorizedResponse();
    }

    try {
      const isValid = await options.validateToken(token);
      if (!isValid) {
        return unauthorizedResponse();
      }
    } catch (error) {
      defaultLogger.error('Token validation error', error);
      return unauthorizedResponse();
    }

    return await next();
  };
}

export function createRateLimitMiddleware(options: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (request: NextRequest) => string;
  store?: Map<string, { count: number; resetTime: number }>;
  rateLimitResponse?: () => NextResponse;
} = {}): MiddlewareFunction {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    store = new Map(),
    keyGenerator = (request: NextRequest) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
      return ip;
    },
    rateLimitResponse = () => new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    ),
  } = options;

  return async (request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse> => {
    const key = keyGenerator(request);
    const now = Date.now();
    
    let entry = store.get(key);
    
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
    }
    
    entry.count++;
    store.set(key, entry);
    
    if (entry.count > maxRequests) {
      return rateLimitResponse();
    }
    
    const response = await next();
    
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
    
    return response;
  };
}