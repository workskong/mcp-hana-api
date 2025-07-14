import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse } from '../lib/utils';

export interface ActiveSessionsParams {
  statementHash?: string;
  appUser?: string;
  appName?: string;
  appSource?: string;
  minMemUsedMB?: number;
  minExecTimeS?: number;
  orderBy?: string;
}

export async function handleActiveSessions(params: ActiveSessionsParams): Promise<ToolResponse> {
  try {
    // Extract and sanitize parameters
    const {
      statementHash = '%',
      appUser = '%',
      appName = '%',
      appSource = '%',
      minMemUsedMB = -1,
      minExecTimeS = -1,
      orderBy = 'START_TIME'
    } = params;

    const query = `
      SELECT
        HOST,
        PORT,
        SERVICE,
        WORKLOAD_CLASS,
        CONN_ID,
        STATEMENT_HASH,
        STATEMENT_STATUS STATUS,
        EXECUTION_START,
        EXEC_TIME_S,
        USED_MEM_MB,
        IFNULL(APP_USER, '') APP_USER,
        IFNULL(APP_NAME, '') APP_NAME,
        APPLICATION_SOURCE APP_SOURCE,
        SQL_TEXT,
        SUBSTR(MDS_CALC_VIEW, 1, LOCATE(MDS_CALC_VIEW, '","') - 1) MDS_CALC_VIEW
      FROM
      ( SELECT
          A.HOST,
          LPAD(A.PORT, 5) PORT,
          S.SERVICE_NAME SERVICE,
          A.WORKLOAD_CLASS_NAME WORKLOAD_CLASS,
          LPAD(A.CONNECTION_ID, 8) CONN_ID,
          A.STATEMENT_HASH,
          A.STATEMENT_STATUS,
          TO_VARCHAR(CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(A.LAST_ACT_TIME, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE A.LAST_ACT_TIME END, 'YYYY/MM/DD HH24:MI:SS.FF3') EXECUTION_START,
          LPAD(GREATEST(0, TO_DECIMAL(NANO100_BETWEEN(A.LAST_ACT_TIME, CURRENT_TIMESTAMP) / 10000000, 10, 2)), 11) EXEC_TIME_S,
          A.APPLICATION_SOURCE,
          (SELECT MIN(VALUE) FROM M_SESSION_CONTEXT C WHERE C.CONNECTION_ID = A.CONNECTION_ID AND C.HOST = A.HOST AND C.KEY LIKE '%APPLICATIONUSER' ) APP_USER,
          (SELECT MIN(VALUE) FROM M_SESSION_CONTEXT C WHERE C.CONNECTION_ID = A.CONNECTION_ID AND C.HOST = A.HOST AND C.KEY = 'APPLICATION' ) APP_NAME,
          LPAD(TO_DECIMAL(A.ALLOCATED_MEMORY_SIZE / 1024 / 1024, 10, 2), 11) USED_MEM_MB,
          A.SQL_TEXT,
          SUBSTR(A.SQL_TEXT, LOCATE(A.SQL_TEXT, 'ObjectName') + 13) MDS_CALC_VIEW,
          BI.STATEMENT_HASH BI_STATEMENT_HASH,
          BI.APP_USER BI_APP_USER,
          BI.APP_NAME BI_APP_NAME,
          BI.APP_SOURCE BI_APP_SOURCE,
          BI.ORDER_BY
        FROM
        ( SELECT                  /* Modification section */
            'SERVER' TIMEZONE,                              /* SERVER, UTC */
            '%' HOST,
            '%' PORT,
            '%' SERVICE_NAME,
            '%' WORKLOAD_CLASS,
            -1 CONN_ID,
            ? STATEMENT_HASH,
            '%' STATEMENT_STATUS,
            '%' SQL_PATTERN,
            ? APP_USER,
            ? APP_NAME,
            ? APP_SOURCE,
            ? MIN_MEM_USED_MB,
            ? MIN_EXEC_TIME_S,
            80 SQL_TEXT_LENGTH,
            ? ORDER_BY          /* START_TIME, MEMORY */
          FROM
            DUMMY
        ) BI,
          M_SERVICES S,
          M_CONNECTIONS C,
        ( SELECT
            *,
            IFNULL(LAST_EXECUTED_TIME, LAST_ACTION_TIME) LAST_ACT_TIME,
            TO_VARCHAR(STATEMENT_STRING) SQL_TEXT
          FROM
            M_ACTIVE_STATEMENTS
        ) A
        WHERE
          S.HOST LIKE BI.HOST AND
          TO_VARCHAR(S.PORT) LIKE BI.PORT AND
          S.SERVICE_NAME LIKE BI.SERVICE_NAME AND
          A.HOST = S.HOST AND
          A.PORT = S.PORT AND
          A.WORKLOAD_CLASS_NAME LIKE BI.WORKLOAD_CLASS AND
          ( BI.CONN_ID = -1 OR A.CONNECTION_ID = BI.CONN_ID ) AND
          TO_VARCHAR(A.STATEMENT_STRING) LIKE BI.SQL_PATTERN AND
          ( BI.MIN_MEM_USED_MB = -1 OR A.ALLOCATED_MEMORY_SIZE / 1024 / 1024 >= BI.MIN_MEM_USED_MB ) AND
          ( BI.MIN_EXEC_TIME_S = -1 OR SECONDS_BETWEEN(LAST_ACT_TIME, CURRENT_TIMESTAMP) >= BI.MIN_EXEC_TIME_S ) AND
          A.STATEMENT_STATUS LIKE BI.STATEMENT_STATUS AND
          C.CONNECTION_ID = A.CONNECTION_ID AND
          C.OWN != 'TRUE'
      )
      WHERE
        STATEMENT_HASH LIKE BI_STATEMENT_HASH AND
        IFNULL(APP_USER, '') LIKE BI_APP_USER AND
        IFNULL(APP_NAME, '') LIKE BI_APP_NAME AND
        IFNULL(APPLICATION_SOURCE, '') LIKE BI_APP_SOURCE
      ORDER BY
        MAP(ORDER_BY, 'START_TIME', EXECUTION_START),
        MAP(ORDER_BY, 'MEMORY', USED_MEM_MB) DESC,
        CONN_ID
    `;

    const queryParams = [
      statementHash,
      appUser,
      appName,
      appSource,
      minMemUsedMB,
      minExecTimeS,
      orderBy
    ];

    // Add logging for debugging
    console.log('Executing active sessions query:', {
      query: query.substring(0, 100) + '...',
      params: queryParams,
      filters: {
        statementHash,
        appUser,
        appName,
        appSource,
        minMemUsedMB,
        minExecTimeS,
        orderBy
      }
    });

    const result = await executeQuery(query, queryParams);
    
    // Add result count logging
    const sessionCount = Array.isArray(result) ? result.length : 0;
    console.log(`Found ${sessionCount} active sessions`);
    
    return formatQueryResult(result, '🔗 HANA 활성 세션');
  } catch (error) {
    console.error('Active sessions query failed:', error);
    return createErrorResponse(`활성 세션 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
