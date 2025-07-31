"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUpIcon, DollarSignIcon, CalendarIcon } from "lucide-react";
import Link from "next/link";

interface DividendStock {
  ticker: string;
  name: string;
  issuer: string;
  group_name: string;
  dividend_frequency: string;
  current_price?: number;
  dividend_yield?: number;
  quarterly_dividend_income?: number; // $1000 기준 3개월 배당 수익
  next_ex_date?: string;
  next_pay_date?: string;
}

export default function RankingPage() {
  const [stocks, setStocks] = useState<DividendStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // 배당주 데이터 로드
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch("/api/dividend-ranking");
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          setStocks(data.stocks);
        } else {
          throw new Error(data.message || "Failed to fetch dividend stocks");
        }
      } catch (error) {
        console.error("Failed to fetch dividend ranking:", error);
        setError(error instanceof Error ? error.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  // 수익률 배지 색상
  const getYieldBadgeColor = (yield_rate?: number) => {
    if (!yield_rate) return "bg-gray-100 text-gray-700";
    if (yield_rate >= 15) return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    if (yield_rate >= 10) return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    if (yield_rate >= 5) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  };

  // 배당 빈도 표시
  const getFrequencyText = (frequency: string) => {
    const freqMap: { [key: string]: string } = {
      "1W": "주간",
      "4W": "월간", 
      "1M": "월간",
      "3M": "분기",
      "6M": "반년",
      "1Y": "연간"
    };
    return freqMap[frequency] || frequency;
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
            <Button onClick={() => window.location.reload()}>
              다시 시도
            </Button>
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
          <p className="text-gray-600 dark:text-gray-400">
            $1,000 투자 시 3개월간 예상 배당 수익 기준 랭킹
          </p>
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
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* 랭킹 및 기본 정보 */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-full text-sm">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/stock/${stock.ticker}`}>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
                              {stock.ticker}
                            </h3>
                          </Link>
                          {stock.dividend_frequency === '1W' && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0 h-4 border-blue-500 text-blue-600 dark:text-blue-400"
                            >
                              W
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {stock.issuer} {stock.issuer === "YieldMax" ? `${stock.group_name}조` : stock.group_name}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {stock.name}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
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
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSignIcon className="w-4 h-4 text-green-600" />
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          ${stock.quarterly_dividend_income?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        3개월 배당수익 ($1,000 기준)
                      </div>

                      <div className="flex items-center gap-2">
                        {stock.current_price && (
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            ${stock.current_price}
                          </span>
                        )}
                        {stock.dividend_yield && (
                          <Badge className={getYieldBadgeColor(stock.dividend_yield)}>
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