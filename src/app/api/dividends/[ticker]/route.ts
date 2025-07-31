import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const limit = searchParams.get("limit") || "12"; // 기본 12개월
    const order = searchParams.get("order") || "desc"; // desc, asc

    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: "Polygon API key not configured" },
        { status: 500 },
      );
    }

    // Polygon API로 배당 데이터 조회
    const response = await fetch(
      `https://api.polygon.io/v3/reference/dividends?ticker=${ticker}&limit=${limit}&sort=ex_dividend_date&order=${order}&apikey=${POLYGON_API_KEY}`,
      {
        next: { revalidate: 3600 }, // 1시간 캐시
      },
    );

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "No dividend data available" },
        { status: 404 },
      );
    }

    // 배당 데이터 변환
    const dividends = data.results.map((div: any) => ({
      cash_amount: div.cash_amount,
      currency: div.currency || "USD",
      dividend_type: div.dividend_type || "regular",
      ex_dividend_date: div.ex_dividend_date,
      frequency: div.frequency,
      pay_date: div.pay_date,
      record_date: div.record_date,
      declaration_date: div.declaration_date,
    }));

    // 배당 통계 계산
    const annualDividend = dividends
      .slice(0, 12)
      .reduce((sum: number, div: any) => sum + (div.cash_amount || 0), 0);

    const monthlyDividend = annualDividend / 12;
    const latestDividend = dividends[0];

    return NextResponse.json({
      success: true,
      ticker: ticker.toUpperCase(),
      summary: {
        annualDividend,
        monthlyDividend,
        frequency: latestDividend?.frequency || "monthly",
        latestDividend: latestDividend?.cash_amount || 0,
        latestExDate: latestDividend?.ex_dividend_date,
        latestPayDate: latestDividend?.pay_date,
      },
      data: dividends,
      count: dividends.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dividend data error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dividend data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

