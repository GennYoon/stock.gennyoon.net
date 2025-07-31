"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/shared/hooks/use-currency";
import { 
  Target, 
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  PieChart,
  Info
} from "lucide-react";

interface CalculationResult {
  targetDividend: number;
  requiredInvestment: number;
  monthlyContribution: number;
  timeToGoal: number;
  totalDividends: number;
  projectedValue: number;
  riskLevel: string;
}

interface DividendProjection {
  year: number;
  investment: number;
  dividendAmount: number;
  cumulativeDividend: number;
  portfolioValue: number;
}

export default function CalculatorPage() {
  const { formatCurrency } = useCurrency();
  
  // 입력 상태
  const [targetMonthlyDividend, setTargetMonthlyDividend] = useState<number>(500);
  const [expectedYield, setExpectedYield] = useState<number>(8);
  const [currentCapital, setCurrentCapital] = useState<number>(10000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1000);
  const [timeHorizon, setTimeHorizon] = useState<number>(10);
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(5);
  const [riskTolerance, setRiskTolerance] = useState<string>("moderate");

  // 계산 결과
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [projections, setProjections] = useState<DividendProjection[]>([]);
  const [loading, setLoading] = useState(false);

  // 계산 로직
  const calculateDividendGoal = () => {
    setLoading(true);
    
    setTimeout(() => {
      // 목표 월 배당금을 달성하기 위한 필요 투자금액
      const yearlyTargetDividend = targetMonthlyDividend * 12;
      const requiredInvestment = yearlyTargetDividend / (expectedYield / 100);
      
      // 현재 보유 자본으로 얻을 수 있는 배당금
      const currentYearlyDividend = currentCapital * (expectedYield / 100);
      const remainingNeeded = yearlyTargetDividend - currentYearlyDividend;
      
      // 월 투자로 목표 달성 시간 계산 (복리 고려)
      const monthlyYield = expectedYield / 100 / 12;
      const monthsToGoal = remainingNeeded > 0 
        ? Math.log((remainingNeeded * monthlyYield / monthlyContribution) + 1) / Math.log(1 + monthlyYield)
        : 0;
      
      // 전체 포트폴리오 가치 예측
      const totalInvestment = currentCapital + (monthlyContribution * monthsToGoal);
      const projectedValue = totalInvestment * Math.pow(1 + expectedYield / 100, timeHorizon);
      
      // 위험도 평가
      let riskLevel = "낮음";
      if (expectedYield > 15) riskLevel = "높음";
      else if (expectedYield > 10) riskLevel = "중간";

      const calculationResult: CalculationResult = {
        targetDividend: yearlyTargetDividend,
        requiredInvestment,
        monthlyContribution: monthlyContribution,
        timeToGoal: monthsToGoal / 12,
        totalDividends: yearlyTargetDividend * timeHorizon,
        projectedValue,
        riskLevel
      };

      // 연도별 배당 전망 계산
      const yearlyProjections: DividendProjection[] = [];
      let cumulativeInvestment = currentCapital;
      let cumulativeDividend = 0;
      
      for (let year = 1; year <= timeHorizon; year++) {
        cumulativeInvestment += monthlyContribution * 12;
        const yearlyDividend = cumulativeInvestment * (expectedYield / 100) * Math.pow(1 + dividendGrowthRate / 100, year - 1);
        cumulativeDividend += yearlyDividend;
        
        yearlyProjections.push({
          year,
          investment: cumulativeInvestment,
          dividendAmount: yearlyDividend,
          cumulativeDividend,
          portfolioValue: cumulativeInvestment * Math.pow(1.05, year) // 5% 자본 증가 가정
        });
      }

      setResult(calculationResult);
      setProjections(yearlyProjections);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    calculateDividendGoal();
  }, [targetMonthlyDividend, expectedYield, currentCapital, monthlyContribution, timeHorizon, dividendGrowthRate]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "높음": return "text-red-600";
      case "중간": return "text-yellow-600";
      default: return "text-green-600";
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "높음": return "destructive";
      case "중간": return "warning";
      default: return "success";
    }
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 section-spacing">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold toss-text-gradient mb-2">
              배당금 목표 계산기
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              배당 수익 목표 달성을 위한 투자 계획 시뮬레이션
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={calculateDividendGoal}
              className="toss-button-secondary"
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              재계산
            </Button>
            <Button className="toss-button-primary">
              <Sparkles className="h-4 w-4 mr-2" />
              AI 최적화
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 입력 패널 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 목표 설정 */}
            <div className="toss-card p-4 md:p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                목표 설정
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="target-dividend" className="text-sm font-medium">
                    월 목표 배당금
                  </Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="target-dividend"
                      type="number"
                      value={targetMonthlyDividend}
                      onChange={(e) => setTargetMonthlyDividend(Number(e.target.value))}
                      className="pl-10 toss-input"
                      placeholder="500"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    연간 {formatCurrency(targetMonthlyDividend * 12)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    기대 배당수익률: {expectedYield}%
                  </Label>
                  <div className="px-2 mt-2">
                    <Slider
                      value={[expectedYield]}
                      onValueChange={([value]) => setExpectedYield(value)}
                      max={25}
                      min={3}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>안정형 (3%)</span>
                    <span>고수익 (25%)</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="time-horizon" className="text-sm font-medium">
                    투자 기간 (년)
                  </Label>
                  <Select value={timeHorizon.toString()} onValueChange={(value) => setTimeHorizon(Number(value))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5년</SelectItem>
                      <SelectItem value="10">10년</SelectItem>
                      <SelectItem value="15">15년</SelectItem>
                      <SelectItem value="20">20년</SelectItem>
                      <SelectItem value="25">25년</SelectItem>
                      <SelectItem value="30">30년</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 투자 계획 */}
            <div className="toss-card p-4 md:p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-green-600" />
                투자 계획
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-capital" className="text-sm font-medium">
                    현재 보유 자본
                  </Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="current-capital"
                      type="number"
                      value={currentCapital}
                      onChange={(e) => setCurrentCapital(Number(e.target.value))}
                      className="pl-10 toss-input"
                      placeholder="10000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="monthly-contribution" className="text-sm font-medium">
                    월 투자 금액
                  </Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="monthly-contribution"
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      className="pl-10 toss-input"
                      placeholder="1000"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    연간 {formatCurrency(monthlyContribution * 12)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    배당 성장률: {dividendGrowthRate}%/년
                  </Label>
                  <div className="px-2 mt-2">
                    <Slider
                      value={[dividendGrowthRate]}
                      onValueChange={([value]) => setDividendGrowthRate(value)}
                      max={15}
                      min={0}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>보수적 (0%)</span>
                    <span>성장형 (15%)</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">위험 성향</Label>
                  <Select value={riskTolerance} onValueChange={setRiskTolerance}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">보수적</SelectItem>
                      <SelectItem value="moderate">적당함</SelectItem>
                      <SelectItem value="aggressive">공격적</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 결과 패널 */}
          <div className="lg:col-span-2 space-y-6">
            {result && (
              <>
                {/* 목표 달성 요약 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="toss-metric-card text-center p-3 md:p-4">
                    <div className="text-xs text-muted-foreground font-medium mb-1">필요 투자금액</div>
                    <div className="text-lg md:text-xl font-bold text-foreground">
                      {formatCurrency(result.requiredInvestment)}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">총 금액</div>
                  </div>

                  <div className="toss-metric-card text-center p-3 md:p-4">
                    <div className="text-xs text-muted-foreground font-medium mb-1">목표 달성 기간</div>
                    <div className="text-lg md:text-xl font-bold text-foreground">
                      {result.timeToGoal.toFixed(1)}년
                    </div>
                    <div className="text-xs price-up font-medium">예상</div>
                  </div>

                  <div className="toss-metric-card text-center p-3 md:p-4">
                    <div className="text-xs text-muted-foreground font-medium mb-1">연간 배당금</div>
                    <div className="text-lg md:text-xl font-bold text-foreground">
                      {formatCurrency(result.targetDividend)}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">목표 달성시</div>
                  </div>

                  <div className="toss-metric-card text-center p-3 md:p-4">
                    <div className="text-xs text-muted-foreground font-medium mb-1">위험 수준</div>
                    <div className="text-lg md:text-xl font-bold">
                      <Badge variant={getRiskBadgeVariant(result.riskLevel) as any}>
                        {result.riskLevel}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">평가</div>
                  </div>
                </div>

                {/* 상세 분석 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="toss-card p-4 md:p-5 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold text-base">투자 계획 분석</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">현재 보유 자본:</span>
                        <span className="font-medium">{formatCurrency(currentCapital)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">현재 연간 배당:</span>
                        <span className="font-medium">{formatCurrency(currentCapital * expectedYield / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">월 투자 필요:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(monthlyContribution)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">총 투자 예상:</span>
                        <span className="font-medium">{formatCurrency(currentCapital + monthlyContribution * 12 * timeHorizon)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="toss-card p-4 md:p-5 border-l-4 border-l-green-500">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold text-base">수익 전망</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{timeHorizon}년 후 포트폴리오:</span>
                        <span className="font-medium">{formatCurrency(result.projectedValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">누적 배당금:</span>
                        <span className="font-medium text-green-600">{formatCurrency(result.totalDividends)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">월평균 배당:</span>
                        <span className="font-medium">{formatCurrency(result.totalDividends / (timeHorizon * 12))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">예상 수익률:</span>
                        <span className="font-medium text-green-600">{expectedYield}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 연도별 배당 전망 */}
                <div className="toss-card p-4 md:p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    연도별 배당 전망
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <div>연도</div>
                        <div>투자 원금</div>
                        <div>연간 배당</div>
                        <div>누적 배당</div>
                        <div>포트폴리오 가치</div>
                      </div>
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {projections.slice(0, 10).map((projection) => (
                          <div key={projection.year} className="grid grid-cols-5 gap-2 text-sm py-2 border-b border-border/50">
                            <div className="font-medium">{projection.year}년</div>
                            <div>{formatCurrency(projection.investment)}</div>
                            <div className="text-green-600 font-medium">{formatCurrency(projection.dividendAmount)}</div>
                            <div className="text-blue-600 font-medium">{formatCurrency(projection.cumulativeDividend)}</div>
                            <div>{formatCurrency(projection.portfolioValue)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 투자 전략 추천 */}
                <div className="toss-card p-4 md:p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-orange-600" />
                    맞춤 투자 전략
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-sm">단계별 접근</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        초기에는 안정적인 고배당주로 시작하여 점진적으로 성장형 종목 비중을 늘려가세요.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-green-600" />
                        <h4 className="font-medium text-sm">배당 재투자</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        받은 배당금을 재투자하여 복리 효과를 극대화하고 목표 달성 시간을 단축하세요.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium text-sm">리스크 관리</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {expectedYield > 15 ? "고수익 추구시 분산투자를 통해 위험을 관리하세요." : "안정적인 수익률로 꾸준한 배당 성장을 추구하세요."}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {loading && (
              <div className="toss-card p-8 text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-muted-foreground">계산 중...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}