"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.getPackageInfo = getPackageInfo;
exports.createConnection = createConnection;
exports.executeQuery = executeQuery;
exports.closeConnection = closeConnection;
exports.formatQueryResult = formatQueryResult;
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
exports.normalizeDateTime = normalizeDateTime;
exports.getOrDefault = getOrDefault;
exports.cleanup = cleanup;
const hana = __importStar(require("@sap/hana-client"));
const fs_1 = require("fs");
const path_1 = require("path");
let connection = null;
let activeConnectionConfig = null;
function isSameConfig(a, b) {
    return a.serverNode === b.serverNode && a.uid === b.uid && a.pwd === b.pwd;
}
function getPackageInfo() {
    try {
        const packagePath = (0, path_1.join)(process.cwd(), 'package.json');
        const packageJson = JSON.parse((0, fs_1.readFileSync)(packagePath, 'utf8'));
        return {
            name: packageJson.name || 'mcp-hana-monitoring',
            version: packageJson.version || '0.0.0'
        };
    }
    catch {
        return {
            name: 'mcp-hana-monitoring',
            version: '0.0.0'
        };
    }
}
/**
 * 구조화된 로깅 시스템
 */
class Logger {
    static instance;
    logLevel = 'info';
    constructor() { }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.logLevel];
    }
    formatMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }
    debug(message, context) {
        if (this.shouldLog('debug')) {
            process.stderr.write(this.formatMessage('debug', message, context) + '\n');
        }
    }
    info(message, context) {
        if (this.shouldLog('info')) {
            process.stderr.write(this.formatMessage('info', message, context) + '\n');
        }
    }
    warn(message, context) {
        if (this.shouldLog('warn')) {
            process.stderr.write(this.formatMessage('warn', message, context) + '\n');
        }
    }
    error(message, context) {
        if (this.shouldLog('error')) {
            process.stderr.write(this.formatMessage('error', message, context) + '\n');
        }
    }
}
exports.Logger = Logger;
const logger = Logger.getInstance();
/**
 * HANA 데이터베이스 연결을 생성합니다.
 */
async function createConnection(config) {
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
        connection.connect(connParams, (err) => {
            if (err) {
                connection = null;
                activeConnectionConfig = null;
                logger.error('HANA 연결 실패', { error: err.message || err });
                reject(new Error(`HANA 연결 실패: ${err.message || err}`));
            }
            else {
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
async function executeQuery(query, params = []) {
    if (!connection) {
        logger.error('데이터베이스 연결이 없습니다');
        throw new Error('HANA 데이터베이스에 연결되지 않았습니다.');
    }
    logger.debug('쿼리 실행', { query: query.substring(0, 100) + '...', params });
    return new Promise((resolve, reject) => {
        connection.exec(query, params, (err, result) => {
            if (err) {
                logger.error('쿼리 실행 실패', { error: err.message || err, query: query.substring(0, 100) });
                reject(new Error(`쿼리 실행 실패: ${err.message || err}`));
            }
            else {
                // result가 배열이고 길이가 0보다 클 때만 컬럼 추출
                const columns = result && result.length > 0 ? Object.keys(result[0]) : [];
                const rows = result ? result.map((row) => columns.map(col => row[col])) : [];
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
function closeConnection() {
    if (connection) {
        logger.info('HANA 연결 종료');
        try {
            connection.disconnect();
        }
        catch (error) {
            logger.error('연결 종료 중 오류', { error: error instanceof Error ? error.message : String(error) });
        }
        finally {
            connection = null;
            activeConnectionConfig = null;
        }
    }
    else {
        logger.debug('종료할 연결이 없습니다');
    }
}
/**
 * 쿼리 결과를 형식화합니다.
 */
function formatQueryResult(result, title = '쿼리 결과') {
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
function createErrorResponse(error, context) {
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
function createSuccessResponse(content, title) {
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
function normalizeDateTime(input) {
    if (!input)
        return null;
    // 이미 HANA 형식인 경우 그대로 반환
    const allowedPattern = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;
    if (allowedPattern.test(input))
        return input;
    let norm = input.trim();
    // yyyy-mm-dd, yyyy.mm.dd, yyyy/mm/dd (날짜만) → yyyy/MM/dd 00:00:00
    if (/^\d{4}([-./])\d{2}\1\d{2}$/.test(norm)) {
        norm = norm.replace(/[-.]/g, '/').replace(/\//g, '/');
        return norm + ' 00:00:00';
    }
    // yyyy-mm-dd hh:mm:ss, yyyy.mm.dd hh:mm:ss, yyyy/mm/dd hh:mm:ss → yyyy/MM/dd HH:mm:ss
    if (/^\d{4}([-./])\d{2}\1\d{2} \d{2}:\d{2}(:\d{2})?$/.test(norm)) {
        norm = norm.replace(/[-.]/g, '/').replace(/\//g, '/');
        if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(norm))
            norm += ':00';
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
        }
        catch (e) { }
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
                            case 's':
                                multiplier = 1000;
                                break;
                            case 'm':
                                multiplier = 60 * 1000;
                                break;
                            case 'h':
                                multiplier = 60 * 60 * 1000;
                                break;
                            case 'd':
                                multiplier = 24 * 60 * 60 * 1000;
                                break;
                            case 'w':
                                multiplier = 7 * 24 * 60 * 60 * 1000;
                                break;
                            case 'y':
                                multiplier = 365 * 24 * 60 * 60 * 1000;
                                break;
                        }
                        if (sign === '+') {
                            offset += value * multiplier;
                        }
                        else {
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
        }
        catch (e) { }
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
function getOrDefault(v, def) {
    return v !== undefined && v !== null && v !== '' ? `'${v}'` : def;
}
/**
 * 정리 작업을 수행합니다.
 */
function cleanup() {
    closeConnection();
}
