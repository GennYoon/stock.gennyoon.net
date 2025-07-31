import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { issuer, group_name } = await request.json();

    if (!issuer || !group_name) {
      return NextResponse.json(
        { error: 'Missing required parameters: issuer, group_name' },
        { status: 400 }
      );
    }

    // 해당 그룹의 모든 주식 조회 (A, B, C, D조인 경우 Weekly도 포함)
    let query = supabase
      .from('dividend_stocks')
      .select('ticker, name')
      .eq('issuer', issuer)
      .eq('is_active', true);

    // A, B, C, D조인 경우 해당 그룹과 Weekly 그룹 모두 포함
    if (['A', 'B', 'C', 'D'].includes(group_name)) {
      query = query.in('group_name', [group_name, 'Weekly']);
    } else {
      query = query.eq('group_name', group_name);
    }

    const { data: stocks, error } = await query.order('ticker');

    if (error) {
      throw error;
    }

    // 각 주식의 현재가와 배당 정보 조회
    const stocksWithData = await Promise.all(
      (stocks || []).map(async (stock) => {
        let current_price;
        let dividend_yield;

        try {
          const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

          // 현재가 조회
          const priceResponse = await fetch(
            `https://api.polygon.io/v2/aggs/ticker/${stock.ticker}/prev?adjusted=true&apikey=${POLYGON_API_KEY}`,
            { next: { revalidate: 300 } }
          );

          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            if (priceData.results && priceData.results.length > 0) {
              current_price = priceData.results[0].c;
            }
          }

          // 배당 정보 조회 (최근 12개월)
          const dividendResponse = await fetch(
            `https://api.polygon.io/v3/reference/dividends?ticker=${stock.ticker}&limit=12&sort=ex_dividend_date&order=desc&apikey=${POLYGON_API_KEY}`,
            { next: { revalidate: 3600 } }
          );

          if (dividendResponse.ok) {
            const dividendData = await dividendResponse.json();
            if (dividendData.results && dividendData.results.length > 0) {
              const annualDividend = dividendData.results
                .slice(0, 12)
                .reduce((sum: number, div: any) => sum + (div.cash_amount || 0), 0);
              
              if (current_price && annualDividend > 0) {
                dividend_yield = ((annualDividend / current_price) * 100);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${stock.ticker}:`, error);
        }

        return {
          ticker: stock.ticker,
          name: stock.name,
          current_price: current_price ? parseFloat(current_price.toFixed(2)) : undefined,
          dividend_yield: dividend_yield ? parseFloat(dividend_yield.toFixed(2)) : undefined
        };
      })
    );

    return NextResponse.json({
      success: true,
      issuer,
      group_name,
      stocks: stocksWithData,
      count: stocksWithData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dividend stocks API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dividend stocks',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET 요청으로 전체 그룹 목록 조회
export async function GET() {
  try {
    const { data: groups, error } = await supabase
      .from('dividend_stocks')
      .select('issuer, group_name')
      .eq('is_active', true)
      .order('issuer')
      .order('group_name');

    if (error) {
      throw error;
    }

    // 중복 제거
    const uniqueGroups = Array.from(
      new Set(groups?.map(g => `${g.issuer}-${g.group_name}`))
    ).map(key => {
      const [issuer, group_name] = key.split('-');
      return { issuer, group_name };
    });

    return NextResponse.json({
      success: true,
      groups: uniqueGroups,
      count: uniqueGroups.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dividend groups list API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dividend groups',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}