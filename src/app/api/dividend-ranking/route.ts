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
  dividend_yield?: number;
  // 새로운 수익률 점수 시스템
  dividend_score?: number; // 0-100점 수익률 점수
  dividend_return_rate?: number; // 실제 배당 수익률 %
  stock_price_return_rate?: number; // 주가 수익률 %
  total_return_rate?: number; // 총 수익률 % (배당+주가)
  total_score?: number; // 총 점수 (배당+주가)
  calculation_period_count?: number; // 계산에 사용된 배당 횟수
  dividend_trend?: 'up' | 'down' | 'stable'; // 배당 트렌드
  trend_percentage?: number; // 트렌드 변화율
  calculation_start_date?: string; // 계산 시작일
  calculation_end_date?: string; // 계산 종료일
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
        try {
        let current_price: number | undefined;
        let dividend_yield: number | undefined;
        let dividend_score: number | undefined;
        let dividend_return_rate: number | undefined;
        let stock_price_return_rate: number | undefined;
        let total_return_rate: number | undefined;
        let total_score: number | undefined;
        let calculation_period_count: number | undefined;
        let dividend_trend: 'up' | 'down' | 'stable' | undefined;
        let trend_percentage: number | undefined;
        let calculation_start_date: string | undefined;
        let calculation_end_date: string | undefined;
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

          // 6개월간 배당 데이터 분석을 위한 과거 주가 조회 함수
          const getPastPrice = async (daysAgo: number) => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);
            const startDate = new Date(pastDate);
            startDate.setDate(startDate.getDate() - 5); // 5일 여유
            const endDate = new Date(pastDate);
            endDate.setDate(endDate.getDate() + 5); // 5일 여유
            
            const fromDate = startDate.toISOString().split('T')[0];
            const toDate = endDate.toISOString().split('T')[0];
            
            const response = await fetch(
              `https://api.polygon.io/v2/aggs/ticker/${stock.ticker}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=1&apikey=${POLYGON_API_KEY}`,
              { next: { revalidate: 3600 } }
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data.results && data.results.length > 0) {
                return parseFloat(data.results[0].c.toFixed(2));
              }
            }
            return null;
          };

          // 배당 정보 조회 (최근 20개 배당 기록)
          const dividendResponse = await fetch(
            `https://api.polygon.io/v3/reference/dividends?ticker=${stock.ticker}&limit=20&sort=ex_dividend_date&order=desc&apikey=${POLYGON_API_KEY}`,
            { next: { revalidate: 3600 } }
          );

          if (dividendResponse.ok) {
            const dividendData = await dividendResponse.json();
            
            if (dividendData.results && dividendData.results.length > 0) {
              const dividends = dividendData.results;
              dividends_data = dividends;
              const latestDividend = dividends[0];

              // 연간 배당 수익률 계산 (기존 유지)
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

              // 🎯 새로운 배당 점수 계산 시스템
              const calculateDividendScore = async () => {
                if (dividends.length < 2) {
                  // 배당이 1번만 있으면 측정불가
                  dividend_score = 0;
                  dividend_return_rate = 0;
                  stock_price_return_rate = 0;
                  total_return_rate = 0;
                  total_score = 0;
                  calculation_period_count = 0;
                  dividend_trend = 'stable';
                  return;
                }

                // 1. 배당 패턴 변경점 감지
                const intervals: number[] = [];
                for (let i = 0; i < dividends.length - 1; i++) {
                  const current = new Date(dividends[i].ex_dividend_date);
                  const next = new Date(dividends[i + 1].ex_dividend_date);
                  const daysDiff = Math.abs((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
                  intervals.push(daysDiff);
                }

                // 2. 현재 패턴 구간 식별 (최신부터)
                let currentPattern = intervals[0];
                let patternChangeIndex = 0;
                
                for (let i = 1; i < intervals.length; i++) {
                  const diff = Math.abs(intervals[i] - currentPattern);
                  if (diff > 10) { // 10일 이상 차이나면 패턴 변경으로 간주
                    patternChangeIndex = i;
                    break;
                  }
                }

                // 3. 계산 기간 결정 (12개월 또는 패턴 변경 후 기간)
                const twelveMonthsAgo = new Date();
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                
                const patternStartDate = patternChangeIndex > 0 
                  ? new Date(dividends[patternChangeIndex].ex_dividend_date)
                  : twelveMonthsAgo;

                const calculationStartDate = new Date(Math.max(patternStartDate.getTime(), twelveMonthsAgo.getTime()));
                
                // 4. 계산 대상 배당 필터링
                const calculationDividends = dividends.filter((div: any) => {
                  const divDate = new Date(div.ex_dividend_date);
                  return divDate >= calculationStartDate;
                });

                if (calculationDividends.length < 2) {
                  dividend_score = 0;
                  dividend_return_rate = 0;
                  stock_price_return_rate = 0;
                  total_return_rate = 0;
                  total_score = 0;
                  calculation_period_count = 0;
                  dividend_trend = 'stable';
                  return;
                }

                // 5. 계산 기간의 시작 주가 조회
                const startDate = new Date(calculationDividends[calculationDividends.length - 1].ex_dividend_date);
                const daysAgo = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const startPrice = await getPastPrice(daysAgo);

                if (!startPrice || !current_price) {
                  dividend_score = 0;
                  dividend_return_rate = 0;
                  stock_price_return_rate = 0;
                  total_return_rate = 0;
                  total_score = 0;
                  calculation_period_count = 0;
                  dividend_trend = 'stable';
                  return;
                }

                // 6. 수익률 계산
                const totalDividendPerShare = calculationDividends.reduce(
                  (sum: number, div: any) => sum + (div.cash_amount || 0), 0
                );
                
                const actualPeriodCount = calculationDividends.length;
                
                // 개별 수익률 계산 (표시용)
                const dividendReturnRate = (totalDividendPerShare / startPrice) * 100;
                const stockPriceReturnRate = ((current_price - startPrice) / startPrice) * 100;
                
                // 정확한 총 수익률 계산: (최종 가치 - 초기 투자금) / 초기 투자금
                // 최종 가치 = 현재 주가 + 받은 배당금 총액
                // 초기 투자금 = 시작 주가
                const finalValue = current_price + totalDividendPerShare;
                const totalReturnRate = ((finalValue - startPrice) / startPrice) * 100;

                // 7. 배당 트렌드 분석
                const firstHalf = calculationDividends.slice(Math.floor(calculationDividends.length / 2));
                const secondHalf = calculationDividends.slice(0, Math.floor(calculationDividends.length / 2));
                
                const firstHalfAvg = firstHalf.reduce((sum: number, div: any) => sum + (div.cash_amount || 0), 0) / firstHalf.length;
                const secondHalfAvg = secondHalf.reduce((sum: number, div: any) => sum + (div.cash_amount || 0), 0) / secondHalf.length;
                
                const trendChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
                
                // 결과 저장
                dividend_return_rate = parseFloat(dividendReturnRate.toFixed(2));
                stock_price_return_rate = parseFloat(stockPriceReturnRate.toFixed(2));
                total_return_rate = parseFloat(totalReturnRate.toFixed(2));
                
                // 배당 점수 계산 (기존 로직)
                let dividendScore = 0;
                if (dividendReturnRate <= 0) {
                  dividendScore = 0;
                } else if (dividendReturnRate <= 1) {
                  dividendScore = dividendReturnRate * 10; // 0-1%: 0-10점
                } else if (dividendReturnRate <= 5) {
                  dividendScore = 10 + (dividendReturnRate - 1) * 5; // 1-5%: 10-30점
                } else if (dividendReturnRate <= 10) {
                  dividendScore = 30 + (dividendReturnRate - 5) * 4; // 5-10%: 30-50점
                } else if (dividendReturnRate <= 20) {
                  dividendScore = 50 + (dividendReturnRate - 10) * 2; // 10-20%: 50-70점
                } else if (dividendReturnRate <= 30) {
                  dividendScore = 70 + (dividendReturnRate - 20) * 1.5; // 20-30%: 70-85점
                } else {
                  dividendScore = 85 + Math.min(15, (dividendReturnRate - 30) * 0.75); // 30%+: 85-100점
                }
                
                dividend_score = Math.min(100, dividendScore); // 마이너스 점수 허용
                
                // 총 수익률 점수 계산 (마이너스 점수 포함)
                let totalCalculatedScore = 0;
                if (totalReturnRate < 0) {
                  // 마이너스 수익률: -50% = -100점, -25% = -50점
                  totalCalculatedScore = Math.max(-100, totalReturnRate * 2);
                } else if (totalReturnRate <= 2) {
                  totalCalculatedScore = totalReturnRate * 8; // 0-2%: 0-16점
                } else if (totalReturnRate <= 10) {
                  totalCalculatedScore = 16 + (totalReturnRate - 2) * 4; // 2-10%: 16-48점
                } else if (totalReturnRate <= 20) {
                  totalCalculatedScore = 48 + (totalReturnRate - 10) * 3; // 10-20%: 48-78점
                } else if (totalReturnRate <= 30) {
                  totalCalculatedScore = 78 + (totalReturnRate - 20) * 1.5; // 20-30%: 78-93점
                } else {
                  totalCalculatedScore = 93 + Math.min(7, (totalReturnRate - 30) * 0.35); // 30%+: 93-100점
                }
                
                total_score = parseFloat(totalCalculatedScore.toFixed(1)); // 마이너스 점수 허용
                calculation_period_count = actualPeriodCount;
                calculation_start_date = startDate.toISOString().split('T')[0];
                calculation_end_date = new Date().toISOString().split('T')[0];
                trend_percentage = parseFloat(trendChange.toFixed(1));
                
                if (Math.abs(trendChange) < 5) {
                  dividend_trend = 'stable';
                } else if (trendChange > 0) {
                  dividend_trend = 'up';
                } else {
                  dividend_trend = 'down';
                }

                console.log(`${stock.ticker}: 배당점수=${dividend_score}, 총점수=${total_score}, 배당수익률=${dividend_return_rate}%, 주가수익률=${stock_price_return_rate}%, 총수익률=${total_return_rate}%, Count=${calculation_period_count}회, Trend=${dividend_trend}(${trend_percentage}%)`);
              };

              await calculateDividendScore();

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
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${stock.ticker}:`, error);
          // API 호출 실패 시 기본값으로 설정
          dividend_score = 0;
          dividend_return_rate = 0;
          stock_price_return_rate = 0;
          total_return_rate = 0;
          total_score = 0;
          calculation_period_count = 0;
          dividend_trend = 'stable';
          trend_percentage = 0;
        }

        return {
          ticker: stock.ticker,
          name: stock.name,
          issuer: stock.issuer,
          group_name: stock.group_name,
          dividend_frequency: stock.dividend_frequency,
          current_price,
          dividend_yield: dividend_yield ? parseFloat(dividend_yield.toFixed(2)) : undefined,
          dividend_score: dividend_score ? parseFloat(dividend_score.toFixed(1)) : 0,
          dividend_return_rate: dividend_return_rate ? parseFloat(dividend_return_rate.toFixed(2)) : 0,
          stock_price_return_rate: stock_price_return_rate ? parseFloat(stock_price_return_rate.toFixed(2)) : 0,
          total_return_rate: total_return_rate ? parseFloat(total_return_rate.toFixed(2)) : 0,
          total_score: total_score ? parseFloat(total_score.toFixed(1)) : 0,
          calculation_period_count: calculation_period_count || 0,
          dividend_trend,
          trend_percentage: trend_percentage ? parseFloat(trend_percentage.toFixed(1)) : 0,
          calculation_start_date,
          calculation_end_date,
          dividends_data,
          next_ex_date,
          next_pay_date,
        } as DividendStock;
        } catch (stockError) {
          console.error(`Critical error processing ${stock.ticker}:`, stockError);
          // 전체 처리 실패 시 기본 주식 정보만 반환
          return {
            ticker: stock.ticker,
            name: stock.name,
            issuer: stock.issuer,
            group_name: stock.group_name,
            dividend_frequency: stock.dividend_frequency,
            current_price: undefined,
            dividend_yield: undefined,
            dividend_score: 0,
            dividend_return_rate: 0,
            stock_price_return_rate: 0,
            total_return_rate: 0,
            total_score: 0,
            calculation_period_count: 0,
            dividend_trend: 'stable' as const,
            trend_percentage: 0,
            calculation_start_date: undefined,
            calculation_end_date: undefined,
            dividends_data: [],
            next_ex_date: undefined,
            next_pay_date: undefined,
          } as DividendStock;
        }
      })
    );

    // 총 점수 기준으로 내림차순 정렬, 같은 점수면 총 수익률로 2차 정렬 (마이너스 점수 포함)
    const rankedStocks = stocksWithData
      .filter(stock => stock.total_score !== undefined) // 점수가 계산된 모든 주식 포함
      .sort((a, b) => {
        const scoreDiff = (b.total_score || 0) - (a.total_score || 0);
        if (Math.abs(scoreDiff) < 0.1) {
          // 점수가 거의 같으면 총 수익률로 2차 정렬
          return (b.total_return_rate || 0) - (a.total_return_rate || 0);
        }
        return scoreDiff;
      });

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