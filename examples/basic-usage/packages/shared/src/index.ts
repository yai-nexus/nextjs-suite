import { NextRequest, NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function createApiResponse<T>(
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> {
  return {
    data,
    error,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function createSuccessResponse<T>(
  data: T,
  message?: string
): NextResponse {
  return NextResponse.json(createApiResponse(data, undefined, message));
}

export function createErrorResponse(
  error: string,
  status: number = 400,
  message?: string
): NextResponse {
  return NextResponse.json(
    createApiResponse(undefined, error, message),
    { status }
  );
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): NextResponse {
  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

  const response: PaginatedResponse<T> = {
    items,
    total,
    limit,
    offset,
    hasNext,
    hasPrev,
  };

  return NextResponse.json(createApiResponse(response));
}

export function parseQueryParams(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  return {
    limit: parseInt(searchParams.get('limit') || '10'),
    offset: parseInt(searchParams.get('offset') || '0'),
    search: searchParams.get('search'),
    sort: searchParams.get('sort'),
    order: searchParams.get('order') as 'asc' | 'desc' || 'desc',
  };
}

export async function parseJsonBody<T = any>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): string[] {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!data[field]) {
      missingFields.push(String(field));
    }
  }

  return missingFields;
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export class ValidationError extends Error {
  constructor(message: string, public fields: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof ValidationError) {
    return createErrorResponse(
      `Validation failed: ${error.fields.join(', ')} are required`,
      400
    );
  }

  if (error instanceof NotFoundError) {
    return createErrorResponse(error.message, 404);
  }

  if (error instanceof ConflictError) {
    return createErrorResponse(error.message, 409);
  }

  if (error instanceof Error) {
    return createErrorResponse(
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      500
    );
  }

  return createErrorResponse('Unknown error occurred', 500);
}