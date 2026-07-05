import { Request, Response } from 'express';

type Client = {
  id: string;
  res: Response;
  subscriptions: Set<string>;
};

const clients = new Map<string, Client>();
let pingInterval: NodeJS.Timeout | null = null;

function ensurePingInterval(): void {
  if (pingInterval) return;

  pingInterval = setInterval(() => {
    for (const client of clients.values()) {
      try {
        client.res.write(': ping\n\n');
      } catch {
        // no-op
      }
    }
  }, 20000);
}

function maybeStopPingInterval(): void {
  if (clients.size > 0 || !pingInterval) return;
  clearInterval(pingInterval);
  pingInterval = null;
}

function generateClientId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function sseHandler(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(': connected\n\n');

  const subscribeParam = req.query?.subscribe;
  const subscriptions = new Set<string>();

  if (typeof subscribeParam === 'string') {
    for (const topic of subscribeParam.split(',').map((s) => s.trim()).filter(Boolean)) {
      subscriptions.add(topic);
    }
  }

  const id = generateClientId();
  clients.set(id, { id, res, subscriptions });
  ensurePingInterval();

  const cleanup = () => {
    clients.delete(id);
    maybeStopPingInterval();
  };

  res.on('close', cleanup);
  res.on('finish', cleanup);
}

export function sendSseEvent(event: string, data: unknown, topic?: string): void {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);

  for (const client of clients.values()) {
    try {
      if (topic && client.subscriptions.size > 0 && !client.subscriptions.has(topic)) {
        continue;
      }

      client.res.write(`event: ${event}\n`);
      for (const line of payload.split('\n')) {
        client.res.write(`data: ${line}\n`);
      }
      client.res.write('\n');
    } catch {
      // no-op
    }
  }
}

export function getConnectedCount(): number {
  return clients.size;
}
