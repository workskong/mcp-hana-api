"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const handleSystemOverview_1 = require("./handlers/handleSystemOverview");
const handleMemoryUsage_1 = require("./handlers/handleMemoryUsage");
const handleDiskUsage_1 = require("./handlers/handleDiskUsage");
const handleCpuUsage_1 = require("./handlers/handleCpuUsage");
const handleActiveSessions_1 = require("./handlers/handleActiveSessions");
const handleLongRunningQueries_1 = require("./handlers/handleLongRunningQueries");
const handleTableStats_1 = require("./handlers/handleTableStats");
const handleServiceStats_1 = require("./handlers/handleServiceStats");
const handleCustomQuery_1 = require("./handlers/handleCustomQuery");
const utils_1 = require("./lib/utils");
describe('HANA Monitoring Server - Unit Tests', () => {
    beforeAll(() => {
        // Set up test environment
        process.env.HANA_SERVER_NODE = 'localhost:30013';
        process.env.HANA_USERNAME = 'testuser';
        process.env.HANA_PASSWORD = 'testpass';
    });
    afterAll(async () => {
        // Clean up connections
        (0, utils_1.closeConnection)();
        // Add a small delay to ensure all async operations complete
        await new Promise(resolve => setTimeout(resolve, 100));
    });
    describe('Configuration', () => {
        it('should retrieve configuration from environment variables', () => {
            const config = (0, index_1.getConfig)();
            expect(config.serverNode).toBe('localhost:30013');
            expect(config.uid).toBe('testuser');
            expect(config.pwd).toBe('testpass');
        });
        it('should throw error when environment variables are missing', () => {
            delete process.env.HANA_SERVER_NODE;
            expect(() => (0, index_1.getConfig)()).toThrow('Missing required environment variables');
            // Restore environment variable
            process.env.HANA_SERVER_NODE = 'localhost:30013';
        });
    });
    describe('Server Initialization', () => {
        it('should create server instance successfully', () => {
            expect(() => new index_1.HanaMonitoringServer()).not.toThrow();
        });
    });
    describe('Handler Functions', () => {
        // These tests now use mocked HANA client, so they should run quickly
        it('should successfully retrieve system overview', async () => {
            const result = await (0, handleSystemOverview_1.handleSystemOverview)({ detailed: false });
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
        }, 5000);
    });
    describe('handleMemoryUsage', () => {
        it('should successfully retrieve memory usage', async () => {
            const result = await (0, handleMemoryUsage_1.handleMemoryUsage)({ detailed: false });
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
        }, 5000);
    });
    describe('handleDiskUsage', () => {
        it('should successfully retrieve disk usage', async () => {
            const result = await (0, handleDiskUsage_1.handleDiskUsage)({ detailed: false });
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
        }, 5000);
    });
    describe('handleCpuUsage', () => {
        it('should successfully retrieve CPU usage', async () => {
            const result = await (0, handleCpuUsage_1.handleCpuUsage)({ timeRange: 60 });
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
        }, 5000);
    });
    describe('handleActiveSessions', () => {
        it('should successfully retrieve active sessions', async () => {
            const result = await (0, handleActiveSessions_1.handleActiveSessions)({ detailed: false });
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
        }, 5000);
    });
    describe('handleLongRunningQueries', () => {
        it('should successfully retrieve long running queries', async () => {
            const result = await (0, handleLongRunningQueries_1.handleLongRunningQueries)({ minDurationSeconds: 30, limit: 10 });
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
        }, 5000);
    });
    describe('handleTableStats', () => {
        it('should successfully retrieve table statistics', async () => {
            const result = await (0, handleTableStats_1.handleTableStats)({ topN: 20 });
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
        }, 5000);
    });
    describe('handleServiceStats', () => {
        it('should successfully retrieve service statistics', async () => {
            const result = await (0, handleServiceStats_1.handleServiceStats)({});
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
        }, 5000);
    });
    describe('handleCustomQuery', () => {
        it('should successfully execute a custom SELECT query', async () => {
            const result = await (0, handleCustomQuery_1.handleCustomQuery)({
                query: 'SELECT TOP 5 * FROM M_DATABASES',
                description: 'Test query for databases'
            });
            expect(result.isError).toBe(false);
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.content[0].type).toBe('text');
            expect(result.content[0].text).toContain('커스텀 쿼리');
        }, 5000);
        it('should reject non-SELECT queries', async () => {
            const result = await (0, handleCustomQuery_1.handleCustomQuery)({
                query: 'DELETE FROM some_table WHERE id = 1'
            });
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('보안상 이유로');
        }, 5000);
    });
});
