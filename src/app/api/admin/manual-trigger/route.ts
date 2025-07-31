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

    // Supabase에서 수동 트리거 함수 호출
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .rpc('trigger_data_collection_manual');

    if (error) {
      return NextResponse.json(
        { error: 'Database function error', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data collection triggered via database function',
      data,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Manual trigger error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}