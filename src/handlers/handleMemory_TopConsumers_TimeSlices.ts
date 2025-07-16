import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse, getOrDefault } from '../lib/utils';

export interface handleMemory_TopConsumers_TimeSlices {
  beginTime?: string;
  endTime?: string;
  objectLevel?: string;
  timeAggregateBy?: string;
}

export async function handleMemory_TopConsumers_TimeSlices(params: handleMemory_TopConsumers_TimeSlices = {}): Promise<ToolResponse> {
  try {
    // 파라미터 보정: 빈값(null, undefined, '')이면 기본값 할당
    const beginTime = params?.beginTime ? `'${params.beginTime}'` : `'C-H1'`;
    const endTime = params?.endTime ? `'${params.endTime}'` : `'C'`;
    const objectLevel = params?.objectLevel ? `'${params.objectLevel}'` : `'TABLE'`;

    // timeAggregateBy 허용값 체크
    let rawTimeAggregateBy = params?.timeAggregateBy;
    let allowedTimeAggregates = ['HOUR', 'DAY', 'HOUR_OF_DAY', 'NONE'];
    let isTS = typeof rawTimeAggregateBy === 'string' && /^TS\d+$/.test(rawTimeAggregateBy);
    if (rawTimeAggregateBy && !allowedTimeAggregates.includes(rawTimeAggregateBy) && !isTS) {
      return createErrorResponse(
        `timeAggregateBy 파라미터는 'HOUR', 'DAY', 'HOUR_OF_DAY', /^TS\\d+$/, 'NONE' 만 허용합니다. (입력값: ${rawTimeAggregateBy})`
      );
    }
    const timeAggregateBy = rawTimeAggregateBy ? `'${rawTimeAggregateBy}'` : `'TS60'`;

    let query = `
WITH
BASIS_INFO AS
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
    SCHEMA_NAME,
    DETAIL,
    SITE_ID,
    HOST,
    PORT,
    AREA,
    SUBAREA,
    ONLY_SQL_DATA_AREAS,
    EXCLUDE_SQL_DATA_AREAS,
    EXCLUDE_HEAP_FRAGMENTATION,
    MIN_TOTAL_SIZE_GB,
    AGGREGATE_BY,
    KEY_FIGURE,
    OBJECT_LEVEL,
    MAP(TIME_AGGREGATE_BY,
      'NONE',        'YYYY/MM/DD HH24:MI:SS',
      'HOUR',        'YYYY/MM/DD HH24',
      'DAY',         'YYYY/MM/DD (DY)',
      'HOUR_OF_DAY', 'HH24',
      TIME_AGGREGATE_BY ) TIME_AGGREGATE_BY,
    INCLUDE_OVERLAPPING_HEAP_AREAS
  FROM
  ( SELECT                                                      /* Modification section */
      ${beginTime} BEGIN_TIME,                  /* YYYY/MM/DD HH24:MI:SS timestamp, C, C-S<seconds>, C-M<minutes>, C-H<hours>, C-D<days>, C-W<weeks>, E-S<seconds>, E-M<minutes>, E-H<hours>, E-D<days>, E-W<weeks>, MIN */
      ${endTime} END_TIME,                    /* YYYY/MM/DD HH24:MI:SS timestamp, C, C-S<seconds>, C-M<minutes>, C-H<hours>, C-D<days>, C-W<weeks>, B+S<seconds>, B+M<minutes>, B+H<hours>, B+D<days>, B+W<weeks>, MAX */
      'SERVER' TIMEZONE,                              /* SERVER, UTC */
      -1 SITE_ID,
      '%' HOST,
      '%' PORT,
      '%' SCHEMA_NAME,
      '%' AREA,                     /* ROW, COLUMN, TABLES, HEAP, % */
      '%' SUBAREA,                  /* 'Row Store (Tables)', 'Row Store (Indexes)', 'Row Store (Int. Fragmentation)', 'Row Store (Ext. Fragmentation)', 'Column Store (Main)', 'Column Store (Delta)', 'Column Store (Others)' or 'Heap (<component>)' */
      '%' DETAIL,                   /* Name of table or heap area */
      ' ' ONLY_SQL_DATA_AREAS,
      ' ' EXCLUDE_SQL_DATA_AREAS,
      'X' EXCLUDE_HEAP_FRAGMENTATION,
      -1 MIN_TOTAL_SIZE_GB,
      'USED' KEY_FIGURE,            /* ALLOCATED, USED */ 
      ${objectLevel} OBJECT_LEVEL,         /* TABLE, PARTITION */
      ' ' INCLUDE_OVERLAPPING_HEAP_AREAS,
      'DETAIL' AGGREGATE_BY,        /* SCHEMA, DETAIL, SITE_ID, HOST, PORT, MAINAREA, SUBAREA */
      ${timeAggregateBy} TIME_AGGREGATE_BY     /* HOUR, DAY, HOUR_OF_DAY or database time pattern, TS<seconds> for time slice, NONE for no aggregation */
    FROM
      DUMMY
  ) 
),
SQL_DATA_AREAS AS
( SELECT 'Pool/AttributeEngine/Transient' ALLOCATOR              FROM DUMMY UNION ALL
  SELECT 'Pool/AttributeEngine/Transient/updateContainerConcat'  FROM DUMMY UNION ALL
  SELECT 'Pool/CalculationEngine/ceQOExecutor'                   FROM DUMMY UNION ALL
  SELECT 'Pool/CalculationEngine/query/pops'                     FROM DUMMY UNION ALL
  SELECT 'Pool/ColumnStoreTables/Delta'                          FROM DUMMY UNION ALL
  SELECT 'Pool/ColumnStoreTables/Main/Rowid/build-reverse-index' FROM DUMMY UNION ALL
  SELECT 'Pool/CSPlanExecutor/PlanExecution'                     FROM DUMMY UNION ALL
  SELECT 'Pool/DocidValueArray'                                  FROM DUMMY UNION ALL
  SELECT 'Pool/ESX'                                              FROM DUMMY UNION ALL
  SELECT 'Pool/ExecutorPlanExecution'                            FROM DUMMY UNION ALL
  SELECT 'Pool/Federation/UniversalITab'                         FROM DUMMY UNION ALL
  SELECT 'Pool/Filter'                                           FROM DUMMY UNION ALL
  SELECT 'Pool/itab'                                             FROM DUMMY UNION ALL
  SELECT 'Pool/itab/expr'                                        FROM DUMMY UNION ALL
  SELECT 'Pool/itab/FindBlocks2'                                 FROM DUMMY UNION ALL
  SELECT 'Pool/itab/VectorColumn'                                FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator'                                    FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/DictsAndDocs'                       FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEAggregate'                        FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEAggregate/Results'                FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEAssembleResults'                  FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEAssembleResults/Results'          FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JECalculate'                        FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JECalculate/TmpResults'             FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JECalculate/Results'                FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JECreateNTuple'                     FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEEvalPrecond'                      FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEPlanData/deserialized'            FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEPreAggregate'                     FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JERequestedAttributes/Results'      FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEStep1'                            FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/JEStep2'                            FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/NTuple'                             FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/PlanDataAttrVals/Deserialized'      FROM DUMMY UNION ALL
  SELECT 'Pool/JoinEvaluator/ValueList'                          FROM DUMMY UNION ALL
  SELECT 'Pool/LargeObjectPool'                                  FROM DUMMY UNION ALL
  SELECT 'Pool/L/llang/Runtime/Global'                           FROM DUMMY UNION ALL
  SELECT 'Pool/L/llang/Runtime/Local'                            FROM DUMMY UNION ALL
  SELECT 'Pool/LOBStorage'                                       FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbcalcengine.so'                       FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbcalcengineapi.so'                    FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbcalcenginepops.so'                   FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbcs.so'                               FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbcswrapper.so'                        FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbdistmetadata.so'                     FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbevaluator.so'                        FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbitab.so'                             FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbolap.so'                             FROM DUMMY UNION ALL
  SELECT 'Pool/malloc/libhdbunivitab.so'                         FROM DUMMY UNION ALL
  SELECT 'Pool/mds'                                              FROM DUMMY UNION ALL
  SELECT 'Pool/MDS/CellStorage/CellStorageTupleIndexer'          FROM DUMMY UNION ALL
  SELECT 'Pool/mds/CubeAxis'                                     FROM DUMMY UNION ALL
  SELECT 'Pool/MDS/MDSScenario'                                  FROM DUMMY UNION ALL
  SELECT 'Pool/parallel/aggregates'                              FROM DUMMY UNION ALL
  SELECT 'Pool/parallel/align'                                   FROM DUMMY UNION ALL
  SELECT 'Pool/parallel/compactcol'                              FROM DUMMY UNION ALL
  SELECT 'Pool/parallel/ihm'                                     FROM DUMMY UNION ALL
  SELECT 'Pool/parallel/pop'                                     FROM DUMMY UNION ALL
  SELECT 'Pool/parallel/temp_aggregates'                         FROM DUMMY UNION ALL
  SELECT 'Pool/parallel/temp_dimensions'                         FROM DUMMY UNION ALL
  SELECT 'Pool/parallel/temp_other'                              FROM DUMMY UNION ALL
  SELECT 'Pool/RowEngine/LOB'                                    FROM DUMMY UNION ALL
  SELECT 'Pool/RowEngine/MonitorView%'                           FROM DUMMY UNION ALL
  SELECT 'Pool/RowEngine/QueryCompilation'                       FROM DUMMY UNION ALL
  SELECT 'Pool/RowEngine/QueryExecution'                         FROM DUMMY UNION ALL
  SELECT 'Pool/RowEngine/QueryExecution/SearchAlloc'             FROM DUMMY UNION ALL
  SELECT 'Pool/SearchAPI'                                        FROM DUMMY UNION ALL
  SELECT 'Pool/SearchAPI/Itab Search'                            FROM DUMMY UNION ALL
  SELECT 'Pool/SQLScript/Execution'                              FROM DUMMY UNION ALL
  SELECT 'Pool/StringContainer'                                  FROM DUMMY UNION ALL
  SELECT 'Pool/Text/TextAttribute'                               FROM DUMMY UNION ALL
  SELECT 'Pool/ValueArray'                                       FROM DUMMY UNION ALL
  SELECT 'Pool/ValueArrayColumnDeserialize'                      FROM DUMMY UNION ALL
  SELECT 'Pool/XDictData'                                        FROM DUMMY
)
SELECT
  SAMPLE_TIME SNAPSHOT_TIME,
  KEY_FIGURE,
  VALUE_TOTAL,
  DETAIL_1,
  VALUE_1,
  PCT_1,
  DETAIL_2,
  VALUE_2,
  PCT_2,
  DETAIL_3,
  VALUE_3,
  PCT_3,
  DETAIL_4,
  VALUE_4,
  PCT_4,
  DETAIL_5,
  VALUE_5,
  PCT_5,
  DETAIL_6,
  VALUE_6,
  PCT_6,
  DETAIL_7,
  VALUE_7,
  PCT_7,
  DETAIL_8,
  VALUE_8,
  PCT_8,
  DETAIL_9,
  VALUE_9,
  PCT_9,
  DETAIL10,
  VALUE10,
  PCT10
FROM
( SELECT
    SAMPLE_TIME, /* With window frame "ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING" for NTH_VALUE this last aggregation would not be required */
    KEY_FIGURE_DESCRIPTION KEY_FIGURE,
    MAX(VALUE_TOTAL) VALUE_TOTAL,
    MAX(VALUE_TOTAL_NUMBER) VALUE_TOTAL_NUMBER,
    IFNULL(TO_VARCHAR(MAX(DETAIL_1)), ' ') DETAIL_1,
    IFNULL(TO_VARCHAR(MAX(VALUE_1)), ' ') VALUE_1,
    IFNULL(LPAD(MAX(PCT_1), 5), ' ') PCT_1,
    IFNULL(TO_VARCHAR(MAX(DETAIL_2)), ' ') DETAIL_2,
    IFNULL(TO_VARCHAR(MAX(VALUE_2)), ' ') VALUE_2,
    IFNULL(LPAD(MAX(PCT_2), 5), ' ') PCT_2,
    IFNULL(TO_VARCHAR(MAX(DETAIL_3)), ' ') DETAIL_3,
    IFNULL(TO_VARCHAR(MAX(VALUE_3)), ' ') VALUE_3,
    IFNULL(LPAD(MAX(PCT_3), 5), ' ') PCT_3,
    IFNULL(TO_VARCHAR(MAX(DETAIL_4)), ' ') DETAIL_4,
    IFNULL(TO_VARCHAR(MAX(VALUE_4)), ' ') VALUE_4,
    IFNULL(LPAD(MAX(PCT_4), 5), ' ') PCT_4,
    IFNULL(TO_VARCHAR(MAX(DETAIL_5)), ' ') DETAIL_5,
    IFNULL(TO_VARCHAR(MAX(VALUE_5)), ' ') VALUE_5,
    IFNULL(LPAD(MAX(PCT_5), 5), ' ') PCT_5,
    IFNULL(TO_VARCHAR(MAX(DETAIL_6)), ' ') DETAIL_6,
    IFNULL(TO_VARCHAR(MAX(VALUE_6)), ' ') VALUE_6,
    IFNULL(LPAD(MAX(PCT_6), 5), ' ') PCT_6,
    IFNULL(TO_VARCHAR(MAX(DETAIL_7)), ' ') DETAIL_7,
    IFNULL(TO_VARCHAR(MAX(VALUE_7)), ' ') VALUE_7,
    IFNULL(LPAD(MAX(PCT_7), 5), ' ') PCT_7,
    IFNULL(TO_VARCHAR(MAX(DETAIL_8)), ' ') DETAIL_8,
    IFNULL(TO_VARCHAR(MAX(VALUE_8)), ' ') VALUE_8,
    IFNULL(LPAD(MAX(PCT_8), 5), ' ') PCT_8,
    IFNULL(TO_VARCHAR(MAX(DETAIL_9)), ' ') DETAIL_9,
    IFNULL(TO_VARCHAR(MAX(VALUE_9)), ' ') VALUE_9,
    IFNULL(LPAD(MAX(PCT_9), 5), ' ') PCT_9,
    IFNULL(TO_VARCHAR(MAX(DETAIL_10)), ' ') DETAIL10,
    IFNULL(TO_VARCHAR(MAX(VALUE_10)), ' ') VALUE10,
    IFNULL(LPAD(MAX(PCT_10), 5), ' ') PCT10,
    MIN_TOTAL_SIZE_GB
  FROM
  ( SELECT DISTINCT
      SAMPLE_TIME,
      KEY_FIGURE_DESCRIPTION,
      LPAD(TO_DECIMAL(SUM(KEY_FIGURE) OVER (PARTITION BY SAMPLE_TIME), 12, 2), 15) VALUE_TOTAL,
      TO_DECIMAL(SUM(KEY_FIGURE) OVER (PARTITION BY SAMPLE_TIME), 12, 2) VALUE_TOTAL_NUMBER,
      NTH_VALUE(DETAIL, 1) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_1,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 1) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_1,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 1) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_1,
      NTH_VALUE(DETAIL, 2) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_2,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 2) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_2,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 2) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_2,
      NTH_VALUE(DETAIL, 3) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_3,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 3) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_3,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 3) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_3,
      NTH_VALUE(DETAIL, 4) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_4,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 4) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_4,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 4) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_4,
      NTH_VALUE(DETAIL, 5) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_5,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 5) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_5,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 5) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_5,
      NTH_VALUE(DETAIL, 6) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_6,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 6) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_6,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 6) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_6,
      NTH_VALUE(DETAIL, 7) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_7,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 7) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_7,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 7) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_7,
      NTH_VALUE(DETAIL, 8) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_8,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 8) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_8,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 8) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_8,
      NTH_VALUE(DETAIL, 9) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_9,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 9) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_9,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 9) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_9,
      NTH_VALUE(DETAIL, 10) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC) DETAIL_10,
      LPAD(TO_DECIMAL(NTH_VALUE(KEY_FIGURE, 10) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC), 10, 2), 12) VALUE_10,
      TO_DECIMAL(ROUND(NTH_VALUE(PERCENT, 10) OVER (PARTITION BY SAMPLE_TIME ORDER BY KEY_FIGURE DESC)), 10, 0) PCT_10,
      MIN_TOTAL_SIZE_GB
    FROM
    ( SELECT
        SAMPLE_TIME,
        DETAIL,
        KEY_FIGURE_DESCRIPTION,
        SUM(KEY_FIGURE) KEY_FIGURE,
        MAP(SUM(KEY_FIGURE), 0, 0, SUM(KEY_FIGURE) / SUM(SUM(KEY_FIGURE)) OVER (PARTITION BY SAMPLE_TIME) * 100) PERCENT,
        MIN_TOTAL_SIZE_GB
      FROM
      ( SELECT
          CASE 
            WHEN TIME_AGGREGATE_BY LIKE 'TS%' THEN
              TO_VARCHAR(ADD_SECONDS(TO_TIMESTAMP('2014/01/01 00:00:00', 'YYYY/MM/DD HH24:MI:SS'), FLOOR(SECONDS_BETWEEN(TO_TIMESTAMP('2014/01/01 00:00:00', 
              'YYYY/MM/DD HH24:MI:SS'), SERVER_TIMESTAMP) / SUBSTR(TIME_AGGREGATE_BY, 3)) * SUBSTR(TIME_AGGREGATE_BY, 3)), 'YYYY/MM/DD HH24:MI:SS')
            ELSE TO_VARCHAR(SERVER_TIMESTAMP, TIME_AGGREGATE_BY)
          END SAMPLE_TIME,
          DETAIL,
          KEY_FIGURE_DESCRIPTION,
          MAP(BI_KEY_FIGURE, 'ALLOCATED', SUM(KEY_FIGURE), AVG(KEY_FIGURE)) KEY_FIGURE,
          MIN_TOTAL_SIZE_GB
        FROM
        ( SELECT
            SERVER_TIMESTAMP,
            AREA,
            SUBAREA,
            DETAIL,
            KEY_FIGURE_DESCRIPTION,
            TIME_AGGREGATE_BY,
            MIN_TOTAL_SIZE_GB,
            SUM(KEY_FIGURE) KEY_FIGURE,
            BI_KEY_FIGURE
          FROM
          ( SELECT
              CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(D.SERVER_TIMESTAMP, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE D.SERVER_TIMESTAMP END SERVER_TIMESTAMP,
              D.AREA,
              D.SUBAREA,
              MAP(BI.AGGREGATE_BY, 'SCHEMA', D.SCHEMA_NAME, 'HOST', D.HOST, 'PORT', TO_VARCHAR(D.PORT), 'MAINAREA', D.AREA, 'SUBAREA', D.SUBAREA, 'DETAIL',
                MAP(BI.OBJECT_LEVEL, 'TABLE', D.DETAIL,
                  D.DETAIL || MAP(D.PART_ID, -1, '', 0, '', ' (P' || D.PART_ID || ')'))) DETAIL,
              MAP(BI.KEY_FIGURE,
                'ALLOCATED', 'Space allocated (GB)',
                'USED',      'Space used (GB)') KEY_FIGURE_DESCRIPTION,
              MAP(BI.KEY_FIGURE, 
                'ALLOCATED', D.ALLOC_BYTE / 1024 / 1024 / 1024,
                'USED',      D.USED_BYTE / 1024 / 1024 / 1024) KEY_FIGURE,
              BI.TIME_AGGREGATE_BY,
              BI.MIN_TOTAL_SIZE_GB,
              BI.KEY_FIGURE BI_KEY_FIGURE
            FROM
              BASIS_INFO BI,
              ( SELECT
                  'COLUMN' AREA,
                  L.SUBAREA,
                  CT.SERVER_TIMESTAMP,
                  CT.SCHEMA_NAME,
                  CT.TABLE_NAME DETAIL,
                  CT.PART_ID,
                  CT.SITE_ID,
                  CT.HOST,
                  CT.PORT,
                  CT.RECORD_COUNT NUM_ROWS,
                  CASE L.SUBAREA
                    WHEN 'Column Store (Others)' THEN CT.MEMORY_SIZE_IN_TOTAL - CT.MEMORY_SIZE_IN_MAIN - CT.MEMORY_SIZE_IN_DELTA
                    WHEN 'Column Store (Main)'   THEN CT.MEMORY_SIZE_IN_MAIN + CT.PERSISTENT_MEMORY_SIZE_IN_TOTAL
                    WHEN 'Column Store (Delta)'  THEN CT.MEMORY_SIZE_IN_DELTA
                  END ALLOC_BYTE,
                  CASE L.SUBAREA
                    WHEN 'Column Store (Others)' THEN CT.MEMORY_SIZE_IN_TOTAL - CT.MEMORY_SIZE_IN_MAIN - CT.MEMORY_SIZE_IN_DELTA
                    WHEN 'Column Store (Main)'   THEN CT.MEMORY_SIZE_IN_MAIN + CT.PERSISTENT_MEMORY_SIZE_IN_TOTAL
                    WHEN 'Column Store (Delta)'  THEN CT.MEMORY_SIZE_IN_DELTA
                  END USED_BYTE
                FROM
                ( SELECT 'Column Store (Others)' SUBAREA FROM DUMMY UNION ALL
                  SELECT 'Column Store (Main)'           FROM DUMMY UNION ALL
                  SELECT 'Column Store (Delta)'          FROM DUMMY
                ) L,
                ( SELECT
                    *
                  FROM
                    _SYS_STATISTICS.HOST_COLUMN_TABLES_PART_SIZE
                ) CT
                UNION ALL
                ( SELECT
                    'ROW' AREA,
                    'Row Store (Tables)' SUBAREA,
                    RT.SERVER_TIMESTAMP,
                    RT.SCHEMA_NAME,
                    RT.TABLE_NAME DETAIL,
                    0 PART_ID,
                    RT.SITE_ID,
                    RT.HOST,
                    RT.PORT,
                    RT.RECORD_COUNT NUM_ROWS,
                    RT.ALLOCATED_FIXED_PART_SIZE + RT.ALLOCATED_VARIABLE_PART_SIZE ALLOC_BYTE,
                    RT.USED_FIXED_PART_SIZE + RT.USED_VARIABLE_PART_SIZE USED_BYTE
                  FROM
                    _SYS_STATISTICS.GLOBAL_ROWSTORE_TABLES_SIZE RT
                )
                UNION ALL
                ( SELECT
                    'ROW' AREA,
                    'Row Store (Int. Fragmentation)' SUBAREA,
                    RT.SERVER_TIMESTAMP,
                    ' ',
                    'Row Store (Int. Fragmentation)',
                    0 PART_ID,
                    RT.SITE_ID,
                    RT.HOST,
                    RT.PORT,
                    0 NUM_ROWS,
                    SUM(RT.ALLOCATED_FIXED_PART_SIZE + RT.ALLOCATED_VARIABLE_PART_SIZE - RT.USED_FIXED_PART_SIZE - RT.USED_VARIABLE_PART_SIZE ) ALLOC_BYTE,
                    SUM(RT.ALLOCATED_FIXED_PART_SIZE + RT.ALLOCATED_VARIABLE_PART_SIZE - RT.USED_FIXED_PART_SIZE - RT.USED_VARIABLE_PART_SIZE ) USED_BYTE
                  FROM
                    _SYS_STATISTICS.GLOBAL_ROWSTORE_TABLES_SIZE RT
                  GROUP BY
                    SERVER_TIMESTAMP,
                    SITE_ID,
                    HOST,
                    PORT
                )
                UNION ALL
                ( SELECT
                    'ROW' AREA,
                    'Row Store (Indexes)' SUBAREA,
                    RT.SERVER_TIMESTAMP,
                    RT.SCHEMA_NAME,
                    RT.TABLE_NAME DETAIL,
                    0 PART_ID,
                    RT.SITE_ID,
                    RT.HOST,
                    RT.PORT,
                    0 NUM_ROWS,
                    RT.INDEX_SIZE ALLOC_BYTE,
                    RT.INDEX_SIZE USED_BYTE
                  FROM
                    _SYS_STATISTICS.HOST_RS_INDEXES RT
                )
                UNION ALL
                ( SELECT
                    'HEAP',
                    'Heap' || CHAR(32) || '(' || COMPONENT || 
                      CASE 
                        WHEN CATEGORY LIKE 'Pool/CS/BufferPage'                                                                            THEN CHAR(32) || '-' || CHAR(32) || 'Column Store Tables'
                        WHEN CATEGORY LIKE 'Pool/PersistenceManager/PersistentSpace%/Default%Page'                                         THEN CHAR(32) || '-' || CHAR(32) || 'Page Cache'
                        WHEN CATEGORY LIKE 'Pool/LVCAllocator%' OR CATEGORY LIKE 'Pool/PersistenceManager/PersistentSpace%/StaticLPA/Page' THEN CHAR(32) || '-' || CHAR(32) || 'liveCache'
                        ELSE '' 
                      END || ')' SUBAREA,
                    HA.SERVER_TIMESTAMP,
                    ' ' SCHEMA_NAME,
                    HA.CATEGORY,
                    0 PART_ID,
                    HA.SITE_ID,
                    HA.HOST,
                    HA.PORT,
                    HA.EXCLUSIVE_ALLOCATED_COUNT NUM_ROWS,
                    HA.EXCLUSIVE_ALLOCATED_SIZE - LEAD(HA.EXCLUSIVE_ALLOCATED_SIZE, 1) OVER (PARTITION BY CATEGORY, HOST, PORT ORDER BY SERVER_TIMESTAMP DESC),
                    HA.EXCLUSIVE_SIZE_IN_USE
                  FROM
                    _SYS_STATISTICS.HOST_HEAP_ALLOCATORS HA
                )
                UNION ALL
                ( SELECT
                    'ROW' AREA,
                    'Row Store (Ext. Fragmentation)' SUBAREA,
                    SERVER_TIMESTAMP,
                    ' ',
                    'Row Store (Ext. Fragmentation)',
                    0,
                    SITE_ID,
                    HOST,
                    PORT,
                    0,
                    SUM(FREE_SIZE),
                    SUM(FREE_SIZE)
                  FROM
                    _SYS_STATISTICS.HOST_RS_MEMORY
                  WHERE
                    CATEGORY IN ('CATALOG', 'TABLE')
                  GROUP BY
                    SERVER_TIMESTAMP,
                    SITE_ID,
                    HOST,
                    PORT
                )
                UNION ALL
                ( SELECT
                    'ROW' AREA,
                    'Row Store (Ext. Frag. Garb.)' SUBAREA,
                    TO_TIMESTAMP(TO_VARCHAR(M.SERVER_TIMESTAMP, 'YYYY/MM/DD HH24'), 'YYYY/MM/DD HH24') SERVER_TIMESTAMP,
                    ' ',
                    'Row Store (Ext. Frag. Garb.)',
                    0,
                    M.SITE_ID,
                    M.HOST,
                    M.PORT,
                    0,
                    GREATEST(AVG(M.GROSS_ALLOC) - AVG(T.NET_ALLOC), 0),
                    GREATEST(AVG(M.GROSS_ALLOC) - AVG(T.NET_ALLOC), 0)
                  FROM
                  ( SELECT
                      SITE_ID,
                      HOST,
                      PORT,
                      SERVER_TIMESTAMP,
                      SUM(ALLOCATED_SIZE - FREE_SIZE) GROSS_ALLOC
                    FROM
                      _SYS_STATISTICS.HOST_RS_MEMORY
                    WHERE
                      CATEGORY = 'TABLE'
                    GROUP BY
                      SITE_ID,
                      HOST,
                      PORT,
                      SERVER_TIMESTAMP
                  ) M,
                  ( SELECT
                      SITE_ID,
                      HOST,
                      PORT,
                      SERVER_TIMESTAMP,
                      SUM(ALLOCATED_FIXED_PART_SIZE + ALLOCATED_VARIABLE_PART_SIZE) NET_ALLOC
                    FROM
                      _SYS_STATISTICS.GLOBAL_ROWSTORE_TABLES_SIZE
                    GROUP BY
                      SITE_ID,
                      HOST,
                      PORT,
                      SERVER_TIMESTAMP
                  ) T
                  WHERE
                    M.SITE_ID = T.SITE_ID AND
                    M.HOST = T.HOST AND
                    M.PORT = T.PORT AND
                    TO_VARCHAR(M.SERVER_TIMESTAMP, 'YYYY/MM/DD HH24') = TO_VARCHAR(T.SERVER_TIMESTAMP, 'YYYY/MM/DD HH24')
                  GROUP BY
                    TO_VARCHAR(M.SERVER_TIMESTAMP, 'YYYY/MM/DD HH24'),
                    M.SITE_ID,
                    M.HOST,
                    M.PORT
                )
                UNION ALL
                ( SELECT
                    'HEAP' AREA,
                    'Heap (Fragmentation)' SUBAREA,
                    SM.SERVER_TIMESTAMP,
                    ' ' SCHEMA_NAME,
                    'Heap (Fragmentation)' CATEGORY,
                    0 PART_ID,
                    SM.SITE_ID,
                    SM.HOST,
                    SM.PORT,
                    0 NUM_ROWS,
                    0,
                    SM.FRAGMENTED_MEMORY_SIZE
                  FROM
                    _SYS_STATISTICS.HOST_SERVICE_MEMORY SM
                )
                UNION ALL
                ( SELECT
                    'CODE' AREA,
                    'Code' SUBAREA,
                    SM.SERVER_TIMESTAMP,
                    ' ' SCHEMA_NAME,
                    'CODE' CATEGORY,
                    0 PART_ID,
                    SM.SITE_ID,
                    SM.HOST,
                    SM.PORT,
                    0 NUM_ROWS,
                    AVG(SM.CODE_SIZE) OVER (PARTITION BY SM.HOST, SM.SERVER_TIMESTAMP) / COUNT(*) OVER (PARTITION BY SM.HOST, SM.SERVER_TIMESTAMP),
                    AVG(SM.CODE_SIZE) OVER (PARTITION BY SM.HOST, SM.SERVER_TIMESTAMP) / COUNT(*) OVER (PARTITION BY SM.HOST, SM.SERVER_TIMESTAMP)
                  FROM
                    _SYS_STATISTICS.HOST_SERVICE_MEMORY SM
                )
                UNION ALL
                ( SELECT
                    'STACK' AREA,
                    'Stack' SUBAREA,
                    SM.SERVER_TIMESTAMP,
                    ' ' SCHEMA_NAME,
                    'STACK' CATEGORY,
                    0 PART_ID,
                    SM.SITE_ID,
                    SM.HOST,
                    SM.PORT,
                    0 NUM_ROWS,
                    SM.STACK_SIZE,
                    SM.STACK_SIZE
                  FROM
                    _SYS_STATISTICS.HOST_SERVICE_MEMORY SM
                )
              ) D      
            WHERE
              D.SCHEMA_NAME LIKE BI.SCHEMA_NAME AND
              D.DETAIL LIKE BI.DETAIL AND
              ( BI.SITE_ID = -1 OR ( BI.SITE_ID = 0 AND D.SITE_ID IN (-1, 0) ) OR D.SITE_ID = BI.SITE_ID ) AND
              D.HOST LIKE BI.HOST AND
              TO_VARCHAR(D.PORT) LIKE BI.PORT AND
              CASE BI.TIMEZONE WHEN 'UTC' THEN ADD_SECONDS(D.SERVER_TIMESTAMP, SECONDS_BETWEEN(CURRENT_TIMESTAMP, CURRENT_UTCTIMESTAMP)) ELSE D.SERVER_TIMESTAMP END BETWEEN BI.BEGIN_TIME AND BI.END_TIME AND
              ( BI.AREA = 'TABLES' AND D.AREA IN ('ROW', 'COLUMN') OR
                D.AREA LIKE BI.AREA ) AND
              UPPER(D.SUBAREA) LIKE UPPER(BI.SUBAREA) AND
              ( BI.INCLUDE_OVERLAPPING_HEAP_AREAS = 'X' OR
                D.AREA != 'HEAP' OR
                D.DETAIL LIKE 'Pool/ColumnStore%/Delta' OR
                D.DETAIL LIKE 'Pool/ColumnStore%/System' OR
                D.DETAIL LIKE 'Pool/ColumnStore%/Main/Rowid/build-reverse-index' OR
                ( D.DETAIL NOT LIKE 'Pool/AttributeEngine%' AND
                  D.DETAIL NOT LIKE 'Pool/ColumnStore%' AND
                  D.DETAIL != 'Pool/CS/BufferPage' AND
                  D.DETAIL NOT LIKE 'Pool/Text/AEText%' AND
                  D.DETAIL NOT IN
                  ( 'Pool/FuzzySearch',
                    'Pool/malloc/libhdbcstypes.so',
                    'Pool/NameIdMapping/RoDict',
                    'Pool/PersistenceManager/PersistentSpace/RowStoreLPA/RowStoreSegment',
                    'Pool/RowEngine/CpbTree',
                    'Pool/RowStoreTables/CpbTree',
                    'Pool/SerializedObject',
                    'StackAllocator'
                  )
                ) 
              ) AND
              ( BI.ONLY_SQL_DATA_AREAS    = ' '     OR     EXISTS ( SELECT ALLOCATOR FROM SQL_DATA_AREAS S WHERE D.DETAIL LIKE S.ALLOCATOR ) ) AND
              ( BI.EXCLUDE_SQL_DATA_AREAS = ' '     OR NOT EXISTS ( SELECT ALLOCATOR FROM SQL_DATA_AREAS S WHERE D.DETAIL LIKE S.ALLOCATOR ) ) AND
              ( BI.EXCLUDE_HEAP_FRAGMENTATION = ' ' OR D.SUBAREA != 'Heap (Fragmentation)' )
          )
          WHERE
            KEY_FIGURE > 0
          GROUP BY
            SERVER_TIMESTAMP,
            AREA,
            SUBAREA,
            DETAIL,
            KEY_FIGURE_DESCRIPTION,
            TIME_AGGREGATE_BY,
            MIN_TOTAL_SIZE_GB,
            BI_KEY_FIGURE
        )
        GROUP BY
          CASE 
            WHEN TIME_AGGREGATE_BY LIKE 'TS%' THEN
              TO_VARCHAR(ADD_SECONDS(TO_TIMESTAMP('2014/01/01 00:00:00', 'YYYY/MM/DD HH24:MI:SS'), FLOOR(SECONDS_BETWEEN(TO_TIMESTAMP('2014/01/01 00:00:00', 
              'YYYY/MM/DD HH24:MI:SS'), SERVER_TIMESTAMP) / SUBSTR(TIME_AGGREGATE_BY, 3)) * SUBSTR(TIME_AGGREGATE_BY, 3)), 'YYYY/MM/DD HH24:MI:SS')
            ELSE TO_VARCHAR(SERVER_TIMESTAMP, TIME_AGGREGATE_BY)
          END,
          AREA,
          SUBAREA,
          DETAIL,
          KEY_FIGURE_DESCRIPTION,
          MIN_TOTAL_SIZE_GB,
          BI_KEY_FIGURE
      )
      GROUP BY
        SAMPLE_TIME,
        DETAIL,
        KEY_FIGURE_DESCRIPTION,
        MIN_TOTAL_SIZE_GB
    )
  )
  GROUP BY
    SAMPLE_TIME,
    KEY_FIGURE_DESCRIPTION,
    MIN_TOTAL_SIZE_GB 
)
WHERE
( MIN_TOTAL_SIZE_GB = -1 OR VALUE_TOTAL_NUMBER >= MIN_TOTAL_SIZE_GB )
ORDER BY
  SAMPLE_TIME DESC
WITH HINT (IGNORE_PLAN_CACHE)
    `;

    const result = await executeQuery(query);
    return formatQueryResult(result, '');
  } catch (error) {
    return createErrorResponse(`조회 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
