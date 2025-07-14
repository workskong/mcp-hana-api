import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse } from '../lib/utils';

export interface ExpensiveStatementsParams {
  beginTime?: string;
  endTime?: string;
  timezone?: string;
  host?: string;
  port?: string;
  connectionId?: number;
  statementHash?: string;
  workloadClass?: string;
  appUser?: string;
  dbUser?: string;
  sqlPattern?: string;
  appSource?: string;
  bindValues?: string;
  sessionVariables?: string;
  errorCode?: number;
  errorText?: string;
  onlyErrors?: boolean;
  sqlTextOutputLength?: number;
  minMemoryGB?: number;
  maxMemoryGB?: number;
  minDurationS?: number;
  minSqlTextLength?: number;
  operations?: string;
  aggregateBy?: string;
  timeAggregateBy?: string;
  orderBy?: string;
  resultRows?: number;
}

export async function handleExpensiveStatements(params: ExpensiveStatementsParams): Promise<ToolResponse> {
  try {
    // Extract and sanitize parameters with defaults
    const {
      beginTime = '1000/10/18 07:58:00',
      endTime = '9999/10/18 08:05:00',
      timezone = 'SERVER',
      host = '%',
      port = '%',
      connectionId = -1,
      statementHash = '%',
      workloadClass = '%',
      appUser = '%',
      dbUser = '%',
      sqlPattern = '%',
      appSource = '%',
      bindValues = '%',
      sessionVariables = '%',
      errorCode = -1,
      errorText = '%',
      onlyErrors = false,
      sqlTextOutputLength = 40,
      minMemoryGB = -1,
      maxMemoryGB = -1,
      minDurationS = -1,
      minSqlTextLength = -1,
      operations = '%',
      aggregateBy = 'NONE',
      timeAggregateBy = 'NONE',
      orderBy = 'TIME',
      resultRows = -1
    } = params;

    const query = `
SELECT
/* 
[NAME]
- HANA_SQL_ExpensiveStatements_2.00.040+

[DESCRIPTION]
- Load information for expensive SQL statements

[SOURCE]
- SAP Note 1969700

[DETAILS AND RESTRICTIONS]
- Only populated if expensive statements trace is activated (SAP Note 2180165)
- Column STATEMENT_HASH available with SAP HANA >= 1.00.60
- Column STATEMENT_EXECUTION_ID and view M_EXPENSIVE_STATEMENT_EXECUTION_LOCATION_STATISTICS available starting with SAP HANA 1.00.120.
- SRV_PER_EXEC_MS only populated if the related client network communication was traced, activation
  of SQL client network I/O trace via:

  indexserver.ini --> [sql_client_network_io] --> enabled = true

- Column SESSION_VARIABLES available with SAP HANA >= 2.00.040

[VALID FOR]
- Revisions:              >= 2.00.040

[SQL COMMAND VERSION]
- 2014/03/29:  1.0 (initial version)
- 2014/11/05:  1.1 (DB_USER, OPERATION included)
- 2014/11/18:  1.2 (MEMORY_SIZE included, OPERATION -> OPERATIONS)
- 2014/12/05:  1.3 (SRV_PER_EXEC_MS included)
- 2014/12/15:  1.4 (CPU_MS included)
- 2014/12/18:  1.5 (BIND_VALUES added)
- 2015/05/06:  1.6 (APPLICATION_SOURCE and HOST added)
- 2016/02/14:  1.7 (ERROR_CODE / ERROR_TEXT included)
- 2016/02/23:  1.8 (TIME_AGGREGATE_BY included)
- 2016/03/12:  1.9 (MIN_MEM_GB included)
- 2016/03/23:  2.0 (CONN_ID included)
- 2016/12/31:  2.1 (TIME_AGGREGATE_BY = 'TS<seconds>' included)
- 2017/10/23:  2.2 (M_EXPENSIVE_STATEMENT_EXECUTION_LOCATION_STATISTICS included)
- 2017/10/26:  2.3 (TIMEZONE included)
- 2018/01/07:  2.4 (AGGREGATE_BY = 'BINDS' added)
- 2018/03/12:  2.5 (ORDER_BY = 'EXECUTIONS' added)
- 2018/10/10:  2.6 (MIN_DURATION_S included)
- 2018/12/04:  2.7 (shortcuts for BEGIN_TIME and END_TIME like 'C', 'E-S900' or 'MAX')
- 2019/03/27:  2.8 (SQL_LEN and MIN_SQL_TEXT_LENGTH included)
- 2020/06/02:  2.9 (PORT added)
- 2023/12/21:  3.0 (BIND_VALUES filter added)
- 2024/01/11:  3.1 (dedicated 2.00.040+ version including SESSION_VARIABLES, redesign of output columns)
- 2024/06/08:  3.2 (WORKLOAD_CLASS_NAME added)

[INVOLVED TABLES]
- M_EXPENSIVE_STATEMENTS
- M_EXPENSIVE_STATEMENT_EXECUTION_LOCATION_STATISTICS
- M_SQL_CLIENT_NETWORK_IO

[OUTPUT PARAMETERS]
- START_TIME:          Last start time of SQL statement
- STATEMENT_HASH:      Hash value of SQL statement
- WORKLOAD_CLASS:      Workload class
- EXECUTIONS:          Number of executions
- ELAPSED_S:           Elapsed time (s)
- CPU_S:               CPU time (s)
- AVG_ELA_MS:          Average elapsed time per execution (ms)
- AVG_CPU_MS:          Average CPU time per execution (ms)
- AVG_LOCK_MS:         Average lock wait time per execution (ms)
- AVG_RECORDS:         Rows returned per execution (ms)
- AVG_MEM_GB:          Average memory used per execution (GB)
- OPERATION:           SQL operation
- BIND_VALUES:         Bind values
- APP_SOURCE:          Application source
- APP_USER:            Application user name
- DB_USER:             Database user name
- ERROR:               Error details (0 in case of successful execution)
- SQL_LEN:             SQL statement text length
- SQL_TEXT:            SQL statement text
- HOST:                Host name
- PORT:                Port
- CONN_ID:             Connection ID
- AVG_SRV_MS:          Server time per execution (ms) reported by SQL network client I/O trace (if enabled)
- SESSION_VARIABLES:   List of session variables
- LOCATION_STATISTICS: Memory consumption per node / service
*/

  START_TIME,
  STATEMENT_HASH,
  WORKLOAD_CLASS,
  LPAD(EXECUTIONS, 10) EXECUTIONS,
  LPAD(TO_DECIMAL(ELAPSED_MS / 1000, 12, 2), 10) ELAPSED_S,
  LPAD(TO_DECIMAL(CPU_MS / 1000, 12, 2), 10) CPU_S,
  LPAD(TO_DECIMAL(ELA_PER_EXEC_MS, 12, 2), 10) AVG_ELA_MS,
  LPAD(TO_DECIMAL(CPU_PER_EXEC_MS, 12, 2), 10) AVG_CPU_MS,
  LPAD(TO_DECIMAL(LOCK_PER_EXEC_MS, 12, 2), 11) AVG_LOCK_MS,
  LPAD(TO_DECIMAL(REC_PER_EXEC, 12, 2), 11) AVG_RECORDS,
  LPAD(TO_DECIMAL(MEM_PER_EXEC_GB, 10, 2), 10) AVG_MEM_GB,
  OPERATION,
  BIND_VALUES,
  APP_SOURCE,
  APP_USER,
  DB_USER,
  ERROR,
  LPAD(TO_DECIMAL(SQL_TEXT_LENGTH, 10, 0), 7) SQL_LEN,
  SQL_TEXT,
  HOST,
  LPAD(PORT, 5) PORT,
  LPAD(CONN_ID, 10) CONN_ID,
  IFNULL(LPAD(TO_DECIMAL(SRV_PER_EXEC_MS, 12, 2) , 8), 'n/a') AVG_SRV_MS,
  SESSION_VARIABLES,
  IFNULL(LOCATION_STATISTICS, '') LOCATION_STATISTICS
FROM
( SELECT
    HOST,
    PORT,
    CONN_ID,
    STATEMENT_HASH,
    WORKLOAD_CLASS,
    EXECUTIONS,
    ELAPSED_MS,
    CPU_MS,
    ELA_PER_EXEC_MS,
    SRV_PER_EXEC_MS,
    LOCK_PER_EXEC_MS,
    CPU_PER_EXEC_MS,
    REC_PER_EXEC,
    MEM_USED_GB,
    MEM_PER_EXEC_GB,
    START_TIME,
    OPERATION,
    APP_SOURCE,
    APP_USER,
    DB_USER,
    ERROR,
    SUBSTR(CASE
      WHEN LOCATE(UPPER(SQL_TEXT), 'FROM') <= 15 THEN
        SQL_TEXT
      ELSE
        SUBSTR(SQL_TEXT, 1, LOCATE(SQL_TEXT, CHAR(32))) || '...' || SUBSTR(SQL_TEXT, LOCATE(UPPER(SQL_TEXT), 'FROM') - 1)
    END, 1, MAP(SQL_TEXT_OUTPUT_LENGTH, -1, 9999, SQL_TEXT_OUTPUT_LENGTH)) SQL_TEXT,
    SQL_TEXT_LENGTH,
    BIND_VALUES,
    REPLACE(REPLACE(REPLACE(REPLACE(SESSION_VARIABLES, '"', ''), CHAR(32) || CHAR(32), CHAR(32)), '{' || CHAR(32), ''), CHAR(32) || '}', '') SESSION_VARIABLES,
    LOCATION_STATISTICS,
    RESULT_ROWS,
    ROW_NUMBER () OVER (ORDER BY
      MAP(ORDER_BY, 'TIME', START_TIME) DESC, 
      MAP(ORDER_BY, 'DURATION', ELAPSED_MS, 'MEMORY', MEM_USED_GB, 'CPU', CPU_MS, 'COUNT', EXECUTIONS, 'EXECUTIONS', EXECUTIONS, 'LENGTH', SQL_TEXT_LENGTH) DESC
    ) ROW_NUM
  FROM
  ( SELECT
      CASE 
        WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'TIME') != 0 THEN 
          CASE 
            WHEN BI.TIME_AGGREGATE_BY LIKE 'TS%' THEN
              TO_VARCHAR(ADD_SECONDS(TO_TIMESTAMP('2014/01/01 00:00:00', 'YYYY/MM/DD HH24:MI:SS'), FLOOR(SECONDS_BETWEEN(TO_TIMESTAMP('2014/01/01 00:00:00', 
              'YYYY/MM/DD HH24:MI:SS'), CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(ES.START_TIME, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE ES.START_TIME END) / SUBSTR(BI.TIME_AGGREGATE_BY, 3)) * SUBSTR(BI.TIME_AGGREGATE_BY, 3)), 'YYYY/MM/DD HH24:MI:SS')
            ELSE TO_VARCHAR(CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(ES.START_TIME, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE ES.START_TIME END, BI.TIME_AGGREGATE_BY)
          END
        ELSE 'any' 
      END START_TIME,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'HOST')      != 0 THEN ES.HOST                          ELSE MAP(BI.HOST, '%', 'any', BI.HOST)                           END HOST,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'PORT')      != 0 THEN TO_VARCHAR(ES.PORT)              ELSE MAP(BI.PORT, '%', 'any', BI.PORT)                           END PORT,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'HASH')      != 0 THEN ES.STATEMENT_HASH                ELSE MAP(BI.STATEMENT_HASH, '%', 'any', BI.STATEMENT_HASH)       END STATEMENT_HASH,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'WL_CLASS')  != 0 THEN ES.WORKLOAD_CLASS_NAME           ELSE MAP(BI.WORKLOAD_CLASS, '%', 'any', BI.WORKLOAD_CLASS)       END WORKLOAD_CLASS,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'CONN_ID')   != 0 THEN TO_VARCHAR(ES.CONNECTION_ID)     ELSE MAP(BI.CONN_ID, -1, 'any', TO_VARCHAR(BI.CONN_ID))          END CONN_ID,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'OPERATION') != 0 THEN ES.OPERATION                     ELSE MAP(BI.OPERATIONS, '%', 'any', BI.OPERATIONS)               END OPERATION,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'APP_USER')  != 0 THEN ES.APP_USER                      ELSE MAP(BI.APP_USER, '%', 'any', BI.APP_USER)                   END APP_USER,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'DB_USER')   != 0 THEN ES.DB_USER                       ELSE MAP(BI.DB_USER, '%', 'any', BI.DB_USER)                     END DB_USER,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'SOURCE')    != 0 THEN ES.APPLICATION_SOURCE            ELSE MAP(BI.APP_SOURCE, '%', 'any', BI.APP_SOURCE)               END APP_SOURCE,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'ERROR')     != 0 THEN ES.ERROR_CODE || MAP(ES.ERROR_TEXT, '', '', ' (' || ES.ERROR_TEXT || ')') ELSE 'any'              END ERROR,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'BINDS')     != 0 THEN ES.PARAMETERS                    ELSE MAP(BI.BIND_VALUES, '%', 'any', BI.BIND_VALUES)             END BIND_VALUES,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'SESS_VAR')  != 0 THEN TO_VARCHAR(ES.SESSION_VARIABLES) ELSE MAP(BI.SESSION_VARIABLES, '%', 'any', BI.SESSION_VARIABLES) END SESSION_VARIABLES,
      COUNT(*) EXECUTIONS,
      SUM(ES.DURATION_MICROSEC) / 1000 ELAPSED_MS,
      SUM(CASE WHEN ES.CPU_TIME / 1024 / 1024 / 1024 BETWEEN 0 AND 1000000 THEN ES.CPU_TIME ELSE 0 END) / 1000 CPU_MS,
      SUM(ES.DURATION_MICROSEC) / COUNT(*) / 1000 ELA_PER_EXEC_MS,
      SUM(N.SERVER_DURATION) / COUNT(*) / 1000 SRV_PER_EXEC_MS,
      SUM(ES.LOCK_WAIT_DURATION) / COUNT(*) / 1000 LOCK_PER_EXEC_MS,
      SUM(CASE WHEN ES.CPU_TIME / 1024 / 1024 / 1024 BETWEEN 0 AND 1000000 THEN ES.CPU_TIME ELSE 0 END) / COUNT(*) / 1000 CPU_PER_EXEC_MS,
      SUM(GREATEST(CASE WHEN ES.RECORDS BETWEEN 0 AND 100000000000 THEN ES.RECORDS ELSE 0 END, 0)) / COUNT(*) REC_PER_EXEC,
      SUM(CASE WHEN ES.MEMORY_SIZE / 1024 / 1024 / 1024 >= 1000000 THEN 0 ELSE ES.MEMORY_SIZE / 1024 / 1024 / 1024 END) MEM_USED_GB,
      SUM(CASE WHEN ES.MEMORY_SIZE / 1024 / 1024 / 1024 >= 1000000 THEN 0 ELSE ES.MEMORY_SIZE / 1024 / 1024 / 1024 END) / COUNT(*) MEM_PER_EXEC_GB,
      LTRIM(MAP(MIN(TO_VARCHAR(SUBSTR(ES.STATEMENT_STRING, 1, 5000))), MAX(TO_VARCHAR(SUBSTR(ES.STATEMENT_STRING, 1, 5000))), MIN(TO_VARCHAR(SUBSTR(ES.STATEMENT_STRING, 1, 5000))), 'various')) SQL_TEXT,
      AVG(LENGTH(ES.STATEMENT_STRING)) SQL_TEXT_LENGTH,
      MAP(MIN(ESL.LOCATION_STATISTICS), MAX(ESL.LOCATION_STATISTICS), MIN(ESL.LOCATION_STATISTICS), 'various') LOCATION_STATISTICS,
      BI.ORDER_BY,
      BI.RESULT_ROWS,
      BI.SQL_TEXT_OUTPUT_LENGTH,
      BI.MIN_SQL_TEXT_LENGTH
    FROM
    ( SELECT
        CASE
          WHEN BEGIN_TIME =    'C'                             THEN CURRENT_TIMESTAMP
          WHEN BEGIN_TIME LIKE 'C-S%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(BEGIN_TIME, 'C-S'))
          WHEN BEGIN_TIME LIKE 'C-M%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(BEGIN_TIME, 'C-M') * 60)
          WHEN BEGIN_TIME LIKE 'C-H%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(BEGIN_TIME, 'C-H') * 3600)
          WHEN BEGIN_TIME LIKE 'C-D%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(BEGIN_TIME, 'C-D') * 86400)
          WHEN BEGIN_TIME LIKE 'C-W%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(BEGIN_TIME, 'C-W') * 86400 * 7)
          WHEN BEGIN_TIME LIKE 'E-S%'                          THEN ADD_SECONDS(TO_TIMESTAMP(END_TIME, 'YYYY/MM/DD HH24:MI:SS'), -SUBSTR_AFTER(BEGIN_TIME, 'E-S'))
          WHEN BEGIN_TIME LIKE 'E-M%'                          THEN ADD_SECONDS(TO_TIMESTAMP(END_TIME, 'YYYY/MM/DD HH24:MI:SS'), -SUBSTR_AFTER(BEGIN_TIME, 'E-M') * 60)
          WHEN BEGIN_TIME LIKE 'E-H%'                          THEN ADD_SECONDS(TO_TIMESTAMP(END_TIME, 'YYYY/MM/DD HH24:MI:SS'), -SUBSTR_AFTER(BEGIN_TIME, 'E-H') * 3600)
          WHEN BEGIN_TIME LIKE 'E-D%'                          THEN ADD_SECONDS(TO_TIMESTAMP(END_TIME, 'YYYY/MM/DD HH24:MI:SS'), -SUBSTR_AFTER(BEGIN_TIME, 'E-D') * 86400)
          WHEN BEGIN_TIME LIKE 'E-W%'                          THEN ADD_SECONDS(TO_TIMESTAMP(END_TIME, 'YYYY/MM/DD HH24:MI:SS'), -SUBSTR_AFTER(BEGIN_TIME, 'E-W') * 86400 * 7)
          WHEN BEGIN_TIME =    'MIN'                           THEN TO_TIMESTAMP('1000/01/01 00:00:00', 'YYYY/MM/DD HH24:MI:SS')
          WHEN SUBSTR(BEGIN_TIME, 1, 1) NOT IN ('C', 'E', 'M') THEN TO_TIMESTAMP(BEGIN_TIME, 'YYYY/MM/DD HH24:MI:SS')
        END BEGIN_TIME,
        CASE
          WHEN END_TIME =    'C'                             THEN CURRENT_TIMESTAMP
          WHEN END_TIME LIKE 'C-S%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(END_TIME, 'C-S'))
          WHEN END_TIME LIKE 'C-M%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(END_TIME, 'C-M') * 60)
          WHEN END_TIME LIKE 'C-H%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(END_TIME, 'C-H') * 3600)
          WHEN END_TIME LIKE 'C-D%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(END_TIME, 'C-D') * 86400)
          WHEN END_TIME LIKE 'C-W%'                          THEN ADD_SECONDS(CURRENT_TIMESTAMP, -SUBSTR_AFTER(END_TIME, 'C-W') * 86400 * 7)
          WHEN END_TIME LIKE 'B+S%'                          THEN ADD_SECONDS(TO_TIMESTAMP(BEGIN_TIME, 'YYYY/MM/DD HH24:MI:SS'), SUBSTR_AFTER(END_TIME, 'B+S'))
          WHEN END_TIME LIKE 'B+M%'                          THEN ADD_SECONDS(TO_TIMESTAMP(BEGIN_TIME, 'YYYY/MM/DD HH24:MI:SS'), SUBSTR_AFTER(END_TIME, 'B+M') * 60)
          WHEN END_TIME LIKE 'B+H%'                          THEN ADD_SECONDS(TO_TIMESTAMP(BEGIN_TIME, 'YYYY/MM/DD HH24:MI:SS'), SUBSTR_AFTER(END_TIME, 'B+H') * 3600)
          WHEN END_TIME LIKE 'B+D%'                          THEN ADD_SECONDS(TO_TIMESTAMP(BEGIN_TIME, 'YYYY/MM/DD HH24:MI:SS'), SUBSTR_AFTER(END_TIME, 'B+D') * 86400)
          WHEN END_TIME LIKE 'B+W%'                          THEN ADD_SECONDS(TO_TIMESTAMP(BEGIN_TIME, 'YYYY/MM/DD HH24:MI:SS'), SUBSTR_AFTER(END_TIME, 'B+W') * 86400 * 7)
          WHEN END_TIME =    'MAX'                           THEN TO_TIMESTAMP('9999/12/31 00:00:00', 'YYYY/MM/DD HH24:MI:SS')
          WHEN SUBSTR(END_TIME, 1, 1) NOT IN ('C', 'B', 'M') THEN TO_TIMESTAMP(END_TIME, 'YYYY/MM/DD HH24:MI:SS')
        END END_TIME,
        TIMEZONE,
        HOST,
        PORT,
        CONN_ID,
        STATEMENT_HASH,
        WORKLOAD_CLASS,
        APP_USER,
        DB_USER,
        SQL_PATTERN,
        APP_SOURCE,
        BIND_VALUES,
        SESSION_VARIABLES,
        ERROR_CODE,
        ERROR_TEXT,
        ONLY_ERRORS,
        SQL_TEXT_OUTPUT_LENGTH,
        MIN_MEM_GB,
        MAX_MEM_GB,
        MIN_DURATION_S,
        MIN_SQL_TEXT_LENGTH,
        OPERATIONS,
        AGGREGATE_BY,
        ORDER_BY,
        RESULT_ROWS,
        MAP(TIME_AGGREGATE_BY,
          'NONE',        'YYYY/MM/DD HH24:MI:SS',
          'HOUR',        'YYYY/MM/DD HH24',
          'DAY',         'YYYY/MM/DD (DY)',
          'HOUR_OF_DAY', 'HH24',
          TIME_AGGREGATE_BY ) TIME_AGGREGATE_BY
      FROM
      ( SELECT
          ? BEGIN_TIME,
          ? END_TIME,
          ? TIMEZONE,
          ? HOST,
          ? PORT,
          ? CONN_ID,
          ? STATEMENT_HASH,
          ? WORKLOAD_CLASS,
          ? APP_USER,
          ? DB_USER,
          ? SQL_PATTERN,
          ? APP_SOURCE,
          ? BIND_VALUES,
          ? SESSION_VARIABLES,
          ? ERROR_CODE,
          ? ERROR_TEXT,
          ? ONLY_ERRORS,
          ? SQL_TEXT_OUTPUT_LENGTH,
          ? MIN_MEM_GB,
          ? MAX_MEM_GB,
          ? MIN_DURATION_S,
          ? MIN_SQL_TEXT_LENGTH,
          ? OPERATIONS,
          ? AGGREGATE_BY,
          ? TIME_AGGREGATE_BY,
          ? ORDER_BY,
          ? RESULT_ROWS
        FROM
          DUMMY
      )
    ) BI INNER JOIN
      M_EXPENSIVE_STATEMENTS ES ON
        CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(ES.START_TIME, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE ES.START_TIME END BETWEEN BI.BEGIN_TIME AND BI.END_TIME AND
        ES.HOST LIKE BI.HOST AND
        TO_VARCHAR(ES.PORT) LIKE BI.PORT AND
        ES.STATEMENT_HASH LIKE BI.STATEMENT_HASH AND
        ES.WORKLOAD_CLASS_NAME LIKE BI.WORKLOAD_CLASS AND
        ( BI.CONN_ID = -1 OR ES.CONNECTION_ID = BI.CONN_ID ) AND
        ( BI.OPERATIONS = 'TOTAL' AND ES.OPERATION IN ('AGGREGATED_EXECUTION', 'CALL', 'COMPILE', 'EXECUTE', 'EXECUTE_DDL', 'INSERT', 'UPDATE', 'DELETE') OR
          INSTR(BI.OPERATIONS, ES.OPERATION) != 0 OR
          BI.OPERATIONS = '%' ) AND
        ES.APP_USER LIKE BI.APP_USER AND
        ES.DB_USER LIKE BI.DB_USER AND
        IFNULL(ES.APPLICATION_SOURCE, '') LIKE BI.APP_SOURCE AND
        IFNULL(ES.PARAMETERS, '') LIKE BI.BIND_VALUES AND
        IFNULL(ES.SESSION_VARIABLES, '') LIKE BI.SESSION_VARIABLES AND
        ( BI.MIN_MEM_GB = -1 OR ES.MEMORY_SIZE / 1024 / 1024 / 1024 >= BI.MIN_MEM_GB ) AND 
        ( BI.MAX_MEM_GB = -1 OR ES.MEMORY_SIZE / 1024 / 1024 / 1024 <= BI.MAX_MEM_GB ) AND
        ( BI.MIN_DURATION_S = -1 OR ES.DURATION_MICROSEC >= BI.MIN_DURATION_S * 1000000 ) AND
        IFNULL(ES.ERROR_TEXT, '') LIKE BI.ERROR_TEXT AND
        ( BI.ERROR_CODE = -1 OR ES.ERROR_CODE = BI.ERROR_CODE ) AND
        ( BI.ONLY_ERRORS = ' ' OR ES.ERROR_CODE != 0) AND
        UPPER(TO_VARCHAR(SUBSTR(ES.STATEMENT_STRING, 1, 5000))) LIKE UPPER(BI.SQL_PATTERN) LEFT OUTER JOIN
      M_SQL_CLIENT_NETWORK_IO N ON
        N.HOST = ES.HOST AND
        N.PORT = ES.PORT AND
        N.MESSAGE_ID = ES.NETWORK_MESSAGE_ID AND
        N.CONNECTION_ID = ES.CONNECTION_ID LEFT OUTER JOIN
      ( SELECT
          STATEMENT_EXECUTION_ID,
          STRING_AGG(TO_DECIMAL(ROUND(MEMORY_SIZE / 1024 / 1024), 10, 0) || CHAR(32) || 'MB (' || EXECUTION_HOST || ':' || EXECUTION_PORT || ')', ';' ORDER BY MEMORY_SIZE DESC) LOCATION_STATISTICS
        FROM
        ( SELECT
            STATEMENT_EXECUTION_ID,
            EXECUTION_HOST,
            EXECUTION_PORT,
            MAX(MEMORY_SIZE) MEMORY_SIZE
          FROM
            M_EXPENSIVE_STATEMENT_EXECUTION_LOCATION_STATISTICS
          GROUP BY
            STATEMENT_EXECUTION_ID,
            EXECUTION_HOST,
            EXECUTION_PORT
        )
        WHERE
          STATEMENT_EXECUTION_ID != 0
        GROUP BY
          STATEMENT_EXECUTION_ID
      ) ESL ON
        ESL.STATEMENT_EXECUTION_ID = ES.STATEMENT_EXECUTION_ID
    GROUP BY
      CASE
        WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'TIME') != 0 THEN 
          CASE 
            WHEN BI.TIME_AGGREGATE_BY LIKE 'TS%' THEN
              TO_VARCHAR(ADD_SECONDS(TO_TIMESTAMP('2014/01/01 00:00:00', 'YYYY/MM/DD HH24:MI:SS'), FLOOR(SECONDS_BETWEEN(TO_TIMESTAMP('2014/01/01 00:00:00', 
              'YYYY/MM/DD HH24:MI:SS'), CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(ES.START_TIME, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE ES.START_TIME END) / SUBSTR(BI.TIME_AGGREGATE_BY, 3)) * SUBSTR(BI.TIME_AGGREGATE_BY, 3)), 'YYYY/MM/DD HH24:MI:SS')
            ELSE TO_VARCHAR(CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(ES.START_TIME, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE ES.START_TIME END, BI.TIME_AGGREGATE_BY)
          END
        ELSE 'any' 
      END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'HOST')      != 0 THEN ES.HOST                          ELSE MAP(BI.HOST, '%', 'any', BI.HOST)                           END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'PORT')      != 0 THEN TO_VARCHAR(ES.PORT)              ELSE MAP(BI.PORT, '%', 'any', BI.PORT)                           END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'HASH')      != 0 THEN ES.STATEMENT_HASH                ELSE MAP(BI.STATEMENT_HASH, '%', 'any', BI.STATEMENT_HASH)       END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'WL_CLASS')  != 0 THEN ES.WORKLOAD_CLASS_NAME           ELSE MAP(BI.WORKLOAD_CLASS, '%', 'any', BI.WORKLOAD_CLASS)       END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'CONN_ID')   != 0 THEN TO_VARCHAR(ES.CONNECTION_ID)     ELSE MAP(BI.CONN_ID, -1, 'any', TO_VARCHAR(BI.CONN_ID))          END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'OPERATION') != 0 THEN ES.OPERATION                     ELSE MAP(BI.OPERATIONS, '%', 'any', BI.OPERATIONS)               END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'APP_USER')  != 0 THEN ES.APP_USER                      ELSE MAP(BI.APP_USER, '%', 'any', BI.APP_USER)                   END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'DB_USER')   != 0 THEN ES.DB_USER                       ELSE MAP(BI.DB_USER, '%', 'any', BI.DB_USER)                     END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'SOURCE')    != 0 THEN ES.APPLICATION_SOURCE            ELSE MAP(BI.APP_SOURCE, '%', 'any', BI.APP_SOURCE)               END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'ERROR')     != 0 THEN ES.ERROR_CODE || MAP(ES.ERROR_TEXT, '', '', ' (' || ES.ERROR_TEXT || ')') ELSE 'any'              END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'BINDS')     != 0 THEN ES.PARAMETERS                    ELSE MAP(BI.BIND_VALUES, '%', 'any', BI.BIND_VALUES)             END,
      CASE WHEN BI.AGGREGATE_BY = 'NONE' OR INSTR(BI.AGGREGATE_BY, 'SESS_VAR')  != 0 THEN TO_VARCHAR(ES.SESSION_VARIABLES) ELSE MAP(BI.SESSION_VARIABLES, '%', 'any', BI.SESSION_VARIABLES) END,
      BI.RESULT_ROWS,
      BI.SQL_TEXT_OUTPUT_LENGTH,
      BI.ORDER_BY,
      BI.MIN_SQL_TEXT_LENGTH
  )
  WHERE
    (MIN_SQL_TEXT_LENGTH = -1 OR SQL_TEXT_LENGTH >= MIN_SQL_TEXT_LENGTH )
)
WHERE
  ( RESULT_ROWS = -1 OR ROW_NUM <= RESULT_ROWS )
ORDER BY
  ROW_NUM
    `;

    const queryParams = [
      beginTime,
      endTime,
      timezone,
      host,
      port,
      connectionId,
      statementHash,
      workloadClass,
      appUser,
      dbUser,
      sqlPattern,
      appSource,
      bindValues,
      sessionVariables,
      errorCode,
      errorText,
      onlyErrors ? 'X' : ' ',
      sqlTextOutputLength,
      minMemoryGB,
      maxMemoryGB,
      minDurationS,
      minSqlTextLength,
      operations,
      aggregateBy,
      timeAggregateBy,
      orderBy,
      resultRows
    ];

    // Add logging for debugging
    console.log('Executing expensive statements query:', {
      query: query.substring(0, 100) + '...',
      params: queryParams.length,
      filters: {
        beginTime,
        endTime,
        timezone,
        host,
        port,
        connectionId,
        statementHash,
        workloadClass,
        appUser,
        dbUser,
        sqlPattern,
        appSource,
        bindValues,
        sessionVariables,
        errorCode,
        errorText,
        onlyErrors,
        sqlTextOutputLength,
        minMemoryGB,
        maxMemoryGB,
        minDurationS,
        minSqlTextLength,
        operations,
        aggregateBy,
        timeAggregateBy,
        orderBy,
        resultRows
      }
    });

    const result = await executeQuery(query, queryParams);
    
    // Add result count logging
    const statementCount = Array.isArray(result) ? result.length : 0;
    console.log(`Found ${statementCount} expensive statements`);
    
    return formatQueryResult(result, '💸 HANA 오래걸리거나 메모리 사용율이 높은 구문 분석');
  } catch (error) {
    console.error('Expensive statements query failed:', error);
    return createErrorResponse(`오래걸리거나 메모리 사용율이 높은 구문 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
