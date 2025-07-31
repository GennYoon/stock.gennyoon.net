import { useState, useEffect } from 'react';

export interface DividendStock {
  id: string;
  ticker: string;
  name: string;
  exchange: 'US' | 'KR';
  sector?: string;
  currency: string;
  currentPrice: number;
  priceDate?: string;
  dividendYield: number;
  annualDividend: number;
  quarterlyDividend: number;
  monthlyDividend: number;
  dividendFrequency: 'monthly' | 'quarterly' | 'annually';
  exDividendDate?: string;
  paymentDate?: string;
  payoutRatio?: number;
  dividendGrowthRate?: number;
}

export interface StockFilters {
  exchange?: 'ALL' | 'US' | 'KR';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PaginationInfo {
  offset: number;
  limit: number;
  total: number | null;
  hasMore: boolean;
}

export function useDividendStocks(filters: StockFilters = {}) {
  const [stocks, setStocks] = useState<DividendStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    offset: 0,
    limit: 50,
    total: null,
    hasMore: false,
  });

  const fetchStocks = async (newFilters: StockFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      const mergedFilters = { ...filters, ...newFilters };
      
      if (mergedFilters.exchange) params.set('exchange', mergedFilters.exchange);
      if (mergedFilters.search) params.set('search', mergedFilters.search);
      if (mergedFilters.sortBy) params.set('sortBy', mergedFilters.sortBy);
      if (mergedFilters.sortOrder) params.set('sortOrder', mergedFilters.sortOrder);
      if (mergedFilters.limit) params.set('limit', mergedFilters.limit.toString());
      if (mergedFilters.offset) params.set('offset', mergedFilters.offset.toString());

      const response = await fetch(`/api/stocks?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const result = await response.json();
      
      setStocks(result.data || []);
      setPagination(result.pagination || {
        offset: 0,
        limit: 50,
        total: null,
        hasMore: false,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchStocks();
  }, []);

  // 필터 변경 시 재조회
  const refetch = (newFilters: StockFilters = {}) => {
    fetchStocks(newFilters);
  };

  // 다음 페이지 로드
  const loadMore = () => {
    if (!pagination.hasMore || loading) return;
    
    fetchStocks({
      ...filters,
      offset: pagination.offset + pagination.limit,
    });
  };

  return {
    stocks,
    loading,
    error,
    pagination,
    refetch,
    loadMore,
  };
}

// 특정 주식 상세 정보 조회 훅
export function useStockDetail(ticker: string) {
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;

    const fetchStockDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/stocks/${ticker}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('주식 정보를 찾을 수 없습니다.');
          }
          throw new Error(`API 오류: ${response.status}`);
        }

        const result = await response.json();
        setStock(result.data);

      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        setStock(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStockDetail();
  }, [ticker]);

  const refetch = () => {
    if (ticker) {
      // fetchStockDetail을 다시 호출
    }
  };

  return {
    stock,
    loading,
    error,
    refetch,
  };
}

// 환율 정보 조회 훅
export function useExchangeRate(fromCurrency = 'USD', toCurrency = 'KRW', days = 30) {
  const [exchangeRate, setExchangeRate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          from: fromCurrency,
          to: toCurrency,
          days: days.toString(),
        });

        const response = await fetch(`/api/exchange-rates?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`환율 API 오류: ${response.status}`);
        }

        const result = await response.json();
        setExchangeRate(result);

      } catch (err) {
        setError(err instanceof Error ? err.message : '환율 정보를 가져올 수 없습니다.');
        setExchangeRate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRate();
  }, [fromCurrency, toCurrency, days]);

  return {
    exchangeRate,
    loading,
    error,
  };
}