import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse } from '../lib/utils';

export interface TableStatsParams {
  schemaName?: string;
  tableName?: string;
  topN?: number;
}

export async function handleTableStats(params: TableStatsParams): Promise<ToolResponse> {
  try {
    let query = `
      SELECT 
        SCHEMA_NAME,
        TABLE_NAME,
        TABLE_TYPE,
        ROUND(TABLE_SIZE / 1024 / 1024, 2) AS SIZE_MB,
        RECORD_COUNT,
        IS_COLUMN_TABLE,
        IS_PARTITIONED,
        IS_REPLICATED
      FROM SYS.M_TABLES
      WHERE TABLE_TYPE IN ('COLUMN', 'ROW')
    `;

    const conditions: string[] = [];
    
    if (params.schemaName) {
      conditions.push(`SCHEMA_NAME = '${params.schemaName}'`);
    }
    
    if (params.tableName) {
      conditions.push(`TABLE_NAME LIKE '%${params.tableName}%'`);
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    const topN = params.topN || 100;
    query = `SELECT TOP ${topN} * FROM (${query}) ORDER BY SIZE_MB DESC`;

    const result = await executeQuery(query);
    return formatQueryResult(result, '📊 HANA 테이블 통계');
  } catch (error) {
    return createErrorResponse(`테이블 통계 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
