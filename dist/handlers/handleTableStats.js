"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTableStats = handleTableStats;
const utils_1 = require("../lib/utils");
async function handleTableStats(params) {
    try {
        // 파라미터 보정: 빈값(null, undefined, '')이면 '%'로 대체
        const safeSchemaName = params.schemaName && params.schemaName.trim() !== '' ? params.schemaName : '%';
        const safeTableName = params.tableName && params.tableName.trim() !== '' ? params.tableName : '%';
        let query = `
      SELECT 
        SCHEMA_NAME,
        TABLE_NAME,
        TABLE_TYPE,
        ROUND(TABLE_SIZE / 1024 / 1024, 2) AS SIZE_MB,
        RECORD_COUNT,
        IS_COLUMN_TABLE,
        IS_PARTITIONED,
        IS_REPLICATED
      FROM SYS.M_TABLES
      WHERE TABLE_TYPE IN ('COLUMN', 'ROW')
    `;
        const conditions = [];
        if (safeSchemaName !== '%') {
            conditions.push(`SCHEMA_NAME = '${safeSchemaName}'`);
        }
        if (safeTableName !== '%') {
            conditions.push(`TABLE_NAME LIKE '%${safeTableName}%'`);
        }
        if (conditions.length > 0) {
            query += ` AND ${conditions.join(' AND ')}`;
        }
        const topN = params.topN || 100;
        query = `SELECT TOP ${topN} * FROM (${query}) ORDER BY SIZE_MB DESC`;
        const result = await (0, utils_1.executeQuery)(query);
        return (0, utils_1.formatQueryResult)(result, 'HANA 테이블 통계');
    }
    catch (error) {
        return (0, utils_1.createErrorResponse)(`테이블 통계 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
}
