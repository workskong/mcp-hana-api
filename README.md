
# mcp-hana-monitoring

**Model Context Protocol (MCP) Server for SAP HANA Database Monitoring**

This project provides a server for real-time monitoring of key SAP HANA resources (system, memory, disk, CPU, sessions, tables, services, and more). It supports custom queries and performance analysis, accessible via MCP Inspector or API.

## 🚀 Quick Start

### Installation

```bash
git clone <your-repo-url>
cd mcp-hana-monitoring
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in your HANA connection details:

```env
HANA_SERVER_NODE=localhost:30215
HANA_USERNAME=XXXX
HANA_PASSWORD=XXXX
LOG_LEVEL=info
MAX_HISTORY_SIZE=50
MAX_RESULT_SIZE=1000
```

### Running

```bash
# Production
npm run build
npm start

# Development (with Inspector)
npm run dev
```

## 🔍 MCP Inspector Integration

You can use MCP Inspector in your browser for direct monitoring:

```bash
npx mcp-inspector
```

Open [http://127.0.0.1:6274](http://127.0.0.1:6274) in your browser and connect to the MCP server (127.0.0.1:6277).

## 🏗️ Architecture

- **Handler Structure**: Each monitoring tool is implemented as an independent handler function, dynamically invoked based on MCP requests.
- **Server Class**: `HanaMonitoringServer` manages all MCP requests (tool list, resource list, query execution, etc.).
- **Automatic Tool Registration**: Tool names, descriptions, input schemas, and handlers are automatically mapped and managed.
- **Utilities**: HANA connection, query execution, result formatting, and error handling are managed in `lib/utils.ts`.

## 📊 Supported Tools & Main Parameters

| Tool Name | Description | Main Parameters |
|-----------|-------------|----------------|
| SystemOverview | Overview of HANA system status | - |
| Resources_CPUAndMemory | CPU/Memory resource monitoring | beginTime, endTime, aggregationType, timeAggregateBy |
| SQLCache | SQL plan cache statistics | beginTime, endTime, statementHash, appName, appSource, timeAggregateBy, orderBy |
| ExpensiveStatements | Expensive SQL statement history | beginTime, endTime, statementHash, workloadClass, appUser, appSource, bindValues, timeAggregateBy, orderBy |
| LoadHistory | Load history performance data | beginTime, endTime, aggregationType, timeAggregateBy |
| Memory_TopConsumers_TimeSlices | Top memory consumers by time slice | beginTime, endTime, objectLevel, timeAggregateBy |
| SQLCacheTopLists | SQL cache top N lists by table | beginTime, endTime, tableName |
| StatementHash_DataCollector | Detailed statement hash execution history | beginTime, endTime, statementHash, maxResultLines, timeUnit |
| CustomQuery | User-defined SELECT query (safe only) | query, description |
| Configuration_MiniChecks | Mini configuration checks (best practices) | - |
| ThreadSamples_AggregationPerTimeSlice | Thread sample aggregation by time slice | beginTime, endTime, statementHash, statementId, appUser, appSource, passportAction, aggregateBy |
| ThreadSamples_FilterAndAggregation | Thread sample filtering/aggregation | beginTime, endTime, statementHash, rootStatementHash, statementId, appUser, appSource, passportAction, orderBy |

### Tool Function Summaries

- **SystemOverview**: Retrieves overall system and database overview.
- **Resources_CPUAndMemory**: Aggregates HANA and OS CPU/memory/swap usage.
- **SQLCache**: Statistics and aggregation for SQL plan cache.
- **ExpensiveStatements**: History and aggregation of expensive SQL executions.
- **LoadHistory**: Aggregated HANA load history.
- **Memory_TopConsumers_TimeSlices**: Aggregates top memory-consuming tables/partitions.
- **SQLCacheTopLists**: Top N SQL cache lists by table.
- **StatementHash_DataCollector**: Collects detailed execution history for a statement hash.
- **CustomQuery**: Executes user-provided SELECT queries (dangerous queries are blocked).
- **Configuration_MiniChecks**: Checks for recommended HANA configuration.
- **ThreadSamples_AggregationPerTimeSlice**: Aggregates thread samples by time.
- **ThreadSamples_FilterAndAggregation**: Filters and aggregates thread samples by various conditions.

---

## 📚 Resources & Templates

- `hana://config` - HANA connection settings
- `hana://status` - Connection status
- `hana://tools-info` - Available tool information (by category)
- `hana://templates/system-queries` - System query templates
- `hana://templates/performance-queries` - Performance analysis query templates
- `hana://templates/tool-examples` - Tool usage examples
- `hana://results/last-query` - Last query result
- `hana://results/query-history` - Query execution history

---

### Usage Example

```json
{
  "name": "SQLCache",
  "arguments": {
    "beginTime": "C-H1",
    "endTime": "C",
    "orderBy": "TIME"
  }
}
```

## 🔧 Logging & Error Handling

- Control log level via the `LOG_LEVEL` environment variable (debug, info, warn, error)
- All query executions and MCP requests are recorded with structured logging
- Detailed error messages and stack traces are provided on failure

## 🧪 Testing

### Full Integration Test
```bash
npx ts-node ...
```

### Individual Handler Test
```bash
npx ts-node test/...
# Runs test files for each handler in the test folder
```

## ⚙️ System Requirements

### HANA Privileges
- SELECT on system views (M_*)

### Environment
- SAP HANA 2.00.070+ recommended
- Node.js

## 📄 License

MIT
