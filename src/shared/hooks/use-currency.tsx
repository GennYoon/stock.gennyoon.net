'use client';

import { useState, useEffect, createContext, useContext } from 'react';

export interface CurrencyContextType {
  currency: 'USD' | 'KRW';
  setCurrency: (currency: 'USD' | 'KRW') => void;
  exchangeRate: number;
  formatCurrency: (amount: number, fromCurrency?: 'USD' | 'KRW') => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  exchangeRate: 1300,
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState<'USD' | 'KRW'>('USD');
  const [exchangeRate, setExchangeRate] = useState(1300); // 기본값 1달러 = 1300원

  // 환율 정보 가져오기
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.rate) {
            setExchangeRate(result.data.rate);
          }
        }
      } catch (error) {
        console.warn('환율 정보 가져오기 실패:', error);
      }
    };

    fetchExchangeRate();
  }, []);

  const formatCurrency = (amount: number, fromCurrency: 'USD' | 'KRW' = 'USD'): string => {
    if (currency === 'USD') {
      if (fromCurrency === 'KRW') {
        return `$${(amount / exchangeRate).toFixed(2)}`;
      }
      return `$${amount.toFixed(2)}`;
    } else {
      if (fromCurrency === 'USD') {
        return `${Math.round(amount * exchangeRate).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`;
      }
      return `${Math.round(amount).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`;
    }
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      exchangeRate,
      formatCurrency,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};