import type { ExchangeRate } from "@/shared/types";

// API 엔드포인트들
const EXCHANGE_RATE_API_BASE = "https://v6.exchangerate-api.com/v6";
const FREE_API_BASE = "https://api.exchangerate-api.com/v4/latest";
const FIXER_API_BASE = "https://api.fixer.io/v1";
const CURRENCY_API_BASE = "https://api.currencyapi.com/v3";

// 기본 USD/KRW 환율 (API 실패시 폴백)
const FALLBACK_RATE = 1400;

interface ExchangeRateApiResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

interface FreeApiResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface FixerApiResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface CurrencyApiResponse {
  meta: {
    last_updated_at: string;
  };
  data: Record<string, {
    code: string;
    value: number;
  }>;
}

/**
 * 실시간 USD/KRW 환율 가져오기 (캐시 없이 직접 API 호출)
 */
export async function fetchLatestUsdKrwRate(): Promise<number> {
  try {
    // API에서 직접 데이터 가져오기
    const rate = await fetchFromApi();
    return rate;
  } catch (error) {
    console.error("환율 가져오기 실패:", error);
    // 폴백: 기본 환율 사용
    return FALLBACK_RATE;
  }
}

/**
 * API에서 환율 데이터 가져오기 (여러 API 시도)
 */
async function fetchFromApi(): Promise<number> {
  const apis = [
    () => fetchFromExchangeRateApi(),
    () => fetchFromCurrencyApi(),
    () => fetchFromFixerApi(),
    () => fetchFromFallbackApi()
  ];

  for (const fetchFunction of apis) {
    try {
      const rate = await fetchFunction();
      if (rate && rate > 0) {
        console.log(`환율 API 성공: ${rate}`);
        return rate;
      }
    } catch (error) {
      console.warn("API 호출 실패, 다음 API 시도:", error);
    }
  }

  throw new Error("모든 환율 API 호출 실패");
}

/**
 * ExchangeRate-API.com 에서 데이터 가져오기
 */
async function fetchFromExchangeRateApi(): Promise<number> {
  const response = await fetch(`${FREE_API_BASE}/USD`);

  if (!response.ok) {
    throw new Error(`Exchange Rate API 오류: ${response.status}`);
  }

  const data: FreeApiResponse = await response.json();

  if (!data.rates || !data.rates.KRW) {
    throw new Error("KRW 환율 데이터가 없습니다");
  }

  return data.rates.KRW;
}

/**
 * CurrencyAPI.com에서 데이터 가져오기
 */
async function fetchFromCurrencyApi(): Promise<number> {
  const apiKey = process.env.CURRENCY_API_KEY;
  if (!apiKey) {
    throw new Error("Currency API 키가 없습니다");
  }

  const response = await fetch(
    `${CURRENCY_API_BASE}/latest?apikey=${apiKey}&currencies=KRW&base_currency=USD`
  );

  if (!response.ok) {
    throw new Error(`Currency API 오류: ${response.status}`);
  }

  const data: CurrencyApiResponse = await response.json();

  if (!data.data || !data.data.KRW) {
    throw new Error("KRW 환율 데이터가 없습니다");
  }

  return data.data.KRW.value;
}

/**
 * Fixer.io에서 데이터 가져오기
 */
async function fetchFromFixerApi(): Promise<number> {
  const apiKey = process.env.FIXER_API_KEY;
  if (!apiKey) {
    throw new Error("Fixer API 키가 없습니다");
  }

  const response = await fetch(
    `${FIXER_API_BASE}/latest?access_key=${apiKey}&base=USD&symbols=KRW`
  );

  if (!response.ok) {
    throw new Error(`Fixer API 오류: ${response.status}`);
  }

  const data: FixerApiResponse = await response.json();

  if (!data.success || !data.rates || !data.rates.KRW) {
    throw new Error("KRW 환율 데이터가 없습니다");
  }

  return data.rates.KRW;
}

/**
 * 한국은행 공개 API (무료)
 */
async function fetchFromFallbackApi(): Promise<number> {
  // 한국은행 API - 무료이지만 인증키 필요 없는 대체 소스
  const response = await fetch(
    'https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD'
  );

  if (!response.ok) {
    throw new Error(`Dunamu API 오류: ${response.status}`);
  }

  const data = await response.json();

  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error("환율 데이터가 없습니다");
  }

  // KRW/USD를 USD/KRW로 변환
  const krwUsdRate = data[0].basePrice;
  return 1 / krwUsdRate;
}

// 데이터베이스 캐싱 제거 - 실시간 API만 사용

/**
 * 환율 변환 유틸리티
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (fromCurrency === "USD" && toCurrency === "KRW") {
    const rate = await fetchLatestUsdKrwRate();
    return amount * rate;
  }

  if (fromCurrency === "KRW" && toCurrency === "USD") {
    const rate = await fetchLatestUsdKrwRate();
    return amount / rate;
  }

  throw new Error(`지원하지 않는 환율 변환: ${fromCurrency} -> ${toCurrency}`);
}

/**
 * 환율 히스토리 가져오기 (제거됨 - 필요시 외부 API 사용)
 */
export async function getExchangeRateHistory(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30,
): Promise<ExchangeRate[]> {
  // 히스토리 데이터는 저장하지 않으므로 빈 배열 반환
  // 필요시 외부 환율 히스토리 API 연동 가능
  console.warn('환율 히스토리는 더 이상 저장하지 않습니다. 실시간 데이터만 사용합니다.');
  return [];
}

/**
 * 환율 정보 요약
 */
export interface ExchangeRateSummary {
  currentRate: number;
  lastUpdated: string;
  source: string;
  trend: "up" | "down" | "stable";
  changePercent: number;
}

/**
 * 환율 요약 정보 가져오기 (실시간 API만 사용)
 */
export async function getExchangeRateSummary(): Promise<ExchangeRateSummary> {
  const currentRate = await fetchLatestUsdKrwRate();

  // 히스토리 데이터가 없으므로 트렌드는 stable로 설정
  return {
    currentRate,
    lastUpdated: new Date().toISOString(),
    source: "exchangerate-api.com",
    trend: "stable",
    changePercent: 0,
  };
}

/**
 * 환율 업데이트 강제 실행 (실시간 API 호출)
 */
export async function forceUpdateExchangeRate(): Promise<number> {
  try {
    const rate = await fetchFromApi();
    return rate;
  } catch (error) {
    console.error("환율 강제 업데이트 실패:", error);
    throw error;
  }
}

