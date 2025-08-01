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
  three_months_ago_price?: number;
  six_months_ago_price?: number;
  dividend_yield?: number;
  quarterly_dividend_income?: number; // $1000 기준 3개월 배당 수익
  six_month_dividend_income?: number; // $1000 기준 6개월 배당 수익
  dividends_data?: any[];
  next_ex_date?: string;
  next_pay_date?: string;
}

export default function RankingPage() {
  const [stocks, setStocks] = useState<DividendStock[]>([]);
  const [originalStocks, setOriginalStocks] = useState<DividendStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [period, setPeriod] = useState<"3M" | "6M">("3M");
  const [includePriceChange, setIncludePriceChange] = useState(false);
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
          setOriginalStocks(data.stocks);
          setStocks(data.stocks);
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
  }, []); // period 의존성 제거

  // 기간별 배당금 계산 함수
  const getDividendIncome = (stock: DividendStock) => {
    if (period === "6M") {
      // 6개월 데이터가 없으면 3개월 데이터의 2배로 추정 (임시)
      return (
        stock.six_month_dividend_income ||
        (stock.quarterly_dividend_income || 0) * 2
      );
    } else {
      return stock.quarterly_dividend_income || 0;
    }
  };

  // 기간 변경 및 총수익률 포함 여부에 따른 랭킹 재정렬
  useEffect(() => {
    if (originalStocks.length === 0) return;

    const sortedStocks = [...originalStocks].sort((a, b) => {
      const aDividend = getDividendIncome(a);
      const bDividend = getDividendIncome(b);

      if (includePriceChange) {
        // 총수익률 포함: 배당금 + 주가 변동 수익
        const aPriceChange = calculateStockPriceChange(a);
        const bPriceChange = calculateStockPriceChange(b);

        const aTotalReturn = aDividend + (aPriceChange?.priceChangeAmount || 0);
        const bTotalReturn = bDividend + (bPriceChange?.priceChangeAmount || 0);

        return bTotalReturn - aTotalReturn;
      } else {
        // 배당금만: 기간별 배당금으로 정렬
        return bDividend - aDividend;
      }
    });

    setStocks(sortedStocks);
  }, [includePriceChange, originalStocks, period]);

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

  // 기간별 주가 기준 주식 가격 차익 계산
  const calculateStockPriceChange = (stock: DividendStock) => {
    const pastPrice =
      period === "6M"
        ? stock.six_months_ago_price
        : stock.three_months_ago_price;

    if (!stock.current_price || !pastPrice) {
      // 6개월 데이터가 없으면 3개월 데이터 사용하여 추정
      if (
        period === "6M" &&
        stock.three_months_ago_price &&
        stock.current_price
      ) {
        console.log(`Using 3M price for 6M calculation for ${stock.ticker}`);
        const baseInvestment = 1000;
        const shares = baseInvestment / stock.three_months_ago_price;
        const pastStockValue = shares * stock.three_months_ago_price;
        const currentStockValue = shares * stock.current_price;
        const priceChangeAmount = currentStockValue - pastStockValue;
        const priceChangePercent = (priceChangeAmount / pastStockValue) * 100;

        return {
          priceChangeAmount: priceChangeAmount * 2, // 6개월 추정 (2배)
          priceChangePercent: priceChangePercent * 2,
          shares,
          threeMonthsAgoPrice: stock.three_months_ago_price,
        };
      }
      return null;
    }

    // 기준 투자금액 (USD 기준 $1000)
    const baseInvestment = 1000;

    // 기간 전 구매 가능한 주식 수
    const shares = baseInvestment / pastPrice;

    // 기간 전 주식 가치 vs 현재 주식 가치
    const pastStockValue = shares * pastPrice; // = baseInvestment (1000)
    const currentStockValue = shares * stock.current_price;

    // 주식 가격 차익 계산
    const priceChangeAmount = currentStockValue - pastStockValue;
    const priceChangePercent = (priceChangeAmount / pastStockValue) * 100;

    return {
      priceChangeAmount,
      priceChangePercent,
      shares,
      threeMonthsAgoPrice: pastPrice,
    };
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
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            배당주 랭킹
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {currency === "USD"
              ? `$1,000 투자 시 ${period === "3M" ? "3개월" : "6개월"}간 예상 배당 수익 기준 랭킹`
              : `₩1,300,000 투자 시 ${period === "3M" ? "3개월" : "6개월"}간 예상 배당 수익 기준 랭킹`}
          </p>

          {/* 필터 컨트롤 */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                필터
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                기간:
              </label>
              <Select
                value={period}
                onValueChange={(value: "3M" | "6M") => setPeriod(value)}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3M">3개월</SelectItem>
                  <SelectItem value="6M">6개월</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                총수익률 포함:
              </label>
              <Button
                variant={includePriceChange ? "default" : "outline"}
                size="sm"
                onClick={() => setIncludePriceChange(!includePriceChange)}
                className="h-8 px-3"
              >
                {includePriceChange ? "ON" : "OFF"}
              </Button>
            </div>
          </div>
        </div>

        {stocks.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="text-center py-12">
              <div className="text-gray-600 dark:text-gray-400">
                배당주 데이터가 없습니다.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {stocks.map((stock, index) => (
              <Card
                key={stock.ticker}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow !py-0"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    {/* 랭킹 및 기본 정보 */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-full text-sm">
                        {index + 1}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
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

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {stock.name}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {getFrequencyText(stock.dividend_frequency)} 배당
                          </span>
                          {stock.next_ex_date && (
                            <span>다음 배당락일: {stock.next_ex_date}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 수익 정보 */}
                    <div className="text-right">
                      {/* 3개월 배당금 총합 */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          총 배당금
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            getDividendIncome(stock) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {getDividendIncome(stock) >= 0 ? "+" : ""}
                          {formatCurrency(getDividendIncome(stock))}
                        </span>
                      </div>

                      {/* 주식 가격 차익 */}
                      {(() => {
                        const priceChange = calculateStockPriceChange(stock);
                        if (!priceChange) return null;

                        const isPositive = priceChange.priceChangeAmount >= 0;
                        return (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              총 수익금
                            </span>
                            <span
                              className={`text-lg font-bold ${
                                isPositive
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {isPositive ? "+" : "-"}
                              {formatCurrency(
                                Math.abs(priceChange.priceChangeAmount),
                              )}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-end gap-2">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
