"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/shared/hooks/use-currency";
import { usePortfolio } from "@/shared/hooks/use-portfolio";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from "recharts";
import { 
  TrendingUp,
  Calendar,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Download,
  Maximize2,
  Info,
  Filter,
  ChevronUp,
  ChevronDown,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target
} from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { ko } from "date-fns/locale";

interface ChartData {
  month: string;
  dividend: number;
  cumulative: number;
  projected: number;
}

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface PerformanceData {
  stock: string;
  yield: number;
  recovery: number;
  risk: number;
  score: number;
}

interface HeatmapData {
  day: number;
  month: string;
  amount: number;
  stocks: string[];
}

export default function InsightsPage() {
  const { formatCurrency } = useCurrency();
  const { portfolioData, summary } = usePortfolio();
  const [selectedChart, setSelectedChart] = useState<'dividend' | 'allocation' | 'performance' | 'heatmap'>('dividend');
  const [timeRange, setTimeRange] = useState<'6m' | '1y' | '2y' | '5y'>('1y');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [allocationData, setAllocationData] = useState<AllocationData[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  // 차트 데이터 생성
  useEffect(() => {
    if (summary && portfolioData.length > 0) {
      // 배당 수익 추이 데이터
      const months = timeRange === '6m' ? 6 : timeRange === '1y' ? 12 : timeRange === '2y' ? 24 : 60;
      const dividendData: ChartData[] = [];
      let cumulative = 0;
      const monthlyBase = summary.monthlyDividend;
      
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStr = format(date, 'yyyy년 M월', { locale: ko });
        const dividend = monthlyBase * (0.9 + Math.random() * 0.2);
        cumulative += dividend;
        const projected = monthlyBase * (1 + (months - i) * 0.01);
        
        dividendData.push({
          month: monthStr,
          dividend: Math.round(dividend),
          cumulative: Math.round(cumulative),
          projected: Math.round(projected)
        });
      }
      
      setChartData(dividendData);

      // 포트폴리오 할당 데이터
      const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
      const allocation = portfolioData.map((stock, index) => ({
        name: stock.ticker,
        value: stock.totalValue,
        percentage: (stock.totalValue / summary.totalValue) * 100,
        color: colors[index % colors.length]
      }));
      
      setAllocationData(allocation);

      // 성과 데이터
      const performance = portfolioData.map(stock => ({
        stock: stock.ticker,
        yield: stock.dividendYield,
        recovery: Math.random() * 50 + 10,
        risk: Math.random() * 30 + 20,
        score: Math.random() * 40 + 60
      }));
      
      setPerformanceData(performance);

      // 배당 캘린더 히트맵 데이터
      const heatmap: HeatmapData[] = [];
      const currentDate = new Date();
      
      for (let m = 0; m < 12; m++) {
        const month = addMonths(currentDate, m);
        const monthName = format(month, 'MMM', { locale: ko });
        
        for (let d = 1; d <= 31; d++) {
          if (Math.random() > 0.7) {
            const stocks = portfolioData
              .filter(() => Math.random() > 0.5)
              .map(s => s.ticker);
            
            if (stocks.length > 0) {
              heatmap.push({
                day: d,
                month: monthName,
                amount: Math.random() * 500 + 100,
                stocks
              });
            }
          }
        }
      }
      
      setHeatmapData(heatmap);
      setLoading(false);
    }
  }, [portfolioData, summary, timeRange]);

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // 파이 차트 커스텀 라벨
  const renderCustomLabel = (entry: any) => {
    return `${entry.name} ${entry.percentage.toFixed(1)}%`;
  };

  const exportChartData = () => {
    const dataStr = JSON.stringify({ chartData, allocationData, performanceData }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `dividend-insights-${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading || !summary) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
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
              투자 인사이트
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              포트폴리오 데이터를 시각화하여 투자 패턴과 성과를 분석합니다
            </p>
          </div>
          <Button 
            className="toss-button-primary mt-4 md:mt-0"
            onClick={exportChartData}
          >
            <Download className="h-4 w-4 mr-2" />
            데이터 내보내기
          </Button>
        </div>

        {/* Chart Selection and Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-2">
            <Button
              variant={selectedChart === 'dividend' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChart('dividend')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              배당 추이
            </Button>
            <Button
              variant={selectedChart === 'allocation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChart('allocation')}
            >
              <PieChartIcon className="h-4 w-4 mr-2" />
              포트폴리오 구성
            </Button>
            <Button
              variant={selectedChart === 'performance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChart('performance')}
            >
              <Activity className="h-4 w-4 mr-2" />
              종목별 성과
            </Button>
            <Button
              variant={selectedChart === 'heatmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChart('heatmap')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              배당 캘린더
            </Button>
          </div>

          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6개월</SelectItem>
              <SelectItem value="1y">1년</SelectItem>
              <SelectItem value="2y">2년</SelectItem>
              <SelectItem value="5y">5년</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Chart Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="toss-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {selectedChart === 'dividend' && <TrendingUp className="h-5 w-5 text-blue-600" />}
                    {selectedChart === 'allocation' && <PieChartIcon className="h-5 w-5 text-purple-600" />}
                    {selectedChart === 'performance' && <Activity className="h-5 w-5 text-green-600" />}
                    {selectedChart === 'heatmap' && <Calendar className="h-5 w-5 text-orange-600" />}
                    {selectedChart === 'dividend' && '배당금 수익 추이'}
                    {selectedChart === 'allocation' && '포트폴리오 자산 배분'}
                    {selectedChart === 'performance' && '종목별 성과 분석'}
                    {selectedChart === 'heatmap' && '배당 지급 캘린더'}
                  </span>
                  <Button variant="ghost" size="sm">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  {/* 배당 추이 차트 */}
                  {selectedChart === 'dividend' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="month" 
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="dividend" fill="#3b82f6" name="월 배당금" />
                        <Line 
                          type="monotone" 
                          dataKey="cumulative" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="누적 배당금"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="projected" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="예상 배당금"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}

                  {/* 포트폴리오 구성 차트 */}
                  {selectedChart === 'allocation' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomLabel}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {allocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {/* 종목별 성과 레이더 차트 */}
                  {selectedChart === 'performance' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={performanceData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="stock" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar name="수익률" dataKey="yield" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                        <Radar name="회수율" dataKey="recovery" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                        <Radar name="종합점수" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}

                  {/* 배당 캘린더 히트맵 */}
                  {selectedChart === 'heatmap' && (
                    <div className="grid grid-cols-12 gap-1 p-4">
                      {['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map((month, mIndex) => (
                        <div key={month} className="text-center">
                          <div className="text-xs text-muted-foreground mb-2">{month}</div>
                          <div className="grid grid-cols-7 gap-0.5">
                            {[...Array(31)].map((_, dIndex) => {
                              const dayData = heatmapData.find(d => d.month === month && d.day === dIndex + 1);
                              const hasData = !!dayData;
                              const intensity = dayData ? Math.min(dayData.amount / 500, 1) : 0;
                              
                              return (
                                <div
                                  key={dIndex}
                                  className={`w-4 h-4 rounded-sm transition-all cursor-pointer hover:scale-110 ${
                                    hasData 
                                      ? `bg-blue-600` 
                                      : 'bg-gray-100 dark:bg-gray-800'
                                  }`}
                                  style={{
                                    opacity: hasData ? 0.3 + intensity * 0.7 : 1
                                  }}
                                  title={dayData ? `${dayData.stocks.join(', ')}: ${formatCurrency(dayData.amount)}` : ''}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Insights Panel */}
          <div className="space-y-4">
            {/* Key Metrics */}
            <Card className="toss-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  핵심 지표
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">평균 배당수익률</span>
                  <span className="font-semibold text-green-600">{summary.portfolioYield.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">월평균 배당금</span>
                  <span className="font-semibold">{formatCurrency(summary.monthlyDividend)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">연간 예상 배당</span>
                  <span className="font-semibold">{formatCurrency(summary.yearlyDividend)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">배당 성장률</span>
                  <span className="font-semibold text-blue-600">+8.5%</span>
                </div>
              </CardContent>
            </Card>

            {/* Trend Analysis */}
            <Card className="toss-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  트렌드 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">
                    최근 6개월 배당 수익 <span className="text-green-600 font-medium">12% 증가</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm text-muted-foreground">
                    CONY 변동성 <span className="text-yellow-600 font-medium">주의 필요</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <p className="text-sm text-muted-foreground">
                    TSLY 배당 안정성 <span className="text-blue-600 font-medium">우수</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Investment Tips */}
            <Card className="toss-card border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-purple-600" />
                  투자 인사이트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  현재 포트폴리오는 고배당 ETF에 집중되어 있어 안정적인 현금흐름을 제공하고 있습니다. 
                  분산 투자를 통해 리스크를 줄이고 장기적인 성장을 도모하는 것이 좋습니다.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">분산투자</Badge>
                  <Badge variant="outline">장기투자</Badge>
                  <Badge variant="outline">재투자</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Monthly Comparison */}
          <Card className="toss-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                월별 배당 비교
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="dividend" fill="#6366f1">
                    {chartData.slice(-6).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.dividend > summary.monthlyDividend ? '#10b981' : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Yield Trend */}
          <Card className="toss-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-600" />
                수익률 변화 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData.slice(-12)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="dividend" 
                    stroke="#f59e0b" 
                    fill="#f59e0b" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}