// Core exports
export * from './core/types.js';
export * from './core/registry.js';
export * from './core/router.js';

// Handlers exports
export * from './handlers/create-handler.js';
export * from './handlers/error-handler.js';
export * from './handlers/middleware.js';

// Utils exports
export * from './utils/logger.js';
export * from './utils/validation.js';
export * from './utils/debug.js';

// Decorator exports - available separately
export * from './decorators/index.js';

// Re-export commonly used functions
export {
  PluginRegistry,
  PluginRouter,
  createHandler,
  createApiHandler,
  definePlugin,
  createRouteHandler,
  createMiddleware,
} from './core/registry.js';

// Default exports for common use cases
export { PluginRegistry as default } from './core/registry.js';