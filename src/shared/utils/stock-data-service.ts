import type {
  IStockDataService,
  StockQuote,
  StockHistoricalData,
  DividendInfo,
  CompanyInfo,
  StockSearchResult,
  StockDataResponse,
  StockDataError,
} from "@/shared/types/stock-data";

import { PolygonProvider, FallbackDataProvider } from "./polygon-provider";
import {
  stockDataCache,
  CacheKeyBuilder,
  SmartTTL,
  cacheCleanupScheduler,
} from "./stock-data-cache";
import { DividendCalculator } from "./dividend-calculator";

/**
 * 통합 주식 데이터 서비스
 * 여러 데이터 제공자를 관리하고 폴백 메커니즘을 제공
 */
export class StockDataService {
  private providers: IStockDataService[] = [];
  private fallbackProvider: IStockDataService;
  private currentProviderIndex = 0;

  constructor() {
    // 데이터 제공자 초기화 (Polygon.io 단일 제공자)
    this.providers = [new PolygonProvider()];

    this.fallbackProvider = new FallbackDataProvider();

    // 캐시 정리 스케줄러 시작
    cacheCleanupScheduler.start();
  }

  /**
   * 사용 가능한 제공자 찾기
   */
  private async getAvailableProvider(): Promise<IStockDataService> {
    // 현재 제공자부터 순서대로 시도
    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex =
        (this.currentProviderIndex + i) % this.providers.length;
      const provider = this.providers[providerIndex];

      try {
        const isHealthy = await provider.isHealthy();
        if (isHealthy) {
          this.currentProviderIndex = providerIndex;
          return provider;
        }
      } catch (error) {
        console.warn(`Provider ${providerIndex} health check failed:`, error);
      }
    }

