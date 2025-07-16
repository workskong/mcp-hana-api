# mcp-hana-monitoring

> **SAP HANA 데이터베이스 모니터링을 위한 Model Context Protocol(MCP) 서버**

이 프로젝트는 SAP HANA의 주요 리소스(시스템, 메모리, 디스크, CPU, 세션, 테이블, 서비스 등)를 실시간으로 조회하고, 커스텀 쿼리 및 성능 분석을 지원하는 MCP 서버입니다. 모든 기능은 MCP Inspector 또는 API를 통해 사용할 수 있습니다.

## 🚀 빠른 시작

### 설치

```bash
git clone <your-repo-url>
cd mcp-hana-monitoring
npm install
```

### 환경 설정

`.env.example` 파일을 `.env`로 복사하고 HANA 접속 정보를 입력하세요:

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

## 🏗️ 아키텍처 및 서버 구조

- **핸들러 구조**: 각 도구별로 독립적인 핸들러 함수가 존재하며, MCP 요청에 따라 동적으로 실행됩니다.
- **서버 클래스**: `HanaMonitoringServer`가 MCP 요청(도구 목록, 리소스 목록, 쿼리 실행 등)을 일괄 관리합니다.
- **리소스/도구 자동 등록**: 도구명, 설명, 입력스키마, 핸들러가 자동 매핑되어 관리됩니다.
- **유틸리티**: HANA 연결, 쿼리 실행, 결과 포맷, 에러 처리 등은 `lib/utils.ts`에서 일괄 관리합니다.

## 📊 지원 도구 및 주요 파라미터

| 도구명 | 설명 | 주요 파라미터 |
|--------|------|---------------|
| SystemOverview | HANA 시스템 전체 개요 | - |
| Resources_CPUAndMemory | CPU/메모리 리소스 모니터링 | beginTime, endTime, aggregationType, timeAggregateBy |
| SQLCache | SQL 캐시 정보 조회 | beginTime, endTime, statementHash, appName, appSource, timeAggregateBy, orderBy |
| ExpensiveStatements | 비용이 높은 SQL 문장 조회 | beginTime, endTime, statementHash, workloadClass, appUser, appSource, bindValues, timeAggregateBy, orderBy |
| LoadHistory | Load History 성능 데이터 | beginTime, endTime, aggregationType, timeAggregateBy |
| Memory_TopConsumers_TimeSlices | 메모리 Top Consumers 집계 | beginTime, endTime, objectLevel, timeAggregateBy |
| SQLCacheTopLists | SQL Cache Top 리스트 | beginTime, endTime, tableName |
| StatementHash_DataCollector | Statement Hash 상세 데이터 | beginTime, endTime, statementHash, maxResultLines, timeUnit |
| CustomQuery | 사용자 정의 SELECT 쿼리 | query, description |
| Configuration_MiniChecks | 미니 설정 점검 | - |
| ThreadSamples_AggregationPerTimeSlice | Thread Samples 집계 | beginTime, endTime, statementHash, statementId, appUser, appSource, passportAction, aggregateBy |
| ThreadSamples_FilterAndAggregation | Thread Samples 필터/집계 | beginTime, endTime, statementHash, rootStatementHash, statementId, appUser, appSource, passportAction, orderBy |

### 각 도구별 주요 기능 요약

- **SystemOverview**: 시스템 전체 상태, 데이터베이스/오버뷰 정보 조회
- **Resources_CPUAndMemory**: HANA 및 OS의 CPU/메모리/스왑/사용률 집계
- **SQLCache**: SQL 캐시(Plan Cache) 내 쿼리별 통계, 집계, 정렬
- **ExpensiveStatements**: 비용이 높은 SQL 실행 이력, 다양한 기준별 집계/정렬
- **LoadHistory**: HANA의 Load History(부하 이력) 집계
- **Memory_TopConsumers_TimeSlices**: 메모리 사용량이 높은 테이블/파티션 집계
- **SQLCacheTopLists**: SQL 캐시 테이블별 Top N 리스트
- **StatementHash_DataCollector**: 특정 Statement Hash의 상세 실행 이력 수집
- **CustomQuery**: 사용자가 직접 입력한 SELECT 쿼리 실행(위험 쿼리 차단)
- **Configuration_MiniChecks**: HANA 미니 설정 점검(베스트 프랙티스)
- **ThreadSamples_AggregationPerTimeSlice**: Thread 샘플을 시간 단위로 집계
- **ThreadSamples_FilterAndAggregation**: Thread 샘플을 다양한 조건으로 필터/집계

---

## 📚 리소스 및 템플릿

- `hana://config` - HANA 연결 설정 정보
- `hana://status` - 연결 상태
- `hana://tools-info` - 사용 가능한 도구 정보(카테고리별)
- `hana://templates/system-queries` - 시스템 쿼리 템플릿
- `hana://templates/performance-queries` - 성능 분석 쿼리 템플릿
- `hana://templates/tool-examples` - 각 도구별 예제
- `hana://results/last-query` - 마지막 쿼리 결과
- `hana://results/query-history` - 쿼리 실행 히스토리

---

### 사용 예시

```json
{
  "name": "SQLCache",
  "arguments": {
    "beginTime": "C-H1",
    "endTime": "C",
    "orderBy": "TIME"
  }
}
```

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
# test 폴더 내 각 핸들러별 테스트 파일 실행
```

## ⚙️ 시스템 요구사항

### HANA 권한
- 시스템 뷰(M_*) SELECT 권한 필요

### 환경
- SAP HANA 2.00.070+ 이상 권장
- Node.js 환경

## 📄 라이선스

MIT 
