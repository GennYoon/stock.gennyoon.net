import { NextRequest, NextResponse } from 'next/server';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '09bdf6e7ae5f3de21c1290137d8be6f5';

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Edge Function 호출
    const edgeFunctionUrl = 'https://uqggenvqkcflewbjwcqc.supabase.co/functions/v1/collect-stock-data';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        trigger: 'manual',
        timestamp: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Edge function error', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data collection triggered',
      data,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Trigger collection error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 수집 상태 확인
export async function GET(request: NextRequest) {
  try {
    // API 키 확인
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Supabase에서 최근 수집 로그 조회
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 최근 로그 조회
    const { data: logs, error: logsError } = await supabase
      .from('data_collection_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) {
      throw logsError;
    }

    // API 사용량 조회
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    const { data: apiUsage, error: usageError } = await supabase
      .from('api_usage_tracker')
      .select('*')
      .eq('api_provider', 'polygon')
      .eq('date', today)
      .eq('hour', currentHour)
      .single();

    // 다음 수집 대상 조회
    const { data: nextTargets, error: targetsError } = await supabase
      .from('data_collection_targets')
      .select('*')
      .eq('is_active', true)
      .order('priority')
      .order('last_collected_at', { ascending: true, nullsFirst: true });

    // Cron job 상태 조회
    const { data: cronStatus, error: cronError } = await supabase
      .rpc('get_cron_job_status');

    return NextResponse.json({
      success: true,
      data: {
        recentLogs: logs || [],
        apiUsage: apiUsage || { calls_made: 0, rate_limit: 5 },
        nextTargets: nextTargets || [],
        cronJobs: cronStatus || null,
        currentTime: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Get collection status error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}