"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
      const now = new Date();
      const newCountdowns: { [key: string]: string } = {};

      groups.forEach((group) => {
        if (group.next_ex_date) {
          // 배당락일 당일 미국 장마감시간까지 계산 (배당락일 새벽 5시 또는 6시)
          const exDate = new Date(group.next_ex_date);
          const targetDate = new Date(exDate);

          // 썸머타임 여부 확인
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

          const isTargetDST = isDST(targetDate);
          // EDT: 한국시간 오전 5시, EST: 한국시간 오전 6시
          const kstHour = isTargetDST ? 5 : 6;
          targetDate.setHours(kstHour, 0, 0, 0);

          const timeLeft = targetDate.getTime() - now.getTime();

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
              // 당일이면 시간:분:초만 표시하고 마감 임박 표시
              newCountdowns[`${group.issuer}-${group.group_name}`] =
                `${hours}시간 ${minutes}분 ${seconds}초 (마감 임박)`;
            } else {
              newCountdowns[`${group.issuer}-${group.group_name}`] =
                `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
            }
          } else {
            newCountdowns[`${group.issuer}-${group.group_name}`] = "매수 마감";
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

    try {
      const response = await fetch("/api/dividend-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuer, group_name: groupName }),
      });

      const data = await response.json();

      if (data.success) {
        setGroupETFs((prev) => ({
          ...prev,
          [key]: data.stocks,
        }));
      }
    } catch (error) {
      console.error("Failed to load group ETFs:", error);
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
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            배당 대시보드
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            다음 배당락일까지의 시간을 확인하고 매수 타이밍을 놓치지 마세요
          </p>
        </div>

        <div className="grid gap-6">
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
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-xl text-gray-900 dark:text-white">
                        {group.issuer}{" "}
                        {group.issuer === "YieldMax"
                          ? `${group.group_name}조`
                          : group.group_name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {group.etf_count}개 ETF
                      </Badge>
                      {hasTimer &&
                        (() => {
                          const timerStyle = getTimerStyle(group.next_ex_date);
                          const key = `${group.issuer}-${group.group_name}`;
                          const isUrgent =
                            countdown && countdown.includes("마감 임박");

                          return (
                            <Badge
                              variant="outline"
                              className={`${timerStyle} border-current`}
                            >
                              <ClockIcon className="w-4 h-4 mr-1" />
                              {isUrgent ? "마감 임박" : "긴급"}
                            </Badge>
                          );
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
                    <div className={`mt-4 p-4 rounded-lg`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            다음 배당락일까지
                          </div>
                          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                            {countdown}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            배당락일:{" "}
                            {group.next_ex_date
                              ? (() => {
                                  const exDate = new Date(group.next_ex_date);
                                  // 썸머타임 여부 확인
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

                                  const isTargetDST = isDST(exDate);
                                  const kstHour = isTargetDST ? 5 : 6;
                                  const targetDate = new Date(exDate);
                                  targetDate.setHours(kstHour, 0, 0, 0);

                                  return format(
                                    targetDate,
                                    "yyyy-MM-dd HH:mm",
                                    { locale: ko },
                                  );
                                })()
                              : ""}{" "}
                            | 지급일: {group.next_pay_date}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>

                {/* 확장된 ETF 목록 */}
                {isExpanded && (
                  <CardContent>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
                        포함된 ETF 목록
                      </h4>
                      {groupETFs[key] ? (
                        <div className="grid gap-2">
                          {groupETFs[key].map((etf) => (
                            <div
                              key={etf.ticker}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                            >
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {etf.ticker}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                  {etf.name}
                                </div>
                              </div>
                              <div className="text-right">
                                {etf.current_price && (
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    ${etf.current_price}
                                  </div>
                                )}
                                {etf.dividend_yield && (
                                  <div className="text-sm text-green-600 dark:text-green-400">
                                    {etf.dividend_yield}% 수익률
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                          ETF 목록을 불러오는 중...
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {groups.length === 0 && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="text-center py-12">
                <div className="text-gray-600 dark:text-gray-400">
                  다음 배당락일이 예정된 그룹이 없습니다.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

