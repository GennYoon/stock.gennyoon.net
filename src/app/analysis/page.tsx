"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useCurrency } from "@/shared/hooks/use-currency";
import { 
  TrendingUp, 
  TrendingDown,
  Filter,
  Search,
  ArrowUpDown,
  AlertCircle,
  Shield,
  Zap,
  Target,
  BarChart3,
  DollarSign,
  Calendar,
  Info,
  Star,
  StarOff,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface HighDividendStock {
  id: string;
  ticker: string;
  name: string;
  currentPrice: number;
  dividendYield: number;
  annualDividend: number;
  monthlyDividend: number;
  dividendFrequency: string;
  payoutRatio: number;
  dividendGrowthRate: number;
  sector: string;
  marketCap: number;
  peRatio: number;
  volatility: number;
  dividendScore: number;
  riskScore: number;
  sustainabilityScore: number;
  isFavorite: boolean;
}

interface FilterCriteria {
  minYield: number;
  maxYield: number;
  sectors: string[];
  frequency: string;
  minMarketCap: number;
  maxPayoutRatio: number;
  minSustainabilityScore: number;
}

export default function AnalysisPage() {
  const { formatCurrency } = useCurrency();
  const [stocks, setStocks] = useState<HighDividendStock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<HighDividendStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"yield" | "dividend" | "score" | "risk">("yield");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<FilterCriteria>({
    minYield: 0,
    maxYield: 100,
    sectors: [],
    frequency: "all",
    minMarketCap: 0,
    maxPayoutRatio: 100,
    minSustainabilityScore: 0
  });

  // Mock data - 실제로는 API에서 가져올 데이터
  const mockStocks: HighDividendStock[] = [
    {
      id: "1",
      ticker: "CONY",
      name: "YieldMax™ COIN Option Income Strategy ETF",
      currentPrice: 13.94,
      dividendYield: 85.0,
      annualDividend: 11.85,
      monthlyDividend: 0.99,
      dividendFrequency: "monthly",
      payoutRatio: 0,
      dividendGrowthRate: 15.2,
      sector: "ETF - Option Income",
      marketCap: 450000000,
      peRatio: 0,
      volatility: 28.5,
      dividendScore: 92,
      riskScore: 75,
      sustainabilityScore: 85,
      isFavorite: true
    },
    {
      id: "2",
      ticker: "MSTY",
      name: "YieldMax™ MSTR Option Income Strategy ETF",
      currentPrice: 17.43,
      dividendYield: 68.0,
      annualDividend: 11.85,
      monthlyDividend: 0.99,
      dividendFrequency: "monthly",
      payoutRatio: 0,
      dividendGrowthRate: 12.8,
      sector: "ETF - Option Income",
      marketCap: 380000000,
      peRatio: 0,
      volatility: 32.1,
      dividendScore: 88,
      riskScore: 68,
      sustainabilityScore: 82,
      isFavorite: true
    },
    {
      id: "3",
      ticker: "NVDY",
      name: "YieldMax™ NVDA Option Income Strategy ETF",
      currentPrice: 16.72,
      dividendYield: 72.0,
      annualDividend: 12.04,
      monthlyDividend: 1.00,
      dividendFrequency: "monthly",
      payoutRatio: 0,
      dividendGrowthRate: 18.5,
      sector: "ETF - Option Income",
      marketCap: 520000000,
      peRatio: 0,
      volatility: 25.3,
      dividendScore: 90,
      riskScore: 72,
      sustainabilityScore: 88,
      isFavorite: true
    },
    {
      id: "4",
      ticker: "TSLY",
      name: "YieldMax™ TSLA Option Income Strategy ETF",
      currentPrice: 14.85,
      dividendYield: 65.0,
      annualDividend: 9.65,
      monthlyDividend: 0.80,
      dividendFrequency: "monthly",
      payoutRatio: 0,
      dividendGrowthRate: 10.2,
      sector: "ETF - Option Income",
      marketCap: 680000000,
      peRatio: 0,
      volatility: 30.7,
      dividendScore: 85,
      riskScore: 70,
      sustainabilityScore: 80,
      isFavorite: false
    },
    {
      id: "5",
      ticker: "QYLD",
      name: "Global X NASDAQ 100 Covered Call ETF",
      currentPrice: 16.89,
      dividendYield: 12.5,
      annualDividend: 2.11,
      monthlyDividend: 0.18,
      dividendFrequency: "monthly",
      payoutRatio: 95,
      dividendGrowthRate: -2.1,
      sector: "ETF - Covered Call",
      marketCap: 7500000000,
      peRatio: 0,
      volatility: 15.2,
      dividendScore: 75,
      riskScore: 45,
      sustainabilityScore: 70,
      isFavorite: false
    },
    {
      id: "6",
      ticker: "JEPI",
      name: "JPMorgan Equity Premium Income ETF",
      currentPrice: 57.23,
      dividendYield: 7.2,
      annualDividend: 4.12,
      monthlyDividend: 0.34,
      dividendFrequency: "monthly",
      payoutRatio: 85,
      dividendGrowthRate: 5.3,
      sector: "ETF - Equity Income",
      marketCap: 35000000000,
      peRatio: 0,
      volatility: 8.9,
      dividendScore: 82,
      riskScore: 35,
      sustainabilityScore: 90,
      isFavorite: false
    }
  ];

  // 필터링 및 정렬 로직
  const applyFiltersAndSort = () => {
    let filtered = [...stocks];

    // 검색어 필터
    if (searchQuery) {
      filtered = filtered.filter(stock => 
        stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 수익률 필터
    filtered = filtered.filter(stock => 
      stock.dividendYield >= filters.minYield &&
      stock.dividendYield <= filters.maxYield
    );

    // 섹터 필터
    if (filters.sectors.length > 0) {
      filtered = filtered.filter(stock => 
        filters.sectors.includes(stock.sector)
      );
    }

    // 배당 주기 필터
    if (filters.frequency !== "all") {
      filtered = filtered.filter(stock => 
        stock.dividendFrequency === filters.frequency
      );
    }

    // 시가총액 필터
    filtered = filtered.filter(stock => 
      stock.marketCap >= filters.minMarketCap
    );

    // 배당성향 필터
    filtered = filtered.filter(stock => 
      stock.payoutRatio <= filters.maxPayoutRatio
    );

    // 지속가능성 점수 필터
    filtered = filtered.filter(stock => 
      stock.sustainabilityScore >= filters.minSustainabilityScore
    );

    // 정렬
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case "yield":
          compareValue = a.dividendYield - b.dividendYield;
          break;
        case "dividend":
          compareValue = a.annualDividend - b.annualDividend;
          break;
        case "score":
          compareValue = a.dividendScore - b.dividendScore;
          break;
        case "risk":
          compareValue = a.riskScore - b.riskScore;
          break;
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    setFilteredStocks(filtered);
  };

  useEffect(() => {
    // 실제로는 API 호출
    setTimeout(() => {
      setStocks(mockStocks);
      setFilteredStocks(mockStocks);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, sortBy, sortOrder, filters, stocks]);

  const toggleFavorite = (id: string) => {
    setStocks(prev => prev.map(stock => 
      stock.id === id ? { ...stock, isFavorite: !stock.isFavorite } : stock
    ));
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return { label: "높음", color: "destructive" };
    if (score >= 40) return { label: "중간", color: "warning" };
    return { label: "낮음", color: "success" };
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 section-spacing">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold toss-text-gradient mb-2">
              초고배당주 분석
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              고수익 배당주 발굴 및 위험도 분석
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="toss-button-secondary"
            >
              <Filter className="h-4 w-4 mr-2" />
              필터 {showFilters ? "숨기기" : "보기"}
            </Button>
            <Button className="toss-button-primary">
              <Sparkles className="h-4 w-4 mr-2" />
              AI 추천
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-8">
          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">평균 배당수익률</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {(filteredStocks.reduce((sum, s) => sum + s.dividendYield, 0) / filteredStocks.length || 0).toFixed(1)}%
            </div>
            <div className="text-xs price-up font-medium">연간 기준</div>
          </div>

          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">최고 수익률</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {Math.max(...filteredStocks.map(s => s.dividendYield), 0).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground font-medium">CONY</div>
          </div>

          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">분석 종목수</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {filteredStocks.length}개
            </div>
            <div className="text-xs text-muted-foreground font-medium">총 {stocks.length}개 중</div>
          </div>

          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">추천 등급</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              A+
            </div>
            <div className="text-xs price-up font-medium">우수</div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="toss-card p-4 md:p-6 mb-6">
            <h3 className="font-semibold text-base md:text-lg mb-4">상세 필터</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 배당수익률 범위 */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  배당수익률 범위: {filters.minYield}% - {filters.maxYield}%
                </label>
                <div className="px-2">
                  <Slider
                    value={[filters.minYield, filters.maxYield]}
                    onValueChange={([min, max]) => 
                      setFilters(prev => ({ ...prev, minYield: min, maxYield: max }))
                    }
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* 배당 주기 */}
              <div>
                <label className="text-sm font-medium mb-2 block">배당 주기</label>
                <Select 
                  value={filters.frequency}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="monthly">월배당</SelectItem>
                    <SelectItem value="quarterly">분기배당</SelectItem>
                    <SelectItem value="annual">연배당</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 지속가능성 점수 */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  최소 지속가능성 점수: {filters.minSustainabilityScore}점
                </label>
                <div className="px-2">
                  <Slider
                    value={[filters.minSustainabilityScore]}
                    onValueChange={([value]) => 
                      setFilters(prev => ({ ...prev, minSustainabilityScore: value }))
                    }
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Sort Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="종목명 또는 티커로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 toss-input"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yield">배당수익률</SelectItem>
                <SelectItem value="dividend">연간배당금</SelectItem>
                <SelectItem value="score">종합점수</SelectItem>
                <SelectItem value="risk">위험도</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stock Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStocks.map((stock) => (
            <div key={stock.id} className="toss-card hover:shadow-lg transition-shadow duration-200">
              <div className="p-4 md:p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{stock.ticker}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{stock.ticker}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{stock.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(stock.id)}
                    className="h-8 w-8 p-0"
                  >
                    {stock.isFavorite ? (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Main Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">배당수익률</span>
                    <span className="text-lg font-bold text-green-600">
                      {stock.dividendYield.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">월 배당금</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(stock.monthlyDividend)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">현재가</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(stock.currentPrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">배당 성장률</span>
                    <span className={`text-sm font-medium ${
                      stock.dividendGrowthRate >= 0 ? 'price-up' : 'price-down'
                    }`}>
                      {stock.dividendGrowthRate >= 0 ? '+' : ''}{stock.dividendGrowthRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Score Indicators */}
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-blue-500" />
                      <span>종합점수</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(stock.dividendScore)}`}>
                      {stock.dividendScore}점
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span>위험도</span>
                    </div>
                    <Badge variant={getRiskBadge(stock.riskScore).color as any} className="text-xs">
                      {getRiskBadge(stock.riskScore).label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span>지속가능성</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(stock.sustainabilityScore)}`}>
                      {stock.sustainabilityScore}점
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <Button className="w-full mt-4 toss-button-secondary" size="sm">
                  상세 분석
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Investment Tips */}
        <div className="dividend-section">
          <h2 className="dividend-section-title">투자 전략 가이드</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="toss-card p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-sm">안정형 투자</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                지속가능성 점수 80점 이상, 위험도 낮음 등급의 종목을 선택하여 안정적인 월 배당 수익을 추구하세요.
              </p>
            </div>

            <div className="toss-card p-4 border-l-4 border-l-orange-500">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-sm">성장형 투자</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                배당 성장률 10% 이상인 종목에 집중하여 장기적인 배당금 증가를 목표로 하세요.
              </p>
            </div>

            <div className="toss-card p-4 border-l-4 border-l-purple-500">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-sm">균형형 투자</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                종합점수 85점 이상, 다양한 섹터에 분산 투자하여 리스크를 관리하면서 수익을 추구하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}