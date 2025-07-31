"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  DollarSignIcon,
  BarChart3Icon,
  InfoIcon,
} from "lucide-react";

interface StockDetail {
  ticker: string;
  name: string;
  issuer: string;
  group_name: string;
  dividend_frequency: string;
  current_price?: number;
  dividend_yield?: number;
  description?: string;
  market_cap?: number;
  assets_under_management?: number;
  management_company?: string;
  nav?: number;
  listing_date?: string;
  shares_outstanding?: number;
  data_date?: string;
}

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change_percent: number;
}

interface DividendData {
  ex_dividend_date: string;
  pay_date: string;
  cash_amount: number;
  record_date?: string;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params.ticker as string;

  const [stock, setStock] = useState<StockDetail | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  const [dividendHistory, setDividendHistory] = useState<DividendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchStockDetail = async () => {
      if (!ticker) return;

      try {
        setLoading(true);

        // 병렬로 데이터 로드
        const [stockResponse, priceResponse, dividendResponse] =
          await Promise.all([
            fetch(`/api/stocks/${ticker}`),
            fetch(`/api/stocks/history/${ticker}?days=10`),
            fetch(`/api/dividends/${ticker}?limit=20`),
          ]);

        // 주식 기본 정보
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          if (stockData.success) {
            setStock(stockData.stock);
          }
        }

        // 주가 이력
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          if (priceData.success) {
            setPriceHistory(priceData.data);
          }
        }

