import type {
  IStockDataService,
  StockQuote,
  StockHistoricalData,
  DividendInfo,
  DividendHistoryItem,
  CompanyInfo,
  StockSearchResult,
  DataProviderConfig,
} from "@/shared/types/stock-data";

import { StockDataError, RateLimitError } from "@/shared/types/stock-data";

// Polygon.io API 응답 타입들
interface PolygonQuoteResponse {
  status: string;
  request_id: string;
  results?: {
    value: number;
    timeframe: string;
    timestamp?: number;
  };
}

interface PolygonTickerResponse {
  status: string;
  request_id: string;
  results?: {
    ticker: string;
    name: string;
    market: string;
    locale: string;
    primary_exchange: string;
    type: string;
    active: boolean;
    currency_name: string;
    cik?: string;
    composite_figi?: string;
    share_class_figi?: string;
    last_updated_utc: string;
  };
}

interface PolygonDailyOpenCloseResponse {
  status: string;
  from: string;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  afterHours: number;
  preMarket: number;
}

interface PolygonAggregatesResponse {
  status: string;
  request_id: string;
  results?: Array<{
    v: number; // volume
    vw: number; // volume weighted average
    o: number; // open
    c: number; // close
    h: number; // high
    l: number; // low
    t: number; // timestamp
    n: number; // number of transactions
  }>;
  resultsCount: number;
  adjusted: boolean;
}

interface PolygonDividendsResponse {
  status: string;
  request_id: string;
  results?: Array<{
    ticker: string;
    ex_dividend_date: string;
    dividend_type: "CD" | "SC" | "LT" | "ST"; // Cash Dividend, Special Cash, Long-term, Short-term
    cash_amount: number;
    declaration_date?: string;
    pay_date?: string;
    record_date?: string;
    frequency?: number;
  }>;
  next_url?: string;
}

interface PolygonTickerSearchResponse {
  status: string;
  request_id: string;
  results?: Array<{
    ticker: string;
    name: string;
    market: string;
    locale: string;
    primary_exchange: string;
    type: string;
    active: boolean;
    currency_name: string;
    last_updated_utc: string;
  }>;
  count: number;
  next_url?: string;
}

/**
 * Polygon.io API 제공자
 */
export class PolygonProvider implements IStockDataService {
  private config: DataProviderConfig;
  private requestCount = 0;
  private lastRequestTime = 0;
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor(apiKey?: string) {
    this.config = {
      name: "Polygon.io",
      apiKey: apiKey || process.env.POLYGON_API_KEY || "demo",
      baseUrl: "https://api.polygon.io",
      rateLimit: {
        provider: "Polygon.io",
        requestsPerMinute: 5, // 무료 티어 제한
        requestsPerDay: 7200, // 5 req/min * 60 min * 24 hours
        burstLimit: 5,
        retryAfter: 60000, // 1분
      },
      supportedMarkets: ["US"],
      features: {
        realTimeQuotes: false, // 무료 티어는 15분 지연
        historicalData: true,
        dividendData: true,
        companyInfo: true,
        search: true,
      },
    };
  }

