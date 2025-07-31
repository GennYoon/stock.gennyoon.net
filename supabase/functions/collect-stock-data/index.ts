import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// 환경변수에서 필수값들을 가져오기 (fallback 제거)
const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 필수 환경변수 검증
if (!POLYGON_API_KEY) {
  throw new Error('POLYGON_API_KEY environment variable is required');
}
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// WebSocket 연결 관리 (글로벌 변수로 연결 상태 유지)
let wsConnection: WebSocket | null = null;
let isConnecting = false;

// Polygon WebSocket 연결
async function connectToPolygonWebSocket(tickers: string[]): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (isConnecting) {
      reject(new Error('WebSocket connection already in progress'));
      return;
    }
    
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      resolve(wsConnection);
      return;
    }
    
    isConnecting = true;
    const ws = new WebSocket('wss://socket.polygon.io/stocks');
    
    ws.onopen = () => {
      console.log('WebSocket connected to Polygon');
      
      // 인증
      ws.send(JSON.stringify({
        action: 'auth',
        params: POLYGON_API_KEY
      }));
      
      // 구독할 채널들
      const subscriptions = [];
      tickers.forEach(ticker => {
        subscriptions.push(`A.${ticker}`); // 집계 데이터
        subscriptions.push(`AM.${ticker}`); // 분단위 집계
      });
      
      ws.send(JSON.stringify({
        action: 'subscribe',
        params: subscriptions.join(',')
      }));
      
      wsConnection = ws;
      isConnecting = false;
      resolve(ws);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnecting = false;
      reject(error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      wsConnection = null;
      isConnecting = false;
    };
    
    ws.onmessage = async (event) => {
      try {
        const messages = JSON.parse(event.data);
        if (Array.isArray(messages)) {
          for (const message of messages) {
            await handleWebSocketMessage(message);
          }
        } else {
          await handleWebSocketMessage(messages);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
  });
}

// WebSocket 메시지 처리
async function handleWebSocketMessage(message: any) {
  console.log('Received message:', message);
  
  if (message.ev === 'status') {
    console.log('WebSocket status:', message.message);
    return;
  }
  
  // 실시간 집계 데이터 (A) 처리
  if (message.ev === 'A') {
    await saveAggregateData(message);
  }
  
  // 분단위 집계 데이터 (AM) 처리
  if (message.ev === 'AM') {
    await saveMinuteAggregateData(message);
  }
}

// 실시간 집계 데이터 저장
async function saveAggregateData(data: any) {
  try {
    const { data: stock } = await supabase
      .from('dividend_stocks')
      .select('id')
      .eq('ticker', data.sym)
      .single();
    
    if (stock) {
      await supabase
        .from('stock_prices')
        .insert({
          stock_id: stock.id,
          current_price: data.c, // 종가
          open_price: data.o,    // 시가
          high_price: data.h,    // 고가
          low_price: data.l,     // 저가
          volume: data.v,        // 거래량
          price_date: new Date().toISOString().split('T')[0],
          created_at: new Date(data.t || Date.now()), // 타임스탬프
        });
      
      console.log(`Saved aggregate data for ${data.sym}: $${data.c}`);
    }
  } catch (error) {
    console.error(`Error saving aggregate data for ${data.sym}:`, error);
  }
}

// 분단위 집계 데이터 저장
async function saveMinuteAggregateData(data: any) {
  try {
    const { data: stock } = await supabase
      .from('dividend_stocks')
      .select('id')
      .eq('ticker', data.sym)
      .single();
    
    if (stock) {
      // 분단위 데이터는 별도 테이블에 저장 (필요시 생성)
      await supabase
        .from('stock_minute_data')
        .insert({
          stock_id: stock.id,
          timestamp: new Date(data.t),
          open_price: data.o,
          high_price: data.h,
          low_price: data.l,
          close_price: data.c,
          volume: data.v,
          vwap: data.vw, // 거래량 가중 평균 가격
        });
      
      console.log(`Saved minute data for ${data.sym}: $${data.c}`);
    }
  } catch (error) {
    console.error(`Error saving minute data for ${data.sym}:`, error);
  }
}

// 다음 수집 대상 선택
async function getNextCollectionTarget() {
  const { data, error } = await supabase
    .from('data_collection_targets')
    .select('*')
    .eq('is_active', true)
    .or('next_collection_at.is.null,next_collection_at.lte.now()')
    .order('priority', { ascending: true })
    .order('last_collected_at', { ascending: true, nullsFirst: true })
    .limit(1)
    .single();
  
  return error ? null : data;
}

// Polygon API 호출
async function fetchFromPolygon(endpoint: string) {
  const response = await fetch(`https://api.polygon.io${endpoint}&apikey=${POLYGON_API_KEY}`);
  if (!response.ok) {
    throw new Error(`Polygon API error: ${response.status}`);
  }
  return response.json();
}

// 주가 데이터 수집
async function collectPriceData(ticker: string) {
  try {
    // 어제 날짜 계산 (주말 고려)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);
    if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = yesterday.toISOString().split('T')[0];
    
    // 주가 데이터 가져오기
    const priceData = await fetchFromPolygon(`/v1/open-close/${ticker}/${dateStr}?adjusted=true`);
    
    // 주식 ID 조회
    const { data: stock } = await supabase
      .from('dividend_stocks')
      .select('id')
      .eq('ticker', ticker)
      .single();
    
    if (stock) {
      // 주가 정보 저장
      await supabase
        .from('stock_prices')
        .insert({
          stock_id: stock.id,
          current_price: priceData.close,
          open_price: priceData.open,
          high_price: priceData.high,
          low_price: priceData.low,
          volume: priceData.volume,
          price_date: dateStr,
        });
    }
    
    return { success: true, data: priceData };
  } catch (error) {
    console.error(`Price collection error for ${ticker}:`, error);
    return { success: false, error: error.message };
  }
}

// 배당 데이터 수집
async function collectDividendData(ticker: string) {
  try {
    // 최근 12개월 배당 정보
    const dividendData = await fetchFromPolygon(
      `/v3/reference/dividends?ticker=${ticker}&limit=12&sort=ex_dividend_date&order=desc`
    );
    
    if (!dividendData.results || dividendData.results.length === 0) {
      return { success: false, error: 'No dividend data' };
    }
    
    // 주식 ID 조회
    const { data: stock } = await supabase
      .from('dividend_stocks')
      .select('id')
      .eq('ticker', ticker)
      .single();
    
    if (stock) {
      // 배당 히스토리 저장
      const historyData = dividendData.results.map((div: any) => ({
        stock_id: stock.id,
        dividend_amount: div.cash_amount,
        ex_dividend_date: div.ex_dividend_date,
        payment_date: div.pay_date,
        record_date: div.record_date,
        dividend_type: div.dividend_type || 'regular',
      }));
      
      // Upsert로 중복 방지
      for (const history of historyData) {
        await supabase
          .from('dividend_history')
          .upsert(history, {
            onConflict: 'stock_id,ex_dividend_date'
          });
      }
      
      // 배당 정보 업데이트
      const latestDiv = dividendData.results[0];
      const annualDividend = dividendData.results
        .slice(0, 12)
        .reduce((sum: number, div: any) => sum + div.cash_amount, 0);
      
      await supabase
        .from('dividend_info')
        .upsert({
          stock_id: stock.id,
          annual_dividend: annualDividend,
          monthly_dividend: annualDividend / 12,
          dividend_frequency: 'monthly',
          ex_dividend_date: latestDiv.ex_dividend_date,
          payment_date: latestDiv.pay_date,
          record_date: latestDiv.record_date,
        }, {
          onConflict: 'stock_id'
        });
    }
    
    return { success: true, data: dividendData };
  } catch (error) {
    console.error(`Dividend collection error for ${ticker}:`, error);
    return { success: false, error: error.message };
  }
}

// 주식 상세 정보 수집
async function collectStockDetails(ticker: string) {
  try {
    const detailsData = await fetchFromPolygon(`/v3/reference/tickers/${ticker}?`);
    
    if (!detailsData.results) {
      return { success: false, error: 'No stock details' };
    }
    
    // 주식 정보 업데이트
    await supabase
      .from('dividend_stocks')
      .upsert({
        ticker: ticker,
        name: detailsData.results.name,
        exchange: 'US',
        sector: detailsData.results.sic_description || 'ETF - Option Income Strategy',
        currency: 'USD',
      }, {
        onConflict: 'ticker'
      });
    
    return { success: true, data: detailsData };
  } catch (error) {
    console.error(`Details collection error for ${ticker}:`, error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'collect';
    
    // 환경변수 디버깅
    console.log('Environment check:', {
      hasPolygonKey: !!POLYGON_API_KEY,
      polygonKeyLength: POLYGON_API_KEY?.length,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      action
    });
    
    // WebSocket 실시간 연결 시작
    if (action === 'start-realtime') {
      try {
        // 활성화된 수집 대상들 가져오기
        const { data: targets } = await supabase
          .from('data_collection_targets')
          .select('ticker')
          .eq('is_active', true);
        
        if (!targets || targets.length === 0) {
          return new Response(
            JSON.stringify({ 
              error: 'No active collection targets found' 
            }),
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
        
        const tickers = targets.map(t => t.ticker);
        console.log('Starting WebSocket connection for tickers:', tickers);
        
        // WebSocket 연결 시작
        const ws = await connectToPolygonWebSocket(tickers);
        
        // 수집 로그 저장
        await supabase
          .from('data_collection_logs')
          .insert({
            ticker: tickers.join(','),
            collection_type: 'websocket-start',
            status: 'success',
            api_calls_used: 0,
            collected_data: { tickers, websocket_status: 'connected' },
            started_at: new Date(),
            completed_at: new Date()
          });
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'WebSocket connection started',
            tickers,
            websocket_status: ws.readyState === WebSocket.OPEN ? 'connected' : 'connecting',
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
      } catch (error) {
        console.error('Error starting WebSocket:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to start WebSocket connection',
            message: error.message 
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // WebSocket 상태 확인
    if (action === 'status') {
      return new Response(
        JSON.stringify({
          websocket_connected: wsConnection?.readyState === WebSocket.OPEN,
          websocket_state: wsConnection?.readyState,
          is_connecting: isConnecting,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 기존 REST API 방식 백업 수집 (무제한 API이므로 제한 없음)
    if (action === 'collect') {
      // 다음 수집 대상 가져오기
      const target = await getNextCollectionTarget();
      if (!target) {
        return new Response(
          JSON.stringify({ 
            message: 'No targets to collect',
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log(`Collecting data for ${target.ticker}...`);
      
      const startTime = new Date();
      const results = {
        ticker: target.ticker,
        details: null,
        price: null,
        dividend: null,
        apiCallsUsed: 0
      };
      
      // 무제한 API이므로 동시에 모든 데이터 수집
      const [detailsResult, priceResult, dividendResult] = await Promise.all([
        collectStockDetails(target.ticker),
        collectPriceData(target.ticker),
        collectDividendData(target.ticker)
      ]);
      
      results.details = detailsResult;
      results.price = priceResult;
      results.dividend = dividendResult;
      results.apiCallsUsed = 3; // 무제한이지만 로깅용
      
      const endTime = new Date();
      
      // 수집 로그 저장
      await supabase
        .from('data_collection_logs')
        .insert({
          ticker: target.ticker,
          collection_type: 'rest-api',
          status: results.details?.success && results.price?.success && results.dividend?.success 
            ? 'success' 
            : 'partial',
          api_calls_used: results.apiCallsUsed,
          collected_data: results,
          started_at: startTime,
          completed_at: endTime
        });
      
      // 다음 수집 시간 업데이트 (1분 후 - 무제한이므로 더 자주)
      const nextCollectionTime = new Date();
      nextCollectionTime.setMinutes(nextCollectionTime.getMinutes() + 1);
      
      await supabase
        .from('data_collection_targets')
        .update({
          last_collected_at: new Date(),
          next_collection_at: nextCollectionTime
        })
        .eq('ticker', target.ticker);
      
      return new Response(
        JSON.stringify({
          success: true,
          ticker: target.ticker,
          results,
          duration: endTime.getTime() - startTime.getTime(),
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Invalid action',
        available_actions: ['start-realtime', 'status', 'collect']
      }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});