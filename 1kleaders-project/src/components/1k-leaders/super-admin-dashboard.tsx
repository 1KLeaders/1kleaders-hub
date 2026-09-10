'use client'

import { useState, useEffect } from 'react'
import ModerationPanel from './moderation-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Shield,
  DollarSign,
  Activity,
  Settings,
  TrendingUp,
  FileText,
  Lightbulb,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  Cpu,
  Rocket,
  Clock,
  CheckCheck,
  Loader2,
  RefreshCw,
  Tag,
  Plus,
  X,
  Search,
  GraduationCap,
  Award,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

interface SuperAdminDashboardProps {
  onNavigate: (page: string) => void
}




type WaitlistRow = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  org_name: string
  leader_profiles: string[]
  status: 'pending' | 'meeting-scheduled' | 'approved' | 'rejected' | 'parked' | 'more-info-required'
  admin_notes: string | null
  meeting_date?: string | null
}

function SendAgreementButton({ row, onSent }: { row: WaitlistRow; onSent: () => void }) {
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [checking, setChecking] = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Check if an envelope already exists for this waitlist row on mount
  useEffect(() => {
    supabase
      .from('docusign_envelopes')
      .select('id')
      .eq('waitlist_id', row.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSent(true);
        setChecking(false);
      });
  }, [row.id]);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/docusign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name:  `${row.first_name} ${row.last_name}`,
          recipient_email: row.email,
          waitlist_id:     row.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSent(true);
      onSent();
    } catch (e: any) {
      setError(e.message);
    }
    setSending(false);
  }

  if (checking) return <span className="text-xs text-[#9e9e9e]">Checking...</span>;
  if (sent) return <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" /> Agreement Sent</span>;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
        disabled={sending} onClick={send}>
        {sending ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Sending...</> : '📄 Send Agreement'}
      </Button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}


