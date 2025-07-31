import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get("exchange") || "ALL";
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "dividend_yield";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 기본 쿼리 구성
    let query = supabase.from("dividend_stocks").select(
      `
        id,
        ticker,
        name,
        exchange,
        sector,
        currency,
        dividend_info:dividend_info(
          dividend_yield,
          annual_dividend,
          quarterly_dividend,
          monthly_dividend,
          dividend_frequency,
          ex_dividend_date,
          payment_date,
          payout_ratio,
          dividend_growth_rate
        ),
        stock_prices:stock_prices(
          current_price,
          price_date
        )
      `,
      { count: "exact" },
    );

    // 거래소 필터
    if (exchange !== "ALL") {
      query = query.eq("exchange", exchange);
    }

    // 검색 필터
    if (search) {
      query = query.or(`ticker.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase 쿼리 오류:", error);
      // 데이터베이스가 비어있거나 연결 문제가 있을 경우 빈 배열 반환
      return NextResponse.json({
        data: [],
        pagination: {
          offset,
          limit,
          total: 0,
          hasMore: false,
        },
        timestamp: new Date().toISOString(),
        note: "No data available - Database may be empty or not configured",
      });
    }

    // 데이터 가공
    const processedData =
      data?.map((stock) => {
        // 주가 데이터를 날짜 순으로 정렬하여 최신 데이터 가져오기
        const sortedPrices = stock.stock_prices?.sort(
          (a, b) =>
            new Date(b.price_date).getTime() - new Date(a.price_date).getTime(),
        );
        const latestPrice = sortedPrices?.[0];
        const dividendInfo = stock.dividend_info?.[0];

        return {
          id: stock.id,
          ticker: stock.ticker,
          name: stock.name,
          exchange: stock.exchange,
          sector: stock.sector,
          currency: stock.currency,
          currentPrice: latestPrice?.current_price || 0,
          priceDate: latestPrice?.price_date,
          dividendYield: dividendInfo?.dividend_yield || 0,
          annualDividend: dividendInfo?.annual_dividend || 0,
          quarterlyDividend: dividendInfo?.quarterly_dividend || 0,
          monthlyDividend: dividendInfo?.monthly_dividend || 0,
          dividendFrequency: dividendInfo?.dividend_frequency || "quarterly",
          exDividendDate: dividendInfo?.ex_dividend_date,
          paymentDate: dividendInfo?.payment_date,
          payoutRatio: dividendInfo?.payout_ratio,
          dividendGrowthRate: dividendInfo?.dividend_growth_rate,
        };
      }) || [];

    // 정렬 적용
    const sortedData = processedData.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      // 숫자형 데이터 처리
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      }

      // 문자열 데이터 처리
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === "desc" ? -comparison : comparison;
      }

      return 0;
    });

    return NextResponse.json({
      data: sortedData,
      pagination: {
        offset,
        limit,
        total: count,
        hasMore: offset + limit < (count || 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("주식 데이터 조회 오류:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}

