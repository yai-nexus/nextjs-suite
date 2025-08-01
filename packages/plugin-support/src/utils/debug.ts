import { PluginConfig, PluginMetadata, PluginStats, HttpMethod } from '../core/types.js';
import { defaultLogger } from './logger.js';

export interface DebugInfo {
  timestamp: Date;
  message: string;
  data?: any;
  level: 'debug' | 'info' | 'warn' | 'error';
}

export class DebugCollector {
  private logs: DebugInfo[] = [];
  private maxLogs: number = 1000;
  private enabled: boolean;

  constructor(enabled: boolean = process.env.NODE_ENV === 'development') {
    this.enabled = enabled;
  }

  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.enabled) return;

    const debugInfo: DebugInfo = {
      timestamp: new Date(),
      message,
      data,
      level,
    };

    this.logs.push(debugInfo);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    defaultLogger[level](message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  getLogs(level?: 'debug' | 'info' | 'warn' | 'error'): DebugInfo[] {
    if (!level) return [...this.logs];
    return this.logs.filter(log => log.level === level);
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStats(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const logsByLevel = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      oldestLog: this.logs[0]?.timestamp,
      newestLog: this.logs[this.logs.length - 1]?.timestamp,
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setMaxLogs(maxLogs: number): void {
    this.maxLogs = Math.max(100, maxLogs);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}

export const debugCollector = new DebugCollector();

export function debugPlugin(plugin: PluginConfig): void {
  if (process.env.NODE_ENV !== 'development') return;

  debugCollector.info(`Plugin '${plugin.name}' registered`, {
    name: plugin.name,
    version: plugin.version,
    routeCount: Object.keys(plugin.routes).length,
    middlewareCount: plugin.middlewares?.length || 0,
    hasHooks: !!plugin.hooks,
  });

  const routes = Object.entries(plugin.routes);
  for (const [path, methods] of routes) {
    const methodList = Object.keys(methods) as HttpMethod[];
    debugCollector.debug(`Route registered: ${methodList.join('|')} ${path}`);
  }

  if (plugin.middlewares && plugin.middlewares.length > 0) {
    plugin.middlewares.forEach(middleware => {
      debugCollector.debug(`Middleware registered: ${middleware.name}`, {
        priority: middleware.priority,
        routes: middleware.routes,
      });
    });
  }

  if (plugin.hooks && Object.keys(plugin.hooks).length > 0) {
    const hookNames = Object.keys(plugin.hooks);
    debugCollector.debug(`Plugin hooks: ${hookNames.join(', ')}`);
  }
}

export function debugRouteMatch(
  path: string,
  method: HttpMethod,
  plugin?: PluginMetadata,
  executionTime?: number
): void {
  if (process.env.NODE_ENV !== 'development') return;

  if (plugin) {
    debugCollector.debug(`Route matched: ${method} ${path}`, {
      plugin: plugin.name,
      version: plugin.version,
      executionTime: executionTime ? `${executionTime}ms` : undefined,
    });
  } else {
    debugCollector.warn(`No route handler found: ${method} ${path}`);
  }
}

export function debugMiddlewareExecution(
  middlewareName: string,
  path: string,
  method: HttpMethod,
  executionTime?: number
): void {
  if (process.env.NODE_ENV !== 'development') return;

  debugCollector.debug(`Middleware executed: ${middlewareName}`, {
    path,
    method,
    executionTime: executionTime ? `${executionTime}ms` : undefined,
  });
}

export function debugError(
  error: Error,
  context: {
    plugin?: string;
    path?: string;
    method?: HttpMethod;
  }
): void {
  debugCollector.error(`Plugin error: ${error.message}`, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  });
}

export function getDebugStats(): PluginStats & { debugStats: any } {
  const process = globalThis.process;
  
  return {
    totalPlugins: 0, // Will be populated by registry
    enabledPlugins: 0, // Will be populated by registry
    totalRoutes: 0, // Will be populated by registry
    totalMiddlewares: 0, // Will be populated by registry
    memoryUsage: process?.memoryUsage?.() || {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
    },
    uptime: process?.uptime?.() || 0,
    debugStats: debugCollector.getStats(),
  };
}

export function formatDebugOutput(logs: DebugInfo[]): string {
  return logs
    .map(log => {
      const timestamp = log.timestamp.toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const data = log.data ? ` | ${JSON.stringify(log.data)}` : '';
      return `[${timestamp}] ${level} ${log.message}${data}`;
    })
    .join('\n');
}

export function exportDebugLogs(format: 'json' | 'text' = 'json'): string {
  const logs = debugCollector.getLogs();
  
  if (format === 'text') {
    return formatDebugOutput(logs);
  }
  
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    stats: debugCollector.getStats(),
    logs,
  }, null, 2);
}