  /**
   * Rate limiting 체크
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const currentDate = new Date().toDateString();

    // 일일 리셋 체크
    if (this.lastResetDate !== currentDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = currentDate;
    }

    // 일일 한도 체크
    if (this.dailyRequestCount >= this.config.rateLimit.requestsPerDay) {
      throw new RateLimitError(this.config.name, "tomorrow");
    }

    // 분당 한도 체크 (12초마다 1요청 = 5요청/분)
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 12000) {
      const waitTime = 12000 - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
    this.dailyRequestCount++;
  }

  /**
   * API 요청 실행
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    await this.checkRateLimit();

    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    url.searchParams.append("apikey", this.config.apiKey!);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError(
          this.config.name,
          response.headers.get("Retry-After") || "60",
        );
      }
      throw new StockDataError(
        `Polygon API request failed: ${response.statusText}`,
        this.config.name,
        response.status,
      );
    }

    const data = await response.json();

    // Polygon 에러 응답 체크
    if (data.status === "ERROR") {
      throw new StockDataError(
        data.error || "Unknown Polygon API error",
        this.config.name,
      );
    }

    return data;
  }

  /**
   * 주식 현재가 조회 (전일 종가 사용)
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      // 무료 티어는 실시간 데이터가 없으므로 전일 Daily Open/Close 사용
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // 주말 스킵
      while (yesterday.getDay() === 0 || yesterday.getDay() === 6) {
        yesterday.setDate(yesterday.getDate() - 1);
      }

      const dateStr = yesterday.toISOString().split("T")[0];

      const data = await this.makeRequest<PolygonDailyOpenCloseResponse>(
        `/v1/open-close/${symbol.toUpperCase()}/${dateStr}`,
      );

      if (data.status !== "OK") {
        throw new StockDataError(
          `No data found for symbol: ${symbol}`,
          this.config.name,
        );
      }

      const change = data.close - data.open;
      const changePercent = data.open > 0 ? (change / data.open) * 100 : 0;

      return {
        symbol: data.symbol,
        price: data.close,
        open: data.open,
        high: data.high,
        low: data.low,
        volume: data.volume,
        previousClose: data.open, // 전일 개장가를 전일 종가로 사용
        change,
        changePercent,
        lastUpdated: dateStr,
        currency: "USD",
        market: "US",
      };
    } catch (error) {
      if (error instanceof StockDataError) {
        throw error;
      }
      throw new StockDataError(
        `Failed to fetch quote for ${symbol}: ${error}`,
        this.config.name,
      );
    }
  }

  /**
   * 주식 과거 데이터 조회
   */
  async getHistoricalData(
    symbol: string,
    period: string = "compact",
  ): Promise<StockHistoricalData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();

      // period에 따른 시작일 설정
      if (period === "full") {
        startDate.setFullYear(endDate.getFullYear() - 2); // 2년
      } else {
        startDate.setMonth(endDate.getMonth() - 3); // 3개월
      }

      const data = await this.makeRequest<PolygonAggregatesResponse>(
        `/v2/aggs/ticker/${symbol.toUpperCase()}/range/1/day/${startDate.toISOString().split("T")[0]}/${endDate.toISOString().split("T")[0]}`,
      );

      if (data.status !== "OK" || !data.results) {
        throw new StockDataError(
          `No historical data found for symbol: ${symbol}`,
          this.config.name,
        );
      }

