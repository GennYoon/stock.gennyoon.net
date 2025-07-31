import type { DividendInfo, StockQuote } from '@/shared/types/stock-data';

/**
 * 배당 계산 유틸리티 클래스
 */
export class DividendCalculator {
  /**
   * 배당 수익률 계산 (현재가 기준)
   */
  static calculateDividendYield(
    annualDividendAmount: number,
    currentPrice: number
  ): number {
    if (currentPrice <= 0) return 0;
    return (annualDividendAmount / currentPrice) * 100;
  }

  /**
   * 연간 배당금 추정 (배당 이력 기반)
   */
  static estimateAnnualDividend(dividendInfo: DividendInfo): number {
    if (!dividendInfo.dividendHistory || dividendInfo.dividendHistory.length === 0) {
      return dividendInfo.annualDividendAmount || 0;
    }

    // 최근 12개월 배당금 합계
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const recentDividends = dividendInfo.dividendHistory.filter(
      div => div.exDividendDate >= oneYearAgoStr && div.dividendType === 'CD'
    );

    if (recentDividends.length === 0) {
      // 최근 12개월 데이터가 없으면 주기별 추정
      return this.estimateByFrequency(dividendInfo);
    }

    return recentDividends.reduce((sum, div) => sum + div.cashAmount, 0);
  }

  /**
   * 배당 주기별 연간 배당금 추정
   */
  private static estimateByFrequency(dividendInfo: DividendInfo): number {
    const latestDividend = dividendInfo.dividendPerShare;
    
    switch (dividendInfo.frequency) {
      case 'weekly':
        return latestDividend * 52;
      case 'monthly':
        return latestDividend * 12;
      case 'quarterly':
        return latestDividend * 4;
      case 'semi-annually':
        return latestDividend * 2;
      case 'annually':
        return latestDividend;
      default:
        return latestDividend * 4; // 기본값: 분기별
    }
  }

  /**
   * 다음 배당락일 예측
   */
  static predictNextExDividendDate(dividendInfo: DividendInfo): string | null {
    if (!dividendInfo.dividendHistory || dividendInfo.dividendHistory.length < 2) {
      return null;
    }

    const sortedHistory = dividendInfo.dividendHistory
      .filter(div => div.dividendType === 'CD')
      .sort((a, b) => new Date(b.exDividendDate).getTime() - new Date(a.exDividendDate).getTime());

    if (sortedHistory.length < 2) return null;

    // 최근 두 배당락일 간의 간격 계산
    const latest = new Date(sortedHistory[0].exDividendDate);
    const previous = new Date(sortedHistory[1].exDividendDate);
    const intervalDays = (latest.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);

    // 다음 배당락일 예측
    const nextDate = new Date(latest);
    nextDate.setDate(nextDate.getDate() + intervalDays);

    // 미래 날짜인지 확인
    const today = new Date();
    if (nextDate <= today) {
      // 한 번 더 간격만큼 더함
      nextDate.setDate(nextDate.getDate() + intervalDays);
    }

    return nextDate.toISOString().split('T')[0];
  }

  /**
   * 다음 배당 지급일 예측
   */
  static predictNextPayDate(dividendInfo: DividendInfo): string | null {
    const nextExDate = this.predictNextExDividendDate(dividendInfo);
    if (!nextExDate) return null;

    // 일반적으로 배당락일 후 2-4주 후 지급
    // 이력 데이터가 있으면 평균 간격 계산
    if (dividendInfo.dividendHistory && dividendInfo.dividendHistory.length > 0) {
      const avgGap = this.calculateAverageExToPayGap(dividendInfo);
      const nextExDateObj = new Date(nextExDate);
      nextExDateObj.setDate(nextExDateObj.getDate() + avgGap);
      return nextExDateObj.toISOString().split('T')[0];
    }

    // 기본값: 배당락일 후 21일
    const nextPayDate = new Date(nextExDate);
    nextPayDate.setDate(nextPayDate.getDate() + 21);
    return nextPayDate.toISOString().split('T')[0];
  }

