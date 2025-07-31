"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import AuthButton from "@/components/auth-button";
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
  LogIn
} from "lucide-react";
import Link from "next/link";

const navigation = [
  { name: "대시보드", href: "/", icon: Home },
  { name: "포트폴리오", href: "/portfolio", icon: PieChart },
  { name: "고배당 분석", href: "/analysis", icon: TrendingUp },
  { name: "목표 계산기", href: "/calculator", icon: Target },
  { name: "원금 회수", href: "/recovery", icon: Wallet },
  { name: "시장 동향", href: "/market", icon: BarChart3 },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold toss-text-gradient">
                배당투자 비서
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors duration-200"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Currency toggle */}
            <CurrencyToggle />

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Bell className="h-4 w-4" />
            </Button>

            {/* Auth buttons */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  <LogIn className="h-4 w-4 mr-2" />
                  로그인
                </Button>
              </Link>
              <AuthButton />
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-border">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile only actions */}
              <div className="pt-4 border-t border-border space-y-1">
                <Link
                  href="/notifications"
                  className="flex items-center gap-3 px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Bell className="h-5 w-5" />
                  알림
                </Link>
                <Link
                  href="/auth/login"
                  className="flex items-center gap-3 px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="h-5 w-5" />
                  로그인
                </Link>
                <div className="px-3 py-2">
                  <AuthButton />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}