const BADGE_COLORS = [
  { label: 'Red',    value: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Blue',   value: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Green',  value: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Purple', value: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Amber',  value: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Pink',   value: 'bg-pink-100 text-pink-700 border-pink-200' },
  { label: 'Teal',   value: 'bg-teal-100 text-teal-700 border-teal-200' },
  { label: 'Stone',  value: 'bg-stone-100 text-stone-700 border-stone-200' },
];

const BADGE_ICONS = ['⭐','🏆','🔑','💎','🎯','🌟','🛠','🔬','📊','🤝','🚀','💡','🛡️','⚡','🌍'];

function NewBadgeCreator({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [open,    setOpen]    = useState(false);
  const [label,   setLabel]   = useState('');
  const [icon,    setIcon]    = useState('⭐');
  const [color,   setColor]   = useState(BADGE_COLORS[0].value);
  const [saved,   setSaved]   = useState(false);
  const [badges,  setBadges]  = useState<{ id: string; label: string; icon: string; color: string }[]>([]);

  if (!isSuperAdmin) return null;

  const createBadge = () => {
    if (!label.trim()) return;
    const newBadge = { id: Date.now().toString(), label: label.trim(), icon, color };
    setBadges(prev => [...prev, newBadge]);
    setLabel(''); setIcon('⭐'); setColor(BADGE_COLORS[0].value);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-stone-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600" /> Badge Manager
            <span className="text-xs font-normal text-purple-500 ml-1">Super Admin only</span>
          </CardTitle>
          <Button size="sm" variant="outline" className="border-purple-200 text-purple-700 h-7" onClick={() => setOpen(v => !v)}>
            {open ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            {open ? 'Close' : 'New Badge'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing custom badges */}
        {badges.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[#9e9e9e] uppercase tracking-wider mb-2">Custom Badges</p>
            <div className="flex flex-wrap gap-2">
              {badges.map(b => (
                <div key={b.id} className="flex items-center gap-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${b.color}`}>
                    {b.icon} {b.label}
                  </span>
                  <button onClick={() => setBadges(prev => prev.filter(x => x.id !== b.id))} className="text-[#9e9e9e] hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creator form */}
        {open && (
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg space-y-4">
            <p className="text-sm font-medium text-purple-800">Create New Badge</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#444]">Badge Label</Label>
                <Input className="mt-1 border-[#f0f0f0] bg-white" placeholder="e.g. Mentor, Advisor" value={label} onChange={e => setLabel(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-[#444]">Icon</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {BADGE_ICONS.map(ic => (
                    <button key={ic} onClick={() => setIcon(ic)}
                      className={`w-8 h-8 rounded-lg text-sm transition ${icon === ic ? 'bg-purple-200 ring-2 ring-purple-400' : 'bg-white border border-[#f0f0f0] hover:border-purple-300'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#444]">Color</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {BADGE_COLORS.map(c => (
                  <button key={c.value} onClick={() => setColor(c.value)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition ${c.value} ${color === c.value ? 'ring-2 ring-offset-1 ring-purple-400' : ''}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {label && (
              <div>
                <p className="text-xs text-[#9e9e9e] mb-1">Preview</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${color}`}>{icon} {label}</span>
              </div>
            )}
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={createBadge} disabled={!label.trim()}>
              {saved ? <><CheckCheck className="w-4 h-4 mr-2" />Badge Created!</> : <><Plus className="w-4 h-4 mr-2" />Create Badge</>}
            </Button>
          </div>
        )}

        {!open && badges.length === 0 && (
          <p className="text-sm text-[#9e9e9e] text-center py-2">No custom badges yet. Click "New Badge" to create one.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SuperAdminDashboard({ onNavigate }: SuperAdminDashboardProps) {

  // Live platform metrics
  const [metrics, setMetrics] = useState({ total: 0, shareholders: 0, ideas: 0 });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [{ count: total }, { count: shareholders }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'shareholder'),
        ]);
        let ideas = 0;
        try { const r = await supabase.from('ideas').select('*', { count: 'exact', head: true }); ideas = r.count ?? 0; } catch (ignore) {}
        setMetrics({ total: total ?? 0, shareholders: shareholders ?? 0, ideas: ideas ?? 0 });
      } catch (e) { console.warn('Dashboard metrics fetch failed', e); }
    }
    fetchMetrics();
  }, []);

  const [users,        setUsers]        = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [userSearch,   setUserSearch]   = useState('');
  const [pageSize,     setPageSize]     = useState(10);
  const [userPage,     setUserPage]     = useState(0);

  async function fetchUsers() {
    setUsersLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, created_at, onboarding_status')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setUsersLoading(false);
  }

  // Auto-load users on mount
  useEffect(() => { fetchUsers(); }, []);

  async function changeRole(userId: string, newRole: string) {
    setRoleChanging(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setRoleChanging(null);
  }

  const ROLES = ['user', 'shareholder', 'vep', 'mab', 'admin', 'super-admin', 'developer'];

  const filteredUsers = users.filter(u =>
    !userSearch ||
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );
  const pagedUsers = filteredUsers.slice(userPage * pageSize, (userPage + 1) * pageSize);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [meetingDateInputs, setMeetingDateInputs] = useState<Record<string, string>>({})

  const resetAllPasswords = async () => {
    setResetting(true); setResetMsg('');
    const users = [{"email": "lama@alziyad.me", "password": "i64AzbFcAd3!"}, {"email": "v@blackflame.ai", "password": "Q!cuG0NDnQXL"}, {"email": "wasim@moolapay.io", "password": "KC!!RdnkK9C1"}, {"email": "abdulrahman.m.ssaggaf@gmail.com", "password": "NAt1Litir@5S"}, {"email": "waheedm@mysrp.com", "password": "6wKgxiZ7cJ3!"}, {"email": "faten.matmati@weavelines.com", "password": "HTrlpj8V#b0#"}, {"email": "sk@raily.app", "password": "!zp176k0LZVZ"}, {"email": "mawaddh89@icloud.com", "password": "mw9CIZia9!vD"}, {"email": "rayan3rab@gmail.com", "password": "#$vYIh3jWdMX"}, {"email": "el7ommed@gmail.com", "password": "6W#@K28hKRMP"}, {"email": "abdulrahman@twaijri.fund", "password": "Q3EJu!x1O!He"}, {"email": "aasesman@alawaelsky.com", "password": "qG$sdxCaKIh6"}, {"email": "khalid@1kleaders.com", "password": "9wzbZaID$!50"}, {"email": "am@almahmood.net", "password": "7byhuPUrG@H6"}, {"email": "aminat@tripcel.com", "password": "KlGq7K#nxG8E"}, {"email": "ayshamohammed1808@gmail.com", "password": "N#C8nB7qvndX"}, {"email": "hasnainiftikhar100@gmail.com", "password": "$FgQ5Olv8RWk"}, {"email": "adelbabtain@gmail.com", "password": "13ANF#ujxEmt"}, {"email": "omarbabtain96@gmail.com", "password": "@3o0kb#RPxW3"}, {"email": "omarmmunawar@gmail.com", "password": "2#T$kO5d5MFT"}, {"email": "ammar@1kleaders.com", "password": "8JYz2m#0o3Q8"}, {"email": "arifkhlifa@yahoo.com", "password": "Uj8r@fk7Na0#"}, {"email": "esheikh.omar@gmail.com", "password": "BhPW@$rw3eqr"}, {"email": "k.s.altattan@gmail.com", "password": "0B@$P7wUd!XG"}, {"email": "salman.rajab@hotmail.com", "password": "Ea1JT6E9Xwn#"}, {"email": "alafalonzi@gmail.com", "password": "3TuavhI!g!TH"}, {"email": "mustafeez.aslm@gmail.com", "password": "#1wY1ka52ZGU"}, {"email": "algirdas@axiology.xyz", "password": "!93PWNdja5Le"}, {"email": "asad@lazywait.com", "password": "!OHm3W3C2o4H"}, {"email": "bedoorradhi@gmail.com", "password": "joIrOP#3iPo0"}, {"email": "ritesh@retechsolutions.co", "password": "g$upV7s75l1q"}, {"email": "nt@aimletc.com", "password": "52tJkn#$hPan"}, {"email": "eng.khalid.alaqeel@gmail.com", "password": "hr5QB3AwkLD$"}, {"email": "a@swatx.sa", "password": "E8R!wsHTE4Ki"}, {"email": "albarjasahmad@gmail.com", "password": "ZN5wOjr#cxyA"}, {"email": "amalanbaie@gmail.com", "password": "d!2lwdN@$g0r"}, {"email": "selvamtvs@gmail.com", "password": "UiPvb#77YAE8"}, {"email": "mkhairi70@hotmail.com", "password": "Cb0YMBYP#SB1"}, {"email": "maebellerose12@gmail.com", "password": "ENO6bI01fBW$"}, {"email": "hamidahrk@snrgx.com", "password": "na4H#2R3Y8mF"}, {"email": "mustapha.messaoudi@garanty.tn", "password": "f4U6OV#nAT0Z"}, {"email": "lukebodnar@yambodgroup.com", "password": "pA!OEL16rzZN"}, {"email": "talal@q8maps.com", "password": "!SAPB!AqL4SQ"}, {"email": "ahmad.bokhamseen.ee@gmail.com", "password": "c7$X6b2me1eN"}, {"email": "nasim@facileconsulting.com", "password": "rp$7#w0Pb2k7"}, {"email": "a.al.othman@hotmail.com", "password": "R0H!JjMDIBKu"}, {"email": "office@sagestai.com", "password": "OEzmVr7Dc$$0"}, {"email": "sahalq8@gmail.com", "password": "LyOSG9f#t086"}, {"email": "bfnls4@gmail.com", "password": "me#4w0m@5rPc"}, {"email": "ali.a.alshemali@gmail.com", "password": "0F@!1cuWa4Ke"}, {"email": "amir@pawsket.com", "password": "gF$Wty#8vCs3"}, {"email": "ahunovcpl@gmail.com", "password": "Sq4y6jHK$4F9"}, {"email": "rashad@beattheexpert.com", "password": "O9#cj#W25JWo"}, {"email": "o_al7raze@icloud.com", "password": "kO5kmc!7x0R2"}, {"email": "nawrashawary777@gmail.com", "password": "$!kPa7$mlGi6"}, {"email": "munther.alkhaja@gmail.com", "password": "psvERy6zQQX@"}, {"email": "ali98227643011@gmail.com", "password": "SJA23@!4bCkJ"}, {"email": "bahaanassar108@gmail.com", "password": "nXzSHPgQ20#H"}, {"email": "noornf2000@gmail.com", "password": "xx1cS#t3xUsW"}, {"email": "omarsalih1711@gmail.com", "password": "utho4TgZ@Hsr"}, {"email": "raadwalid.wazzan@outlook.com", "password": "vnIN3ol8KdS!"}, {"email": "dralielsayed95@gmail.com", "password": "Hpf6pz#3mIGF"}, {"email": "biotic504@gmail.com", "password": "$dn82axvN2@e"}, {"email": "alshomli16@gmail.com", "password": "JCxaGFw0cO#9"}, {"email": "xw5zzzz@gmail.com", "password": "5ko4bKI$vLhc"}, {"email": "yousefahmedgouda@gmail.com", "password": "U1kIuH8z@!S2"}, {"email": "azdineh@gmail.com", "password": "$L8bS42lpEWN"}, {"email": "hayssam.haeder@gmail.com", "password": "tSTg5XW5XS!q"}, {"email": "hajri7003@gmail.com", "password": "!u7aa1cR##!G"}, {"email": "bassamasmar@cuponationmx.com", "password": "zjA8$3iNyykZ"}, {"email": "help.evotech@gmail.com", "password": "5@SzTxs@YeGR"}, {"email": "leenaalbasha@yahoo.com", "password": "WaWri7BiP#F7"}, {"email": "h.11professional.dream@gmail.com", "password": "jT#r@nAwWnj8"}, {"email": "sabeehaisal@gmail.com", "password": "weGpA0$78QJ7"}, {"email": "mhmdashrfalzrd@gmail.com", "password": "M!NJh3VF321q"}, {"email": "abuhazem@yahoo.com", "password": "p5Z@Ix1lT8C4"}, {"email": "abduallahtabasha@gmail.com", "password": "DcqHS$IjJ5vw"}, {"email": "aissar.jubran@gmail.com", "password": "0tOpsAk$P#55"}, {"email": "mohamed.a.dawil@outlook.com", "password": "fZmTUh1$50jt"}, {"email": "hozaifaa92@gmail.com", "password": "MpjR@To7WgC0"}, {"email": "malkrfat03@gmail.com", "password": "$goKjoySwP7l"}, {"email": "y.abouyoucef@univ-alger.dz", "password": "wzJVD6zE2H!r"}, {"email": "chrisviolin@hotmail.com", "password": "Or8$Jp#bEC3@"}, {"email": "jan818438@gmail.com", "password": "EgVxkHI$60uT"}, {"email": "medbakhani@gmail.com", "password": "Zo0K!3mqn6Jb"}, {"email": "mejlaouibassam@gmail.com", "password": "9@5O7MLatl$K"}, {"email": "mahmoudalqaisi993@gmail.com", "password": "6AL1pv!1fzWb"}, {"email": "danialghadeer2003@gmail.com", "password": "Hf9UiLtMk@F$"}, {"email": "fatooma9@gmail.com", "password": "POm!s4o9!6Ss"}, {"email": "mujahid.a.ali.83@gmail.com", "password": "zri!S2EVwY1!"}, {"email": "horanih07@gmail.com", "password": "CbCYk7u6$H#3"}, {"email": "murad@cartqu.com", "password": "4$CAQjg1age8"}, {"email": "ibrahim.asaad.198@gmail.com", "password": "me3r@62rXwbD"}, {"email": "omar@edumize.com", "password": "onpRtT#fGJe8"}, {"email": "simossnasiri@gmail.com", "password": "MtLUa!e#i0cW"}, {"email": "md@ebizsols.co", "password": "#2AT2b2@Y4TP"}, {"email": "ahmadmnzlje92@gmail.com", "password": "HwN9A@241tox"}, {"email": "rffaress@gmail.com", "password": "zTG4TuDoos5!"}, {"email": "aboodhnoon38@gmail.com", "password": "TT7cevZtcqV$"}, {"email": "beebofakki@gmail.com", "password": "1AF@e4DQ7sQi"}, {"email": "phd.yarob.abdullah@gmail.com", "password": "zs4IW#C06Etg"}, {"email": "dilzarsh@gmail.com", "password": "ZSe2#twv#oQJ"}, {"email": "ahmad.hasan.hamoud@gmail.com", "password": "yu810uPt1G#b"}, {"email": "aliramlawi@giblox.com", "password": "N#dbFXCuO0I6"}, {"email": "aboelhijamohamed@gmail.com", "password": "i3RDFjV@W8j#"}, {"email": "infoajrli@gmail.com", "password": "EUk$Y30A3kVK"}, {"email": "rashdalamry30@gmail.com", "password": "xs$v0b@65laS"}, {"email": "harithpoiuylkjh@gmail.com", "password": "v5QK7D7v!l5H"}, {"email": "kaljamil90@gmail.com", "password": "PrtrFR4J0#Z!"}, {"email": "hamoudeh@live.dk", "password": "4Fyt83j!qhZ2"}, {"email": "uncle.osho@gmail.com", "password": "LUgebY@@Rk5i"}, {"email": "abdalrazaq1717@gmail.com", "password": "#kegeiNOE9o7"}, {"email": "abdulhaeealmasalmah156@gmail.com", "password": "!@uQ3r6zE!7n"}, {"email": "moustapha.docs@gmail.com", "password": "9$hS48wjOVrE"}, {"email": "robenedwan@gmail.com", "password": "t4VDgIhY@9cR"}, {"email": "bob.alshirqwi@gmail.com", "password": "Jk6$JCfF@13T"}, {"email": "moath.alshawabkah@gmail.com", "password": "7RENFn@WYkpv"}, {"email": "ahmed.khallab@gmail.com", "password": "uV!z7QbnU1v$"}, {"email": "gm@wazin.sa", "password": "!l6k4a6Zo$wH"}, {"email": "qader.gvmarketing@gmail.com", "password": "GqBGSXao1!eV"}, {"email": "elhassanali36@gmail.com", "password": "xztV1N8S#!Bj"}, {"email": "info@flashexpo.net", "password": "wz6@3FrLO@!C"}, {"email": "walidbenhissen24@gmail.com", "password": "X#WzXnIam#n1"}, {"email": "abogafarali676@gmail.com", "password": "6KvzzHN@IinX"}, {"email": "kmutairi320@gmail.com", "password": "6b!vS5UTU9E6"}, {"email": "daouriam@gmail.com", "password": "YjV!X0gSkcRQ"}, {"email": "krkaz840@gmail.com", "password": "!59yjkGF!RQ9"}, {"email": "ikhonezy@gmail.com", "password": "C$dFUQa5KfB#"}, {"email": "alsamrriaahmed@gmail.com", "password": "qt5!bQU22k6E"}, {"email": "zeinahanto27@gmail.com", "password": "NrR7RW#DwhMy"}, {"email": "chaabaniwael6@gmail.com", "password": "V@I$aVowpBG3"}, {"email": "jordan2020ao@gmail.com", "password": "xC80FvRPVr$G"}, {"email": "numediatravel@gmail.com", "password": "iha8JR#1gtGl"}, {"email": "ez.meshal@outlook.sa", "password": "EX9tf5PvoD#4"}, {"email": "wael.alramouni@gmail.com", "password": "h5koO@4NyW1q"}, {"email": "reemabdulsattar97@gmail.com", "password": "HT@MX945XzXK"}, {"email": "dryoussefelsayedsalah@gmail.com", "password": "3@$!zZf4YfaE"}, {"email": "aymnally35@gmail.com", "password": "w6@2C67C82Wm"}, {"email": "jubouriali764@gmail.com", "password": "ZE#KOOFU4@ux"}, {"email": "odaisqour.88@gmail.com", "password": "Gz!@9mYBYaaJ"}, {"email": "mashhourinvention@gmail.com", "password": "Y5rY5uH@BtG3"}, {"email": "saeed1m9m5@gmail.com", "password": "Rj6RDj6$4t68"}, {"email": "jamalbarazi815@gmail.com", "password": "X5MG#6fu#p@t"}, {"email": "simonksipeasil9@gmail.com", "password": "uMkMd7!#$JRa"}, {"email": "saifabood99@icloud.com", "password": "8083$KchpW!S"}, {"email": "omarhassid12@gmail.com", "password": "dYLIc5XE2LF$"}, {"email": "monzer.alradi@gmail.com", "password": "w2@0i1!pEBsJ"}, {"email": "redha.alayesh@gmail.com", "password": "cWs#oo6nvPDK"}, {"email": "hballout@limestonelab.com", "password": "Z6gSb#tvCSaU"}, {"email": "fadhellmahdii@gmail.com", "password": "t5@sa#kLCVQK"}, {"email": "arif@1kleaders.com", "password": "#t3Skcoz#Gvh"}, {"email": "bawazir2@gmail.com", "password": "12eTsk83LIt@"}, {"email": "anas.alyusuf.bh@gmail.com", "password": "!8KEI71IPKds"}, {"email": "anish@mc2hr.com", "password": "KzYnbcb4#CN5"}, {"email": "maha.mohd.iqbal@gmail.com", "password": "@9KSettD4H8a"}, {"email": "mohammed.janahi14@gmail.com", "password": "W@J1kmDYJkC8"}, {"email": "ammarbaamer@gmail.com", "password": "EB@@@4W03sy0"}, {"email": "fouz.aljoufi@1kleaders.com", "password": "2gNrtzin@j54"}, {"email": "yogesh.patil@1kleaders.com", "password": "G#vH5B2#X8Yn"}, {"email": "nader.marwan@gmail.com", "password": "HPk#Qg52N2j9"}, {"email": "g.alsulaiman@alsulaimangroup.com", "password": "hI2#!knvDzpj"}, {"email": "maysara.hammouda@predictiva.co.uk", "password": "EwK1P9tlt!ZL"}, {"email": "ezzat.alzurba@gmail.com", "password": "#@HvD6tha0e3"}, {"email": "hr.anmargallery@gmail.com", "password": "3#@F#QD49j5u"}, {"email": "talha.bakhsh@gmail.com", "password": "6LxV1!1ldON6"}, {"email": "mons11188@gmail.com", "password": "e6@@eVHlvU#0"}, {"email": "fahad.bakhsh@gmail.com", "password": "3D9L!j8u6ckV"}, {"email": "creative.inspirekw@gmail.com", "password": "yNhIR8OZtx#C"}, {"email": "kubra.mirza@1kleaders.com", "password": "ckP@x9dd83Gt"}, {"email": "bader.ebrahim90@gmail.com", "password": "kvH@BiNed9#Y"}, {"email": "elfouly90@hotmail.com", "password": "Q#wwLTW2bjVF"}, {"email": "mai.alhayki@1kleaders.com", "password": "@VwU8N491s9d"}, {"email": "abdullah.basaad@ymail.com", "password": "X30O7!MCeYzJ"}];
    try {
      const res = await fetch('/api/admin/reset-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: process.env.NEXT_PUBLIC_CRON_SECRET, users }),
      });
      const data = await res.json();
      const errSample = data.errors?.slice(0,3).join(' | ') ?? '';
      setResetMsg(data.error ? `❌ ${data.error}` : `✓ Recreated ${data.recreated ?? 0} accounts, ${data.failed} failed${errSample ? ': ' + errSample : ''}`);
    } catch (e: any) {
      setResetMsg(`❌ ${e.message}`);
    }
    setResetting(false);
    setTimeout(() => setResetMsg(''), 10000);
  };

  const fetchWaitlist = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('waitlist_submissions')
      .select('id, created_at, first_name, last_name, email, org_name, leader_profiles, status, admin_notes, meeting_date')
      .in('status', ['pending', 'meeting-scheduled', 'more-info-required', 'parked'])
      .order('created_at', { ascending: false })

    if (error) {
      setError('Failed to load waitlist. Check Supabase connection.')
      console.error(error)
    } else {
      setWaitlist(data as WaitlistRow[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchWaitlist() }, [])

  const updateStatus = async (id: string, status: WaitlistRow['status'], extra: Record<string, unknown> = {}) => {
    setUpdating(id)
    const { error } = await supabase
      .from('waitlist_submissions')
      .update({ status, reviewed_at: new Date().toISOString(), ...extra })
      .eq('id', id)
    if (!error) {
      setWaitlist(prev => prev.map(r => r.id === id ? { ...r, status, ...extra } : r))
    }
    setUpdating(null)
  }

  const scheduleMeeting = async (id: string) => {
    const date = meetingDateInputs[id];
    const row = waitlist.find(r => r.id === id);
    if (!row) return;

    // Update waitlist status
    await updateStatus(id, 'meeting-scheduled', { meeting_date: date || null });

    // Create Teams meeting if date is set
    if (date) {
      try {
        const startDT = new Date(date).toISOString();
        const res = await fetch('/api/teams/create-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:          `1KL Intro Meeting — ${row.first_name} ${row.last_name}`,
            start_datetime: startDT,
            description:    `Introductory meeting with ${row.first_name} ${row.last_name} (${row.email}) — ${row.org_name ?? ''}`,
            invitee_emails: [row.email],
          }),
        });
        const data = await res.json();
        if (data.join_url) {
          // Save meeting to calendar
          await supabase.from('calendar_events').insert({
            title:          `Intro Meeting — ${row.first_name} ${row.last_name}`,
            date:           date.slice(0, 10),
            time:           date.slice(11, 16) || '12:00',
            type:           'meeting',
            location:       'Microsoft Teams',
            description:    `Introductory meeting with ${row.email}`,
            teams_join_url: data.join_url,
            teams_event_id: data.meeting_id,
          });
          alert(`✓ Teams meeting created and invite sent to ${row.email}`);
        }
      } catch (e) {
        console.error('Teams meeting creation failed:', e);
        alert('Meeting scheduled but Teams invite failed — please create manually.');
      }
    }
  }

  const [inviting, setInviting] = useState<string | null>(null)
  const [approvalRoles, setApprovalRoles] = useState<Record<string, string>>({})
  const [resetting,     setResetting]     = useState(false)
  const [resetMsg,      setResetMsg]      = useState('')

  const approveAndInvite = async (row: WaitlistRow) => {
    if (row.status === 'approved') {
      alert('This user has already been approved.');
      return;
    }
    setInviting(row.id);
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:       row.email,
          first_name:  row.first_name,
          last_name:   row.last_name,
          role:        approvalRoles[row.id] ?? 'shareholder',
          waitlist_id: row.id,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.error?.includes('already') || json.error?.includes('exists')) {
          await supabase.from('waitlist_submissions').update({ status: 'approved' }).eq('id', row.id);
          setWaitlist(prev => prev.filter(r => r.id !== row.id));
        } else {
          alert(`Invite failed: ${json.error}`);
          setInviting(null);
          return;
        }
      } else {
        setWaitlist(prev => prev.filter(r => r.id !== row.id));
      }

      // Send DocuSign agreement automatically
      try {
        const dsRes = await fetch('/api/docusign/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_email: row.email,
            recipient_name:  `${row.first_name} ${row.last_name}`,
          }),
        });
        const dsData = await dsRes.json();
        if (!dsRes.ok) {
          console.warn('DocuSign send failed:', dsData.error);
          alert(`✓ Approved and welcome email sent. Note: DocuSign agreement could not be sent automatically — ${dsData.error}`);
        }
      } catch (e) {
        console.warn('DocuSign send error:', e);
      }
    } catch (e) {
      alert('Network error — could not send invite.');
    }
    setInviting(null);
  };

  const markApproved = async (row: WaitlistRow) => {
    await supabase.from('waitlist_submissions').update({ status: 'approved' }).eq('id', row.id);
    setWaitlist(prev => prev.filter(r => r.id !== row.id));
  };

  const undoDecision = (id: string) => updateStatus(id, 'meeting-scheduled')

  const pendingCount = waitlist.filter(r => r.status === 'pending').length
  const meetingCount = waitlist.filter(r => r.status === 'meeting-scheduled').length

  const statusStyle = (status: WaitlistRow['status']) => {
    if (status === 'approved')          return 'bg-emerald-50 border-emerald-200'
    if (status === 'rejected')          return 'bg-red-50 border-red-200'
    if (status === 'parked')            return 'bg-stone-50 border-stone-200'
    if (status === 'meeting-scheduled') return 'bg-blue-50 border-blue-200'
    return 'bg-amber-50 border-amber-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Super Admin Dashboard</h1>
          <p className="text-stone-500 text-sm">Platform-wide management and monitoring</p>
        </div>
        <Badge className="bg-red-100 text-red-700 text-sm px-3 py-1">
          <Shield className="w-3.5 h-3.5 mr-1" /> Super Admin Access
        </Badge>
      </div>

      {/* Live Platform Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Users',     value: metrics.total,        icon: Users,     bg: 'bg-emerald-100', fg: 'text-emerald-600' },
          { title: 'Shareholders',    value: metrics.shareholders, icon: Shield,    bg: 'bg-amber-100',   fg: 'text-amber-600' },
          { title: 'Ideas Submitted', value: metrics.ideas,        icon: Lightbulb, bg: 'bg-blue-100',    fg: 'text-blue-600' },
          { title: 'System Health',   value: '99.9%',              icon: Activity,  bg: 'bg-emerald-100', fg: 'text-emerald-600' },
        ].map(m => (
          <Card key={m.title} className="border-stone-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-stone-500 mb-1">{m.title}</p>
                  <p className="text-2xl font-bold text-stone-900">{m.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.bg}`}>
                  <m.icon className={`w-5 h-5 ${m.fg}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Waitlist Review Queue — live from Supabase */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-stone-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#e33b5f]" /> Waitlist Review Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              {!loading && pendingCount > 0 && <Badge className="bg-amber-100 text-amber-700">{pendingCount} Pending</Badge>}
              {!loading && meetingCount > 0 && <Badge className="bg-blue-100 text-blue-700">{meetingCount} Meeting Scheduled</Badge>}
              <Button size="sm" variant="outline" onClick={fetchWaitlist} disabled={loading} className="h-7 px-2">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}
          {loading && !error && (
            <div className="flex items-center justify-center py-8 gap-2 text-[#7e7e7e]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading submissions...
            </div>
          )}
          {!loading && !error && waitlist.length === 0 && (
            <p className="text-sm text-[#7e7e7e] text-center py-8">No waitlist submissions yet.</p>
          )}
          {!loading && !error && waitlist.length > 0 && (
            <div className="space-y-3">
              {waitlist.map(row => (
                <div key={row.id} className={`p-3 rounded-lg border transition ${statusStyle(row.status)}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-stone-900">{row.first_name} {row.last_name}</p>
                        {row.status === 'pending'            && <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Pending</Badge>}
                        {row.status === 'meeting-scheduled'  && <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1"><Rocket className="w-2.5 h-2.5" /> Meeting Scheduled{row.meeting_date ? ` — ${new Date(row.meeting_date).toLocaleDateString()}` : ''}</Badge>}
                        {row.status === 'approved'           && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Approved</Badge>}
                        {row.status === 'rejected'           && <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>}
                        {row.status === 'parked'             && <Badge className="bg-stone-100 text-stone-600 text-xs">Parked — awaiting more info</Badge>}
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        {row.email} · {row.org_name} · {row.leader_profiles?.join(', ')} · {new Date(row.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* STEP 1: Pending → Schedule Meeting */}
                    {row.status === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="datetime-local"
                          className="text-xs border border-stone-200 rounded px-2 py-1 h-8"
                          value={meetingDateInputs[row.id] || ''}
                          onChange={e => setMeetingDateInputs(prev => ({ ...prev, [row.id]: e.target.value }))}
                        />
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                          disabled={updating === row.id} onClick={() => scheduleMeeting(row.id)}>
                          {updating === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Rocket className="w-3.5 h-3.5 mr-1" />Schedule Meeting</>}
                        </Button>
                      </div>
                    )}

                    {/* STEP 2: Meeting Scheduled → Approve / Reject / Park */}
                    {row.status === 'meeting-scheduled' && (
                      <div className="flex gap-2 flex-shrink-0 flex-wrap">
                        <select
                          value={approvalRoles[row.id] ?? 'shareholder'}
                          onChange={e => setApprovalRoles(prev => ({ ...prev, [row.id]: e.target.value }))}
                          className="text-xs border border-[#e8e8e8] rounded-lg px-2 py-1.5 bg-white h-8 focus:outline-none focus:border-emerald-400">
                          <option value="user">User</option>
                          <option value="shareholder">Shareholder</option>
                          <option value="vep">VEP</option>
                          <option value="mab">MAB</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          disabled={updating === row.id || inviting === row.id}
                          onClick={() => approveAndInvite(row)}>
                          {inviting === row.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Inviting...</> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve & Invite</>}
                        </Button>
                        <Button size="sm" variant="outline" className="border-stone-300 text-stone-600 h-8"
                          disabled={updating === row.id} onClick={() => updateStatus(row.id, 'parked')}>
                          Park
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 h-8"
                          disabled={updating === row.id} onClick={() => updateStatus(row.id, 'rejected')}>
                          <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                        </Button>
                      </div>
                    )}

                    {/* Post-decision: Send Agreement (approved only) + Undo */}
                    {(row.status === 'approved' || row.status === 'rejected' || row.status === 'parked') && (
                      <div className="flex gap-2 flex-shrink-0">
                        {row.status === 'approved' && (
                          <SendAgreementButton
                            row={row}
                            onSent={() => setWaitlist(prev => prev.map(r => r.id === row.id ? { ...r, status: 'approved' as const } : r))}
                          />
                        )}
                        <Button size="sm" variant="outline" className="h-8 text-xs border-stone-300 text-stone-500 flex-shrink-0"
                          disabled={updating === row.id} onClick={() => undoDecision(row.id)}>
                          {updating === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '↩ Undo'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Parked note */}
                  {row.status === 'parked' && (
                    <p className="text-xs text-stone-500 mt-2 pl-1">
                      📋 Parked applicants are held pending additional information or a future cohort. They will not receive platform access until approved.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Onboarding Tracker',  icon: Users,      desc: 'Track partner onboarding',  color: 'emerald', page: 'onboarding-tracker' },
          { title: 'Fellowship Apps',      icon: GraduationCap, desc: 'Review applications',    color: 'stone',   page: 'fellowship-applications' },
          { title: 'Contribution Tracker', icon: Award,      desc: 'Partner contributions',      color: 'amber',   page: 'contributions' },
          { title: 'Idea Pipeline',        icon: Lightbulb,  desc: 'Review submissions',         color: 'emerald', page: 'idea-ranking' },
        ].map((item, idx) => (
          <Card key={idx} className="border-stone-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate(item.page)}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                item.color === 'emerald' ? 'bg-emerald-100' : item.color === 'amber' ? 'bg-amber-100' : 'bg-stone-100'
              }`}>
                <item.icon className={`w-5 h-5 ${
                  item.color === 'emerald' ? 'text-emerald-600' : item.color === 'amber' ? 'text-amber-600' : 'text-stone-600'
                }`} />
              </div>
              <p className="font-semibold text-stone-900 text-sm">{item.title}</p>
              <p className="text-xs text-stone-500">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-stone-900">Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminUserList />
          </CardContent>
        </Card>

        {/* Recent Admin Actions */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-stone-900">Admin Action Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminActionLog />
          </CardContent>
        </Card>
      </div>

      {/* Platform Analytics Placeholder */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-900">Platform Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex flex-col items-center justify-center">
              <BarChart3 className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-sm text-emerald-600 font-medium">User Growth</p>
              <p className="text-2xl font-bold text-emerald-800">+156</p>
              <p className="text-xs text-emerald-500">This month</p>
            </div>
            <div className="h-48 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex flex-col items-center justify-center">
              <DollarSign className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-sm text-amber-600 font-medium">Revenue</p>
              <p className="text-2xl font-bold text-amber-800">$412K</p>
              <p className="text-xs text-amber-500">This quarter</p>
            </div>
            <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex flex-col items-center justify-center">
              <Cpu className="w-10 h-10 text-blue-400 mb-2" />
              <p className="text-sm text-blue-600 font-medium">System Status</p>
              <p className="text-2xl font-bold text-blue-800">Healthy</p>
              <p className="text-xs text-blue-500">Uptime: 99.9%</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* User Role Management */}
      <Card className="border-[#f0f0f0]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg text-[#222] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#e33b5f]" /> User Role Management
              </CardTitle>
              <p className="text-sm text-[#7e7e7e] mt-0.5">Change roles for any platform user</p>
            </div>
            <Button size="sm" variant="outline" onClick={fetchUsers} disabled={usersLoading}>
              <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
              <Input placeholder="Search by name or email..." className="pl-9 border-[#f0f0f0]"
                value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(0); }} />
            </div>
          )}
          {usersLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-[#9e9e9e]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-6 gap-2 text-[#9e9e9e]">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-[#9e9e9e] text-center py-4">No users match your search</p>
          ) : (
            <div className="border border-[#f0f0f0] rounded-xl overflow-hidden">
              {pagedUsers.map((u, i) => (
                <div key={u.id} className={`flex items-center gap-4 px-4 py-3 ${i < filteredUsers.length - 1 ? 'border-b border-[#f0f0f0]' : ''} hover:bg-[#fafafa] transition`}>
                  <div className="w-8 h-8 rounded-full bg-[#e33b5f]/10 flex items-center justify-center text-xs font-bold text-[#e33b5f] flex-shrink-0">
                    {(u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '') || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#222] truncate">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-[#9e9e9e] truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={u.role ?? 'user'}
                      onChange={e => changeRole(u.id, e.target.value)}
                      disabled={roleChanging === u.id}
                      className="text-xs border border-[#f0f0f0] rounded-lg px-2 py-1.5 bg-white text-[#222] focus:outline-none focus:border-[#e33b5f]/50 cursor-pointer">
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {roleChanging === u.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9e9e9e]" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination controls */}
          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
              <div className="flex items-center gap-2 text-sm text-[#9e9e9e]">
                <span>Show</span>
                {[10, 25, 50, 100].map(n => (
                  <button key={n} onClick={() => { setPageSize(n); setUserPage(0); }}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition ${pageSize === n ? 'bg-[#e33b5f] text-white' : 'bg-[#f0f0f0] hover:bg-[#e8e8e8] text-[#555353]'}`}>
                    {n}
                  </button>
                ))}
                <span>of {filteredUsers.length} users</span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setUserPage(p => Math.max(0, p - 1))} disabled={userPage === 0}
                    className="px-2 py-1 text-xs border border-[#f0f0f0] rounded hover:bg-[#f0f0f0] disabled:opacity-30">←</button>
                  <span className="text-xs text-[#9e9e9e] px-2">{userPage + 1} / {totalPages}</span>
                  <button onClick={() => setUserPage(p => Math.min(totalPages - 1, p + 1))} disabled={userPage >= totalPages - 1}
                    className="px-2 py-1 text-xs border border-[#f0f0f0] rounded hover:bg-[#f0f0f0] disabled:opacity-30">→</button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Moderation */}
      <ModerationPanel />

      {/* One-time password reset tool */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-amber-800 text-sm">🔐 Reset All Imported Passwords</p>
            <p className="text-xs text-amber-600 mt-0.5">Use this once to fix login issues for all 173 imported users</p>
            {resetMsg && <p className={`text-xs mt-1 font-medium ${resetMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{resetMsg}</p>}
          </div>
          <Button onClick={resetAllPasswords} disabled={resetting}
            className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0">
            {resetting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : 'Reset All Passwords'}
          </Button>
        </CardContent>
      </Card>

      {/* New Badge Creator — Super Admin only */}
      <NewBadgeCreator isSuperAdmin={true} />

    </div>
  )


// ── Admin User List (inline in dashboard) ─────────────────────
function AdminUserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles')
      .select('id, first_name, last_name, email, role, created_at, onboarding_status, last_seen')
      .order('last_seen', { ascending: false, nullsFirst: false })
      .limit(8)
      .then(({ data }) => { setUsers(data ?? []); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center py-8 gap-2 text-[#9e9e9e]"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading...</span></div>;
  if (!users.length) return <div className="py-8 text-center text-sm text-[#9e9e9e]">No users found</div>;

  const roleColor: Record<string, string> = {
    'super-admin': 'bg-red-100 text-red-700',
    'admin':       'bg-amber-100 text-amber-700',
    'developer':   'bg-purple-100 text-purple-700',
    'vep':         'bg-blue-100 text-blue-700',
    'mab':         'bg-indigo-100 text-indigo-700',
    'shareholder': 'bg-emerald-100 text-emerald-700',
    'user':        'bg-stone-100 text-stone-600',
  };

  return (
    <div>
      {users.map((u, i) => (
        <div key={u.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < users.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-[#e33b5f]/10 flex items-center justify-center text-xs font-bold text-[#e33b5f] flex-shrink-0">
            {(u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '') || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#222] truncate">{u.first_name} {u.last_name}</p>
            <p className="text-xs text-[#9e9e9e] truncate">{u.email}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColor[u.role] ?? roleColor.user}`}>{u.role}</span>
        </div>
      ))}
    </div>
  );
}

// ── Admin Action Log ───────────────────────────────────────────
function AdminActionLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pull recent activity from multiple tables as a unified log
    Promise.allSettled([
      supabase.from('profiles').select('id, first_name, last_name, email, created_at, role').order('created_at', { ascending: false }).limit(5),
      supabase.from('ideas').select('id, title, submitted_by, created_at, status').order('created_at', { ascending: false }).limit(5),
      supabase.from('waitlist_submissions').select('id, first_name, last_name, email, created_at, status').order('created_at', { ascending: false }).limit(5),
    ]).then(([profilesRes, ideasRes, waitlistRes]) => {
      const profiles = profilesRes.status === 'fulfilled' ? profilesRes.value.data ?? [] : [];
      const ideas    = ideasRes.status    === 'fulfilled' ? ideasRes.value.data    ?? [] : [];
      const waitlist = waitlistRes.status === 'fulfilled' ? waitlistRes.value.data ?? [] : [];

      const entries = [
        ...profiles.map((p: any) => ({ icon: '👤', time: p.created_at, text: `${p.first_name} ${p.last_name} joined as ${p.role}` })),
        ...ideas.map((i: any)    => ({ icon: '💡', time: i.created_at, text: `New idea submitted: "${i.title}"` })),
        ...waitlist.map((w: any) => ({ icon: '📋', time: w.created_at, text: `${w.first_name} ${w.last_name} applied (${w.status})` })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      setLogs(entries);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center py-8 gap-2 text-[#9e9e9e]"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  if (!logs.length) return <div className="py-8 text-center text-sm text-[#9e9e9e]">No activity yet</div>;

  return (
    <div>
      {logs.map((log, i) => (
        <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${i < logs.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}>
          <span className="text-base flex-shrink-0 mt-0.5">{log.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#333] leading-relaxed">{log.text}</p>
            <p className="text-[10px] text-[#9e9e9e] mt-0.5">{new Date(log.time).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

}