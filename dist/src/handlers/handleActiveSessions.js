"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleActiveSessions = handleActiveSessions;
const utils_1 = require("../lib/utils");
async function handleActiveSessions(params) {
    try {
        let query = `
      SELECT 
        HOST,
        CONNECTION_ID,
        USER_NAME,
        CLIENT_HOST,
        CLIENT_IP,
        CLIENT_PID,
        CLIENT_APPLICATION,
        CLIENT_VERSION,
        CONNECTION_STATUS,
        CONNECTION_TYPE,
        TRANSACTION_ID,
        START_TIME,
        IDLE_TIME,
        LAST_ACTION,
        CURRENT_SCHEMA_NAME
      FROM SYS.M_CONNECTIONS
      WHERE CONNECTION_STATUS = 'RUNNING'
    `;
        const conditions = [];
        if (params.userId) {
            conditions.push(`USER_NAME = '${params.userId}'`);
        }
        if (params.applicationName) {
            conditions.push(`CLIENT_APPLICATION LIKE '%${params.applicationName}%'`);
        }
        if (conditions.length > 0) {
            query += ` AND ${conditions.join(' AND ')}`;
        }
        query += ` ORDER BY START_TIME DESC`;
        const result = await (0, utils_1.executeQuery)(query);
        return (0, utils_1.formatQueryResult)(result, '🔗 HANA 활성 세션');
    }
    catch (error) {
        return (0, utils_1.createErrorResponse)(`활성 세션 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
}
