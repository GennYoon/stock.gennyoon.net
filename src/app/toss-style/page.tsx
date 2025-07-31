'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus,
  BarChart3,
  Heart,
  Share,
  DollarSign,
  RefreshCw
} from 'lucide-react';

export default function TossStylePage() {
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('12,335');

  const stockData = {
    name: '그레일세이브스 일드부스트 테슬라 ETF',
    ticker: 'TSYY',
    price: 12335,
    change: -152,
    changePercent: -1.22,
    volume: '1.1M',
    marketCap: '24,000',
  };

  const orderbook = [
    { price: 12335, quantity: 300, type: 'sell' },
    { price: 12335, quantity: 100, type: 'sell' },
    { price: 12321, quantity: 2372, type: 'sell' },
    { price: 12321, quantity: 100, type: 'buy' },
    { price: 12321, quantity: 3, type: 'buy' },
    { price: 12321, quantity: 51, type: 'buy' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                  <span className="text-white dark:text-black font-bold text-sm">토</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">토스증권</span>
              </div>
              
              <nav className="hidden md:flex items-center gap-6">
                <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white font-medium">홈</a>
                <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white font-medium">뉴스</a>
                <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white font-medium">주식 골라보기</a>
                <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white font-medium">내 계좌</a>
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">
                검색
              </Button>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                로그인
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stock Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">T</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{stockData.name}</h1>
                <p className="text-gray-500 dark:text-gray-400">{stockData.ticker}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">
                <Share className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">
                <DollarSign className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-4 flex items-baseline gap-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{stockData.price.toLocaleString()}원</span>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                {stockData.change.toLocaleString()}원
              </Badge>
              <Badge variant="destructive">
                {stockData.changePercent}%
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 dark:text-white">차트</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">1분</Button>
                    <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">일</Button>
                    <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">주</Button>
                    <Button variant="ghost" size="sm" className="bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">월</Button>
                    <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">년</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>차트 영역</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orderbook */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 dark:text-white">호가</CardTitle>
                  <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-600">
                    <span>체결가</span>
                    <span>체결량 (주)</span>
                    <span>등락률</span>
                    <span>거래량</span>
                  </div>
                  
                  {orderbook.map((order, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 text-sm py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <span className="font-medium text-gray-900 dark:text-white">{order.price.toLocaleString()}원</span>
                      <span className={order.type === 'sell' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                        {order.quantity.toLocaleString()}
                      </span>
                      <span className="text-red-600 dark:text-red-400">-1.2%</span>
                      <span className="text-gray-700 dark:text-gray-300">1.1</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Panel */}
          <div className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 dark:text-white">주문 유형</CardTitle>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <Button
                      variant={orderType === 'buy' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setOrderType('buy')}
                      className={orderType === 'buy' ? 'bg-red-500 hover:bg-red-600 text-white' : 'text-gray-700 dark:text-gray-300'}
                    >
                      매수
                    </Button>
                    <Button
                      variant={orderType === 'sell' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setOrderType('sell')}
                      className={orderType === 'sell' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'}
                    >
                      매도
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    주문방법
                  </label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">지정가</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-gray-700 dark:text-gray-300">시장가</Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    구매가격
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="text-right font-mono bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">원</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    수량
                  </label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="text"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="수량 입력"
                      className="text-center font-mono bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs text-gray-700 dark:text-gray-300">10%</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs text-gray-700 dark:text-gray-300">25%</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs text-gray-700 dark:text-gray-300">50%</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs text-gray-700 dark:text-gray-300">최대</Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">구매가능 금액</span>
                    <span className="font-medium text-gray-900 dark:text-white">0원</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">총 주문 금액</span>
                    <span className="font-medium text-gray-900 dark:text-white">0원</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3"
                  size="lg"
                >
                  로그인하고 구매하기
                </Button>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">호가를 보려면</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  로그인이 필요해요
                </p>
                <Button variant="outline" className="w-full border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                  로그인하기
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">투자 유의사항</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">99.96 <span className="text-red-500 dark:text-red-400 text-sm">+0.15(0.1%)</span></p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">달러 환율</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">1,397.95 <span className="text-red-500 dark:text-red-400 text-sm">+15.05(1.0%)</span></p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">나스닥</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">21,325.87 <span className="text-red-500 dark:text-red-400 text-sm">+196.2(0.9%)</span></p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">S&P 500</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">6,398.66 <span className="text-red-500 dark:text-red-400 text-sm">+35.76(0.5%)</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}