import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse } from '../lib/utils';

export interface ServiceStatsParams {
  serviceName?: string;
  host?: string;
}

export async function handleServiceStats(params: ServiceStatsParams): Promise<ToolResponse> {
  try {
    let query = `
      SELECT 
        HOST,
        PORT,
        SERVICE_NAME,
        PROCESS_ID,
        PHYSICAL_MEMORY_SIZE,
        EFFECTIVE_ALLOCATION_LIMIT,
        TOTAL_MEMORY_USED_SIZE
      FROM SYS.M_SERVICE_MEMORY
    `;

    const conditions: string[] = [];
    
    if (params.host) {
      conditions.push(`HOST = '${params.host}'`);
    }
    
    if (params.serviceName) {
      conditions.push(`SERVICE_NAME LIKE '%${params.serviceName}%'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY HOST, SERVICE_NAME`;

    const result = await executeQuery(query);
    return formatQueryResult(result, 'HANA 서비스 통계');
  } catch (error) {
    return createErrorResponse(`서비스 통계 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
