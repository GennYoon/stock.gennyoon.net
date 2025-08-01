"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  TrendingUpIcon,
  SearchIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { useCurrency } from "@/shared/hooks/use-currency";

interface DividendStock {
  ticker: string;
  name: string;
  issuer: string;
  group_name: string;
  dividend_frequency: string;
  current_price?: number;
  dividend_yield?: number;
  next_ex_date?: string;
  next_pay_date?: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const [stocks, setStocks] = useState<DividendStock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<DividendStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [searchTicker, setSearchTicker] = useState<string>("");
  const { formatCurrency } = useCurrency();

  // 배당주 데이터 로드
  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/dividend-dashboard");
        const data = await response.json();

        if (data.success) {
          setStocks(data.stocks);
          setFilteredStocks(data.stocks);
        } else {
          throw new Error(data.message || "Failed to fetch dividend stocks");
        }
      } catch (error) {
        console.error("Failed to fetch dividend stocks:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 티커 검색 필터링
  useEffect(() => {
    if (!searchTicker.trim()) {
      setFilteredStocks(stocks);
    } else {
      const filtered = stocks.filter((stock) =>
        stock.ticker.toLowerCase().includes(searchTicker.toLowerCase()),
      );
      setFilteredStocks(filtered);
    }
  }, [stocks, searchTicker]);

  // 실시간 카운트다운 계산
  const getCountdown = (exDateString?: string) => {
    if (!exDateString) return null;

    const now = new Date();
    const nowKST = toZonedTime(now, "Asia/Seoul");
    const exDateStr = exDateString + "T00:00:00";
    const exDate = toZonedTime(new Date(exDateStr), "Asia/Seoul");

    // 썸머타임 여부 확인
    const isDST = (date: Date) => {
      const year = date.getFullYear();
      const march = new Date(year, 2, 1);
      const secondSunday = new Date(year, 2, 8 + ((7 - march.getDay()) % 7));
      const november = new Date(year, 10, 1);
      const firstSunday = new Date(year, 10, 1 + ((7 - november.getDay()) % 7));
      return date >= secondSunday && date < firstSunday;
    };

    const usEasternDate = toZonedTime(exDate, "America/New_York");
    const isTargetDST = isDST(usEasternDate);
    const kstHour = isTargetDST ? 5 : 6;
    const targetDate = new Date(exDate);
    targetDate.setHours(kstHour, 0, 0, 0);

    const timeLeft = targetDate.getTime() - nowKST.getTime();

    if (timeLeft <= 0) {
      return "🚫 매수 마감";
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    if (days === 0) {
      return `${hours}시간 ${minutes}분 ${seconds}초`;
    } else {
      return `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
    }
  };

  // 마감 임박 상태 확인
  const getUrgencyBadge = (exDateString?: string) => {
    if (!exDateString) return null;

    const now = new Date();
    const nowKST = toZonedTime(now, "Asia/Seoul");
    const exDateStr = exDateString + "T00:00:00";
    const exDate = toZonedTime(new Date(exDateStr), "Asia/Seoul");

    // 미국 동부시간 기준 썸머타임 확인
    const isDST = (date: Date) => {
      const year = date.getFullYear();
      const march = new Date(year, 2, 1);
      const secondSunday = new Date(year, 2, 8 + ((7 - march.getDay()) % 7));
      const november = new Date(year, 10, 1);
      const firstSunday = new Date(year, 10, 1 + ((7 - november.getDay()) % 7));
      return date >= secondSunday && date < firstSunday;
    };

    const usEasternDate = toZonedTime(exDate, "America/New_York");
    const isTargetDST = isDST(usEasternDate);
    const kstHour = isTargetDST ? 5 : 6;
    const buyDeadline = new Date(exDate);
    buyDeadline.setHours(kstHour, 0, 0, 0);

    // 배당락일 오전 9시부터 다음날 오전 5시까지는 매도가능
    const sellStart = new Date(exDate);
    sellStart.setHours(9, 0, 0, 0);
    const sellEnd = new Date(exDate);
    sellEnd.setDate(sellEnd.getDate() + 1);
    sellEnd.setHours(5, 0, 0, 0);

    const timeUntilBuyDeadline = buyDeadline.getTime() - nowKST.getTime();
    const daysUntilBuyDeadline = Math.floor(
      timeUntilBuyDeadline / (1000 * 60 * 60 * 24),
    );

    // 매도 가능 기간
    if (nowKST >= sellStart && nowKST < sellEnd) {
      return (
        <Badge
          variant="outline"
          className="text-green-600 dark:text-green-400 border-green-500"
        >
          <TrendingUpIcon className="w-3 h-3 mr-1" />
          매도가능
        </Badge>
      );
    }

    // 매수 마감 후
    if (nowKST >= buyDeadline) {
      return null;
    }

    // 마감 임박 (1일 이하)
    if (daysUntilBuyDeadline <= 1) {
      return (
        <Badge variant="outline" className="text-red-500 border-red-500">
          <ClockIcon className="w-3 h-3 mr-1" />
          마감 임박
        </Badge>
      );
    }

    // 마감 임박 (3일 이하)
    if (daysUntilBuyDeadline <= 3) {
      return (
        <Badge variant="outline" className="text-orange-500 border-orange-500">
          <ClockIcon className="w-3 h-3 mr-1" />
          마감 임박
        </Badge>
      );
    }

    return null;
  };

  // 배당 주기 텍스트 변환
  const getFrequencyText = (frequency: string) => {
    const freqMap: { [key: string]: string } = {
      "1W": "주간",
      "4W": "4주간",
      "1M": "월간",
      "3M": "분기",
      "6M": "반년",
      "1Y": "연간",
    };
    return freqMap[frequency] || frequency;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-900 dark:text-white">
              배당주 정보를 불러오는 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-lg text-red-600 dark:text-red-400">
              데이터 로딩 실패: {error}
            </div>
            <Button onClick={() => window.location.reload()}>다시 시도</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1 text-gray-900 dark:text-white">
            배당 대시보드
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            다음 배당락일까지의 시간을 확인하고 매수 타이밍을 놓치지 마세요
          </p>
        </div>

        {/* 검색창 - Sticky */}
        <div className="sticky top-16 z-10 bg-gray-50 dark:bg-gray-900 py-3 mb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="티커 검색 (예: ULTY, NVDY, MSTY...)"
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              className="!pl-12 !pr-10"
            />
            {searchTicker && (
              <button
                onClick={() => setSearchTicker("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>
          {searchTicker && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              "{searchTicker}" 검색 결과: {filteredStocks.length}개 ETF
            </div>
          )}
        </div>

        <div className="grid gap-2 md:gap-3">
          {filteredStocks.map((stock) => {
            const countdown = getCountdown(stock.next_ex_date);
            const urgencyBadge = getUrgencyBadge(stock.next_ex_date);
            const hasUpcomingDividend =
              stock.next_ex_date && stock.next_pay_date;

            return (
              <Card
                key={stock.ticker}
                className={`!py-0 transition-all duration-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
                  hasUpcomingDividend ? "border-l-4 border-l-blue-500" : ""
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* 좌측: ETF 정보 (2줄로 압축) */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* 첫째줄: 발행사/그룹, 현재가 */}
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-1.5 py-0.5"
                        >
                          {stock.issuer === "YieldMax"
                            ? stock.group_name === "Weekly"
                              ? `일드맥스 ${stock.group_name}`
                              : `일드맥스 ${stock.group_name}조`
                            : stock.issuer}
                        </Badge>
                      </div>

                      {/* 둘째줄: 티커, 배당주기, 마감임박 */}
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/stock/${stock.ticker}`}>
                          <h3 className="font-bold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
                            {stock.ticker}
                          </h3>
                        </Link>

                        {/* 배당 주기 배지 */}
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0.5 border-purple-500 text-purple-600 dark:text-purple-400"
                        >
                          {stock.dividend_frequency}
                        </Badge>

                        {/* 마감임박 배지 */}
                        {urgencyBadge}
                      </div>
                    </div>

                    {/* 우측: 배당 정보 */}
                    {hasUpcomingDividend && (
                      <div className="flex-shrink-0 text-right">
                        {/* 현재가 정보 */}
                        {stock.current_price && (
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {formatCurrency(stock.current_price)}
                          </div>
                        )}

                        {countdown && (
                          <div className="mb-1">
                            <div className="text-sm font-mono font-bold text-red-600 dark:text-red-400 text-center">
                              {countdown}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <div className="font-medium text-gray-600 dark:text-gray-400">
                            지급일: {stock.next_pay_date || "미정"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredStocks.length === 0 && !loading && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="text-center py-8">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {searchTicker
                    ? `"${searchTicker}" 검색 결과가 없습니다.`
                    : "배당주 정보가 없습니다."}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
