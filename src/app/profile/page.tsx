"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Calendar, Settings, Shield, Edit3 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
        setDisplayName(user?.user_metadata?.display_name || user?.email || "");
      } catch (error) {
        console.error("Failed to get user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [supabase.auth]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      });

      if (error) throw error;

      // 사용자 정보 다시 가져오기
      const {
        data: { user: updatedUser },
      } = await supabase.auth.getUser();
      setUser(updatedUser);
      setEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("프로필 업데이트에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-900 dark:text-white">
              프로필을 불러오는 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600 dark:text-red-400">
              로그인이 필요합니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            내정보
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            계정 정보와 설정을 관리할 수 있습니다
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          {/* 기본 정보 카드 */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                기본 정보
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(!editing)}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                {editing ? "취소" : "편집"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    표시 이름
                  </label>
                  {editing ? (
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="표시할 이름을 입력하세요"
                    />
                  ) : (
                    <div className="px-3 py-2 text-gray-900 dark:text-white">
                      {user.user_metadata?.display_name || "설정되지 않음"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    이메일
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 text-gray-900 dark:text-white">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {user.email}
                    {user.email_confirmed_at && (
                      <Badge variant="success" className="text-xs">
                        인증됨
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {editing && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveProfile} className="gap-2">
                    <Settings className="h-4 w-4" />
                    저장
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setDisplayName(
                        user.user_metadata?.display_name || user.email || "",
                      );
                    }}
                  >
                    취소
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 계정 정보 카드 */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                계정 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    계정 생성일
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 text-gray-900 dark:text-white">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {formatDate(user.created_at)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    마지막 로그인
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 text-gray-900 dark:text-white">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {user.last_sign_in_at
                      ? formatDate(user.last_sign_in_at)
                      : "정보 없음"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  사용자 ID
                </label>
                <div className="px-3 py-2 font-mono text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {user.id}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 설정 카드 */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                추가 설정 기능은 향후 업데이트에서 제공될 예정입니다.
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <span className="text-sm font-medium">이메일 알림</span>
                  <Badge variant="secondary">곧 출시</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <span className="text-sm font-medium">개인정보 설정</span>
                  <Badge variant="secondary">곧 출시</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <span className="text-sm font-medium">투자 선호도</span>
                  <Badge variant="secondary">곧 출시</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}