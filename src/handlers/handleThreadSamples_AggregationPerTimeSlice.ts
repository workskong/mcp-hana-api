import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse, getOrDefault } from '../lib/utils';

export interface handleThreadSamples_AggregationPerTimeSlice {
  beginTime?: string;
  endTime?: string;
  statementHash?: string;
  statementId?: string;
  appUser?: string;
  appSource?: string;
  passportAction?: string;
  aggregateBy?: string;
}

export async function handleThreadSamples_AggregationPerTimeSlice(
  params: handleThreadSamples_AggregationPerTimeSlice = {}
): Promise<ToolResponse> {
  try {
    const beginTime = getOrDefault(params.beginTime, `'C-H1'`); 
    const endTime = getOrDefault(params.endTime, `'C'`);
    const statementHash = getOrDefault(params.statementHash, `'%'`);
    const statementId = getOrDefault(params.statementId, `'%'`);
    const appUser = getOrDefault(params.appUser, `'%'`);
    const appSource = getOrDefault(params.appSource, `'%'`);
    const passportAction = getOrDefault(params.passportAction, `'%'`);
    // aggregateBy 허용값 체크
    const allowedAggregates = [
      'SAMPLE_TIME', 'SITE_ID', 'HOST', 'PORT', 'THREAD_ID', 'THREAD_TYPE', 'THREAD_METHOD', 'THREAD_DETAIL',
      'THREAD_STATE', 'STATE_LOCK', 'HASH', 'ROOT', 'DB_USER', 'APP_NAME', 'APP_USER', 'APP_SOURCE',
      'APP_COMP_NAME', 'APP_COMP_TYPE', 'CLIENT_IP', 'CLIENT_PID', 'CONN_ID', 'LOCK_TYPE', 'LOCK_NAME',
      'STATEMENT_ID', 'STAT_EXEC_ID', 'NUMA_NODE', 'STMT_THR_LMT', 'QUEUEING', 'PASSPORT_COMPONENT',
      'PASSPORT_ACTION', 'WORKLOAD_CLASS'
    ];
    let aggregateBy = params.aggregateBy;
    if (!allowedAggregates.includes(aggregateBy ?? '')) {
      aggregateBy = 'HASH';
    }
    aggregateBy = `'${aggregateBy}'`;
    
    const query = `
    SELECT
      SNAPSHOT_TIME,
      KEY_FIGURE,
      SAMPLES_TOTAL,
      ACT_THREADS,
      DETAIL_1,
      SAMPLES_1,
      PCT_1,
      DETAIL_2,
      SAMPLES_2,
      PCT_2,
      DETAIL_3,
      SAMPLES_3,
      PCT_3,
      DETAIL_4,
      SAMPLES_4,
      PCT_4,
      DETAIL_5,
      SAMPLES_5,
      PCT_5,
      DETAIL_6,
      SAMPLES_6,
      PCT_6,
      DETAIL_7,
      SAMPLES_7,
      PCT_7,
      DETAIL_8,
      SAMPLES_8,
      PCT_8,
      DETAIL_9,
      SAMPLES_9,
      PCT_9,
      DETAIL10,
      SAMPLES10,
      PCT10
    FROM
    ( SELECT
        DISTINCT
        BEGIN_TIME SNAPSHOT_TIME,
        KEY_FIGURE,
        SAMPLES_TOTAL,
        ACT_THREADS,
        IFNULL(TO_VARCHAR(MAX(DETAIL_1)), '') DETAIL_1,
        IFNULL(LPAD(MAX(SAMPLES_1), 9), '') SAMPLES_1,
        IFNULL(LPAD(MAX(PCT_1), 5), '') PCT_1,
        IFNULL(TO_VARCHAR(MAX(DETAIL_2)), '') DETAIL_2,
        IFNULL(LPAD(MAX(SAMPLES_2), 9), '') SAMPLES_2,
        IFNULL(LPAD(MAX(PCT_2), 5), '') PCT_2,
        IFNULL(TO_VARCHAR(MAX(DETAIL_3)), '') DETAIL_3,
        IFNULL(LPAD(MAX(SAMPLES_3), 9), '') SAMPLES_3,
        IFNULL(LPAD(MAX(PCT_3), 5), '') PCT_3,
        IFNULL(TO_VARCHAR(MAX(DETAIL_4)), '') DETAIL_4,
        IFNULL(LPAD(MAX(SAMPLES_4), 9), '') SAMPLES_4,
        IFNULL(LPAD(MAX(PCT_4), 5), '') PCT_4,
        IFNULL(TO_VARCHAR(MAX(DETAIL_5)), '') DETAIL_5,
        IFNULL(LPAD(MAX(SAMPLES_5), 9), '') SAMPLES_5,
        IFNULL(LPAD(MAX(PCT_5), 5), '') PCT_5,
        IFNULL(TO_VARCHAR(MAX(DETAIL_6)), '') DETAIL_6,
        IFNULL(LPAD(MAX(SAMPLES_6), 9), '') SAMPLES_6,
        IFNULL(LPAD(MAX(PCT_6), 5), '') PCT_6,
        IFNULL(TO_VARCHAR(MAX(DETAIL_7)), '') DETAIL_7,
        IFNULL(LPAD(MAX(SAMPLES_7), 9), '') SAMPLES_7,
        IFNULL(LPAD(MAX(PCT_7), 5), '') PCT_7,
        IFNULL(TO_VARCHAR(MAX(DETAIL_8)), '') DETAIL_8,
        IFNULL(LPAD(MAX(SAMPLES_8), 9), '') SAMPLES_8,
        IFNULL(LPAD(MAX(PCT_8), 5), '') PCT_8,
        IFNULL(TO_VARCHAR(MAX(DETAIL_9)), '') DETAIL_9,
        IFNULL(LPAD(MAX(SAMPLES_9), 9), '') SAMPLES_9,
        IFNULL(LPAD(MAX(PCT_9), 5), '') PCT_9,
        IFNULL(TO_VARCHAR(MAX(DETAIL_10)), '') DETAIL10,
        IFNULL(LPAD(MAX(SAMPLES_10), 9), '') SAMPLES10,
        IFNULL(LPAD(MAX(PCT_10), 5), '') PCT10,
        ROW_NUMBER () OVER (ORDER BY BEGIN_TIME DESC) ROWNO,
        RESULT_ROWS,
        MIN_SAMPLES_TOTAL
      FROM
      ( SELECT DISTINCT
          TO_VARCHAR(BEGIN_TIME, 'YYYY/MM/DD HH24:MI:SS') BEGIN_TIME,
          AGGREGATE_BY KEY_FIGURE,
          LPAD(SUM(NUM_SAMPLES) OVER (PARTITION BY BEGIN_TIME), 13) SAMPLES_TOTAL,
          LPAD(TO_DECIMAL(SUM(ACT_THREADS) OVER (PARTITION BY BEGIN_TIME), 10, 2), 11) ACT_THREADS,
          NTH_VALUE(VALUE, 1) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_1,
          NTH_VALUE(NUM_SAMPLES, 1) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_1,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 1) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_1,
          NTH_VALUE(VALUE, 2) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_2,
          NTH_VALUE(NUM_SAMPLES, 2) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_2,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 2) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_2,
          NTH_VALUE(VALUE, 3) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_3,
          NTH_VALUE(NUM_SAMPLES, 3) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_3,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 3) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_3,
          NTH_VALUE(VALUE, 4) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_4,
          NTH_VALUE(NUM_SAMPLES, 4) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_4,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 4) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_4,
          NTH_VALUE(VALUE, 5) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_5,
          NTH_VALUE(NUM_SAMPLES, 5) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_5,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 5) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_5,
          NTH_VALUE(VALUE, 6) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_6,
          NTH_VALUE(NUM_SAMPLES, 6) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_6,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 6) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_6,
          NTH_VALUE(VALUE, 7) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_7,
          NTH_VALUE(NUM_SAMPLES, 7) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_7,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 7) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_7,
          NTH_VALUE(VALUE, 8) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_8,
          NTH_VALUE(NUM_SAMPLES, 8) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_8,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 8) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_8,
          NTH_VALUE(VALUE, 9) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_9,
          NTH_VALUE(NUM_SAMPLES, 9) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_9,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 9) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_9,
          NTH_VALUE(VALUE, 10) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) DETAIL_10,
          NTH_VALUE(NUM_SAMPLES, 10) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC) SAMPLES_10,
          TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 10) OVER (PARTITION BY BEGIN_TIME ORDER BY NUM_SAMPLES DESC)), 10, 0) PCT_10,
          RESULT_ROWS,
          MIN_SAMPLES_TOTAL
        FROM
        ( SELECT
            BEGIN_TIME,
            AGGREGATE_BY,
            RESULT_ROWS,
            VALUE,
            COUNT(*) NUM_SAMPLES,
            COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY BEGIN_TIME) * 100 PERCENT,
            COUNT(*) * LEAST(SAMPLE_INTERVAL, TIME_SLICE_S)  / TIME_SLICE_S ACT_THREADS,
            MIN_SAMPLES_TOTAL
          FROM
          ( SELECT
              ADD_SECONDS(TO_TIMESTAMP('2014/01/01 00:00:00', 'YYYY/MM/DD HH24:MI:SS'), 
                FLOOR(SECONDS_BETWEEN(TO_TIMESTAMP('2014/01/01 00:00:00', 'YYYY/MM/DD HH24:MI:SS'), CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(T.SAMPLE_TIME, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE T.SAMPLE_TIME END) / BI.TIME_SLICE_S) * BI.TIME_SLICE_S) BEGIN_TIME,
              MAP(BI.AGGREGATE_BY,
                'HOST',               T.HOST,
                'PORT',               TO_VARCHAR(T.PORT),
                'THREAD_ID',          TO_VARCHAR(T.THREAD_ID),
                'THREAD_TYPE',        T.THREAD_TYPE,
                'THREAD_METHOD',      T.THREAD_METHOD,
                'THREAD_DETAIL',      T.THREAD_DETAIL,
                'THREAD_STATE',       T.THREAD_STATE,
                'STATE_LOCK',         T.THREAD_STATE || 
                   CASE
                     WHEN T.LOCK_NAME IS NULL OR T.LOCK_NAME = '' OR T.LOCK_NAME = CHAR(63) THEN ''
                     WHEN T.THREAD_STATE = 'Job Exec Waiting' AND T.LOCK_NAME LIKE '%calculateX2%' THEN ' (calculateX2)'
                     ELSE ' (' || T.LOCK_NAME || ')'
                   END,
                'HASH',               T.STATEMENT_HASH,
                'SITE_ID',            TO_VARCHAR(T.SITE_ID),
                'ROOT',               T.ROOT_STATEMENT_HASH,
                'STMT_THR_LMT',       TO_VARCHAR(T.STATEMENT_THREAD_LIMIT),
                'STATEMENT_ID',       T.STATEMENT_ID,
                'STAT_EXEC_ID',       T.STATEMENT_EXECUTION_ID,
                'DB_USER',            T.DB_USER,
                'APP_NAME',           T.APP_NAME,
                'APP_USER',           T.APP_USER,
                'APP_SOURCE',         T.APP_SOURCE,
                'APP_COMP_NAME',      T.APP_COMP_NAME,
                'APP_COMP_TYPE',      T.APP_COMP_TYPE,
                'CLIENT_IP',          T.CLIENT_IP,
                'CLIENT_PID',         TO_VARCHAR(T.CLIENT_PID),
                'CONN_ID',            TO_VARCHAR(T.CONN_ID),
                'LOCK_TYPE',          T.LOCK_COMPONENT,
                'LOCK_NAME',          T.LOCK_NAME,
                'NUMA_NODE',          T.NUMA_NODE,
                'QUEUEING',           T.JOB_QUEUEING,
                'PASSPORT_COMPONENT', T.PASSPORT_COMPONENT,
                'PASSPORT_ACTION',    T.PASSPORT_ACTION,
                'WORKLOAD_CLASS',     T.WORKLOAD_CLASS_NAME
              ) VALUE,
              BI.AGGREGATE_BY,
              BI.RESULT_ROWS,
              BI.MIN_SAMPLES_TOTAL,
              BI.TIME_SLICE_S,
              BI.EXCLUDE_SERVICE_THREAD_SAMPLER,
              MAP(BI.DATA_SOURCE, 'CURRENT', IFNULL(I.SAMPLE_INTERVAL, 1), IFNULL(I.SAMPLE_INTERVAL, 1) * 50) SAMPLE_INTERVAL
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
                SITE_ID,
                HOST,
                PORT,
                THREAD_ID,
                THREAD_TYPE,
                THREAD_STATE,
                THREAD_METHOD,
                THREAD_DETAIL,
                STATEMENT_HASH,
                ROOT_STATEMENT_HASH,
                STATEMENT_THREAD_LIMIT,
                STATEMENT_ID,
                STATEMENT_EXECUTION_ID,
                DB_USER,
                APP_NAME,
                APP_USER,
                APP_SOURCE,
                APP_COMP_NAME,
                APP_COMP_TYPE,
                LOCK_TYPE,
                LOCK_NAME,
                NUMA_NODE,
                CLIENT_IP,
                CLIENT_PID,
                CONN_ID,
                PASSPORT_COMPONENT,
                PASSPORT_ACTION,
                WORKLOAD_CLASS,
                JOB_QUEUEING,
                MIN_SAMPLES_TOTAL,
                TIME_SLICE_S,
                ONLY_DELTA_STORAGE_WAITS,
                EXCLUDE_SERVICE_THREAD_SAMPLER,
                EXCLUDE_NEGATIVE_THREAD_IDS,
                EXCLUDE_PHANTOM_THREADS,
                EXCLUDE_EMPTY_STATEMENT_IDS,
                EXCLUDE_EMPTY_STATEMENT_EXECUTION_IDS,
                DATA_SOURCE,
                AGGREGATE_BY,
                RESULT_ROWS
              FROM
              ( SELECT                                                      /* Modification section */
                  ${beginTime} BEGIN_TIME,                  /* YYYY/MM/DD HH24:MI:SS timestamp, C, C-S<seconds>, C-M<minutes>, C-H<hours>, C-D<days>, C-W<weeks>, E-S<seconds>, E-M<minutes>, E-H<hours>, E-D<days>, E-W<weeks>, MIN */
                  ${endTime} END_TIME,                    /* YYYY/MM/DD HH24:MI:SS timestamp, C, C-S<seconds>, C-M<minutes>, C-H<hours>, C-D<days>, C-W<weeks>, B+S<seconds>, B+M<minutes>, B+H<hours>, B+D<days>, B+W<weeks>, MAX */
                  'SERVER' TIMEZONE,                              /* SERVER, UTC */
                  CURRENT_SITE_ID() SITE_ID,
                  '%' HOST,
                  '%' PORT,
                  -1  THREAD_ID,
                  '%' THREAD_TYPE,                /* e.g. 'SqlExecutor', 'JobWorker' or 'MergedogMonitor' */
                  '%' THREAD_STATE,               /* e.g. 'Running', 'Network Read' or 'Semaphore Wait' */
                  '%' THREAD_METHOD,
                  '%' THREAD_DETAIL,
                  ${statementHash} STATEMENT_HASH,
                  '%' ROOT_STATEMENT_HASH,
                  -1 STATEMENT_THREAD_LIMIT,
                  ${statementId} STATEMENT_ID,
                  '%' STATEMENT_EXECUTION_ID,
                  '%' DB_USER,
                  '%' APP_NAME,
                  ${appUser} APP_USER,
                  ${appSource} APP_SOURCE,
                  '%' APP_COMP_NAME,
                  '%' APP_COMP_TYPE,
                  '%' LOCK_TYPE,
                  '%' LOCK_NAME,
                  -1  NUMA_NODE,
                  '%' CLIENT_IP,
                  -1  CLIENT_PID,
                  -1  CONN_ID,
                  '%' PASSPORT_COMPONENT,
                  ${passportAction} PASSPORT_ACTION,
                  '%' WORKLOAD_CLASS,
                  '%' JOB_QUEUEING,
                  -1  MIN_SAMPLES_TOTAL,
                  1 TIME_SLICE_S,
                  ' ' ONLY_DELTA_STORAGE_WAITS,
                  'X' EXCLUDE_SERVICE_THREAD_SAMPLER,
                  'X' EXCLUDE_NEGATIVE_THREAD_IDS,
                  'X' EXCLUDE_PHANTOM_THREADS,
                  ' ' EXCLUDE_EMPTY_STATEMENT_IDS,
                  ' ' EXCLUDE_EMPTY_STATEMENT_EXECUTION_IDS,
                  'HISTORY' DATA_SOURCE,
                  ${aggregateBy} AGGREGATE_BY,     /* SAMPLE_TIME, SITE_ID, HOST, PORT, THREAD_ID, THREAD_TYPE, THREAD_METHOD, THREAD_DETAIL, THREAD_STATE, STATE_LOCK, HASH, ROOT, DB_USER, APP_NAME, 
                                                         APP_USER, APP_SOURCE, APP_COMP_NAME, APP_COMP_TYPE, CLIENT_IP, CLIENT_PID, CONN_ID, LOCK_TYPE, LOCK_NAME, STATEMENT_ID, STAT_EXEC_ID, NUMA_NODE, 
                                                         STMT_THR_LMT, QUEUEING, PASSPORT_COMPONENT, PASSPORT_ACTION, WORKLOAD_CLASS */
                  -1 RESULT_ROWS
                FROM
                  DUMMY
              )
            ) BI,
            ( SELECT
                DATA_SOURCE,
                SITE_ID,
                HOST,
                PORT,
                SAMPLE_TIME,
                THREAD_ID,
                MAP(THREAD_TYPE, CHAR(63), THREAD_METHOD, THREAD_TYPE) THREAD_TYPE,
                MAP(THREAD_METHOD, CHAR(63), THREAD_TYPE, THREAD_METHOD) THREAD_METHOD,
                MAP(THREAD_DETAIL, CHAR(63), MAP(THREAD_METHOD, CHAR(63), THREAD_TYPE,   THREAD_METHOD), THREAD_DETAIL) THREAD_DETAIL,
                THREAD_STATE,
                DURATION_MS,
                CASE
                  WHEN STATEMENT_HASH = CHAR(63) AND UPPER(THREAD_DETAIL) LIKE 'MDX%' THEN 'no SQL (MDX)'
                  WHEN STATEMENT_HASH = CHAR(63) AND LENGTH(THREAD_DETAIL) <= 254 AND
                  ( UPPER(THREAD_DETAIL) LIKE 'SELECT%' OR
                    UPPER(THREAD_DETAIL) LIKE 'INSERT%' OR
                    UPPER(THREAD_DETAIL) LIKE 'DELETE%' OR
                    UPPER(THREAD_DETAIL) LIKE 'UPDATE%' OR
                    UPPER(THREAD_DETAIL) LIKE 'UPSERT%'
                  )
                  THEN LOWER(TO_VARCHAR(HASH_MD5(TO_BINARY(THREAD_DETAIL))))
                  WHEN STATEMENT_HASH = CHAR(63) THEN 'no SQL (' || MAP(THREAD_METHOD, CHAR(63), THREAD_TYPE, THREAD_METHOD) || ')'
                  ELSE STATEMENT_HASH
                END STATEMENT_HASH,
                CASE
                  WHEN ROOT_STATEMENT_HASH = CHAR(63) THEN 'no SQL (' || MAP(THREAD_METHOD, CHAR(63), THREAD_TYPE, THREAD_METHOD) || ')'
                  ELSE ROOT_STATEMENT_HASH
                END ROOT_STATEMENT_HASH,
                STATEMENT_THREAD_LIMIT,
                STATEMENT_ID,
                STATEMENT_EXECUTION_ID,
                CONN_ID,
                DB_USER,
                MAP(APP_NAME, CHAR(63), MAP(THREAD_TYPE, CHAR(63), THREAD_METHOD, THREAD_TYPE), APP_NAME) APP_NAME,
                APP_USER,
                MAP(APP_SOURCE, CHAR(63), MAP(THREAD_TYPE, CHAR(63), THREAD_METHOD, THREAD_STATE), APP_SOURCE) APP_SOURCE,
                APP_COMP_NAME,
                APP_COMP_TYPE,
                CLIENT_IP,
                CLIENT_PID,
                LOCK_COMPONENT,
                LOCK_NAME,
                BLOCKING_THREAD,
                NUMA_NODE,
                JOB_QUEUEING,
                PASSPORT_COMPONENT,
                PASSPORT_ACTION,
                WORKLOAD_CLASS_NAME
              FROM
              ( SELECT
                  'CURRENT' DATA_SOURCE,
                  CURRENT_SITE_ID() SITE_ID,
                  HOST,
                  PORT,
                  TIMESTAMP SAMPLE_TIME,
                  THREAD_ID,
                  CASE
                    WHEN THREAD_TYPE LIKE 'JobWrk%' THEN 'JobWorker'
                    ELSE THREAD_TYPE
                  END THREAD_TYPE,
                  CASE 
                    WHEN THREAD_METHOD LIKE 'GCJob%' THEN 'GCJob' 
                    ELSE THREAD_METHOD 
                  END THREAD_METHOD,
                  THREAD_DETAIL,
                  THREAD_STATE,
                  DURATION / 1000 DURATION_MS,
                  STATEMENT_HASH,
                  ROOT_STATEMENT_HASH,
                  STATEMENT_THREAD_LIMIT,
                  STATEMENT_ID,
                  STATEMENT_EXECUTION_ID,
                  CONNECTION_ID CONN_ID,
                  USER_NAME DB_USER,
                  APPLICATION_NAME APP_NAME,
                  APPLICATION_USER_NAME APP_USER,
                  APPLICATION_SOURCE APP_SOURCE,
                  APPLICATION_COMPONENT_NAME APP_COMP_NAME,
                  CASE APPLICATION_COMPONENT_TYPE
                    WHEN 'B' THEN 'ABAP: Batch Job'
                    WHEN 'C' THEN 'ABAP: RFC'
                    WHEN 'I' THEN 'ABAP: Unknown'
                    WHEN 'O' THEN 'ABAP: OData V2'
                    WHEN 'S' THEN 'ABAP: Submit Report'
                    WHEN 'T' THEN 'ABAP: Transaction'
                    WHEN 'U' THEN 'ABAP: URL'
                    WHEN 'V' THEN 'ABAP: Update Task'
                    WHEN '4' THEN 'ABAP: OData V4'
                    ELSE APPLICATION_COMPONENT_TYPE
                  END APP_COMP_TYPE,
                  CLIENT_IP,
                  CLIENT_PID,
                  LOCK_WAIT_COMPONENT LOCK_COMPONENT,
                  CASE
                    WHEN LOCK_WAIT_NAME LIKE '%[%:%]@%:%' THEN 
                      SUBSTR(LOCK_WAIT_NAME, LOCATE(LOCK_WAIT_NAME, '[') + 1, LOCATE(LOCK_WAIT_NAME, ':') - LOCATE(LOCK_WAIT_NAME, '[')) ||
                      SUBSTR(LOCK_WAIT_NAME, LOCATE(LOCK_WAIT_NAME, ':' || CHAR(32)) + 1)
                    ELSE
                      LOCK_WAIT_NAME
                  END LOCK_NAME,
                  LOCK_OWNER_THREAD_ID BLOCKING_THREAD,
                  IFNULL(NUMA_NODE_INDEX, -2) NUMA_NODE,
                  CASE WHEN THREAD_STATE = 'Job Exec Waiting' AND LOCK_WAIT_NAME != 'envCondStat' AND CALLING = '' THEN 'X' ELSE '' END JOB_QUEUEING,
                  IFNULL(PASSPORT_ACTION, '') PASSPORT_ACTION,
                  IFNULL(PASSPORT_COMPONENT_NAME, '') PASSPORT_COMPONENT,
                  IFNULL(WORKLOAD_CLASS_NAME, '') WORKLOAD_CLASS_NAME
                FROM
                  M_SERVICE_THREAD_SAMPLES
                UNION ALL
                SELECT
                  'HISTORY' DATA_SOURCE,
                  SITE_ID,
                  HOST,
                  PORT,
                  TIMESTAMP SAMPLE_TIME,
                  THREAD_ID,
                  CASE
                    WHEN THREAD_TYPE LIKE 'JobWrk%' THEN 'JobWorker'
                    ELSE THREAD_TYPE
                  END THREAD_TYPE,
                  CASE 
                    WHEN THREAD_METHOD LIKE 'GCJob%' THEN 'GCJob' 
                    ELSE THREAD_METHOD 
                  END THREAD_METHOD,
                  THREAD_DETAIL,
                  THREAD_STATE,
                  DURATION / 1000 DURATION_MS,
                  STATEMENT_HASH,
                  ROOT_STATEMENT_HASH,
                  STATEMENT_THREAD_LIMIT,
                  STATEMENT_ID,
                  STATEMENT_EXECUTION_ID,
                  CONNECTION_ID CONN_ID,
                  USER_NAME DB_USER,
                  APPLICATION_NAME APP_NAME,
                  APPLICATION_USER_NAME APP_USER,
                  APPLICATION_SOURCE APP_SOURCE,
                  APPLICATION_COMPONENT_NAME APP_COMP_NAME,
                  CASE APPLICATION_COMPONENT_TYPE
                    WHEN 'B' THEN 'ABAP: Batch Job'
                    WHEN 'C' THEN 'ABAP: RFC'
                    WHEN 'I' THEN 'ABAP: Unknown'
                    WHEN 'O' THEN 'ABAP: OData V2'
                    WHEN 'S' THEN 'ABAP: Submit Report'
                    WHEN 'T' THEN 'ABAP: Transaction'
                    WHEN 'U' THEN 'ABAP: URL'
                    WHEN 'V' THEN 'ABAP: Update Task'
                    WHEN '4' THEN 'ABAP: OData V4'
                    ELSE APPLICATION_COMPONENT_TYPE
                  END APP_COMP_TYPE,
                  CLIENT_IP,
                  CLIENT_PID,
                  LOCK_WAIT_COMPONENT LOCK_COMPONENT,
                  CASE
                    WHEN LOCK_WAIT_NAME LIKE '%[%:%]@%:%' THEN 
                      SUBSTR(LOCK_WAIT_NAME, LOCATE(LOCK_WAIT_NAME, '[') + 1, LOCATE(LOCK_WAIT_NAME, ':') - LOCATE(LOCK_WAIT_NAME, '[')) ||
                      SUBSTR(LOCK_WAIT_NAME, LOCATE(LOCK_WAIT_NAME, ':' || CHAR(32)) + 1)
                    ELSE
                      LOCK_WAIT_NAME
                  END LOCK_NAME,
                  LOCK_OWNER_THREAD_ID BLOCKING_THREAD,
                  IFNULL(NUMA_NODE_INDEX, -2) NUMA_NODE,
                  CASE WHEN THREAD_STATE = 'Job Exec Waiting' AND LOCK_WAIT_NAME != 'envCondStat' AND CALLING = '' THEN 'X' ELSE '' END JOB_QUEUEING,
                  IFNULL(PASSPORT_ACTION, '') PASSPORT_ACTION,
                  IFNULL(PASSPORT_COMPONENT_NAME, '') PASSPORT_COMPONENT,
                  IFNULL(WORKLOAD_CLASS_NAME, '') WORKLOAD_CLASS_NAME
                FROM
                  _SYS_STATISTICS.HOST_SERVICE_THREAD_SAMPLES
              )
            ) T,
            ( SELECT DISTINCT
                MAX(VALUE) SAMPLE_INTERVAL
              FROM
                M_CONFIGURATION_PARAMETER_VALUES
              WHERE
                FILE_NAME = 'global.ini' AND
                SECTION = 'resource_tracking' AND
                KEY = 'service_thread_sampling_monitor_sample_interval'
            ) I
            WHERE
              ( BI.SITE_ID = -1 OR ( BI.SITE_ID = 0 AND T.SITE_ID IN (-1, 0) ) OR T.SITE_ID = BI.SITE_ID ) AND
              T.HOST LIKE BI.HOST AND
              TO_VARCHAR(T.PORT) LIKE BI.PORT AND
              CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(T.SAMPLE_TIME, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE T.SAMPLE_TIME END BETWEEN BI.BEGIN_TIME AND BI.END_TIME AND
              ( BI.THREAD_ID = -1 OR T.THREAD_ID = BI.THREAD_ID ) AND 
              IFNULL(T.THREAD_TYPE, '') LIKE BI.THREAD_TYPE AND
              IFNULL(T.THREAD_METHOD, '') LIKE BI.THREAD_METHOD AND
              UPPER(IFNULL(T.THREAD_DETAIL, '')) LIKE UPPER(BI.THREAD_DETAIL) AND
              IFNULL(T.THREAD_STATE, '') LIKE BI.THREAD_STATE AND
              T.JOB_QUEUEING LIKE BI.JOB_QUEUEING AND
              T.DATA_SOURCE LIKE BI.DATA_SOURCE AND
              SUBSTR(T.STATEMENT_HASH, 1, 31) LIKE SUBSTR(BI.STATEMENT_HASH, 1, 31) AND         /* sometimes only 31 out of 32 bytes were stored in thread samples */
              T.ROOT_STATEMENT_HASH LIKE BI.ROOT_STATEMENT_HASH AND
              ( BI.STATEMENT_THREAD_LIMIT = -1 OR T.STATEMENT_THREAD_LIMIT = BI.STATEMENT_THREAD_LIMIT ) AND
              T.STATEMENT_ID LIKE BI.STATEMENT_ID AND
              T.STATEMENT_EXECUTION_ID LIKE BI.STATEMENT_EXECUTION_ID AND
              T.DB_USER LIKE BI.DB_USER AND
              IFNULL(T.APP_NAME, '') LIKE BI.APP_NAME AND
              IFNULL(T.APP_USER, '') LIKE BI.APP_USER AND
              IFNULL(T.APP_SOURCE, '') LIKE BI.APP_SOURCE AND
              IFNULL(T.APP_COMP_NAME, '') LIKE BI.APP_COMP_NAME AND
              IFNULL(T.APP_COMP_TYPE, '') LIKE BI.APP_COMP_TYPE AND
              ( BI.CONN_ID = -1 OR T.CONN_ID = BI.CONN_ID ) AND
              ( T.PASSPORT_ACTION LIKE BI.PASSPORT_ACTION ) AND
              ( T.PASSPORT_COMPONENT LIKE BI.PASSPORT_COMPONENT ) AND
              ( T.WORKLOAD_CLASS_NAME LIKE BI.WORKLOAD_CLASS ) AND
              ( BI.ONLY_DELTA_STORAGE_WAITS = ' ' OR
                ( T.STATEMENT_HASH NOT LIKE 'no SQL%' AND
                  ( T.THREAD_STATE = 'Sleeping' OR
                    T.LOCK_NAME IN ('BTree GuardContainer', 'Sleep Semaphore')
                  )
                )
              ) AND
              ( BI.EXCLUDE_SERVICE_THREAD_SAMPLER = ' ' OR T.THREAD_TYPE != 'service thread sampler' ) AND
              ( BI.EXCLUDE_NEGATIVE_THREAD_IDS = ' ' OR T.THREAD_ID >= 0 ) AND
              ( BI.EXCLUDE_PHANTOM_THREADS = ' ' OR NOT
                ( T.THREAD_TYPE = 'AgentPingThread'                     AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'DPPeriodicThreadWaitSemaphore'                                  OR
                  T.THREAD_TYPE = 'BackupMonitor_TransferThread'        AND T.THREAD_STATE = 'Sleeping'                                                                                                     OR
                  T.THREAD_TYPE = 'ChildIOThreads::ErrorStream'         AND T.THREAD_STATE = 'Running'                                                                                                      OR
                  T.THREAD_TYPE = 'ChildIOThreads::OutputStream'        AND T.THREAD_STATE = 'Running'                                                                                                      OR
                  T.THREAD_TYPE LIKE 'DPDistributor%'                   AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'DPCommitTranPersistentDistributorQueueReaderAvailableSemaphore' OR
                  T.THREAD_TYPE LIKE 'DPReceiverCleaner%'               AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'DPPersistentTranDataCleanerDataAvailableSemaphore'              OR
                  T.THREAD_TYPE LIKE 'DPReceiverWriter%'                AND T.THREAD_STATE LIKE 'ConditionalVar% Wait'   AND T.LOCK_NAME = 'DPReceiverInboundQueueEmptyCond'                                OR
                  T.THREAD_TYPE = 'Generic'                             AND T.THREAD_STATE = 'Running'                                                                                                      OR
                  T.THREAD_TYPE = 'IndexingQueue'                       AND T.THREAD_STATE = 'Sleeping'                                                                                                     OR
                  T.THREAD_TYPE = 'JobWorker'                           AND T.THREAD_STATE = 'Network Poll'              AND T.CONN_ID = -1 AND           T.THREAD_METHOD = 'generic'                       OR
                  T.THREAD_TYPE = 'JobWorker'                           AND T.THREAD_STATE = 'Network Poll'              AND T.THREAD_METHOD = 'Request prologue'                                           OR
                  T.THREAD_TYPE = 'JobWorker'                           AND T.THREAD_STATE = 'Running'                   AND T.THREAD_METHOD = 'TimerCallback_OdmContextCleanup'                            OR
                  T.THREAD_TYPE = 'JobWorker'                           AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'DPReceiverDispatcherHouseKeepingTaskAvailableSemaphore'         OR
                  T.THREAD_TYPE = 'JobWorker'                           AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'DPReceiverHouseKeepingTaskAvailableSemaphore'                   OR
                  T.THREAD_TYPE = 'JobWorker'                           AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'MasterQS_hasJobs'                                               OR
                  T.THREAD_TYPE = 'JobWorker' AND T.THREAD_STATE = 'Semaphore Wait' AND T.LOCK_NAME = 'hex_WorkerJob_Sleep_Sem' AND T.THREAD_DETAIL LIKE 'Waits for client to fetch or syncs with other workers' OR
                  T.THREAD_TYPE = 'JobWorker' AND T.THREAD_STATE = 'Semaphore Wait' AND T.LOCK_NAME = 'hex_WorkersManager_Sleep_Sem' AND T.THREAD_DETAIL LIKE 'waits for client to fetch'                   OR
                  T.THREAD_TYPE = 'JobWorker'                           AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'LogBackupQueue'                                                 OR
                  T.THREAD_TYPE = 'LogExceptionQueueThread'             AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'AdapterServiceFixedQueueListSemaphore'                          OR
                  T.THREAD_TYPE = 'LogRecovery'                         AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'LogRecoveryPointInTimeQueue'                                    OR
                  T.THREAD_TYPE = 'MaintenanceThread'                   AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'DPPeriodicThreadWaitSemaphore'                                  OR
                  T.THREAD_TYPE = 'Native'                              AND T.THREAD_DETAIL LIKE '%sysv_open_semaphore%'                                                                                    OR
                  T.THREAD_TYPE = 'PostCommitExecutor'                  AND T.THREAD_STATE LIKE 'ConditionalVar% Wait'   AND T.LOCK_NAME = 'RegularTaskQueueCV'                                             OR
                  T.THREAD_TYPE = 'PreprocessorPool'                    AND T.THREAD_STATE = 'Network Poll'                                                                                                 OR
                  T.THREAD_TYPE = 'PriPostCommitExecutor'               AND T.THREAD_STATE LIKE 'ConditionalVar% Wait'   AND T.LOCK_NAME = 'PrioritizedTaskQueueCV'                                         OR
                  T.THREAD_TYPE = 'StatsThread'                         AND T.THREAD_STATE LIKE 'ConditionalVar% Wait'   AND T.LOCK_NAME = 'DPStatsThreadCond'                                              OR
                  T.THREAD_TYPE = 'PushBufferIntoReplayThread'          AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'system replication: push buffer into replay semaphore'          OR
                  T.THREAD_TYPE = 'SecondarySlaveLogPositionSendThread' AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'system replication: slave log position send semaphore'          OR
                  T.THREAD_TYPE = 'SystemReplicationAsyncLogSender'     AND T.THREAD_STATE = 'Semaphore Wait'            AND T.LOCK_NAME = 'system replication: AsyncLogBufferHandlerQueueSem'              OR
                  T.THREAD_TYPE = 'WebDispatcher-Main-Thread'           AND T.THREAD_STATE = 'Running'
                )
              ) AND
              IFNULL(T.CLIENT_IP, '') LIKE BI.CLIENT_IP AND
              ( BI.CLIENT_PID = -1 OR T.CLIENT_PID = BI.CLIENT_PID ) AND
              T.LOCK_COMPONENT LIKE BI.LOCK_TYPE AND
              T.LOCK_NAME LIKE BI.LOCK_NAME AND
              ( BI.EXCLUDE_EMPTY_STATEMENT_IDS = ' ' OR T.STATEMENT_ID != CHAR(63) ) AND
              ( BI.EXCLUDE_EMPTY_STATEMENT_EXECUTION_IDS = ' ' OR T.STATEMENT_EXECUTION_ID != TO_BIGINT(-1) ) AND
              ( BI.NUMA_NODE = -1 OR T.NUMA_NODE = BI.NUMA_NODE )
            )
          GROUP BY
            BEGIN_TIME,
            VALUE,
            AGGREGATE_BY,
            RESULT_ROWS,
            SAMPLE_INTERVAL,
            MIN_SAMPLES_TOTAL,
            TIME_SLICE_S
        )
      )
      GROUP BY
        BEGIN_TIME,
        KEY_FIGURE,
        SAMPLES_TOTAL,
        ACT_THREADS,
        MIN_SAMPLES_TOTAL,
        RESULT_ROWS
    )
    WHERE
      ( MIN_SAMPLES_TOTAL = -1 OR SAMPLES_TOTAL >= MIN_SAMPLES_TOTAL ) AND
      ( RESULT_ROWS = -1 OR ROWNO <= RESULT_ROWS )
    ORDER BY
      SNAPSHOT_TIME DESC
    `;

    const result = await executeQuery(query);
    return formatQueryResult(result, 'HANA Thread Samples Aggregation');
  } catch (error) {
    return createErrorResponse(error);
  }
}
