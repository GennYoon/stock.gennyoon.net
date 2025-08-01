import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface DividendStock {
  ticker: string;
  name: string;
  issuer: string;
  group_name: string;
  dividend_frequency: string;
  current_price?: number;
  three_months_ago_price?: number;
  six_months_ago_price?: number;
  dividend_yield?: number;
  quarterly_dividend_income?: number;
  six_month_dividend_income?: number;
  dividends_data?: any[];
  next_ex_date?: string;
  next_pay_date?: string;
}

export async function GET(request: NextRequest) {
  try {
    // 모든 활성 배당주 조회
    const { data: stocks, error } = await supabase
      .from("dividend_stocks")
      .select("ticker, name, issuer, group_name, dividend_frequency")
      .eq("is_active", true)
      .order("ticker");

    if (error) {
      throw error;
    }

    if (!stocks || stocks.length === 0) {
      return NextResponse.json({
        success: true,
        stocks: [],
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
    
    if (!POLYGON_API_KEY) {
      throw new Error("Polygon API key not configured");
    }

    // 각 주식에 대해 배당 정보와 현재가 조회
    const stocksWithData = await Promise.all(
      stocks.map(async (stock) => {
        let current_price: number | undefined;
        let three_months_ago_price: number | undefined;
        let six_months_ago_price: number | undefined;
        let dividend_yield: number | undefined;
        let quarterly_dividend_income: number | undefined;
        let six_month_dividend_income: number | undefined;
        let dividends_data: any[] = [];
        let next_ex_date: string | undefined;
        let next_pay_date: string | undefined;

        try {
          // 현재가 조회
          const priceResponse = await fetch(
            `https://api.polygon.io/v2/aggs/ticker/${stock.ticker}/prev?adjusted=true&apikey=${POLYGON_API_KEY}`,
            { next: { revalidate: 300 } }
          );

          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            if (priceData.results && priceData.results.length > 0) {
              current_price = parseFloat(priceData.results[0].c.toFixed(2));
            }
          }

          // 3개월 전 주가 조회 (약간의 범위를 두어 주말/휴일 고려)
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          const threeMonthsAgoEnd = new Date(threeMonthsAgo);
          threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 5); // 5일 전부터
          threeMonthsAgoEnd.setDate(threeMonthsAgoEnd.getDate() + 5); // 5일 후까지
          
          const threeMonthsFromDate = threeMonthsAgo.toISOString().split('T')[0];
          const threeMonthsToDate = threeMonthsAgoEnd.toISOString().split('T')[0];

          const threeMonthsPriceResponse = await fetch(
            `https://api.polygon.io/v2/aggs/ticker/${stock.ticker}/range/1/day/${threeMonthsFromDate}/${threeMonthsToDate}?adjusted=true&sort=asc&limit=1&apikey=${POLYGON_API_KEY}`,
            { next: { revalidate: 3600 } }
          );

          if (threeMonthsPriceResponse.ok) {
            const threeMonthsData = await threeMonthsPriceResponse.json();
            if (threeMonthsData.results && threeMonthsData.results.length > 0) {
              three_months_ago_price = parseFloat(threeMonthsData.results[0].c.toFixed(2));
            }
          }

          // 6개월 전 주가 조회 (약간의 범위를 두어 주말/휴일 고려)
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          const sixMonthsAgoEnd = new Date(sixMonthsAgo);
          sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 5); // 5일 전부터
          sixMonthsAgoEnd.setDate(sixMonthsAgoEnd.getDate() + 5); // 5일 후까지
          
          const sixMonthsFromDate = sixMonthsAgo.toISOString().split('T')[0];
          const sixMonthsToDate = sixMonthsAgoEnd.toISOString().split('T')[0];

          console.log(`${stock.ticker}: 6M price range: ${sixMonthsFromDate} to ${sixMonthsToDate}`);

          const sixMonthsPriceResponse = await fetch(
            `https://api.polygon.io/v2/aggs/ticker/${stock.ticker}/range/1/day/${sixMonthsFromDate}/${sixMonthsToDate}?adjusted=true&sort=asc&limit=1&apikey=${POLYGON_API_KEY}`,
            { next: { revalidate: 3600 } }
          );

          if (sixMonthsPriceResponse.ok) {
            const sixMonthsData = await sixMonthsPriceResponse.json();
            console.log(`${stock.ticker}: 6M price response:`, sixMonthsData);
            if (sixMonthsData.results && sixMonthsData.results.length > 0) {
              six_months_ago_price = parseFloat(sixMonthsData.results[0].c.toFixed(2));
              console.log(`${stock.ticker}: 6M price: ${six_months_ago_price}`);
            }
          }

          // 배당 정보 조회 (최근 20개 배당 기록)
          const dividendResponse = await fetch(
            `https://api.polygon.io/v3/reference/dividends?ticker=${stock.ticker}&limit=20&sort=ex_dividend_date&order=desc&apikey=${POLYGON_API_KEY}`,
            { next: { revalidate: 3600 } }
          );

          if (dividendResponse.ok) {
            const dividendData = await dividendResponse.json();
            
            if (dividendData.results && dividendData.results.length > 0) {
              const dividends = dividendData.results;
              dividends_data = dividends; // 모든 배당금 데이터 저장
              const latestDividend = dividends[0];

              // 연간 배당 수익률 계산 (최근 12개월 기준)
              const oneYearAgo = new Date();
              oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
              
              const recentDividends = dividends.filter((div: any) => 
                new Date(div.ex_dividend_date) >= oneYearAgo
              );

              const annualDividend = recentDividends.reduce(
                (sum: number, div: any) => sum + (div.cash_amount || 0),
                0
              );

              if (current_price && annualDividend > 0) {
                dividend_yield = (annualDividend / current_price) * 100;
              }

              // 3개월 배당 수익 계산 ($1000 기준 - 3개월 전 주가로 계산)
              if (three_months_ago_price && dividends.length > 0) {
                const sharesFor1000 = 1000 / three_months_ago_price;
                
                const threeMonthsAgoPeriod = new Date();
                threeMonthsAgoPeriod.setMonth(threeMonthsAgoPeriod.getMonth() - 3);
                
                const threeMonthDividends = dividends.filter((div: any) => 
                  new Date(div.ex_dividend_date) >= threeMonthsAgoPeriod
                );

                const totalDividendPerShare3M = threeMonthDividends.reduce(
                  (sum: number, div: any) => sum + (div.cash_amount || 0),
                  0
                );

                quarterly_dividend_income = sharesFor1000 * totalDividendPerShare3M;
              }

              // 6개월 배당 수익 계산 ($1000 기준 - 6개월 전 주가로 계산)
              if (six_months_ago_price && dividends.length > 0) {
                const sharesFor1000 = 1000 / six_months_ago_price;
                
                const sixMonthsAgoPeriod = new Date();
                sixMonthsAgoPeriod.setMonth(sixMonthsAgoPeriod.getMonth() - 6);
                
                const sixMonthDividends = dividends.filter((div: any) => 
                  new Date(div.ex_dividend_date) >= sixMonthsAgoPeriod
                );

                const totalDividendPerShare6M = sixMonthDividends.reduce(
                  (sum: number, div: any) => sum + (div.cash_amount || 0),
                  0
                );

                six_month_dividend_income = sharesFor1000 * totalDividendPerShare6M;
                
                console.log(`${stock.ticker}: 6M calc - price: ${six_months_ago_price}, shares: ${sharesFor1000}, dividends: ${sixMonthDividends.length}, total div/share: ${totalDividendPerShare6M}, result: ${six_month_dividend_income}`);
              } else {
                console.log(`${stock.ticker}: 6M calc failed - price: ${six_months_ago_price}, dividends: ${dividends.length}`);
              }

              // 다음 배당락일과 지급일 계산
              const exDate = new Date(latestDividend.ex_dividend_date + 'T00:00:00');
              const payDate = new Date(latestDividend.pay_date + 'T00:00:00');
              
              // 현재 시간을 한국 시간대로 변환
              const now = new Date();
              const nowKST = toZonedTime(now, 'Asia/Seoul');
              
              // 배당락일을 한국 시간대로 변환
              const exDateKST = toZonedTime(exDate, 'Asia/Seoul');
              const payDateKST = toZonedTime(payDate, 'Asia/Seoul');

              // 다음 배당일 예측 (dividend_frequency 기반)
              let nextExDate = new Date(exDateKST);
              let nextPayDate = new Date(payDateKST);
              
              // 미국 동부시간 기준으로 배당락일 장마감 시간 계산
              const isDST = (date: Date) => {
                const year = date.getFullYear();
                const march = new Date(year, 2, 1);
                const secondSunday = new Date(
                  year,
                  2,
                  8 + ((7 - march.getDay()) % 7),
                );
                const november = new Date(year, 10, 1);
                const firstSunday = new Date(
                  year,
                  10,
                  1 + ((7 - november.getDay()) % 7),
                );
                return date >= secondSunday && date < firstSunday;
              };
              
              // 배당락일이 지났는지 확인 (미국 동뵬시간 오후 4시 = 한국시간 새벽 5시 또는 6시)
              while (true) {
                const usEasternDate = toZonedTime(nextExDate, 'America/New_York');
                const isTargetDST = isDST(usEasternDate);
                const kstHour = isTargetDST ? 5 : 6; // EDT: 5시, EST: 6시
                
                const exDateDeadline = new Date(nextExDate);
                exDateDeadline.setHours(kstHour, 0, 0, 0);
                
                // 배당락일 장마감 시간이 지났으면 다음 배당일로 이동
                if (nowKST > exDateDeadline) {
                  switch (stock.dividend_frequency) {
                    case "1W":
                      nextExDate.setDate(nextExDate.getDate() + 7);
                      nextPayDate.setDate(nextPayDate.getDate() + 7);
                      break;
                    case "4W":
                      nextExDate.setDate(nextExDate.getDate() + 28);
                      nextPayDate.setDate(nextPayDate.getDate() + 28);
                      break;
                    case "1M":
                      nextExDate.setMonth(nextExDate.getMonth() + 1);
                      nextPayDate.setMonth(nextPayDate.getMonth() + 1);
                      break;
                    case "3M":
                      nextExDate.setMonth(nextExDate.getMonth() + 3);
                      nextPayDate.setMonth(nextPayDate.getMonth() + 3);
                      break;
                    case "6M":
                      nextExDate.setMonth(nextExDate.getMonth() + 6);
                      nextPayDate.setMonth(nextPayDate.getMonth() + 6);
                      break;
                    case "1Y":
                      nextExDate.setFullYear(nextExDate.getFullYear() + 1);
                      nextPayDate.setFullYear(nextPayDate.getFullYear() + 1);
                      break;
                    default:
                      nextExDate.setDate(nextExDate.getDate() + 28);
                      nextPayDate.setDate(nextPayDate.getDate() + 28);
                  }
                } else {
                  // 아직 배당락일 마감 시간이 지나지 않았으면 현재 배당일 사용
                  break;
                }
              }

              next_ex_date = formatInTimeZone(nextExDate, 'Asia/Seoul', 'yyyy-MM-dd');
              next_pay_date = formatInTimeZone(nextPayDate, 'Asia/Seoul', 'yyyy-MM-dd');
              
              console.log(`${stock.ticker}: Latest ex-date: ${latestDividend.ex_dividend_date}, Next ex-date: ${next_ex_date}`);
              console.log(`${stock.ticker}: 3M dividend: ${quarterly_dividend_income}, 6M dividend: ${six_month_dividend_income}`);
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${stock.ticker}:`, error);
          // 데이터 없어도 기본 정보는 유지
        }

        return {
          ticker: stock.ticker,
          name: stock.name,
          issuer: stock.issuer,
          group_name: stock.group_name,
          dividend_frequency: stock.dividend_frequency,
          current_price,
          three_months_ago_price,
          six_months_ago_price,
          dividend_yield: dividend_yield ? parseFloat(dividend_yield.toFixed(2)) : undefined,
          quarterly_dividend_income: quarterly_dividend_income ? parseFloat(quarterly_dividend_income.toFixed(2)) : undefined,
          six_month_dividend_income: six_month_dividend_income ? parseFloat(six_month_dividend_income.toFixed(2)) : undefined,
          dividends_data,
          next_ex_date,
          next_pay_date,
        } as DividendStock;
      })
    );

    // 지정된 기간 배당 수익 기준으로 내림차순 정렬
    const rankedStocks = stocksWithData
      .filter(stock => stock.quarterly_dividend_income !== undefined && stock.quarterly_dividend_income > 0)
      .sort((a, b) => (b.quarterly_dividend_income || 0) - (a.quarterly_dividend_income || 0));

    return NextResponse.json({
      success: true,
      stocks: rankedStocks,
      count: rankedStocks.length,
      total_analyzed: stocksWithData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dividend ranking API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dividend ranking",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}