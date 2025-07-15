// 샘플 핸들러 예시
import { ToolResponse, createErrorResponse, createSuccessResponse } from '../lib/utils';

export interface SampleParams {
  message?: string;
}

export async function handleSample(params: SampleParams): Promise<ToolResponse> {
  try {
    const { message = 'Hello, world!' } = params;
    return createSuccessResponse(message, '샘플 핸들러');
  } catch (error) {
    return createErrorResponse(`Sample handler failed: ${error instanceof Error ? error.message : String(error)}`);
  }
} 