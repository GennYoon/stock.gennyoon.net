// 기본 엔티티 타입들
export interface User {
  id: string;
  name: string;
  email: string;
  currency: 'KRW' | 'USD';
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  id: string;
  ticker: string;
  name: string;
  market: 'US' | 'KR';
  sector: string;
  currency: 'USD' | 'KRW';
  currentPrice: number;
  dividendYield: number;
  secYield?: number;
  dividendFrequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  exDividendDate?: string;
  paymentDate?: string;
  strategy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Holding {
  id: string;
  portfolioId: string;
  stockId: string;
  shares: number;
  averageCost: number;
  purchaseDate: string;
  exchangeRateAtPurchase?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DividendRecord {
  id: string;
  holdingId: string;
  stockId: string;
  amount: number;
  currency: 'USD' | 'KRW';
  exDividendDate: string;
  paymentDate: string;
  recordDate: string;
  dividendType: 'regular' | 'special' | 'qualified' | 'non-qualified';
  exchangeRate?: number;
  amountInKRW?: number;
  status: 'projected' | 'confirmed' | 'received';
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  stockId: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  totalAmount: number;
  currency: 'USD' | 'KRW';
  exchangeRate?: number;
  totalAmountInKRW?: number;
  fees: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: string;
  source: string;
}

// 계산된 데이터 타입들
export interface PortfolioSummary {
  portfolioId: string;
  totalValue: number;
  totalValueKRW: number;
  totalCost: number;
  totalCostKRW: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  annualDividendProjection: number;
  annualDividendProjectionKRW: number;
  monthlyDividendProjection: number;
  dividendYield: number;
  principalRecoveryRate: number;
  holdings: HoldingSummary[];
}

export interface HoldingSummary {
  holding: Holding;
  stock: Stock;
  currentValue: number;
  currentValueKRW: number;
  totalCost: number;
  totalCostKRW: number;
  gainLoss: number;
  gainLossPercent: number;
  annualDividendProjection: number;
  annualDividendProjectionKRW: number;
  dividendRecords: DividendRecord[];
  totalDividendsReceived: number;
  totalDividendsReceivedKRW: number;
}

export interface DividendCalendar {
  month: string;
  year: number;
  expectedDividends: DividendCalendarEntry[];
  totalAmount: number;
  totalAmountKRW: number;
}

export interface DividendCalendarEntry {
  stock: Stock;
  holding: Holding;
  projectedAmount: number;
  projectedAmountKRW: number;
  exDividendDate: string;
  paymentDate: string;
  status: 'projected' | 'confirmed' | 'received';
}

export interface DividendGoal {
  id: string;
  userId: string;
  targetMonthlyAmount: number;
  targetCurrency: 'USD' | 'KRW';
  targetDate: string;
  currentProgress: number;
  requiredInvestment: number;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  priceChangePercent: number;
  dividendChangePercent: number;
  timeHorizonMonths: number;
}

export interface SimulationResult {
  scenario: SimulationScenario;
  stockId: string;
  investmentAmount: number;
  finalValue: number;
  totalDividends: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
}

// UI 관련 타입들
export interface StockSearchResult {
  stock: Stock;
  relevanceScore: number;
}

export interface DashboardMetrics {
  totalPortfolioValue: number;
  totalPortfolioValueKRW: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  annualDividendProjection: number;
  monthlyDividendProjection: number;
  principalRecoveryRate: number;
  averageDividendYield: number;
}

// API 응답 타입들
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 기존 ETF 타입 (호환성 유지)
export interface DividendETF {
  id: string;
  name: string;
  ticker: string;
  distributionRate: number;
  secYield: number;
  strategy: string;
  nextPaymentDate: string;
}