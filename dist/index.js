#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HanaMonitoringServer = void 0;
exports.getConfig = getConfig;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import HANA monitoring handler functions
const handleSystemOverview_1 = require("./handlers/handleSystemOverview");
const handleDiskUsage_1 = require("./handlers/handleDiskUsage");
const handleCpuUsage_1 = require("./handlers/handleCpuUsage");
const handleActiveSessions_1 = require("./handlers/handleActiveSessions");
const handleTableStats_1 = require("./handlers/handleTableStats");
const handleServiceStats_1 = require("./handlers/handleServiceStats");
const handleCustomQuery_1 = require("./handlers/handleCustomQuery");
const handleLoadHistory_1 = require("./handlers/handleLoadHistory");
const handleThreadSamplesAggregation_1 = require("./handlers/handleThreadSamplesAggregation");
const handleExpensiveStatements_1 = require("./handlers/handleExpensiveStatements");
const handleSQLCacheTopLists_1 = require("./handlers/handleSQLCacheTopLists");
// Import shared utility functions and types
const utils_1 = require("./lib/utils");
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
/**
 * Retrieves HANA configuration from environment variables.
 */
function getConfig() {
    return {
        serverNode: 'localhost:30215', // 실제 서버 주소와 포트로 변경
        uid: 'SAPA4H', // 실제 사용자명
        pwd: 'ABAPtr2022#01' // 실제 비밀번호
    };
}
/**
 * Server class for HANA database monitoring via MCP.
 */
