import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    const { ticker } = await params;
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: "Polygon API key not configured" },
        { status: 500 },
      );
    }

    // 실시간 현재가 조회 (이전 거래일 종가 사용)
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apikey=${POLYGON_API_KEY}`,
      {
        next: { revalidate: 30 }, // 30초 캐시
      },
    );

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "No current price data available" },
        { status: 404 },
      );
    }

    const result = data.results[0];

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      currentPrice: result.c, // close price
      open: result.o,
      high: result.h,
      low: result.l,
      volume: result.v,
      timestamp: new Date(result.t).toISOString(),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Current stock price error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch current price",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

