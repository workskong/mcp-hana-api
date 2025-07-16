#!/usr/bin/env node
import { HanaMonitoringServer } from './hanaMonitoringServer';

try {
  const server = new HanaMonitoringServer();
  server.run().catch((error) => {
    process.stderr.write(`[ERROR] 서버 실행 실패: ${error}\n`);
    process.stderr.write(`[ERROR] 상세 오류: ${error.stack}\n`);
    process.exit(1);
  });
} catch (error) {
  process.stderr.write(`[ERROR] 서버 생성 실패: ${error}\n`);
  process.stderr.write(`[ERROR] 상세 오류: ${error instanceof Error ? error.stack : error}\n`);
  process.exit(1);
}

