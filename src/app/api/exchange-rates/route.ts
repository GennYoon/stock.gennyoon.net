import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get('from') || 'USD';
    const toCurrency = searchParams.get('to') || 'KRW';
    const days = parseInt(searchParams.get('days') || '30');

    // 지정된 기간의 환율 데이터 조회
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .gte('rate_date', startDate.toISOString().split('T')[0])
      .order('rate_date', { ascending: false });

    if (error) throw error;

    // 최신 환율
    const latestRate = data?.[0];

    // 통계 계산
    const rates = data?.map(item => item.rate) || [];
    const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    const minRate = rates.length > 0 ? Math.min(...rates) : 0;
    const maxRate = rates.length > 0 ? Math.max(...rates) : 0;

    // 변화율 계산 (전날 대비)
    const changeRate = data && data.length > 1 
      ? ((data[0].rate - data[1].rate) / data[1].rate) * 100 
      : 0;

    return NextResponse.json({
      pair: `${fromCurrency}/${toCurrency}`,
      current: {
        rate: latestRate?.rate || 0,
        date: latestRate?.rate_date,
        change: changeRate,
      },
      statistics: {
        average: avgRate,
        minimum: minRate,
        maximum: maxRate,
        period: `${days}일`,
      },
      history: data?.map(item => ({
        rate: item.rate,
        date: item.rate_date,
      })) || [],
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('환율 조회 오류:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      }, 
      { status: 500 }
    );
  }
}