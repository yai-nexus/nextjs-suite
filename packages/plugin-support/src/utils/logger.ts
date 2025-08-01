export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  enableColors?: boolean;
  enableTimestamp?: boolean;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private enableColors: boolean;
  private enableTimestamp: boolean;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? '[Plugin Support]';
    this.enableColors = options.enableColors ?? true;
    this.enableTimestamp = options.enableTimestamp ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = this.enableTimestamp ? new Date().toISOString() : '';
    const levelName = LogLevel[level];
    const color = this.getColor(level);
    
    let formatted = '';
    
    if (this.enableTimestamp) {
      formatted += `${timestamp} `;
    }
    
    if (this.enableColors && color) {
      formatted += `${color}[${levelName}]${this.getResetColor()} `;
    } else {
      formatted += `[${levelName}] `;
    }
    
    formatted += `${this.prefix} ${message}`;
    
    if (args.length > 0) {
      formatted += ` ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}`;
    }
    
    return formatted;
  }

  private getColor(level: LogLevel): string {
    if (!this.enableColors) return '';
    
    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      default:
        return '';
    }
  }

  private getResetColor(): string {
    return this.enableColors ? '\x1b[0m' : '';
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, ...args));
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

export const defaultLogger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableColors: true,
  enableTimestamp: true,
});