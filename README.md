# mcp-hana-monitoring

> **SAP HANA 데이터베이스 모니터링을 위한 Model Context Protocol(MCP) 서버**

이 프로젝트는 SAP HANA의 주요 리소스(시스템, 메모리, 디스크, CPU, 세션, 테이블, 서비스 등)를 실시간으로 조회하고, 커스텀 쿼리 및 성능 분석을 지원하는 MCP 서버입니다. 모든 기능은 MCP Inspector 또는 API를 통해 사용할 수 있습니다.

## 🚀 빠른 시작

### 설치

```bash
git clone 
cd mcp-hana-monitoring
npm install
```

### 환경 설정

`env.example` 파일을 `.env`로 복사하고 HANA 접속 정보를 입력하세요:

```env
HANA_SERVER_NODE=localhost:30215
HANA_USERNAME=XXXX
HANA_PASSWORD=XXXX
LOG_LEVEL=info
MAX_HISTORY_SIZE=50
MAX_RESULT_SIZE=1000
```

### 실행

```bash
# 프로덕션 실행
npm run build
npm start

# 개발 모드 (Inspector 포함)
npm run dev
```

## 🔍 MCP Inspector 연동

MCP Inspector를 통해 브라우저에서 직접 모니터링 기능을 사용할 수 있습니다:

```bash
npx mcp-inspector
```

브라우저에서 [http://127.0.0.1:6274](http://127.0.0.1:6274)로 접속하여 MCP 서버(127.0.0.1:6277)에 연결하세요.

## 🏗️ 아키텍처

- **핸들러 구조**: 각 리소스별로 독립적인 핸들러 함수가 존재하며, MCP 요청에 따라 실행됩니다
- **서버 클래스**: `HanaMonitoringServer`가 모든 MCP 요청을 관리하며, 핸들러와 리소스/도구 목록을 자동 등록합니다
- **유틸리티**: HANA 연결, 쿼리 실행, 결과 포맷, 에러 처리 등은 `lib/utils.ts`에서 관리합니다

## 📊 지원 기능

| 도구 | 설명 | 주요 파라미터 |
|------|------|---------------|
| **SystemOverview** | 시스템 전체 개요 | `detailed: boolean` |
| **MemoryUsage** | 메모리 사용률 | `detailed: boolean`, `host: string` |
| **DiskUsage** | 디스크 사용률 | `host: string`, `detailed: boolean` |
| **CpuUsage** | CPU 사용률 | `host: string`, `timeRange: number` |
| **ActiveSessions** | 활성 세션 | `detailed: boolean`, `userId: string`, `applicationName: string` |
| **TableStats** | 테이블 통계 | `schemaName: string`, `tableName: string`, `topN: number` |
| **ServiceStats** | 서비스 상태/리소스 | `serviceName: string`, `host: string` |
| **CustomQuery** | 커스텀 SELECT 쿼리 | `query: string`, `description: string` |
| **LoadHistory** | 부하 이력 | `beginTime: string`, `endTime: string`, `dataSource: string` |
| **ThreadSamplesAggregation** | 스레드 샘플 집계 | `beginTime: string`, `endTime: string`, `aggregateBy: string` |

### 사용 예시

```json
{
  "name": "ActiveSessions",
  "arguments": {
    "detailed": true,
    "userId": "SYSTEM",
    "applicationName": "HDBStudio"
  }
}
```

## 📚 리소스 및 템플릿

### 시스템 정보
- `hana://config` - HANA 연결 설정 정보
- `hana://status` - 연결 상태
- `hana://tools-info` - 사용 가능한 도구 정보

### 쿼리 템플릿
- `hana://templates/system-queries` - 시스템 쿼리 템플릿
- `hana://templates/performance-queries` - 성능 분석 쿼리
- `hana://templates/tool-examples` - 각 도구별 예제

### 실행 결과
- `hana://results/last-query` - 마지막 쿼리 결과
- `hana://results/query-history` - 쿼리 실행 히스토리

## 🔧 로깅 및 에러 처리

- 환경변수 `LOG_LEVEL`로 로그 레벨 제어 (debug, info, warn, error)
- 모든 쿼리 실행 및 MCP 요청은 structured logging으로 기록
- 에러 발생 시 상세 메시지와 스택 트레이스 제공

## 🧪 테스트

### 전체 통합 테스트
```bash
npx ts-node ...
```

### 개별 핸들러 테스트
```bash
npx ts-node test/...
npx ts-node test/...
# test 폴더 내 각 핸들러별 테스트 파일 실행
```

## ⚙️ 시스템 요구사항

### HANA 권한
- 시스템 뷰(M_*) SELECT 권한 필요

### 환경
- SAP HANA 2.00.070+ 이상 권장
- Node.js 환경

## 📄 라이선스

MIT"# mcp-hana-api" 
