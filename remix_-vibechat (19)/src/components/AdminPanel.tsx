import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  VipPaymentInvoice, 
  Report, 
  PlatformConfig, 
  SystemStats 
} from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Users, 
  Sparkles, 
  DollarSign, 
  FileText, 
  Settings, 
  Upload, 
  Trash2, 
  ShieldAlert, 
  Check, 
  X, 
  TrendingUp, 
  Search,
  CheckCircle,
  FileSpreadsheet,
  Clock,
  Activity
} from 'lucide-react';

interface AdminPanelProps {
  theme: string;
  onBack: () => void;
  onChatAsAdmin?: () => void;
  token: string;
}

export default function AdminPanel({ onBack, onChatAsAdmin, token, theme }: AdminPanelProps) {
  // Tabs: 'users' | 'payments' | 'approved_vips' | 'reports' | 'content' | 'stats' | 'verifications'
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'approved_vips' | 'reports' | 'content' | 'stats' | 'verifications'>('users');

  const mockChartData = [
    { time: '00:00', login: Math.floor(Math.random() * 50) + 20, logout: Math.floor(Math.random() * 30) + 10 },
    { time: '04:00', login: Math.floor(Math.random() * 50) + 10, logout: Math.floor(Math.random() * 30) + 5 },
    { time: '08:00', login: Math.floor(Math.random() * 100) + 40, logout: Math.floor(Math.random() * 50) + 20 },
    { time: '12:00', login: Math.floor(Math.random() * 200) + 120, logout: Math.floor(Math.random() * 100) + 80 },
    { time: '16:00', login: Math.floor(Math.random() * 250) + 180, logout: Math.floor(Math.random() * 150) + 100 },
    { time: '20:00', login: Math.floor(Math.random() * 300) + 250, logout: Math.floor(Math.random() * 150) + 120 },
    { time: '23:59', login: Math.floor(Math.random() * 150) + 80, logout: Math.floor(Math.random() * 80) + 40 },
  ];
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<VipPaymentInvoice[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [vipPlans, setVipPlans] = useState<any[]>([]);

  // Filters/Searches
  const [searchUser, setSearchUser] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [qrFile, setQrFile] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Manual VIP Grant Field
  const [grantDays, setGrantDays] = useState<Record<string, number>>({});
  const [inspectingVerificationPhoto, setInspectingVerificationPhoto] = useState<{userId: string, pic: string} | null>(null);

  // Admin comprehensive user profiling override states
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<{
    id: string;
    username: string;
    bio: string;
    gender: 'Male' | 'Female' | 'Other';
    age: number;
    city: string;
    state: string;
    country: string;
    type: string;
    profilePic: string;
    isBanned: boolean;
  } | null>(null);

  useEffect(() => {
    if (editingUser) {
      setEditForm({
        id: editingUser.id,
        username: editingUser.username || '',
        bio: editingUser.bio || '',
        gender: (editingUser.gender as any) || 'Other',
        age: Number(editingUser.age) || 18,
        city: editingUser.city || '',
        state: editingUser.state || '',
        country: editingUser.country || '',
        type: editingUser.type || 'Registered',
        profilePic: editingUser.profilePic || '',
        isBanned: !!editingUser.isBanned,
      });
    } else {
      setEditForm(null);
    }
  }, [editingUser]);

  const handleAdminAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (editForm) {
        setEditForm({ ...editForm, profilePic: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUserFromAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    const bioWords = editForm.bio.trim().split(/\s+/).filter(w => w.length > 0);
    if (bioWords.length > 50) {
      showStatus('Bio cannot exceed 50 words.', true);
      return;
    }

    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: editForm.id,
          username: editForm.username,
          bio: editForm.bio,
          gender: editForm.gender,
          age: editForm.age,
          city: editForm.city,
          state: editForm.state,
          country: editForm.country,
          profilePic: editForm.profilePic,
          type: editForm.type,
          isBanned: editForm.isBanned
        })
      });

      if (res.ok) {
        showStatus('User profile updated successfully via Admin Override!');
        // Update local users array
        setUsers(users.map(u => u.id === editForm.id ? { 
          ...u, 
          username: editForm.username,
          bio: editForm.bio,
          gender: editForm.gender,
          age: editForm.age,
          city: editForm.city,
          state: editForm.state,
          country: editForm.country,
          profilePic: editForm.profilePic,
          type: editForm.type,
          isBanned: editForm.isBanned
        } : u));
        setEditingUser(null);
      } else {
        const err = await res.json();
        showStatus(err.error || 'Failed to update user profile via Admin override.', true);
      }
    } catch (err) {
      console.error(err);
      showStatus('Network error occurred during Admin profile override.', true);
    }
  };

  const showStatus = (text: string, isError: boolean = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      // Fetch stats for general context
      const statsRes = await fetch('/api/stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else if (activeTab === 'payments' || activeTab === 'approved_vips') {
        const res = await fetch('/api/admin/payments', { headers });
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      } else if (activeTab === 'reports') {
        const res = await fetch('/api/admin/reports', { headers });
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } else if (activeTab === 'content') {
        const res = await fetch('/api/admin/config', { headers });
        const data = await res.json();
        setConfig(data);

        // Fetch companion plans
        const resP = await fetch('/api/vip/plans');
        const dataP = await resP.json();
        setVipPlans(Array.isArray(dataP) ? dataP : []);
      }
    } catch (e) {
      console.error(e);
      showStatus('Failed to load administrative modules', true);
    } finally {
      setLoading(false);
    }
  };

  // BAN / UNBAN
  const handleToggleBan = async (userId: string, isAlreadyBanned: boolean) => {
    try {
      const res = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ban: !isAlreadyBanned })
      });
      if (res.ok) {
        showStatus(isAlreadyBanned ? 'User successfully unbanned' : 'User successfully banned');
        setUsers(users.map(u => u.id === userId ? { ...u, isBanned: !isAlreadyBanned } : u));
      } else {
        showStatus('Failed to modify ban state', true);
      }
    } catch (e) {
      showStatus('Server connection error', true);
    }
  };

  // DELETE USER
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you absolutely sure you want to permadelete this user? All their history, transactions, and reports will be purged.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showStatus('User successfully deleted');
        setUsers(users.filter(u => u.id !== userId));
      } else {
        showStatus('Failed to purge user', true);
      }
    } catch (e) {
      showStatus('Server connection error', true);
    }
  };

  // GRANT VIP MANUALLY
  const handleGrantVIP = async (userId: string) => {
    const days = grantDays[userId] || 30;
    try {
      const res = await fetch('/api/admin/users/grant-vip', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, days })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        showStatus(`Royal VIP granted for ${days} days!`);
        setUsers(users.map(u => u.id === userId ? updatedUser : u));
      } else {
        showStatus('Manual grant failed', true);
      }
    } catch (e) {
      showStatus('Connection failure', true);
    }
  };

  // REMOVE VIP
  const handleRemoveVIP = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/remove-vip', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        showStatus('VIP status successfully revoked');
        setUsers(users.map(u => u.id === userId ? updatedUser : u));
      } else {
        showStatus('Failed to revoke status', true);
      }
    } catch (e) {
      showStatus('Connection failure', true);
    }
  };

  // PROMOTE MODERATOR
  const handlePromoteMod = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/promote-mod', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        showStatus('User promoted to Moderator');
        fetchAdminData();
      } else {
        showStatus('Failed to promote user', true);
      }
    } catch (e) {
      showStatus('Connection failure', true);
    }
  };

  // DEMOTE MODERATOR
  const handleDemoteMod = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/demote-mod', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        showStatus('Moderator status revoked');
        fetchAdminData();
      } else {
        showStatus('Failed to demote user', true);
      }
    } catch (e) {
      showStatus('Connection failure', true);
    }
  };

  // VERIFY / REVIEW PAYMENTS
  const handleReviewPayment = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch('/api/admin/payments/review', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        showStatus(`Payment successfully ${status.toLowerCase()}`);
        setPayments(payments.map(p => p.id === id ? { ...p, status } : p));
        // Update general stats
        const statsRes = await fetch('/api/stats');
        setStats(await statsRes.json());
      } else {
        showStatus('Review processing failed', true);
      }
    } catch (e) {
      showStatus('Connection failure', true);
    }
  };

  const handleVerifyPhoto = async (userId: string, approve: boolean) => {
    try {
      const res = await fetch('/api/admin/verify-photo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve })
      });
      if (res.ok) {
        showStatus(approve ? 'Photo successfully verified' : 'Photo verification rejected');
        fetchAdminData();
        setInspectingVerificationPhoto(null);
      } else {
        showStatus('Failed to process photo', true);
      }
    } catch (e) {
      showStatus('Connection failure', true);
    }
  };

  // RESOLVE COMPLAINT/REPORT
  const handleResolveReport = async (reportId: string) => {
    try {
      const res = await fetch('/api/admin/reports/resolve', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      });
      if (res.ok) {
        showStatus('Complaint marked as resolved');
        setReports(reports.map(r => r.id === reportId ? { ...r, status: 'Resolved' } : r));
      } else {
        showStatus('Failed to resolve report', true);
      }
    } catch (e) {
      showStatus('Server connection error', true);
    }
  };

  // UPDATE CONFIG SETTINGS
  const handleUpdateConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!config) return;

    try {
      const payload = { ...config };
      if (qrFile) {
        payload.qrCodeUrl = qrFile;
      }

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showStatus('Platform configuration successfully updated!');
        setQrFile('');
      } else {
        showStatus('Failed to save config edits', true);
      }
    } catch (e) {
      showStatus('Connection failed', true);
    }
  };

  const handleUpdatePlans = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanPlans = vipPlans.map(p => ({
        ...p,
        price: Number(p.price) || 0,
        days: Number(p.days) || 0,
      }));
      const res = await fetch('/api/admin/vip/plans', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: cleanPlans })
      });
      if (res.ok) {
        showStatus('VIP plan custom prices and terms updated successfully!');
      } else {
        showStatus('Failed to update platform VIP plans', true);
      }
    } catch (e) {
      showStatus('Connection fault updating packages', true);
    }
  };

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setQrFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.id.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="w-full flex-1 overflow-y-auto max-w-7xl mx-auto px-4 py-8">
      
      {/* Header and status alerts */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-bold font-display tracking-tight flex items-center gap-2 ${theme === "light" ? "text-slate-900" : "text-white"}`}>
            <span className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/20">🛡️</span>
            VibeChat Admin Center
          </h1>
          <p className={`text-xs mt-1 ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>Configure platform constraints, moderate members, and review billing invoices</p>
        </div>
        <div className="flex gap-2">
          {onChatAsAdmin && (
            <button
              onClick={onChatAsAdmin}
              className="px-4 py-2 rounded-xl transition font-medium text-xs cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2"
            >
              Chat as Admin
            </button>
          )}
          <button
            onClick={onBack}
            className={`px-4 py-2 rounded-xl border transition font-medium text-xs cursor-pointer ${theme === "light" ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900" : "bg-slate-800 hover:bg-slate-700 border-slate-700/50 text-stone-300 hover:text-white"}`}
          >
            Exit Control Center
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 mb-6 rounded-xl border text-sm font-semibold transition animate-fade-in ${
          statusMsg.isError 
            ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' 
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* Bento Grid Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 font-medium text-xs font-display flex-1">Online Users</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          </div>
          <p className={`text-3xl font-bold font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}>{stats?.totalOnline || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 font-medium text-xs font-display flex-1">Total Users</span>
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
          </div>
          <p className={`text-3xl font-bold font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}>{stats?.totalUsers || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 font-medium text-xs font-display flex-1">VIP Users</span>
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          </div>
          <p className="text-3xl font-bold text-violet-400 font-display">{stats?.totalVIPs || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 font-medium text-[10px] font-display flex-1">Revenue Overview</span>
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <p className="text-3xl font-bold text-emerald-400 font-display">₹{stats?.totalRevenue || 0}</p>
        </div>
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 font-medium text-[10px] font-display flex-1">User Reports</span>
            <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          </div>
          <p className="text-3xl font-bold text-rose-400 font-display">{stats?.pendingReports || 0}</p>
        </div>
        
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 font-medium text-[10px] font-display flex-1">Live Login/Logout</span>
            <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          </div>
          <div className="h-10 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorLogin" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                     <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorLogout" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5}/>
                     <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'light' ? '#fff' : '#0f172a', borderColor: theme === 'light' ? '#e2e8f0' : '#1e293b', fontSize: '10px', padding: '4px 8px' }} 
                  itemStyle={{ fontSize: '10px', padding: 0 }}
                  labelStyle={{ display: 'none' }}
                />
                <Area type="monotone" dataKey="login" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLogin)" />
                <Area type="monotone" dataKey="logout" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorLogout)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-800 mb-8 overflow-x-auto gap-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-4 font-bold font-display text-xs uppercase tracking-wider relative transition shrink-0 cursor-pointer ${
            activeTab === "users" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
          }`}
        >
          Users Management
          {activeTab === 'users' && <span className="absolute bottom-0 inset-x-4 h-0.5 bg-violet-400 rounded-full"></span>}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-4 px-4 font-bold font-display text-xs uppercase tracking-wider relative flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
            activeTab === "payments" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
          }`}
        >
          Payment Reviews
          {payments.some(p => p.status === 'Pending') && (
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          )}
          {activeTab === 'payments' && <span className="absolute bottom-0 inset-x-4 h-0.5 bg-violet-400 rounded-full"></span>}
        </button>
        <button
          onClick={() => setActiveTab('approved_vips')}
          className={`pb-4 px-4 font-bold font-display text-xs uppercase tracking-wider relative flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
            activeTab === "approved_vips" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
          }`}
        >
          Approved VIP Access
          {activeTab === 'approved_vips' && <span className="absolute bottom-0 inset-x-4 h-0.5 bg-violet-400 rounded-full"></span>}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-4 px-4 font-bold font-display text-xs uppercase tracking-wider relative flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
            activeTab === "reports" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
          }`}
        >
          User Reports
          {reports.some(r => r.status === 'Pending') && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          )}
          {activeTab === 'reports' && <span className="absolute bottom-0 inset-x-4 h-0.5 bg-violet-400 rounded-full"></span>}
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`pb-4 px-4 font-bold font-display text-xs uppercase tracking-wider relative flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
            activeTab === "verifications" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
          }`}
        >
          Photo Verifications
          {users.filter(u => u.photoVerificationPending).length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
          {activeTab === 'verifications' && <span className="absolute bottom-0 inset-x-4 h-0.5 bg-violet-400 rounded-full"></span>}
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`pb-4 px-4 font-bold font-display text-xs uppercase tracking-wider relative transition shrink-0 cursor-pointer ${
            activeTab === "content" ? "text-violet-500" : (theme === "light" ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
          }`}
        >
          Platform Settings
          {activeTab === 'content' && <span className="absolute bottom-0 inset-x-4 h-0.5 bg-violet-400 rounded-full"></span>}
        </button>
      </div>

      {/* LOADING CHUCK */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 animate-pulse font-display text-sm">
          Compiling administrative roster...
        </div>
      ) : (
        <div className={`rounded-2xl p-4 sm:p-6 backdrop-blur border ${theme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-800"}`}>
          
          {/* USER TAB PANEL */}
          {activeTab === 'users' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className={`text-lg font-bold font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}>Registered Members ({filteredUsers.length})</h2>
                <div className="relative w-full sm:w-80">
                  <span className="absolute left-3.5 top-2.5 text-slate-500"><Search className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Search username, email or ID..."
                    className={`w-full py-2 pl-9 pr-4 rounded-xl text-xs focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-white focus:border-violet-500"}`}
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No registered members found.</div>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold font-display">
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Role / Type</th>
                        <th className="py-3 px-4 text-center">Actions / VIP Control</th>
                        <th className="py-3 px-4 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredUsers.map((u) => {
                        const days = grantDays[u.id] || 30;
                        return (
                          <tr key={u.id} className={`${theme === "light" ? "hover:bg-slate-50" : "hover:bg-slate-950/20"}`}>
                            <td className="py-4 px-4 flex items-center gap-3">
                              <img
                                src={u.profilePic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23555'/></svg>`}
                                alt={u.username}
                                className="w-9 h-9 rounded-full object-cover border border-slate-800"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className={`font-bold hover:text-violet-400 transition block flex items-center gap-1 ${theme === "light" ? "text-slate-900" : "text-white"} ${u.type === "Royal VIP" ? "text-violet-500" : ""}`}>
                                  {u.username}
                                  {u.photoVerified && (
                                    <span title="Photo Verified Human" className="text-emerald-500 text-[10px] bg-emerald-500/10 inline-flex items-center gap-1 px-1 py-0.5 rounded leading-none">
                                      VERIFIED ✔
                                      {u.humanVerificationPic && (
                                        <button 
                                          onClick={() => setInspectingVerificationPhoto({ userId: u.id, pic: String(u.humanVerificationPic) })}
                                          className="hover:scale-110 transition cursor-pointer text-[12px] p-0 border-none bg-transparent"
                                          title="View Verification Photo"
                                        >
                                          📸
                                        </button>
                                      )}
                                    </span>
                                  )}
                                  {u.photoVerificationPending && (
                                    <span title="Verification Pending" className="text-amber-500 text-[10px] bg-amber-500/10 inline-flex items-center gap-1 px-1 py-0.5 rounded leading-none ml-2">
                                      PENDING
                                      {u.humanVerificationPic && (
                                        <button 
                                          onClick={() => setInspectingVerificationPhoto({ userId: u.id, pic: String(u.humanVerificationPic) })}
                                          className="hover:scale-110 transition cursor-pointer text-[12px] p-0 border-none bg-transparent"
                                          title="Verify Photo"
                                        >
                                          📋
                                        </button>
                                      )}
                                    </span>
                                  )}
                                </span>
                                <span className="text-slate-500 block text-[10px]">{u.email || 'Guest user session'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-300">
                              {u.city}, {u.state}, {u.country}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${
                                u.type === 'Royal VIP' 
                                  ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400 glow-purple'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                              }`}>
                                {u.type}
                              </span>
                              {u.vipExpiresAt && (
                                <span className="text-[9px] block text-slate-500 mt-1">Exp: {new Date(u.vipExpiresAt).toLocaleDateString()}</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {u.type === 'Royal VIP' ? (
                                <button
                                  onClick={() => handleRemoveVIP(u.id)}
                                  className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] transition font-semibold cursor-pointer"
                                >
                                  Revoke VIP
                                </button>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={days}
                                    onChange={(e) => setGrantDays({ ...grantDays, [u.id]: parseInt(e.target.value) || 1 })}
                                    className={`w-12 py-0.5 px-1 rounded text-center text-[10px] border ${theme === "light" ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-white"}`}
                                    placeholder="Days"
                                    title="Duration Days"
                                  />
                                  <button
                                    onClick={() => handleGrantVIP(u.id)}
                                    className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[10px] transition font-semibold cursor-pointer"
                                  >
                                    Grant
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                              {u.type === 'Moderator' ? (
                                <button
                                  onClick={() => handleDemoteMod(u.id)}
                                  className="px-2.5 py-1 text-[10px] font-semibold border bg-slate-500/15 border-slate-500/20 text-slate-400 hover:bg-slate-500/20 rounded-lg transition cursor-pointer"
                                >
                                  Demote Mod
                                </button>
                              ) : (
                                u.type !== 'Admin' && (
                                  <button
                                    onClick={() => handlePromoteMod(u.id)}
                                    className="px-2.5 py-1 text-[10px] font-semibold border bg-indigo-500/15 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition cursor-pointer"
                                  >
                                    Promote Mod
                                  </button>
                                )
                              )}
                              <button
                                onClick={() => setEditingUser(u)}
                                className="px-2.5 py-1 bg-violet-600/15 border border-violet-500/20 hover:bg-violet-600/25 text-violet-400 font-semibold rounded-lg text-[10px] transition cursor-pointer"
                              >
                                Edit Profile
                              </button>
                              <button
                                onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                                className={`px-2.5 py-1 text-[10px] font-semibold border rounded-lg transition cursor-pointer ${
                                  u.isBanned 
                                    ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                                    : 'bg-rose-500/15 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                }`}
                              >
                                {u.isBanned ? 'Unban User' : 'Ban User'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                title="Delete user account"
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition inline-flex items-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAYMENT TRANSCRIPT REVIEWS */}
          {activeTab === 'payments' && (
            <div>
              <h2 className={`text-lg font-bold font-display mb-6 ${theme === "light" ? "text-slate-900" : "text-white"}`}>UPI Payment Invoices Receipts</h2>
              {payments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No payment transaction records exist.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {payments.map((p) => {
                    const isPending = p.status === 'Pending';
                    const formattedDate = new Date(p.timestamp).toLocaleString();
                    
                    return (
                      <div key={p.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-3">
                            <span className={`text-xs font-bold font-display truncate ${theme === "light" ? "text-slate-900" : "text-white"}`}>Username: {p.username}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                              p.status === 'Pending' 
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
                                : p.status === 'Approved'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 border-none text-slate-500'
                            }`}>
                              {p.status}
                            </span>
                          </div>

                          <div className={`space-y-1.5 text-[11px] mb-4 p-3 rounded-xl border ${theme === "light" ? "bg-white border-slate-200 text-slate-500" : "bg-slate-900/40 border-slate-800/40 text-slate-400"}`}>
                            <div>Plan Selected: <span className={`font-semibold ${theme === "light" ? "text-slate-900" : "text-white"}`}>{p.planName}</span></div>
                            <div>Price INR: <span className={`font-semibold ${theme === "light" ? "text-slate-900" : "text-white"}`}>₹{p.price}</span></div>
                            <div>Uploaded At: <span className="text-slate-500">{formattedDate}</span></div>
                          </div>

                          {p.screenshotUrl ? (
                            <div className={`relative max-h-56 rounded-xl overflow-hidden mb-4 flex items-center justify-center p-2 group cursor-pointer border ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/20 border-slate-800"}`}>
                              <img
                                src={p.screenshotUrl}
                                alt="UPI pay receipt"
                                className="max-h-48 object-contain rounded-lg filter group-hover:brightness-110 transition shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className={`py-8 text-center text-xs rounded-xl mb-4 ${theme === "light" ? "bg-slate-50 text-slate-500" : "bg-slate-900/40 text-slate-600"}`}>No Screenshot uploaded</div>
                          )}
                        </div>

                        {isPending && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleReviewPayment(p.id, 'Approved')}
                              className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition inline-flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleReviewPayment(p.id, 'Rejected')}
                              className="w-1/2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-xl text-xs transition inline-flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* APPROVED VIP SUBSCRIPTION TRANSACTIONS */}
          {activeTab === 'approved_vips' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className={`text-lg font-bold font-display animate-fade-in ${theme === "light" ? "text-slate-900" : "text-white"}`}>Approved VIP Subscriptions</h2>
                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${theme === "light" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
                   <Check className="w-4 h-4" />
                   <span className="text-xs font-bold uppercase tracking-wider">Total Approved VIPs: {payments.filter((p) => p.status === 'Approved').length}</span>
                </div>
              </div>
              
              {payments.filter((p) => p.status === 'Approved').length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No approved VIP payments found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {payments.filter((p) => p.status === 'Approved').map((p) => {
                    const formattedDate = new Date(p.timestamp).toLocaleString();
                    
                    return (
                      <div key={p.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-3">
                            <span className={`text-xs font-bold font-display truncate ${theme === "light" ? "text-slate-900" : "text-white"}`}>Username: {p.username}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              Approved
                            </span>
                          </div>

                          <div className={`space-y-1.5 text-[11px] mb-4 p-3 rounded-xl border ${theme === "light" ? "bg-white border-slate-200 text-slate-500" : "bg-slate-900/40 border-slate-800/40 text-slate-400"}`}>
                            <div>Plan Selected: <span className={`font-semibold ${theme === "light" ? "text-slate-900" : "text-white"}`}>{p.planName}</span></div>
                            <div>Price INR: <span className={`font-semibold ${theme === "light" ? "text-slate-900" : "text-white"}`}>₹{p.price}</span></div>
                            <div>Uploaded At: <span className="text-slate-500">{formattedDate}</span></div>
                          </div>

                          {p.screenshotUrl ? (
                            <div className={`relative max-h-56 rounded-xl overflow-hidden flex items-center justify-center p-2 group cursor-pointer border ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/20 border-slate-800"}`}>
                              <img
                                src={p.screenshotUrl}
                                alt="UPI pay receipt"
                                className="max-h-48 object-contain rounded-lg filter group-hover:brightness-110 transition shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className={`py-8 text-center text-xs rounded-xl ${theme === "light" ? "bg-slate-50 text-slate-500" : "bg-slate-900/40 text-slate-600"}`}>No Screenshot uploaded</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SYSTEM USER REPORTS / MODERATION */}
          {activeTab === 'reports' && (
            <div>
              <h2 className={`text-lg font-bold font-display mb-6 animate-fade-in ${theme === "light" ? "text-slate-900" : "text-white"}`}>User Abuse Complaints & Reports</h2>
              {reports.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No active user complaints filed. Platform is perfectly safe!</div>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold font-display">
                        <th className="py-3 px-4">Reporter</th>
                        <th className="py-3 px-4">Reported Stranger User</th>
                        <th className="py-3 px-4">Reason Filed</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {reports.map((r) => (
                        <tr key={r.id} className={`${theme === "light" ? "hover:bg-slate-50" : "hover:bg-slate-950/20"}`}>
                          <td className="py-4 px-4 font-semibold text-slate-300">{r.reporterName} ({r.reporterId.substring(0, 8)})</td>
                          <td className="py-4 px-4 font-bold text-rose-300">{r.reportedName} ({r.reportedId.substring(0, 8)})</td>
                          <td className="py-4 px-4 max-w-xs truncate text-slate-400" title={r.reason}>{r.reason}</td>
                          <td className="py-4 px-4 text-slate-500">{new Date(r.timestamp).toLocaleString()}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              r.status === 'Resolved' 
                                ? 'bg-slate-800 text-slate-500' 
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap space-x-1.5">
                            {r.status === 'Pending' && (
                              <button
                                onClick={() => handleResolveReport(r.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] transition font-semibold cursor-pointer"
                              >
                                Resolve
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleBan(r.reportedId, false)}
                              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] transition font-semibold cursor-pointer"
                            >
                              Ban Accused User
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VERIFICATIONS QUEUE PANEL */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              <h2 className={`text-lg font-bold font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}>Photo Verifications Queue</h2>
              {users.filter(u => u.photoVerificationPending).length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border border-dashed ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/30 border-slate-800"}`}>
                  <p className={`text-xs font-semibold ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>No pending photo verifications to review.</p>
                </div>
              ) : (
                <div className={`rounded-2xl border overflow-hidden shadow-sm ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`${theme === "light" ? "bg-slate-50 text-slate-500" : "bg-slate-950 text-slate-400"} text-[10px] uppercase font-bold tracking-wider`}>
                        <th className="py-3 px-4 w-1/4">User</th>
                        <th className="py-3 px-4 w-1/4">Registration Time</th>
                        <th className="py-3 px-4 w-1/4">Time Elapsed</th>
                        <th className="py-3 px-4 w-1/4 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${theme === "light" ? "divide-slate-100 text-slate-700" : "divide-slate-800 text-slate-300"}`}>
                      {users.filter(u => u.photoVerificationPending).map(u => (
                        <tr key={u.id} className={`transition ${theme === "light" ? "hover:bg-slate-50" : "hover:bg-slate-800/50"}`}>
                          <td className="py-3 px-4">
                            <span className={`font-bold ${theme === "light" ? "text-slate-900" : "text-white"}`}>{u.username}</span>
                            <span className="block text-[10px] text-slate-500">{u.email}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px]">{new Date(u.photoVerificationSubmittedAt || Date.now()).toLocaleString()}</td>
                          <td className="py-3 px-4 font-mono text-[10px] text-amber-500 font-bold">
                            {Math.floor((Date.now() - (u.photoVerificationSubmittedAt || Date.now())) / 60000)} mins
                          </td>
                          <td className="py-3 px-4 text-right pr-6">
                            <button
                              onClick={() => setInspectingVerificationPhoto({ userId: u.id, pic: String(u.humanVerificationPic) })}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition font-semibold cursor-pointer tracking-wide"
                            >
                              Review Photo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CONTENT AND CONFIG SETTINGS PANEL */}
          {activeTab === 'content' && config && (
            <form onSubmit={handleUpdateConfig} className="space-y-6 max-w-2xl">
              <h2 className={`text-lg font-bold font-display mb-6 border-b pb-3 ${theme === "light" ? "text-slate-900 border-slate-200" : "text-white border-slate-800"}`}>Edit Platform Copy & Configs</h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide font-display">Website Brand Name</label>
                  <input
                    type="text"
                    value={config.homepageTitle}
                    onChange={(e) => setConfig({ ...config, homepageTitle: e.target.value })}
                    className={`w-full p-3 rounded-xl text-xs focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-white focus:border-violet-500"}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide font-display">Tagline</label>
                  <input
                    type="text"
                    value={config.homepageTagline}
                    onChange={(e) => setConfig({ ...config, homepageTagline: e.target.value })}
                    className={`w-full p-3 rounded-xl text-xs focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-white focus:border-violet-500"}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide font-display">Global Announcement Marquee</label>
                <textarea
                  value={config.announcement}
                  onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                  rows={3}
                  className={`w-full p-3 rounded-xl text-xs focus:outline-none transition resize-none border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-white focus:border-violet-500"}`}
                />
              </div>

              <div className={`p-5 rounded-2xl border ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-800"}`}>
                <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wide font-display">Community Rules (One per line)</label>
                <textarea
                  value={config.communityRules?.join('\n') || ''}
                  onChange={(e) => setConfig({ ...config, communityRules: e.target.value.split('\n').filter(Boolean) })}
                  rows={4}
                  className={`w-full p-3 rounded-xl text-xs focus:outline-none transition resize-none border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 placeholder-slate-400" : "bg-slate-950 border-slate-800 text-white focus:border-violet-500"}`}
                />
              </div>

              <div className="border-t border-slate-800/40 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm font-bold mb-1 font-display ${theme === "light" ? "text-slate-900" : "text-white"}`}>Enable QR Code Payments</h3>
                    <p className="text-[11px] text-slate-500">Enable or disable overall UPI gateway billing channels</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, paymentMethodsEnabled: !config.paymentMethodsEnabled })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      config.paymentMethodsEnabled ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      config.paymentMethodsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <label className="block text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wide font-display">Upload New UPI QR Code</label>
                    <div className={`relative border border-dashed rounded-xl p-6 text-center cursor-pointer group transition ${theme === "light" ? "border-slate-300 hover:border-slate-400 bg-slate-50/50" : "border-slate-800 hover:border-slate-700 bg-slate-950"}`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQRUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-6 h-6 mx-auto text-slate-500 group-hover:text-violet-500 mb-2 transition" />
                      <span className="text-[11px] font-semibold text-slate-400 block">Replace QR Vector</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border w-40 h-40 flex items-center justify-center mx-auto shadow ${theme === "light" ? "bg-slate-50 border-slate-300" : "bg-slate-950 border-slate-800"}`}>
                    <img
                      src={qrFile || config.qrCodeUrl}
                      alt="UPI payment QR Code thumbnail"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/40 pt-6 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold font-display text-xs tracking-wider uppercase shadow-lg shadow-violet-500/10 cursor-pointer"
                >
                  Save Platform Config Changes
                </button>
              </div>
            </form>
          )}

          {/* DYNAMIC VIP PRICING PLAN BUILDER SECTION */}
          {activeTab === 'content' && vipPlans && vipPlans.length > 0 && (
            <div className="border-t border-slate-800/50 pt-8 mt-10 max-w-2xl text-slate-100 font-sans">
              <h3 className="text-md font-bold font-display text-amber-400 mb-1 flex items-center gap-2">
                👑 VIP Pricing Plans Manager
              </h3>
              <p className="text-[11px] text-slate-400 mb-6">
                Directly calibrate coin/INR price levels, duration periods, and benefits shown to customers.
              </p>

              <div className="space-y-4">
                {vipPlans.map((plan, idx) => (
                  <div key={plan.id || idx} className={`p-4 rounded-2xl space-y-3 border ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-1 font-display">Plan ID Name</label>
                        <input
                          type="text"
                          value={plan.name || ''}
                          onChange={(e) => {
                            const updated = [...vipPlans];
                            updated[idx].name = e.target.value;
                            setVipPlans(updated);
                          }}
                          className={`w-full text-xs p-2.5 rounded-xl focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500" : "bg-slate-900 border-slate-800 text-white focus:border-amber-500"}`}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-1 font-display">Price Amount (INR)</label>
                        <input
                          type="number"
                          value={plan.price === 0 ? '' : plan.price}
                          onChange={(e) => {
                            const updated = [...vipPlans];
                            updated[idx].price = e.target.value === '' ? '' as any : Number(e.target.value);
                            setVipPlans(updated);
                          }}
                          className={`w-full text-xs p-2.5 rounded-xl focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500" : "bg-slate-900 border-slate-800 text-white focus:border-amber-500"}`}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-1 font-display">Active Days</label>
                        <input
                          type="number"
                          value={plan.days === 0 ? '' : plan.days}
                          onChange={(e) => {
                            const updated = [...vipPlans];
                            updated[idx].days = e.target.value === '' ? '' as any : Number(e.target.value);
                            setVipPlans(updated);
                          }}
                          className={`w-full text-xs p-2.5 rounded-xl focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500" : "bg-slate-900 border-slate-800 text-white focus:border-amber-500"}`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-1 font-display">Short Highlight Subtext</label>
                        <input
                          type="text"
                          value={plan.description || ''}
                          onChange={(e) => {
                            const updated = [...vipPlans];
                            updated[idx].description = e.target.value;
                            setVipPlans(updated);
                          }}
                          placeholder="e.g. Royal treatment with direct match filter channels"
                          className={`w-full text-xs p-2.5 rounded-xl focus:outline-none transition border ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500" : "bg-slate-900 border-slate-800 text-white focus:border-amber-500"}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = vipPlans.filter((_, i) => i !== idx);
                          setVipPlans(updated);
                        }}
                        className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer font-bold text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-5">
                <button
                  type="button"
                  onClick={() => {
                    const planNames = ['Lite', 'Mini', 'Standard', 'Plus', 'Premium', 'Elite', 'Pro', 'Max', 'Ultra', 'Supreme'];
                    const existingCount = vipPlans.length;
                    const suffix = planNames[existingCount] || `Pack ${existingCount + 1}`;
                    setVipPlans([
                      ...vipPlans,
                      {
                        id: `plan_${Date.now()}`,
                        name: `Royal VIP ${suffix}`,
                        price: 50,
                        days: 3,
                        description: ''
                      }
                    ]);
                  }}
                  className={`px-5 py-2.5 font-bold font-display rounded-xl text-[10px] tracking-wider uppercase transition cursor-pointer ${theme === "light" ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
                >
                  + Add VIP Plan
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePlans}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-display rounded-xl text-[10px] tracking-wider uppercase transition shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  🚀 Update VIP Pricing Plans
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {inspectingVerificationPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`relative max-w-sm w-full p-4 rounded-2xl shadow-2xl ${theme === 'light' ? 'bg-white' : 'bg-slate-900 border border-slate-800'}`}>
            <h3 className={`font-bold font-display text-base tracking-tight mb-3 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
              Review Verification Photo
            </h3>
            <div className="w-full h-80 rounded-xl overflow-hidden bg-slate-950 flex justify-center items-center">
              <img src={inspectingVerificationPhoto.pic} alt="Verification submission" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => handleVerifyPhoto(inspectingVerificationPhoto.userId, true)} 
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition-all shadow-md cursor-pointer uppercase tracking-wider"
              >
                Approve
              </button>
              <button 
                onClick={() => handleVerifyPhoto(inspectingVerificationPhoto.userId, false)} 
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold text-white transition-all shadow-md cursor-pointer uppercase tracking-wider"
              >
                Reject
              </button>
            </div>

            <button
               onClick={() => setInspectingVerificationPhoto(null)}
              className={`mt-2 w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-slate-100">
          <div className={`relative max-w-lg w-full p-6 rounded-3xl border shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin transition duration-300 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 text-white shadow-black/80'
          }`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 blur-xl rounded-full pointer-events-none"></div>
            
            <form onSubmit={handleSaveUserFromAdmin} className="space-y-4 font-display">
              <div className="text-center">
                <h3 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Admin Profile Override</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Control & Edit Any User Properties</p>
              </div>

              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-1.5 leading-none">
                <img 
                  src={editForm.profilePic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                  alt="Avatar preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-violet-500/20"
                />
                <label className={`px-2.5 py-1 text-[9px] font-bold border rounded-lg transition cursor-pointer ${
                  theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-750 text-violet-400 border-slate-700'
                }`}>
                  Upload New Avatar
                  <input type="file" accept="image/*" onChange={handleAdminAvatarUpload} className="hidden" />
                </label>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2.5">
                <div>
                  <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Display Username</label>
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as any })}
                      className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500'
                      }`}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Age</label>
                    <input
                      type="number"
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) || 18 })}
                      className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Bio</label>
                  <textarea
                    rows={2}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl outline-none border transition resize-none ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Country</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-505'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Account Type/Role</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl outline-none border transition ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500'
                    }`}
                  >
                    <option value="Guest">Guest</option>
                    <option value="Registered">Registered</option>
                    <option value="Royal VIP">Royal VIP</option>
                    <option value="Moderator">Moderator</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 mt-1 leading-none">
                  <div className="leading-tight">
                    <span className="block text-xs font-bold text-rose-500">Ban Account</span>
                    <span className="text-[10px] text-slate-400">Restricts user lobby and messaging rights instantly</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editForm.isBanned}
                    onChange={(e) => setEditForm({ ...editForm, isBanned: e.target.checked })}
                    className="w-4 h-4 cursor-pointer accent-rose-500"
                  />
                </div>
              </div>

              {/* Admin Actions buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-500/10">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-violet-500/10 transition cursor-pointer"
                >
                  Apply Override
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className={`flex-1 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider transition border cursor-pointer ${
                    theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
