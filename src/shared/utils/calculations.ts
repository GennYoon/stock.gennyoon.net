import type {
  Stock,
  Holding,
  DividendRecord,
  ExchangeRate,
  PortfolioSummary,
  HoldingSummary,
  DividendCalendar,
  DividendCalendarEntry,
  DashboardMetrics,
} from "@/shared/types";

// 환율 계산
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate?: ExchangeRate,
): number {
  if (fromCurrency === toCurrency) return amount;
  if (!exchangeRate) return amount;

  if (
    exchangeRate.fromCurrency === fromCurrency &&
    exchangeRate.toCurrency === toCurrency
  ) {
    return amount * exchangeRate.rate;
  }

  if (
    exchangeRate.fromCurrency === toCurrency &&
    exchangeRate.toCurrency === fromCurrency
  ) {
    return amount / exchangeRate.rate;
  }

  return amount;
}

// 보유종목 요약 계산
export function calculateHoldingSummary(
  holding: Holding,
  stock: Stock,
  dividendRecords: DividendRecord[],
  currentExchangeRate?: ExchangeRate,
): HoldingSummary {
  // 현재 가치 계산
  const currentValue = holding.shares * stock.currentPrice;
  const currentValueKRW =
    stock.currency === "USD" && currentExchangeRate
      ? convertCurrency(currentValue, "USD", "KRW", currentExchangeRate)
      : currentValue;

  // 총 비용 계산
  const totalCost = holding.shares * holding.averageCost;
  const totalCostKRW =
    stock.currency === "USD" && holding.exchangeRateAtPurchase
      ? totalCost * holding.exchangeRateAtPurchase
      : totalCost;

  // 손익 계산
  const gainLoss = currentValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  // 연간 배당 예상액 계산
  const annualDividendProjection = calculateAnnualDividendProjection(
    holding,
    stock,
  );
  const annualDividendProjectionKRW =
    stock.currency === "USD" && currentExchangeRate
      ? convertCurrency(
          annualDividendProjection,
          "USD",
          "KRW",
          currentExchangeRate,
        )
      : annualDividendProjection;

  // 받은 배당금 총액 계산
  const totalDividendsReceived = dividendRecords
    .filter((record) => record.status === "received")
    .reduce((sum, record) => sum + record.amount, 0);

  const totalDividendsReceivedKRW = dividendRecords
    .filter((record) => record.status === "received")
    .reduce((sum, record) => {
      if (record.amountInKRW) return sum + record.amountInKRW;
      return (
        sum +
        (record.currency === "USD" && record.exchangeRate
          ? record.amount * record.exchangeRate
          : record.amount)
      );
    }, 0);

  return {
    holding,
    stock,
    currentValue,
    currentValueKRW,
    totalCost,
    totalCostKRW,
    gainLoss,
    gainLossPercent,
    annualDividendProjection,
    annualDividendProjectionKRW,
    dividendRecords,
    totalDividendsReceived,
    totalDividendsReceivedKRW,
  };
}

// 연간 배당 예상액 계산
export function calculateAnnualDividendProjection(
  holding: Holding,
  stock: Stock,
): number {
  const quarterlyDividend =
    (stock.currentPrice * stock.dividendYield) / 100 / 4;

  let multiplier = 4; // 기본값: 분기별
  switch (stock.dividendFrequency) {
    case "monthly":
      multiplier = 12;
      break;
    case "quarterly":
      multiplier = 4;
      break;
    case "semi-annually":
      multiplier = 2;
      break;
    case "annually":
      multiplier = 1;
      break;
  }

  return holding.shares * quarterlyDividend * multiplier;
}

// 포트폴리오 요약 계산
export function calculatePortfolioSummary(
  portfolioId: string,
  holdingSummaries: HoldingSummary[],
): PortfolioSummary {
  const totalValue = holdingSummaries.reduce(
    (sum, hs) => sum + hs.currentValue,
    0,
  );
  const totalValueKRW = holdingSummaries.reduce(
    (sum, hs) => sum + hs.currentValueKRW,
    0,
  );
  const totalCost = holdingSummaries.reduce((sum, hs) => sum + hs.totalCost, 0);
  const totalCostKRW = holdingSummaries.reduce(
    (sum, hs) => sum + hs.totalCostKRW,
    0,
  );
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent =
    totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const annualDividendProjection = holdingSummaries.reduce(
    (sum, hs) => sum + hs.annualDividendProjection,
    0,
  );
  const annualDividendProjectionKRW = holdingSummaries.reduce(
    (sum, hs) => sum + hs.annualDividendProjectionKRW,
    0,
  );
  const monthlyDividendProjection = annualDividendProjection / 12;
  const dividendYield =
    totalValue > 0 ? (annualDividendProjection / totalValue) * 100 : 0;

  // 원금 회수율 계산
  const totalDividendsReceived = holdingSummaries.reduce(
    (sum, hs) => sum + hs.totalDividendsReceived,
    0,
  );
  const principalRecoveryRate =
    totalCost > 0 ? (totalDividendsReceived / totalCost) * 100 : 0;

  return {
    portfolioId,
    totalValue,
    totalValueKRW,
    totalCost,
    totalCostKRW,
    totalGainLoss,
    totalGainLossPercent,
    annualDividendProjection,
    annualDividendProjectionKRW,
    monthlyDividendProjection,
    dividendYield,
    principalRecoveryRate,
    holdings: holdingSummaries,
  };
}

