"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/shared/hooks/use-currency";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  PieChart,
  Calendar,
  BarChart3,
  Plus,
  ArrowRight,
  Wallet,
  TrendingDown
} from "lucide-react";

interface DividendStats {
  totalPortfolioValue: number;
  monthlyDividend: number;
  yearlyDividend: number;
  dividendYield: number;
  principalRecoveryRate: number;
}

export default function Home() {
  const { formatCurrency, exchangeRate } = useCurrency();
  
  // Mock data for demonstration (in USD)
  const stats: DividendStats = {
    totalPortfolioValue: 11865, // ~$11,865 (15,420,000 KRW)
    monthlyDividend: 69, // ~$69 (89,200 KRW)
    yearlyDividend: 823, // ~$823 (1,070,400 KRW)
    dividendYield: 6.94,
    principalRecoveryRate: 23.5
  };

  const quickActions = [
    {
      title: "포트폴리오 관리",
      description: "보유 배당주 현황 및 성과 분석",
      icon: PieChart,
      color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30",
      iconColor: "text-blue-600",
      href: "/portfolio"
    },
    {
      title: "초고배당주 분석",
      description: "고수익 배당주 발굴 및 시뮬레이션",
      icon: TrendingUp,
      color: "bg-green-50 dark:bg-green-950/30 border-green-200/50 dark:border-green-800/30",
      iconColor: "text-green-600",
      href: "/analysis"
    },
    {
      title: "배당금 목표 계산기",
      description: "월 목표 배당금 달성 전략",
      icon: Target,
      color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200/50 dark:border-orange-800/30",
      iconColor: "text-orange-600",
      href: "/calculator"
    },
    {
      title: "원금 회수율 추적",
      description: "투자 원금 회수 현황 모니터링",
      icon: Wallet,
      color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/30",
      iconColor: "text-purple-600",
      href: "/recovery"
    }
  ];

  const recentDividends = [
    { ticker: "NVDY", amount: 9.60, date: "2025-01-15", type: "수령" },
    { ticker: "TSLY", amount: 6.85, date: "2025-01-12", type: "수령" },
    { ticker: "CONY", amount: 11.70, date: "2025-01-10", type: "예정" },
    { ticker: "MSTY", amount: 9.08, date: "2025-01-08", type: "예정" }
  ];

  return (
    <div className="bg-background">
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 section-spacing">
        {/* Page Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl md:text-4xl font-bold toss-text-gradient">
            배당 투자 대시보드
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            나만의 스마트 배당 투자 비서
          </p>
        </div>

        {/* Portfolio Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">총 포트폴리오</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {formatCurrency(stats.totalPortfolioValue)}
            </div>
            <div className="text-xs price-up font-medium">+2.3%</div>
          </div>
          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">월 배당금</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {formatCurrency(stats.monthlyDividend)}
            </div>
            <div className="text-xs price-up font-medium">+5.2%</div>
          </div>
          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">배당 수익률</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {stats.dividendYield.toFixed(1)}%
            </div>
            <div className="text-xs price-neutral font-medium">평균 7.1%</div>
          </div>
          <div className="toss-metric-card text-center p-3 md:p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">원금 회수율</div>
            <div className="text-lg md:text-xl font-bold text-foreground">
              {stats.principalRecoveryRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground font-medium">목표 100%</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dividend-section">
          <div className="dividend-section-header">
            <h2 className="dividend-section-title">빠른 실행</h2>
            <Button size="sm" className="toss-button-secondary">
              <Plus className="h-3 w-3 mr-1" />
              보유주 추가
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <div className="toss-mini-card cursor-pointer group text-center hover:shadow-md">
                  <action.icon className={`h-8 w-8 mx-auto mb-2 ${action.iconColor} group-hover:scale-110 transition-transform duration-200`} />
                  <h3 className="font-semibold text-sm text-foreground mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Dividends */}
        <div className="dividend-section">
          <div className="dividend-section-header">
            <h2 className="dividend-section-title">최근 배당 내역</h2>
            <Button size="sm" className="toss-button-secondary">
              전체 보기
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          
          <div className="toss-card p-4 md:p-5">
            <div className="space-y-3">
              {recentDividends.map((dividend, index) => (
                <div key={index} className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors duration-200 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:shadow-lg transition-shadow duration-200">
                      <span className="text-white font-bold text-xs md:text-sm">{dividend.ticker}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm md:text-base text-foreground">{dividend.ticker}</div>
                      <div className="text-xs text-muted-foreground">{dividend.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm md:text-base ${dividend.type === '수령' ? 'price-up' : 'text-blue-600'}`}>
                      {formatCurrency(dividend.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">{dividend.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Market Overview */}
        <div className="dividend-section">
          <h2 className="dividend-section-title">시장 동향</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="toss-card p-4 md:p-5 hover:shadow-md transition-shadow duration-200 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-sm md:text-base text-foreground">고배당 ETF</h3>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold price-up mb-1">+2.1%</div>
              <p className="text-xs text-muted-foreground">이번 주 평균 상승률</p>
            </div>
            
            <div className="toss-card p-4 md:p-5 hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-sm md:text-base text-foreground">USD/KRW</h3>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-foreground mb-1">
                {Math.round(exchangeRate).toLocaleString()}원
              </div>
              <p className="text-xs price-up">실시간 환율</p>
            </div>
            
            <div className="toss-card p-4 md:p-5 hover:shadow-md transition-shadow duration-200 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-sm md:text-base text-foreground">이번 주 배당</h3>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-foreground mb-1">8종목</div>
              <p className="text-xs text-muted-foreground">배당금 지급 예정</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}