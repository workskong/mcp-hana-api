"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSystemOverview = handleSystemOverview;
const utils_1 = require("../lib/utils");
async function handleSystemOverview() {
    try {
        const query = `
      SELECT 
        DATABASE_NAME,
        DESCRIPTION,
        ACTIVE_STATUS,
        ACTIVE_STATUS_DETAILS,
        RESTART_MODE
      FROM SYS.M_DATABASES
      UNION ALL
      SELECT 
        (SECTION || ' - ' || NAME) AS DATABASE_NAME,
        VALUE AS DESCRIPTION,
        STATUS AS ACTIVE_STATUS,
        '' AS ACTIVE_STATUS_DETAILS,
        '' AS RESTART_MODE
      FROM SYS.M_SYSTEM_OVERVIEW
      WHERE VALUE IS NOT NULL AND VALUE != ''
      ORDER BY DATABASE_NAME
    `;
        const result = await (0, utils_1.executeQuery)(query);
        return (0, utils_1.formatQueryResult)(result, 'HANA 시스템 개요');
    }
    catch (error) {
        return (0, utils_1.createErrorResponse)(error, '시스템 개요 조회 실패');
    }
}
