import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse } from '../lib/utils';

export interface DiskUsageParams {
  host?: string;
  detailed?: boolean;
}

export async function handleDiskUsage(params: DiskUsageParams): Promise<ToolResponse> {
  try {
    let query = `
      SELECT 
        HOST,
        USAGE_TYPE,
        ROUND(USED_SIZE / 1024 / 1024 / 1024, 2) AS USED_SIZE_GB,
        ROUND(TOTAL_SIZE / 1024 / 1024 / 1024, 2) AS TOTAL_SIZE_GB,
        ROUND((USED_SIZE / TOTAL_SIZE) * 100, 2) AS USAGE_PCT,
        PATH
      FROM SYS.M_DISKS
    `;

    if (params.host) {
      query += ` WHERE HOST = '${params.host}'`;
    }

    query += ` ORDER BY HOST, USAGE_TYPE`;

    const result = await executeQuery(query);
    return formatQueryResult(result, '💿 HANA 디스크 사용률');
  } catch (error) {
    return createErrorResponse(`디스크 사용률 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
