"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ExchangeRateSummary } from '@/shared/utils/exchange-rate';

interface ExchangeRateData {
  rate: number;
  fromCurrency: string;
  toCurrency: string;
  timestamp: string;
}

interface UseExchangeRateReturn {
  data: ExchangeRateData | null;
  summary: ExchangeRateSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  forceUpdate: () => Promise<void>;
}

/**
 * 실시간 환율 정보를 관리하는 React Hook
 */
export function useExchangeRate(
  autoRefresh: boolean = true,
  refreshInterval: number = 5 * 60 * 1000 // 5분
): UseExchangeRateReturn {
  const [data, setData] = useState<ExchangeRateData | null>(null);
  const [summary, setSummary] = useState<ExchangeRateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 환율 데이터 가져오기
   */
  const fetchExchangeRate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 기본 환율 데이터와 요약 정보를 병렬로 가져오기
      const [basicResponse, summaryResponse] = await Promise.all([
        fetch('/api/exchange-rate'),
        fetch('/api/exchange-rate?summary=true')
      ]);

      if (!basicResponse.ok || !summaryResponse.ok) {
        throw new Error('환율 API 호출 실패');
      }

      const basicResult = await basicResponse.json();
      const summaryResult = await summaryResponse.json();

      if (basicResult.success && summaryResult.success) {
        setData(basicResult.data);
        setSummary(summaryResult.data);
      } else {
        throw new Error(basicResult.error || summaryResult.error || '환율 데이터 처리 실패');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(errorMessage);
      console.error('환율 데이터 가져오기 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 환율 강제 업데이트
   */
  const forceUpdate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/exchange-rate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('환율 업데이트 실패');
      }

      const result = await response.json();

      if (result.success) {
        // 업데이트 후 최신 데이터 다시 가져오기
        await fetchExchangeRate();
      } else {
        throw new Error(result.error || '환율 업데이트 처리 실패');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(errorMessage);
      console.error('환율 강제 업데이트 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchExchangeRate]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchExchangeRate();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchExchangeRate]);

  return {
    data,
    summary,
    loading,
    error,
    refetch: fetchExchangeRate,
    forceUpdate,
  };
}

/**
 * 환율 변환 Hook
 */
export function useCurrencyConverter() {
  const { data: exchangeRate } = useExchangeRate();

  const convert = useCallback((
    amount: number,
    fromCurrency: 'USD' | 'KRW',
    toCurrency: 'USD' | 'KRW'
  ): number => {
    if (!exchangeRate || fromCurrency === toCurrency) {
      return amount;
    }

    if (fromCurrency === 'USD' && toCurrency === 'KRW') {
      return amount * exchangeRate.rate;
    }

    if (fromCurrency === 'KRW' && toCurrency === 'USD') {
      return amount / exchangeRate.rate;
    }

    return amount;
  }, [exchangeRate]);

  const formatCurrency = useCallback((
    amount: number,
    currency: 'USD' | 'KRW'
  ): string => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    } else {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
      }).format(amount);
    }
  }, []);

  return {
    convert,
    formatCurrency,
    exchangeRate: exchangeRate?.rate || null,
    isLoaded: !!exchangeRate,
  };
}