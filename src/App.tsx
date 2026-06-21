import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, SystemStats, VIPPlan } from './types';
import HomePage, { VibeChatLogo } from './components/HomePage';
import ChatInterface from './components/ChatInterface';
import VipPlansPage from './components/VipPlansPage';
import AdminPanel from './components/AdminPanel';
import AudioVideoCall from './components/AudioVideoCall';
import AdminLoginPortal from './components/AdminLoginPortal';
import { 
  Sparkles, 
  MapPin, 
  Compass, 
  Shield, 
  LogOut, 
  Globe, 
  Plus, 
  ShieldCheck, 
  AlertOctagon, 
  Smile, 
  ChevronRight,
  Volume2,
  Sun,
  Moon,
  Bell,
  User,
  Users,
  MessageSquare,
  Palette,
  Image as ImageIcon,
  Droplet,
  Camera,
  Phone
} from 'lucide-react';

export default function App() {
  // Session authentication states
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [platformConfig, setPlatformConfig] = useState<any>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const reconnectTimeoutRef = useRef<any>(null);
  const authRetryTimeoutRef = useRef<any>(null);
  const tokenRef = useRef<string | null>(null);

  const clearAuthRetryTimer = () => {
    if (authRetryTimeoutRef.current) {
      clearTimeout(authRetryTimeoutRef.current);
      authRetryTimeoutRef.current = null;
    }
  };

  // Global app indicators
  const [globalStats, setGlobalStats] = useState<SystemStats | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [detectedGeo, setDetectedGeo] = useState<{ city: string; state: string; country: string }>({
    city: 'Detecting Location...',
    state: 'IP Network',
    country: 'IP Location'
  });

  useEffect(() => {
    // Try browser geolocation for exact location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const data = await res.json();
            if (data && data.address) {
              const city = data.address.city || data.address.town || data.address.village || data.address.hamlet || data.address.suburb || data.address.county || '';
              const state = data.address.state || data.address.region || '';
              const country = data.address.country || '';

              if (city && state && country) {
                setDetectedGeo({ city, state, country });
                return;
              }
            }
          } catch (e) {
            console.warn('Geolocation reverse geocoding failed:', e);
          }
          fallbackToIpGeo();
        },
        (error) => {
          console.warn('Geolocation denied or error (locating via IP):', error);
          fallbackToIpGeo();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      fallbackToIpGeo();
    }

    function fallbackToIpGeo() {
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data && data.city) {
            setDetectedGeo({
              city: data.city,
              state: data.region || 'IP State',
              country: data.country_name || data.country || 'IP Location'
            });
          } else {
            fallbackToGeoJS();
          }
        })
        .catch(() => {
          fallbackToGeoJS();
        });
    }

    function fallbackToGeoJS() {
      fetch('https://get.geojs.io/v1/ip/geo.json')
        .then(res => res.json())
        .then(data => {
          if (data && data.city) {
            setDetectedGeo({
              city: data.city,
              state: data.region || 'IP State',
              country: data.country || 'IP Location'
            });
          } else {
            fallbackToServerIpLookup();
          }
        })
        .catch(err => {
          console.warn('GeoJS lookup error, utilizing server fallback:', err);
          fallbackToServerIpLookup();
        });
    }

    function fallbackToServerIpLookup() {
      fetch('/api/location/detect')
        .then(res => res.json())
        .then(data => {
          if (data && data.city) {
            setDetectedGeo({
              city: data.city || 'Unknown City',
              state: data.state || 'Unknown State',
              country: data.country || 'Unknown Country'
            });
          } else {
            fallbackToIpify();
          }
        })
        .catch(err => {
          console.error('Server IP lookup failed:', err);
          fallbackToIpify();
        });
    }

    function fallbackToIpify() {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(d => {
          if (d && d.ip) {
            fetch(`https://ip-api.com/json/${d.ip}`)
              .then(res => res.json())
              .then(loc => {
                if (loc && loc.city) {
                  setDetectedGeo({
                    city: loc.city,
                    state: loc.regionName || 'IP State',
                    country: loc.country || 'IP Location'
                  });
                } else {
                  setDetectedGeo({ city: 'Delhi', state: 'Delhi', country: 'India' });
                }
              })
              .catch(() => {
                setDetectedGeo({ city: 'Delhi', state: 'Delhi', country: 'India' });
              });
          } else {
            setDetectedGeo({ city: 'Delhi', state: 'Delhi', country: 'India' });
          }
        })
        .catch(() => {
          setDetectedGeo({ city: 'Delhi', state: 'Delhi', country: 'India' });
        });
    }
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('vibechat_theme') as 'light' | 'dark') || 'dark';
  });
  const [wallpaper, setWallpaper] = useState<string | null>(() => {
    return localStorage.getItem('vibechat_wallpaper') || null;
  });
  const [wallpaperOpacity, setWallpaperOpacity] = useState<number>(() => {
    return parseFloat(localStorage.getItem('vibechat_wallpaper_opacity') || '0.5');
  });
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [failedWallpapers, setFailedWallpapers] = useState<Set<string>>(new Set());

  const handleWallpaperChange = (url: string | null) => {
    if (url) {
      try {
        localStorage.setItem('vibechat_wallpaper', url);
      } catch (err) {
        showToast('Image too large to save across sessions, but applied for now.', true);
      }
      setWallpaper(url);
    } else {
      localStorage.removeItem('vibechat_wallpaper');
      setWallpaper(null);
    }
  };

  const handleWallpaperOpacityChange = (val: number) => {
    setWallpaperOpacity(val);
    localStorage.setItem('vibechat_wallpaper_opacity', val.toString());
  };

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      handleWallpaperChange(result);
    };
    reader.readAsDataURL(file);
  };

  const PRESET_WALLPAPERS = [
    { name: 'Aurora Green', url: 'https://images.unsplash.com/photo-1531366936337-77cf5e08ce13?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Epic Mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Deep Ocean', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Snowy Peak', url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Neon City', url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Earth Orbit', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Purple Glow', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Galaxies & Stars', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f41?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Castle', url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Open Fields', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1080' },
    { name: 'Sailing Boats', url: 'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&q=80&w=1080' }
  ];

  const [rulesAgreed, setRulesAgreed] = useState<boolean>(true);
  const [showOwnProfileModal, setShowOwnProfileModal] = useState<boolean>(false);
  const [adminChangesNotice, setAdminChangesNotice] = useState<{ by: string; changes: string[]; user: any } | null>(null);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'people' | 'chat' | 'lounge' | 'vip'>('people');

  const showThemeModalRef = useRef<boolean>(false);
  const showOwnProfileModalRef = useRef<boolean>(false);
  const showNotificationsDropdownRef = useRef<boolean>(false);
  const showExitConfirmRef = useRef<boolean>(false);
  const incomingCallRef = useRef<any>(null);
  const outgoingCallRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);
  const screenRef = useRef<'lobby' | 'plans' | 'geo' | 'admin'>('lobby');
  const sidebarTabRef = useRef<'people' | 'chat' | 'lounge' | 'vip'>('people');
  const isLoggedInRef = useRef<boolean>(!!token && !!me);

  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 'notif-welcome',
      type: 'system',
      title: 'Welcome to WeChat Standard Connect 🔮',
      msg: 'You have successfully joined the premium standard connect platform. Enjoy fast, secure, and intuitive end-to-end messaging!',
      timestamp: 'Just now',
      read: false
    },
    {
      id: 'notif-features',
      type: 'system',
      title: 'New Feature: Theme & Wallpapers 🎨',
      msg: 'You can now fully customize your experience! Choose from our premium nature wallpapers (Neon City, Deep Space, Castle, etc.) or upload your own in Theme Settings.',
      timestamp: '2 mins ago',
      read: false
    },
    {
      id: 'notif-updates',
      type: 'system',
      title: 'Platform Updates & Notifications 🔔',
      msg: 'All new updates, special features, and standard connect announcements about our app will now securely appear right here in your notification center.',
      timestamp: '5 mins ago',
      read: false
    }
  ]);

  const [screen, setScreen] = useState<'lobby' | 'plans' | 'geo' | 'admin'>('lobby');
  const [isAdminPortal, setIsAdminPortal] = useState<boolean>(window.location.pathname === '/admin');

  const [editUsername, setEditUsername] = useState<string>('');
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other'>('Other');
  const [editBio, setEditBio] = useState<string>('');
  const [editAge, setEditAge] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editState, setEditState] = useState<string>('');
  const [editCountry, setEditCountry] = useState<string>('');
  const [editPic, setEditPic] = useState<string>('');

  useEffect(() => {
    if (showOwnProfileModal && me) {
      setEditUsername(me.username || '');
      setEditGender(me.gender || 'Other');
      setEditBio(me.bio || '');
      setEditAge(me.age ? String(me.age) : '');
      setEditCity(me.city || '');
      setEditState(me.state || '');
      setEditCountry(me.country || '');
      setEditPic(me.profilePic || '');
    }
  }, [showOwnProfileModal, me]);

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditPic(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const MAX_BIO_LENGTH = 50;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) {
      showToast('Username is required.', true);
      return;
    }
    const ageNum = Number(editAge);
    if (editAge && (isNaN(ageNum) || ageNum < 18 || ageNum > 120)) {
      showToast('Please enter a valid age of 18 or above.', true);
      return;
    }
    const bioText = editBio.trim();
    if (bioText.length > MAX_BIO_LENGTH) {
      showToast(`Bio cannot exceed ${MAX_BIO_LENGTH} characters.`, true);
      return;
    }

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: editUsername.trim(),
          gender: editGender,
          bio: editBio.trim(),
          age: ageNum || undefined,
          city: editCity.trim(),
          state: editState.trim(),
          country: editCountry.trim(),
          profilePic: editPic
        })
      });

      if (res.ok) {
        localStorage.setItem('vibechat_rejoin_username', editUsername.trim());
        localStorage.setItem('vibechat_rejoin_gender', editGender || '');
        localStorage.setItem('vibechat_rejoin_city', editCity.trim());
        localStorage.setItem('vibechat_rejoin_state', editState.trim());
        localStorage.setItem('vibechat_rejoin_country', editCountry.trim());
        localStorage.setItem('vibechat_rejoin_bio', editBio.trim());
        localStorage.setItem('vibechat_rejoin_age', String(ageNum || 0));

        if (editPic) {
          localStorage.setItem('vibechat_rejoin_profilePic', editPic);
        }

        showToast('Profile updated successfully!');
        fetchLatestProfile();
        setShowOwnProfileModal(false);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to update profile.', true);
      }
    } catch (err) {
      showToast('Connection failed. Please try again.', true);
    }
  };

  const [plans, setPlans] = useState<VIPPlan[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [paymentPending, setPaymentPending] = useState<boolean>(false);

  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
    callerPic: string;
    type: 'audio' | 'video';
    breakthrough?: boolean;
  } | null>(null);

  const [outgoingCall, setOutgoingCall] = useState<{
    targetId: string;
    targetName: string;
    targetPic: string;
    type: 'audio' | 'video';
  } | null>(null);

  const [activeCall, setActiveCall] = useState<{
    peerId: string;
    peerName: string;
    peerPic: string;
    isCaller: boolean;
    type: 'audio' | 'video';
    peerCity?: string;
    peerState?: string;
    peerCountry?: string;
    isMatch?: boolean;
  } | null>(null);

  useEffect(() => {
    showThemeModalRef.current = showThemeModal;
    showOwnProfileModalRef.current = showOwnProfileModal;
    showNotificationsDropdownRef.current = showNotificationsDropdown;
    showExitConfirmRef.current = showExitConfirm;
    incomingCallRef.current = incomingCall;
    outgoingCallRef.current = outgoingCall;
    activeCallRef.current = activeCall;
    screenRef.current = screen;
    sidebarTabRef.current = sidebarTab;
    isLoggedInRef.current = !!token && !!me;
  }, [
    showThemeModal,
    showOwnProfileModal,
    showNotificationsDropdown,
    showExitConfirm,
    incomingCall,
    outgoingCall,
    activeCall,
    screen,
    sidebarTab,
    token,
    me
  ]);

  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [isChatActiveMobile, setIsChatActiveMobile] = useState<boolean>(false);

  useEffect(() => {
    const isVibeAppState = (state: any) => state && state.vibe_app === true;
    const pushAppRootState = () => window.history.pushState({ vibe_app: true, appRoot: true }, "");
    const pushAppGuardState = () => window.history.pushState({ vibe_app: true, appGuard: true }, "");

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (window.sessionStorage.getItem('vibe_allow_quit') === 'true') {
        window.sessionStorage.removeItem('vibe_allow_quit');
        return;
      }

      if (activeCallRef.current || incomingCallRef.current) {
        e.preventDefault();
        e.returnValue = 'You are in an active session. Are you sure you want to leave?';
        return e.returnValue;
      }

      if (screenRef.current === 'lobby' && sidebarTabRef.current === 'people' && !showExitConfirmRef.current) {
        // Let the Android back handler show the exit confirmation.
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    if (isLoggedInRef.current) {
      if (!isVibeAppState(window.history.state)) {
        pushAppRootState();
        pushAppGuardState();
      } else if (!window.history.state.appGuard) {
        pushAppGuardState();
      }
    }

    const restoreAppGuard = () => {
      try {
        if (!isVibeAppState(window.history.state)) {
          pushAppGuardState();
        } else {
          window.history.replaceState({ vibe_app: true, appGuard: true }, '', window.location.pathname);
        }
      } catch (err) {
        console.warn('Unable to restore app history state:', err);
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (window.sessionStorage.getItem('vibe_allow_quit') === 'true') {
        window.sessionStorage.removeItem('vibe_allow_quit');
        return;
      }

      const currentState = e.state;
      const isAppState = isVibeAppState(currentState);
      if (!isAppState) {
        if (isLoggedInRef.current && screenRef.current === 'lobby' && sidebarTabRef.current === 'people' && !showExitConfirmRef.current) {
          setShowExitConfirm(true);
        }
        if (!isLoggedInRef.current) {
          return;
        }
        restoreAppGuard();
        return;
      }

      if (showThemeModalRef.current) {
        setShowThemeModal(false);
        return;
      }
      if (showOwnProfileModalRef.current) {
        setShowOwnProfileModal(false);
        return;
      }
      if (showNotificationsDropdownRef.current) {
        setShowNotificationsDropdown(false);
        return;
      }
      if (showExitConfirmRef.current) {
        setShowExitConfirm(false);
        return;
      }

      if (incomingCallRef.current) {
        setIncomingCall(null);
        return;
      }
      if (outgoingCallRef.current) {
        setOutgoingCall(null);
        return;
      }

      if (activeCallRef.current) {
        setActiveCall(null);
        setScreen('lobby');
        setSidebarTab('people');
        return;
      }

      const evt = new CustomEvent('app_hardware_back', { detail: { handled: false } });
      window.dispatchEvent(evt);

      setTimeout(() => {
        const handled = window.sessionStorage.getItem('vibe_back_handled') === 'true' || evt.detail.handled === true;
        if (handled) {
          window.sessionStorage.removeItem('vibe_back_handled');
          return;
        }

        if (!isLoggedInRef.current) {
          return;
        }

        if (screenRef.current !== 'lobby') {
          setScreen('lobby');
          setSidebarTab('people');
          return;
        }

        if (sidebarTabRef.current !== 'people') {
          setSidebarTab('people');
          return;
        }

        if (showThemeModalRef.current || showOwnProfileModalRef.current || showNotificationsDropdownRef.current) {
          return;
        }

        setShowExitConfirm(true);
      }, 0);
    };
    
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!token || !me) return;
    if (screen === 'lobby' && sidebarTab === 'people') {
      try {
        if (window.history.state?.vibe_app === true) {
          window.history.replaceState({ vibe_app: true, appGuard: true }, '', window.location.pathname);
        } else {
          window.history.pushState({ vibe_app: true, appGuard: true }, '');
        }
      } catch (err) {
        console.warn('Unable to preserve app history guard for People Lobby:', err);
      }
    }
  }, [screen, sidebarTab, token, me]);

  // CRITICAL: Direct app_hardware_back handler (backup for when popstate doesn't fire on Android)
  // This handler MUST mark events as handled to prevent app exit
  useEffect(() => {
    const restoreAppGuard = () => {
      try {
        if (window.history.state && (window.history.state as any).vibe_app === true) {
          window.history.replaceState({ vibe_app: true, appGuard: true }, '', window.location.pathname);
        } else {
          window.history.pushState({ vibe_app: true, appGuard: true }, '', window.location.pathname);
        }
      } catch (err) {
        console.warn('Unable to restore app history state:', err);
      }
    };

    const markAndroidBackHandled = (evt: Event) => {
      try {
        window.sessionStorage.setItem('vibe_back_handled', 'true');
      } catch (e) {}
      if (evt && typeof evt === 'object') {
        try {
          (evt as any).detail = (evt as any).detail || {};
          (evt as any).detail.handled = true;
        } catch (e) {}
      }
    };

    const handleAndroidBack = (evt: Event) => {
      // If an app-level modal is open, close it immediately, mark handled, and restore history guard
      if (showExitConfirmRef.current) {
        setShowExitConfirm(false);
        markAndroidBackHandled(evt);
        restoreAppGuard();
        return;
      }

      if (showThemeModalRef.current || showOwnProfileModalRef.current || showNotificationsDropdownRef.current) {
        if (showThemeModalRef.current) setShowThemeModal(false);
        if (showOwnProfileModalRef.current) setShowOwnProfileModal(false);
        if (showNotificationsDropdownRef.current) setShowNotificationsDropdown(false);
        markAndroidBackHandled(evt);
        restoreAppGuard();
        return;
      }

      // If incoming or outgoing call overlay is present, close it first and restore history guard
      if (incomingCallRef.current) {
        setIncomingCall(null);
        markAndroidBackHandled(evt);
        restoreAppGuard();
        return;
      }
      if (outgoingCallRef.current) {
        setOutgoingCall(null);
        markAndroidBackHandled(evt);
        restoreAppGuard();
        return;
      }

      // Allow child listeners to run first by deferring action to next tick
      setTimeout(() => {
        const handled = window.sessionStorage.getItem('vibe_back_handled') === 'true' || (evt && (evt as any).detail && (evt as any).detail.handled === true);
        if (handled) {
          window.sessionStorage.removeItem('vibe_back_handled');
          restoreAppGuard();
          return;
        }

        if (showThemeModalRef.current) {
          setShowThemeModal(false);
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }
        if (showOwnProfileModalRef.current) {
          setShowOwnProfileModal(false);
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }
        if (showNotificationsDropdownRef.current) {
          setShowNotificationsDropdown(false);
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }
        if (showExitConfirmRef.current) {
          setShowExitConfirm(false);
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }

        if (incomingCallRef.current) {
          setIncomingCall(null);
          setScreen('lobby');
          setSidebarTab('people');
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }
        if (outgoingCallRef.current) {
          setOutgoingCall(null);
          setScreen('lobby');
          setSidebarTab('people');
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }

        if (activeCallRef.current) {
          const confirmLeave = window.confirm("You are in an active call. Are you sure you want to go back and disconnect?");
          if (confirmLeave) {
            handleHangupCall();
          }
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }

        if (screenRef.current !== 'lobby') {
          setScreen('lobby');
          setSidebarTab('people');
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }

        if (sidebarTabRef.current !== 'people') {
          setSidebarTab('people');
          markAndroidBackHandled(evt);
          restoreAppGuard();
          return;
        }

        setShowExitConfirm(true);
        markAndroidBackHandled(evt);
        restoreAppGuard();
      }, 50);
    };

    window.addEventListener('app_hardware_back', handleAndroidBack as EventListener);
    return () => window.removeEventListener('app_hardware_back', handleAndroidBack as EventListener);
  }, []);

  const [toast, setToast] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 4500);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('vibechat_theme', nextTheme);
  };

  useEffect(() => {
    if (me) {
      const accepted = localStorage.getItem(`vibechat_rules_accepted_${me.id}`) === 'true';
      setRulesAgreed(accepted);
    } else {
      setRulesAgreed(true);
    }
  }, [me]);

  useEffect(() => {
    fetch('/api/location/detect')
      .then((res) => res.json())
      .then((geo) => {
        if (geo) setDetectedGeo(geo);
      })
      .catch((err) => console.warn('IP location detection error:', err));
  }, []);

  useEffect(() => {
    // NOTE: Do NOT auto-restore any token on app mount. 
    // User must explicitly choose to rejoin via One-Click button on HomePage.
    // This ensures the gateway (HomePage) is always shown first to new and returning visitors.
    
    // Only set token if it was explicitly passed by user action (e.g., login/register/rejoin)
    // Never auto-restore from localStorage at app start.
  }, []);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchLatestProfile();
    } else {
      setMe(null);
      closeSocket();
    }
  }, [token]);

  useEffect(() => {
    fetch('/api/config/public').then(r => r.json()).then(c => {
      setPlatformConfig(c);
      if (c.announcement) setAnnouncement(c.announcement);
    }).catch(() => {});
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        setGlobalStats(await res.json());
      }
    } catch (e) {
      console.warn('Fail stats pooling: ', e);
    }
  };

  const getActiveAuthToken = () => {
    const savedToken = localStorage.getItem('vibechat_token');
    const rejoinToken = localStorage.getItem('vibechat_rejoin_token');
    return savedToken || rejoinToken || tokenRef.current || null;
  };

  const isAuthTokenPresent = () => {
    const currentToken = getActiveAuthToken();
    return !!currentToken && currentToken.trim().length > 0;
  };

  const loadRejoinSnapshot = (): Partial<UserProfile> | null => {
    const token = localStorage.getItem('vibechat_rejoin_token');
    if (!token) return null;

    const username = localStorage.getItem('vibechat_rejoin_username') || 'Guest';
    const type = (localStorage.getItem('vibechat_rejoin_type') as UserProfile['type']) || 'Guest';
    const gender = (localStorage.getItem('vibechat_rejoin_gender') as UserProfile['gender']) || 'Other';
    const city = localStorage.getItem('vibechat_rejoin_city') || detectedGeo.city || '';
    const state = localStorage.getItem('vibechat_rejoin_state') || detectedGeo.state || '';
    const country = localStorage.getItem('vibechat_rejoin_country') || detectedGeo.country || '';
    const ageValue = parseInt(localStorage.getItem('vibechat_rejoin_age') || '0', 10);
    const vipExpiresAt = localStorage.getItem('vibechat_rejoin_vipExpiresAt');
    const isModerator = localStorage.getItem('vibechat_rejoin_isModerator') === 'true';
    const photoVerified = localStorage.getItem('vibechat_rejoin_photoVerified') === 'true';

    return {
      id: localStorage.getItem('vibechat_rejoin_id') || '',
      username,
      type,
      gender,
      city,
      state,
      country,
      profilePic: localStorage.getItem('vibechat_rejoin_profilePic') || '',
      bio: localStorage.getItem('vibechat_rejoin_bio') || '',
      age: Number.isNaN(ageValue) ? undefined : ageValue,
      online: true,
      createdAt: localStorage.getItem('vibechat_rejoin_createdAt') || new Date().toISOString(),
      vipExpiresAt: vipExpiresAt || undefined,
      isModerator: isModerator || undefined,
      photoVerified: photoVerified || undefined,
      blockedUsers: []
    };
  };

  const attemptGuestRejoinFromStoredDevice = async (): Promise<boolean> => {
    const snapshot = loadRejoinSnapshot();
    const deviceId = typeof window !== 'undefined' ? localStorage.getItem('vibechat_device_id') : null;

    if (!snapshot || snapshot.type !== 'Guest' || !snapshot.username || !snapshot.id || !deviceId) {
      return false;
    }

    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: snapshot.username,
          gender: snapshot.gender,
          age: snapshot.age,
          city: snapshot.city,
          state: snapshot.state,
          country: snapshot.country,
          profilePic: snapshot.profilePic,
          deviceId
        })
      });

      if (!res.ok) {
        return false;
      }

      const body = await res.json();
      const updatedProfile = body.user;
      const token = body.token;
      if (!token || !updatedProfile) {
        return false;
      }

      localStorage.setItem('vibechat_token', token);
      tokenRef.current = token;
      setToken(token);
      saveRejoinSnapshot(updatedProfile, token);
      setMe(updatedProfile);
      setDetectedGeo({
        city: updatedProfile.city || snapshot.city || detectedGeo.city,
        state: updatedProfile.state || snapshot.state || detectedGeo.state,
        country: updatedProfile.country || snapshot.country || detectedGeo.country
      });
      fetchStats();
      showToast(`Welcome back! Restoring your previous guest profile as ${updatedProfile.username}.`);
      return true;
    } catch (e) {
      console.warn('[VibeChat Rejoin Error] Failed restoring guest session from stored device:', e);
      return false;
    }
  };

  const saveRejoinSnapshot = (profile: Partial<UserProfile>, token: string) => {
    if (!token) return;
    if (profile.id) {
      localStorage.setItem('vibechat_rejoin_id', profile.id);
    }
    localStorage.setItem('vibechat_rejoin_token', token);
    if (profile.username) {
      localStorage.setItem('vibechat_rejoin_username', profile.username);
    }
    localStorage.setItem('vibechat_rejoin_type', profile.type || 'Guest');
    if (profile.gender) {
      localStorage.setItem('vibechat_rejoin_gender', profile.gender);
    }
    if (profile.city) {
      localStorage.setItem('vibechat_rejoin_city', profile.city);
    }
    if (profile.state) {
      localStorage.setItem('vibechat_rejoin_state', profile.state);
    }
    if (profile.country) {
      localStorage.setItem('vibechat_rejoin_country', profile.country);
    }
    if (profile.bio) {
      localStorage.setItem('vibechat_rejoin_bio', profile.bio);
    }
    if (profile.age !== undefined) {
      localStorage.setItem('vibechat_rejoin_age', String(profile.age));
    }
    if (profile.profilePic) {
      localStorage.setItem('vibechat_rejoin_profilePic', profile.profilePic);
    }
    if (profile.vipExpiresAt) {
      localStorage.setItem('vibechat_rejoin_vipExpiresAt', profile.vipExpiresAt);
    }
    if (profile.isModerator) {
      localStorage.setItem('vibechat_rejoin_isModerator', String(profile.isModerator));
    }
    if (profile.photoVerified) {
      localStorage.setItem('vibechat_rejoin_photoVerified', String(profile.photoVerified));
    }
    if (profile.createdAt) {
      localStorage.setItem('vibechat_rejoin_createdAt', profile.createdAt);
    } else if (!localStorage.getItem('vibechat_rejoin_createdAt')) {
      localStorage.setItem('vibechat_rejoin_createdAt', new Date().toISOString());
    }
  };

  useEffect(() => {
    if (screen === 'lobby' && sidebarTab === 'people') {
      fetchStats();
    }
  }, [screen, sidebarTab]);

  useEffect(() => {
    if (!ws) return;
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'ping', data: {} }));
      }
    }, 20000); 
    return () => clearInterval(interval);
  }, [ws]);

  const fetchLatestProfile = async () => {
    // Read token from localStorage to avoid race condition with tokenRef sync
    const currentToken = getActiveAuthToken();
    if (!currentToken || currentToken.trim().length === 0) {
      clearAuthRetryTimer();
      return;
    }
    tokenRef.current = currentToken;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });

      if (res.ok) {
        const profile = await res.json();
        setMe(profile);
        saveRejoinSnapshot(profile, currentToken);
        if (profile.city && profile.state && profile.country) {
          setDetectedGeo({ city: profile.city, state: profile.state, country: profile.country });
        }
        connectWebSocket(profile.id, currentToken);

        const claimsRes = await fetch('/api/admin/payments', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }).catch(() => null);
        if (claimsRes && claimsRes.ok) {
          const payments = await claimsRes.json();
          const pending = payments.some((p: any) => p.userId === profile.id && p.status === 'Pending');
          setPaymentPending(pending);
        }

        const pRes = await fetch('/api/vip/plans').catch(() => null);
        if (pRes && pRes.ok) {
          setPlans(await pRes.json());
        }

        const qrRes = await fetch('/api/config/public', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }).catch(() => null);
        if (qrRes && qrRes.ok) {
          const config = await qrRes.json();
          setQrCodeUrl(config.qrCodeUrl);
        } else {
          setQrCodeUrl("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='200' height='200' fill='whitesmoke'/><rect x='20' y='20' width='40' height='40' fill='black'/><rect x='140' y='20' width='40' height='40' fill='black'/><rect x='20' y='140' width='40' height='40' fill='black'/><rect x='70' y='70' width='60' height='60' fill='indigo'/><text x='100' y='190' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23666'>VibeChat Official QR</text></svg>");
        }

      } else {
        console.error(`[VibeChat Auth Error] fetchLatestProfile responded with negative status: ${res.status}`);
        const rejoinToken = localStorage.getItem('vibechat_rejoin_token');
        if ((res.status === 401 || res.status === 403 || res.status === 404) && rejoinToken && rejoinToken !== currentToken) {
          console.warn('[VibeChat Auth Error] Primary token invalid. Retrying with rejoin token.');
          try { localStorage.setItem('vibechat_token', rejoinToken); } catch (e) {}
          tokenRef.current = rejoinToken;
          setToken(rejoinToken);
          return;
        }
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          console.warn('[VibeChat Auth Error] User credentials rejected. Attempting safe guest rejoin fallback...');
          clearAuthRetryTimer();
          const currentRejoinToken = localStorage.getItem('vibechat_rejoin_token');
          if (currentRejoinToken && currentRejoinToken === currentToken) {
            const restored = await attemptGuestRejoinFromStoredDevice();
            if (restored) {
              return;
            }
          }
          console.warn('[VibeChat Auth Error] User credentials rejected. Clearing active auth token.');
          localStorage.removeItem('vibechat_token');
          tokenRef.current = null;
          setToken(null);
          handleLogout();
        } else {
          console.warn('[VibeChat Auth Error] Server temporary issue. Preserving token and scheduling retry...');
          clearAuthRetryTimer();
          authRetryTimeoutRef.current = setTimeout(fetchLatestProfile, 4000);
        }
      }
    } catch (e) {
      console.error('[VibeChat Auth Network Error] fetchLatestProfile request threw an error:', e);
      clearAuthRetryTimer();
      authRetryTimeoutRef.current = setTimeout(fetchLatestProfile, 4000);
    }
  };

  const connectWebSocket = (userId: string, tokenOverride?: string) => {
    if (ws) return;

    const wsToken = tokenOverride || tokenRef.current || localStorage.getItem('vibechat_token');
    if (!wsToken) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?token=${wsToken}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('[VibeChat WebSocket] Connection established successfully.');
      setIsReconnecting(false);
      fetchStats();
    };

    socket.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data);

        if (event === 'welcome') {
          setGlobalStats(data.stats);
          setAnnouncement(data.announcement || '');
          if (data.announcement) {
            setNotifications(prev => [
              {
                id: `announcement-${Date.now()}`,
                type: 'system',
                title: '📢 System Announcement',
                msg: data.announcement,
                timestamp: 'Just now',
                read: false
              },
              ...prev
            ]);
          }
        } else if (event === 'stats:update') {
          setGlobalStats(data?.stats || data);
        } else if (event === 'auth:banned') {
          window.alert('You have been banned for violating the community rules. Your account is no longer existing because you have violated the community rules.');
          handleLogout();
        } else if (event === 'auth:deleted') {
          showToast('Your account was purged by an administrator.', true);
          handleLogout();
        } else if (event === 'vip:activated') {
          showToast(`👑 Royal VIP Activated Status: ${data.status}! Expiry: ${new Date(data.expiresAt).toLocaleDateString()}`);
          fetchLatestProfile();
          setPaymentPending(false);
          setNotifications(prev => [
            {
              id: `vip-approved-${Date.now()}`,
              type: 'vip_approval',
              title: '👑 VIP Status Approved!',
              msg: `Congratulations! Your payment receipt has been approved. You are now designated a Royal VIP with unlimited chat matching, geo targeting, and display crown.`,
              timestamp: 'Just now',
              read: false
            },
            ...prev
          ]);
        } else if (event === 'vip:revoked') {
          showToast('👑 Your Royal VIP subscription has expired.', true);
          fetchLatestProfile();
          setNotifications(prev => [
            {
              id: `vip-expired-${Date.now()}`,
              type: 'system',
              title: '👑 Royal VIP Expired',
              msg: 'Your Royal VIP subscription has reached its chronological expiration. Upgrade again to reload premium tools.',
              timestamp: 'Just now',
              read: false
            },
            ...prev
          ]);
        } else if (event === 'plans:update') {
          setPlans(data);
        } else if (event === 'profile:admin_force_updated') {
          setAdminChangesNotice(data);
          if (data.user) {
            setMe(data.user);
          }
          setNotifications(prev => [
            {
              id: `admin-update-${Date.now()}`,
              type: 'system',
              title: '⚙️ Profile Overridden by Admin',
              msg: `The system administrator modified aspects of your profile: ${data.changes.join(', ')}.`,
              timestamp: 'Just now',
              read: false
            },
            ...prev
          ]);
        } else if (event === 'config:update') {
          // Update platform config with new settings
          setPlatformConfig(data);
          
          if (data.announcement !== undefined && data.announcement !== announcement) {
            setAnnouncement(data.announcement);
            if (data.announcement) {
              setNotifications(prev => [
                {
                  id: `announcement-${Date.now()}`,
                  type: 'system',
                  title: '📢 Platform Announcement Updated',
                  msg: data.announcement,
                  timestamp: 'Just now',
                  read: false
                },
                ...prev
              ]);
            }
          }
          if (data.qrCodeUrl !== undefined) {
            setQrCodeUrl(data.qrCodeUrl);
          }
        } else if (event === 'call:request') {
          setIncomingCall({
            callerId: data.callerId,
            callerName: data.callerName,
            callerPic: data.callerPic,
            type: data.type,
            breakthrough: data.breakthrough
          });
        } else if (event === 'match:call_start') {
          setActiveCall({
            peerId: data.peerId,
            peerName: data.peerName,
            peerPic: data.peerPic,
            isCaller: !!data.isCaller,
            type: data.type || 'audio',
            peerCity: data.peerCity,
            peerState: data.peerState,
            peerCountry: data.peerCountry,
            // mark this call as originating from matchmaking pool
            isMatch: true
          });
          setIncomingCall(null);
          setOutgoingCall(null);
          showToast('Match found! Starting call...');
        } else if (event === 'call:response') {
          setOutgoingCall((prevOrig) => {
            if (data.accepted && prevOrig) {
              setActiveCall({
                peerId: prevOrig.targetId,
                peerName: prevOrig.targetName,
                peerPic: prevOrig.targetPic,
                isCaller: true,
                type: prevOrig.type
              });
              showToast('Stranger accepted call. Connecting lines...');
            } else if (!data.accepted) {
              showToast('Stranger rejected the call request.', true);
            }
            return null; 
          });
        }
      } catch (err) {
        console.error('[VibeChat WebSocket Message Parse Error] Failed handling server payload:', err);
      }
    };

    socket.onclose = (event) => {
      console.warn(`[VibeChat WebSocket] Connection closed (code: ${event.code}, reason: ${event.reason || 'none'}).`);
      setWs(null);
      
      const reconnectToken = tokenRef.current || localStorage.getItem('vibechat_token');
      if (reconnectToken) {
        setIsReconnecting(true);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (userId) {
            console.log('[VibeChat WebSocket] Launching reconnection attempt...');
            connectWebSocket(userId, reconnectToken);
          }
        }, 3000);
      }
    };

    socket.onerror = (e) => {
      console.error('[VibeChat WebSocket Error] Realtime connection failure detail:', e);
    };

    setWs(socket);
  };

  const closeSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (ws) {
      ws.close();
      setWs(null);
    }
    setIsReconnecting(false);
  };

  const handleGuestLogin = async (userName: string, gender: 'Male' | 'Female' | 'Other', age?: number, profilePic?: string) => {
    try {
      let lCity = detectedGeo.city;
      let lState = detectedGeo.state;
      let lCountry = detectedGeo.country;

      if (!lCity || lCity === 'Unknown City' || lCity === 'Detecting Location...' || !lState) {
        try {
          const resLoc = await fetch('/api/location/detect');
          const dataLoc = await resLoc.json();
          lCity = dataLoc.city || 'IP Location Pending';
          lState = dataLoc.state || 'IP Network';
          lCountry = dataLoc.country || 'IP Location';
        } catch (je) {
          console.warn('[VibeChat Geo Warning] Failed checking IP Geo on immediate guest login:', je);
          lCity = detectedGeo.city || 'IP Location Pending';
          lState = detectedGeo.state || 'IP Network';
          lCountry = detectedGeo.country || 'IP Location';
        }
      }

      let deviceId = localStorage.getItem('vibechat_device_id');
      if (!deviceId) {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          deviceId = crypto.randomUUID();
        } else {
          deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
        }
        localStorage.setItem('vibechat_device_id', deviceId);
      }

      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userName,
          gender,
          age,
          city: lCity,
          state: lState,
          country: lCountry,
          profilePic,
          deviceId
        })
      });

      if (res.ok) {
        const body = await res.json();
        localStorage.setItem('vibechat_token', body.token);
        setToken(body.token);
        saveRejoinSnapshot(body.user || {
          id: body.user?.id || '',
          username: userName,
          type: 'Guest',
          gender,
          city: lCity,
          state: lState,
          country: lCountry,
          profilePic: profilePic || '',
          age: age || undefined,
          bio: ''
        }, body.token);
        fetchStats();
        showToast(`Welcome Guest, ${userName}!`);
      } else {
        const err = await res.json();
        console.error('[VibeChat Guest Auth Rejection Detail]', err);
        if (err.error && err.error.includes('You have been banned')) {
          window.alert(err.error);
        } else {
          showToast(err.error || 'Guest login rejected.', true);
        }
      }
    } catch (e) {
      console.error('[VibeChat Guest Auth Exception Error]', e);
      showToast('Could not reach servers. Check internet connection.', true);
    }
  };

  const handleMemberLogin = async (credentials: { identifier: string; passwordPlain: string }) => {
    let cCity = detectedGeo.city;
    let cState = detectedGeo.state;
    let cCountry = detectedGeo.country;
    if (!cCity || cCity === 'Unknown City' || cCity === 'Detecting Location...' || !cState) {
      try {
        const resLoc = await fetch('/api/location/detect');
        const dataLoc = await resLoc.json();
        cCity = dataLoc.city || 'IP Location Pending';
        cState = dataLoc.state || 'IP Network';
        cCountry = dataLoc.country || 'IP Location';
      } catch (e) {
        cCity = detectedGeo.city || 'IP Location Pending';
        cState = detectedGeo.state || 'IP Network';
        cCountry = detectedGeo.country || 'IP Location';
      }
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: credentials.identifier,
        password: credentials.passwordPlain,
        city: cCity,
        state: cState,
        country: cCountry
      })
    });

    if (res.ok) {
      const body = await res.json();
      localStorage.setItem('vibechat_token', body.token);
      setToken(body.token);
      tokenRef.current = body.token;
      saveRejoinSnapshot(body.user, body.token);
      fetchStats();
      showToast(`Welcome Back, ${body.user.type === 'Admin' ? 'VibeChat ADMIN' : body.user.username}! Secure connection approved.`);
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Login rejection credentials');
    }
  };

  const handleMemberRegister = async (payload: any) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const body = await res.json();
      localStorage.setItem('vibechat_token', body.token);
      setToken(body.token);
      tokenRef.current = body.token;
      saveRejoinSnapshot(body.user, body.token);
      fetchStats();
      showToast(`Congratulations ${body.user.type === 'Admin' ? 'VibeChat ADMIN' : body.user.username}, account setup successful!`);
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Register validation failure');
    }
  };

  const handleLogout = () => {
    clearAuthRetryTimer();
    
    // Clear all auth tokens and session data
    localStorage.removeItem('vibechat_token');
    localStorage.removeItem('vibechat_saved_token');
    localStorage.removeItem('vibechat_saved_type');
    
    // Note: vibechat_rejoin_token and rejoin snapshot are preserved
    // so returning users can see "One-Click Rejoin" button on HomePage
    // Only the active session token is cleared.
    
    setToken(null);
    setMe(null);
    setScreen('lobby');
    setSidebarTab('people');
    closeSocket();
    setActiveCall(null);
    setIncomingCall(null);
    fetchStats();
    showToast('Securely disconnected from VibeChat Lobby');
  };

  const handleAutoLogin = (types: string[]) => {
    const savedToken = localStorage.getItem('vibechat_saved_token');
    const savedType = localStorage.getItem('vibechat_saved_type');
    if (savedToken && savedType && types.includes(savedType)) {
      localStorage.setItem('vibechat_token', savedToken);
      setToken(savedToken);
      return true;
    }
    return false;
  };

  const handleVipPaymentSubmit = async (planId: string, screenshotBase64: string) => {
    if (!token) return;

    const res = await fetch('/api/vip/pay', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planId, screenshotUrl: screenshotBase64 })
    });

    if (res.ok) {
      showToast('Billing invoice dispatched! Moderator review active.');
      setPaymentPending(true);
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Screenshot upload validation failed');
    }
  };

  const handleInitiateCall = (recipientId: string, type: 'audio' | 'video') => {
    if (!ws || !me) return;

    ws.send(JSON.stringify({
      event: 'call:request',
      data: { recipientId, type }
    }));

    setOutgoingCall({
      targetId: recipientId,
      targetName: 'Connecting...', 
      targetPic: '',
      type
    });
  };

  const handleAcceptCall = () => {
    if (!ws || !incomingCall) return;

    ws.send(JSON.stringify({
      event: 'call:response',
      data: { callerId: incomingCall.callerId, accepted: true }
    }));

    setActiveCall({
      peerId: incomingCall.callerId,
      peerName: incomingCall.callerName,
      peerPic: incomingCall.callerPic,
      isCaller: false,
      type: incomingCall.type
    });

    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    if (!ws || !incomingCall) return;

    ws.send(JSON.stringify({
      event: 'call:response',
      data: { callerId: incomingCall.callerId, accepted: false }
    }));

    setIncomingCall(null);
  };

  const handleHangupCall = () => {
    setActiveCall(null);
    showToast('Call Session Ended');
  };

  const handleNextStranger = () => {
    setActiveCall(null);
    // Trigger ChatInterface to search for next match
    const event = new CustomEvent('app:next_match', { detail: {} });
    window.dispatchEvent(event);
  };

  const [vipScrollToPlans, setVipScrollToPlans] = useState<boolean>(false);

  const triggerVipPage = () => {
    setVipScrollToPlans(true);
    setScreen('plans');
  };

  const isUserAdmin = me?.type === 'Admin';
  const isUserVIP = me?.type === 'Royal VIP' || me?.type === 'Admin' || me?.type === 'Moderator';

  return (
    <div id="app-root-container" className={`h-[100dvh] w-full max-w-[100vw] overflow-hidden font-sans antialiased flex flex-col justify-between theme-transition ${
      theme === 'light' 
        ? 'bg-slate-50 text-slate-800 app-theme-light' 
        : 'bg-[#0B0F19] text-stone-150 app-theme-dark'
    }`}>
      {/* VITAL LAYOUT FIX: Added flex-col to force strict vertical stacking and prevent intrinsic row blowout */}
      <div className="flex-1 flex flex-col w-full max-w-[100vw] h-full min-h-0 overflow-hidden relative">
       
      {toast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border text-xs font-semibold shadow-2xl flex items-center gap-2 max-w-sm animate-fade-in ${
          toast.isError
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            : 'bg-indigo-500/15 border-indigo-500/20 text-indigo-300'
        }`}>
          {toast.isError ? <AlertOctagon className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {activeCall && (
        <div className="modal-overlay bg-[#070B16] z-50">
          <div className="modal-card mx-auto w-full max-w-4xl h-full max-h-full md:h-auto md:max-h-[calc(100vh-4rem)] overflow-hidden min-h-0">
            <AudioVideoCall
              ws={ws}
              userId={me?.id || ''}
              peerId={activeCall.peerId}
              peerName={activeCall.peerName}
              peerPic={activeCall.peerPic}
              isCaller={activeCall.isCaller}
              callType={activeCall.type}
              onHangup={handleHangupCall}
              onOpenChat={() => setSidebarTab('chat')}
              peerCity={activeCall.peerCity}
              peerState={activeCall.peerState}
              peerCountry={activeCall.peerCountry}
              onNextMatch={activeCall?.isMatch ? handleNextStranger : undefined}
            />
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="modal-overlay bg-slate-950/80 backdrop-blur-sm z-50 animate-fade-in">
          <div className={`modal-card p-8 border rounded-3xl max-w-xs w-full max-h-[calc(100vh-4rem)] min-h-0 space-y-6 shadow-2xl relative ${theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-black'}`}>
            <div className="modal-card-body">
              <div className="relative mx-auto w-16 h-16">
                <span className="absolute inset-0 bg-violet-600/25 rounded-full animate-ping"></span>
                <img
                  src={incomingCall.callerPic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                  alt={incomingCall.callerName}
                  className="w-16 h-16 shrink-0 aspect-square rounded-full object-cover relative border border-violet-500/30"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                {incomingCall.breakthrough && (
                  <div className="absolute top-2 left-0 w-full flex justify-center -mt-6">
                    <span className="bg-amber-500 text-[9px] font-black tracking-widest text-white uppercase px-3 py-1 rounded-full shadow-lg flex items-center gap-1 mx-auto w-max">
                      <Sparkles className="w-3 h-3" /> VIP Breakthrough
                    </span>
                  </div>
                )}
                <h3 className={`text-lg font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{incomingCall.callerName}</h3>
                <p className={`text-[11px] font-semibold uppercase tracking-wider mt-1 flex items-center justify-center gap-1 ${theme === 'light' ? 'text-violet-600' : 'text-violet-400'}`}>
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  Incoming {incomingCall.type} Call
                </p>
              </div>
            </div>

            <div className="modal-card-footer flex gap-2">
              <button
                onClick={handleAcceptCall}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Accept Line
              </button>
              <button
                onClick={handleRejectCall}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {outgoingCall && (
        <div className="modal-overlay bg-slate-950/80 backdrop-blur-sm z-50 animate-fade-in">
          <div className={`modal-card p-8 border rounded-3xl max-w-xs w-full max-h-[calc(100vh-4rem)] min-h-0 space-y-6 shadow-2xl relative ${theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-black'}`}>
            <div className="modal-card-body">
              <div className="relative mx-auto w-16 h-16">
                <span className="absolute inset-0 bg-violet-600/25 rounded-full animate-ping"></span>
                <img
                  src={outgoingCall.targetPic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                  alt={outgoingCall.targetName}
                  className="w-16 h-16 shrink-0 aspect-square rounded-full object-cover relative border border-violet-500/30"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <h3 className={`text-lg font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{outgoingCall.targetName}</h3>
                <p className={`text-[11px] font-semibold uppercase tracking-wider mt-1 flex items-center justify-center gap-1 ${theme === 'light' ? 'text-violet-600' : 'text-violet-400'}`}>
                  <Phone className="w-3.5 h-3.5 animate-pulse" />
                  Calling...
                </p>
              </div>
            </div>

            <div className="modal-card-footer">
              <button
                onClick={() => setOutgoingCall(null)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!rulesAgreed && me && (
        <div className="modal-overlay bg-slate-950/90 backdrop-blur-md z-[110] animate-fade-in">
          <div className={`modal-card mx-auto w-full max-w-md max-h-[95vh] scrollbar-thin border rounded-3xl p-8 space-y-6 shadow-2xl relative text-center ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-xl rounded-full pointer-events-none"></div>
            
            <div className="text-4xl">📜</div>
            <div className="space-y-2">
              <h2 className={`text-2xl font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Community Rules & Guidelines</h2>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Please read and agree to our rules before accessing the chat companion dashboard.</p>
            </div>

            <div className={`p-4 rounded-2xl text-left space-y-3 pt-3 text-xs ${theme === 'light' ? 'bg-slate-50 border border-slate-200 text-slate-700' : 'bg-slate-950/60 border border-slate-800 text-slate-200'}`}>
              {[
                "1. Be respectful and kind to all members.",
                "2. No inappropriate or sexual content in profiles/public areas.",
                "3. No spam, fake accounts, or unsolicited promotions."
              ].map((rule, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-[13px]">{rule}</span>
                </div>
              ))}
            </div>

            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-bold tracking-wide">
              Violations may result in account suspension or permanent bans.
            </div>

            <button
              id="agree-rules-btn"
              onClick={() => {
                localStorage.setItem(`vibechat_rules_accepted_${me.id}`, 'true');
                setRulesAgreed(true);
              }}
              className="w-full py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-violet-500/15 cursor-pointer"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {adminChangesNotice && (
        <div className="modal-overlay bg-slate-950/85 backdrop-blur-md z-[160] animate-fade-in text-slate-100">
          <div className={`modal-card mx-auto w-full max-w-sm max-h-[90vh] border rounded-3xl p-6 relative shadow-2xl ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-xl' : 'bg-slate-905 border-slate-800 text-slate-100 shadow-black/90'
          }`}>
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500"></div>
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              
              <div>
                <h3 className={`text-lg font-black font-display tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  Profile Updated by Admin
                </h3>
                <p className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest mt-1">Admin Security Override</p>
              </div>
              
              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-200'}`}>
                A system administrator has reviewed and adjusted your profile settings to maintain network compliance:
              </p>
              
              <div className={`w-full border rounded-2xl p-4 text-left space-y-2 text-xs max-h-48 overflow-y-auto ${
                theme === 'light' ? 'bg-slate-50 border-slate-250 text-slate-700' : 'bg-slate-950/50 border-slate-800'
              }`}>
                {adminChangesNotice.changes.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500">✔</span>
                    <span className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>{change}</span>
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setAdminChangesNotice(null)}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl text-xs tracking-wider uppercase shadow-md transition duration-300 cursor-pointer active:scale-95 transform"
              >
                Acknowledge Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showOwnProfileModal && me && (
        <div className="modal-overlay bg-slate-950/80 backdrop-blur-sm z-[110] animate-fade-in text-slate-100">
          <div className={`modal-card mx-auto w-full max-w-lg max-h-[95vh] scrollbar-thin rounded-3xl p-6 relative shadow-2xl border transition duration-300 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 text-white shadow-black/80'
          }`}>
            <button
              onClick={() => setShowOwnProfileModal(false)}
              className={`absolute top-4 right-4 text-lg p-1 ${theme === 'light' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-200 hover:text-slate-300'}`}
            >
              ✕
            </button>
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 blur-xl rounded-full pointer-events-none"></div>
            
            <div className="modal-card-body">
              <form onSubmit={handleSaveProfile} className="space-y-3 font-display">
              <div className="text-center">
                <h3 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Edit Profile Info</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Manage Your Public Identity</p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <img 
                  src={editPic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                  alt="avatarpreview"
                  className="w-12 h-12 rounded-full object-cover border-2 border-violet-500/20"
                />
                <label className={`px-2 py-0.5 text-[9px] font-bold border rounded-lg transition cursor-pointer ${
                  theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-violet-400 border-slate-700'
                }`}>
                  Change picture
                  <input type="file" accept="image/png,image/jpeg" onChange={handleProfilePicUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-200'}`}>Display Username</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className={`w-full text-xs p-2 rounded-xl outline-none border transition ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 placeholder-slate-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500 placeholder-slate-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-200'}`}>Gender</label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as any)}
                      disabled={me?.type !== 'Admin'}
                      className={`w-full text-xs p-2 rounded-xl outline-none border transition ${
                        me?.type !== 'Admin' ? 'cursor-not-allowed opacity-70 ' + (theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400') : (theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500')
                      }`}
                      title={me?.type !== 'Admin' ? "Gender cannot be changed after registration" : "Admin override enabled"}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-200'}`}>Age</label>
                    <input
                      type="number"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      disabled={me?.type !== 'Admin'}
                      placeholder="Age"
                      className={`w-full text-xs p-2 rounded-xl outline-none border transition ${
                        me?.type !== 'Admin' ? 'cursor-not-allowed opacity-70 ' + (theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400') : (theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500')
                      }`}
                      title={me?.type !== 'Admin' ? "Age cannot be changed after registration" : "Admin override enabled"}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={`block text-[9px] uppercase font-extrabold tracking-wider mb-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-200'}`}>About Companion / Bio</label>
                  <textarea
                    rows={1}
                    value={editBio}
                    maxLength={MAX_BIO_LENGTH}
                    onChange={(e) => setEditBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                    placeholder="Type interesting details about yourself..."
                    className={`w-full text-xs p-2 rounded-xl outline-none border transition resize-none ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 placeholder-slate-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500 placeholder-slate-500'
                    }`}
                  />
                  <div className={`mt-2 text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {editBio.trim().length}/{MAX_BIO_LENGTH} characters
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className={`block text-[9px] uppercase font-extrabold tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-200'}`}>City</label>
                    {!isUserVIP && <span className="text-[8px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-bold uppercase">VIP Only</span>}
                  </div>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    disabled={!isUserVIP}
                    className={`w-full text-xs p-2 rounded-xl outline-none border transition ${
                      !isUserVIP ? 'cursor-not-allowed opacity-70 ' + (theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400') : (theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500')
                    }`}
                    title={!isUserVIP ? "Only VIP members can edit their location" : ""}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className={`block text-[9px] uppercase font-extrabold tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>State</label>
                    {!isUserVIP && <span className="text-[8px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-bold uppercase">VIP Only</span>}
                  </div>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    disabled={!isUserVIP}
                    className={`w-full text-xs p-2 rounded-xl outline-none border transition ${
                      !isUserVIP ? 'cursor-not-allowed opacity-70 ' + (theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400') : (theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500')
                    }`}
                    title={!isUserVIP ? "Only VIP members can edit their location" : ""}
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className={`block text-[9px] uppercase font-extrabold tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Country</label>
                    {!isUserVIP && <span className="text-[8px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-bold uppercase">VIP Only</span>}
                  </div>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    disabled={!isUserVIP}
                    className={`w-full text-xs p-2 rounded-xl outline-none border transition ${
                      !isUserVIP ? 'cursor-not-allowed opacity-70 ' + (theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400') : (theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500')
                    }`}
                    title={!isUserVIP ? "Only VIP members can edit their location" : ""}
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-500/10">
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`w-1/2 py-2 text-xs font-bold text-white rounded-xl shadow cursor-pointer transition hover:scale-[1.01] ${
                      theme === 'light' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/10' : 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/10'
                    }`}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOwnProfileModal(false)}
                    className={`w-1/2 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                      theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Back To Lobby
                  </button>
                </div>
                
                <div className="flex gap-2 justify-center items-center text-[10px]">
                  {!isUserVIP && (
                    <button
                      type="button"
                      onClick={() => { setShowOwnProfileModal(false); triggerVipPage(); }}
                      className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-bold rounded-lg transition text-center cursor-pointer"
                    >
                      👑 Upgrade to Royal VIP
                    </button>
                  )}
                  {isUserAdmin && (
                    <button
                      type="button"
                      onClick={() => { setShowOwnProfileModal(false); setScreen('admin'); }}
                      className="w-full py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-bold rounded-lg border border-rose-500/20 transition text-center cursor-pointer"
                    >
                      ⚙️ Admin Control Center
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {!token || !me ? (
        isAdminPortal ? (
          <AdminLoginPortal
            theme={theme}
            onBack={() => {
              setIsAdminPortal(false);
              try { window.history.pushState({ vibe_app: true }, '', '/'); } catch (e) {}
            }}
            onAdminSuccess={(adminToken, adminUser) => {
              localStorage.setItem('vibechat_token', adminToken);
              setToken(adminToken);
              setMe(adminUser);
              setScreen('admin');
            }}
          />
        ) : (
          <HomePage
            onGuestLogin={handleGuestLogin}
            onMemberLogin={handleMemberLogin}
            onMemberRegister={handleMemberRegister}
            onAdminAccess={() => setIsAdminPortal(true)}
            onAutoLogin={handleAutoLogin}
            stats={globalStats}
            announcement={announcement}
            detectedGeo={detectedGeo}
            theme={theme}
            onToggleTheme={() => {
              const nextTheme = theme === 'light' ? 'dark' : 'light';
              setTheme(nextTheme);
              localStorage.setItem('vibechat_theme', nextTheme);
            }}
            onRejoin={async () => {
              const snapshot = loadRejoinSnapshot();
              const hasStoredDevice = typeof window !== 'undefined' && !!localStorage.getItem('vibechat_device_id');

              if (snapshot?.type === 'Guest' && hasStoredDevice) {
                const restored = await attemptGuestRejoinFromStoredDevice();
                if (restored) {
                  setScreen('lobby');
                  setSidebarTab('people');
                  return;
                }
              }

              const tok = localStorage.getItem('vibechat_rejoin_token');
              if (tok) {
                try { localStorage.setItem('vibechat_token', tok); } catch (e) {}
                try { localStorage.setItem('vibechat_saved_token', tok); } catch (e) {}

                tokenRef.current = tok;
                setToken(tok);
                setScreen('lobby');
                setSidebarTab('people');

                if (snapshot) {
                  setMe(snapshot as UserProfile);
                  setDetectedGeo({
                    city: snapshot.city || detectedGeo.city,
                    state: snapshot.state || detectedGeo.state,
                    country: snapshot.country || detectedGeo.country
                  });
                }

                fetchLatestProfile();
                showToast('Welcome back! Restoring your People Lobby session.');
              } else {
                showToast('No stored guest session found. Please enter as guest.', true);
              }
            }}
          />
        )
      ) : (
        <div className="flex-1 min-h-0 flex flex-col justify-between w-full max-w-full">
          
          <header className={`border-b border-opacity-50 relative z-20 w-full ${
            theme === 'light' 
              ? 'bg-white border-slate-200 shadow-sm text-slate-800' 
              : 'bg-slate-900/80 border-slate-800 backdrop-blur-md text-stone-100'
          }`}>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between w-full">
              
              <button
                onClick={() => { setScreen('lobby'); setSidebarTab('people'); }}
                className="flex items-center gap-2 sm:gap-3 cursor-pointer text-left focus:outline-none shrink-0"
              >
                <VibeChatLogo className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" idPrefix="header" />
                <div className="block">
                  <span className={`text-lg sm:text-xl font-bold font-display tracking-tight block leading-none ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>VibeChat</span>
                  <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 block ${theme === 'light' ? 'text-blue-600' : 'text-indigo-400'}`}>WHERE STRANGERS MEET</span>
                </div>
              </button>

              <div className="hidden lg:flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 text-teal-500 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                  Online: <b>{globalStats?.totalOnline || 0}</b>
                </span>
                <span className="text-violet-500 px-3 py-1 bg-violet-500/5 rounded-full">
                  👦 Male: <b>{globalStats?.maleOnline || 0}</b>
                </span>
                <span className="text-cyan-500 px-3 py-1 bg-cyan-400/5 rounded-full">
                  👧 Female: <b>{globalStats?.femaleOnline || 0}</b>
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 relative shrink-0">
                
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotificationsDropdown(!showNotificationsDropdown);
                      if (!showNotificationsDropdown) {
                        const hasUnread = notifications.some(n => !n.read);
                        if (hasUnread) {
                          setNotifications(prev => prev.map(n => n.read ? n : { ...n, read: true }));
                        }
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition transition-all relative cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 border-slate-200 hover:bg-slate-200/60 text-slate-600'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title="Platform Notifications Center"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.some(n => !n.read) && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 shadow-[0_0_8px_#f43f5e]"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
                      </span>
                    )}
                  </button>

                  {showNotificationsDropdown && (
                    <div className={`fixed sm:absolute top-16 sm:top-full left-4 right-4 sm:left-auto sm:right-0 mt-2 sm:mt-3 sm:w-80 max-h-[80vh] sm:max-h-[400px] overflow-y-auto rounded-2xl shadow-2xl border z-[100] animate-fade-in origin-top-right ${
                      theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <div className={`p-4 border-b font-bold tracking-tight ${theme === 'light' ? 'border-slate-100 text-slate-800' : 'border-slate-800 text-white'}`}>
                        Notification Center
                      </div>
                      <div className="flex flex-col">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-slate-500">No new notifications.</div>
                        ) : (
                          notifications.map((notif: any) => (
                            <div key={notif.id} className={`p-4 border-b last:border-b-0 hover:bg-slate-800/10 dark:hover:bg-slate-800/50 transition cursor-default ${
                              theme === 'light' ? 'border-slate-50' : 'border-slate-800'
                            }`}>
                              <h4 className={`text-sm font-bold mb-1 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>{notif.title}</h4>
                              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>{notif.msg}</p>
                              <span className="text-[10px] uppercase font-bold text-violet-500 mt-2 block">{notif.timestamp}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    const nextTheme = theme === 'light' ? 'dark' : 'light';
                    setTheme(nextTheme);
                    localStorage.setItem('vibechat_theme', nextTheme);
                  }}
                  className={`p-2.5 rounded-xl border transition transition-all cursor-pointer flex items-center justify-center ${
                    theme === 'light'
                      ? 'bg-sky-50 border-sky-100 hover:bg-sky-100 text-sky-600'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 text-indigo-400 hover:text-indigo-400'
                  }`}
                  title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setShowOwnProfileModal(true)}
                  className={`p-1.5 sm:pr-3 rounded-xl border flex items-center gap-2 transition cursor-pointer max-w-[155px] ${
                    theme === 'light'
                      ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800'
                      : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-white'
                  }`}
                  title="View My Profile Card"
                >
                  <img
                    src={me.profilePic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                    alt={me.type === 'Admin' ? 'VibeChat ADMIN' : me.username}
                    className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 aspect-square rounded-full object-cover relative border border-violet-500/20"
                    referrerPolicy="no-referrer"
                  />
                  <span className="hidden sm:flex text-xs font-bold truncate max-w-[75px] uppercase tracking-wide leading-none items-center gap-1">
                    {me.type === 'Admin' ? 'ADMIN' : me.username}
                    {me.type === 'Royal VIP' && <span title="Royal VIP Member" className="text-amber-400">👑</span>}
                    {me.type === 'Moderator' && <span title="Moderator Member" className="text-indigo-400">🛡️</span>}
                    {me.type === 'Admin' && <span title="Administrator" className="text-slate-500">⚙️</span>}
                    {me.type === 'Registered' && <span title="Camera Verified Member">📸</span>}
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className={`p-2 sm:p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                    theme === 'light'
                      ? 'bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-600'
                      : 'bg-slate-800 border-slate-800 text-slate-400 hover:text-rose-400'
                  }`}
                  title="Force Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>

              </div>
            </div>
          </header>

          {isReconnecting && (
            <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 animate-pulse shrink-0 relative z-30 select-none shadow-[0_2px_10px_rgba(245,158,11,0.2)]">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping shrink-0 duration-1000"></span>
              <span>Reconnecting to VibeChat network... Restoring connection lobby streams automatically.</span>
            </div>
          )}

          {announcement && (
            <div className={`border-b w-full max-w-full ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-r from-violet-950/40 via-violet-900/10 to-transparent border-violet-500/20'}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 overflow-hidden flex items-center gap-3 w-full">
                <span className={`shrink-0 scale-95 uppercase text-[9px] font-extrabold tracking-widest px-2.5 py-0.5 rounded-full font-display animate-pulse ${theme === 'light' ? 'bg-blue-600/10 border border-blue-500/20 text-blue-600' : 'bg-violet-600/20 border border-violet-500/20 text-violet-400 glow-purple'}`}>Platform Announcement</span>
                <div className={`relative flex overflow-hidden text-xs select-none font-semibold flex-1 min-w-0 ${theme === 'light' ? 'text-slate-700' : 'text-violet-300'}`}>
                  <div className="animate-marquee whitespace-nowrap">
                    {announcement}
                  </div>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 min-h-0 py-0 sm:py-6 relative z-10 flex flex-col justify-center items-center overflow-hidden w-full max-w-full">
            <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-gradient-to-tr from-violet-600/5 via-indigo-600/3 to-transparent blur-[120px] pointer-events-none rounded-full"></div>
            
            <div className="max-w-4xl mx-auto w-full max-w-[100vw] px-0 sm:px-6 flex flex-col flex-1 min-h-0 max-h-[850px] overflow-hidden">
              
              <div className={`w-full max-w-full flex flex-col flex-1 min-h-0 sm:rounded-[2rem] overflow-hidden shadow-2xl transition duration-300 sm:border ${
                  theme === 'light'
                    ? 'bg-white/95 sm:bg-white/70 backdrop-blur-3xl sm:border-slate-200 shadow-indigo-500/10'
                    : 'bg-slate-950/95 sm:bg-[#0f172a]/40 backdrop-blur-3xl sm:border-violet-500/20 shadow-violet-500/20'
              }`}>
                {me.photoVerificationPending ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mb-6">
                      <Camera className="w-10 h-10 text-amber-500 animate-pulse" />
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-bold font-display tracking-tight mb-4 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Verification in Progress</h2>
                    <p className={`text-sm sm:text-base leading-relaxed max-w-md mx-auto ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                      Wait for a while so that admin will verify your profile. Your uploaded photo is securely stored for identity validation.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-h-0 flex flex-col w-full">
                      {screen === 'lobby' && (
                        <ChatInterface
                          ws={ws}
                          me={me}
                          token={token}
                          theme={theme}
                          wallpaper={wallpaper}
                          wallpaperOpacity={wallpaperOpacity}
                          handleWallpaperChange={handleWallpaperChange}
                          handleWallpaperOpacityChange={handleWallpaperOpacityChange}
                          failedWallpapers={failedWallpapers}
                          setFailedWallpapers={setFailedWallpapers}
                          PRESET_WALLPAPERS={PRESET_WALLPAPERS}
                          handleCustomWallpaperUpload={handleCustomWallpaperUpload}
                          onInitiateCall={handleInitiateCall}
                          onTriggerVipPage={triggerVipPage}
                          sidebarTab={sidebarTab}
                          setSidebarTab={setSidebarTab}
                          notifications={notifications}
                          setNotifications={setNotifications}
                          onEditProfile={() => setShowOwnProfileModal(true)}
                          setUnreadMessageCount={setUnreadChatCount}
                          onChatActiveChange={setIsChatActiveMobile}
                        />
                      )}
        
                      {screen === 'plans' && (
                        <VipPlansPage
                          onBack={() => { setScreen('lobby'); setSidebarTab('people'); }}
                          onSubmitPayment={handleVipPaymentSubmit}
                          plans={plans}
                          qrCodeUrl={qrCodeUrl}
                          paymentPending={paymentPending}
                          theme={theme}
                          autoScrollToPlans={vipScrollToPlans}
                        />
                      )}

                      {(screen === 'lobby' || screen === 'plans') && (
                        <nav className={`shrink-0 w-full max-w-full flex justify-between gap-1 p-1.5 sm:p-3 border-t transition duration-300 overflow-hidden ${isChatActiveMobile ? 'hidden md:flex' : ''} ${
                          theme === 'light' ? 'bg-white/50 backdrop-blur-md border-slate-200' : 'bg-slate-900/50 backdrop-blur-md border-violet-900/30'
                        }`}>
                          <button
                            onClick={() => { setScreen('lobby'); setSidebarTab('people'); setShowNotificationsDropdown(false); setShowOwnProfileModal(false); }}
                            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl transition cursor-pointer font-display ${
                              screen === 'lobby' && sidebarTab === 'people'
                                ? 'bg-violet-600/20 text-violet-400 shadow-inner'
                                : theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <Users className="w-5 h-5" />
                              {globalStats && (
                                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold px-0.5 shadow-sm border border-emerald-600">
                                  {globalStats.totalOnline}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-[8.5px] sm:text-[11px] lg:text-[12px] tracking-wide text-center leading-tight w-full truncate px-0.5">People</span>
                          </button>

                          <button
                            onClick={() => { setScreen('lobby'); setSidebarTab('chat'); setShowNotificationsDropdown(false); setShowOwnProfileModal(false); }}
                            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl transition cursor-pointer font-display ${
                              screen === 'lobby' && sidebarTab === 'chat'
                                ? 'bg-violet-600/20 text-violet-400 shadow-inner'
                                : theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <MessageSquare className="w-5 h-5" />
                              {unreadChatCount > 0 && (
                                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-bold px-0.5 shadow-sm border border-rose-600">
                                  {unreadChatCount}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-[8.5px] sm:text-[11px] lg:text-[12px] tracking-wide text-center leading-tight w-full truncate px-0.5">Chat</span>
                          </button>

                          <button
                            onClick={() => { setScreen('lobby'); setSidebarTab('lounge'); setShowNotificationsDropdown(false); setShowOwnProfileModal(false); }}
                            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl transition cursor-pointer font-display text-center ${
                              screen === 'lobby' && sidebarTab === 'lounge'
                                ? 'bg-violet-600/20 text-violet-400 shadow-inner'
                                : theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <Smile className="w-5 h-5 shrink-0" />
                            <span className="font-bold text-[8.5px] sm:text-[11px] lg:text-[12px] tracking-wide text-center leading-tight w-full truncate px-0.5">Matching Room</span>
                          </button>

                          <button
                            onClick={() => { setVipScrollToPlans(false); setScreen('plans'); setSidebarTab('vip'); setShowNotificationsDropdown(false); setShowOwnProfileModal(false); }}
                            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl transition cursor-pointer font-display ${
                              screen === 'plans'
                                ? 'bg-amber-500/10 text-amber-500 shadow-inner'
                                : theme === 'light' ? 'text-amber-600 hover:bg-amber-50' : 'text-amber-500 hover:bg-slate-800 hover:text-amber-400'
                            }`}
                          >
                            <Sparkles className="w-5 h-5 shrink-0" />
                            <span className="font-bold text-[8.5px] sm:text-[11px] lg:text-[12px] tracking-wide text-center leading-tight w-full truncate px-0.5">Upgrade VIP</span>
                          </button>
                        </nav>
                      )}
        
                      {screen === 'admin' && isUserAdmin && (
                        <AdminPanel
                          onBack={() => { setScreen('lobby'); setSidebarTab('people'); }}
                          onChatAsAdmin={() => { setScreen('lobby'); setSidebarTab('people'); }}
                          token={token}
                          theme={theme}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </main>

          {/* Footer - Only show before login on public pages */}
        </div>
      )}

      {showExitConfirm && (
        <div className={`modal-overlay text-center animate-fade-in ${theme === 'light' ? 'bg-slate-900/40 text-slate-900' : 'bg-slate-950/80 text-slate-100'}`}>
          <div className={`modal-card mx-auto p-8 border rounded-3xl max-w-sm w-full max-h-[90vh] space-y-6 shadow-2xl relative min-h-0 ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="modal-card-body">
              <div className="text-4xl mb-2">🚪</div>
              <h3 className={`text-xl font-bold font-display tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                Are you sure you want to quit?
              </h3>
              <p className={`text-sm mb-6 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                You are about to exit the application.
              </p>
            </div>
            <div className="modal-card-footer">
              <div className="flex gap-3 justify-center select-none">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition ${theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                >
                  No, Stay
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    handleLogout();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider transition"
                >
                  Yes, Quit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
  );
}