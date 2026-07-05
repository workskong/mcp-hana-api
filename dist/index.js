#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hanaMonitoringServer_1 = require("./hanaMonitoringServer");
const remoteServer_1 = require("./lib/remoteServer");
try {
    if (process.argv.includes('--remote')) {
        (0, remoteServer_1.startRemoteServer)().then(() => {
            process.stdout.write('Remote MCP server started successfully.\n');
        }).catch((error) => {
            process.stderr.write(`[ERROR] Remote server start failed: ${String(error)}\n`);
            process.exit(1);
        });
    }
    else {
        const server = new hanaMonitoringServer_1.HanaMonitoringServer();
        server.run().catch((error) => {
            process.stderr.write(`[ERROR] Server run failed: ${error}\n`);
            process.stderr.write(`[ERROR] Details: ${error.stack}\n`);
            process.exit(1);
        });
    }
}
catch (error) {
    process.stderr.write(`[ERROR] Server creation failed: ${error}\n`);
    process.stderr.write(`[ERROR] Details: ${error instanceof Error ? error.stack : error}\n`);
    process.exit(1);
}
