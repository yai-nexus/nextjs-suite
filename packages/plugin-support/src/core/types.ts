import { NextRequest, NextResponse } from 'next/server';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface RouteHandler<TRequest = any, TResponse = any> {
  (request: NextRequest & { body?: TRequest }): Promise<NextResponse> | NextResponse;
}

export interface RouteConfig {
  [path: string]: {
    [K in HttpMethod]?: RouteHandler<any, any>;
  };
}

export interface MiddlewareFunction {
  (request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse>;
}

export interface MiddlewareConfig {
  name: string;
  handler: MiddlewareFunction;
  priority?: number;
  routes?: string[];
}

export interface PluginHooks {
  onInit?: () => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
  onRouteRegister?: (path: string, method: HttpMethod) => void;
  onRouteUnregister?: (path: string, method: HttpMethod) => void;
  onRequest?: (request: NextRequest) => void | Promise<void>;
  onResponse?: (response: NextResponse) => void | Promise<void>;
  onError?: (error: Error, request: NextRequest) => void | Promise<void>;
}

export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: string[];
  createdAt: Date;
  enabled: boolean;
}

export interface PluginConfig extends PluginMetadata {
  routes: RouteConfig;
  middlewares?: MiddlewareConfig[];
  hooks?: PluginHooks;
}

export interface PluginContext {
  request: NextRequest;
  params: Record<string, string>;
  searchParams: URLSearchParams;
  headers: Headers;
  cookies: Record<string, string>;
}

export interface RouteMatch {
  plugin: PluginMetadata;
  handler: RouteHandler;
  params: Record<string, string>;
  middlewares: MiddlewareFunction[];
}

export interface PluginRegistryOptions {
  enableDebug?: boolean;
  enableHotReload?: boolean;
  maxPlugins?: number;
  routePrefix?: string;
}

export interface PluginError extends Error {
  pluginName: string;
  code: string;
  statusCode?: number;
  details?: any;
}

export interface PluginStats {
  totalPlugins: number;
  enabledPlugins: number;
  totalRoutes: number;
  totalMiddlewares: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

export function definePlugin<T extends PluginConfig>(config: T): T {
  return {
    ...config,
    createdAt: new Date(),
    enabled: true,
  };
}

export function createRouteHandler<TRequest = any, TResponse = any>(
  handler: (
    request: NextRequest & { body?: TRequest },
    context: PluginContext
  ) => Promise<NextResponse> | NextResponse
): RouteHandler<TRequest, TResponse> {
  return handler as RouteHandler<TRequest, TResponse>;
}

export function createMiddleware(
  name: string,
  handler: MiddlewareFunction,
  options?: {
    priority?: number;
    routes?: string[];
  }
): MiddlewareConfig {
  return {
    name,
    handler,
    priority: options?.priority ?? 0,
    routes: options?.routes,
  };
}

export class PluginValidationError extends Error implements PluginError {
  public readonly pluginName: string;
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    pluginName: string,
    message: string,
    code: string = 'VALIDATION_ERROR',
    statusCode: number = 400
  ) {
    super(message);
    this.name = 'PluginValidationError';
    this.pluginName = pluginName;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class PluginRegistrationError extends Error implements PluginError {
  public readonly pluginName: string;
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    pluginName: string,
    message: string,
    code: string = 'REGISTRATION_ERROR',
    statusCode: number = 500
  ) {
    super(message);
    this.name = 'PluginRegistrationError';
    this.pluginName = pluginName;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class PluginRouteError extends Error implements PluginError {
  public readonly pluginName: string;
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    pluginName: string,
    message: string,
    code: string = 'ROUTE_ERROR',
    statusCode: number = 404
  ) {
    super(message);
    this.name = 'PluginRouteError';
    this.pluginName = pluginName;
    this.code = code;
    this.statusCode = statusCode;
  }
}