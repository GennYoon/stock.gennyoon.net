import { NextRequest, NextResponse } from 'next/server';
import { stockDataService } from '@/shared/utils/stock-data-service';

/**
 * GET /api/stocks/search?q=apple
 * 주식 심볼 검색
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'q 파라미터가 필요합니다 (예: ?q=apple)',
        },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: '검색어는 최소 2글자 이상이어야 합니다',
        },
        { status: 400 }
      );
    }

    const result = await stockDataService.searchSymbols(query);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Stock search API 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '주식 검색 중 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}