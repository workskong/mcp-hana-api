export function getPort(): number {
  const envPort = process.env.PORT;
  if (!envPort) return 6968;

  const parsed = Number(envPort);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT environment variable: ${envPort}`);
  }

  return Math.floor(parsed);
}

export const DEFAULT_PORT = getPort();
