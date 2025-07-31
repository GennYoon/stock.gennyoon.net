"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/shared/hooks/use-currency";
import { usePortfolio } from "@/shared/hooks/use-portfolio";
import { 
  Wallet,
  TrendingUp,
  Calendar,
  Clock,
  Target,
  BarChart3,
  PieChart,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  Activity
} from "lucide-react";

interface RecoveryData {
  totalInvestment: number;
  totalDividendsReceived: number;
  recoveryPercentage: number;
  monthlyAverageDividend: number;
  timeToFullRecovery: number; // months
  recoveryDate: Date;
  dividendGrowthRate: number;
  currentYield: number;
}

interface MonthlyDividendHistory {
  month: string;
  year: number;
  amount: number;
  cumulative: number;
  recoveryPercentage: number;
}

interface StockRecoveryDetail {
  ticker: string;
  name: string;
  investment: number;
  dividendsReceived: number;
  recoveryPercentage: number;
  monthlyDividend: number;
  timeToRecovery: number;
  status: 'recovered' | 'on-track' | 'slow' | 'at-risk';
}

export default function RecoveryPage() {
  const { formatCurrency } = useCurrency();
  const { portfolioData, summary } = usePortfolio();
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyDividendHistory[]>([]);
  const [stockDetails, setStockDetails] = useState<StockRecoveryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'6m' | '1y' | '2y' | 'all'>('1y');

  // Mock 데이터 생성
  useEffect(() => {
    if (summary && portfolioData.length > 0) {
      // 전체 원금 회수 데이터 계산
      const totalInvestment = summary.totalCost;
      const totalDividendsReceived = totalInvestment * 0.32; // 32% 회수 가정
      const recoveryPercentage = (totalDividendsReceived / totalInvestment) * 100;
      const monthlyAverageDividend = summary.monthlyDividend;
      const timeToFullRecovery = Math.ceil((totalInvestment - totalDividendsReceived) / monthlyAverageDividend);
      
      const recoveryDate = new Date();
      recoveryDate.setMonth(recoveryDate.getMonth() + timeToFullRecovery);

      setRecoveryData({
        totalInvestment,
        totalDividendsReceived,
        recoveryPercentage,
        monthlyAverageDividend,
        timeToFullRecovery,
        recoveryDate,
        dividendGrowthRate: 8.5,
        currentYield: summary.portfolioYield
      });

      // 월별 배당 히스토리 생성
      const history: MonthlyDividendHistory[] = [];
      let cumulative = 0;
      const currentDate = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(currentDate.getMonth() - i);
        
        const monthlyAmount = monthlyAverageDividend * (0.8 + Math.random() * 0.4);
        cumulative += monthlyAmount;
        
        history.push({
          month: date.toLocaleDateString('ko-KR', { month: 'short' }),
          year: date.getFullYear(),
          amount: monthlyAmount,
          cumulative,
          recoveryPercentage: (cumulative / totalInvestment) * 100
        });
      }
      
      setMonthlyHistory(history);

      // 개별 주식 회수율 상세
      const details: StockRecoveryDetail[] = portfolioData.map(stock => {
        const investment = stock.shares * stock.avgPrice;
        const monthlyDividend = stock.monthlyDividend;
        const dividendsReceived = investment * (0.2 + Math.random() * 0.3);
        const recoveryPercentage = (dividendsReceived / investment) * 100;
        const timeToRecovery = Math.ceil((investment - dividendsReceived) / monthlyDividend);
        
        let status: StockRecoveryDetail['status'] = 'on-track';
        if (recoveryPercentage >= 100) status = 'recovered';
        else if (timeToRecovery > 120) status = 'slow';
        else if (timeToRecovery > 180) status = 'at-risk';
        
        return {
          ticker: stock.ticker,
          name: stock.name,
          investment,
          dividendsReceived,
          recoveryPercentage,
          monthlyDividend,
          timeToRecovery,
          status
        };
      });
      
      setStockDetails(details);
      setLoading(false);
    }
  }, [portfolioData, summary]);

  const getStatusColor = (status: StockRecoveryDetail['status']) => {
    switch (status) {
      case 'recovered': return 'text-green-600';
      case 'on-track': return 'text-blue-600';
      case 'slow': return 'text-yellow-600';
      case 'at-risk': return 'text-red-600';
    }
  };

  const getStatusBadge = (status: StockRecoveryDetail['status']) => {
    switch (status) {
      case 'recovered': return { label: '회수완료', variant: 'success' };
      case 'on-track': return { label: '정상진행', variant: 'default' };
      case 'slow': return { label: '진행느림', variant: 'warning' };
      case 'at-risk': return { label: '주의필요', variant: 'destructive' };
    }
  };

  const getRecoveryProgress = (percentage: number) => {
    if (percentage >= 100) return { label: '완료', color: 'bg-green-500' };
    if (percentage >= 75) return { label: '우수', color: 'bg-blue-500' };
    if (percentage >= 50) return { label: '양호', color: 'bg-yellow-500' };
    if (percentage >= 25) return { label: '진행중', color: 'bg-orange-500' };
    return { label: '초기', color: 'bg-gray-500' };
  };

  if (loading || !recoveryData) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
              원금 회수율 추적
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              배당금으로 투자 원금 회수 진행 상황을 분석합니다
            </p>
          </div>
          <Button 
            className="toss-button-primary mt-4 md:mt-0"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            데이터 새로고침
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-8">
          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">총 투자 원금</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {formatCurrency(recoveryData.totalInvestment)}
            </div>
            <div className="text-xs text-muted-foreground font-medium">전체 포트폴리오</div>
          </div>

          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">회수된 금액</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {formatCurrency(recoveryData.totalDividendsReceived)}
            </div>
            <div className="text-xs price-up font-medium">
              {recoveryData.recoveryPercentage.toFixed(1)}% 회수
            </div>
          </div>

          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">월평균 배당</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {formatCurrency(recoveryData.monthlyAverageDividend)}
            </div>
            <div className="text-xs text-muted-foreground font-medium">최근 12개월</div>
          </div>

          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">완전 회수 예상</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {recoveryData.timeToFullRecovery}개월
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {recoveryData.recoveryDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>

        {/* Recovery Progress Bar */}
        <div className="toss-card p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              원금 회수 진행률
            </h3>
            <Badge variant={getRecoveryProgress(recoveryData.recoveryPercentage).label === '완료' ? 'success' : 'default'}>
              {getRecoveryProgress(recoveryData.recoveryPercentage).label}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>회수 진행</span>
                <span className="font-medium">{recoveryData.recoveryPercentage.toFixed(1)}%</span>
              </div>
              <div className="h-8 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getRecoveryProgress(recoveryData.recoveryPercentage).color} transition-all duration-500 relative`}
                  style={{ width: `${Math.min(recoveryData.recoveryPercentage, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center">
                <div className="text-muted-foreground text-xs">투자 시작일</div>
                <div className="font-medium">2023년 1월</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-xs">경과 기간</div>
                <div className="font-medium">24개월</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-xs">남은 금액</div>
                <div className="font-medium text-orange-600">
                  {formatCurrency(recoveryData.totalInvestment - recoveryData.totalDividendsReceived)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-xs">예상 완료일</div>
                <div className="font-medium text-blue-600">
                  {recoveryData.recoveryDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Dividend Trend */}
          <div className="toss-card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                월별 배당 수익 추이
              </h3>
              <div className="flex gap-1">
                {(['6m', '1y', '2y', 'all'] as const).map((period) => (
                  <Button
                    key={period}
                    size="sm"
                    variant={selectedPeriod === period ? 'default' : 'ghost'}
                    onClick={() => setSelectedPeriod(period)}
                    className="text-xs"
                  >
                    {period === '6m' ? '6개월' : period === '1y' ? '1년' : period === '2y' ? '2년' : '전체'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {monthlyHistory.slice(-6).map((month, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">
                      {month.year}년 {month.month}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {month.recoveryPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(month.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      누적 {formatCurrency(month.cumulative)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">평균 월 배당</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(recoveryData.monthlyAverageDividend)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">배당 성장률</span>
                <span className="font-medium text-blue-600">
                  +{recoveryData.dividendGrowthRate}%/년
                </span>
              </div>
            </div>
          </div>

          {/* Stock-wise Recovery Details */}
          <div className="toss-card p-4 md:p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              종목별 회수 현황
            </h3>

            <div className="space-y-3">
              {stockDetails.map((stock) => (
                <div key={stock.ticker} className="p-3 rounded-lg border border-border hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{stock.ticker.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{stock.ticker}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{stock.name}</div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadge(stock.status).variant as any} className="text-xs">
                      {getStatusBadge(stock.status).label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            stock.status === 'recovered' ? 'bg-green-500' :
                            stock.status === 'on-track' ? 'bg-blue-500' :
                            stock.status === 'slow' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(stock.recoveryPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">투자금액: </span>
                        <span className="font-medium">{formatCurrency(stock.investment)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">회수금액: </span>
                        <span className="font-medium text-green-600">{formatCurrency(stock.dividendsReceived)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">회수율: </span>
                        <span className={`font-medium ${getStatusColor(stock.status)}`}>
                          {stock.recoveryPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">예상기간: </span>
                        <span className="font-medium">
                          {stock.status === 'recovered' ? '완료' : `${stock.timeToRecovery}개월`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recovery Analysis & Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="toss-card p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <h4 className="font-semibold text-sm">회수 가속화 전략</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              배당 재투자를 통해 복리 효과를 극대화하면 원금 회수 기간을 20-30% 단축할 수 있습니다.
            </p>
          </div>

          <div className="toss-card p-4 border-l-4 border-l-green-500">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-green-500" />
              <h4 className="font-semibold text-sm">안정성 평가</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              현재 포트폴리오의 배당 지속성은 우수하며, 향후 5년간 안정적인 배당 수익이 예상됩니다.
            </p>
          </div>

          <div className="toss-card p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <h4 className="font-semibold text-sm">성과 분석</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              평균 이상의 회수율을 보이고 있으며, 현재 속도로는 예정보다 6개월 빠른 회수가 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}