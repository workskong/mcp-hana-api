#!/usr/bin/env node
import { HanaMonitoringServer } from './hanaMonitoringServer';

try {
  const server = new HanaMonitoringServer();
  server.run().catch((error) => {
    process.stderr.write(`[ERROR] Server run failed: ${error}\n`);
    process.stderr.write(`[ERROR] Details: ${error.stack}\n`);
    process.exit(1);
  });
} catch (error) {
  process.stderr.write(`[ERROR] Server creation failed: ${error}\n`);
  process.stderr.write(`[ERROR] Details: ${error instanceof Error ? error.stack : error}\n`);
  process.exit(1);
}