      return data.results
        .map((item) => ({
          symbol: symbol.toUpperCase(),
          date: new Date(item.t).toISOString().split("T")[0],
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
          volume: item.v,
        }))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    } catch (error) {
      if (error instanceof StockDataError) {
        throw error;
      }
      throw new StockDataError(
        `Failed to fetch historical data for ${symbol}: ${error}`,
        this.config.name,
      );
    }
  }

  /**
   * 배당 정보 조회
   */
  async getDividendInfo(symbol: string): Promise<DividendInfo> {
    try {
      // 최근 1년간의 배당 데이터 조회
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const startDateStr = startDate.toISOString().split("T")[0];

      const data = await this.makeRequest<PolygonDividendsResponse>(
        `/v3/reference/dividends`,
        {
          ticker: symbol.toUpperCase(),
          "ex_dividend_date.gte": startDateStr,
          "ex_dividend_date.lte": endDate,
          limit: "50",
        },
      );

      if (data.status !== "OK" || !data.results || data.results.length === 0) {
        // 배당 데이터가 없는 경우 0으로 반환
        return {
          symbol: symbol.toUpperCase(),
          dividendPerShare: 0,
          dividendYield: 0,
          frequency: "quarterly",
          currency: "USD",
        };
      }

      // 최근 배당들만 필터링 (Cash Dividend만)
      const cashDividends = data.results.filter(
        (d) => d.dividend_type === "CD",
      );

      if (cashDividends.length === 0) {
        return {
          symbol: symbol.toUpperCase(),
          dividendPerShare: 0,
          dividendYield: 0,
          frequency: "quarterly",
          currency: "USD",
        };
      }

      // 최근 배당 정보
      const latestDividend = cashDividends[0];

      // 연간 배당금 계산 (최근 4분기 또는 12개월)
      const annualDividendAmount = cashDividends
        .slice(0, Math.min(4, cashDividends.length))
        .reduce((sum, div) => sum + div.cash_amount, 0);

      // 배당 수익률은 현재가가 있어야 계산 가능하므로 0으로 설정
      // (실제 구현에서는 현재가 조회 후 계산)

      // 배당 이력 생성
      const dividendHistory: DividendHistoryItem[] = data.results.map(div => ({
        exDividendDate: div.ex_dividend_date,
        payDate: div.pay_date,
        recordDate: div.record_date,
        declarationDate: div.declaration_date,
        cashAmount: div.cash_amount,
        dividendType: div.dividend_type,
        frequency: div.frequency,
      }));

      // 미래 지급 예정일 찾기 (현재 날짜 이후)
      const today = new Date().toISOString().split('T')[0];
      const futureDividends = data.results.filter(d => d.pay_date && d.pay_date > today);
      const nextPaymentDate = futureDividends.length > 0 ? futureDividends[0].pay_date : undefined;

      // 가장 최근 지급일 찾기
      const pastDividends = data.results.filter(d => d.pay_date && d.pay_date <= today);
      const lastPaymentDate = pastDividends.length > 0 ? pastDividends[0].pay_date : undefined;

      // 미래 기준일 찾기 (현재 날짜 이후)
      const futureRecords = data.results.filter(d => d.record_date && d.record_date > today);
      const nextRecordDate = futureRecords.length > 0 ? futureRecords[0].record_date : undefined;

      // 가장 최근 기준일 찾기
      const pastRecords = data.results.filter(d => d.record_date && d.record_date <= today);
      const lastRecordDate = pastRecords.length > 0 ? pastRecords[0].record_date : undefined;

      return {
        symbol: latestDividend.ticker,
        dividendPerShare: latestDividend.cash_amount, // 최근 단일 배당금
        dividendYield: 0, // 현재가 없이는 계산 불가
        frequency: this.determineDividendFrequency(cashDividends),
        currency: "USD",
        dividendHistory,
        nextPaymentDate,
        lastPaymentDate,
        nextRecordDate,
        lastRecordDate,
        annualDividendAmount,
      };
    } catch (error) {
      if (error instanceof StockDataError) {
        throw error;
      }
      throw new StockDataError(
        `Failed to fetch dividend info for ${symbol}: ${error}`,
        this.config.name,
      );
    }
  }

  /**
   * 배당 주기 추정 (frequency 값 우선, 날짜 분석 보조)
   */
  private determineDividendFrequency(
    dividends: any[],
  ): "weekly" | "monthly" | "quarterly" | "semi-annually" | "annually" {
    if (dividends.length === 0) return "quarterly";

    // 1. 먼저 API의 frequency 값 확인 (가장 최근 배당의 frequency)
    const latestDividend = dividends[0];
    if (latestDividend.frequency && typeof latestDividend.frequency === 'number') {
      const freq = latestDividend.frequency;
      
      // frequency 값으로 주기 판단
      if (freq >= 52) return "weekly";     // 52회 이상 = 주간
      if (freq >= 24) return "monthly";    // 24회 이상 = 반월/월간
      if (freq >= 12) return "monthly";    // 12회 이상 = 월간
      if (freq >= 4) return "quarterly";   // 4회 이상 = 분기
      if (freq >= 2) return "semi-annually"; // 2회 이상 = 반기
      if (freq >= 1) return "annually";    // 1회 = 연간
    }

    // 2. frequency 값이 없으면 과거 1년간 배당 횟수로 추정
    if (dividends.length < 2) return "quarterly";

    // 최근 12개월간 배당 횟수 계산
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    
    const recentDividends = dividends.filter(
      div => div.ex_dividend_date >= oneYearAgoStr
    );
    
    const count = recentDividends.length;
    if (count >= 48) return "weekly";        // 48회 이상 = 주간
    if (count >= 24) return "monthly";       // 24회 이상 = 반월/월간  
    if (count >= 12) return "monthly";       // 12회 이상 = 월간
    if (count >= 4) return "quarterly";      // 4회 이상 = 분기
    if (count >= 2) return "semi-annually";  // 2회 이상 = 반기
    return "annually";                       // 1회 이하 = 연간
  }

  /**
   * 회사 정보 조회
   */
  async getCompanyInfo(symbol: string): Promise<CompanyInfo> {
    try {
      const data = await this.makeRequest<PolygonTickerResponse>(
        `/v3/reference/tickers/${symbol.toUpperCase()}`,
      );

      if (data.status !== "OK" || !data.results) {
        throw new StockDataError(
          `No company data found for symbol: ${symbol}`,
          this.config.name,
        );
      }

      const ticker = data.results;

      return {
        symbol: ticker.ticker,
        name: ticker.name,
        description: `${ticker.name} is traded on ${ticker.primary_exchange}`,
        sector: "Unknown", // Polygon 기본 endpoint에서는 섹터 정보 제한적
        industry: "Unknown",
        exchange: ticker.primary_exchange,
        currency: ticker.currency_name === "usd" ? "USD" : "KRW",
        country: ticker.locale === "us" ? "US" : "KR",
        marketCap: 0, // 기본 endpoint에서는 시가총액 정보 없음
      };
    } catch (error) {
      if (error instanceof StockDataError) {
        throw error;
      }
      throw new StockDataError(
        `Failed to fetch company info for ${symbol}: ${error}`,
        this.config.name,
      );
    }
  }

  /**
   * 심볼 검색
   */
  async searchSymbols(query: string): Promise<StockSearchResult[]> {
    try {
      const data = await this.makeRequest<PolygonTickerSearchResponse>(
        `/v3/reference/tickers`,
        {
          search: query,
          market: "stocks",
          active: "true",
          limit: "20",
        },
      );

      if (data.status !== "OK" || !data.results) {
        return [];
      }

      return data.results.map((ticker) => ({
        symbol: ticker.ticker,
        name: ticker.name,
        type: ticker.type,
        region: ticker.locale === "us" ? "United States" : "Unknown",
        marketOpen: "09:30",
        marketClose: "16:00",
        timezone: "UTC-05",
        currency: ticker.currency_name.toUpperCase(),
        matchScore: 1, // Polygon은 매치 스코어를 제공하지 않음
      }));
    } catch (error) {
      if (error instanceof StockDataError) {
        throw error;
      }
      throw new StockDataError(
        `Failed to search symbols for query: ${query}: ${error}`,
        this.config.name,
      );
    }
  }

  /**
   * 서비스 상태 확인
   */
  async isHealthy(): Promise<boolean> {
    try {
      // 간단한 테스트 쿼리 실행
      await this.getQuote("AAPL");
      return true;
    } catch (error) {
      console.error("Polygon health check failed:", error);
      return false;
    }
  }

  /**
   * Rate limit 정보 조회
   */
  getRateLimitInfo() {
    return {
      provider: this.config.name,
      requestsToday: this.dailyRequestCount,
      dailyLimit: this.config.rateLimit.requestsPerDay,
      remainingToday:
        this.config.rateLimit.requestsPerDay - this.dailyRequestCount,
      requestsPerMinute: this.config.rateLimit.requestsPerMinute,
    };
  }
}