// 대시보드 메트릭 계산
export function calculateDashboardMetrics(
  portfolioSummaries: PortfolioSummary[],
): DashboardMetrics {
  const totalPortfolioValue = portfolioSummaries.reduce(
    (sum, ps) => sum + ps.totalValue,
    0,
  );
  const totalPortfolioValueKRW = portfolioSummaries.reduce(
    (sum, ps) => sum + ps.totalValueKRW,
    0,
  );
  const totalCost = portfolioSummaries.reduce(
    (sum, ps) => sum + ps.totalCost,
    0,
  );
  const totalGainLoss = totalPortfolioValue - totalCost;
  const totalGainLossPercent =
    totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const annualDividendProjection = portfolioSummaries.reduce(
    (sum, ps) => sum + ps.annualDividendProjection,
    0,
  );
  const monthlyDividendProjection = annualDividendProjection / 12;

  // 전체 원금 회수율 계산
  const totalDividendsReceived = portfolioSummaries.reduce(
    (sum, ps) =>
      sum +
      ps.holdings.reduce(
        (holdingSum, hs) => holdingSum + hs.totalDividendsReceived,
        0,
      ),
    0,
  );
  const principalRecoveryRate =
    totalCost > 0 ? (totalDividendsReceived / totalCost) * 100 : 0;

  // 평균 배당 수익률
  const averageDividendYield =
    portfolioSummaries.length > 0
      ? portfolioSummaries.reduce((sum, ps) => sum + ps.dividendYield, 0) /
        portfolioSummaries.length
      : 0;

  return {
    totalPortfolioValue,
    totalPortfolioValueKRW,
    totalGainLoss,
    totalGainLossPercent,
    annualDividendProjection,
    monthlyDividendProjection,
    principalRecoveryRate,
    averageDividendYield,
  };
}

// 배당 캘린더 생성
export function generateDividendCalendar(
  holdingSummaries: HoldingSummary[],
  months: number = 12,
  currentExchangeRate?: ExchangeRate,
): DividendCalendar[] {
  const calendar: DividendCalendar[] = [];
  const today = new Date();

  for (let i = 0; i < months; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const month = targetDate.toLocaleString("ko-KR", { month: "long" });
    const year = targetDate.getFullYear();

    const expectedDividends: DividendCalendarEntry[] = [];
    let totalAmount = 0;
    let totalAmountKRW = 0;

    holdingSummaries.forEach((hs) => {
      // 배당 지급일 추정 (간단한 로직)
      const projectedAmount = hs.annualDividendProjection / 12; // 월 단위로 분할
      const projectedAmountKRW =
        hs.stock.currency === "USD" && currentExchangeRate
          ? convertCurrency(projectedAmount, "USD", "KRW", currentExchangeRate)
          : projectedAmount;

      if (projectedAmount > 0) {
        const entry: DividendCalendarEntry = {
          stock: hs.stock,
          holding: hs.holding,
          projectedAmount,
          projectedAmountKRW,
          exDividendDate:
            hs.stock.exDividendDate ||
            `${year}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-15`,
          paymentDate:
            hs.stock.paymentDate ||
            `${year}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-28`,
          status: "projected",
        };

        expectedDividends.push(entry);
        totalAmount += projectedAmount;
        totalAmountKRW += projectedAmountKRW;
      }
    });

    calendar.push({
      month,
      year,
      expectedDividends,
      totalAmount,
      totalAmountKRW,
    });
  }

  return calendar;
}

// 목표 달성 계산
export function calculateGoalProgress(
  targetMonthlyAmount: number,
  currentMonthlyDividend: number,
  targetCurrency: "USD" | "KRW" = "KRW",
): {
  progressPercent: number;
  remainingAmount: number;
  requiredInvestment: number;
} {
  const progressPercent =
    targetMonthlyAmount > 0
      ? Math.min((currentMonthlyDividend / targetMonthlyAmount) * 100, 100)
      : 0;

  const remainingAmount = Math.max(
    targetMonthlyAmount - currentMonthlyDividend,
    0,
  );

  // 4% 배당수익률 가정하여 필요 투자액 계산
  const assumedYield = 0.04;
  const requiredInvestment =
    remainingAmount > 0 ? (remainingAmount * 12) / assumedYield : 0;

  return {
    progressPercent,
    remainingAmount,
    requiredInvestment,
  };
}

// 원금 회수 예상 기간 계산
export function calculatePrincipalRecoveryTimeframe(
  totalCost: number,
  totalDividendsReceived: number,
  annualDividendProjection: number,
): {
  recoveryPercent: number;
  remainingAmount: number;
  estimatedYearsToRecovery: number;
  estimatedPaymentsToRecovery: number;
} {
  const recoveryPercent =
    totalCost > 0 ? (totalDividendsReceived / totalCost) * 100 : 0;
  const remainingAmount = Math.max(totalCost - totalDividendsReceived, 0);

  const estimatedYearsToRecovery =
    annualDividendProjection > 0
      ? remainingAmount / annualDividendProjection
      : Infinity;

  // 분기별 배당 가정 (연 4회)
  const estimatedPaymentsToRecovery = estimatedYearsToRecovery * 4;

  return {
    recoveryPercent,
    remainingAmount,
    estimatedYearsToRecovery,
    estimatedPaymentsToRecovery: Math.ceil(estimatedPaymentsToRecovery),
  };
}

