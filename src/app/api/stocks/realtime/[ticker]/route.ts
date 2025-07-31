import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params;
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: 'Polygon API key not configured' },
        { status: 500 }
      );
    }

    // Polygon API로 실시간 주가 데이터 조회
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apikey=${POLYGON_API_KEY}`,
      {
        next: { revalidate: 60 } // 1분 캐시
      }
    );

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: 'No price data available' },
        { status: 404 }
      );
    }

    const result = data.results[0];
    
    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      timestamp: new Date(result.t).toISOString(),
      price: {
        current: result.c,    // 종가
        open: result.o,       // 시가
        high: result.h,       // 고가
        low: result.l,        // 저가
        volume: result.v,     // 거래량
        vwap: result.vw,      // 거래량 가중 평균가
      },
      change: {
        amount: result.c - result.o,
        percentage: ((result.c - result.o) / result.o * 100).toFixed(2)
      },
      marketStatus: 'closed', // 전일 데이터이므로 closed
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Realtime stock data error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}