import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchLatestUsdKrwRate, 
  getExchangeRateSummary, 
  forceUpdateExchangeRate 
} from '@/shared/utils/exchange-rate';

/**
 * GET /api/exchange-rate
 * 현재 USD/KRW 환율 정보 가져오기
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get('summary') === 'true';
    
    if (summary) {
      const summaryData = await getExchangeRateSummary();
      return NextResponse.json({
        success: true,
        data: summaryData,
      });
    } else {
      const rate = await fetchLatestUsdKrwRate();
      return NextResponse.json({
        success: true,
        data: {
          rate,
          fromCurrency: 'USD',
          toCurrency: 'KRW',
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('환율 API 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '환율 정보를 가져올 수 없습니다',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exchange-rate
 * 환율 강제 업데이트 (관리자 전용)
 */
export async function POST(request: NextRequest) {
  try {
    // API 키 검증
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized - Admin API key required' 
        },
        { status: 401 }
      );
    }

    const rate = await forceUpdateExchangeRate();
    return NextResponse.json({
      success: true,
      data: {
        rate,
        message: '환율이 성공적으로 업데이트되었습니다',
        fromCurrency: 'USD',
        toCurrency: 'KRW',
        updated: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('환율 업데이트 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '환율 업데이트에 실패했습니다',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}