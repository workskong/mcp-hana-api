import { handelThreadSamples_FilterAndAggregation } from '../handlers/handelThreadSamples_FilterAndAggregation';
import { handleExpensiveStatements as handleConfiguration_MiniChecks } from '../handlers/handleConfiguration_MiniChecks';
import { handleExpensiveStatements } from '../handlers/handleExpensiveStatements';
import { handleLoadHistory } from '../handlers/handleLoadHistory';
import { handleMemory_TopConsumers_TimeSlices } from '../handlers/handleMemory_TopConsumers_TimeSlices';
import { handleResources_CPUAndMemory } from '../handlers/handleResources_CPUAndMemory';
import { handleSQLCache } from '../handlers/handleSQLCache';
import { handleSQLCacheTopLists } from '../handlers/handleSQLCacheTopLists';
import { handleStatementHash_DataCollector } from '../handlers/handleStatementHash_DataCollector';
import { handleSystemOverview } from '../handlers/handleSystemOverview';
import { handleThreadSamples_AggregationPerTimeSlice } from '../handlers/handleThreadSamples_AggregationPerTimeSlice';

type ToolInputSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  handler: (args: any) => Promise<any>;
};

const timeProps = {
  beginTime: {
    type: 'string',
    description: 'Start time (yyyy/mm/dd HH24:MI:SS, C-H1, etc.)',
    default: 'C-H1'
  },
  endTime: {
    type: 'string',
    description: 'End time (yyyy/mm/dd HH24:MI:SS, C, etc.)',
    default: 'C'
  }
};

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'SystemOverview',
    description: 'HANA system overview information',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => handleSystemOverview()
  },
  {
    name: 'Resources_CPUAndMemory',
    description: 'HANA CPU and memory resource monitoring information',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        aggregationType: {
          type: 'string',
          description: 'Aggregation type (AVG: average, PEAK: peak)',
          default: 'AVG',
          enum: ['AVG', 'PEAK']
        },
        timeAggregateBy: {
          type: 'string',
          description: 'Time aggregation unit (HOUR, DAY, HOUR_OF_DAY, TS60, NONE)',
          default: 'TS60'
        }
      }
    },
    handler: handleResources_CPUAndMemory
  },
  {
    name: 'SQLCache',
    description: 'HANA SQL cache information',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        statementHash: { type: 'string', description: 'Statement hash', default: '%' },
        appName: { type: 'string', description: 'Application name', default: '%' },
        appSource: { type: 'string', description: 'Application source', default: '%' },
        timeAggregateBy: {
          type: 'string',
          description: 'Time aggregation unit (HOUR, DAY, HOUR_OF_DAY, TS60, NONE)',
          default: 'TS60'
        },
        orderBy: { type: 'string', description: 'Sort key', default: 'TIME' }
      }
    },
    handler: handleSQLCache
  },
  {
    name: 'ExpensiveStatements',
    description: 'HANA expensive SQL statements',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        statementHash: { type: 'string', description: 'Statement hash', default: '%' },
        workloadClass: { type: 'string', description: 'Workload class', default: '%' },
        appUser: { type: 'string', description: 'Application user', default: '%' },
        appSource: { type: 'string', description: 'Application source', default: '%' },
        bindValues: { type: 'string', description: 'Bind values', default: '%' },
        timeAggregateBy: {
          type: 'string',
          description: 'Time aggregation unit (HOUR, DAY, HOUR_OF_DAY, TS60, NONE)',
          default: 'TS60'
        },
        orderBy: { type: 'string', description: 'Sort key', default: 'TIME' }
      }
    },
    handler: handleExpensiveStatements
  },
  {
    name: 'LoadHistory',
    description: 'HANA load history performance data',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        aggregationType: {
          type: 'string',
          description: 'Aggregation type (AVG: average, PEAK: peak)',
          default: 'AVG',
          enum: ['AVG', 'PEAK']
        },
        timeAggregateBy: {
          type: 'string',
          description: 'Time aggregation unit (HOUR, DAY, HOUR_OF_DAY, TS60, NONE)',
          default: 'TS60'
        }
      }
    },
    handler: handleLoadHistory
  },
  {
    name: 'Memory_TopConsumers_TimeSlices',
    description: 'HANA memory top consumers aggregated data',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        objectLevel: { type: 'string', description: 'Object level', default: 'TABLE' },
        timeAggregateBy: {
          type: 'string',
          description: 'Time aggregation unit (HOUR, DAY, HOUR_OF_DAY, TS60, NONE)',
          default: 'TS60'
        }
      }
    },
    handler: handleMemory_TopConsumers_TimeSlices
  },
  {
    name: 'SQLCacheTopLists',
    description: 'HANA SQL cache top list',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        tableName: { type: 'string', description: 'Table name', default: '%' }
      }
    },
    handler: handleSQLCacheTopLists
  },
  {
    name: 'StatementHash_DataCollector',
    description: 'HANA statement hash based detailed data collection',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        statementHash: { type: 'string', description: 'Statement hash', default: '%' },
        maxResultLines: { type: 'string', description: 'Maximum result rows', default: '30' },
        timeUnit: { type: 'string', description: 'Time unit (MS, S, M, H, D)', default: 'MS' }
      }
    },
    handler: handleStatementHash_DataCollector
  },
  {
    name: 'Configuration_MiniChecks',
    description: 'HANA mini configuration checks',
    inputSchema: { type: 'object', properties: {} },
    handler: handleConfiguration_MiniChecks
  },
  {
    name: 'ThreadSamples_AggregationPerTimeSlice',
    description: 'HANA thread samples aggregated data',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        statementHash: { type: 'string', description: 'Statement hash', default: '%' },
        statementId: { type: 'string', description: 'Statement id', default: '%' },
        appUser: { type: 'string', description: 'Application user', default: '%' },
        appSource: { type: 'string', description: 'Application source', default: '%' },
        passportAction: { type: 'string', description: 'Passport action', default: '%' },
        aggregateBy: { type: 'string', description: 'Aggregate by column', default: 'HASH' }
      }
    },
    handler: handleThreadSamples_AggregationPerTimeSlice
  },
  {
    name: 'ThreadSamples_FilterAndAggregation',
    description: 'HANA thread samples filter and aggregation',
    inputSchema: {
      type: 'object',
      properties: {
        ...timeProps,
        statementHash: { type: 'string', description: 'Statement hash', default: '%' },
        rootStatementHash: { type: 'string', description: 'Root statement hash', default: '%' },
        statementId: { type: 'string', description: 'Statement id', default: '%' },
        appUser: { type: 'string', description: 'Application user', default: '%' },
        appSource: { type: 'string', description: 'Application source', default: '%' },
        passportAction: { type: 'string', description: 'Passport action', default: '%' },
        orderBy: { type: 'string', description: 'Sort key', default: 'TIME' }
      }
    },
    handler: handelThreadSamples_FilterAndAggregation
  }
];
