'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Lock, Bell, Shield, Palette , Eye, Save, Mail } from 'lucide-react';

type Props = Record<string, never>;

export default function SettingsPage({}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">Settings</h1>
        <p className="text-[#7e7e7e]">Manage your account preferences and settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-[#f6f6f6] p-1 rounded-lg">
          {[
            { value: 'profile', label: 'Profile', icon: User },
            { value: 'account', label: 'Account', icon: Lock },
            { value: 'notifications', label: 'Notifications', icon: Bell },
            { value: 'privacy', label: 'Privacy', icon: Shield },
            { value: 'display', label: 'Display', icon: Palette },
                      ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs data-[state=active]:bg-white">
              <t.icon className="w-3 h-3 mr-1" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16"><AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-lg">1K</AvatarFallback></Avatar>
                <div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                  <p className="text-xs text-[#9e9e9e] mt-1">JPG, PNG. Max 2MB</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Full Name</Label><Input defaultValue="Ahmed Al-Rashid" /></div>
                <div><Label>Email</Label><Input defaultValue="ahmed@1kleaders.com" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Phone</Label><Input defaultValue="+966 55 123 4567" /></div>
                <div><Label>Location</Label><Input defaultValue="Riyadh, Saudi Arabia" /></div>
              </div>
              <div><Label>Bio</Label><Input defaultValue="Venture partner with 15+ years in tech investments" /></div>
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]"><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader><CardTitle className="text-base">Account Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Current Email</Label><Input defaultValue="ahmed@1kleaders.com" /></div>
              <div><Label>Change Password</Label><Input type="password" placeholder="Enter new password" /></div>
              <div><Label>Confirm Password</Label><Input type="password" placeholder="Confirm new password" /></div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-sm">Two-Factor Authentication</p><p className="text-xs text-[#7e7e7e]">Add extra security to your account</p></div>
                <Switch />
              </div>
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]"><Save className="w-4 h-4 mr-2" /> Update Account</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Email Notifications', desc: 'Receive updates via email' },
                { label: 'Action Required Alerts', desc: 'High-priority admin notifications' },
                { label: 'Platform Notifications', desc: 'In-app notification alerts' },
                { label: 'WhatsApp Notifications', desc: 'Get alerts on WhatsApp' },
                { label: 'Calendar Reminders', desc: 'Meeting and event reminders' },
                { label: 'Investment Updates', desc: 'Updates on your investments' },
                { label: 'Partner Activity', desc: 'Notifications about partner actions' },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                  <div><p className="font-medium text-sm">{n.label}</p><p className="text-xs text-[#7e7e7e]">{n.desc}</p></div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader><CardTitle className="text-base">Privacy Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Profile Visibility', desc: 'Make your profile visible to other partners' },
                { label: 'Data Sharing', desc: 'Share anonymized data for platform improvements' },
                { label: 'Activity Status', desc: 'Show when you are online' },
                { label: 'Investment Visibility', desc: 'Allow partners to see your investment activity' },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                  <div><p className="font-medium text-sm">{p.label}</p><p className="text-xs text-[#7e7e7e]">{p.desc}</p></div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display">
          <Card>
            <CardHeader><CardTitle className="text-base">Display Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Theme</Label>
                  <div className="flex gap-2 mt-2">
                    {['Light', 'Dark', 'System'].map(t => (
                      <button key={t} className={`px-3 py-1.5 rounded-lg text-sm border ${t === 'Light' ? 'bg-[#e33b5f]/5 border-emerald-600 text-[#c02d4f]' : 'bg-white border-stone-300 text-[#555353]'}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div><Label>Language</Label>
                  <div className="flex gap-2 mt-2">
                    {['English', 'العربية'].map(l => (
                      <button key={l} className={`px-3 py-1.5 rounded-lg text-sm border ${l === 'English' ? 'bg-[#e33b5f]/5 border-emerald-600 text-[#c02d4f]' : 'bg-white border-stone-300 text-[#555353]'}`}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div><Label>Timezone</Label><Input defaultValue="Asia/Riyadh (UTC+3)" /></div>
              <div><Label>Default Dashboard View</Label><Input defaultValue="Partner Dashboard" /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
