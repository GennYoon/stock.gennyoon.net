"use client";

import { useCurrency } from "@/shared/hooks/use-currency";
import { DollarSign, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setCurrency(currency === 'USD' ? 'KRW' : 'USD')}
      title={currency === 'USD' ? '원화로 전환' : '달러로 전환'}
      className="relative"
    >
      <DollarSign className={`h-[1.2rem] w-[1.2rem] transition-all ${
        currency === 'USD' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
      } text-green-600 dark:text-green-400`} />
      <Banknote className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
        currency === 'KRW' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
      } text-blue-600 dark:text-blue-400`} />
      <span className="sr-only">
        {currency === 'USD' ? '원화로 전환' : '달러로 전환'}
      </span>
    </Button>
  );
}