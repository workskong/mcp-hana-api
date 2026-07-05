import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { DEFAULT_PORT } from './config';
import { getConnectedCount, sendSseEvent, sseHandler } from './sse';
import { toolDefinitions, type ToolDefinition } from './toolDefinitions';
import { createConnection, getPackageInfo, type HanaConfig } from './utils';

dotenv.config();

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function buildToolsResponse(tools: ToolDefinition[]) {
  return tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema
  }));
}

function headerValue(req: Request, key: string): string | undefined {
  const value = req.header(key);
  return value && value.trim() ? value.trim() : undefined;
}

function resolveHanaConfig(req: Request): HanaConfig {
  const host = headerValue(req, 'X-HANA-HOST') || process.env.HANA_HOST || 'localhost';
  const port = headerValue(req, 'X-HANA-PORT') || process.env.HANA_PORT || '30215';
  const uid = headerValue(req, 'X-HANA-USER') || process.env.HANA_UID || process.env.HANA_USER || '';
  const pwd = headerValue(req, 'X-HANA-PASSWORD') || process.env.HANA_PWD || process.env.HANA_PASSWORD || '';

  if (!uid || !pwd) {
    throw new Error('Missing HANA credentials. Provide X-HANA-USER/X-HANA-PASSWORD headers or set HANA_USER/HANA_PASSWORD environment variables.');
  }

  return {
    serverNode: `${host}:${port}`,
    uid,
    pwd
  };
}

async function executeToolForRequest(req: Request, toolName: string, args: any): Promise<any> {
  const tool = toolDefinitions.find((definition) => definition.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  if (Array.isArray(tool.inputSchema.required)) {
    for (const requiredParam of tool.inputSchema.required) {
      if (args[requiredParam] === undefined) {
        throw new Error(`Missing required parameter: ${requiredParam}`);
      }
    }
  }

  const hanaConfig = resolveHanaConfig(req);
  await createConnection(hanaConfig);
  return tool.handler(args);
}

export async function startRemoteServer(port = DEFAULT_PORT): Promise<void> {
  const app = express();
  app.use(bodyParser.json());

  app.get('/tools', (_req: Request, res: Response) => {
    res.json({ tools: buildToolsResponse(toolDefinitions) });
  });

  app.post('/call', async (req: Request, res: Response) => {
    try {
      const toolName = req.body?.name;
      const args = req.body?.arguments || {};

      if (!toolName) {
        return res.status(400).json({ error: 'Missing tool name' });
      }

      const tool = toolDefinitions.find((definition) => definition.name === toolName);
      if (!tool) {
        return res.status(404).json({ error: `Unknown tool: ${toolName}` });
      }

      if (Array.isArray(tool.inputSchema.required)) {
        for (const requiredParam of tool.inputSchema.required) {
          if (args[requiredParam] === undefined) {
            return res.status(400).json({ error: `Missing required parameter: ${requiredParam}` });
          }
        }
      }

      const result = await executeToolForRequest(req, toolName, args);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  app.get('/events', (req: Request, res: Response) => sseHandler(req, res));
  app.get('/sse', (req: Request, res: Response) => sseHandler(req, res));

  app.get('/', (_req: Request, res: Response) => {
    const packageInfo = getPackageInfo();
    res.json({
      ok: true,
      name: packageInfo.name,
      version: packageInfo.version
    });
  });

  app.post('/', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const method = body.method;
      const id = body.id;
      const params = body.params || {};

      if (method === 'initialize') {
        const packageInfo = getPackageInfo();
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              prompts: {},
              resources: {},
              logging: {}
            },
            serverInfo: {
              name: packageInfo.name,
              version: packageInfo.version
            }
          }
        });
      }

      if (method === 'tools/list') {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: buildToolsResponse(toolDefinitions)
          }
        });
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};

        const tool = toolDefinitions.find((definition) => definition.name === toolName);
        if (!tool) {
          return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Unknown tool: ${toolName}` }
          });
        }

        if (Array.isArray(tool.inputSchema.required)) {
          for (const requiredParam of tool.inputSchema.required) {
            if (args[requiredParam] === undefined) {
              return res.json({
                jsonrpc: '2.0',
                id,
                error: { code: -32602, message: `Missing required parameter: ${requiredParam}` }
              });
            }
          }
        }

        try {
          const result = await executeToolForRequest(req, toolName, args);
          return res.json({
            jsonrpc: '2.0',
            id,
            result
          });
        } catch (error) {
          return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message: toErrorMessage(error) }
          });
        }
      }

      return res.json({
        jsonrpc: '2.0',
        id,
        result: { ok: true }
      });
    } catch (error) {
      return res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id,
        error: { code: -32603, message: toErrorMessage(error) }
      });
    }
  });

  app.get('/authorize', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send('<!doctype html><html><head><title>MCP Authorize</title></head><body>Authorization complete. You may close this window.</body></html>');
  });

  app.post('/emit', (req: Request, res: Response) => {
    const event = req.body?.event;
    const data = req.body?.data;
    const topic = req.body?.topic;

    if (!event) {
      return res.status(400).json({ error: 'Missing event name' });
    }

    sendSseEvent(event, data ?? null, topic);
    return res.json({ ok: true, connected: getConnectedCount() });
  });

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      process.stdout.write(`MCP remote server listening on http://localhost:${port}\n`);
      resolve();
    });

    server.on('error', (error: Error) => reject(error));

    const shutdown = () => {
      process.stdout.write('Shutting down remote server...\n');
      server.close(() => {
        process.stdout.write('Remote server stopped\n');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}
