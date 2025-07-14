import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse } from '../lib/utils';

export interface MemoryUsageParams {
  detailed?: boolean;
  host?: string;
}

export async function handleMemoryUsage(params: MemoryUsageParams): Promise<ToolResponse> {
  try {
    let query = `
      SELECT 
        HOST,
        ROUND(TOTAL_PHYSICAL_MEMORY / 1024 / 1024 / 1024, 2) AS TOTAL_MEMORY_GB,
        ROUND(USED_PHYSICAL_MEMORY / 1024 / 1024 / 1024, 2) AS USED_MEMORY_GB,
        ROUND(FREE_PHYSICAL_MEMORY / 1024 / 1024 / 1024, 2) AS FREE_MEMORY_GB,
        ROUND((USED_PHYSICAL_MEMORY / TOTAL_PHYSICAL_MEMORY) * 100, 2) AS MEMORY_USAGE_PCT
      FROM SYS.M_HOST_RESOURCE_UTILIZATION
    `;

    if (params.host) {
      query += ` WHERE HOST = '${params.host}'`;
    }

    query += ` ORDER BY HOST`;

    const result = await executeQuery(query);
    return formatQueryResult(result, 'HANA 메모리 사용률');
  } catch (error) {
    return createErrorResponse(`메모리 사용률 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
