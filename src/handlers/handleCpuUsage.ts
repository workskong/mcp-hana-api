import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse } from '../lib/utils';

export interface CpuUsageParams {
  host?: string;
  timeRange?: number; // minutes
}

export async function handleCpuUsage(params: CpuUsageParams): Promise<ToolResponse> {
  try {
    let query = `
      SELECT 
        HOST,
        ROUND(
          100 * (TOTAL_CPU_USER_TIME + TOTAL_CPU_SYSTEM_TIME) /
          NULLIF((TOTAL_CPU_USER_TIME + TOTAL_CPU_SYSTEM_TIME + TOTAL_CPU_WIO_TIME + TOTAL_CPU_IDLE_TIME), 0),
          2
        ) AS CPU_USAGE_PCT,
        TOTAL_CPU_USER_TIME,
        TOTAL_CPU_SYSTEM_TIME,
        TOTAL_CPU_WIO_TIME,
        TOTAL_CPU_IDLE_TIME,
        SYS_TIMESTAMP AS SERVER_TIMESTAMP
      FROM SYS.M_HOST_RESOURCE_UTILIZATION
    `;

    if (params.host) {
      query += ` WHERE HOST = '${params.host}'`;
    }

    if (params.timeRange) {
      const timeCondition = params.host ? ' AND ' : ' WHERE ';
      query += `${timeCondition} SYS_TIMESTAMP >= ADD_SECONDS(CURRENT_TIMESTAMP, -${params.timeRange * 60})`;
    }

    query += ` ORDER BY HOST, SERVER_TIMESTAMP DESC`;

    const result = await executeQuery(query);
    return formatQueryResult(result, '🖥️ HANA CPU 사용률');
  } catch (error) {
    return createErrorResponse(`CPU 사용률 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
