import type { ExchangeRate } from "@/shared/types";
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// API 엔드포인트들
const EXCHANGE_RATE_API_BASE = "https://v6.exchangerate-api.com/v6";
const FREE_API_BASE = "https://api.exchangerate-api.com/v4/latest";
const FIXER_API_BASE = "https://api.fixer.io/v1";
const CURRENCY_API_BASE = "https://api.currencyapi.com/v3";

// 캐시 설정 - 더 자주 업데이트 (15분)
const CACHE_DURATION = 15 * 60 * 1000; // 15분 (밀리초)
const FALLBACK_RATE = 1400; // 기본 USD/KRW 환율

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
 * 실시간 USD/KRW 환율 가져오기
 */
export async function fetchLatestUsdKrwRate(): Promise<number> {
  try {
    // 1. 캐시된 데이터 확인
    const cachedRate = await getCachedExchangeRate("USD", "KRW");
    if (cachedRate && isCacheValid(cachedRate.timestamp)) {
      return cachedRate.rate;
    }

    // 2. API에서 새로운 데이터 가져오기
    const rate = await fetchFromApi();

    // 3. 데이터베이스에 저장
    await saveExchangeRate("USD", "KRW", rate, "exchangerate-api.com");

    return rate;
  } catch (error) {
    console.error("환율 가져오기 실패:", error);

    // 4. 폴백: 가장 최근 캐시된 데이터 사용
    const fallbackRate = await getFallbackRate();
    return fallbackRate;
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
    () => fetchFromFreeApi(),
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

/**
 * 캐시된 환율 데이터 가져오기 (Supabase)
 */
async function getCachedExchangeRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<ExchangeRate | null> {
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      fromCurrency: data.from_currency,
      toCurrency: data.to_currency,
      rate: data.rate,
      timestamp: data.timestamp,
      source: data.source
    };
  } catch (error) {
    console.error('캐시된 환율 데이터 가져오기 실패:', error);
    return null;
  }
}

/**
 * 캐시 유효성 검사
 */
function isCacheValid(timestamp: string): boolean {
  const cacheTime = new Date(timestamp).getTime();
  const now = Date.now();
  return now - cacheTime < CACHE_DURATION;
}

/**
 * 환율 데이터 저장 (Supabase)
 */
async function saveExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  source: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('exchange_rates')
      .insert({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
        timestamp: new Date().toISOString(),
        source,
      });

    if (error) {
      throw new Error(`데이터베이스 저장 실패: ${error.message}`);
    }
  } catch (error) {
    console.error('환율 데이터 저장 실패:', error);
    throw error;
  }
}

/**
 * 폴백 환율 가져오기 (Supabase)
 */
async function getFallbackRate(): Promise<number> {
  try {
    // 가장 최근 저장된 환율 사용
    const latestRate = await getCachedExchangeRate("USD", "KRW");
    if (latestRate) {
      return latestRate.rate;
    }
  } catch (error) {
    console.warn("저장된 환율 데이터 가져오기 실패:", error);
  }

  // 최후의 수단: 하드코딩된 기본값
  return FALLBACK_RATE;
}

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
 * 환율 히스토리 가져오기 (Supabase)
 */
export async function getExchangeRateHistory(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30,
): Promise<ExchangeRate[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .gte('timestamp', cutoffDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`환율 히스토리 조회 실패: ${error.message}`);
    }

    return (data || []).map(item => ({
      id: item.id,
      fromCurrency: item.from_currency,
      toCurrency: item.to_currency,
      rate: item.rate,
      timestamp: item.timestamp,
      source: item.source
    }));
  } catch (error) {
    console.error('환율 히스토리 가져오기 실패:', error);
    return [];
  }
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
 * 환율 요약 정보 가져오기 (Supabase)
 */
export async function getExchangeRateSummary(): Promise<ExchangeRateSummary> {
  const currentRate = await fetchLatestUsdKrwRate();
  const latestRecord = await getCachedExchangeRate("USD", "KRW");

  // 24시간 전 환율과 비교
  const history = await getExchangeRateHistory("USD", "KRW", 2);
  const previousRate = history.length > 1 ? history[1].rate : currentRate;

  const changePercent = ((currentRate - previousRate) / previousRate) * 100;
  let trend: "up" | "down" | "stable" = "stable";

  if (Math.abs(changePercent) > 0.1) {
    trend = changePercent > 0 ? "up" : "down";
  }

  return {
    currentRate,
    lastUpdated: latestRecord?.timestamp || new Date().toISOString(),
    source: latestRecord?.source || "exchangerate-api.com",
    trend,
    changePercent,
  };
}

/**
 * 환율 업데이트 강제 실행
 */
export async function forceUpdateExchangeRate(): Promise<number> {
  try {
    const rate = await fetchFromApi();
    await saveExchangeRate("USD", "KRW", rate, "manual-update");
    return rate;
  } catch (error) {
    console.error("환율 강제 업데이트 실패:", error);
    throw error;
  }
}