/**
 * 폴백 데이터 제공자 (정적 데이터)
 */
export class FallbackDataProvider implements IStockDataService {
  async getQuote(symbol: string): Promise<StockQuote> {
    return {
      symbol: symbol.toUpperCase(),
      price: 100,
      open: 99,
      high: 102,
      low: 98,
      volume: 1000000,
      previousClose: 99,
      change: 1,
      changePercent: 1.01,
      lastUpdated: new Date().toISOString().split("T")[0],
      currency: "USD",
      market: "US",
    };
  }

  async getHistoricalData(): Promise<StockHistoricalData[]> {
    return [];
  }

  async getDividendInfo(symbol: string): Promise<DividendInfo> {
    return {
      symbol: symbol.toUpperCase(),
      dividendPerShare: 0,
      dividendYield: 0,
      frequency: "quarterly",
      currency: "USD",
    };
  }

  async getCompanyInfo(symbol: string): Promise<CompanyInfo> {
    return {
      symbol: symbol.toUpperCase(),
      name: "Unknown Company",
      description: "No description available",
      sector: "Unknown",
      industry: "Unknown",
      exchange: "Unknown",
      currency: "USD",
      country: "US",
      marketCap: 0,
    };
  }

  async searchSymbols(): Promise<StockSearchResult[]> {
    return [];
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

