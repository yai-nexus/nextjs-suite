import { NextRequest, NextResponse } from 'next/server';
import {
  PluginConfig,
  PluginMetadata,
  RouteHandler,
  HttpMethod,
  MiddlewareFunction,
  RouteMatch,
  PluginRegistryOptions,
  PluginStats,
  PluginRegistrationError,
  PluginRouteError,
  PluginContext,
} from './types.js';
import { validatePluginConfig, sanitizePath } from '../utils/validation.js';
import { debugPlugin, debugRouteMatch, debugError, debugCollector } from '../utils/debug.js';
import { defaultLogger } from '../utils/logger.js';

export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins = new Map<string, PluginMetadata>();
  private routes = new Map<string, Map<HttpMethod, RouteHandler>>();
  private middlewares: MiddlewareFunction[] = [];
  private pluginRoutes = new Map<string, Set<string>>();
  private pluginMiddlewares = new Map<string, MiddlewareFunction[]>();
  private options: PluginRegistryOptions;
  private startTime: number;

  private constructor(options: PluginRegistryOptions = {}) {
    this.options = {
      enableDebug: options.enableDebug ?? process.env.NODE_ENV === 'development',
      enableHotReload: options.enableHotReload ?? process.env.NODE_ENV === 'development',
      maxPlugins: options.maxPlugins ?? 100,
      routePrefix: options.routePrefix ?? '/api',
    };
    this.startTime = Date.now();
    
    if (this.options.enableDebug) {
      debugCollector.info('Plugin Registry initialized', this.options);
    }
  }

  static getInstance(options?: PluginRegistryOptions): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry(options);
    }
    return PluginRegistry.instance;
  }

  static reset(): void {
    PluginRegistry.instance = undefined as any;
  }

  register(plugin: PluginConfig): void {
    try {
      this.validateRegistration(plugin);
      
      const metadata: PluginMetadata = {
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        homepage: plugin.homepage,
        repository: plugin.repository,
        keywords: plugin.keywords,
        dependencies: plugin.dependencies,
        createdAt: plugin.createdAt || new Date(),
        enabled: plugin.enabled ?? true,
      };

      this.plugins.set(plugin.name, metadata);
      this.registerRoutes(plugin);
      this.registerMiddlewares(plugin);
      this.executeHook(plugin, 'onInit');

      if (this.options.enableDebug) {
        debugPlugin(plugin);
      }

      defaultLogger.info(`Plugin '${plugin.name}' registered successfully`);
    } catch (error) {
      const pluginError = error instanceof PluginRegistrationError 
        ? error 
        : new PluginRegistrationError(
            plugin.name,
            `Failed to register plugin: ${error instanceof Error ? error.message : String(error)}`
          );
      
      if (this.options.enableDebug) {
        debugError(pluginError, { plugin: plugin.name });
      }
      
      throw pluginError;
    }
  }

  unregister(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return false;
    }

    try {
      this.unregisterRoutes(pluginName);
      this.unregisterMiddlewares(pluginName);
      this.plugins.delete(pluginName);

      if (this.options.enableDebug) {
        debugCollector.info(`Plugin '${pluginName}' unregistered`);
      }

      defaultLogger.info(`Plugin '${pluginName}' unregistered successfully`);
      return true;
    } catch (error) {
      if (this.options.enableDebug) {
        debugError(error as Error, { plugin: pluginName });
      }
      throw error;
    }
  }

  getHandler(path: string, method: HttpMethod): RouteMatch | null {
    const sanitizedPath = sanitizePath(path);
    const routeMap = this.routes.get(sanitizedPath);
    
    if (!routeMap) {
      if (this.options.enableDebug) {
        debugRouteMatch(sanitizedPath, method);
      }
      return null;
    }

    const handler = routeMap.get(method);
    if (!handler) {
      if (this.options.enableDebug) {
        debugRouteMatch(sanitizedPath, method);
      }
      return null;
    }

    const plugin = this.findPluginByRoute(sanitizedPath);
    if (!plugin) {
      throw new PluginRouteError(
        'unknown',
        `Route handler found but plugin not found for path: ${sanitizedPath}`,
        'PLUGIN_NOT_FOUND'
      );
    }

    const middlewares = this.getMiddlewaresForRoute(sanitizedPath);
    const params = this.extractParams(sanitizedPath, path);

    if (this.options.enableDebug) {
      debugRouteMatch(sanitizedPath, method, plugin);
    }

    return {
      plugin,
      handler,
      params,
      middlewares,
    };
  }

  async executeRoute(
    match: RouteMatch,
    request: NextRequest
  ): Promise<NextResponse> {
    const startTime = Date.now();
    
    try {
      const context: PluginContext = {
        request,
        params: match.params,
        searchParams: new URL(request.url).searchParams,
        headers: request.headers,
        cookies: this.parseCookies(request.headers.get('cookie') || ''),
      };

      let response = match.handler(request);
      if (response instanceof Promise) {
        response = await response;
      }

      const executionTime = Date.now() - startTime;
      
      if (this.options.enableDebug) {
        debugCollector.debug(`Route executed successfully`, {
          plugin: match.plugin.name,
          executionTime: `${executionTime}ms`,
        });
      }

      return response;
    } catch (error) {
      if (this.options.enableDebug) {
        debugError(error as Error, {
          plugin: match.plugin.name,
        });
      }
      
      throw error;
    }
  }

  getPlugin(name: string): PluginMetadata | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.enabled);
  }

  getStats(): PluginStats {
    const enabledPlugins = this.getEnabledPlugins();
    const totalRoutes = Array.from(this.routes.values())
      .reduce((sum, routeMap) => sum + routeMap.size, 0);

    return {
      totalPlugins: this.plugins.size,
      enabledPlugins: enabledPlugins.length,
      totalRoutes,
      totalMiddlewares: this.middlewares.length,
      memoryUsage: process.memoryUsage(),
      uptime: Date.now() - this.startTime,
    };
  }

  enablePlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    plugin.enabled = true;
    this.plugins.set(name, plugin);
    
    if (this.options.enableDebug) {
      debugCollector.info(`Plugin '${name}' enabled`);
    }
    
    return true;
  }

  disablePlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    plugin.enabled = false;
    this.plugins.set(name, plugin);
    
    if (this.options.enableDebug) {
      debugCollector.info(`Plugin '${name}' disabled`);
    }
    
    return true;
  }

  clear(): void {
    this.plugins.clear();
    this.routes.clear();
    this.middlewares.length = 0;
    this.pluginRoutes.clear();
    this.pluginMiddlewares.clear();
    
    if (this.options.enableDebug) {
      debugCollector.info('Plugin registry cleared');
    }
  }

  private validateRegistration(plugin: PluginConfig): void {
    if (this.plugins.size >= this.options.maxPlugins!) {
      throw new PluginRegistrationError(
        plugin.name,
        `Maximum number of plugins (${this.options.maxPlugins}) exceeded`,
        'MAX_PLUGINS_EXCEEDED'
      );
    }

    if (this.plugins.has(plugin.name)) {
      throw new PluginRegistrationError(
        plugin.name,
        `Plugin with name '${plugin.name}' is already registered`,
        'PLUGIN_ALREADY_EXISTS'
      );
    }

    validatePluginConfig(plugin);
  }

  private registerRoutes(plugin: PluginConfig): void {
    const pluginRoutePaths = new Set<string>();
    
    for (const [path, methods] of Object.entries(plugin.routes)) {
      const sanitizedPath = sanitizePath(path);
      pluginRoutePaths.add(sanitizedPath);
      
      if (!this.routes.has(sanitizedPath)) {
        this.routes.set(sanitizedPath, new Map());
      }
      
      const routeMap = this.routes.get(sanitizedPath)!;
      
      for (const [method, handler] of Object.entries(methods)) {
        const httpMethod = method as HttpMethod;
        
        if (routeMap.has(httpMethod)) {
          throw new PluginRegistrationError(
            plugin.name,
            `Route conflict: ${httpMethod} ${sanitizedPath} is already registered`,
            'ROUTE_CONFLICT'
          );
        }
        
        routeMap.set(httpMethod, handler);
        this.executeHook(plugin, 'onRouteRegister', sanitizedPath, httpMethod);
      }
    }
    
    this.pluginRoutes.set(plugin.name, pluginRoutePaths);
  }

  private registerMiddlewares(plugin: PluginConfig): void {
    if (!plugin.middlewares) return;

    const pluginMiddlewares: MiddlewareFunction[] = [];
    
    for (const middlewareConfig of plugin.middlewares) {
      this.middlewares.push(middlewareConfig.handler);
      pluginMiddlewares.push(middlewareConfig.handler);
    }

    this.middlewares.sort((a: any, b: any) => {
      const aPriority = a.priority || 0;
      const bPriority = b.priority || 0;
      return bPriority - aPriority;
    });

    this.pluginMiddlewares.set(plugin.name, pluginMiddlewares);
  }

  private unregisterRoutes(pluginName: string): void {
    const routePaths = this.pluginRoutes.get(pluginName);
    if (!routePaths) return;

    for (const path of routePaths) {
      const routeMap = this.routes.get(path);
      if (routeMap) {
        routeMap.clear();
        this.routes.delete(path);
      }
    }

    this.pluginRoutes.delete(pluginName);
  }

  private unregisterMiddlewares(pluginName: string): void {
    const pluginMiddlewares = this.pluginMiddlewares.get(pluginName);
    if (!pluginMiddlewares) return;

    for (const middleware of pluginMiddlewares) {
      const index = this.middlewares.indexOf(middleware);
      if (index > -1) {
        this.middlewares.splice(index, 1);
      }
    }

    this.pluginMiddlewares.delete(pluginName);
  }

  private findPluginByRoute(path: string): PluginMetadata | undefined {
    for (const [pluginName, routePaths] of this.pluginRoutes) {
      if (routePaths.has(path)) {
        return this.plugins.get(pluginName);
      }
    }
    return undefined;
  }

  private getMiddlewaresForRoute(path: string): MiddlewareFunction[] {
    return this.middlewares.filter((middleware: any) => {
      if (!middleware.routes) return true;
      return middleware.routes.some((route: string) =>
        path.startsWith(sanitizePath(route))
      );
    });
  }

  private extractParams(routePath: string, actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');
    
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const actualPart = actualParts[i];
      
      if (routePart?.startsWith(':') && actualPart) {
        const paramName = routePart.slice(1);
        params[paramName] = decodeURIComponent(actualPart);
      }
    }
    
    return params;
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    
    return cookies;
  }

  private executeHook(
    plugin: PluginConfig,
    hookName: keyof PluginConfig['hooks'],
    ...args: any[]
  ): void {
    if (!plugin.hooks || !plugin.hooks[hookName]) return;

    try {
      const hook = plugin.hooks[hookName] as any;
      const result = hook(...args);
      
      if (result instanceof Promise) {
        result.catch((error: Error) => {
          if (this.options.enableDebug) {
            debugError(error, { plugin: plugin.name });
          }
          defaultLogger.error(`Hook '${hookName}' failed for plugin '${plugin.name}':`, error);
        });
      }
    } catch (error) {
      if (this.options.enableDebug) {
        debugError(error as Error, { plugin: plugin.name });
      }
      defaultLogger.error(`Hook '${hookName}' failed for plugin '${plugin.name}':`, error);
    }
  }
}