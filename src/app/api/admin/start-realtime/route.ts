import { NextRequest, NextResponse } from 'next/server';

const EDGE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/collect-stock-data';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  try {
    // API 키 검증
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // WebSocket 실시간 데이터 수집 시작
    const response = await fetch(`${EDGE_FUNCTION_URL}?action=start-realtime`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Edge function error',
          details: result 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Real-time WebSocket data collection started',
      details: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Start realtime error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // API 키 검증
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // WebSocket 상태 확인
    const response = await fetch(`${EDGE_FUNCTION_URL}?action=status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      websocket_status: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('WebSocket status check error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}