"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import AuthButton from "@/components/auth-button";
import { createClient } from "@/lib/supabase/client";
import {
  Menu,
  X,
  Home,
  PieChart,
  TrendingUp,
  Target,
  Wallet,
  BarChart3,
  Bell,
  User,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navigation = [
  { name: "홈", href: "/", icon: Home },
  { name: "배당주 랭킹", href: "/ranking", icon: TrendingUp }
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // 현재 사용자 상태 확인
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
              <span className="text-white dark:text-black font-bold text-sm">
                배
              </span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                배당투자 비서
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-start flex-1 gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors duration-200"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Currency toggle */}
            <CurrencyToggle />

            {/* Notifications */}
            <Button
              variant="outline"
              size="icon"
              className="hidden md:flex"
              title="알림"
            >
              <Bell className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">알림</span>
            </Button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Auth buttons */}
            <div className="hidden md:flex items-center gap-2">
              {!user ? (
                <Link href="/auth/login">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                    로그인
                  </Button>
                </Link>
              ) : (
                <AuthButton />
              )}
            </div>

            {/* Mobile menu button */}
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="메뉴"
            >
              {mobileMenuOpen ? (
                <X className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Menu className="h-[1.2rem] w-[1.2rem]" />
              )}
              <span className="sr-only">메뉴</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200 dark:border-gray-700">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}

              {/* Mobile only actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                <Link
                  href="/notifications"
                  className="flex items-center gap-3 px-3 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Bell className="h-5 w-5" />
                  알림
                </Link>
                {!user ? (
                  <Link
                    href="/auth/login"
                    className="flex items-center gap-3 px-3 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LogIn className="h-5 w-5" />
                    로그인
                  </Link>
                ) : (
                  <div className="px-3 py-2">
                    <AuthButton />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

