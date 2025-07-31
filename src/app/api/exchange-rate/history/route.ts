import { NextRequest, NextResponse } from "next/server";
import { getExchangeRateHistory } from "@/shared/utils/exchange-rate";

/**
 * GET /api/exchange-rate/history
 * 환율 히스토리 가져오기
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const fromCurrency = searchParams.get("from") || "USD";
    const toCurrency = searchParams.get("to") || "KRW";

    // 일수 제한 (최대 365일)
    const limitedDays = Math.min(Math.max(days, 1), 365);

    const history = await getExchangeRateHistory(
      fromCurrency,
      toCurrency,
      limitedDays,
    );

    return NextResponse.json({
      success: true,
      data: {
        history,
        fromCurrency,
        toCurrency,
        days: limitedDays,
        count: history.length,
      },
    });
  } catch (error) {
    console.error("환율 히스토리 API 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "환율 히스토리를 가져올 수 없습니다",
      },
      { status: 500 },
    );
  }
}