    // 모든 제공자가 실패하면 폴백 사용
    console.warn("All providers failed, using fallback");
    return this.fallbackProvider;
  }

  /**
   * 캐시와 함께 데이터 조회
   */
  private async fetchWithCache<T>(
    cacheKey: string,
    dataType: "quote" | "historical" | "company" | "dividend" | "search",
    fetchFunction: () => Promise<T>,
  ): Promise<StockDataResponse<T>> {
    try {
      // 캐시에서 먼저 조회
      const cached = stockDataCache.get<T>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          source: "cache",
          timestamp: new Date().toISOString(),
        };
      }

      // 캐시 미스시 API 호출
      const data = await fetchFunction();

      // 캐시에 저장
      const ttl = SmartTTL.getTTL(dataType);
      stockDataCache.set(cacheKey, data, ttl, "api");

      return {
        success: true,
        data,
        source: "api",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        error: errorMessage,
        source: "error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 주식 현재가 조회
   */
  async getQuote(symbol: string): Promise<StockDataResponse<StockQuote>> {
    const cacheKey = CacheKeyBuilder.quote(symbol);

    return this.fetchWithCache(cacheKey, "quote", async () => {
      const provider = await this.getAvailableProvider();
      return provider.getQuote(symbol);
    });
  }

  /**
   * 주식 과거 데이터 조회
   */
  async getHistoricalData(
    symbol: string,
    period: string = "compact",
  ): Promise<StockDataResponse<StockHistoricalData[]>> {
    const cacheKey = CacheKeyBuilder.historical(symbol, period);

    return this.fetchWithCache(cacheKey, "historical", async () => {
      const provider = await this.getAvailableProvider();
      return provider.getHistoricalData(symbol, period);
    });
  }

  /**
   * 배당 정보 조회 (멀티 프로바이더 시도)
   */
  async getDividendInfo(
    symbol: string,
  ): Promise<StockDataResponse<DividendInfo>> {
    const cacheKey = CacheKeyBuilder.dividend(symbol);

    return this.fetchWithCache(cacheKey, "dividend", async () => {
      // 배당 정보는 Polygon.io를 시도
      for (const provider of this.providers) {
        try {
          const dividendInfo = await provider.getDividendInfo(symbol);
          
          // 현재가 정보도 함께 조회하여 정확한 배당 수익률 계산
          let enhancedDividendInfo = dividendInfo;
          try {
            const quoteResponse = await this.getQuote(symbol);
            if (quoteResponse.success && quoteResponse.data) {
              enhancedDividendInfo = DividendCalculator.enhanceDividendInfo(
                dividendInfo,
                quoteResponse.data
              );
            }
          } catch (error) {
            console.warn(`Failed to get quote for dividend yield calculation:`, error);
          }
          
          // 유효한 배당 데이터가 있으면 반환
          if (enhancedDividendInfo.dividendPerShare > 0 || 
              (enhancedDividendInfo.dividendHistory && enhancedDividendInfo.dividendHistory.length > 0)) {
            return enhancedDividendInfo;
          }
        } catch (error) {
          console.warn(
            `Provider ${provider.constructor.name} failed for dividend data:`,
            error,
          );
        }
      }

      // 모든 프로바이더가 실패한 경우 폴백 사용
      return this.fallbackProvider.getDividendInfo(symbol);
    });
  }

  /**
   * 회사 정보 조회
   */
  async getCompanyInfo(
    symbol: string,
  ): Promise<StockDataResponse<CompanyInfo>> {
    const cacheKey = CacheKeyBuilder.company(symbol);

    return this.fetchWithCache(cacheKey, "company", async () => {
      const provider = await this.getAvailableProvider();
      return provider.getCompanyInfo(symbol);
    });
  }

  /**
   * 심볼 검색
   */
  async searchSymbols(
    query: string,
  ): Promise<StockDataResponse<StockSearchResult[]>> {
    const cacheKey = CacheKeyBuilder.search(query);

    return this.fetchWithCache(cacheKey, "search", async () => {
      const provider = await this.getAvailableProvider();
      return provider.searchSymbols(query);
    });
  }

  /**
   * 여러 주식의 현재가를 일괄 조회
   */
  async getMultipleQuotes(
    symbols: string[],
  ): Promise<StockDataResponse<StockQuote[]>> {
    try {
      const promises = symbols.map((symbol) => this.getQuote(symbol));
      const results = await Promise.allSettled(promises);

      const quotes: StockQuote[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (
          result.status === "fulfilled" &&
          result.value.success &&
          result.value.data
        ) {
          quotes.push(result.value.data);
        } else {
          errors.push(
            `${symbols[index]}: ${result.status === "rejected" ? result.reason : "Unknown error"}`,
          );
        }
      });

      return {
        success: quotes.length > 0,
        data: quotes,
        error: errors.length > 0 ? errors.join(", ") : undefined,
        source: "batch",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Batch quote request failed",
        source: "error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 캐시 관리
   */
  async clearCache(pattern?: string): Promise<number> {
    if (pattern) {
      return stockDataCache.deletePattern(pattern);
    } else {
      const size = stockDataCache.size();
      stockDataCache.clear();
      return size;
    }
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats() {
    return stockDataCache.getStats();
  }

  /**
   * 서비스 상태 확인
   */
  async getServiceHealth() {
    const providerHealth = await Promise.allSettled(
      this.providers.map(async (provider, index) => ({
        index,
        healthy: await provider.isHealthy(),
        provider: provider.constructor.name,
      })),
    );

    const cacheStats = this.getCacheStats();

    return {
      providers: providerHealth.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : { healthy: false, error: result.reason },
      ),
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 스마트 주식 추천 (배당 중심)
   */
  async getDividendStockRecommendations(
    limit: number = 10,
  ): Promise<StockDataResponse<StockQuote[]>> {
    // 고배당 ETF 심볼들
    const dividendETFs = [
      "VYM",
      "SCHD",
      "DVY",
      "HDV",
      "NOBL",
      "VIG",
      "DGRO",
      "SPHD",
      "SPYD",
      "VNQ",
    ];

    const result = await this.getMultipleQuotes(dividendETFs.slice(0, limit));

    if (result.success && result.data) {
      // 변동률 기준으로 정렬 (안정성 고려)
      result.data.sort(
        (a, b) => Math.abs(a.changePercent) - Math.abs(b.changePercent),
      );
    }

    return result;
  }

  /**
   * 시장 요약 정보
   */
  async getMarketSummary() {
    const majorIndices = ["SPY", "QQQ", "IWM", "VYM"];
    const result = await this.getMultipleQuotes(majorIndices);

    return {
      ...result,
      data: result.data
        ? {
            indices: result.data,
            marketStatus: SmartTTL.isMarketHours() ? "open" : "closed",
            lastUpdated: new Date().toISOString(),
          }
        : undefined,
    };
  }
}

// 글로벌 서비스 인스턴스
export const stockDataService = new StockDataService();
