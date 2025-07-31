import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function PortfolioPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">내 포트폴리오</h1>
          <p className="text-muted-foreground">환영합니다, {user.email}님!</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          종목 추가
        </Button>
      </div>
      
      <div className="text-center text-muted-foreground">
        포트폴리오 기능은 준비 중입니다.
      </div>
    </div>
  )
}