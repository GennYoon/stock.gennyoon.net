import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const timespan = searchParams.get("timespan") || "day"; // day, week, month
    const multiplier = searchParams.get("multiplier") || "1";
    const days = searchParams.get("days"); // 최근 N일
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to"); // YYYY-MM-DD

    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: "Polygon API key not configured" },
        { status: 500 },
      );
    }

    // 기본값 설정
    const defaultTo = new Date().toISOString().split("T")[0];
    let defaultFrom;
    
    if (days) {
      // days 파라미터가 있으면 해당 일수만큼 과거로
      const daysNum = parseInt(days);
      defaultFrom = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    } else {
      // 기본값: 최근 30일
      defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    }

    const fromDate = from || defaultFrom;
    const toDate = to || defaultTo;

    // Polygon API로 히스토리 데이터 조회
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=desc&limit=1000&apikey=${POLYGON_API_KEY}`,
      {
        next: { revalidate: 300 }, // 5분 캐시
      },
    );

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "No historical data available" },
        { status: 404 },
      );
    }

    // 데이터 변환 및 등락율 계산
    const history = data.results.map((item: any, index: number) => {
      const prevItem = data.results[index + 1]; // 이전 거래일 (역순 정렬이므로)
      const changePercent = prevItem 
        ? ((item.c - prevItem.c) / prevItem.c) * 100 
        : 0;

      return {
        date: new Date(item.t).toISOString().split("T")[0],
        timestamp: item.t,
        open: item.o,
        high: item.h,
        low: item.l,
        close: item.c,
        volume: item.v,
        vwap: item.vw,
        transactions: item.n,
        change_percent: parseFloat(changePercent.toFixed(2)),
      };
    });

    return NextResponse.json({
      success: true,
      ticker: ticker.toUpperCase(),
      timespan,
      multiplier: parseInt(multiplier),
      from: fromDate,
      to: toDate,
      count: history.length,
      data: history,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Stock history error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch historical data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