        // 배당 이력
        if (dividendResponse.ok) {
          const dividendData = await dividendResponse.json();
          if (dividendData.success) {
            setDividendHistory(dividendData.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch stock detail:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStockDetail();
  }, [ticker]);

  // 가격 변화 색상
  const getPriceChangeColor = (changePercent: number) => {
    if (changePercent > 0) return "text-green-600 dark:text-green-400";
    if (changePercent < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  // 가격 변화 아이콘
  const getPriceChangeIcon = (changePercent: number) => {
    if (changePercent > 0) return <TrendingUpIcon className="w-4 h-4" />;
    if (changePercent < 0) return <TrendingDownIcon className="w-4 h-4" />;
    return null;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  // 날짜 포맷팅 (전체)
  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}년 ${month}월 ${day}일`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-900 dark:text-white">
              {ticker?.toUpperCase()} 정보를 불러오는 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-lg text-red-600 dark:text-red-400">
              {error || "주식 정보를 찾을 수 없습니다"}
            </div>
            <Button onClick={() => router.back()}>돌아가기</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-gray-600 dark:text-gray-400"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
        </div>

        {/* Stock Info Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {stock.ticker}
            </h1>
            {stock.dividend_frequency === "1W" && (
              <Badge
                variant="outline"
                className="text-sm px-2 py-1 border-blue-500 text-blue-600 dark:text-blue-400"
              >
                W
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm">
              {stock.issuer}{" "}
              {stock.issuer === "YieldMax"
                ? `${stock.group_name}조`
                : stock.group_name}
            </Badge>
          </div>

          <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            {stock.name}
          </h2>

          {/* Current Price & Yield */}
          <div className="flex items-baseline gap-2">
            {stock.current_price && (
              <span className="text-2xl font-bold text-gray-900 dark:text-white font-roboto">
                ${stock.current_price}
              </span>
            )}
            {stock.dividend_yield && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400 font-roboto">
                ({stock.dividend_yield.toFixed(2)}% 수익률)
              </span>
            )}
          </div>
        </div>

        {/* Stock Description */}
        {stock.description && (
          <Card className="mb-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">주식 정보</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                {stock.market_cap && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      시가총액
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white font-roboto">
                      ${(stock.market_cap / 1000000).toFixed(1)}M
                    </div>
                  </div>
                )}
                {stock.assets_under_management && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      운용자산
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white font-roboto">
                      ${(stock.assets_under_management / 1000000).toFixed(1)}M
                    </div>
                  </div>
                )}
                {stock.management_company && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      운용사
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {stock.management_company}
                    </div>
                  </div>
                )}
                {stock.nav && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      NAV
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white font-roboto">
                      ${stock.nav.toFixed(2)}
                    </div>
                  </div>
                )}
                {stock.listing_date && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      상장일
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(stock.listing_date).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                )}
                {stock.shares_outstanding && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      발행주식수
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white font-roboto">
                      {(stock.shares_outstanding / 1000000).toFixed(1)}M주
                    </div>
                    {stock.data_date && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        ({new Date(stock.data_date).toLocaleDateString("ko-KR")}{" "}
                        기준)
                      </div>
                    )}
                  </div>
                )}
              </div>
              {stock.description && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    설명
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {stock.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price History */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle>10일 주가 이력</CardTitle>
            </CardHeader>
            <CardContent>
              {priceHistory.length > 0 ? (
                <div
                  className="overflow-x-auto overflow-y-auto max-h-[150px] scrollbar-hide"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  <style jsx>{`
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-1 px-1 font-medium text-gray-900 dark:text-white">
                          일자
                        </th>
                        <th className="text-right py-1 px-1 font-medium text-gray-900 dark:text-white">
                          종가
                        </th>
                        <th className="text-right py-1 px-1 font-medium text-gray-900 dark:text-white">
                          등락률
                        </th>
                        <th className="text-right py-1 px-1 font-medium text-gray-900 dark:text-white">
                          거래량(주)
                        </th>
                        <th className="text-right py-1 px-1 font-medium text-gray-900 dark:text-white">
                          거래대금
                        </th>
                        <th className="text-right py-1 px-1 font-medium text-gray-900 dark:text-white">
                          시가
                        </th>
                        <th className="text-right py-1 px-1 font-medium text-gray-900 dark:text-white">
                          고가
                        </th>
                        <th className="text-right py-1 px-1 font-medium text-gray-900 dark:text-white">
                          저가
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceHistory.map((price, index) => (
                        <tr
                          key={price.date}
                          className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            index % 2 === 0
                              ? "bg-gray-50/50 dark:bg-gray-700/30"
                              : "bg-white dark:bg-gray-800"
                          }`}
                        >
                          <td className="py-1 px-1 font-medium text-gray-900 dark:text-white">
                            {formatDate(price.date)}
                          </td>
                          <td className="py-1 px-1 text-right font-medium text-gray-900 dark:text-white font-roboto">
                            ${price.close.toFixed(2)}
                          </td>
                          <td
                            className={`py-1 px-1 text-right font-medium font-roboto ${getPriceChangeColor(price.change_percent)}`}
                          >
                            {price.change_percent > 0 ? "+" : ""}
                            {price.change_percent.toFixed(2)}%
                          </td>
                          <td className="py-1 px-1 text-right text-xs text-gray-500 dark:text-gray-500 font-roboto">
                            {(price.volume / 1000).toFixed(0)}K
                          </td>
                          <td className="py-1 px-1 text-right text-xs text-gray-500 dark:text-gray-500 font-roboto">
                            $
                            {((price.volume * price.close) / 1000000).toFixed(
                              1,
                            )}
                            M
                          </td>
                          <td className="py-1 px-1 text-right text-gray-600 dark:text-gray-400 font-roboto">
                            ${price.open.toFixed(2)}
                          </td>
                          <td className="py-1 px-1 text-right text-gray-600 dark:text-gray-400 font-roboto">
                            ${price.high.toFixed(2)}
                          </td>
                          <td className="py-1 px-1 text-right text-gray-600 dark:text-gray-400 font-roboto">
                            ${price.low.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  주가 이력 데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dividend History */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle>배당 이력</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 배당 추세 그래프 */}
              {dividendHistory.length > 0 && (
                <div className="mb-3">
                  <svg
                    height="50"
                    viewBox="0 0 400 50"
                    className="overflow-visible"
                  >
                    {(() => {
                      const recentDividends = dividendHistory
                        .slice(0, 12)
                        .reverse(); // 최근 12개, 시간순 정렬

                      const amounts = recentDividends.map((d) => d.cash_amount);
                      const maxAmount = Math.max(...amounts);
                      const minAmount = 0; // 항상 0부터 시작
                      const range = maxAmount - minAmount || 1;

                      const width = 400; // viewBox 너비 (100% 사용)
                      const height = 50; // 실제 그래프 높이 (바닥 여유 공간 10px)

                      // 데이터 개수에 따른 간격 설정
                      let points = [];
                      let stepX: number;

                      if (recentDividends.length === 1) {
                        // 데이터가 1개인 경우 중앙에 배치
                        const x = width / 2;
                        const y =
                          5 +
                          (height - 5) -
                          ((recentDividends[0].cash_amount - minAmount) /
                            range) *
                            (height - 5);
                        points.push(`${x},${y}`);
                      } else {
                        // 2개 이상인 경우 양쪽 끝에서 10% 여백을 두고 균등 분할
                        const margin = width * 0.1; // 좌우 10% 여백
                        const availableWidth = width - margin * 2;
                        stepX =
                          availableWidth /
                          Math.max(recentDividends.length - 1, 1);

                        points = recentDividends.map((dividend, index) => {
                          const x = margin + index * stepX;
                          const y =
                            5 +
                            (height - 5) -
                            ((dividend.cash_amount - minAmount) / range) *
                              (height - 5);
                          return `${x},${y}`;
                        });
                      }

                      const pointsStr = points.join(" ");

                      // 바닥선을 위한 포인트 (0달러 기준)
                      const baselineY = 5 + (height - 5);
                      let areaPoints;

                      if (recentDividends.length === 1) {
                        // 단일 데이터인 경우 작은 영역 생성
                        const x = width / 2;
                        const areaWidth = 8;
                        areaPoints = `${x - areaWidth},${baselineY} ${pointsStr} ${x + areaWidth},${baselineY}`;
                      } else {
                        // 여러 데이터인 경우 전체 영역
                        areaPoints = `${points[0].split(",")[0]},${baselineY} ${pointsStr} ${points[points.length - 1].split(",")[0]},${baselineY}`;
                      }

                      return (
                        <g>
                          {/* 0달러 기준선 */}
                          <line
                            x1="0"
                            y1={baselineY}
                            x2={width}
                            y2={baselineY}
                            stroke="rgb(156, 163, 175)"
                            strokeWidth="0.5"
                            opacity="0.3"
                          />

                          {/* 영역 채우기 */}
                          <polygon
                            points={areaPoints}
                            fill="rgb(34, 197, 94)"
                            opacity="0.15"
                          />

                          {/* 선 그래프 */}
                          {recentDividends.length > 1 && (
                            <polyline
                              points={pointsStr}
                              fill="none"
                              stroke="rgb(34, 197, 94)"
                              strokeWidth="1.2"
                              className="drop-shadow-sm"
                            />
                          )}

                          {/* 데이터 포인트 */}
                          {recentDividends.map((dividend, index) => {
                            let x, y;
                            if (recentDividends.length === 1) {
                              x = width / 2;
                              y =
                                5 +
                                (height - 5) -
                                ((dividend.cash_amount - minAmount) / range) *
                                  (height - 5);
                            } else {
                              const margin = width * 0.1;
                              const availableWidth = width - margin * 2;
                              const stepX =
                                availableWidth /
                                Math.max(recentDividends.length - 1, 1);
                              x = margin + index * stepX;
                              y =
                                5 +
                                (height - 5) -
                                ((dividend.cash_amount - minAmount) / range) *
                                  (height - 5);
                            }

                            return (
                              <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="1.5"
                                fill="rgb(34, 197, 94)"
                                stroke="white"
                                strokeWidth="0.5"
                                className="drop-shadow-sm"
                              />
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              )}
              {dividendHistory.length > 0 ? (
                <div
                  className="overflow-x-auto overflow-y-auto max-h-[150px] scrollbar-hide"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  <style jsx>{`
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-1 px-1 font-medium text-gray-900 dark:text-white">
                          배당락일
                        </th>
                        <th className="text-left py-1 px-1 font-medium text-gray-900 dark:text-white">
                          배당 지급일
                        </th>
                        <th className="text-right py-1 px-1 font-medium text-gray-900 dark:text-white">
                          주당배당금
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dividendHistory.map((dividend, index) => (
                        <tr
                          key={`${dividend.ex_dividend_date}-${index}`}
                          className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            index % 2 === 0
                              ? "bg-gray-50/50 dark:bg-gray-700/30"
                              : "bg-white dark:bg-gray-800"
                          }`}
                        >
                          <td className="py-1 px-1 font-medium text-gray-900 dark:text-white">
                            {formatFullDate(dividend.ex_dividend_date)}
                          </td>
                          <td className="py-1 px-1 text-gray-600 dark:text-gray-400">
                            {formatFullDate(dividend.pay_date)}
                          </td>
                          <td className="py-1 px-1 text-right font-bold text-green-600 dark:text-green-400 font-roboto">
                            ${dividend.cash_amount.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dividendHistory.length > 20 && (
                    <div className="text-center pt-3 text-sm text-gray-500 dark:text-gray-400">
                      최근 20개 배당 기록만 표시
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  배당 이력 데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

