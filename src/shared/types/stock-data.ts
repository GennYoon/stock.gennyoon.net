// 외부 API 응답 타입들
export interface AlphaVantageQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

export interface AlphaVantageTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

export interface AlphaVantageCompanyOverviewResponse {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  CIK: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  Address: string;
  FiscalYearEnd: string;
  LatestQuarter: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  '52WeekHigh': string;
  '52WeekLow': string;
  '50DayMovingAverage': string;
  '200DayMovingAverage': string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
}

// 정규화된 데이터 타입들
export interface StockQuote {
  symbol: string;
  name?: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  currency: 'USD' | 'KRW';
  market: 'US' | 'KR';
}

export interface StockHistoricalData {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DividendInfo {
  symbol: string;
  dividendPerShare: number;
  dividendYield: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  currency: 'USD' | 'KRW';
  dividendHistory?: DividendHistoryItem[];
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  nextRecordDate?: string;
  lastRecordDate?: string;
  annualDividendAmount?: number;
}

export interface DividendHistoryItem {
  exDividendDate: string;
  payDate?: string;
  recordDate?: string;
  declarationDate?: string;
  cashAmount: number;
  dividendType: 'CD' | 'SC' | 'LT' | 'ST'; // Cash Dividend, Special Cash, Long-term, Short-term
  frequency?: number;
}

export interface CompanyInfo {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  exchange: string;
  currency: 'USD' | 'KRW';
  country: string;
  marketCap: number;
  peRatio?: number;
  bookValue?: number;
  beta?: number;
  week52High?: number;
  week52Low?: number;
  averageVolume?: number;
  sharesOutstanding?: number;
}

// 주식 검색 결과
export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: number;
}

// API 응답 래퍼
export interface StockDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  timestamp: string;
  rateLimit?: {
    remaining: number;
    resetTime: string;
  };
}

// 캐시 메타데이터
export interface CacheMetadata {
  key: string;
  data: any;
  timestamp: string;
  expiresAt: string;
  source: string;
  hitCount: number;
}

// Rate limiting 설정
export interface RateLimitConfig {
  provider: string;
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number;
  retryAfter: number;
}

// 데이터 제공자 설정
export interface DataProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl: string;
  rateLimit: RateLimitConfig;
  supportedMarkets: ('US' | 'KR')[];
  features: {
    realTimeQuotes: boolean;
    historicalData: boolean;
    dividendData: boolean;
    companyInfo: boolean;
    search: boolean;
  };
}

// 주식 데이터 서비스 인터페이스
export interface IStockDataService {
  getQuote(symbol: string): Promise<StockQuote>;
  getHistoricalData(symbol: string, period?: string): Promise<StockHistoricalData[]>;
  getDividendInfo(symbol: string): Promise<DividendInfo>;
  getCompanyInfo(symbol: string): Promise<CompanyInfo>;
  searchSymbols(query: string): Promise<StockSearchResult[]>;
  isHealthy(): Promise<boolean>;
}

// 에러 타입들
export class StockDataError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public rateLimited?: boolean
  ) {
    super(message);
    this.name = 'StockDataError';
  }
}

export class RateLimitError extends StockDataError {
  constructor(provider: string, resetTime: string) {
    super(`Rate limit exceeded for ${provider}. Reset at: ${resetTime}`, provider, 429, true);
    this.name = 'RateLimitError';
  }
}