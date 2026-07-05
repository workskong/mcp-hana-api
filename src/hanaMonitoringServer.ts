import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { createConnection, closeConnection, HanaConfig } from './lib/utils';
import { toolDefinitions, type ToolDefinition } from './lib/toolDefinitions';
dotenv.config();

export function getConfig(): HanaConfig {
  const serverNode = process.env.HANA_SERVER_NODE
    || (process.env.HANA_HOST && process.env.HANA_PORT ? `${process.env.HANA_HOST}:${process.env.HANA_PORT}` : undefined)
    || 'localhost:30215';

  const uid = process.env.HANA_UID || process.env.HANA_USER || '';
  const pwd = process.env.HANA_PWD || process.env.HANA_PASSWORD || '';

  if (!uid || !pwd) {
    throw new Error('Missing HANA credentials. Set HANA_UID/HANA_PWD or HANA_USER/HANA_PASSWORD in environment variables.');
  }

  return {
    serverNode,
    uid,
    pwd
  };
}

export class HanaMonitoringServer {
  private server: Server;
  private hanaConfig: HanaConfig;
  private lastQueryResult: any = null;
  private queryHistory: Array<{ timestamp: string; tool: string; params: any; result: any }> = [];
  private readonly maxHistorySize = 50;
  private readonly tools: ToolDefinition[] = toolDefinitions;

  constructor() {
    this.hanaConfig = getConfig();
    this.server = new Server(
      {
        name: 'mcp-hana-monitoring',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );
    this.setupHandlers();
  }

  private setupHandlers() {
    this.registerToolListHandler();
    this.registerResourceListHandler();
    this.registerResourceReadHandler();
    this.registerToolCallHandler();
    this.registerShutdownHandlers();
  }

  private registerToolListHandler() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema
        }))
      };
    });
  }

  private registerResourceListHandler() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
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
  }

  private registerResourceReadHandler() {
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
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
                  passwordConfigured: !!this.hanaConfig.pwd
                }, null, 2)
              }
            ]
          };
        case 'hana://status':
          try {
            const connection = await createConnection(this.hanaConfig);
            closeConnection();
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
          } catch (error) {
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
        case 'hana://tools-info': {
          // 동적 카테고리 분류
          const systemMonitoringKeywords = [
            'system', 'overview', 'resource', 'session', 'config', 'disk', 'cpu', 'memory', 'cache', 'service', 'active', 'sqlcache'
          ];
          const performanceAnalysisKeywords = [
            'load', 'thread', 'expensive', 'performance', 'top', 'hash', 'history', 'aggregation', 'statement', 'sqlcachetoplists'
          ];
          const categories: Record<string, string[]> = {
            systemMonitoring: [],
            performanceAnalysis: [],
            others: []
          };
          for (const toolDefinition of this.tools) {
            const toolName = toolDefinition.name;
            const desc = (toolDefinition.description || '').toLowerCase();
            const name = toolName.toLowerCase();
            if (systemMonitoringKeywords.some(k => name.includes(k) || desc.includes(k))) {
              categories.systemMonitoring!.push(toolName);
            } else if (performanceAnalysisKeywords.some(k => name.includes(k) || desc.includes(k))) {
              categories.performanceAnalysis!.push(toolName);
            } else {
              categories.others!.push(toolName);
            }
          }
          // others가 비어있으면 categories에서 제거
          if (categories.others!.length === 0) delete categories.others;
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  totalTools: this.tools.length,
                  categories,
                  description: 'SAP HANA 데이터베이스 모니터링을 위한 MCP 서버입니다.',
                  features: [
                    '실시간 시스템 모니터링',
                    '메모리, 디스크, CPU 사용률 추적',
                    '활성 세션 및 테이블 통계',
                    '사용자 정의 쿼리 실행',
                    'Load History 성능 분석',
                    'Thread Samples 집계 분석',
                    '비용이 높은 SQL Statement 감지',
                    'SQL Cache Top 리스트 조회',
                    'Statement Hash 기반 상세 데이터 수집'
                  ]
                }, null, 2)
              }
            ]
          };
        }
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
                      description: 'HANA 메모리 Top Consumers 집계 데이터 조회',
                      query: 'SELECT HOST, ROUND(USED_PHYSICAL_MEMORY/1024/1024/1024, 2) AS USED_GB, ROUND(FREE_PHYSICAL_MEMORY/1024/1024/1024, 2) AS FREE_GB FROM SYS.M_HOST_RESOURCE_UTILIZATION',
                      toolMapping: 'Memory_TopConsumers_TimeSlices'
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
                      basic: {},
                      description: '시스템 전체 상태를 확인합니다.'
                    },
                    SQLCache: {
                      basic: { beginTime: 'C-H1', endTime: 'C' },
                      byTable: { tableName: 'MY_TABLE' },
                      description: 'SQL 캐시 정보를 조회합니다.'
                    },
                    ExpensiveStatements: {
                      default: { beginTime: 'C-H6', endTime: 'C' },
                      description: '비용이 높은 SQL 문장을 찾습니다.'
                    },
                    // ... 실제 핸들러가 있는 도구만!
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
          throw new McpError(
            ErrorCode.InvalidRequest,
            `알 수 없는 리소스: ${uri}`
          );
      }
    });
  }

  private registerToolCallHandler() {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        await createConnection(this.hanaConfig);
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `HANA 연결 실패: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      const startTime = Date.now();
      let response;
      try {
        const tool = this.tools.find((entry) => entry.name === request.params.name);
        if (!tool) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `알 수 없는 도구: ${request.params.name}`
          );
        }
        const args = request.params.arguments ?? {};
        // null을 빈 문자열 또는 undefined로 변환
        for (const key in args) {
          if (args[key] === null) {
            delete args[key]; // 또는 args[key] = '';
          }
        }
        response = await tool.handler(args);
        // 결과 저장 및 히스토리 관리 (기존 코드 유지)
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
      } catch (error) {
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
  }

  private registerShutdownHandlers() {
    process.on('SIGINT', async () => {
      closeConnection();
      await this.server.close();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      closeConnection();
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
} 