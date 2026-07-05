# MCP HANA Monitoring Server

This project provides a Monitoring Server for SAP HANA databases, utilizing the Model Context Protocol (MCP). It allows users to monitor various aspects of a HANA database, including system overview, resource utilization, SQL cache, expensive statements, and more.

## Features

- **Comprehensive Monitoring:** Provides a wide range of tools for monitoring HANA databases.
- **Extensible:** New monitoring tools can be easily added by implementing new handlers.
- **MCP Compliant:** Implements the Model Context Protocol for standardized communication.
- **Resource-based Information:** Exposes various information through resources, such as configuration, status, and query templates.
- **Dual Mode Support:** Supports local MCP stdio mode and remote HTTP/SSE mode.

## Available Tools

The server provides the following monitoring tools:

- **SystemOverview:** HANA system overview information.
- **Resources_CPUAndMemory:** HANA CPU and memory resource monitoring information.
- **SQLCache:** HANA SQL cache information.
- **ExpensiveStatements:** HANA expensive SQL statements.
- **LoadHistory:** HANA Load History performance data.
- **Memory_TopConsumers_TimeSlices:** HANA memory top consumers aggregated data.
- **SQLCacheTopLists:** HANA SQL Cache top list.
- **StatementHash_DataCollector:** HANA Statement Hash based detailed data collection.
- **Configuration_MiniChecks:** HANA mini configuration checks.
- **ThreadSamples_AggregationPerTimeSlice:** HANA Thread Samples aggregated data.
- **ThreadSamples_FilterAndAggregation:** HANA Thread Samples filter and aggregation.

## Resources

The server exposes the following resources:

- **`hana://config`:** HANA connection configuration.
- **`hana://status`:** HANA connection status.
- **`hana://tools-info`:** Detailed information about the available monitoring tools.
- **`hana://templates/system-queries`:** SQL query templates for system monitoring.
- **`hana://templates/performance-queries`:** SQL query templates for performance analysis.
- **`hana://templates/tool-examples`:** Examples of how to use each tool.
- **`hana://results/last-query`:** The result of the last executed query.
- **`hana://results/query-history`:** A history of recently executed queries.

## Getting Started

### Prerequisites

- Node.js
- An SAP HANA database instance

### Installation

1. Clone the repository:
   ```bash
  git clone https://github.com/workskong/mcp-hana-api.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your HANA connection details:
   ```
   HANA_HOST=your_hana_host
   HANA_PORT=your_hana_port
   HANA_USER=your_hana_user
   HANA_PASSWORD=your_hana_password
   ```

### Running the Server

- **Build the project:**
  ```bash
  npm run build
  ```
- **Start local MCP server (stdio):**
  ```bash
  npm start
  ```
- **Start remote MCP server (HTTP/SSE):**
  ```bash
  # Optional (default: 6968)
  export PORT=6968
  npm run start-remote
  ```
- **Start in development mode with inspector:**
  ```bash
  npm run dev
  ```

## Remote Endpoints

When running with `npm run start-remote`, the following endpoints are available:

- **GET `/`**: server health and metadata
- **GET `/tools`**: list available tools and input schemas
- **POST `/call`**: execute a tool with `{ name, arguments }`
- **POST `/`**: MCP JSON-RPC endpoint (`initialize`, `tools/list`, `tools/call`)
- **GET `/events`** and **GET `/sse`**: Server-Sent Events streams
- **POST `/emit`**: emit SSE test events (`{ event, data, topic? }`)
- **GET `/authorize`**: simple authorization callback page

### Remote HANA Connection Inputs

Remote mode supports per-request HANA credentials through HTTP headers:

- `X-HANA-HOST`
- `X-HANA-PORT`
- `X-HANA-USER`
- `X-HANA-PASSWORD`

If headers are omitted, the server falls back to environment variables (`HANA_HOST`, `HANA_PORT`, `HANA_USER`/`HANA_UID`, `HANA_PASSWORD`/`HANA_PWD`).

### Testing

The project includes a suite of tests to ensure the correctness of the handlers.

- **Run all tests:**
  ```bash
  npm run test:handlers:all
  ```
- **Run individual tests:**
  ```bash
  npm run test:handlers:individual
  ```
- **Run tests with Jest:**
  ```bash
  npm run test:handlers:jest
  ```

## How to Contribute

Contributions are welcome! Please feel free to submit a pull request or open an issue.