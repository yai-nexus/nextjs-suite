import { NextRequest, NextResponse } from 'next/server';
import { PluginError } from '../core/types.js';
import { defaultLogger } from '../utils/logger.js';

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  customErrorMap?: Map<string, (error: Error) => { status: number; message: string }>;
}

export class ErrorHandler {
  private options: ErrorHandlerOptions;

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      includeStack: options.includeStack ?? process.env.NODE_ENV === 'development',
      logErrors: options.logErrors ?? true,
      customErrorMap: options.customErrorMap || new Map(),
    };
  }

  handle(error: Error, request: NextRequest): NextResponse {
    if (this.options.logErrors) {
      this.logError(error, request);
    }

    const errorResponse = this.createErrorResponse(error, request);
    return errorResponse;
  }

  private logError(error: Error, request: NextRequest): void {
    const url = new URL(request.url);
    const context = `${request.method} ${url.pathname}`;
    
    if (error instanceof PluginError) {
      defaultLogger.error(`Plugin error in ${context}:`, {
        plugin: error.pluginName,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      });
    } else {
      defaultLogger.error(`Error in ${context}:`, {
        name: error.name,
        message: error.message,
        stack: this.options.includeStack ? error.stack : undefined,
      });
    }
  }

  private createErrorResponse(error: Error, request: NextRequest): NextResponse {
    let status = 500;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let details: any = undefined;

    if (error instanceof PluginError) {
      status = error.statusCode || 500;
      message = error.message;
      code = error.code;
      details = {
        plugin: error.pluginName,
      };
    } else {
      const customHandler = this.options.customErrorMap?.get(error.constructor.name);
      if (customHandler) {
        const customResponse = customHandler(error);
        status = customResponse.status;
        message = customResponse.message;
      } else {
        message = this.options.includeStack ? error.message : 'An unexpected error occurred';
      }
    }

    const errorBody: any = {
      error: {
        name: error.name,
        message,
        code,
        timestamp: new Date().toISOString(),
        ...(details && { details }),
        ...(this.options.includeStack && { stack: error.stack }),
      },
    };

    return new NextResponse(
      JSON.stringify(errorBody, null, 2),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  addCustomHandler(
    errorName: string, 
    handler: (error: Error) => { status: number; message: string }
  ): void {
    this.options.customErrorMap?.set(errorName, handler);
  }

  removeCustomHandler(errorName: string): boolean {
    return this.options.customErrorMap?.delete(errorName) ?? false;
  }

  setOptions(options: Partial<ErrorHandlerOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

export const defaultErrorHandler = new ErrorHandler();

export function createErrorHandler(options: ErrorHandlerOptions = {}): ErrorHandler {
  return new ErrorHandler(options);
}

export function handleValidationError(error: Error): { status: number; message: string } {
  return {
    status: 400,
    message: `Validation Error: ${error.message}`,
  };
}

export function handleAuthenticationError(error: Error): { status: number; message: string } {
  return {
    status: 401,
    message: 'Authentication required',
  };
}

export function handleAuthorizationError(error: Error): { status: number; message: string } {
  return {
    status: 403,
    message: 'Access denied',
  };
}

export function handleNotFoundError(error: Error): { status: number; message: string } {
  return {
    status: 404,
    message: 'Resource not found',
  };
}

export function handleRateLimitError(error: Error): { status: number; message: string } {
  return {
    status: 429,
    message: 'Too many requests',
  };
}

export const commonErrorHandlers = new Map([
  ['ValidationError', handleValidationError],
  ['AuthenticationError', handleAuthenticationError],
  ['AuthorizationError', handleAuthorizationError],
  ['NotFoundError', handleNotFoundError],
  ['RateLimitError', handleRateLimitError],
]);