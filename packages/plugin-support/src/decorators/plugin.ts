import { PluginHooks, MiddlewareConfig } from '../core/types.js';
import { PluginRegistry } from '../core/registry.js';
import { getRouteMetadata, registerDecoratedRoutes } from './route.js';

export interface PluginDecoratorOptions {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: string[];
  middlewares?: MiddlewareConfig[];
  hooks?: PluginHooks;
  autoRegister?: boolean;
}

const pluginMetadata = new Map<string, PluginDecoratorOptions>();

export function Plugin(options: PluginDecoratorOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const className = constructor.name;
    const pluginName = options.name || className.toLowerCase().replace(/plugin$/, '');
    
    const finalOptions: PluginDecoratorOptions = {
      name: pluginName,
      version: '1.0.0',
      autoRegister: true,
      ...options,
    };

    pluginMetadata.set(className, finalOptions);

    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        
        if (finalOptions.autoRegister) {
          this.registerPlugin();
        }
      }

      registerPlugin(): void {
        const routes = getRouteMetadata(this);
        
        if (routes.size === 0 && !finalOptions.middlewares) {
          console.warn(`Plugin '${pluginName}' has no routes or middlewares to register`);
          return;
        }

        const routeConfig: any = {};
        
        for (const [methodName, routeInfo] of routes) {
          const { method, path, handler } = routeInfo;
          
          if (!routeConfig[path]) {
            routeConfig[path] = {};
          }
          
          routeConfig[path][method] = handler.bind(this);
        }

        const registry = PluginRegistry.getInstance();
        
        try {
          registry.register({
            name: finalOptions.name!,
            version: finalOptions.version!,
            description: finalOptions.description,
            author: finalOptions.author,
            homepage: finalOptions.homepage,
            repository: finalOptions.repository,
            keywords: finalOptions.keywords,
            dependencies: finalOptions.dependencies,
            routes: routeConfig,
            middlewares: finalOptions.middlewares,
            hooks: finalOptions.hooks,
            createdAt: new Date(),
            enabled: true,
          });

          if (process.env.NODE_ENV === 'development') {
            console.info(`Plugin '${finalOptions.name}' registered successfully`);
          }
        } catch (error) {
          console.error(`Failed to register plugin '${finalOptions.name}':`, error);
          throw error;
        }
      }

      unregisterPlugin(): boolean {
        const registry = PluginRegistry.getInstance();
        return registry.unregister(finalOptions.name!);
      }

      getPluginInfo() {
        return {
          ...finalOptions,
          routes: getRouteMetadata(this),
        };
      }
    };
  };
}

export function getPluginMetadata(targetClass: any): PluginDecoratorOptions | undefined {
  const className = targetClass.constructor?.name || targetClass.name;
  return pluginMetadata.get(className);
}

export function createPlugin(
  pluginClass: any,
  options?: Partial<PluginDecoratorOptions>
): any {
  const metadata = getPluginMetadata(pluginClass);
  const finalOptions = { ...metadata, ...options };
  
  class PluginWrapper extends pluginClass {
    constructor(...args: any[]) {
      super(...args);
      
      if (finalOptions?.autoRegister !== false) {
        registerDecoratedRoutes(
          this,
          finalOptions?.name || pluginClass.name.toLowerCase(),
          finalOptions?.version || '1.0.0'
        );
      }
    }
  }

  return PluginWrapper;
}

export function withPlugin<T>(
  target: T,
  options: PluginDecoratorOptions
): T & {
  registerPlugin(): void;
  unregisterPlugin(): boolean;
  getPluginInfo(): any;
} {
  const pluginName = options.name || (target as any).constructor.name.toLowerCase();
  
  return Object.assign(target, {
    registerPlugin(): void {
      registerDecoratedRoutes(this, pluginName, options.version || '1.0.0');
    },
    
    unregisterPlugin(): boolean {
      const registry = PluginRegistry.getInstance();
      return registry.unregister(pluginName);
    },
    
    getPluginInfo() {
      return {
        ...options,
        routes: getRouteMetadata(this),
      };
    },
  });
}