class HanaMonitoringServer {
    server;
    hanaConfig;
    lastQueryResult = null;
    queryHistory = [];
    maxHistorySize = 50;
    constructor() {
        this.hanaConfig = getConfig();
        this.server = new index_js_1.Server({
            name: 'mcp-hana-monitoring',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
                prompts: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        // Handler for ListToolsRequest
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    // 시스템 모니터링 도구들
                    {
                        name: 'SystemOverview',
                        description: 'HANA 시스템 전체 개요 정보 조회',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                detailed: {
                                    type: 'boolean',
                                    description: '상세 정보 포함 여부',
                                    default: true
                                }
                            }
                        }
                    },
                    {
                        name: 'DiskUsage',
                        description: 'HANA 디스크 사용률 모니터링',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                host: {
                                    type: 'string',
                                    description: '특정 호스트로 필터링'
                                },
                                detailed: {
                                    type: 'boolean',
                                    description: '상세 정보 포함 여부',
                                    default: true
                                }
                            }
                        }
                    },
                    {
                        name: 'CpuUsage',
                        description: 'HANA CPU 사용률 모니터링',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                host: {
                                    type: 'string',
                                    description: '특정 호스트로 필터링'
                                },
                                timeRange: {
                                    type: 'number',
                                    description: '조회할 시간 범위 (분)',
                                    default: 60
                                }
                            }
                        }
                    },
                    {
                        name: 'ActiveSessions',
                        description: 'HANA 활성 세션 모니터링',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                detailed: {
                                    type: 'boolean',
                                    description: '상세 정보 포함 여부',
                                    default: true
                                },
                                userId: {
                                    type: 'string',
                                    description: '특정 사용자로 필터링'
                                },
                                applicationName: {
                                    type: 'string',
                                    description: '특정 애플리케이션으로 필터링'
                                }
                            }
                        }
                    },
                    {
                        name: 'TableStats',
                        description: 'HANA 테이블 통계 및 크기 정보',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                schemaName: {
                                    type: 'string',
                                    description: '특정 스키마로 필터링'
                                },
                                tableName: {
                                    type: 'string',
                                    description: '테이블 이름으로 검색 (부분 일치)'
                                },
                                topN: {
                                    type: 'number',
                                    description: '상위 N개 테이블 조회',
                                    default: 100
                                }
                            }
                        }
                    },
                    {
                        name: 'ServiceStats',
                        description: 'HANA 서비스 상태 및 리소스 정보',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                serviceName: {
                                    type: 'string',
                                    description: '특정 서비스로 필터링'
                                },
                                host: {
                                    type: 'string',
                                    description: '특정 호스트로 필터링'
                                }
                            }
                        }
                    },
                    {
                        name: 'CustomQuery',
                        description: '사용자 정의 SQL 쿼리 실행',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: '실행할 SQL 쿼리'
                                },
                                description: {
                                    type: 'string',
                                    description: '쿼리 설명'
                                }
                            },
                            required: ['query']
                        }
                    },
                    // 성능 분석 도구들
                    {
                        name: 'LoadHistory',
                        description: 'HANA Load History 성능 데이터 조회',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                beginTime: {
                                    type: 'string',
                                    description: '시작 시간 (C-H1, C-M30 등)',
                                    default: 'C-H1'
                                },
                                endTime: {
                                    type: 'string',
                                    description: '종료 시간 (C, B+H1 등)',
                                    default: 'C'
                                },
                                dataSource: {
                                    type: 'string',
                                    description: '데이터 소스 (CURRENT, HISTORY)',
                                    default: 'CURRENT'
                                }
                            }
                        }
                    },
                    {
                        name: 'ThreadSamplesAggregation',
                        description: 'HANA Thread Samples 집계 분석',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                beginTime: {
                                    type: 'string',
                                    description: '시작 시간',
                                    default: 'C-H1'
                                },
                                endTime: {
                                    type: 'string',
                                    description: '종료 시간',
                                    default: 'C'
                                },
                                aggregateBy: {
                                    type: 'string',
                                    description: '집계 기준 (THREAD_STATE, THREAD_TYPE 등)',
                                    default: 'THREAD_STATE'
                                }
                            }
                        }
                    },
                    {
                        name: 'ExpensiveStatements',
                        description: 'HANA 비용이 높은 SQL 문장 조회',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                beginTime: {
                                    type: 'string',
                                    description: '시작 시간',
                                    default: 'C-H1'
                                },
                                endTime: {
                                    type: 'string',
                                    description: '종료 시간',
                                    default: 'C'
                                },
                                minDurationS: {
                                    type: 'number',
                                    description: '최소 실행 시간 (초)',
                                    default: 60
                                },
                                minMemoryGB: {
                                    type: 'number',
                                    description: '최소 메모리 사용량 (GB)',
                                    default: 1
                                }
                            }
                        }
                    },
                    {
                        name: 'SQLCacheTopLists',
                        description: 'HANA SQL Cache Top 리스트 조회',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                beginTime: {
                                    type: 'string',
                                    description: '시작 시간',
                                    default: 'C-H1'
                                },
                                endTime: {
                                    type: 'string',
                                    description: '종료 시간',
                                    default: 'C'
                                },
                                topNExecTime: {
                                    type: 'number',
                                    description: '실행 시간 기준 상위 N개',
                                    default: 10
                                },
                                topNTotalMemory: {
                                    type: 'number',
                                    description: '메모리 사용량 기준 상위 N개',
                                    default: 10
                                }
                            }
                        }
                    }
                ]
            };
        });
        // Handler for ListResourcesRequest
        this.server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async () => {
            return {
                resources: [
                    {
                        uri: 'hana://config',
                        name: 'HANA Configuration',
                        description: 'HANA 연결 설정 정보',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'hana://status',
                        name: 'HANA Connection Status',
                        description: 'HANA 연결 상태 정보',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'hana://tools-info',
                        name: 'Available Tools Information',
                        description: '사용 가능한 모니터링 도구들의 상세 정보',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'hana://templates/system-queries',
                        name: 'System Monitoring Query Templates',
                        description: '시스템 모니터링을 위한 SQL 쿼리 템플릿',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'hana://templates/performance-queries',
                        name: 'Performance Analysis Query Templates',
                        description: '성능 분석을 위한 SQL 쿼리 템플릿',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'hana://templates/tool-examples',
                        name: 'Tool Usage Examples',
                        description: '각 도구 사용 예제 및 파라미터 설명',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'hana://results/last-query',
                        name: 'Last Query Result',
                        description: '마지막으로 실행된 쿼리 결과',
                        mimeType: 'application/json'
                    },
                    {
                        uri: 'hana://results/query-history',
                        name: 'Query History',
                        description: '최근 실행된 쿼리 히스토리',
                        mimeType: 'application/json'
                    }
                ]
            };
        });
        // Handler for ReadResourceRequest
        this.server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (request) => {
            const { uri } = request.params;
            switch (uri) {
                case 'hana://config':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    serverNode: this.hanaConfig.serverNode,
                                    username: this.hanaConfig.uid,
                                    // 비밀번호는 보안상 표시하지 않음
                                    passwordConfigured: !!this.hanaConfig.pwd
                                }, null, 2)
                            }
                        ]
                    };
                case 'hana://status':
                    try {
                        const connection = await (0, utils_1.createConnection)(this.hanaConfig);
                        (0, utils_1.closeConnection)();
                        return {
                            contents: [
                                {
                                    uri,
                                    mimeType: 'application/json',
                                    text: JSON.stringify({
                                        status: 'connected',
                                        message: 'HANA 데이터베이스 연결 성공',
                                        timestamp: new Date().toISOString()
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    catch (error) {
                        return {
                            contents: [
                                {
                                    uri,
                                    mimeType: 'application/json',
                                    text: JSON.stringify({
                                        status: 'error',
                                        message: `HANA 연결 실패: ${error instanceof Error ? error.message : String(error)}`,
                                        timestamp: new Date().toISOString()
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                case 'hana://tools-info':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    totalTools: 12,
                                    categories: {
                                        systemMonitoring: ['SystemOverview', 'DiskUsage', 'CpuUsage', 'ActiveSessions', 'TableStats', 'ServiceStats', 'CustomQuery'],
                                        performanceAnalysis: ['LoadHistory', 'ThreadSamplesAggregation', 'ExpensiveStatements', 'SQLCacheTopLists']
                                    },
                                    description: 'SAP HANA 데이터베이스 모니터링을 위한 MCP 서버입니다.',
                                    features: [
                                        '실시간 시스템 모니터링',
                                        '메모리, 디스크, CPU 사용률 추적',
                                        '활성 세션 및 테이블 통계',
                                        '사용자 정의 쿼리 실행',
                                        'Load History 성능 분석',
                                        'Thread Samples 집계 분석',
                                        '비용이 높은 SQL 문장 감지',
                                        'SQL Cache Top 리스트 조회'
                                    ]
                                }, null, 2)
                            }
                        ]
                    };
                case 'hana://templates/system-queries':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    description: '시스템 모니터링을 위한 유용한 SQL 쿼리 템플릿들',
                                    queries: {
                                        systemOverview: {
                                            description: '시스템 전체 개요',
                                            query: 'SELECT * FROM SYS.M_DATABASES UNION ALL SELECT * FROM SYS.M_SYSTEM_OVERVIEW',
                                            toolMapping: 'SystemOverview'
                                        },
                                        memoryUsage: {
                                            description: '메모리 사용률 상세',
                                            query: 'SELECT HOST, ROUND(USED_PHYSICAL_MEMORY/1024/1024/1024, 2) AS USED_GB, ROUND(FREE_PHYSICAL_MEMORY/1024/1024/1024, 2) AS FREE_GB FROM SYS.M_HOST_RESOURCE_UTILIZATION',
                                            toolMapping: 'Memory_TopConsumers'
                                        },
                                        activeSessions: {
                                            description: '현재 활성 세션',
                                            query: 'SELECT CONNECTION_ID, USER_NAME, CLIENT_IP, CLIENT_PID, APPLICATION_NAME, CONNECTION_STATUS FROM SYS.M_CONNECTIONS WHERE CONNECTION_STATUS = \'RUNNING\'',
                                            toolMapping: 'ActiveSessions'
                                        }
                                    }
                                }, null, 2)
                            }
                        ]
                    };
                case 'hana://templates/performance-queries':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    description: '성능 분석을 위한 고급 SQL 쿼리 템플릿들',
                                    queries: {
                                        topCpuQueries: {
                                            description: 'CPU 사용률이 높은 쿼리',
                                            query: 'SELECT TOP 10 SQL_STRING, TOTAL_EXECUTION_TIME, TOTAL_CURSOR_DURATION, AVG_EXECUTION_TIME FROM SYS.M_SQL_PLAN_CACHE ORDER BY TOTAL_EXECUTION_TIME DESC'
                                        },
                                        memoryIntensiveQueries: {
                                            description: '메모리 사용량이 많은 쿼리',
                                            query: 'SELECT TOP 10 SQL_STRING, TOTAL_EXECUTION_MEMORY_SIZE, AVG_EXECUTION_MEMORY_SIZE, EXECUTION_COUNT FROM SYS.M_SQL_PLAN_CACHE ORDER BY TOTAL_EXECUTION_MEMORY_SIZE DESC'
                                        },
                                        slowQueries: {
                                            description: '느린 쿼리 분석',
                                            query: 'SELECT TOP 20 SQL_STRING, AVG_EXECUTION_TIME, MAX_EXECUTION_TIME, EXECUTION_COUNT FROM SYS.M_SQL_PLAN_CACHE WHERE AVG_EXECUTION_TIME > 1000000 ORDER BY AVG_EXECUTION_TIME DESC'
                                        },
                                        tableSizes: {
                                            description: '테이블 크기 분석',
                                            query: 'SELECT SCHEMA_NAME, TABLE_NAME, RECORD_COUNT, TABLE_SIZE FROM SYS.M_TABLES WHERE RECORD_COUNT > 0 ORDER BY TABLE_SIZE DESC'
                                        }
                                    }
                                }, null, 2)
                            }
                        ]
                    };
                case 'hana://templates/tool-examples':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    description: '각 도구의 사용 예제와 권장 파라미터',
                                    examples: {
                                        SystemOverview: {
                                            basic: { detailed: false },
                                            detailed: { detailed: true },
                                            description: '시스템 전체 상태를 확인합니다.'
                                        },
                                        DiskUsage: {
                                            basic: { detailed: false },
                                            detailed: { detailed: true },
                                            hostSpecific: { detailed: true, host: 'hostname' },
                                            description: '디스크 사용률을 모니터링합니다.'
                                        },
                                        ActiveSessions: {
                                            all: { detailed: true },
                                            byUser: { detailed: true, userId: 'SYSTEM' },
                                            byApp: { detailed: true, applicationName: 'HDBStudio' },
                                            description: '활성 세션을 조회합니다.'
                                        },
                                        CustomQuery: {
                                            systemInfo: {
                                                query: 'SELECT * FROM SYS.M_SYSTEM_OVERVIEW',
                                                description: '시스템 개요 정보'
                                            },
                                            userSessions: {
                                                query: 'SELECT USER_NAME, COUNT(*) as SESSION_COUNT FROM SYS.M_CONNECTIONS GROUP BY USER_NAME',
                                                description: '사용자별 세션 수'
                                            }
                                        },
                                        LoadHistory: {
                                            basic: { beginTime: 'C-H1', endTime: 'C' },
                                            detailed: { beginTime: 'C-H1', endTime: 'C', dataSource: 'CURRENT' },
                                            history: { beginTime: 'C-D1', endTime: 'C', dataSource: 'HISTORY' },
                                            description: 'Load History 성능 데이터를 조회합니다.'
                                        },
                                        ThreadSamplesAggregation: {
                                            basic: { beginTime: 'C-H1', endTime: 'C' },
                                            byState: { beginTime: 'C-H1', endTime: 'C', aggregateBy: 'THREAD_STATE' },
                                            byType: { beginTime: 'C-H1', endTime: 'C', aggregateBy: 'THREAD_TYPE' },
                                            description: 'Thread Samples 집계 데이터를 조회합니다.'
                                        },
                                        ExpensiveStatements: {
                                            default: { minDurationS: 60, minMemoryGB: 1 },
                                            longRunning: { minDurationS: 300, minMemoryGB: 2 },
                                            memoryIntensive: { minDurationS: 30, minMemoryGB: 5 },
                                            description: '비용이 높은 SQL 문장을 찾습니다.'
                                        },
                                        SQLCacheTopLists: {
                                            default: { topNExecTime: 10, topNTotalMemory: 10 },
                                            detailed: { topNExecTime: 20, topNTotalMemory: 20 },
                                            description: 'SQL Cache Top 리스트를 조회합니다.'
                                        }
                                    }
                                }, null, 2)
                            }
                        ]
                    };
                case 'hana://results/last-query':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    lastResult: this.lastQueryResult,
                                    timestamp: this.lastQueryResult ? new Date().toISOString() : null,
                                    description: '마지막으로 실행된 도구의 결과입니다.'
                                }, null, 2)
                            }
                        ]
                    };
                case 'hana://results/query-history':
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({
                                    history: this.queryHistory,
                                    totalCount: this.queryHistory.length,
                                    maxSize: this.maxHistorySize,
                                    description: '최근 실행된 도구들의 히스토리입니다.'
                                }, null, 2)
                            }
                        ]
                    };
                default:
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `알 수 없는 리소스: ${uri}`);
            }
        });
        // Handler for CallToolRequest
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            try {
                await (0, utils_1.createConnection)(this.hanaConfig);
            }
            catch (error) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `HANA 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
            }
            const startTime = Date.now();
            let response;
            try {
                switch (request.params.name) {
                    case 'SystemOverview':
                        response = await (0, handleSystemOverview_1.handleSystemOverview)(request.params.arguments);
                        break;
                    case 'DiskUsage':
                        response = await (0, handleDiskUsage_1.handleDiskUsage)(request.params.arguments);
                        break;
                    case 'CpuUsage':
                        response = await (0, handleCpuUsage_1.handleCpuUsage)(request.params.arguments);
                        break;
                    case 'ActiveSessions':
                        response = await (0, handleActiveSessions_1.handleActiveSessions)(request.params.arguments);
                        break;
                    case 'TableStats':
                        response = await (0, handleTableStats_1.handleTableStats)(request.params.arguments);
                        break;
                    case 'ServiceStats':
                        response = await (0, handleServiceStats_1.handleServiceStats)(request.params.arguments);
                        break;
                    case 'CustomQuery':
                        response = await (0, handleCustomQuery_1.handleCustomQuery)(request.params.arguments);
                        break;
                    case 'LoadHistory':
                        response = await (0, handleLoadHistory_1.handleLoadHistory)(request.params.arguments);
                        break;
                    case 'ThreadSamplesAggregation':
                        response = await (0, handleThreadSamplesAggregation_1.handleThreadSamplesAggregation)(request.params.arguments);
                        break;
                    case 'ExpensiveStatements':
                        response = await (0, handleExpensiveStatements_1.handleExpensiveStatements)(request.params.arguments);
                        break;
                    case 'SQLCacheTopLists':
                        response = await (0, handleSQLCacheTopLists_1.handleSQLCacheTopLists)(request.params.arguments);
                        break;
                    default:
                        throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `알 수 없는 도구: ${request.params.name}`);
                }
                // 결과 저장 및 히스토리 관리
                const endTime = Date.now();
                const executionTime = endTime - startTime;
                this.lastQueryResult = {
                    tool: request.params.name,
                    parameters: request.params.arguments,
                    result: response,
                    executionTime: `${executionTime}ms`,
                    timestamp: new Date().toISOString(),
                    success: !response.isError
                };
                // 히스토리에 추가 (최대 크기 유지)
                if (!this.queryHistory) {
                    this.queryHistory = [];
                }
                this.queryHistory.unshift({
                    timestamp: new Date().toISOString(),
                    tool: request.params.name,
                    params: request.params.arguments,
                    result: response
                });
                if (this.queryHistory.length > this.maxHistorySize) {
                    this.queryHistory = this.queryHistory.slice(0, this.maxHistorySize);
                }
            }
            catch (error) {
                // 에러 결과도 저장
                const endTime = Date.now();
                const executionTime = endTime - startTime;
                this.lastQueryResult = {
                    tool: request.params.name,
                    parameters: request.params.arguments,
                    error: error instanceof Error ? error.message : String(error),
                    executionTime: `${executionTime}ms`,
                    timestamp: new Date().toISOString(),
                    success: false
                };
                throw error;
            }
            return {
                content: response.content,
                isError: response.isError
            };
        });
        // Handle server shutdown
        process.on('SIGINT', async () => {
            (0, utils_1.closeConnection)();
            await this.server.close();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            (0, utils_1.closeConnection)();
            await this.server.close();
            process.exit(0);
        });
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
    }
}
exports.HanaMonitoringServer = HanaMonitoringServer;
// Create and run the server
try {
    const server = new HanaMonitoringServer();
    server.run().catch((error) => {
        process.stderr.write(`[ERROR] 서버 실행 실패: ${error}\n`);
        process.stderr.write(`[ERROR] 상세 오류: ${error.stack}\n`);
        process.exit(1);
    });
}
catch (error) {
    process.stderr.write(`[ERROR] 서버 생성 실패: ${error}\n`);
    process.stderr.write(`[ERROR] 상세 오류: ${error instanceof Error ? error.stack : error}\n`);
    process.exit(1);
}
