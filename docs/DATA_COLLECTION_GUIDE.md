# 📊 배당주 데이터 수집 가이드

## 1. 환경변수 설정

### `.env.local` 파일 생성:
```bash
# Supabase 설정 (https://supabase.com에서 프로젝트 생성 후)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Polygon.io API 키 (주식 데이터용)
POLYGON_API_KEY=your_polygon_api_key

# 관리자 키 (아무 랜덤 문자열)
ADMIN_API_KEY=my_secure_admin_key_2024
```

## 2. API 키 발급 방법

### 🔸 Polygon.io API 키:
1. https://polygon.io 방문
2. 회원가입 후 무료 플랜 선택
3. Dashboard > API Keys에서 키 복사

### 🔸 Supabase 프로젝트:
1. https://supabase.com 방문
2. 새 프로젝트 생성
3. Settings > API에서 URL과 키들 복사

## 3. 데이터 수집 실행

### 🚀 단계별 수집 과정:

1. **데이터베이스 테이블 생성** (이미 완료)
   - 마이그레이션이 자동으로 실행됨

2. **배당주 데이터 수집**:
```bash
curl -X POST http://localhost:3001/api/admin/collect-data \
  -H "Authorization: Bearer my_secure_admin_key_2024" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "MSFT", "GOOGL", "NVDY", "TSLY", "QQQY", "JEPI"],
    "exchange": "US"
  }'
```

3. **수집 상태 확인**:
```bash
curl http://localhost:3001/api/admin/collect-data
```

4. **수집된 데이터 조회**:
```bash
curl http://localhost:3001/api/stocks
```

## 4. 추천 배당주 목록

### 🎯 고배당 ETF (YieldMax 시리즈):
```json
{
  "tickers": [
    "NVDY", "TSLY", "GOOGY", "AMZY", "APLY", "MSTY",
    "QQQY", "NFLY", "OARK", "XOMO", "DIVO", "JEPI"
  ]
}
```

### 📈 전통적인 배당주:
```json
{
  "tickers": [
    "AAPL", "MSFT", "JNJ", "PG", "KO", "PEP", 
    "XOM", "CVX", "T", "VZ", "IBM", "INTC"
  ]
}
```

## 5. 자동화 설정

### 🔄 크론잡으로 정기 수집:
```bash
# 매일 오전 9시에 데이터 업데이트
0 9 * * * curl -X POST http://localhost:3001/api/admin/collect-data \
  -H "Authorization: Bearer my_secure_admin_key_2024" \
  -H "Content-Type: application/json" \
  -d '{"tickers": ["NVDY", "TSLY", "QQQY"], "exchange": "US"}'
```

## 6. 비용 최적화 팁

### 💰 API 호출 최소화:
- **무료 플랜**: 월 5회 제한 → 중요한 ETF만 선별 수집
- **배치 처리**: 한 번에 여러 종목 수집
- **캐싱**: Supabase에 저장 후 재사용
- **업데이트 주기**: 주 1-2회 정도로 제한

### 🎯 추천 수집 전략:
1. **1단계**: 주요 고배당 ETF 5-10종목만 수집
2. **2단계**: 데이터 확인 후 점진적 확장
3. **3단계**: 필요시 유료 플랜 고려

## 7. 문제 해결

### ❌ 일반적인 오류들:

1. **"Unauthorized" 오류**:
   - ADMIN_API_KEY 확인
   - Authorization 헤더 형식 확인

2. **"Stock data not found" 오류**:
   - 잘못된 티커 심볼
   - Polygon API 키 문제

3. **Supabase 연결 오류**:
   - URL과 키 확인
   - 네트워크 연결 상태 확인

### ✅ 디버깅 방법:
```bash
# 로그 확인
pnpm dev

# API 응답 확인
curl -v http://localhost:3001/api/stocks
```

## 8. 데이터 확인

수집된 데이터는 다음과 같이 확인할 수 있습니다:

- **웹 인터페이스**: http://localhost:3001
- **API**: http://localhost:3001/api/stocks
- **Supabase 대시보드**: 직접 데이터베이스 확인

---

💡 **시작 권장사항**: 먼저 5-10개의 주요 배당 ETF로 테스트 후 점진적으로 확장하세요!