import { NextRequest, NextResponse } from 'next/server';
import { StockDataCollector } from '@/shared/utils/stock-data-collector';

// 관리자용 데이터 수집 API
export async function POST(request: NextRequest) {
  try {
    // 간단한 인증 (실제 환경에서는 더 강력한 인증 필요)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tickers, exchange = 'US' } = await request.json();
    
    if (!tickers || !Array.isArray(tickers)) {
      return NextResponse.json(
        { error: 'tickers 배열이 필요합니다.' }, 
        { status: 400 }
      );
    }

    const collector = new StockDataCollector();
    
    console.log(`🚀 데이터 수집 시작: ${tickers.join(', ')}`);
    
    // 주식 데이터 수집
    await collector.collectMultipleStocks(tickers, exchange);
    
    // 환율 정보 수집
    await collector.collectExchangeRates();

    return NextResponse.json({
      success: true,
      message: `${tickers.length}개 주식 데이터 수집 완료`,
      tickers,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('데이터 수집 API 오류:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      }, 
      { status: 500 }
    );
  }
}

// 수집된 데이터 현황 조회
export async function GET() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 기본 통계 조회
    const [
      { count: stockCount },
      { count: usStockCount },
      { count: krStockCount },
      { data: latestUpdate }
    ] = await Promise.all([
      supabase.from('dividend_stocks').select('*', { count: 'exact', head: true }),
      supabase.from('dividend_stocks').select('*', { count: 'exact', head: true }).eq('exchange', 'US'),
      supabase.from('dividend_stocks').select('*', { count: 'exact', head: true }).eq('exchange', 'KR'),
      supabase.from('dividend_stocks').select('updated_at').order('updated_at', { ascending: false }).limit(1)
    ]);

    return NextResponse.json({
      stats: {
        totalStocks: stockCount || 0,
        usStocks: usStockCount || 0,
        krStocks: krStockCount || 0,
        lastUpdate: latestUpdate?.[0]?.updated_at || null,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('데이터 현황 조회 오류:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}