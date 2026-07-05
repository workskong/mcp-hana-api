import * as hana from '@sap/hana-client';
import { readFileSync } from 'fs';
import { join } from 'path';

let connection: any = null;
let activeConnectionConfig: HanaConfig | null = null;

function isSameConfig(a: HanaConfig, b: HanaConfig): boolean {
  return a.serverNode === b.serverNode && a.uid === b.uid && a.pwd === b.pwd;
}

export function getPackageInfo(): { name: string; version: string } {
  try {
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { name?: string; version?: string };
    return {
      name: packageJson.name || 'mcp-hana-monitoring',
      version: packageJson.version || '0.0.0'
    };
  } catch {
    return {
      name: 'mcp-hana-monitoring',
      version: '0.0.0'
    };
  }
}

export interface HanaConfig {
  serverNode: string;
  uid: string;
  pwd: string;
}

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
}

/**
 * 구조화된 로깅 시스템
 */
export class Logger {
  private static instance: Logger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog('debug')) {
      process.stderr.write(this.formatMessage('debug', message, context) + '\n');
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog('info')) {
      process.stderr.write(this.formatMessage('info', message, context) + '\n');
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog('warn')) {
      process.stderr.write(this.formatMessage('warn', message, context) + '\n');
    }
  }

  error(message: string, context?: any): void {
    if (this.shouldLog('error')) {
      process.stderr.write(this.formatMessage('error', message, context) + '\n');
    }
  }
}

const logger = Logger.getInstance();

/**
 * HANA 데이터베이스 연결을 생성합니다.
 */
export async function createConnection(config: {
  serverNode: string;
  uid: string;
  pwd: string;
}): Promise<any> {
  if (connection) {
    if (activeConnectionConfig && isSameConfig(activeConnectionConfig, config)) {
      logger.debug('기존 연결 재사용');
      return connection;
    }

    logger.info('연결 설정 변경 감지 - 기존 연결 종료 후 재연결');
    closeConnection();
  }

  logger.info('새로운 HANA 연결 생성', { serverNode: config.serverNode, uid: config.uid });
  connection = hana.createConnection();
  
  return new Promise((resolve, reject) => {
    const connParams = {
      serverNode: config.serverNode,
      uid: config.uid,
      pwd: config.pwd
    };

    connection.connect(connParams, (err: any) => {
      if (err) {
        connection = null;
        activeConnectionConfig = null;
        logger.error('HANA 연결 실패', { error: err.message || err });
        reject(new Error(`HANA 연결 실패: ${err.message || err}`));
      } else {
        activeConnectionConfig = {
          serverNode: config.serverNode,
          uid: config.uid,
          pwd: config.pwd
        };
        logger.info('HANA 연결 성공');
        resolve(connection);
      }
    });
  });
}

/**
 * HANA 데이터베이스 쿼리를 실행합니다.
 */
export async function executeQuery(query: string, params: any[] = []): Promise<QueryResult> {
  if (!connection) {
    logger.error('데이터베이스 연결이 없습니다');
    throw new Error('HANA 데이터베이스에 연결되지 않았습니다.');
  }

  logger.debug('쿼리 실행', { query: query.substring(0, 100) + '...', params });
  
  return new Promise((resolve, reject) => {
    connection.exec(query, params, (err: any, result: any) => {
      if (err) {
        logger.error('쿼리 실행 실패', { error: err.message || err, query: query.substring(0, 100) });
        reject(new Error(`쿼리 실행 실패: ${err.message || err}`));
      } else {
        // result가 배열이고 길이가 0보다 클 때만 컬럼 추출
        const columns = result && result.length > 0 ? Object.keys(result[0]) : [];
        const rows = result ? result.map((row: any) => columns.map(col => row[col])) : [];
        
        logger.debug('쿼리 실행 성공', { rowCount: result ? result.length : 0 });
        
        resolve({
          columns,
          rows,
          rowCount: result ? result.length : 0
        });
      }
    });
  });
}

/**
 * 연결을 닫습니다.
 */
export function closeConnection(): void {
  if (connection) {
    logger.info('HANA 연결 종료');
    try {
      connection.disconnect();
    } catch (error) {
      logger.error('연결 종료 중 오류', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      connection = null;
      activeConnectionConfig = null;
    }
  } else {
    logger.debug('종료할 연결이 없습니다');
  }
}

/**
 * 쿼리 결과를 형식화합니다.
 */
export function formatQueryResult(result: QueryResult, title: string = '쿼리 결과'): ToolResponse {
  if (result.rowCount === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `${title}\n\n결과가 없습니다.`
        }
      ]
    };
  }

  let output = `${title}\n\n`;
  output += `총 ${result.rowCount}개의 행이 반환되었습니다.\n\n`;
  
  const headerLine = result.columns.join(' | ');
  const separatorLine = result.columns.map(col => '-'.repeat(Math.max(col.length, 10))).join(' | ');
  output += `${headerLine}\n${separatorLine}\n`;
  
  const displayRows = result.rows.slice(0, 50);
  for (const row of displayRows) {
    const formattedRow = row.map((value, index) => {
      const colWidth = Math.max((result.columns[index]?.length ?? 0), 10);
      const strValue = value === null ? 'NULL' : String(value);
      return strValue.padEnd(colWidth);
    }).join(' | ');
    output += `${formattedRow}\n`;
  }
  
  if (result.rowCount > 50) {
    output += `\n... 그리고 ${result.rowCount - 50}개의 추가 행이 있습니다.\n`;
  }

  return {
    content: [
      {
        type: 'text',
        text: output
      }
    ]
  };
}

