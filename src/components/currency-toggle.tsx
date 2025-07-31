"use client";

import { Button } from "@/components/ui/button";
import { useCurrency } from "@/shared/hooks/use-currency";
import { DollarSign, Banknote } from "lucide-react";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCurrency(currency === 'USD' ? 'KRW' : 'USD')}
      className="flex items-center gap-1 px-2"
      title={currency === 'USD' ? '원화로 전환' : '달러로 전환'}
    >
      {currency === 'USD' ? (
        <>
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline text-xs font-medium">USD</span>
        </>
      ) : (
        <>
          <Banknote className="h-4 w-4" />
          <span className="hidden sm:inline text-xs font-medium">KRW</span>
        </>
      )}
    </Button>
  );
}