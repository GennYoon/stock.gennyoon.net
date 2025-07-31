import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface StockData {
  ticker: string;
  name: string;
  exchange: 'US' | 'KR';
  sector?: string;
  currentPrice: number;
  dividendYield: number;
  annualDividend: number;
  dividendFrequency: 'monthly' | 'quarterly' | 'annually';
  exDividendDate?: string;
  paymentDate?: string;
  currency: string;
}

export interface DividendHistoryData {
  ticker: string;
  dividendAmount: number;
  exDividendDate: string;
  paymentDate?: string;
  recordDate?: string;
  dividendType: 'regular' | 'special' | 'stock';
}

export interface ExchangeRateData {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: string;
}

export class StockDataCollector {
  private polygonApiKey: string;
  private alphaVantageApiKey: string;
  private yieldMaxData: any[];

  constructor() {
    this.polygonApiKey = process.env.POLYGON_API_KEY || '';
    this.alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    
    // YieldMax ETF 데이터를 생성자에서는 빈 배열로 초기화
    this.yieldMaxData = [];
  }

  /**
   * 주식 기본 정보를 Supabase에 저장/업데이트
   */
  async upsertStockData(stockData: StockData): Promise<void> {
    try {
      console.log(`💾 ${stockData.ticker} 데이터 저장 시작:`, {
        ticker: stockData.ticker,
        price: stockData.currentPrice,
        dividendYield: stockData.dividendYield,
        annualDividend: stockData.annualDividend,
        frequency: stockData.dividendFrequency
      });

      // 1. 주식 기본 정보 저장/업데이트
      const { data: stockRecord, error: stockError } = await supabase
        .from('dividend_stocks')
        .upsert({
          ticker: stockData.ticker,
          name: stockData.name,
          exchange: stockData.exchange,
          sector: stockData.sector,
          currency: stockData.currency,
        }, {
          onConflict: 'ticker'
        })
        .select('id')
        .single();

      if (stockError) {
        console.error(`❌ ${stockData.ticker} 주식 정보 저장 실패:`, stockError);
        throw stockError;
      }

      console.log(`✅ ${stockData.ticker} 주식 정보 저장 완료, ID: ${stockRecord.id}`);

      // 2. 배당 정보 저장/업데이트
      console.log(`💰 ${stockData.ticker} 배당 정보 저장 중...`);
      const dividendPayload = {
        stock_id: stockRecord.id,
        dividend_yield: stockData.dividendYield,
        annual_dividend: stockData.annualDividend,
        quarterly_dividend: stockData.dividendFrequency === 'quarterly' ? stockData.annualDividend / 4 : null,
        monthly_dividend: stockData.dividendFrequency === 'monthly' ? stockData.annualDividend / 12 : null,
        dividend_frequency: stockData.dividendFrequency,
        ex_dividend_date: stockData.exDividendDate,
        payment_date: stockData.paymentDate,
      };
      
      console.log(`📊 배당 정보 페이로드:`, dividendPayload);
      
      const { error: dividendError } = await supabase
        .from('dividend_info')
        .upsert(dividendPayload, {
          onConflict: 'stock_id'
        });

      if (dividendError) {
        console.error(`❌ ${stockData.ticker} 배당 정보 저장 실패:`, dividendError);
        throw dividendError;
      }
      
      console.log(`✅ ${stockData.ticker} 배당 정보 저장 완료`);

      // 3. 현재 주가 정보 저장
      console.log(`💵 ${stockData.ticker} 주가 정보 저장 중...`);
      const pricePayload = {
        stock_id: stockRecord.id,
        current_price: stockData.currentPrice,
        price_date: new Date().toISOString().split('T')[0],
      };
      
      console.log(`📈 주가 정보 페이로드:`, pricePayload);
      
      const { error: priceError } = await supabase
        .from('stock_prices')
        .insert(pricePayload);

      if (priceError) {
        console.error(`❌ ${stockData.ticker} 주가 정보 저장 실패:`, priceError);
        throw priceError;
      }

      console.log(`✅ ${stockData.ticker} 데이터 저장 완료`);
    } catch (error) {
      console.error(`❌ ${stockData.ticker} 데이터 저장 실패:`, error);
      throw error;
    }
  }

