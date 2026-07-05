#!/usr/bin/env node
import { HanaMonitoringServer } from './hanaMonitoringServer';
import { startRemoteServer } from './lib/remoteServer';

try {
  if (process.argv.includes('--remote')) {
    startRemoteServer().then(() => {
      process.stdout.write('Remote MCP server started successfully.\n');
    }).catch((error: unknown) => {
      process.stderr.write(`[ERROR] Remote server start failed: ${String(error)}\n`);
      process.exit(1);
    });
  } else {
    const server = new HanaMonitoringServer();
    server.run().catch((error) => {
      process.stderr.write(`[ERROR] Server run failed: ${error}\n`);
      process.stderr.write(`[ERROR] Details: ${error.stack}\n`);
      process.exit(1);
    });
  }
} catch (error) {
  process.stderr.write(`[ERROR] Server creation failed: ${error}\n`);
  process.stderr.write(`[ERROR] Details: ${error instanceof Error ? error.stack : error}\n`);
  process.exit(1);
}

