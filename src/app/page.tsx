"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, TrendingUpIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import Link from "next/link";

interface DividendGroup {
  issuer: string;
  group_name: string;
  etf_count: number;
  sample_ticker: string;
  next_ex_date?: string;
  next_pay_date?: string;
  time_until_ex_date?: number;
}

interface GroupETFs {
  [key: string]: {
    ticker: string;
    name: string;
    group_name: string;
    dividend_frequency?: string;
    current_price?: number;
    dividend_yield?: number;
  }[];
}

export default function DashboardPage() {
  const [groups, setGroups] = useState<DividendGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupETFs, setGroupETFs] = useState<GroupETFs>({});
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});
  const [loadingETFs, setLoadingETFs] = useState<{ [key: string]: boolean }>({});
  const [errorETFs, setErrorETFs] = useState<{ [key: string]: string }>({});

  // 배당 그룹 데이터 로드
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch("/api/dividend-groups");
        const data = await response.json();

        if (data.success) {
          setGroups(data.groups);
        }
      } catch (error) {
        console.error("Failed to fetch dividend groups:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // 실시간 카운트다운 업데이트
  useEffect(() => {
    const updateCountdowns = () => {
      // 현재 시간을 한국 시간대로 가져오기
      const now = new Date();
      const nowKST = toZonedTime(now, 'Asia/Seoul');
      const newCountdowns: { [key: string]: string } = {};

      groups.forEach((group) => {
        if (group.next_ex_date) {
          // 배당락일을 파싱하고 KST 시간대로 처리
          const exDateStr = group.next_ex_date + 'T00:00:00';
          const exDate = toZonedTime(new Date(exDateStr), 'Asia/Seoul');
          
          // 썸머타임 여부 확인 (미국 동부 시간 기준)
          const isDST = (date: Date) => {
            const year = date.getFullYear();
            const march = new Date(year, 2, 1);
            const secondSunday = new Date(
              year,
              2,
              8 + ((7 - march.getDay()) % 7),
            );
            const november = new Date(year, 10, 1);
            const firstSunday = new Date(
              year,
              10,
              1 + ((7 - november.getDay()) % 7),
            );
            return date >= secondSunday && date < firstSunday;
          };

          // 미국 동부시간 기준으로 DST 확인
          const usEasternDate = toZonedTime(exDate, 'America/New_York');
          const isTargetDST = isDST(usEasternDate);
          
          // EDT: 한국시간 오전 5시, EST: 한국시간 오전 6시
          const kstHour = isTargetDST ? 5 : 6;
          const targetDate = new Date(exDate);
          targetDate.setHours(kstHour, 0, 0, 0);

          const timeLeft = targetDate.getTime() - nowKST.getTime();

          if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
              (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
            );
            const minutes = Math.floor(
              (timeLeft % (1000 * 60 * 60)) / (1000 * 60),
            );
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            if (days === 0) {
              // 당일이면 시간:분:초만 표시
              newCountdowns[`${group.issuer}-${group.group_name}`] =
                `${hours}시간 ${minutes}분 ${seconds}초`;
            } else {
              newCountdowns[`${group.issuer}-${group.group_name}`] =
                `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
            }
          } else {
            newCountdowns[`${group.issuer}-${group.group_name}`] = "🚫 매수 마감";
          }
        }
      });

      setCountdowns(newCountdowns);
    };

    if (groups.length > 0) {
      updateCountdowns();
      const interval = setInterval(updateCountdowns, 1000);
      return () => clearInterval(interval);
    }
  }, [groups]);

  // 그룹 ETF 목록 로드
  const loadGroupETFs = async (issuer: string, groupName: string) => {
    const key = `${issuer}-${groupName}`;

    if (groupETFs[key]) return; // 이미 로드됨

    // 로딩 상태 시작
    setLoadingETFs(prev => ({ ...prev, [key]: true }));
    setErrorETFs(prev => ({ ...prev, [key]: '' }));

    try {
      console.log(`Loading ETFs for ${issuer} - ${groupName}`);
      const response = await fetch("/api/dividend-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuer, group_name: groupName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`API Response for ${key}:`, data);

      if (data.success && data.stocks) {
        setGroupETFs((prev) => ({
          ...prev,
          [key]: data.stocks,
        }));
        console.log(`Successfully loaded ${data.stocks.length} ETFs for ${key}`);
      } else {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
    } catch (error) {
      console.error(`Failed to load group ETFs for ${key}:`, error);
      setErrorETFs(prev => ({ 
        ...prev, 
        [key]: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    } finally {
      setLoadingETFs(prev => ({ ...prev, [key]: false }));
    }
  };

  // 그룹 토글
  const toggleGroup = async (group: DividendGroup) => {
    const key = `${group.issuer}-${group.group_name}`;

    if (expandedGroup === key) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(key);
      await loadGroupETFs(group.issuer, group.group_name);
    }
  };

  // 다음 배당락일까지의 상태에 따른 스타일
  const getTimerStyle = (nextExDate?: string) => {
    if (!nextExDate) return "";

    const exDate = new Date(nextExDate);
    const targetDate = new Date(exDate);

    // 썸머타임 여부 확인
    const isDST = (date: Date) => {
      const year = date.getFullYear();
      const march = new Date(year, 2, 1);
      const secondSunday = new Date(year, 2, 8 + ((7 - march.getDay()) % 7));
      const november = new Date(year, 10, 1);
      const firstSunday = new Date(year, 10, 1 + ((7 - november.getDay()) % 7));
      return date >= secondSunday && date < firstSunday;
    };

    const isTargetDST = isDST(targetDate);
    const kstHour = isTargetDST ? 5 : 6;
    targetDate.setHours(kstHour, 0, 0, 0);

    const now = new Date();
    const timeLeft = targetDate.getTime() - now.getTime();
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

    if (days <= 1) return "text-red-500";
    if (days <= 3) return "text-orange-500";
    if (days <= 7) return "text-yellow-500";
    return "text-green-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-900 dark:text-white">
              배당 그룹 정보를 불러오는 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1 text-gray-900 dark:text-white">
            배당 대시보드
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            다음 배당락일까지의 시간을 확인하고 매수 타이밍을 놓치지 마세요
          </p>
        </div>

        <div className="grid gap-3 md:gap-4">
          {groups.map((group) => {
            const key = `${group.issuer}-${group.group_name}`;
            const isExpanded = expandedGroup === key;
            const countdown = countdowns[key];
            // 배당락일과 지급일이 있으면 타이머 표시 (시간 경과 여부와 관계없이)
            const hasTimer = group.next_ex_date && group.next_pay_date;

            return (
              <Card
                key={key}
                className={`transition-all duration-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${hasTimer ? "border-l-4 border-l-blue-500" : ""}`}
              >
                <CardHeader className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
                        {group.issuer}{" "}
                        {group.issuer === "YieldMax"
                          ? `${group.group_name}조`
                          : group.group_name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1"
                      >
                        {group.etf_count}개 ETF
                      </Badge>
                      {hasTimer &&
                        (() => {
                          const now = new Date();
                          const nowKST = toZonedTime(now, 'Asia/Seoul');
                          const countdown = countdowns[`${group.issuer}-${group.group_name}`];
                          
                          if (!group.next_ex_date) return null;
                          
                          // 배당락일 파싱
                          const exDateStr = group.next_ex_date + 'T00:00:00';
                          const exDate = toZonedTime(new Date(exDateStr), 'Asia/Seoul');
                          
                          // 배닸락일 당일 오전 9시 (KST)
                          const exDateStart = new Date(exDate);
                          exDateStart.setHours(9, 0, 0, 0);
                          
                          // 배당락일 다음날 새벽 5시 (KST) - 매도 가능 마감
                          const sellDeadline = new Date(exDate);
                          sellDeadline.setDate(sellDeadline.getDate() + 1);
                          sellDeadline.setHours(5, 0, 0, 0);
                          
                          // 매수 마감 시점 계산 (미국 동부시간 기준)
                          const isDST = (date: Date) => {
                            const year = date.getFullYear();
                            const march = new Date(year, 2, 1);
                            const secondSunday = new Date(
                              year,
                              2,
                              8 + ((7 - march.getDay()) % 7),
                            );
                            const november = new Date(year, 10, 1);
                            const firstSunday = new Date(
                              year,
                              10,
                              1 + ((7 - november.getDay()) % 7),
                            );
                            return date >= secondSunday && date < firstSunday;
                          };
                          
                          const usEasternDate = toZonedTime(exDate, 'America/New_York');
                          const isTargetDST = isDST(usEasternDate);
                          const kstHour = isTargetDST ? 5 : 6;
                          const buyDeadline = new Date(exDate);
                          buyDeadline.setHours(kstHour, 0, 0, 0);
                          
                          // 상태 판단
                          const isSellPeriod = nowKST >= exDateStart && nowKST < sellDeadline;
                          const isBuyDeadlinePassed = nowKST >= buyDeadline;
                          const timeUntilBuyDeadline = buyDeadline.getTime() - nowKST.getTime();
                          const daysUntilBuyDeadline = Math.floor(timeUntilBuyDeadline / (1000 * 60 * 60 * 24));
                          
                          if (isSellPeriod || (isBuyDeadlinePassed && nowKST < sellDeadline)) {
                            // 배당락일~다음날 새벽 5시: 매도가능 (매수 마감 후도 포함)
                            return (
                              <Badge
                                variant="outline"
                                className="text-green-600 dark:text-green-400 border-green-500"
                              >
                                <TrendingUpIcon className="w-4 h-4 mr-1" />
                                매도가능
                              </Badge>
                            );
                          } else if (nowKST >= sellDeadline) {
                            // 매도 마감 후: 배지 없음
                            return null;
                          } else if (daysUntilBuyDeadline <= 1) {
                            // 1일 이하 남음: 마감 임박
                            return (
                              <Badge
                                variant="outline"
                                className="text-red-500 border-red-500"
                              >
                                <ClockIcon className="w-4 h-4 mr-1" />
                                마감 임박
                              </Badge>
                            );
                          } else if (daysUntilBuyDeadline <= 3) {
                            // 3일 이하 남음: 마감 임박 (주황색)
                            return (
                              <Badge
                                variant="outline"
                                className="text-orange-500 border-orange-500"
                              >
                                <ClockIcon className="w-4 h-4 mr-1" />
                                마감 임박
                              </Badge>
                            );
                          } else {
                            // 기간이 많이 남음: 배지 없음
                            return null;
                          }
                        })()}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-700 dark:text-gray-300"
                      onClick={() => toggleGroup(group)}
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* 타이머 표시 */}
                  {hasTimer && countdown && (
                    <div className={`mt-1.5 md:mt-2 p-2 md:p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950`}>
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          다음 배당락일까지
                        </div>
                        <div className="text-base md:text-lg font-mono font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-sm">
                          {countdown}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 leading-tight">
                          <div className="flex flex-col gap-0.5">
                            <span>
                              배당락일:{" "}
                              {group.next_ex_date
                                ? (() => {
                                    const exDateStr = group.next_ex_date + 'T00:00:00';
                                    const exDate = toZonedTime(new Date(exDateStr), 'Asia/Seoul');
                                    
                                    // 미국 동부시간 기준으로 DST 확인
                                    const isDST = (date: Date) => {
                                      const year = date.getFullYear();
                                      const march = new Date(year, 2, 1);
                                      const secondSunday = new Date(
                                        year,
                                        2,
                                        8 + ((7 - march.getDay()) % 7),
                                      );
                                      const november = new Date(year, 10, 1);
                                      const firstSunday = new Date(
                                        year,
                                        10,
                                        1 + ((7 - november.getDay()) % 7),
                                      );
                                      return (
                                        date >= secondSunday && date < firstSunday
                                      );
                                    };

                                    const usEasternDate = toZonedTime(exDate, 'America/New_York');
                                    const isTargetDST = isDST(usEasternDate);
                                    const kstHour = isTargetDST ? 5 : 6;
                                    const targetDate = new Date(exDate);
                                    targetDate.setHours(kstHour, 0, 0, 0);

                                    return format(
                                      targetDate,
                                      "MM-dd HH:mm",
                                      { locale: ko },
                                    );
                                  })()
                                : ""}
                            </span>
                            <span>지급일: {group.next_pay_date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>

                {/* 확장된 ETF 목록 */}
                {isExpanded && (
                  <CardContent className="p-2 md:p-3">
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                      {errorETFs[key] ? (
                        <div className="text-center py-3">
                          <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                            데이터 로딩 실패: {errorETFs[key]}
                          </div>
                          <button
                            onClick={() => {
                              setErrorETFs(prev => ({ ...prev, [key]: '' }));
                              loadGroupETFs(group.issuer, group.group_name);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            다시 시도
                          </button>
                        </div>
                      ) : loadingETFs[key] ? (
                        <div className="text-center py-3 text-xs text-gray-600 dark:text-gray-400">
                          ETF 목록을 불러오는 중...
                        </div>
                      ) : groupETFs[key] ? (
                        <div className="grid gap-1">
                          {groupETFs[key].map((etf) => (
                            <div
                              key={etf.ticker}
                              className="flex items-center justify-between p-1.5 md:p-2 rounded-md bg-gray-50 dark:bg-gray-700"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <Link href={`/stock/${etf.ticker}`}>
                                    <div className="font-medium text-xs md:text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
                                      {etf.ticker}
                                    </div>
                                  </Link>
                                  {etf.dividend_frequency === '1W' && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1 py-0 h-4 border-blue-500 text-blue-600 dark:text-blue-400"
                                    >
                                      W
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {etf.name}
                                </div>
                              </div>
                              <div className="text-right ml-2 flex-shrink-0">
                                {etf.current_price && (
                                  <div className="font-medium text-xs md:text-sm text-gray-900 dark:text-white">
                                    ${etf.current_price}
                                  </div>
                                )}
                                {etf.dividend_yield && (
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    {etf.dividend_yield}%
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-xs text-gray-600 dark:text-gray-400">
                          ETF 목록을 불러오는 중...
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* 타이머가 없는 그룹들 */}
          {(() => {
            const groupsWithoutTimer = groups.filter(group => !group.next_ex_date || !group.next_pay_date);
            
            if (groupsWithoutTimer.length > 0) {
              return (
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="p-2 md:p-3">
                    <CardTitle className="text-sm md:text-base text-gray-900 dark:text-white">
                      배당일정 미정 그룹
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 md:p-3 pt-0">
                    <div className="grid gap-1.5">
                      {groupsWithoutTimer.map((group) => {
                        const key = `${group.issuer}-${group.group_name}`;
                        const isExpanded = expandedGroup === key;
                        
                        return (
                          <div
                            key={key}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-750"
                          >
                            <div className="p-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="text-sm text-gray-900 dark:text-white font-medium">
                                  {group.issuer}{" "}
                                  {group.issuer === "YieldMax"
                                    ? `${group.group_name}조`
                                    : group.group_name}
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-1.5 py-0.5"
                                >
                                  {group.etf_count}개 ETF
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-700 dark:text-gray-300 h-6 w-6 p-0"
                                onClick={() => toggleGroup(group)}
                              >
                                {isExpanded ? (
                                  <ChevronUpIcon className="w-3 h-3" />
                                ) : (
                                  <ChevronDownIcon className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            
                            {/* 확장된 ETF 목록 */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                                {errorETFs[key] ? (
                                  <div className="text-center py-3">
                                    <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                                      데이터 로딩 실패: {errorETFs[key]}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setErrorETFs(prev => ({ ...prev, [key]: '' }));
                                        loadGroupETFs(group.issuer, group.group_name);
                                      }}
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      다시 시도
                                    </button>
                                  </div>
                                ) : loadingETFs[key] ? (
                                  <div className="text-center py-2 text-xs text-gray-600 dark:text-gray-400">
                                    ETF 목록을 불러오는 중...
                                  </div>
                                ) : groupETFs[key] ? (
                                  <div className="grid gap-1">
                                    {groupETFs[key].map((etf) => (
                                      <div
                                        key={etf.ticker}
                                        className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-gray-700"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1">
                                            <Link href={`/stock/${etf.ticker}`}>
                                              <div className="font-medium text-xs text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
                                                {etf.ticker}
                                              </div>
                                            </Link>
                                            {etf.dividend_frequency === '1W' && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs px-1 py-0 h-4 border-blue-500 text-blue-600 dark:text-blue-400"
                                              >
                                                W
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                            {etf.name}
                                          </div>
                                        </div>
                                        <div className="text-right ml-2 flex-shrink-0">
                                          {etf.current_price && (
                                            <div className="font-medium text-xs text-gray-900 dark:text-white">
                                              ${etf.current_price}
                                            </div>
                                          )}
                                          {etf.dividend_yield && (
                                            <div className="text-xs text-green-600 dark:text-green-400">
                                              {etf.dividend_yield}%
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-xs text-gray-600 dark:text-gray-400">
                                    ETF 목록을 불러오는 중...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}

          {groups.length === 0 && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="text-center py-8">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  배당 그룹 정보가 없습니다.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

