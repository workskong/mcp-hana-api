"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleServiceStats = handleServiceStats;
const utils_1 = require("../lib/utils");
async function handleServiceStats(params) {
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
        const conditions = [];
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
        const result = await (0, utils_1.executeQuery)(query);
        return (0, utils_1.formatQueryResult)(result, 'HANA 서비스 통계');
    }
    catch (error) {
        return (0, utils_1.createErrorResponse)(`서비스 통계 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
}
