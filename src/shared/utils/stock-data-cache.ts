import type { CacheMetadata } from "@/shared/types/stock-data";

/**
 * 메모리 기반 캐시 매니저
 */
export class MemoryCache {
  private cache = new Map<string, CacheMetadata>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5분

  /**
   * 캐시에 데이터 저장
   */
  set(key: string, data: any, ttl?: number, source?: string): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.defaultTTL));

    const metadata: CacheMetadata = {
      key,
      data,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source: source || "unknown",
      hitCount: 0,
    };

    this.cache.set(key, metadata);
  }

  /**
   * 캐시에서 데이터 조회
   */
  get<T>(key: string): T | null {
    const metadata = this.cache.get(key);

    if (!metadata) {
      return null;
    }

    // 만료 체크
    if (new Date() > new Date(metadata.expiresAt)) {
      this.cache.delete(key);
      return null;
    }

    // 히트 카운트 증가
    metadata.hitCount++;

    return metadata.data as T;
  }

  /**
   * 캐시에서 데이터 삭제
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 특정 패턴으로 캐시 삭제
   */
  deletePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = new Date();

    for (const [key, metadata] of this.cache.entries()) {
      if (now > new Date(metadata.expiresAt)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 캐시 통계
   */
  getStats() {
    const totalEntries = this.cache.size;
    let totalHits = 0;
    let expiredEntries = 0;
    const now = new Date();

    for (const metadata of this.cache.values()) {
      totalHits += metadata.hitCount;
      if (now > new Date(metadata.expiresAt)) {
        expiredEntries++;
      }
    }

    return {
      totalEntries,
      totalHits,
      expiredEntries,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
    };
  }

  /**
   * 캐시 클리어
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 캐시 크기
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 캐시 키 목록
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// 글로벌 캐시 인스턴스
export const stockDataCache = new MemoryCache();

/**
 * 캐시 키 생성 헬퍼
 */
export class CacheKeyBuilder {
  static quote(symbol: string): string {
    return `quote:${symbol.toUpperCase()}`;
  }

  static historical(symbol: string, period: string = "compact"): string {
    return `historical:${symbol.toUpperCase()}:${period}`;
  }

  static dividend(symbol: string): string {
    return `dividend:${symbol.toUpperCase()}`;
  }

  static company(symbol: string): string {
    return `company:${symbol.toUpperCase()}`;
  }

  static search(query: string): string {
    return `search:${query.toLowerCase().replace(/\s+/g, "_")}`;
  }

  static rateLimit(provider: string): string {
    return `rateLimit:${provider}`;
  }
}

/**
 * 시장 시간 기반 TTL 계산
 */
export class SmartTTL {
  /**
   * 현재 시간이 시장 시간인지 확인 (미국 시장 기준)
   */
  static isMarketHours(): boolean {
    const now = new Date();
    const nyTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" }),
    );
    const hour = nyTime.getHours();
    const day = nyTime.getDay();

    // 주말 제외
    if (day === 0 || day === 6) {
      return false;
    }

    // 미국 시장 시간 (9:30 AM - 4:00 PM EST)
    return hour >= 9 && hour < 16;
  }

  /**
   * 데이터 타입에 따른 적절한 TTL 반환
   */
  static getTTL(
    dataType: "quote" | "historical" | "company" | "dividend" | "search",
  ): number {
    const isMarketOpen = this.isMarketHours();

    switch (dataType) {
      case "quote":
        return isMarketOpen ? 1 * 60 * 1000 : 15 * 60 * 1000; // 1분 vs 15분
      case "historical":
        return 60 * 60 * 1000; // 1시간
      case "company":
        return 24 * 60 * 60 * 1000; // 24시간
      case "dividend":
        return 6 * 60 * 60 * 1000; // 6시간
      case "search":
        return 30 * 60 * 1000; // 30분
      default:
        return 5 * 60 * 1000; // 기본 5분
    }
  }
}

/**
 * 캐시 데코레이터 함수
 */
export function withCache<T extends any[], R>(
  keyBuilder: (...args: T) => string,
  dataType: "quote" | "historical" | "company" | "dividend" | "search",
  source: string = "unknown",
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const cacheKey = keyBuilder(...args);

      // 캐시에서 조회 시도
      const cached = stockDataCache.get<R>(cacheKey);
      if (cached) {
        return cached;
      }

      // 캐시 미스시 원본 메서드 호출
      const result = await originalMethod.apply(this, args);

      // 결과 캐싱
      const ttl = SmartTTL.getTTL(dataType);
      stockDataCache.set(cacheKey, result, ttl, source);

      return result;
    };

    return descriptor;
  };
}

/**
 * 자동 캐시 정리 스케줄러
 */
export class CacheCleanupScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMs = 10 * 60 * 1000; // 10분마다

  start(): void {
    if (this.intervalId) {
      return; // 이미 실행 중
    }

    this.intervalId = setInterval(() => {
      const cleaned = stockDataCache.cleanup();
      if (cleaned > 0) {
        console.log(`Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, this.intervalMs);

    console.log("Cache cleanup scheduler started");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Cache cleanup scheduler stopped");
    }
  }
}

// 글로벌 스케줄러 인스턴스
export const cacheCleanupScheduler = new CacheCleanupScheduler();

