#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hanaMonitoringServer_1 = require("./hanaMonitoringServer");
try {
    const server = new hanaMonitoringServer_1.HanaMonitoringServer();
    server.run().catch((error) => {
        process.stderr.write(`[ERROR] Server run failed: ${error}\n`);
        process.stderr.write(`[ERROR] Details: ${error.stack}\n`);
        process.exit(1);
    });
}
catch (error) {
    process.stderr.write(`[ERROR] Server creation failed: ${error}\n`);
    process.stderr.write(`[ERROR] Details: ${error instanceof Error ? error.stack : error}\n`);
    process.exit(1);
}
