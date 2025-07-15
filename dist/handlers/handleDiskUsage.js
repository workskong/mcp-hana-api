"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDiskUsage = handleDiskUsage;
const utils_1 = require("../lib/utils");
async function handleDiskUsage(params) {
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
        const result = await (0, utils_1.executeQuery)(query);
        return (0, utils_1.formatQueryResult)(result, 'HANA 디스크 사용률');
    }
    catch (error) {
        return (0, utils_1.createErrorResponse)(`디스크 사용률 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
}
