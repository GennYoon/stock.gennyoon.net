'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'
import { LogOut, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function AuthButton() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 현재 사용자 상태 확인
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    
    getUser()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
    setLoading(false)
  }

  // 로그인하지 않은 경우 버튼을 표시하지 않음
  if (!user) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={loading}
    >
      <LogOut className="h-4 w-4 mr-2" />
      {loading ? '로그아웃 중...' : '로그아웃'}
    </Button>
  )
}