  /**
   * 배당 히스토리 데이터 저장
   */
  async upsertDividendHistory(historyData: DividendHistoryData[]): Promise<void> {
    try {
      for (const data of historyData) {
        // 주식 ID 조회
        const { data: stock, error: stockError } = await supabase
          .from('dividend_stocks')
          .select('id')
          .eq('ticker', data.ticker)
          .single();

        if (stockError || !stock) {
          console.warn(`⚠️ ${data.ticker} 주식 정보를 찾을 수 없습니다.`);
          continue;
        }

        // 배당 히스토리 저장
        await supabase
          .from('dividend_history')
          .upsert({
            stock_id: stock.id,
            dividend_amount: data.dividendAmount,
            ex_dividend_date: data.exDividendDate,
            payment_date: data.paymentDate,
            record_date: data.recordDate,
            dividend_type: data.dividendType,
          }, {
            onConflict: 'stock_id,ex_dividend_date'
          });
      }

      console.log(`✅ ${historyData.length}개 배당 히스토리 저장 완료`);
    } catch (error) {
      console.error('❌ 배당 히스토리 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 환율 정보 저장/업데이트
   */
  async upsertExchangeRate(exchangeData: ExchangeRateData): Promise<void> {
    try {
      await supabase
        .from('exchange_rates')
        .upsert({
          from_currency: exchangeData.fromCurrency,
          to_currency: exchangeData.toCurrency,
          rate: exchangeData.rate,
          rate_date: exchangeData.rateDate,
        }, {
          onConflict: 'from_currency,to_currency,rate_date'
        });

      console.log(`✅ ${exchangeData.fromCurrency}/${exchangeData.toCurrency} 환율 저장 완료`);
    } catch (error) {
      console.error('❌ 환율 저장 실패:', error);
      throw error;
    }
  }

  /**
   * YieldMax ETF 데이터 수집 (list.json 활용)
   */
  async fetchYieldMaxETF(ticker: string): Promise<StockData | null> {
    try {
      console.log(`📊 YieldMax ETF ${ticker} 데이터 수집 시작...`);

      // 동적으로 list.json 데이터 로드
      if (this.yieldMaxData.length === 0) {
        try {
          const fs = require('fs');
          const path = require('path');
          const listPath = path.join(process.cwd(), 'src/assets/data/list.json');
          const listData = JSON.parse(fs.readFileSync(listPath, 'utf8'));
          this.yieldMaxData = listData;
          console.log(`✅ YieldMax 데이터 로드 완료: ${this.yieldMaxData.length}개`);
        } catch (error) {
          console.error('❌ YieldMax 데이터 로드 실패:', error);
          return null;
        }
      }

      // list.json에서 해당 티커 찾기
      const etfData = this.yieldMaxData.find(item => item.ticker === ticker);
      
      if (!etfData) {
        console.warn(`${ticker} YieldMax 데이터를 찾을 수 없습니다.`);
        console.log(`사용 가능한 티커들:`, this.yieldMaxData.slice(0, 5).map(item => item.ticker));
        return null;
      }

      // 기본 주가를 임시로 설정 (실제로는 100달러로 가정)
      const estimatedPrice = 20; // YieldMax ETF들은 보통 15-25달러 선
      
      // 배당률을 연간 배당금으로 변환
      const annualDividend = (estimatedPrice * etfData.distributionRate) / 100;

      const result: StockData = {
        ticker: ticker.toUpperCase(),
        name: etfData.name,
        exchange: 'US',
        sector: 'ETF - Option Income Strategy',
        currentPrice: estimatedPrice,
        dividendYield: etfData.distributionRate, // 분배율을 배당수익률로 사용
        annualDividend,
        dividendFrequency: 'monthly', // YieldMax는 월배당 ETF
        exDividendDate: undefined,
        paymentDate: etfData.nextPaymentDate,
        currency: 'USD',
      };

      console.log(`✅ YieldMax ${ticker} 데이터 수집 완료:`, {
        name: result.name,
        price: result.currentPrice,
        distributionRate: etfData.distributionRate + '%',
        annualDividend: result.annualDividend.toFixed(2)
      });

      return result;
    } catch (error) {
      console.error(`❌ YieldMax ETF 처리 오류 (${ticker}):`, error);
      return null;
    }
  }

  /**
   * Polygon.io에서 주식 데이터 수집 (무료 플랜 호환)
   */
  async fetchFromPolygon(ticker: string): Promise<StockData | null> {
    try {
      console.log(`📊 ${ticker} 데이터 수집 시작...`);

      // 기본 주식 정보
      const detailsResponse = await fetch(
        `https://api.polygon.io/v3/reference/tickers/${ticker}?apikey=${this.polygonApiKey}`
      );
      const detailsData = await detailsResponse.json();

      if (!detailsResponse.ok || detailsData.status !== 'OK') {
        console.error(`${ticker} 주식 정보 조회 실패:`, detailsData);
        return null;
      }

      // 배당 정보
      const dividendsResponse = await fetch(
        `https://api.polygon.io/v3/reference/dividends?ticker=${ticker}&limit=1&sort=ex_dividend_date&order=desc&apikey=${this.polygonApiKey}`
      );
      const dividendsData = await dividendsResponse.json();

      // 무료 플랜에서는 실시간 주가 대신 이전 거래일 종가를 사용
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      
      const priceResponse = await fetch(
        `https://api.polygon.io/v1/open-close/${ticker}/${dateStr}?adjusted=true&apikey=${this.polygonApiKey}`
      );
      const priceData = await priceResponse.json();

      if (!detailsData.results) {
        console.error(`${ticker} 주식 정보 없음:`, detailsData);
        return null;
      }

      const stockInfo = detailsData.results;
      const latestDividend = dividendsData.results?.[0];
      
      // 주가 정보 처리 (무료 플랜에서는 이전 거래일 종가 사용)
      let currentPrice = 0;
      if (priceData.status === 'OK' && priceData.close) {
        currentPrice = priceData.close;
      } else {
        // 주가 정보를 가져올 수 없는 경우 시가총액으로 추정
        if (stockInfo.market_cap && stockInfo.weighted_shares_outstanding) {
          currentPrice = stockInfo.market_cap / stockInfo.weighted_shares_outstanding;
        } else {
          // 기본값으로 100 설정 (데모용)
          currentPrice = 100;
          console.warn(`${ticker} 주가 정보 없음, 기본값 사용`);
        }
      }

      // 배당 수익률 계산
      const annualDividend = latestDividend?.cash_amount * (latestDividend?.frequency || 4) || 0;
      const dividendYield = currentPrice > 0 ? (annualDividend / currentPrice) * 100 : 0;

      const result = {
        ticker: ticker.toUpperCase(),
        name: stockInfo.name || ticker,
        exchange: 'US' as const,
        sector: stockInfo.sic_description,
        currentPrice,
        dividendYield,
        annualDividend,
        dividendFrequency: 'quarterly' as const,
        exDividendDate: latestDividend?.ex_dividend_date,
        paymentDate: latestDividend?.pay_date,
        currency: 'USD',
      };

      console.log(`✅ ${ticker} 데이터 수집 완료:`, {
        name: result.name,
        price: result.currentPrice,
        dividend: result.annualDividend,
        yield: result.dividendYield.toFixed(2) + '%'
      });

      return result;
    } catch (error) {
      console.error(`❌ Polygon API 오류 (${ticker}):`, error);
      return null;
    }
  }

  /**
   * 한국 주식 정보 수집 (예시 - 실제 API 연동 필요)
   */
  async fetchKoreanStock(ticker: string): Promise<StockData | null> {
    // TODO: 한국투자증권 API, 네이버 금융 크롤링 등으로 구현
    console.log(`한국 주식 ${ticker} 데이터 수집 준비 중...`);
    return null;
  }

  /**
   * 배치로 여러 주식 데이터 수집
   */
  async collectMultipleStocks(tickers: string[], exchange: 'US' | 'KR' = 'US'): Promise<void> {
    console.log(`📊 ${tickers.length}개 주식 데이터 수집 시작...`);
    
    for (const ticker of tickers) {
      try {
        let stockData: StockData | null = null;

        if (exchange === 'US') {
          // YieldMax ETF 티커 목록 (하드코딩)
          const yieldMaxTickers = ['TSLY', 'NVDY', 'MSTY', 'CONY', 'APLY', 'AMZY', 'GOOY', 'YMAX', 'YMAG', 'BIGY', 'CRSH', 'LFGY', 'GPTY', 'FBY', 'NFLY', 'DISO', 'FIVY', 'YBIT', 'SDTY', 'PYPY', 'GDXY', 'MSFO', 'XOMO', 'JPMO', 'AMDY', 'OARK', 'SQY', 'MRNY', 'AIYY', 'TSMY', 'SMCY', 'PLTY', 'MARO', 'CVNY', 'BABO', 'FEAT', 'FIAT', 'DIPS', 'YQQQ', 'QDTY', 'RDTY'];
          
          const isYieldMax = yieldMaxTickers.includes(ticker);
          
          if (isYieldMax) {
            console.log(`🎯 ${ticker}는 YieldMax ETF입니다. 특화 데이터 수집 시작...`);
            stockData = await this.fetchYieldMaxETF(ticker);
          } else {
            console.log(`📈 ${ticker}는 일반 주식입니다. Polygon API 사용...`);
            stockData = await this.fetchFromPolygon(ticker);
          }
        } else {
          stockData = await this.fetchKoreanStock(ticker);
        }

        if (stockData) {
          await this.upsertStockData(stockData);
          // API 호출 제한을 위한 딜레이
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          console.warn(`⚠️ ${ticker} 데이터 수집 실패`);
        }
      } catch (error) {
        console.error(`${ticker} 처리 중 오류:`, error);
      }
    }

    console.log('🎉 주식 데이터 수집 완료!');
  }

  /**
   * 환율 정보 수집 (예: USD/KRW)
   */
  async collectExchangeRates(): Promise<void> {
    try {
      // 무료 환율 API 사용 예시
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();

      if (data.rates?.KRW) {
        await this.upsertExchangeRate({
          fromCurrency: 'USD',
          toCurrency: 'KRW',
          rate: data.rates.KRW,
          rateDate: new Date().toISOString().split('T')[0],
        });
      }
    } catch (error) {
      console.error('환율 수집 실패:', error);
    }
  }
}