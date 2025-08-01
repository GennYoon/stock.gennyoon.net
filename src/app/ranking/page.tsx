"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUpIcon,
  DollarSignIcon,
  CalendarIcon,
  FilterIcon,
  ClockIcon,
} from "lucide-react";
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
  // 새로운 수익률 점수 시스템
  dividend_score?: number; // 0-100점 수익률 점수
  dividend_return_rate?: number; // 실제 배당 수익률 %
  stock_price_return_rate?: number; // 주가 수익률 %
  total_return_rate?: number; // 총 수익률 % (배당+주가)
  total_score?: number; // 총 점수 (배당+주가)
  calculation_period_count?: number; // 계산에 사용된 배당 횟수
  dividend_trend?: "up" | "down" | "stable"; // 배당 트렌드
  trend_percentage?: number; // 트렌드 변화율
  calculation_start_date?: string; // 계산 시작일
  calculation_end_date?: string; // 계산 종료일
  dividends_data?: any[];
  next_ex_date?: string;
  next_pay_date?: string;
}

export default function RankingPage() {
  const [stocks, setStocks] = useState<DividendStock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<DividendStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("all");
  const [totalAnalyzed, setTotalAnalyzed] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const { formatCurrency, currency } = useCurrency();

  // 배당주 데이터 로드
  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/dividend-ranking");

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          setStocks(data.stocks);
          setFilteredStocks(data.stocks);
          setTotalAnalyzed(data.total_analyzed || data.stocks.length);
        } else {
          throw new Error(data.message || "Failed to fetch dividend stocks");
        }
      } catch (error) {
        console.error("Failed to fetch dividend ranking:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  // 배당 주기별 필터링
  useEffect(() => {
    if (selectedFrequency === "all") {
      setFilteredStocks(stocks);
    } else {
      const filtered = stocks.filter(
        (stock) => stock.dividend_frequency === selectedFrequency,
      );
      setFilteredStocks(filtered);
    }
  }, [stocks, selectedFrequency]);

  // 실시간 카운트다운을 위한 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(timer);
  }, []);

  // 배당 트렌드 아이콘 반환
  const getTrendIcon = (trend: "up" | "down" | "stable" | undefined) => {
    switch (trend) {
      case "up":
        return <span className="text-red-500">▲</span>;
      case "down":
        return <span className="text-blue-500">▼</span>;
      case "stable":
      default:
        return <span className="text-gray-500">—</span>;
    }
  };

  // 수익률 배지 색상
  const getYieldBadgeColor = (yield_rate?: number) => {
    if (!yield_rate) return "bg-gray-100 text-gray-700";
    if (yield_rate >= 15)
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    if (yield_rate >= 10)
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    if (yield_rate >= 5)
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  };

  // 배당 빈도 표시
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

  // 배당락일까지 남은 시간 계산
  const getTimeUntilExDate = (exDateString?: string) => {
    if (!exDateString) return null;
    
    const now = new Date();
    const exDate = new Date(exDateString + 'T21:00:00+09:00'); // 한국시간 오후 9시 (미국 동부시간 오후 4시)
    const diffMs = exDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return null; // 이미 지났음
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  };

  // 배당락일 시간 포맷팅 (한국시간 기준)
  const formatExDateTime = (exDateString?: string) => {
    if (!exDateString) return null;
    
    const exDate = new Date(exDateString + 'T21:00:00+09:00');
    return {
      date: exDate.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      }),
      time: '21:00', // 한국시간 오후 9시 (미국 동부시간 오후 4시)
      dayOfWeek: exDate.toLocaleDateString('ko-KR', { weekday: 'short' })
    };
  };

  // 점수에 따른 색상 클래스 반환
  const getScoreColor = (score?: number) => {
    if (!score && score !== 0) return "text-gray-500 dark:text-gray-400";
    
    if (score >= 80) return "text-purple-700 dark:text-purple-300"; // 최우수
    if (score >= 60) return "text-purple-600 dark:text-purple-400"; // 우수  
    if (score >= 40) return "text-purple-500 dark:text-purple-500"; // 양호
    if (score >= 0) return "text-gray-600 dark:text-gray-400";      // 저조
    if (score >= -39) return "text-red-600 dark:text-red-400";      // 손실
    if (score >= -79) return "text-red-700 dark:text-red-300";      // 큰손실
    return "text-red-800 dark:text-red-200";                        // 위험
  };

  // 점수에 따른 이모지 반환
  const getScoreEmoji = (score?: number) => {
    if (!score && score !== 0) return "";
    
    if (score >= 80) return "🔥";      // 최우수: 불타는 아이콘
    if (score >= 60) return "⭐";      // 우수: 별
    if (score >= 40) return "👍";      // 양호: 엄지척
    if (score >= 0) return "😐";       // 저조: 무표정
    if (score >= -39) return "😟";     // 손실: 걱정
    if (score >= -79) return "😰";     // 큰손실: 식은땀
    return "💀";                       // 위험: 해골
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-900 dark:text-white">
              배당주 랭킹을 불러오는 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
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
      <div className="container mx-auto px-4 py-6 overflow-x-hidden">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            배당주 랭킹
          </h1>

          {/* 수익률 표시 설명 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">💡 수익률 표시 설명</h4>
            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <div><strong>총 수익률 124.79%</strong> → $1,000 투자 시 $2,247.90 가치 (배당금 $837 + 주가상승 $411 포함)</div>
              <div><strong>배당 83.7% | 주가 +41.1%</strong> → 배당금으로 83.7%, 주가상승으로 41.1% 기여 (개별 표시용)</div>
              <div><strong>10회 배당 기준 (+26.5%)</strong> → 10번의 배당을 받았으며, 이전 기간 대비 배당금이 평균 26.5% 증가</div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-blue-500">▼</span> <span>배당 감소 추세</span>
                <span className="text-red-500 ml-3">▲</span> <span>배당 증가 추세</span>
                <span className="text-gray-500 ml-3">—</span> <span>배당 안정 추세</span>
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ※ 배당 트렌드 색상은 미국 시장 기준 (상승=빨강, 하락=파랑)
              </div>
            </div>
          </div>

          {/* 제외 이유 설명 */}
          {totalAnalyzed > 0 && stocks.length < totalAnalyzed && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <div className="text-orange-600 dark:text-orange-400 text-sm">
                  ℹ️{" "}
                  <span className="font-medium">
                    일부 주식이 랭킹에서 제외되었습니다:
                  </span>
                </div>
              </div>
              <ul className="text-xs text-orange-700 dark:text-orange-300 mt-1 ml-4 space-y-1">
                <li>• 배당 기록이 2회 미만인 경우 (점수 계산 불가)</li>
                <li>• 주가 데이터가 부족한 경우 (시작/현재 가격 없음)</li>
                <li>• API 호출 실패로 데이터를 가져올 수 없는 경우</li>
                <li>• ✅ 손실 주식도 모두 포함하여 표시합니다</li>
              </ul>
            </div>
          )}

          {/* 배당 주기 필터 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                배당 주기:
              </span>
            </div>
            <Select
              value={selectedFrequency}
              onValueChange={setSelectedFrequency}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="1W">주간 배당</SelectItem>
                <SelectItem value="4W">4주 배당</SelectItem>
                <SelectItem value="1M">월 배당</SelectItem>
                <SelectItem value="3M">분기 배당</SelectItem>
                <SelectItem value="6M">반년 배당</SelectItem>
                <SelectItem value="1Y">연 배당</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({filteredStocks.length}개)
              {totalAnalyzed > 0 &&
                stocks.length < totalAnalyzed &&
                selectedFrequency === "all" && (
                  <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                    • 분석 대상 {totalAnalyzed}개 중 데이터 부족으로 {totalAnalyzed - stocks.length}개 제외
                  </span>
                )}
            </span>
          </div>
        </div>

        {filteredStocks.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="text-center py-12">
              <div className="text-gray-600 dark:text-gray-400">
                {selectedFrequency === "all"
                  ? "배당주 데이터가 없습니다."
                  : "해당 배당 주기의 데이터가 없습니다."}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredStocks.map((stock, index) => (
              <Card
                key={stock.ticker}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow !py-0 overflow-hidden"
              >
                <CardContent className="p-4 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* 랭킹 및 기본 정보 */}
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-full text-sm flex-shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Link href={`/stock/${stock.ticker}`}>
                            <h3 className="font-bold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
                              {stock.ticker}
                            </h3>
                          </Link>
                          {stock.dividend_frequency === "1W" && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0 h-4 border-blue-500 text-blue-600 dark:text-blue-400"
                            >
                              W
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {stock.issuer}{" "}
                            {stock.issuer === "YieldMax"
                              ? `${stock.group_name}조`
                              : stock.group_name}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 break-words">
                          {stock.name}
                        </p>

                        <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-500">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {getFrequencyText(stock.dividend_frequency)} 배당
                            </span>
                          </div>
                          
                          {/* 배당락일과 시간 */}
                          {stock.next_ex_date && (() => {
                            const dateTime = formatExDateTime(stock.next_ex_date);
                            const countdown = getTimeUntilExDate(stock.next_ex_date);
                            
                            return (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  <span className="font-medium">
                                    {dateTime?.date} ({dateTime?.dayOfWeek}) {dateTime?.time}
                                  </span>
                                </div>
                                {countdown && (
                                  <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                    ⏰ {countdown.days}일 {countdown.hours}시간 {countdown.minutes}분 남음
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* 총합 점수 정보 */}
                    <div className="sm:text-right pl-10 sm:pl-0 border-t pt-3 sm:border-0 sm:pt-0 dark:border-gray-700">
                      {/* 모바일에서 순위 번호 공간만큼 왼쪽 패딩 추가 */}
                      <div className="flex flex-col gap-1">
                        {/* 총 점수 - 모바일에서는 좌우 배치 */}
                        <div className="flex justify-between items-center sm:flex-col sm:items-end sm:gap-1">
                          <span className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            총 점수
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`text-lg font-bold ${getScoreColor(stock.total_score)}`}>
                              {getScoreEmoji(stock.total_score)} {stock.total_score?.toFixed(1) || "0.0"}점
                            </span>
                            {getTrendIcon(stock.dividend_trend)}
                          </div>
                        </div>

                        {/* 총 수익률 - 모바일에서는 좌우 배치 */}
                        <div className="flex justify-between items-center sm:flex-col sm:items-end sm:gap-1">
                          <span className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            총 수익률
                          </span>
                          <span
                            className={`text-lg font-bold ${
                              (stock.total_return_rate || 0) >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {(stock.total_return_rate || 0) >= 0 ? "+" : ""}
                            {stock.total_return_rate?.toFixed(2) || "0.00"}%
                          </span>
                        </div>

                        {/* 세부 수익률 */}
                        <div className="text-xs border-t pt-2 mt-2 dark:border-gray-700 text-right sm:text-right">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">
                              배당{" "}
                            </span>
                            <span
                              className={`${
                                (stock.dividend_return_rate || 0) >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {stock.dividend_return_rate?.toFixed(1) || "0.0"}%
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {" "}
                              | 주가{" "}
                            </span>
                            <span
                              className={`${
                                (stock.stock_price_return_rate || 0) >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {(stock.stock_price_return_rate || 0) >= 0 ? "+" : ""}
                              {stock.stock_price_return_rate?.toFixed(1) || "0.0"}%
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="text-gray-500 dark:text-gray-400">
                              {stock.calculation_period_count || 0}회 배당 기준
                              {stock.trend_percentage && (
                                <span
                                  className={`ml-1 ${
                                    stock.trend_percentage > 0
                                      ? "text-green-600 dark:text-green-400"
                                      : stock.trend_percentage < 0
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-gray-500"
                                  }`}
                                >
                                  ({stock.trend_percentage > 0 ? "+" : ""}
                                  {stock.trend_percentage.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* 현재가 및 배당수익률 */}
                        <div className="flex items-center justify-end gap-2 border-t pt-2 dark:border-gray-700">
                          {stock.current_price && (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(stock.current_price)}
                            </span>
                          )}
                          {stock.dividend_yield && (
                            <Badge
                              className={getYieldBadgeColor(stock.dividend_yield)}
                            >
                              {stock.dividend_yield.toFixed(2)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}