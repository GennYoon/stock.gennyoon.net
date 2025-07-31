import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestUsdKrwRate, getExchangeRateSummary } from '@/shared/utils/exchange-rate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'current'; // current, summary

    if (type === 'summary') {
      // 환율 요약 정보
      const summary = await getExchangeRateSummary();
      return NextResponse.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    }

    // 현재 환율
    const rate = await fetchLatestUsdKrwRate();
    
    return NextResponse.json({
      success: true,
      data: {
        fromCurrency: 'USD',
        toCurrency: 'KRW',
        rate: rate,
        timestamp: new Date().toISOString(),
        source: 'exchangerate-api.com'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Exchange rate API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch exchange rate',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}