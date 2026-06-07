'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Handshake,
  Lightbulb,
  KeyRound
} from 'lucide-react'

interface LoginPagesProps {
  type: 'shareholder' | 'idea-owner'
  onNavigate: (page: string) => void
}

export function LoginPages({ type, onNavigate }: LoginPagesProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isShareholder = type === 'shareholder'

  const handleLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      onNavigate('dashboard-shareholder')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Button>

        <Card className="border-stone-200 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              isShareholder ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              {isShareholder
                ? <Handshake className="w-8 h-8 text-emerald-600" />
                : <Lightbulb className="w-8 h-8 text-amber-600" />
              }
            </div>
            <CardTitle className="text-2xl text-stone-900">
              {isShareholder ? 'Shareholder Login' : 'Idea Owner Login'}
            </CardTitle>
            <p className="text-sm text-stone-500 mt-1">
              {isShareholder
                ? 'Access your shareholder dashboard and venture portfolio'
                : 'Submit and manage your business ideas'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  onClick={() => {}}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className={`w-full text-white ${isShareholder ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>

            <Separator />

            <div className="text-center space-y-2">
              {isShareholder ? (
                <p className="text-sm text-stone-500">
                  Not a shareholder yet?{' '}
                  <button onClick={() => onNavigate('waitlist')} className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Join the Waitlist
                  </button>
                </p>
              ) : (
                <>
                  <p className="text-sm text-stone-500">
                    Have a great idea?{' '}
                    <button onClick={() => onNavigate('idea-submission')} className="text-amber-600 hover:text-amber-700 font-medium">
                      Submit Your Idea
                    </button>
                  </p>
                  <p className="text-sm text-stone-500">
                    New to 1K Leaders?{' '}
                    <button onClick={() => onNavigate('waitlist')} className="text-emerald-600 hover:text-emerald-700 font-medium">
                      Join the Waitlist
                    </button>
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-stone-400 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
