"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrendingUp, DollarSign, Calendar, BarChart3 } from "lucide-react";
import yieldMaxETFs from "@/assets/data/list.json";

interface DividendETF {
  id: string;
  name: string;
  ticker: string;
  distributionRate: number;
  secYield: number;
  strategy: string;
  nextPaymentDate: string;
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "distributionRate" | "nextPaymentDate" | "secYield"
  >("distributionRate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedETF, setSelectedETF] = useState<DividendETF | null>(null);

  const filteredETFs = yieldMaxETFs.filter(
    (etf) =>
      etf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      etf.ticker.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedETFs = [...filteredETFs].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === "nextPaymentDate") {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getStrategyBadgeVariant = (strategy: string) => {
    switch (strategy) {
      case "Covered Call":
        return "default";
      case "Fund of Funds":
        return "secondary";
      case "Short Option":
        return "destructive";
      case "Portfolio ETF":
        return "outline";
      case "0DTE":
        return "secondary";
      case "Target 12™":
        return "outline";
      default:
        return "outline";
    }
  };

  const averageDistributionRate = yieldMaxETFs.reduce((sum, etf) => sum + etf.distributionRate, 0) / yieldMaxETFs.length;
  const maxDistributionRate = Math.max(...yieldMaxETFs.map(etf => etf.distributionRate));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold toss-text-gradient">
              YieldMax ETFs
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              고수익 옵션 전략 ETF 배당 정보
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="toss-metric-card text-center p-3">
            <div className="flex items-center justify-center mb-1">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-foreground">{yieldMaxETFs.length}</div>
            <div className="text-xs text-muted-foreground font-medium">총 ETF 수</div>
          </div>
          <div className="toss-metric-card text-center p-3">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-lg font-bold text-foreground">{averageDistributionRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground font-medium">평균 분배율</div>
          </div>
          <div className="toss-metric-card text-center p-3">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-lg font-bold text-foreground">{maxDistributionRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground font-medium">최고 분배율</div>
          </div>
          <div className="toss-metric-card text-center p-3">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-foreground">{sortedETFs.length}</div>
            <div className="text-xs text-muted-foreground font-medium">검색 결과</div>
          </div>
        </div>

        {/* Search */}
        <div className="toss-card p-6">
          <Input
            type="text"
            placeholder="ETF 이름 또는 티커로 검색 (예: MSTY, Tesla)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="toss-input text-base"
          />
        </div>

        {/* Sort Controls - Mobile Friendly */}
        <div className="toss-card p-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              className={sortBy === "name" ? "toss-button-primary" : "toss-button-secondary"}
              size="sm"
              onClick={() => handleSort("name")}
            >
              이름순 {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </Button>
            <Button 
              className={sortBy === "distributionRate" ? "toss-button-primary" : "toss-button-secondary"}
              size="sm"
              onClick={() => handleSort("distributionRate")}
            >
              분배율 {sortBy === "distributionRate" && (sortOrder === "asc" ? "↑" : "↓")}
            </Button>
            <Button 
              className={sortBy === "secYield" ? "toss-button-primary" : "toss-button-secondary"}
              size="sm"
              onClick={() => handleSort("secYield")}
            >
              SEC수익률 {sortBy === "secYield" && (sortOrder === "asc" ? "↑" : "↓")}
            </Button>
          </div>
        </div>

        {/* ETF Cards - Toss Style */}
        <div className="space-y-4">
          {sortedETFs.map((etf) => (
            <div key={etf.id} className="toss-card p-6 cursor-pointer group hover:shadow-lg" onClick={() => setSelectedETF(etf)}>
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                      {etf.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xl font-mono font-bold toss-text-gradient">
                        {etf.ticker}
                      </p>
                      <Badge variant={getStrategyBadgeVariant(etf.strategy)} className="rounded-full px-3 py-1">
                        {etf.strategy}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-800/30">
                    <div className="text-2xl md:text-3xl font-black text-green-700 dark:text-green-400">
                      {etf.distributionRate.toFixed(2)}%
                    </div>
                    <div className="text-sm font-semibold text-green-600/80 dark:text-green-400/80 mt-1">분배율</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950/30 dark:to-cyan-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
                    <div className="text-2xl md:text-3xl font-black text-blue-700 dark:text-blue-400">
                      {etf.secYield.toFixed(2)}%
                    </div>
                    <div className="text-sm font-semibold text-blue-600/80 dark:text-blue-400/80 mt-1">SEC 수익률</div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold">다음 지급일:</span>
                    <span className="ml-2 font-mono font-bold text-foreground">{etf.nextPaymentDate}</span>
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    자세히 보기 →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedETFs.length === 0 && (
          <div className="toss-card p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-bold mb-2">검색 결과가 없습니다</h3>
            <p className="text-muted-foreground">
              다른 키워드로 검색해 보세요
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedETF} onOpenChange={() => setSelectedETF(null)}>
        <DialogContent className="max-w-md mx-4 toss-card">
          <DialogHeader>
            <DialogTitle className="text-lg toss-text-gradient">{selectedETF?.name}</DialogTitle>
            <DialogDescription>
              {selectedETF?.ticker} - {selectedETF?.strategy} 전략
            </DialogDescription>
          </DialogHeader>
          {selectedETF && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-800/30">
                  <div className="text-3xl font-black text-green-700 dark:text-green-400">
                    {selectedETF.distributionRate.toFixed(2)}%
                  </div>
                  <div className="text-sm font-semibold text-green-600/80 dark:text-green-400/80 mt-1">분배율</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950/30 dark:to-cyan-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
                  <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                    {selectedETF.secYield.toFixed(2)}%
                  </div>
                  <div className="text-sm font-semibold text-blue-600/80 dark:text-blue-400/80 mt-1">SEC 수익률</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">티커</span>
                  <span className="font-mono font-bold text-lg toss-text-gradient">{selectedETF.ticker}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">전략</span>
                  <Badge variant={getStrategyBadgeVariant(selectedETF.strategy)} className="rounded-full">
                    {selectedETF.strategy}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">다음 지급일</span>
                  <span className="font-mono font-bold">{selectedETF.nextPaymentDate}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}