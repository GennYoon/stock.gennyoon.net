"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/shared/hooks/use-currency";
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Globe,
  Newspaper,
  Calendar,
  AlertCircle,
  Activity,
  BarChart3,
  Clock,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Filter,
  RefreshCw,
  Info,
  Star,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";

interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
}

interface EconomicIndicator {
  name: string;
  value: string;
  change: number;
  unit: string;
  importance: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number;
  url: string;
}

interface EconomicEvent {
  id: string;
  date: Date;
  title: string;
  importance: 'high' | 'medium' | 'low';
  previousValue?: string;
  forecast?: string;
  actual?: string;
  impact: string;
}

interface MarketTrend {
  category: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  description: string;
  stocks: string[];
}

export default function MarketPage() {
  const { formatCurrency } = useCurrency();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'news' | 'calendar' | 'trends'>('overview');
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [economicIndicators, setEconomicIndicators] = useState<EconomicIndicator[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsFilter, setNewsFilter] = useState<'all' | 'dividend' | 'yieldmax'>('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock 데이터 생성
  useEffect(() => {
    // 시장 지수 데이터
    const indices: MarketIndex[] = [
      {
        name: "S&P 500",
        symbol: "SPX",
        value: 5974.07,
        change: 23.47,
        changePercent: 0.39,
        trend: 'up'
      },
      {
        name: "NASDAQ",
        symbol: "COMP",
        value: 19764.88,
        change: -81.87,
        changePercent: -0.41,
        trend: 'down'
      },
      {
        name: "다우존스",
        symbol: "DJI",
        value: 43828.06,
        change: 140.26,
        changePercent: 0.32,
        trend: 'up'
      },
      {
        name: "KOSPI",
        symbol: "KOSPI",
        value: 2484.23,
        change: -12.45,
        changePercent: -0.50,
        trend: 'down'
      }
    ];
    setMarketIndices(indices);

    // 경제 지표 데이터
    const indicators: EconomicIndicator[] = [
      {
        name: "미국 기준금리",
        value: "4.50%",
        change: 0,
        unit: "%",
        importance: 'high',
        lastUpdated: new Date()
      },
      {
        name: "미국 CPI",
        value: "2.7%",
        change: -0.2,
        unit: "% YoY",
        importance: 'high',
        lastUpdated: new Date()
      },
      {
        name: "달러 인덱스",
        value: "106.89",
        change: 0.34,
        unit: "DXY",
        importance: 'medium',
        lastUpdated: new Date()
      },
      {
        name: "VIX 지수",
        value: "14.52",
        change: -0.89,
        unit: "지수",
        importance: 'medium',
        lastUpdated: new Date()
      },
      {
        name: "미국 실업률",
        value: "3.7%",
        change: 0.1,
        unit: "%",
        importance: 'high',
        lastUpdated: new Date()
      },
      {
        name: "10년물 국채",
        value: "4.23%",
        change: 0.05,
        unit: "%",
        importance: 'medium',
        lastUpdated: new Date()
      }
    ];
    setEconomicIndicators(indicators);

    // 뉴스 데이터
    const news: NewsItem[] = [
      {
        id: "1",
        title: "YieldMax ETF, 12월 배당금 발표 - TSLY 주당 $0.5420 지급",
        summary: "YieldMax는 주력 ETF들의 12월 배당금을 발표했습니다. TSLY는 전월 대비 8% 증가한 $0.5420를 지급할 예정입니다.",
        source: "ETF.com",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        category: "배당발표",
        sentiment: 'positive',
        relevance: 95,
        url: "https://example.com/news/1"
      },
      {
        id: "2",
        title: "연준, 2025년 금리 인하 가능성 시사 - 고배당주 수혜 전망",
        summary: "연준이 인플레이션 안정화를 언급하며 2025년 금리 인하 가능성을 시사했습니다. 고배당 ETF들이 수혜를 받을 것으로 예상됩니다.",
        source: "Reuters",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        category: "경제정책",
        sentiment: 'positive',
        relevance: 85,
        url: "https://example.com/news/2"
      },
      {
        id: "3",
        title: "암호화폐 변동성 확대, CONY ETF 일일 거래량 급증",
        summary: "비트코인과 코인베이스 주가의 변동성이 확대되면서 CONY ETF의 거래량이 전일 대비 150% 증가했습니다.",
        source: "Bloomberg",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        category: "시장동향",
        sentiment: 'neutral',
        relevance: 80,
        url: "https://example.com/news/3"
      },
      {
        id: "4",
        title: "11월 미국 CPI 2.7% 상승, 예상치 부합 - 배당주 안정세",
        summary: "11월 소비자물가지수가 전년 대비 2.7% 상승하며 예상치에 부합했습니다. 배당주들이 안정적인 흐름을 보이고 있습니다.",
        source: "CNBC",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        category: "경제지표",
        sentiment: 'neutral',
        relevance: 75,
        url: "https://example.com/news/4"
      },
      {
        id: "5",
        title: "테슬라 주가 3% 상승, TSLY 프리미엄 수익 증가 예상",
        summary: "테슬라 주가가 자율주행 기술 발표로 3% 상승했습니다. TSLY의 옵션 프리미엄 수익이 증가할 것으로 예상됩니다.",
        source: "MarketWatch",
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        category: "개별종목",
        sentiment: 'positive',
        relevance: 90,
        url: "https://example.com/news/5"
      }
    ];
    setNewsItems(news);

    // 경제 캘린더 이벤트
    const events: EconomicEvent[] = [
      {
        id: "1",
        date: new Date(),
        title: "미국 소매판매 발표",
        importance: 'high',
        previousValue: "0.4%",
        forecast: "0.6%",
        impact: "달러 강세 가능, 금리 상승 압력"
      },
      {
        id: "2",
        date: addDays(new Date(), 1),
        title: "FOMC 의사록 공개",
        importance: 'high',
        impact: "향후 통화정책 방향성 확인"
      },
      {
        id: "3",
        date: addDays(new Date(), 2),
        title: "신규 실업수당 청구건수",
        importance: 'medium',
        previousValue: "220K",
        forecast: "225K",
        impact: "고용시장 건전성 평가"
      },
      {
        id: "4",
        date: addDays(new Date(), 3),
        title: "YieldMax ETF 배당락일",
        importance: 'high',
        impact: "TSLY, NVDY, MSTY, CONY 배당락"
      },
      {
        id: "5",
        date: addDays(new Date(), 7),
        title: "미국 GDP 수정치",
        importance: 'high',
        previousValue: "2.8%",
        forecast: "2.9%",
        impact: "경제성장률 확인"
      }
    ];
    setEconomicEvents(events);

    // 시장 트렌드
    const trends: MarketTrend[] = [
      {
        category: "고배당 ETF",
        trend: 'bullish',
        strength: 85,
        description: "금리 안정화와 변동성 확대로 커버드콜 전략 ETF 수익성 개선",
        stocks: ["TSLY", "NVDY", "MSTY", "CONY", "JPIY", "APLY"]
      },
      {
        category: "기술주",
        trend: 'neutral',
        strength: 60,
        description: "AI 관련주는 강세, 일반 기술주는 혼조세",
        stocks: ["NVDA", "MSFT", "GOOGL", "META"]
      },
      {
        category: "배당 성장주",
        trend: 'bullish',
        strength: 75,
        description: "안정적인 현금흐름과 배당 인상 기업 선호",
        stocks: ["JNJ", "PG", "KO", "PEP", "MCD"]
      },
      {
        category: "암호화폐 관련주",
        trend: 'bearish',
        strength: 40,
        description: "규제 불확실성과 변동성 확대로 투자심리 위축",
        stocks: ["COIN", "MARA", "RIOT", "MSTR"]
      }
    ];
    setMarketTrends(trends);

    setLoading(false);
    setLastUpdated(new Date());
  }, []);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'negative': return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'neutral': return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendStrengthColor = (strength: number) => {
    if (strength >= 80) return 'bg-green-500';
    if (strength >= 60) return 'bg-blue-500';
    if (strength >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredNews = newsItems.filter(item => {
    if (newsFilter === 'all') return true;
    if (newsFilter === 'dividend') return item.category === '배당발표' || item.title.includes('배당');
    if (newsFilter === 'yieldmax') return item.title.includes('YieldMax') || item.title.includes('TSLY') || item.title.includes('NVDY') || item.title.includes('MSTY') || item.title.includes('CONY');
    return true;
  });

  if (loading) {
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
              시장 동향
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              실시간 시장 지표와 배당 투자 관련 뉴스를 확인하세요
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {format(lastUpdated, 'HH:mm 기준', { locale: ko })}
            </Badge>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button
            variant={selectedTab === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTab('overview')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            시장 개요
          </Button>
          <Button
            variant={selectedTab === 'news' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTab('news')}
          >
            <Newspaper className="h-4 w-4 mr-2" />
            뉴스
          </Button>
          <Button
            variant={selectedTab === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTab('calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            경제 캘린더
          </Button>
          <Button
            variant={selectedTab === 'trends' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTab('trends')}
          >
            <Activity className="h-4 w-4 mr-2" />
            트렌드 분석
          </Button>
        </div>

        {/* Market Overview */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Market Indices */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                주요 지수
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {marketIndices.map((index) => (
                  <Card key={index.symbol} className="toss-card hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">{index.name}</span>
                        {index.trend === 'up' ? (
                          <ChevronUp className="h-4 w-4 text-green-500" />
                        ) : index.trend === 'down' ? (
                          <ChevronDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <div className="text-xl font-bold mb-1">
                        {index.value.toLocaleString()}
                      </div>
                      <div className={`text-sm font-medium ${
                        index.trend === 'up' ? 'text-green-600' : 
                        index.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {index.change > 0 ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent > 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Economic Indicators */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                주요 경제 지표
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {economicIndicators.map((indicator) => (
                  <Card key={indicator.name} className="toss-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">{indicator.name}</div>
                          <div className="text-2xl font-bold mb-1">{indicator.value}</div>
                          <div className={`text-sm font-medium ${
                            indicator.change > 0 ? 'text-green-600' : 
                            indicator.change < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {indicator.change > 0 ? '+' : ''}{indicator.change.toFixed(2)}{indicator.unit === '%' ? 'p' : ''} 변동
                          </div>
                        </div>
                        <Badge 
                          variant={indicator.importance === 'high' ? 'destructive' : 
                                  indicator.importance === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {indicator.importance === 'high' ? '중요' : 
                           indicator.importance === 'medium' ? '보통' : '낮음'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* News Feed */}
        {selectedTab === 'news' && (
          <div className="space-y-4">
            {/* News Filter */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={newsFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewsFilter('all')}
              >
                전체
              </Button>
              <Button
                variant={newsFilter === 'dividend' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewsFilter('dividend')}
              >
                배당 관련
              </Button>
              <Button
                variant={newsFilter === 'yieldmax' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewsFilter('yieldmax')}
              >
                YieldMax
              </Button>
            </div>

            {/* News Items */}
            <div className="space-y-3">
              {filteredNews.map((item) => (
                <Card key={item.id} className="toss-card hover:shadow-md transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.source} · {format(item.publishedAt, 'HH:mm', { locale: ko })}
                          </span>
                          {getSentimentIcon(item.sentiment)}
                        </div>
                        <h4 className="font-semibold mb-2 hover:text-blue-600 cursor-pointer">
                          {item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.summary}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          <Star className={`h-4 w-4 ${item.relevance >= 80 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                          <span className="text-xs text-muted-foreground">{item.relevance}%</span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Economic Calendar */}
        {selectedTab === 'calendar' && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-blue-600" />
                <span>향후 7일간의 주요 경제 이벤트와 배당 관련 일정입니다</span>
              </div>
            </div>

            <div className="space-y-3">
              {economicEvents.map((event) => (
                <Card key={event.id} className="toss-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {format(event.date, 'M월 d일 (EEE)', { locale: ko })}
                          </span>
                          <Badge 
                            variant={event.importance === 'high' ? 'destructive' : 
                                    event.importance === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {event.importance === 'high' ? '중요' : 
                             event.importance === 'medium' ? '보통' : '낮음'}
                          </Badge>
                        </div>
                        <h4 className="font-semibold mb-2">{event.title}</h4>
                        {(event.previousValue || event.forecast) && (
                          <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                            {event.previousValue && (
                              <span>이전: {event.previousValue}</span>
                            )}
                            {event.forecast && (
                              <span>예상: {event.forecast}</span>
                            )}
                            {event.actual && (
                              <span className="text-green-600 font-medium">실제: {event.actual}</span>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">{event.impact}</p>
                      </div>
                      <div className={getImportanceColor(event.importance)}>
                        <AlertCircle className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Market Trends */}
        {selectedTab === 'trends' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketTrends.map((trend) => (
                <Card key={trend.category} className="toss-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{trend.category}</span>
                      <Badge 
                        variant={trend.trend === 'bullish' ? 'success' : 
                                trend.trend === 'bearish' ? 'destructive' : 'default'}
                      >
                        {trend.trend === 'bullish' ? '강세' : 
                         trend.trend === 'bearish' ? '약세' : '중립'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">신호 강도</span>
                          <span className="font-medium">{trend.strength}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getTrendStrengthColor(trend.strength)} transition-all duration-500`}
                            style={{ width: `${trend.strength}%` }}
                          />
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {trend.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        {trend.stocks.map((stock) => (
                          <Badge key={stock} variant="outline" className="text-xs">
                            {stock}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Market Sentiment Summary */}
            <Card className="toss-card border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  시장 종합 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm">
                    현재 고배당 ETF 시장은 <span className="font-semibold text-green-600">강세</span> 국면입니다. 
                    금리 안정화 기대감과 함께 변동성 확대로 커버드콜 전략의 수익성이 개선되고 있습니다.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">85%</div>
                      <div className="text-xs text-muted-foreground">긍정적 신호</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">72%</div>
                      <div className="text-xs text-muted-foreground">배당주 선호도</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">14.5</div>
                      <div className="text-xs text-muted-foreground">VIX 지수</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">4.5%</div>
                      <div className="text-xs text-muted-foreground">평균 배당률</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">주목할 점:</span>
                    <span className="text-sm text-muted-foreground">
                      YieldMax ETF들의 12월 배당금이 전월 대비 평균 5-10% 증가
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}