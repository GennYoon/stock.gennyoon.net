const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 배당 주기 매핑 함수
function mapDividendFrequency(category, name) {
  // High Income ETF들은 월배당이 많음
  if (category === 'High Income') return '1M';
  
  // Dividend Growers는 분기배당이 일반적
  if (category === 'Dividend Growers') return '3M';
  
  // 이름에서 배당 주기 추측
  if (name.toLowerCase().includes('weekly')) return '1W';
  if (name.toLowerCase().includes('monthly')) return '1M';
  if (name.toLowerCase().includes('quarterly')) return '3M';
  if (name.toLowerCase().includes('annual')) return '1Y';
  
  // 기본값은 분기배당
  return '3M';
}

// 그룹명 매핑 함수
function mapGroupName(category, name) {
  if (category === 'Dividend Growers') {
    if (name.includes('S&P 500')) return 'S&P500';
    if (name.includes('Russell 2000')) return 'Russell2000';
    if (name.includes('MidCap')) return 'MidCap';
    if (name.includes('Technology')) return 'Tech';
    if (name.includes('MSCI')) return 'International';
    return 'DivGrowth';
  }
  
  if (category === 'High Income') {
    if (name.includes('S&P 500')) return 'S&P500';
    if (name.includes('Nasdaq')) return 'Nasdaq';
    if (name.includes('Russell')) return 'Russell';
    return 'HighIncome';
  }
  
  if (category === 'Crypto-Linked') {
    if (name.includes('Bitcoin')) return 'Bitcoin';
    if (name.includes('Ether')) return 'Ethereum';
    return 'Crypto';
  }
  
  if (category === 'Thematic') {
    if (name.includes('Infrastructure')) return 'Infrastructure';
    if (name.includes('Online') || name.includes('Retail')) return 'ECommerce';
    if (name.includes('Pet')) return 'PetCare';
    if (name.includes('Data')) return 'BigData';
    if (name.includes('Meta')) return 'Metaverse';
    if (name.includes('Tech')) return 'Technology';
    return 'Thematic';
  }
  
  if (category === 'Volatility') return 'Volatility';
  if (category === 'Alternative') return 'Alternative';
  if (category === 'Ex-Sector') return 'ExSector';
  if (category === 'Factor') return 'Factor';
  if (category === 'Rising Rates') return 'RisingRates';
  if (category === 'Dynamic Buffer') return 'Buffer';
  
  return 'General';
}

async function scrapeProSharesETFs() {
  console.log('ProShares ETF 데이터 스크래핑 시작...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('https://www.proshares.com/our-etfs/find-strategic-etfs', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 테이블 데이터 추출
    const etfData = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const etfs = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
          const ticker = cells[0].textContent.trim();
          const name = cells[1].textContent.trim();
          const category = cells[2].textContent.trim();
          const assetClass = cells[3].textContent.trim();
          const netAssets = cells[4].textContent.trim();
          const inceptionDate = cells[5].textContent.trim();
          
          if (ticker && name && category) {
            etfs.push({
              ticker,
              name,
              category,
              assetClass,
              netAssets,
              inceptionDate
            });
          }
        }
      });
      
      return etfs;
    });
    
    console.log(`${etfData.length}개의 ProShares ETF 데이터를 수집했습니다.`);
    
    // 데이터베이스에 삽입할 데이터 준비
    const stocksToInsert = etfData.map(etf => ({
      ticker: etf.ticker,
      name: etf.name,
      issuer: 'ProShares',
      group_name: mapGroupName(etf.category, etf.name),
      dividend_frequency: mapDividendFrequency(etf.category, etf.name),
      is_active: true
    }));
    
    // 기존 ProShares ETF 데이터 확인
    const { data: existingETFs } = await supabase
      .from('dividend_stocks')
      .select('ticker')
      .eq('issuer', 'ProShares');
    
    const existingTickers = new Set(existingETFs?.map(etf => etf.ticker) || []);
    
    // 새로운 ETF만 필터링
    const newETFs = stocksToInsert.filter(etf => !existingTickers.has(etf.ticker));
    
    if (newETFs.length > 0) {
      console.log(`${newETFs.length}개의 새로운 ProShares ETF를 데이터베이스에 추가합니다...`);
      
      const { data, error } = await supabase
        .from('dividend_stocks')
        .insert(newETFs)
        .select();
      
      if (error) {
        throw error;
      }
      
      console.log('성공적으로 추가된 ETF들:');
      newETFs.forEach(etf => {
        console.log(`- ${etf.ticker}: ${etf.name} (${etf.group_name}, ${etf.dividend_frequency})`);
      });
    } else {
      console.log('새로 추가할 ProShares ETF가 없습니다.');
    }
    
    // 기존 ETF 업데이트 (이름이나 정보가 변경된 경우)
    const etfsToUpdate = stocksToInsert.filter(etf => existingTickers.has(etf.ticker));
    
    if (etfsToUpdate.length > 0) {
      console.log(`${etfsToUpdate.length}개의 기존 ProShares ETF 정보를 업데이트합니다...`);
      
      for (const etf of etfsToUpdate) {
        const { error } = await supabase
          .from('dividend_stocks')
          .update({
            name: etf.name,
            group_name: etf.group_name,
            dividend_frequency: etf.dividend_frequency,
            updated_at: new Date().toISOString()
          })
          .eq('ticker', etf.ticker)
          .eq('issuer', 'ProShares');
        
        if (error) {
          console.error(`${etf.ticker} 업데이트 실패:`, error);
        }
      }
    }
    
    console.log('ProShares ETF 데이터 수집 완료!');
    
    // 카테고리별 통계 출력
    const categoryStats = {};
    etfData.forEach(etf => {
      categoryStats[etf.category] = (categoryStats[etf.category] || 0) + 1;
    });
    
    console.log('\n카테고리별 ETF 개수:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`- ${category}: ${count}개`);
    });
    
    return {
      total: etfData.length,
      new: newETFs.length,
      updated: etfsToUpdate.length,
      categories: categoryStats
    };
    
  } catch (error) {
    console.error('스크래핑 중 오류 발생:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// 스크립트 실행
if (require.main === module) {
  scrapeProSharesETFs()
    .then(result => {
      console.log('\n=== 최종 결과 ===');
      console.log(`총 ETF 개수: ${result.total}`);
      console.log(`새로 추가: ${result.new}개`);
      console.log(`업데이트: ${result.updated}개`);
      process.exit(0);
    })
    .catch(error => {
      console.error('스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { scrapeProSharesETFs };