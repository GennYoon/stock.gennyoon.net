import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  let ticker = "";
  try {
    const { ticker: tickerParam } = await params;
    ticker = tickerParam.toUpperCase();

    console.log(`Fetching stock info for: ${ticker}`);

    // dividend_stocks 테이블에서 기본 정보 조회
    const { data: stockData, error: stockError } = await supabase
      .from("dividend_stocks")
      .select("ticker, name, issuer, group_name, dividend_frequency")
      .eq("ticker", ticker)
      .eq("is_active", true)
      .single();

    if (stockError || !stockData) {
      console.log(`Stock not found in database: ${ticker}`, stockError);
      return NextResponse.json(
        { 
          success: false,
          error: "Stock not found", 
          ticker,
          message: `${ticker} 주식 정보를 찾을 수 없습니다.`
        },
        { status: 404 },
      );
    }

    console.log(`Found stock in database:`, stockData);

    // Polygon API로 현재가와 배당수익률 조회
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    let current_price: number | undefined;
    let dividend_yield: number | undefined;

    if (POLYGON_API_KEY) {
      try {
        // 현재가 조회 (최신 종가 - 더 정확함)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        
        const priceResponse = await fetch(
          `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dateStr}/${dateStr}?adjusted=true&apikey=${POLYGON_API_KEY}`,
          { next: { revalidate: 300 } }
        );

        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          if (priceData.results && priceData.results.length > 0) {
            current_price = parseFloat(priceData.results[0].c.toFixed(2));
          }
        }

        // 배당 정보 조회 (최근 12개월)
        const dividendResponse = await fetch(
          `https://api.polygon.io/v3/reference/dividends?ticker=${ticker}&limit=12&sort=ex_dividend_date&order=desc&apikey=${POLYGON_API_KEY}`,
          { next: { revalidate: 3600 } }
        );

        if (dividendResponse.ok) {
          const dividendData = await dividendResponse.json();
          if (dividendData.results && dividendData.results.length > 0) {
            const annualDividend = dividendData.results
              .slice(0, 12)
              .reduce((sum: number, div: any) => sum + (div.cash_amount || 0), 0);

            if (current_price && annualDividend > 0) {
              dividend_yield = parseFloat(((annualDividend / current_price) * 100).toFixed(2));
            }
          }
        }
      } catch (apiError) {
        console.warn(`Polygon API error for ${ticker}:`, apiError);
      }
    }

    const result = {
      ticker: stockData.ticker,
      name: stockData.name,
      issuer: stockData.issuer,
      group_name: stockData.group_name,
      dividend_frequency: stockData.dividend_frequency,
      current_price,
      dividend_yield,
      description: `${stockData.issuer} ${stockData.group_name} 그룹의 ETF로, ${stockData.dividend_frequency === '1W' ? '주간' : '월간'} 배당을 지급합니다.`,
      // 추가 정보들 (현재는 mock 데이터, 추후 실제 API 연동 필요)
      market_cap: current_price ? Math.round(current_price * 50000000) : undefined, // 대략적인 시가총액
      assets_under_management: current_price ? Math.round(current_price * 45000000) : undefined, // 대략적인 운용자산
      management_company: stockData.issuer === 'YieldMax' ? 'YieldMax ETF Advisors' : stockData.issuer === 'GraniteShares' ? 'GraniteShares LLC' : stockData.issuer,
      nav: current_price ? parseFloat((current_price * 0.998).toFixed(2)) : undefined, // NAV는 현재가의 약 99.8%
      listing_date: '2023-01-15', // mock 데이터
      shares_outstanding: 5000000, // mock 데이터
      data_date: new Date().toISOString().split('T')[0] // 오늘 날짜
    };

    console.log(`Returning stock data:`, result);

    return NextResponse.json({
      success: true,
      stock: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`주식 상세 정보 조회 오류 (${ticker}):`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        ticker
      },
      { status: 500 },
    );
  }
}

