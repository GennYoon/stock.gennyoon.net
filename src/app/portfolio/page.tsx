"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  PieChart,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { useCurrency } from "@/shared/hooks/use-currency";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// 임시 포트폴리오 데이터 타입
interface PortfolioStock {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
  dividendYield: number;
  annualDividend: number;
  lastUpdated: string;
}

// 임시 샘플 데이터
const samplePortfolio: PortfolioStock[] = [
  {
    id: "1",
    ticker: "TSLY",
    name: "YieldMax TSLA Option Income Strategy ETF",
    shares: 100,
    avgPrice: 15.25,
    currentPrice: 16.80,
    totalValue: 1680,
    gainLoss: 155,
    gainLossPercent: 10.16,
    dividendYield: 8.5,
    annualDividend: 142.8,
    lastUpdated: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    ticker: "NVDY",
    name: "YieldMax NVDA Option Income Strategy ETF",
    shares: 50,
    avgPrice: 22.40,
    currentPrice: 21.15,
    totalValue: 1057.5,
    gainLoss: -62.5,
    gainLossPercent: -5.58,
    dividendYield: 12.3,
    annualDividend: 130.1,
    lastUpdated: "2024-01-15T10:30:00Z",
  },
  {
    id: "3",
    ticker: "MSTY",
    name: "YieldMax MSTR Option Income Strategy ETF",
    shares: 75,
    avgPrice: 18.90,
    currentPrice: 20.45,
    totalValue: 1533.75,
    gainLoss: 116.25,
    gainLossPercent: 8.20,
    dividendYield: 15.2,
    annualDividend: 233.1,
    lastUpdated: "2024-01-15T10:30:00Z",
  },
];

export default function PortfolioPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const { formatCurrency } = useCurrency();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        // 임시로 샘플 데이터 사용
        if (user) {
          setPortfolio(samplePortfolio);
        }
      } catch (error) {
        console.error("Failed to get user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [supabase.auth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-900 dark:text-white">
              포트폴리오를 불러오는 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600 dark:text-red-400">
              로그인이 필요합니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 포트폴리오 총합 계산
  const totalValue = portfolio.reduce((sum, stock) => sum + stock.totalValue, 0);
  const totalGainLoss = portfolio.reduce((sum, stock) => sum + stock.gainLoss, 0);
  const totalGainLossPercent = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;
  const totalAnnualDividend = portfolio.reduce((sum, stock) => sum + stock.annualDividend, 0);
  const avgDividendYield = totalValue > 0 ? (totalAnnualDividend / totalValue) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                내주식
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                보유 중인 배당주 포트폴리오를 관리하고 분석할 수 있습니다
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              주식 추가
            </Button>
          </div>
        </div>

        {portfolio.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="text-center py-12">
              <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                포트폴리오가 비어있습니다
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                첫 번째 배당주를 추가하여 포트폴리오를 시작해보세요
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                주식 추가하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 포트폴리오 요약 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      총 평가액
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalValue)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {totalGainLoss >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      총 손익
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      totalGainLoss >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {totalGainLoss >= 0 ? "+" : ""}
                    {formatCurrency(totalGainLoss)}
                  </div>
                  <div
                    className={`text-sm ${
                      totalGainLoss >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {totalGainLossPercent >= 0 ? "+" : ""}
                    {totalGainLossPercent.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      평균 배당률
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {avgDividendYield.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      연간 배당금
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(totalAnnualDividend)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 주식 목록 */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  보유 주식
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolio.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                            {stock.ticker}
                          </h3>
                          <Badge
                            variant={
                              stock.gainLoss >= 0 ? "success" : "destructive"
                            }
                            className="text-xs"
                          >
                            {stock.gainLoss >= 0 ? "+" : ""}
                            {stock.gainLossPercent.toFixed(2)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {stock.name}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="font-medium">보유수량:</span>{" "}
                            {stock.shares}주
                          </div>
                          <div>
                            <span className="font-medium">평균단가:</span>{" "}
                            {formatCurrency(stock.avgPrice)}
                          </div>
                          <div>
                            <span className="font-medium">현재가:</span>{" "}
                            {formatCurrency(stock.currentPrice)}
                          </div>
                          <div>
                            <span className="font-medium">배당률:</span>{" "}
                            {stock.dividendYield.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="sm:text-right mt-3 sm:mt-0">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(stock.totalValue)}
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            stock.gainLoss >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {stock.gainLoss >= 0 ? "+" : ""}
                          {formatCurrency(stock.gainLoss)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          연간 배당: {formatCurrency(stock.annualDividend)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 임시 알림 */}
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 mt-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                      임시 데이터 안내
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      현재 표시된 포트폴리오는 데모용 샘플 데이터입니다. 실제 포트폴리오 관리 기능은 향후 업데이트에서 제공될 예정입니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}