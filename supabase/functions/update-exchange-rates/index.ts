import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// 환경변수에서 필수값들을 가져오기 (fallback 제거)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 필수 환경변수 검증
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ExchangeRateApi {
  name: string;
  fetchRate: () => Promise<number>;
}

// 여러 환율 API 소스
const exchangeRateApis: ExchangeRateApi[] = [
  {
    name: 'exchangerate-api.com',
    fetchRate: async () => {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      return data.rates.KRW;
    }
  },
  {
    name: 'dunamu.com',
    fetchRate: async () => {
      const response = await fetch('https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data received');
      }
      // KRW/USD를 USD/KRW로 변환
      return 1 / data[0].basePrice;
    }
  },
  {
    name: 'fixer.io',
    fetchRate: async () => {
      const apiKey = Deno.env.get('FIXER_API_KEY');
      if (!apiKey) throw new Error('Fixer API key not found');
      
      const response = await fetch(`https://api.fixer.io/v1/latest?access_key=${apiKey}&base=USD&symbols=KRW`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (!data.success || !data.rates?.KRW) throw new Error('Invalid response');
      return data.rates.KRW;
    }
  },
  {
    name: 'currencyapi.com',
    fetchRate: async () => {
      const apiKey = Deno.env.get('CURRENCY_API_KEY');
      if (!apiKey) throw new Error('Currency API key not found');
      
      const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${apiKey}&currencies=KRW&base_currency=USD`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (!data.data?.KRW?.value) throw new Error('Invalid response');
      return data.data.KRW.value;
    }
  }
];

// 환율 데이터 가져오기
async function fetchExchangeRate(): Promise<{ rate: number; source: string }> {
  for (const api of exchangeRateApis) {
    try {
      console.log(`Trying ${api.name}...`);
      const rate = await api.fetchRate();
      
      if (rate && rate > 0 && rate < 2000) { // 합리적인 환율 범위 검증
        console.log(`Success with ${api.name}: ${rate}`);
        return { rate, source: api.name };
      }
    } catch (error) {
      console.warn(`Failed with ${api.name}:`, error.message);
    }
  }
  
  throw new Error('All exchange rate APIs failed');
}

// 환율 데이터 저장
async function saveExchangeRate(rate: number, source: string) {
  const { error } = await supabase
    .from('exchange_rates')
    .insert({
      from_currency: 'USD',
      to_currency: 'KRW',
      rate: rate,
      source: source,
      timestamp: new Date().toISOString(),
    });
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

// 최근 환율과 비교하여 변화율 계산
async function getExchangeRateChange(currentRate: number): Promise<{ changePercent: number; trend: 'up' | 'down' | 'stable' }> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'KRW')
    .order('timestamp', { ascending: false })
    .limit(2);
  
  if (!data || data.length < 2) {
    return { changePercent: 0, trend: 'stable' };
  }
  
  const previousRate = data[1].rate;
  const changePercent = ((currentRate - previousRate) / previousRate) * 100;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) > 0.1) {
    trend = changePercent > 0 ? 'up' : 'down';
  }
  
  return { changePercent, trend };
}

Deno.serve(async (req) => {
  try {
    console.log('Starting exchange rate update...');
    
    // 환율 데이터 가져오기
    const { rate, source } = await fetchExchangeRate();
    
    // 변화율 계산
    const { changePercent, trend } = await getExchangeRateChange(rate);
    
    // 데이터베이스에 저장
    await saveExchangeRate(rate, source);
    
    const result = {
      success: true,
      data: {
        rate,
        source,
        changePercent,
        trend,
        fromCurrency: 'USD',
        toCurrency: 'KRW',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Exchange rate updated successfully:', result.data);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Exchange rate update failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update exchange rate',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});