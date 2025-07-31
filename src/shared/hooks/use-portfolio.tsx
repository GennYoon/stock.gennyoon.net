"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PortfolioStock {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  dividendYield: number;
  monthlyDividend: number;
  totalValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  sector: string;
  nextPaymentDate: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  monthlyDividend: number;
  yearlyDividend: number;
  portfolioYield: number;
  principalRecoveryRate: number;
}

interface PortfolioContextType {
  portfolioData: PortfolioStock[];
  summary: PortfolioSummary | null;
  loading: boolean;
  refreshPortfolio: () => void;
  addStock: (stock: Partial<PortfolioStock>) => void;
  updateStock: (id: string, updates: Partial<PortfolioStock>) => void;
  removeStock: (id: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

interface PortfolioProviderProps {
  children: ReactNode;
}

export const PortfolioProvider = ({ children }: PortfolioProviderProps) => {
  const [portfolioData, setPortfolioData] = useState<PortfolioStock[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - 실제로는 API에서 가져올 데이터
  const mockPortfolioData: PortfolioStock[] = [
    {
      id: "1",
      ticker: "TSLY",
      name: "YieldMax™ TSLA Option Income Strategy ETF",
      shares: 150,
      avgPrice: 15.20,
      currentPrice: 14.85,
      dividendYield: 65.0,
      monthlyDividend: 120.60,
      totalValue: 2227.50,
      unrealizedGain: -52.50,
      unrealizedGainPercent: -2.31,
      sector: "ETF - Option Income",
      nextPaymentDate: "2025-01-20"
    },
    {
      id: "2", 
      ticker: "NVDY",
      name: "YieldMax™ NVDA Option Income Strategy ETF",
      shares: 200,
      avgPrice: 16.80,
      currentPrice: 16.72,
      dividendYield: 72.0,
      monthlyDividend: 200.64,
      totalValue: 3344.00,
      unrealizedGain: -16.00,
      unrealizedGainPercent: -0.48,
      sector: "ETF - Option Income",
      nextPaymentDate: "2025-01-19"
    },
    {
      id: "3",
      ticker: "MSTY", 
      name: "YieldMax™ MSTR Option Income Strategy ETF",
      shares: 100,
      avgPrice: 17.00,
      currentPrice: 17.43,
      dividendYield: 68.0,
      monthlyDividend: 98.77,
      totalValue: 1743.00,
      unrealizedGain: 43.00,
      unrealizedGainPercent: 2.53,
      sector: "ETF - Option Income",
      nextPaymentDate: "2025-01-18"
    },
    {
      id: "4",
      ticker: "CONY",
      name: "YieldMax™ COIN Option Income Strategy ETF", 
      shares: 250,
      avgPrice: 14.20,
      currentPrice: 13.94,
      dividendYield: 85.0,
      monthlyDividend: 246.85,
      totalValue: 3485.00,
      unrealizedGain: -65.00,
      unrealizedGainPercent: -1.83,
      sector: "ETF - Option Income",
      nextPaymentDate: "2025-01-17"
    }
  ];

  // 포트폴리오 요약 계산
  const calculateSummary = (stocks: PortfolioStock[]): PortfolioSummary => {
    const totalValue = stocks.reduce((sum, stock) => sum + stock.totalValue, 0);
    const totalCost = stocks.reduce((sum, stock) => sum + (stock.shares * stock.avgPrice), 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    const monthlyDividend = stocks.reduce((sum, stock) => sum + stock.monthlyDividend, 0);
    const yearlyDividend = monthlyDividend * 12;
    const portfolioYield = totalValue > 0 ? (yearlyDividend / totalValue) * 100 : 0;
    const principalRecoveryRate = totalCost > 0 ? (yearlyDividend / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      monthlyDividend,
      yearlyDividend,
      portfolioYield,
      principalRecoveryRate
    };
  };

  const refreshPortfolio = async () => {
    setLoading(true);
    try {
      // 실제로는 API에서 실시간 데이터를 가져옴
      // const response = await fetch('/api/portfolio');
      // const data = await response.json();
      
      // Mock 데이터로 시뮬레이션
      setTimeout(() => {
        setPortfolioData(mockPortfolioData);
        setSummary(calculateSummary(mockPortfolioData));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('포트폴리오 데이터 로드 실패:', error);
      setLoading(false);
    }
  };

  const addStock = (newStock: Partial<PortfolioStock>) => {
    const stock: PortfolioStock = {
      id: Date.now().toString(),
      ticker: newStock.ticker || '',
      name: newStock.name || '',
      shares: newStock.shares || 0,
      avgPrice: newStock.avgPrice || 0,
      currentPrice: newStock.currentPrice || 0,
      dividendYield: newStock.dividendYield || 0,
      monthlyDividend: newStock.monthlyDividend || 0,
      totalValue: (newStock.shares || 0) * (newStock.currentPrice || 0),
      unrealizedGain: ((newStock.shares || 0) * (newStock.currentPrice || 0)) - ((newStock.shares || 0) * (newStock.avgPrice || 0)),
      unrealizedGainPercent: 0,
      sector: newStock.sector || '',
      nextPaymentDate: newStock.nextPaymentDate || ''
    };

    stock.unrealizedGainPercent = stock.avgPrice > 0 ? (stock.unrealizedGain / (stock.shares * stock.avgPrice)) * 100 : 0;

    const updatedData = [...portfolioData, stock];
    setPortfolioData(updatedData);
    setSummary(calculateSummary(updatedData));
  };

  const updateStock = (id: string, updates: Partial<PortfolioStock>) => {
    const updatedData = portfolioData.map(stock => {
      if (stock.id === id) {
        const updated = { ...stock, ...updates };
        updated.totalValue = updated.shares * updated.currentPrice;
        updated.unrealizedGain = updated.totalValue - (updated.shares * updated.avgPrice);
        updated.unrealizedGainPercent = updated.avgPrice > 0 ? (updated.unrealizedGain / (updated.shares * updated.avgPrice)) * 100 : 0;
        return updated;
      }
      return stock;
    });
    setPortfolioData(updatedData);
    setSummary(calculateSummary(updatedData));
  };

  const removeStock = (id: string) => {
    const updatedData = portfolioData.filter(stock => stock.id !== id);
    setPortfolioData(updatedData);
    setSummary(calculateSummary(updatedData));
  };

  useEffect(() => {
    refreshPortfolio();
  }, []);

  return (
    <PortfolioContext.Provider value={{
      portfolioData,
      summary,
      loading,
      refreshPortfolio,
      addStock,
      updateStock,
      removeStock
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};