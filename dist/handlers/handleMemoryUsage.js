"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMemoryUsage = handleMemoryUsage;
const utils_1 = require("../lib/utils");
async function handleMemoryUsage(params) {
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
        const result = await (0, utils_1.executeQuery)(query);
        return (0, utils_1.formatQueryResult)(result, 'HANA 메모리 사용률');
    }
    catch (error) {
        return (0, utils_1.createErrorResponse)(`메모리 사용률 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
}
