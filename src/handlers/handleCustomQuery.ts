import { executeQuery, formatQueryResult, createErrorResponse, ToolResponse } from '../lib/utils';

export interface handleCustomQuery {
  query: string;
  description?: string;
}

/**
 * SQL 인젝션 방지를 위한 키워드 검사
 */
function validateQuery(query: string): { isValid: boolean; error?: string } {
  const dangerousKeywords = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'CREATE', 'ALTER', 'TRUNCATE',
    'EXEC', 'EXECUTE', 'EXECUTE IMMEDIATE', 'CALL', 'GRANT', 'REVOKE',
    'MERGE', 'UPSERT', 'REPLACE', 'ANALYZE', 'OPTIMIZE'
  ];
  
  const upperQuery = query.toUpperCase().trim();
  
  // SELECT로 시작하지 않으면 거부
  if (!upperQuery.startsWith('SELECT')) {
    return { isValid: false, error: 'SELECT 문만 실행 가능합니다.' };
  }
  
  // 위험한 키워드 검사
  for (const keyword of dangerousKeywords) {
    if (upperQuery.includes(keyword)) {
      return { isValid: false, error: `보안상 이유로 ${keyword} 문은 실행할 수 없습니다. SELECT 문만 허용됩니다.` };
    }
  }
  
  // 세미콜론이 여러 개 있는지 검사 (다중 쿼리 방지)
  if ((upperQuery.match(/;/g) || []).length > 1) {
    return { isValid: false, error: '다중 쿼리 실행은 허용되지 않습니다.' };
  }
  
  return { isValid: true };
}

export async function handleCustomQuery(params: handleCustomQuery): Promise<ToolResponse> {
  try {
    // 쿼리 유효성 검사
    const validation = validateQuery(params.query);
    if (!validation.isValid) {
      return createErrorResponse(new Error(validation.error!), '쿼리 검증 실패');
    }

    const result = await executeQuery(params.query);
    const title = params.description ? `커스텀 쿼리: ${params.description}` : '🔍 커스텀 쿼리 결과';
    return formatQueryResult(result, title);
  } catch (error) {
    return createErrorResponse(error, '커스텀 쿼리 실행 실패');
  }
}
