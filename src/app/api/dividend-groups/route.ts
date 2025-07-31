import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface DividendGroup {
  issuer: string;
  group_name: string;
  etf_count: number;
  sample_ticker: string;
  dividend_frequency?: string;
  next_ex_date?: string;
  next_pay_date?: string;
  time_until_ex_date?: number;
}

export async function GET(request: NextRequest) {
  try {
    // 모든 배당 그룹 조회 (dividend_frequency 포함)
    const { data: groups, error } = await supabase
      .from("dividend_stocks")
      .select("issuer, group_name, ticker, dividend_frequency")
      .eq("is_active", true)
      .order("issuer")
      .order("group_name");

    if (error) {
      throw error;
    }

    // 그룹별로 집계
    const groupMap = new Map<string, DividendGroup>();

    groups?.forEach((stock) => {
      const key = `${stock.issuer}-${stock.group_name}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          issuer: stock.issuer,
          group_name: stock.group_name,
          etf_count: 0,
          sample_ticker: stock.ticker,
          dividend_frequency: stock.dividend_frequency,
        });
      }

      const group = groupMap.get(key)!;
      group.etf_count++;
    });

    let groupsArray = Array.from(groupMap.values());

    // Weekly 그룹을 A, B, C, D조에 모두 포함시키기
    const weeklyGroup = groupsArray.find((g) => g.group_name === "Weekly");
    if (weeklyGroup) {
      // Weekly 그룹을 제거
      groupsArray = groupsArray.filter((g) => g.group_name !== "Weekly");

      // A, B, C, D조에 Weekly 정보 추가
      ["A", "B", "C", "D"].forEach((groupName) => {
        const existingGroup = groupsArray.find(
          (g) => g.group_name === groupName,
        );
        if (existingGroup) {
          // 기존 그룹에 Weekly ETF 수 추가
          existingGroup.etf_count += weeklyGroup.etf_count;
        } else {
          // 해당 그룹이 없으면 새로 생성
          groupsArray.push({
            issuer: weeklyGroup.issuer,
            group_name: groupName,
            etf_count: weeklyGroup.etf_count,
            sample_ticker: weeklyGroup.sample_ticker,
            dividend_frequency: weeklyGroup.dividend_frequency,
          });
        }
      });
    }

    // 각 그룹의 모든 ETF에 대해 배당 정보 조회
    const groupsWithDividends = await Promise.all(
      groupsArray.map(async (group) => {
        try {
          const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

          // 해당 그룹의 모든 ETF 조회
          const { data: groupStocks, error: stocksError } = await supabase
            .from("dividend_stocks")
            .select("ticker")
            .eq("issuer", group.issuer)
            .eq("group_name", group.group_name)
            .eq("is_active", true);

          if (stocksError) {
            console.error(
              `Error fetching stocks for ${group.issuer} ${group.group_name}:`,
              stocksError,
            );
            return group;
          }

          let nearestExDate: Date | null = null;
          let nearestPayDate: Date | null = null;

          // 각 ETF의 배당 정보 조회 (배당 데이터가 있는 ETF를 찾을 때까지)
          for (const stock of groupStocks || []) {
            try {
              const response = await fetch(
                `https://api.polygon.io/v3/reference/dividends?ticker=${stock.ticker}&limit=1&sort=ex_dividend_date&order=desc&apikey=${POLYGON_API_KEY}`,
                { next: { revalidate: 3600 } },
              );

              if (response.ok) {
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                  const dividend = data.results[0];

                  // 배당락일을 UTC로 파싱 후 한국 시간으로 변환
                  const exDateUTC = new Date(dividend.ex_dividend_date + "T00:00:00Z");
                  const payDateUTC = new Date(dividend.pay_date + "T00:00:00Z");
                  
                  // UTC를 한국 시간 오전 9시로 변환
                  const exDate = toZonedTime(exDateUTC, 'Asia/Seoul');
                  exDate.setHours(9, 0, 0, 0);
                  const payDate = toZonedTime(payDateUTC, 'Asia/Seoul');
                  payDate.setHours(9, 0, 0, 0);

                  // 한국 시간 기준 현재 날짜
                  const kstNow = toZonedTime(new Date(), 'Asia/Seoul');

                  // dividend_frequency를 사용한 다음 배당락일 계산
                  const frequency = group.dividend_frequency || "4W";
                  let nextExDate = new Date(exDate);
                  let nextPayDate = new Date(payDate);

                  while (nextExDate <= kstNow) {
                    switch (frequency) {
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
                  }

                  // 가장 가까운 배당락일 선택
                  if (!nearestExDate || nextExDate < nearestExDate) {
                    nearestExDate = nextExDate;
                    nearestPayDate = nextPayDate;
                  }
                }
              }
            } catch (error) {
              console.error(
                `Error fetching dividend for ${stock.ticker}:`,
                error,
              );
            }
          }

          // 가장 가까운 배당락일이 있는 경우 설정
          if (nearestExDate && nearestPayDate) {
            // 배당락일 전날 미국 장마감시간 (동부시간 오후 4시)을 한국시간으로 변환
            const targetDate = new Date(nearestExDate);
            targetDate.setDate(targetDate.getDate() - 1); // 전날

            // 미국 동부시간 오후 4시를 UTC로 변환 후 한국시간으로 변환
            // 썸머타임 여부를 확인하여 정확한 시간 계산
            const isDST = (date: Date) => {
              const year = date.getFullYear();
              // 3월 둘째 일요일 ~ 11월 첫째 일요일이 썸머타임
              const march = new Date(year, 2, 1); // 3월 1일
              const secondSunday = new Date(
                year,
                2,
                8 + ((7 - march.getDay()) % 7),
              );
              const november = new Date(year, 10, 1); // 11월 1일
              const firstSunday = new Date(
                year,
                10,
                1 + ((7 - november.getDay()) % 7),
              );

              return date >= secondSunday && date < firstSunday;
            };

            const isTargetDST = isDST(targetDate);
            // EDT(썸머타임): UTC-4, EST(표준시간): UTC-5
            // 동부시간 오후 4시 = UTC 8시(썸머타임) 또는 UTC 9시(표준시간)
            const utcHour = isTargetDST ? 20 : 21; // UTC 20시 = EDT 4PM, UTC 21시 = EST 4PM

            // 한국시간으로 변환 (UTC + 9시간)
            const kstHour = (utcHour + 9) % 24;
            const kstTargetDate = new Date(targetDate);
            kstTargetDate.setUTCHours(utcHour, 0, 0, 0);

            const now = new Date();
            const timeUntilExDate = kstTargetDate.getTime() - now.getTime();

            // 한국 시간으로 날짜 문자열 생성 (YYYY-MM-DD 형식)
            const formatKSTDateTime = (date: Date) => {
              return formatInTimeZone(date, 'Asia/Seoul', 'yyyy-MM-dd');
            };

            group.next_ex_date = formatKSTDateTime(nearestExDate);
            group.next_pay_date = formatKSTDateTime(nearestPayDate);
            group.time_until_ex_date = timeUntilExDate;
          }
        } catch (error) {
          console.error(
            `Error fetching dividend for ${group.issuer} ${group.group_name}:`,
            error,
          );
        }

        return group;
      }),
    );

    // 다음 배당락일이 임박한 순서로 정렬 (time_until_ex_date가 음수여도 포함)
    const sortedGroups = groupsWithDividends
      .filter((group) => group.next_ex_date && group.next_pay_date)
      .sort(
        (a, b) => (a.time_until_ex_date || 0) - (b.time_until_ex_date || 0),
      );

    return NextResponse.json({
      success: true,
      groups: sortedGroups,
      total_groups: groupsArray.length,
      upcoming_groups: sortedGroups.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dividend groups API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dividend groups",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

