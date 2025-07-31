import { NextResponse } from 'next/server';
import { stockDataService } from '@/shared/utils/stock-data-service';

/**
 * GET /api/stocks/health
 * 주식 데이터 서비스 상태 확인
 */
export async function GET() {
  try {
    const health = await stockDataService.getServiceHealth();
    
    return NextResponse.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('Health check API 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서비스 상태 확인 중 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stocks/health
 * 캐시 클리어
 */
export async function DELETE() {
  try {
    const clearedCount = await stockDataService.clearCache();
    
    return NextResponse.json({
      success: true,
      data: {
        message: `${clearedCount}개의 캐시 항목이 삭제되었습니다`,
        clearedCount,
      },
    });
  } catch (error) {
    console.error('Cache clear API 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '캐시 클리어 중 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}