/**
 * 오류 응답을 생성합니다.
 */
export function createErrorResponse(error: any, context?: string): ToolResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
  
  logger.error('도구 실행 오류', { 
    error: errorMessage, 
    context, 
    stack: error instanceof Error ? error.stack : undefined 
  });
  
  return {
    content: [
      {
        type: 'text',
        text: `❌ 오류: ${fullMessage}`
      }
    ],
    isError: true
  };
}

/**
 * 성공 응답을 생성합니다.
 */
export function createSuccessResponse(content: string, title?: string): ToolResponse {
  const responseText = title ? `${title}\n\n${content}` : content;
  
  logger.debug('도구 실행 성공', { title });
  
  return {
    content: [
      {
        type: 'text',
        text: responseText
      }
    ],
    isError: false
  };
}

/**
 * 날짜/시간 문자열을 HANA 형식(YYYY/MM/DD HH:mm:ss)으로 정규화합니다.
 * 다양한 입력 형식을 지원합니다:
 * - ISO 8601: 2025-07-09T00:00:00Z
 * - 날짜만: 2025-07-09, 2025.07.09, 2025/07/09
 * - 시간 포함: 2025-07-09 00:00:00, 2025.07.09 00:00:00, 2025/07/09 00:00:00
 * - 상대 시간: now-24h+1m
 * - HANA 형식: C, C-H24, C-D1 등
 *
 * yyyy-mm-dd, yyyy.mm.dd, yyyy/mm/dd 등으로 입력된 경우 무조건 yyyy/MM/dd HH:mm:ss로 변환합니다.
 */
export function normalizeDateTime(input: string | null | undefined): string | null {
  if (!input) return null;

  // 이미 HANA 형식인 경우 그대로 반환
  const allowedPattern = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;
  if (allowedPattern.test(input)) return input;

  let norm = input.trim();

  // yyyy-mm-dd, yyyy.mm.dd, yyyy/mm/dd (날짜만) → yyyy/MM/dd 00:00:00
  if (/^\d{4}([-./])\d{2}\1\d{2}$/.test(norm)) {
    norm = norm.replace(/[-.]/g, '/').replace(/\//g, '/');
    return norm + ' 00:00:00';
  }
  // yyyy-mm-dd hh:mm:ss, yyyy.mm.dd hh:mm:ss, yyyy/mm/dd hh:mm:ss → yyyy/MM/dd HH:mm:ss
  if (/^\d{4}([-./])\d{2}\1\d{2} \d{2}:\d{2}(:\d{2})?$/.test(norm)) {
    norm = norm.replace(/[-.]/g, '/').replace(/\//g, '/');
    if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(norm)) norm += ':00';
    return norm;
  }

  // ISO 8601 형식 처리
  if (norm.includes('T') || norm.includes('Z')) {
    try {
      const date = new Date(norm);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
      }
    } catch (e) {}
  }

  // 상대 시간 표현 처리 (now-24h+1m 등)
  if (norm.startsWith('now')) {
    try {
      const now = new Date();
      let offset = 0;
      const matches = norm.match(/now([+-]\d+[smhdwy])?/);
      if (matches && matches[1]) {
        const timeExpr = matches[1];
        const timeMatches = timeExpr.match(/([+-])(\d+)([smhdwy])/g);
        if (timeMatches) {
          for (const match of timeMatches) {
            const sign = match[0];
            const value = parseInt(match.slice(1, -1));
            const unit = match.slice(-1);
            let multiplier = 1;
            switch (unit) {
              case 's': multiplier = 1000; break;
              case 'm': multiplier = 60 * 1000; break;
              case 'h': multiplier = 60 * 60 * 1000; break;
              case 'd': multiplier = 24 * 60 * 60 * 1000; break;
              case 'w': multiplier = 7 * 24 * 60 * 60 * 1000; break;
              case 'y': multiplier = 365 * 24 * 60 * 60 * 1000; break;
            }
            if (sign === '+') {
              offset += value * multiplier;
            } else {
              offset -= value * multiplier;
            }
          }
        }
      }
      const adjustedDate = new Date(now.getTime() + offset);
      const year = adjustedDate.getFullYear();
      const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
      const day = String(adjustedDate.getDate()).padStart(2, '0');
      const hours = String(adjustedDate.getHours()).padStart(2, '0');
      const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
      const seconds = String(adjustedDate.getSeconds()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {}
  }

  // HANA 특수 포맷(C, C-H24 등)은 그대로 반환
  if (/^[CEB][\-+A-Z0-9]+$/.test(norm) || norm === 'MIN' || norm === 'MAX' || norm === 'CURRENT' || norm === 'HISTORY') {
    return norm;
  }

  return null;
}

/**
 * 값이 undefined, null, ''(빈 문자열)이면 기본값을 반환하고, 아니면 '값' 형태로 감싸서 반환합니다.
 */
export function getOrDefault(v: any, def: string): string {
  return v !== undefined && v !== null && v !== '' ? `'${v}'` : def;
}

/**
 * 정리 작업을 수행합니다.
 */
export function cleanup(): void {
  closeConnection();
} 