'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ChevronDown, Users, Lightbulb, Handshake, TrendingUp, Shield, UserCircle, Building2, Star } from 'lucide-react';
import type { Page, DashboardRole } from './types';

interface Props { navigate: (page: Page) => void; type?: 'partner' | 'idea-owner'; onRoleSelect?: (role: DashboardRole) => void; }

const roles: { id: DashboardRole; label: string; labelAr: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'shareholder', label: 'Shareholder', labelAr: 'مساهم', icon: <Building2 className="w-5 h-5" />, desc: 'Access shareholder dashboard & portfolio' },
  { id: 'partner', label: 'Partner', labelAr: 'شريك', icon: <Handshake className="w-5 h-5" />, desc: 'Manage partnerships & ventures' },
  { id: 'investor', label: 'Investor', labelAr: 'مستثمر', icon: <TrendingUp className="w-5 h-5" />, desc: 'Track investments & returns' },
  { id: 'idea-owner', label: 'Idea Owner', labelAr: 'صاحب فكرة', icon: <Lightbulb className="w-5 h-5" />, desc: 'Submit & manage your ideas' },
  { id: 'admin', label: 'Admin', labelAr: 'مدير', icon: <Shield className="w-5 h-5" />, desc: 'Admin dashboard & controls' },
  { id: 'super-admin', label: 'Super Admin', labelAr: 'مدير عام', icon: <Star className="w-5 h-5" />, desc: 'Full system access & management' },
  { id: 'user', label: 'User', labelAr: 'مستخدم', icon: <UserCircle className="w-5 h-5" />, desc: 'Standard user access' },
  { id: 'vvp', label: 'VVP', labelAr: 'VVP', icon: <Users className="w-5 h-5" />, desc: 'VVP assignments & tracking' },
];

export default function LoginPage({ navigate, type, onRoleSelect }: Props) {
  const [selectedRole, setSelectedRole] = useState<DashboardRole>(type === 'idea-owner' ? 'idea-owner' : type === 'partner' ? 'partner' : 'shareholder');
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedRoleData = roles.find(r => r.id === selectedRole) || roles[0];

  const handleSignIn = () => {
    setIsLoading(true);
    if (onRoleSelect) onRoleSelect(selectedRole);
    setTimeout(() => {
      setIsLoading(false);
      navigate('dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6] p-4" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="max-w-md w-full">
        <Button variant="ghost" onClick={() => navigate('landing')} className="mb-6 text-[#7e7e7e] hover:text-[#222]">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card className="border-[#f0f0f0] shadow-lg">
          <CardHeader className="text-center pb-2">
            <img src="/logo-red-mid.png" alt="1KLeaders" className="h-12 mx-auto mb-3 object-contain" />
            <CardTitle className="text-xl text-[#222]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Welcome Back
            </CardTitle>
            <p className="text-sm text-[#7e7e7e] mt-1">Sign in to your 1K Leaders account</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {/* Role Selector */}
            <div className="space-y-2">
              <Label className="text-[#222] font-medium text-sm">Sign in as</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#f0f0f0] bg-white hover:border-[#e33b5f]/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#e33b5f]/10 to-[#E65F5C]/10 flex items-center justify-center text-[#e33b5f]">
                      {selectedRoleData.icon}
                    </div>
                    <div>
                      <p className="font-medium text-[#222] text-sm" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>{selectedRoleData.label}</p>
                      <p className="text-xs text-[#7e7e7e]">{selectedRoleData.desc}</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-[#7e7e7e] transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showRoleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[#f0f0f0] shadow-lg z-50 overflow-hidden">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => { setSelectedRole(role.id); setShowRoleDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f6f6f6] transition-colors ${selectedRole === role.id ? 'bg-[#e33b5f]/5 border-l-2 border-l-[#e33b5f]' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedRole === role.id ? 'bg-gradient-to-r from-[#e33b5f]/10 to-[#E65F5C]/10 text-[#e33b5f]' : 'bg-[#f0f0f0] text-[#7e7e7e]'}`}>
                          {role.icon}
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${selectedRole === role.id ? 'text-[#e33b5f]' : 'text-[#222]'}`} style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>{role.label}</p>
                          <p className="text-xs text-[#7e7e7e]">{role.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-[#222] font-medium text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-[#7e7e7e]" />
                <Input type="email" placeholder="your@email.com" className="pl-10 border-[#f0f0f0] focus:border-[#e33b5f] h-11" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[#222] font-medium text-sm">Password</Label>
                <a href="#" className="text-xs text-[#e33b5f] hover:underline font-medium">Forgot Password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-[#7e7e7e]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 border-[#f0f0f0] focus:border-[#e33b5f] h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#7e7e7e] hover:text-[#222] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-[#f0f0f0] accent-[#e33b5f]" />
              <label className="text-sm text-[#555353]">Remember me</label>
            </div>

            {/* Sign In Button */}
            <Button
              className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold h-11 text-base"
              onClick={handleSignIn}
              disabled={isLoading}
              style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <>Sign In as {selectedRoleData.label}</>
              )}
            </Button>

            <Separator className="bg-[#f0f0f0]" />

            {/* Bottom links */}
            <div className="text-center space-y-2">
              <p className="text-sm text-[#7e7e7e]">
                Don&apos;t have an account?{' '}
                <button onClick={() => navigate('waitlist')} className="text-[#e33b5f] font-medium hover:underline">Join the Waitlist</button>
              </p>
              {selectedRole === 'idea-owner' && (
                <p className="text-sm text-[#7e7e7e]">
                  Have an idea?{' '}
                  <button onClick={() => navigate('idea-submission')} className="text-[#E65F5C] font-medium hover:underline">Submit Your Idea</button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#7e7e7e] mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
