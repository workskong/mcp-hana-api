"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLongRunningQueries = handleLongRunningQueries;
const utils_1 = require("../lib/utils");
async function handleLongRunningQueries(params = {}) {
    try {
        const { minDuration = 60, limit = 20, } = params;
        if (minDuration < 0) {
            return (0, utils_1.createErrorResponse)('minDuration은 0 이상이어야 합니다.');
        }
        if (limit < 1 || limit > 1000) {
            return (0, utils_1.createErrorResponse)('limit은 1에서 1000 사이여야 합니다.');
        }
        const where = [];
        const sqlParams = [];
        if (minDuration) {
            where.push('(DURATION / 1000) >= ?');
            sqlParams.push(minDuration);
        }
        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const sql = `
      SELECT
        STATEMENT_ID,
        USER_NAME,
        APPLICATION_NAME,
        START_TIME,
        (DURATION / 1000) AS DURATION_SECONDS,
        STATEMENT_STRING
      FROM
        SYS.M_ACTIVE_STATEMENTS
      ${whereClause}
      ORDER BY DURATION DESC
      LIMIT ?
    `;
        sqlParams.push(limit);
        const result = await (0, utils_1.executeQuery)(sql, sqlParams);
        return (0, utils_1.formatQueryResult)(result, '⏱️ HANA 장시간 실행 쿼리');
    }
    catch (error) {
        return (0, utils_1.createErrorResponse)('장시간 실행 쿼리 조회 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
}
