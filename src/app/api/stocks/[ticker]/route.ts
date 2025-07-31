import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  let ticker = '';
  try {
    const { ticker: tickerParam } = await params;
    ticker = tickerParam.toUpperCase();

    // 주식 기본 정보 + 배당 정보 + 최신 주가 조회
    const { data: stockData, error: stockError } = await supabase
      .from('dividend_stocks')
      .select(`
        id,
        ticker,
        name,
        exchange,
        sector,
        currency,
        created_at,
        updated_at,
        dividend_info:dividend_info(
          dividend_yield,
          annual_dividend,
          quarterly_dividend,
          monthly_dividend,
          dividend_frequency,
          ex_dividend_date,
          payment_date,
          record_date,
          payout_ratio,
          dividend_growth_rate,
          updated_at
        ),
        stock_prices:stock_prices(
          current_price,
          open_price,
          high_price,
          low_price,
          volume,
          market_cap,
          pe_ratio,
          price_date,
          created_at
        )
      `)
      .eq('ticker', ticker)
      .single();

    if (stockError || !stockData) {
      return NextResponse.json(
        { error: 'Stock not found', ticker },
        { status: 404 }
      );
    }

    // 배당 히스토리 조회 (최근 2년)
    const { data: dividendHistory, error: historyError } = await supabase
      .from('dividend_history')
      .select(`
        dividend_amount,
        ex_dividend_date,
        payment_date,
        record_date,
        dividend_type,
        created_at
      `)
      .eq('stock_id', stockData.id)
      .gte('ex_dividend_date', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('ex_dividend_date', { ascending: false })
      .limit(20);

    if (historyError) {
      console.warn('배당 히스토리 조회 오류:', historyError);
    }

    // 환율 정보 조회 (USD 주식인 경우)
    let exchangeRate = null;
    if (stockData.currency === 'USD') {
      const { data: rateData } = await supabase
        .from('exchange_rates')
        .select('rate, rate_date')
        .eq('from_currency', 'USD')
        .eq('to_currency', 'KRW')
        .order('rate_date', { ascending: false })
        .limit(1)
        .single();
      
      exchangeRate = rateData;
    }

    // 데이터 가공
    const latestPrice = stockData.stock_prices?.[0];
    const dividendInfo = stockData.dividend_info?.[0];

    // 배당 수익률 계산 (원화 기준)
    const currentPriceKRW = stockData.currency === 'USD' && exchangeRate
      ? latestPrice?.current_price * exchangeRate.rate
      : latestPrice?.current_price;

    const annualDividendKRW = stockData.currency === 'USD' && exchangeRate
      ? (dividendInfo?.annual_dividend || 0) * exchangeRate.rate
      : dividendInfo?.annual_dividend || 0;

    const result = {
      // 기본 정보
      id: stockData.id,
      ticker: stockData.ticker,
      name: stockData.name,
      exchange: stockData.exchange,
      sector: stockData.sector,
      currency: stockData.currency,
      
      // 주가 정보
      price: {
        current: latestPrice?.current_price || 0,
        currentKRW: currentPriceKRW || 0,
        open: latestPrice?.open_price,
        high: latestPrice?.high_price,
        low: latestPrice?.low_price,
        volume: latestPrice?.volume,
        marketCap: latestPrice?.market_cap,
        peRatio: latestPrice?.pe_ratio,
        priceDate: latestPrice?.price_date,
      },

      // 배당 정보
      dividend: {
        yield: dividendInfo?.dividend_yield || 0,
        annual: dividendInfo?.annual_dividend || 0,
        annualKRW: annualDividendKRW,
        quarterly: dividendInfo?.quarterly_dividend || 0,
        monthly: dividendInfo?.monthly_dividend || 0,
        frequency: dividendInfo?.dividend_frequency || 'quarterly',
        exDividendDate: dividendInfo?.ex_dividend_date,
        paymentDate: dividendInfo?.payment_date,
        recordDate: dividendInfo?.record_date,
        payoutRatio: dividendInfo?.payout_ratio,
        growthRate: dividendInfo?.dividend_growth_rate,
        lastUpdated: dividendInfo?.updated_at,
      },

      // 배당 히스토리
      dividendHistory: dividendHistory?.map(history => ({
        amount: history.dividend_amount,
        amountKRW: stockData.currency === 'USD' && exchangeRate
          ? history.dividend_amount * exchangeRate.rate
          : history.dividend_amount,
        exDividendDate: history.ex_dividend_date,
        paymentDate: history.payment_date,
        recordDate: history.record_date,
        type: history.dividend_type,
      })) || [],

      // 환율 정보
      exchangeRate: exchangeRate ? {
        rate: exchangeRate.rate,
        date: exchangeRate.rate_date,
      } : null,

      // 메타 정보
      lastUpdated: stockData.updated_at,
      dataCreated: stockData.created_at,
    };

    return NextResponse.json({
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`주식 상세 정보 조회 오류 (${ticker}):`, error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      }, 
      { status: 500 }
    );
  }
}