  /**
   * 배당락일과 지급일 간의 평균 간격 계산
   */
  private static calculateAverageExToPayGap(dividendInfo: DividendInfo): number {
    if (!dividendInfo.dividendHistory) return 21;

    const validGaps = dividendInfo.dividendHistory
      .filter(div => div.exDividendDate && div.payDate)
      .map(div => {
        const exDate = new Date(div.exDividendDate);
        const payDate = new Date(div.payDate!);
        return (payDate.getTime() - exDate.getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter(gap => gap > 0 && gap < 90); // 유효한 범위 내 간격만

    if (validGaps.length === 0) return 21;

    return Math.round(validGaps.reduce((sum, gap) => sum + gap, 0) / validGaps.length);
  }

  /**
   * 향상된 배당 정보 생성 (현재가 포함)
   */
  static enhanceDividendInfo(
    dividendInfo: DividendInfo,
    currentQuote?: StockQuote
  ): DividendInfo {
    const annualDividend = this.estimateAnnualDividend(dividendInfo);
    
    let dividendYield = 0;
    if (currentQuote && currentQuote.price > 0) {
      dividendYield = this.calculateDividendYield(annualDividend, currentQuote.price);
    }

    const nextExDate = this.predictNextExDividendDate(dividendInfo);
    const nextPayDate = this.predictNextPayDate(dividendInfo);
    const nextRecordDate = this.predictNextRecordDate(dividendInfo);

    return {
      ...dividendInfo,
      dividendYield,
      annualDividendAmount: annualDividend,
      nextPaymentDate: nextPayDate || dividendInfo.nextPaymentDate,
      nextRecordDate: nextRecordDate || dividendInfo.nextRecordDate,
    };
  }

  /**
   * 다음 기준일(Record Date) 예측
   */
  static predictNextRecordDate(dividendInfo: DividendInfo): string | null {
    if (!dividendInfo.dividendHistory || dividendInfo.dividendHistory.length < 2) {
      return null;
    }

    const sortedHistory = dividendInfo.dividendHistory
      .filter(div => div.dividendType === 'CD' && div.recordDate)
      .sort((a, b) => new Date(b.recordDate!).getTime() - new Date(a.recordDate!).getTime());

    if (sortedHistory.length < 2) return null;

    // 최근 두 기준일 간의 간격 계산
    const latest = new Date(sortedHistory[0].recordDate!);
    const previous = new Date(sortedHistory[1].recordDate!);
    const intervalDays = (latest.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);

    // 다음 기준일 예측
    const nextDate = new Date(latest);
    nextDate.setDate(nextDate.getDate() + intervalDays);

    // 미래 날짜인지 확인
    const today = new Date();
    if (nextDate <= today) {
      // 한 번 더 간격만큼 더함
      nextDate.setDate(nextDate.getDate() + intervalDays);
    }

    return nextDate.toISOString().split('T')[0];
  }

  /**
   * 배당 성장률 계산 (연도별)
   */
  static calculateDividendGrowthRate(dividendInfo: DividendInfo): number | null {
    if (!dividendInfo.dividendHistory || dividendInfo.dividendHistory.length < 8) {
      return null; // 최소 2년치 분기별 데이터 필요
    }

    // 연도별 배당금 집계
    const yearlyDividends: { [year: string]: number } = {};
    
    dividendInfo.dividendHistory
      .filter(div => div.dividendType === 'CD')
      .forEach(div => {
        const year = div.exDividendDate.split('-')[0];
        yearlyDividends[year] = (yearlyDividends[year] || 0) + div.cashAmount;
      });

    const years = Object.keys(yearlyDividends).sort();
    if (years.length < 2) return null;

    // 단순 연간 성장률 계산 (최근 vs 이전)
    const recentYear = years[years.length - 1];
    const previousYear = years[years.length - 2];
    
    const recentAmount = yearlyDividends[recentYear];
    const previousAmount = yearlyDividends[previousYear];

    if (previousAmount <= 0) return null;

    return ((recentAmount - previousAmount) / previousAmount) * 100;
  }
}