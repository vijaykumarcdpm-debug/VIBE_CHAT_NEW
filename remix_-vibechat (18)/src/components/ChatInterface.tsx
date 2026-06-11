import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  UserProfile, 
  ChatMessage, 
  RecentChat, 
  FriendRequest, 
  FriendRecord 
} from '../types';
import { formatLastSeen, formatJoinedDate } from '../lib/dateUtils';
import { 
  Search, 
  Sparkles, 
  Phone, 
  Video, 
  ShieldAlert, 
  Send, 
  Smile, 
  ChevronRight, 
  Lock, 
  Filter, 
  UserPlus, 
  Check, 
  X, 
  Eye, 
  MessageSquare,
  MoreVertical,
  Flag,
  UserX,
  Compass,
  CornerDownRight,
  ShieldCheck,
  AlertCircle,
  Users,
  Bell,
  User,
  Paperclip,
  Image as ImageIcon,
  Camera,
  Mic,
  ChevronLeft,
  Crown,
  Palette,
  CheckCheck,
  CornerUpLeft,
  Copy,
  Trash2
} from 'lucide-react';

interface ChatInterfaceProps {
  ws: WebSocket | null;
  me: UserProfile;
  token: string;
  theme?: 'light' | 'dark';
  wallpaper?: string | null;
  wallpaperOpacity?: number;
  handleWallpaperChange?: (url: string | null) => void;
  handleWallpaperOpacityChange?: (val: number) => void;
  failedWallpapers?: Set<string>;
  setFailedWallpapers?: React.Dispatch<React.SetStateAction<Set<string>>>;
  PRESET_WALLPAPERS?: { name: string; url: string }[];
  handleCustomWallpaperUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInitiateCall: (recipientId: string, type: 'audio' | 'video') => void;
  onTriggerVipPage: () => void;
  sidebarTab: 'people' | 'chat' | 'lounge' | 'vip';
  setSidebarTab: (tab: 'people' | 'chat' | 'lounge' | 'vip') => void;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  onEditProfile: () => void;
  setUnreadMessageCount?: (count: number) => void;
  onChatActiveChange?: (isActive: boolean) => void;
}

export default function ChatInterface({
  ws,
  me,
  token,
  theme = 'dark',
  wallpaper,
  wallpaperOpacity,
  handleWallpaperChange,
  handleWallpaperOpacityChange,
  failedWallpapers,
  setFailedWallpapers,
  PRESET_WALLPAPERS,
  handleCustomWallpaperUpload,
  onInitiateCall,
  onTriggerVipPage,
  sidebarTab,
  setSidebarTab,
  notifications,
  setNotifications,
  onEditProfile,
  setUnreadMessageCount,
  onChatActiveChange
}: ChatInterfaceProps) {
  // Navigation / View states
  // 'idle' | 'searching' | 'matched' | 'direct' (private conversations with friends/recents)
  const [chatState, setChatState] = useState<'idle' | 'searching' | 'matched' | 'direct'>('idle');
  const [activePartner, setActivePartner] = useState<Partial<UserProfile> | null>(null);
  const [inspectedPeer, setInspectedPeer] = useState<any | null>(null);

  const openModal = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    window.history.pushState({ modalOpen: true }, "");
    setter(value);
  };

  useEffect(() => {
    if (onChatActiveChange) {
      onChatActiveChange(!!activePartner);
    }
  }, [activePartner, onChatActiveChange]);

  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [activeMenuMessage, setActiveMenuMessage] = useState<ChatMessage | null>(null);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState<boolean>(false);
  const [showReportDialog, setShowReportDialog] = useState<boolean>(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    // Push dummy state to intercept back button
    window.history.pushState(null, '', window.location.pathname);

    const handlePopState = (e: PopStateEvent) => {
      // Re-push state so user doesn't leave on next back press
      window.history.pushState(null, '', window.location.pathname);
      
      if (activeMenuMessage) {
        setActiveMenuMessage(null);
      } else if (showReportDialog) {
        setShowReportDialog(false);
      } else if (showThemeModal) {
        setShowThemeModal(false);
      } else if (inspectedPeer) {
        setInspectedPeer(null);
      } else if (dropdownOpenRef.current) {
        setShowOptionsDropdown(false);
      } else if (chatState === 'matched' || chatState === 'direct') {
        handleExitChat();
        setSidebarTab('people');
        fetchSideData(); 
      } else if (sidebarTab !== 'people') {
        setSidebarTab('people');
      } else {
        setShowExitDialog(true);
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [chatState, inspectedPeer, showThemeModal, showReportDialog, activeMenuMessage, sidebarTab, setShowExitDialog]);
  const [callHistory, setCallHistory] = useState([
    { id: 1, peerName: 'Sarah Jenkins', peerPic: '', type: 'Video', direction: 'incoming', time: 'Today, 2:14 PM', duration: '12m 4s' },
    { id: 2, peerName: 'David Chen', peerPic: '', type: 'Audio', direction: 'outgoing', time: 'Yesterday, 6:30 PM', duration: '5m 18s' },
    { id: 3, peerName: 'Elena Rostova', peerPic: '', type: 'Video', direction: 'missed', time: 'June 2, 11:05 AM', duration: '0s' },
  ]);

  // Page audio recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Search overlay values
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [backendSearchResults, setBackendSearchResults] = useState<any[]>([]);
  const [isAdminEditing, setIsAdminEditing] = useState<boolean>(false);
  const [adminStatusMsg, setAdminStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [adminEditForm, setAdminEditForm] = useState({
    username: '',
    gender: 'Other',
    age: 18,
    bio: '',
    city: '',
    state: '',
    country: '',
    profilePic: '',
    type: 'Registered',
    isBanned: false
  });

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setBackendSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBackendSearchResults(data);
        }
      })
      .catch(err => console.error('Error during backend search fetch:', err));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, token]);
  const [inspectedFullDetails, setInspectedFullDetails] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // Admin Override Editor Handlers
  const startAdminEditing = () => {
    if (!inspectedPeer) return;
    setAdminEditForm({
      username: inspectedPeer.username || '',
      gender: inspectedFullDetails?.gender || inspectedPeer.gender || 'Other',
      age: Number(inspectedFullDetails?.age || inspectedPeer.age) || 18,
      bio: inspectedFullDetails?.bio || inspectedPeer.bio || '',
      city: inspectedFullDetails?.city || inspectedPeer.city || '',
      state: inspectedFullDetails?.state || inspectedPeer.state || '',
      country: inspectedFullDetails?.country || inspectedPeer.country || '',
      profilePic: inspectedPeer.profilePic || '',
      type: inspectedPeer.type || 'Registered',
      isBanned: !!inspectedPeer.isBanned
    });
    setIsAdminEditing(true);
  };

  const handleAdminFormAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAdminEditForm(prev => ({ ...prev, profilePic: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedPeer) return;

    const bioWords = adminEditForm.bio.trim().split(/\s+/).filter(w => w.length > 0);
    if (bioWords.length > 50) {
      setAdminStatusMsg({ text: 'Bio cannot exceed 50 words.', isError: true });
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
          userId: inspectedPeer.id,
          username: adminEditForm.username,
          gender: adminEditForm.gender,
          age: adminEditForm.age,
          bio: adminEditForm.bio,
          city: adminEditForm.city,
          state: adminEditForm.state,
          country: adminEditForm.country,
          profilePic: adminEditForm.profilePic,
          type: adminEditForm.type,
          isBanned: adminEditForm.isBanned
        })
      });

      if (res.ok) {
        setAdminStatusMsg({ text: 'Changes applied successfully!', isError: false });
        
        const updatedUser = {
          ...inspectedPeer,
          username: adminEditForm.username,
          gender: adminEditForm.gender,
          age: adminEditForm.age,
          bio: adminEditForm.bio,
          city: adminEditForm.city,
          state: adminEditForm.state,
          country: adminEditForm.country,
          profilePic: adminEditForm.profilePic,
          type: adminEditForm.type,
          isBanned: adminEditForm.isBanned
        };

        setInspectedPeer(updatedUser);
        setInspectedFullDetails(updatedUser);

        setTimeout(() => {
          setIsAdminEditing(false);
          setAdminStatusMsg(null);
        }, 1200);
      } else {
        const err = await res.json();
        setAdminStatusMsg({ text: err.error || 'Failed to update user profile via Admin override.', isError: true });
      }
    } catch (err) {
      console.error(err);
      setAdminStatusMsg({ text: 'Network error occurred during Admin profile override.', isError: true });
    }
  };

  // Menus
  const [partnerFocused, setPartnerFocused] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const dropdownOpenRef = useRef<boolean>(false);
  useEffect(() => {
    dropdownOpenRef.current = showOptionsDropdown;
  }, [showOptionsDropdown]);

  // Custom toast and dropdown/gallery outside click refs
  const [customToast, setCustomToast] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setCustomToast(msg);
    setTimeout(() => {
      setCustomToast(null);
    }, 2000);
  };

  const handleToggleOptionsDropdown = () => {
    if (!showOptionsDropdown) {
      window.history.pushState({ dropdownOpen: true }, "");
      setShowOptionsDropdown(true);
    } else {
      closeDropdownWithHistory();
    }
  };

  const closeDropdownWithHistory = () => {
    if (showOptionsDropdown) {
      setShowOptionsDropdown(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (showOptionsDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdownWithHistory();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showOptionsDropdown]);

  const [showGalleryMenu, setShowGalleryMenu] = useState<boolean>(false);

  useEffect(() => {
    function handleClickOutsideGallery(event: MouseEvent | TouchEvent) {
      if (showGalleryMenu && galleryRef.current && !galleryRef.current.contains(event.target as Node)) {
        setShowGalleryMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideGallery);
    document.addEventListener('touchstart', handleClickOutsideGallery);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideGallery);
      document.removeEventListener('touchstart', handleClickOutsideGallery);
    };
  }, [showGalleryMenu]);

  const [reportReason, setReportReason] = useState<string>('');

  const handleMessageReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    triggerToast('↩️ Loaded reply reference successfully');
  };

  const handleMessageCopy = (msg: ChatMessage) => {
    if (msg.content) {
      navigator.clipboard.writeText(msg.content)
        .then(() => {
          triggerToast('📋 Message copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          triggerToast('Could not copy message');
        });
    } else if (msg.type === 'voice') {
      triggerToast('Cannot copy audio voice memo text');
    } else {
      triggerToast('Cannot copy non-text file data');
    }
  };

  const handleMessageDelete = (msg: ChatMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        event: 'chat:delete_message',
        data: {
          messageId: msg.id,
          recipientId: activePartner?.id
        }
      }));
    }
    setHistoryMessages(prev => prev.filter(m => m.id !== msg.id));
    triggerToast('🗑️ Message deleted successfully.');
  };

  useEffect(() => {
    if (!ws || !activePartner) {
      setPartnerFocused(false);
      return;
    }
    
    // Join the focus room of the active partner
    try {
      ws.send(JSON.stringify({
        event: 'chat:focus',
        data: { recipientId: activePartner.id }
      }));
    } catch (e) {
      console.error(e);
    }
    
    // Clean up focus room on leave
    return () => {
      try {
        ws.send(JSON.stringify({
          event: 'chat:blur',
          data: { recipientId: activePartner.id }
        }));
      } catch (e) {
        console.error(e);
      }
      setPartnerFocused(false);
    };
  }, [activePartner, ws]);

  useEffect(() => {
    if (inspectedPeer || showThemeModal || showReportDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [inspectedPeer, showThemeModal, showReportDialog]);

  useEffect(() => {
    if (!inspectedPeer) {
      setInspectedFullDetails(null);
      return;
    }
    const fetchFullProfile = async () => {
      try {
        const res = await fetch(`/api/users/profile/${inspectedPeer.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const detail = await res.json();
          setInspectedFullDetails(detail);
        }
      } catch (e) {
        console.error('Failed fetching full companion profile details', e);
      }
    };
    fetchFullProfile();
  }, [inspectedPeer, token]);

  // Lists
  const [recents, setRecents] = useState<RecentChat[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [recentChatsLimitLocked, setRecentChatsLimitLocked] = useState<boolean>(false);

  useEffect(() => {
    if (setUnreadMessageCount) {
      const totalUnread = recents.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      setUnreadMessageCount(totalUnread);
    }
  }, [recents, setUnreadMessageCount]);

  // Filters (Royal VIP only)
  const [genderFilter, setGenderFilter] = useState<'Male' | 'Female' | 'Other' | 'None'>('None');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');

  // Senders / Inputs
  const [messageText, setMessageText] = useState<string>('');
  const [typing, setTyping] = useState<boolean>(false);
  const [peerTyping, setPeerTyping] = useState<boolean>(false);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  // Timing refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const isVIP = me.type === 'Royal VIP' || me.type === 'Admin';

  // Fetch initial side views data
  useEffect(() => {
    fetchSideData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);

  useEffect(() => {
    const handleHardwareBack = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (dropdownOpenRef.current) {
        setShowOptionsDropdown(false);
        if (window.history.state && window.history.state.dropdownOpen) {
          window.history.back();
        }
        if (customEvent && customEvent.detail) {
          customEvent.detail.handled = true;
        }
        return;
      }
      if (chatState !== 'idle') {
        handleExitChat();
        if (customEvent && customEvent.detail) {
          customEvent.detail.handled = true;
        }
      } else if (activePartner && sidebarTab === 'chat') {
        setActivePartner(null);
        if (customEvent && customEvent.detail) {
          customEvent.detail.handled = true;
        }
      }
    };
    window.addEventListener('app_hardware_back', handleHardwareBack);
    return () => window.removeEventListener('app_hardware_back', handleHardwareBack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState, sidebarTab, activePartner]);

  const fetchSideData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Recent Chats List
      const recentsRes = await fetch('/api/messages-list', { headers });
      if (!recentsRes.ok) throw new Error(`messages-list failed: ${recentsRes.status}`);
      const recentsData = await recentsRes.json();
      setRecents(recentsData.chats || []);
      setRecentChatsLimitLocked(recentsData.hasMore || false);

      // Online Users
      const onlineRes = await fetch('/api/users/online', { headers });
      if (!onlineRes.ok) throw new Error(`online users failed: ${onlineRes.status}`);
      setOnlineUsers(await onlineRes.json());
    } catch (e) {
      console.error('Error fetching chat lists', e);
    }
  };



  // Scroll message thread to bottom
  useEffect(() => {
    // Add small delay to ensure DOM updates layout, especially on mobile height metrics
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, [historyMessages, peerTyping]);

  // Handle incoming websocket real-time events for text communication
  useEffect(() => {
    if (!ws) return;

    const handleMessages = (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data);

        if (event === 'match:searching') {
          setChatState('searching');
        } else if (event === 'match:stopped') {
          setChatState('idle');
        } else if (event === 'match:success') {
          setActivePartner({
            id: data.peerId,
            username: data.peerName,
            gender: data.peerGender,
            type: data.peerType,
            profilePic: data.peerPic,
            city: data.peerCity,
            state: data.peerState,
            country: data.peerCountry
          });
          setHistoryMessages([]);
          setChatState('matched');
        } else if (event === 'chat:message') {
          // Message received from stranger/friend
          const incomingMsg: ChatMessage = data;
          
          // Verify if active dialog matches sender
          if (activePartner && activePartner.id === incomingMsg.senderId) {
            setHistoryMessages(prev => [...prev, incomingMsg]);
          } else {
            // Re-fetch side list to indicate unread count
            fetchSideData();
            // Dispatched and notify!
            setNotifications(prev => [
              {
                id: `msg-${Date.now()}`,
                type: 'message',
                title: '💬 New Chat Message',
                msg: `You received a new message: "${incomingMsg.content.slice(0, 30)}${incomingMsg.content.length > 30 ? '...' : ''}"`,
                timestamp: 'Just now',
                read: false
              },
              ...prev
            ]);
          }
        } else if (event === 'chat:delivered') {
          const deliveredMsg: ChatMessage = data;
          if (activePartner && activePartner.id === deliveredMsg.recipientId) {
            setHistoryMessages(prev => [...prev, deliveredMsg]);
          }
        } else if (event === 'chat:typing') {
          if (activePartner && activePartner.id === data.senderId) {
            setPeerTyping(!!data.typing);
          }
        } else if (event === 'chat:presence') {
          if (activePartner && activePartner.id === data.userId) {
            setPartnerFocused(!!data.focusing);
          }
        } else if (event === 'chat:delete_message') {
          setHistoryMessages(prev => prev.filter(m => m.id !== data.messageId));
        } else if (event === 'chat:delete_message_confirmed') {
          setHistoryMessages(prev => prev.filter(m => m.id !== data.messageId));
        } else if (event === 'chat:blocked') {
          setSystemAlert('Conversation finished. This peer has blocked communications.');
        } else if (event === 'friend:request') {
          fetchSideData();
          setNotifications(prev => [
            {
              id: `req-${Date.now()}`,
              type: 'friend_request',
              title: '👤 New Friend Request',
              msg: 'You have a new companion match request! Open the Friends panel to view and accept.',
              timestamp: 'Just now',
              read: false
            },
            ...prev
          ]);
        } else if (event === 'friend:accepted') {
          fetchSideData();
          setNotifications(prev => [
            {
              id: `acc-${Date.now()}`,
              type: 'friend_accept',
              title: '🤝 Friend Connected!',
              msg: 'A matching request has been mutually agreed. Chat logs are now unlocked.',
              timestamp: 'Just now',
              read: false
            },
            ...prev
          ]);
        } else if (event === 'friend:removed') {
          fetchSideData();
        } else if (event === 'stats:update') {
          fetchSideData();
        }
      } catch (err) {
        console.error('Websocket chat handler failed: ', err);
      }
    };

    ws.addEventListener('message', handleMessages);
    return () => {
      ws.removeEventListener('message', handleMessages);
    };
  }, [ws, activePartner]);

  // Fetch Message History on direct peer click
  const handleOpenConversation = async (peer: { id: string; username: string; gender: any; type: any; profilePic: string; city?: string; state?: string; country?: string }) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`/api/messages/${peer.id}`, { headers });
      
      if (res.ok) {
        const msgs = await res.json();
        setHistoryMessages(msgs);
        setActivePartner(peer as any);
        setChatState('direct');
        setSystemAlert(null);
        setSidebarTab('chat');
        fetchSideData(); // clear unread count in side menu
      } else {
        const errData = await res.json();
        if (errData.isLocked) {
          onTriggerVipPage();
        } else {
          console.error(errData.error);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // MATCH POOL CONSTRAINTS
  const handleStartMatching = () => {
    if (!ws) return;

    // Check VIP features trigger filters
    if (!isVIP && (genderFilter !== 'None' || cityFilter || stateFilter || countryFilter)) {
      onTriggerVipPage();
      return;
    }

    const filters: any = {};
    if (genderFilter !== 'None') filters.gender = genderFilter;
    if (cityFilter.trim()) filters.city = cityFilter.trim();
    if (stateFilter.trim()) filters.state = stateFilter.trim();
    if (countryFilter.trim()) filters.country = countryFilter.trim();

    ws.send(JSON.stringify({
      event: 'match:start',
      data: { filters }
    }));
  };

  const handleCancelMatching = () => {
    if (!ws) return;
    ws.send(JSON.stringify({ event: 'match:cancel', data: {} }));
  };

  const handleNextStranger = () => {
    setChatState('idle');
    setActivePartner(null);
    setHistoryMessages([]);
    setTimeout(() => {
      handleStartMatching();
    }, 100);
  };

  const handleExitChat = () => {
    setChatState('idle');
    setActivePartner(null);
    setHistoryMessages([]);
  };

  // DISPATCH SEND MESSAGE
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws || !activePartner || !messageText.trim()) return;

    let finalContent = messageText.trim();
    if (replyingTo) {
      const parentClipText = replyingTo.content || (replyingTo.type === 'voice' ? 'Voice memo' : 'File attachment');
      finalContent = `↩️ Replying to: "${parentClipText}"\n\n${finalContent}`;
    }

    ws.send(JSON.stringify({
      event: 'chat:message',
      data: {
        recipientId: activePartner.id,
        content: finalContent
      }
    }));

    setMessageText('');
    setReplyingTo(null);
    
    // Reset typing trigger
    if (typing) {
      ws.send(JSON.stringify({
        event: 'chat:typing',
        data: { recipientId: activePartner.id, typing: false }
      }));
      setTyping(false);
    }
  };

  // Dispatch typing status indicator
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (!ws || !activePartner) return;

    if (!typing) {
      setTyping(true);
      ws.send(JSON.stringify({
        event: 'chat:typing',
        data: { recipientId: activePartner.id, typing: true }
      }));
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      ws.send(JSON.stringify({
        event: 'chat:typing',
        data: { recipientId: activePartner.id, typing: false }
      }));
      setTyping(false);
    }, 1500) as any;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'voice' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !activePartner?.id || !ws) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      ws.send(JSON.stringify({ 
        event: 'chat:message',
        data: { recipientId: activePartner.id, content: '', mediaUrl: base64, type: mediaType } 
      }));
      setHistoryMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        senderId: me.id,
        recipientId: activePartner.id!,
        content: '',
        mediaUrl: base64,
        type: mediaType,
        timestamp: Date.now(),
        read: true
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // IN-CHAT LOBBY VOICE RECORDING LOGIC
  const startPageRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const compiledBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(compiledBlob);
        
        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioBlob(null);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or failing: ", err);
      alert("Microphone permission denied or unsupported in this browser.");
    }
  };

  const stopPageRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelPageRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const sendRecordedVoiceMessage = () => {
    const blobToSend = audioBlob;
    if (!blobToSend || !activePartner?.id || !ws) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      ws.send(JSON.stringify({ 
        event: 'chat:message',
        data: { recipientId: activePartner.id, content: '', mediaUrl: base64, type: 'voice' } 
      }));
      setHistoryMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        senderId: me.id,
        recipientId: activePartner.id!,
        content: '',
        mediaUrl: base64,
        type: 'voice',
        timestamp: Date.now(),
        read: true
      }]);
    };
    reader.readAsDataURL(blobToSend);
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  // BLOCK / COMMUNICATE BLOCKS
  const handleBlockUser = async () => {
    if (!activePartner) return;
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: activePartner.id })
      });
      if (res.ok) {
        setSystemAlert('User has been blocked. purges chat streams next.');
        setTimeout(() => {
          handleExitChat();
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnblockUser = async () => {
    if (!activePartner) return;
    try {
      const res = await fetch('/api/blocks/unblock', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: activePartner.id })
      });
      if (res.ok) {
        setSystemAlert(`User unblocked successfully.`);
        setTimeout(() => setSystemAlert(null), 3000);
        // Optimistically mutate local user memory (a bit hacky but works for UI)
        if (me.blockedUsers) {
          me.blockedUsers = me.blockedUsers.filter(id => id !== activePartner.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // SUBMIT COMPLAINT REPORT
  const handleReportUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner || !reportReason.trim()) return;

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportedId: activePartner.id, reason: reportReason.trim() })
      });
      if (res.ok) {
        setSystemAlert('Report submitted successfully. Safe mode activated.');
        setShowReportDialog(false);
        setReportReason('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFilterClick = (filterType: string) => {
    if (!isVIP) {
      onTriggerVipPage();
    }
  };

  // Filter and Sort Recents list by VIP status (VIP priority), then peer name or last msg
  let filteredRecents = recents
    .filter(rc => {
      const term = searchQuery.toLowerCase().trim();
      if (!term) return true;
      return rc.peerName.toLowerCase().includes(term) || (rc.peerCity && rc.peerCity.toLowerCase().includes(term));
    })
    .sort((a, b) => {
      // 1: Pinned Unread VIP Messages
      const aIsUnreadVIP = a.unreadCount > 0 && (a.peerType === 'Royal VIP' || a.peerType === 'Admin');
      const bIsUnreadVIP = b.unreadCount > 0 && (b.peerType === 'Royal VIP' || b.peerType === 'Admin');
      if (aIsUnreadVIP && !bIsUnreadVIP) return -1;
      if (!aIsUnreadVIP && bIsUnreadVIP) return 1;

      // 2: Type priority
      const getPriority = (type: string) => {
        if (type === 'Admin') return 5;
        if (type === 'Moderator') return 4;
        if (type === 'Royal VIP') return 3;
        if (type === 'Registered') return 2;
        return 1; // Guest
      };
      const prioDiff = getPriority(b.peerType) - getPriority(a.peerType);
      if (prioDiff !== 0) return prioDiff;

      // 3: Timestamp (newest first)
      return b.timestamp - a.timestamp;
    });

  const isUserVIP = me.type === 'Royal VIP' || me.type === 'Admin';
  const hasHiddenChats = !isUserVIP && filteredRecents.length > 4;
  if (!isUserVIP) {
    filteredRecents = filteredRecents.slice(0, 4);
  }

  // Filter and Sort Online list by VIP status (VIP priority)
  const filteredOnline = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (term) {
      return backendSearchResults.filter(ou => (me.type === 'Admin' || ou.id !== me.id) && !me.blockedUsers?.includes(ou.id));
    }

    const allKnownUsers = new Map<string, any>();
    recents.forEach(r => {
      allKnownUsers.set(r.peerId, {
        id: r.peerId,
        username: r.peerName,
        gender: r.peerGender,
        type: r.peerType,
        profilePic: r.peerPic,
        city: r.peerCity || '',
        state: r.peerState || '',
        country: r.peerCountry || '',
        online: false,
        lastSeenAt: r.peerLastSeenAt
      });
    });
    onlineUsers.forEach(ou => {
      allKnownUsers.set(ou.id, { ...ou, online: true });
    });

    // Offline users only appear in search
    const mergedUsers = Array.from(allKnownUsers.values())
      .filter(ou => (me.type === 'Admin' || ou.id !== me.id) && !me.blockedUsers?.includes(ou.id))
      .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));

    return mergedUsers
      .filter(ou => {
        const term = searchQuery.toLowerCase().trim();
        if (!term) return ou.online;
        return (ou.type === 'Admin' ? 'VibeChat ADMIN' : ou.username).toLowerCase().includes(term) || (ou.city && ou.city.toLowerCase().includes(term));
      })
      .sort((a, b) => {
        // Me first
        if (a.id === me.id && b.id !== me.id) return -1;
        if (b.id === me.id && a.id !== me.id) return 1;
        // Online users first
        if (a.online !== b.online) {
          return a.online ? -1 : 1;
        }
        const getPriority = (type: string) => {
          if (type === 'Admin') return 5;
          if (type === 'Moderator') return 4;
          if (type === 'Royal VIP') return 3;
          if (type === 'Registered') return 2;
          return 1; // Guest
        };
        return getPriority(b.type) - getPriority(a.type); // VIPs appear higher
      });
  }, [recents, onlineUsers, searchQuery, me.id, me.blockedUsers, backendSearchResults]);

  const showLeftSidebar = sidebarTab === 'people' || (sidebarTab === 'chat' && !activePartner);
  const showMainChatPane = sidebarTab === 'lounge' || (sidebarTab === 'chat' && activePartner != null);

  return (
    <div className="flex flex-1 min-h-0 w-full bg-transparent">
      
      {/* SIDE BAR LAYOUT: RECENT CHATS & FRIENDS LIST */}
      <div className={`${showLeftSidebar ? 'flex w-full md:w-[420px] lg:w-[500px]' : 'hidden md:flex md:w-[420px] lg:w-[500px]'} shrink-0 flex flex-col min-h-0 flex-1 transition-all duration-300 ${
        theme === 'light'
          ? 'bg-white/50 border-r border-slate-200'
          : 'bg-slate-950/60 border-r border-violet-900/30'
      }`}>
          
          {/* USER PROFILE INFO SECTION */}
          <div className={`p-4 border-b flex items-center justify-between transition duration-300 ${
            theme === 'light' 
              ? 'bg-slate-100/60 border-slate-200 text-slate-900' 
              : 'bg-slate-950/60 border-slate-800 text-white'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <img 
                  src={me.profilePic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                  alt={me.username}
                  className="w-10 h-10 shrink-0 aspect-square rounded-full object-cover border border-violet-500/20 shadow-md"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-900 rounded-full"></span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-bold block truncate ${theme === 'light' ? 'text-slate-900' : 'text-stone-100'}`}>
                    {me.type === 'Admin' ? 'VibeChat ADMIN' : me.username}
                  </span>
                  {me.type === 'Royal VIP' && (
                    <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded font-extrabold uppercase shrink-0">👑 VIP</span>
                  )}
                  {me.type === 'Moderator' && (
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 rounded font-extrabold uppercase shrink-0">🛡️ MODERATOR</span>
                  )}
                  {me.type === 'Admin' && (
                    <span className="text-[8px] bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20 px-1 rounded font-extrabold uppercase shrink-0" title="Platform Administrator">⚙️ ADMIN</span>
                  )}
                </div>
              </div>
            </div>

            <span className={`text-[9px] font-extrabold px-2 py-1 rounded-lg ${
              theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-violet-950/45 text-violet-400 border border-violet-500/15'
            }`}>
              {me.gender || 'Companion'}
            </span>
          </div>


          {/* Search Box: filters users on current lists */}
          <div className={`p-3 border-b ${theme === 'light' ? 'border-slate-200 bg-slate-50/30' : 'border-slate-800/60 bg-slate-950/20'}`}>
            <div className="relative">
              <Search className={`absolute left-3 top-2.5 w-3.5 h-3.5 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                placeholder={
                  sidebarTab === 'chat' ? "Search dynamic chats by name or city..." :
                  sidebarTab === 'people' ? "Search online list by name or city..." :
                  "Search..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl focus:outline-none transition border ${
                  theme === 'light'
                    ? 'bg-white border-slate-200 text-slate-900 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 placeholder-slate-400'
                    : 'bg-slate-950/70 border-slate-800 text-white focus:border-violet-500 placeholder-slate-500'
                }`}
              />
            </div>
          </div>
          {/* Collapsible list body containing current active tab data */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/20 scrollbar-thin">
            
            {/* 1. CHAT TAB VIEW */}
            {sidebarTab === 'chat' && (
              <div className="p-3 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className={`text-[9px] uppercase font-bold tracking-wider font-display shrink-0 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Recent Chat Conversations
                  </h3>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-rose-500/10 text-rose-500 border-rose-500/20 shrink-0">
                      {recents.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)} New Messages
                    </span>
                    <span className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-400/10 shrink-0">LIMITS ENABLED</span>
                  </div>
                </div>
                
                {filteredRecents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 italic">No recent chats matching filter.</div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecents.map((rc) => {
                      const isMsgVIP = rc.peerType === 'Royal VIP';
                      const activeState = (activePartner && activePartner.id === rc.peerId) && (chatState === 'direct' || chatState === 'matched');
                      
                      return (
                        <div
                          key={rc.peerId}
                          className={`w-full text-left p-4 sm:p-5 lg:p-6 rounded-2xl transition flex justify-between items-center gap-4 border ${
                            activeState 
                              ? (theme === 'light'
                                  ? 'bg-sky-50 border-sky-200 text-sky-950 font-bold'
                                  : 'bg-violet-950/20 border-violet-500 text-white pl-5')
                              : (theme === 'light'
                                  ? 'border-transparent hover:bg-slate-100 text-slate-700 font-medium'
                                  : 'border-transparent hover:bg-slate-900/40 text-slate-300')
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenConversation({
                              id: rc.peerId,
                              username: rc.peerName,
                              gender: rc.peerGender,
                              type: rc.peerType,
                              profilePic: rc.peerPic,
                              city: rc.peerCity,
                              state: rc.peerState,
                              country: rc.peerCountry
                            })}
                            className="flex items-center gap-4 min-w-0 flex-grow text-left cursor-pointer"
                          >
                            <img 
                              src={rc.peerPic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23666'/></svg>`} 
                              alt={rc.peerName} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedPeer({
                                  id: rc.peerId,
                                  username: rc.peerName,
                                  gender: rc.peerGender,
                                  type: rc.peerType,
                                  profilePic: rc.peerPic,
                                  city: rc.peerCity,
                                  state: rc.peerState,
                                  country: rc.peerCountry
                                });
                              }}
                              className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 aspect-square rounded-full object-cover border border-violet-500/10 hover:ring-2 hover:ring-violet-500 transition duration-150" 
                              referrerPolicy="no-referrer"
                              title="Click to view detailed profile info"
                            />
                            <div className="min-w-0 flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-base font-bold max-w-[200px] truncate block ${
                                  theme === 'light' ? 'text-slate-800' : 'text-stone-100'
                                } ${isMsgVIP ? 'text-violet-400' : ''}`}>
                                  {rc.peerType === 'Admin' ? 'VibeChat ADMIN' : rc.peerName}
                                </span>
                                {isMsgVIP && <span title="Royal VIP Creator" className="text-[13px] text-amber-400 select-none">👑</span>}
                                {rc.peerType === 'Moderator' && <span title="Moderator Badge" className="text-[13px] text-indigo-400 select-none">🛡️</span>}
                                {rc.peerType === 'Admin' && <span title="Platform Administrator" className="text-[13px] text-slate-500 dark:text-slate-400 select-none">⚙️</span>}
                                {rc.peerType === 'Registered' && <span title="Camera Verified" className="text-[13px] select-none">📸</span>}
                                {rc.unreadCount > 0 && (
                                  <span className="relative flex h-3 w-3 shrink-0 ml-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 shadow-[0_0_8px_#f43f5e]"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-slate-500 truncate block font-medium max-w-[220px]">{rc.lastMessage}</span>
                            </div>
                          </button>

                          <div className="flex items-center gap-1">
                            {rc.unreadCount > 0 && (
                              <span className="flex items-center gap-0.5 font-mono text-[10px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.15)] shrink-0">
                                🔴 {rc.unreadCount}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setInspectedPeer({
                                id: rc.peerId,
                                username: rc.peerName,
                                gender: rc.peerGender,
                                type: rc.peerType,
                                profilePic: rc.peerPic,
                                city: rc.peerCity,
                                state: rc.peerState,
                                country: rc.peerCountry
                              })}
                              className={`p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 opacity-40 hover:opacity-100 transition`}
                              title="Inspect Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isUserVIP && (
                  <button
                    onClick={onTriggerVipPage}
                    className={`w-full mt-3 p-3 border border-dashed rounded-xl text-center space-y-2 block transition cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-violet-50 border-violet-300 hover:bg-violet-100' 
                        : 'bg-violet-950/20 border-violet-500/30 hover:bg-violet-900/20'
                    }`}
                  >
                    <div className={`flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest font-display ${theme === 'light' ? 'text-violet-700' : 'text-violet-400'}`}>
                      <Crown className="w-4 h-4 mb-0.5" />
                      <span>Upgrade to VIP</span>
                    </div>
                    <p className={`text-[11px] font-bold leading-relaxed px-1 ${theme === 'light' ? 'text-violet-900' : 'text-violet-100'}`}>
                      If you want to unlock all recent features, just upgrade to VIP.
                    </p>
                  </button>
                )}
              </div>
            )}

            {/* 2. ONLINE TAB VIEW */}
            {sidebarTab === 'people' && (
              <div className="p-3 space-y-4">
                
                {/* Active Online lists */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-[9px] uppercase font-bold tracking-wider font-display ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Platform Directory
                    </h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {filteredOnline.filter(ou => ou.online).length} Active Now
                    </span>
                  </div>

                  {filteredOnline.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 italic">No users are currently online.</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOnline.map((ou) => {
                        const activeState = (activePartner && activePartner.id === ou.id) && (chatState === 'direct' || chatState === 'matched');
                        return (
                          <div key={ou.id} className="flex items-center justify-between group">
                            <button
                              onClick={() => handleOpenConversation(ou)}
                              className={`flex-grow text-left p-4 sm:p-5 lg:p-6 rounded-2xl transition flex items-center gap-4 cursor-pointer border ${
                                activeState 
                                  ? (theme === 'light' ? 'bg-sky-50 border-sky-100 text-sky-950 font-bold' : 'bg-slate-800 text-white border-violet-500/30') 
                                  : (theme === 'light' ? 'border-transparent hover:bg-slate-100' : 'border-transparent hover:bg-slate-900/40')
                              }`}
                            >
                              <div className="relative shrink-0">
                                <img 
                                  src={ou.profilePic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`} 
                                  alt={ou.username} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openModal(setInspectedPeer, ou);
                                  }}
                                  className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 aspect-square rounded-full object-cover border border-violet-500/15 hover:ring-2 hover:ring-violet-500 transition duration-150" 
                                />
                                <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${ou.online ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              </div>
                              <div className="min-w-0 flex flex-col justify-center gap-1">
                                <span className={`text-base font-bold flex items-center gap-1.5 ${
                                  theme === 'light' ? 'text-slate-800' : 'text-stone-100'
                                } ${ou.type === 'Royal VIP' ? 'text-violet-400' : ''} ${ou.type === 'Moderator' ? 'text-indigo-400' : ''} ${ou.type === 'Admin' ? 'text-slate-500 dark:text-slate-400' : ''}`}>
                                  <span className="truncate max-w-[200px] block">{ou.type === 'Admin' ? 'VibeChat ADMIN' : ou.username}</span>
                                  {ou.type === 'Royal VIP' && <span title="Royal VIP" className="text-[13px] text-amber-400 select-none">👑</span>}
                                  {ou.type === 'Moderator' && <span title="Moderator Badge" className="text-[13px] select-none">🛡️</span>}
                                  {ou.type === 'Admin' && <span title="Platform Administrator" className="text-[13px] text-slate-500 dark:text-slate-400 select-none">⚙️</span>}
                                  {ou.type === 'Registered' && <span title="Camera Verified" className="text-[13px] select-none">📸</span>}
                                </span>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* 3. LOUNGE TAB VIEW */}
            {sidebarTab === 'lounge' && (
              <div className="p-3 py-10 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-violet-500/20 rounded-full flex items-center justify-center">
                  <Smile className="w-8 h-8 text-violet-400" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold font-display ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    Match Room Lounge
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-[220px] mx-auto leading-relaxed">
                    Use the matching panel on the right to discover and connect with new people instantly.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* MAIN CHAT PANE */}
        <div className={`${showMainChatPane ? 'flex w-full' : 'hidden'} flex-1 flex-col justify-between min-h-0 relative min-w-0`}>
               {/* COMPANION HEADER FRAME */}
          <div className={`p-4 sm:p-5 md:p-6 lg:py-5 lg:px-8 border-b flex justify-between items-center relative z-[80] gap-4 shrink-0 transition duration-300 flex-nowrap ${
            theme === 'light'
              ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
              : 'bg-slate-900/50 backdrop-blur border-slate-800 text-white'
          }`}>
            {chatState === 'matched' || chatState === 'direct' ? (
              <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                <button
                  onClick={handleExitChat}
                  className={`p-2 -ml-2 rounded-xl transition cursor-pointer ${
                    theme === 'light' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="relative">
                  <img
                    src={activePartner?.profilePic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                    alt={activePartner?.username || 'Companion'}
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 shrink-0 aspect-square rounded-full object-cover border border-violet-500/30"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" title="Online Status: Connected"></span>
                </div>
 
                <div className="min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-base sm:text-lg lg:text-xl truncate flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {activePartner?.type === 'Admin' ? 'VibeChat ADMIN' : activePartner?.username}
                      {activePartner?.type === 'Royal VIP' && <span className="text-amber-400" title="Royal VIP">👑</span>}
                      {activePartner?.type === 'Moderator' && <span className="text-indigo-400" title="Moderator Badge">🛡️</span>}
                      {activePartner?.type === 'Admin' && <span className="text-slate-500 dark:text-slate-400" title="Platform Administrator">⚙️</span>}
                      {activePartner?.type === 'Registered' && <span className="opacity-80" title="Camera Verified">📸</span>}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`font-bold text-[10px] uppercase tracking-wide flex items-center gap-1 ${onlineUsers.some(u => u.id === activePartner?.id) ? 'text-yellow-500' : 'text-rose-500'}`}>
                      {onlineUsers.some(u => u.id === activePartner?.id) ? '● ONLINE' : '● OFFLINE'}
                    </span>

                    {activePartner?.type === 'Royal VIP' && (
                      <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-500 text-[10px] font-extrabold rounded-full tracking-wider uppercase">👑 VIP Badge</span>
                    )}
                  </div>
                </div>
              </div>
            ) : chatState === 'searching' ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-violet-500 animate-spin-slow flex items-center justify-center shrink-0">
                    <span className="text-sm">🛰️</span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-500 border-2 border-slate-900 rounded-full animate-pulse" title="Status: Searching"></span>
                </div>
                <div className="min-w-0">
                  <span className={`font-bold text-xs block truncate animate-pulse ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                    Connecting to Stranger Companion...
                  </span>
                  <span className={`text-[10px] block truncate font-medium ${theme === 'light' ? 'text-slate-500' : 'text-indigo-400'}`}>
                    Looking for someone with matching vibes...
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-full ${theme === 'light' ? 'bg-slate-100 border border-slate-200' : 'bg-slate-950 border border-slate-800'}`}>
                    <span className="text-sm">👋</span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-400 border-2 border-slate-900 rounded-full" title="Status: Idle"></span>
                </div>
                <div className="min-w-0">
                  <span className={`font-bold text-xs block truncate ${theme === 'light' ? 'text-slate-800 font-extrabold' : 'text-white'}`}>
                    Ready to Connect
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Select matching filters on recents bar or hit Match!
                  </span>
                </div>
              </div>
            )}
 
            {/* Micro Actions Menu buttons: Audio/Video Call, only visible when matched or direct */}
            <div className="flex items-center gap-2">
              {(chatState === 'matched' || chatState === 'direct') && activePartner && (
                <>
                  <button
                    onClick={() => onInitiateCall(activePartner.id!, 'audio')}
                    className={`p-2 border rounded-xl transition cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Initiate Audio Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onInitiateCall(activePartner.id!, 'video')}
                    className={`p-2 border rounded-xl transition cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Initiate HD Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  <div className="relative z-[95]" ref={dropdownRef}>
                    <button
                      onClick={handleToggleOptionsDropdown}
                      className={`p-2 rounded-xl transition cursor-pointer ${theme === "light" ? "hover:bg-slate-100 text-slate-500 hover:text-slate-800" : "hover:bg-slate-900 text-slate-400 hover:text-white"}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {showOptionsDropdown && (
                      <>
                        <div className={`absolute right-0 top-12 w-48 border rounded-2xl py-1.5 shadow-2xl z-[150] font-display text-sm ${theme === "light" ? "bg-white border-slate-200 text-slate-800 shadow-slate-300" : "bg-slate-950 border-slate-800 text-white shadow-black/90"}`}>
                          <button
                            onClick={() => { openModal(setInspectedPeer, activePartner); closeDropdownWithHistory(); }}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer transition ${theme === "light" ? "hover:bg-slate-100 text-slate-700 hover:text-slate-950" : "hover:bg-slate-800 text-slate-200 hover:text-white"}`}
                          >
                            <Search className="w-4 h-4 text-violet-500" /> View Profile
                          </button>
                          <button
                            onClick={() => { openModal(setShowThemeModal, true); closeDropdownWithHistory(); }}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer transition ${theme === "light" ? "hover:bg-slate-100 text-slate-700 hover:text-slate-950" : "hover:bg-slate-800 text-slate-200 hover:text-white"}`}
                          >
                            <Palette className="w-4 h-4 text-emerald-500" /> Change Wallpaper
                          </button>
                          <button
                            onClick={() => { openModal(setShowReportDialog, true); closeDropdownWithHistory(); }}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer transition ${theme === "light" ? "hover:bg-slate-100 text-slate-700 hover:text-slate-950" : "hover:bg-slate-800 text-slate-200 hover:text-white"}`}
                          >
                            <Flag className="w-4 h-4 text-amber-500" /> File Complaint
                          </button>
                          
                          {me.blockedUsers?.includes(activePartner.id) ? (
                            <button
                              onClick={() => { handleUnblockUser(); closeDropdownWithHistory(); }}
                              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer transition ${theme === "light" ? "hover:bg-slate-100 text-sky-600 hover:text-sky-800" : "hover:bg-slate-800 text-sky-400 hover:text-sky-100"}`}
                            >
                              <Check className="w-4 h-4 text-sky-500" /> Unblock Stranger
                            </button>
                          ) : (
                            <button
                              onClick={() => { handleBlockUser(); closeDropdownWithHistory(); }}
                              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer transition ${theme === "light" ? "hover:bg-rose-50 text-rose-600 hover:text-rose-800" : "hover:bg-rose-950/40 text-rose-400 hover:text-rose-100"}`}
                            >
                              <UserX className="w-4 h-4 text-rose-500" /> Block Stranger
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* EXIT DIALOG */}
          {showExitDialog && (
            <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-6">
              <div className={`p-6 rounded-2xl w-full max-w-sm border ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                <h4 className="font-bold font-display text-white text-base mb-2">Are you sure you want to quit?</h4>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">You are about to exit the application.</p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExitDialog(false)}
                    className={`flex-1 py-3 rounded-xl transition font-bold text-xs ${theme === "light" ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-slate-800 hover:bg-slate-700 text-slate-200"}`}
                  >
                    NO, STAY
                  </button>
                  <button
                    onClick={() => { setShowExitDialog(false); window.location.href = '/'; }}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition font-bold text-xs"
                  >
                    YES, QUIT
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* REPORT OVERLAY DIALOG */}
          {showReportDialog && (
            <div className="absolute inset-0 bg-slate-950/80 z-30 flex items-center justify-center p-6">
              <div className={`p-6 rounded-2xl w-full max-w-sm border ${theme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                <h4 className="font-bold font-display text-white text-base mb-2">File Abuse Complaint</h4>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">Please state the reason for filing. Platform operators review transcripts and images immediately.</p>
                
                <form onSubmit={handleReportUser} className="space-y-4">
                  <textarea
                    required
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Harassment, explicit streams, spam links..."
                    className={`w-full p-2.5 border text-xs rounded-lg focus:outline-none focus:border-rose-500 transition resize-none ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="w-1/2 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition font-bold text-xs"
                    >
                      Submit Report
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowReportDialog(false); setReportReason(''); }}
                      className={`w-1/2 py-2 rounded-lg transition font-medium text-xs ${theme === "light" ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-slate-800 hover:bg-slate-700 text-slate-400"}`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CENTRAL CHAT LOG MEMORY SCREEN */}
          <div className={`flex-1 min-h-0 p-4 md:p-6 lg:p-8 overflow-y-auto space-y-4 md:space-y-6 transition duration-300 relative ${
            theme === 'light' ? 'bg-slate-50/50' : 'bg-slate-900/10'
          }`}>
            {wallpaper && (chatState === 'matched' || chatState === 'direct') && activePartner && (
              <div
                className="absolute inset-0 z-0 w-full h-full rounded-2xl"
                style={{
                  backgroundImage: `url(${wallpaper})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: wallpaperOpacity
                }}
              />
            )}
            <div className="relative z-10 space-y-4 md:space-y-6 min-h-full flex flex-col pb-6">
              {chatState === 'idle' ? (
              <div className="py-12 text-center space-y-6 max-w-md mx-auto my-auto flex flex-col justify-center items-center animate-fade-in text-left">
                <div className="relative">
                  <span className={`flex items-center justify-center w-14 h-14 rounded-full text-2xl animate-bounce border ${
                    theme === 'light' ? 'bg-sky-50 border-sky-100 text-sky-600' : 'bg-violet-950/40 border-violet-500/20 text-violet-400'
                  }`}>
                    👋
                  </span>
                </div>
                <div className="text-center">
                  <h4 className={`font-bold text-base mb-2 font-display ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Welcome to VibeChat Space</h4>
                  <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Connect instantly with online users around the world. No unnecessary popups, 100% fast matchmaking, secure socket line connections.
                  </p>
                </div>
                
                {/* Embedded matching filter indicators inside central screen preview */}
                <div className={`w-full p-5 rounded-2xl text-left space-y-4 text-xs max-w-sm border transition ${
                  theme === 'light'
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <div className={`flex justify-between items-center border-b pb-2 ${theme === 'light' ? 'border-slate-100' : 'border-slate-900'}`}>
                    <span className={`font-bold flex items-center gap-1 font-display ${theme === 'light' ? 'text-slate-800' : 'text-stone-200'}`}>
                      <Filter className="w-3.5 h-3.5 text-violet-500" /> Advanced Partner Filters
                    </span>
                    {!isVIP ? (
                      <span 
                        onClick={onTriggerVipPage}
                        className="text-[8px] font-extrabold tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-500 px-2 py-0.5 rounded-full flex items-center gap-1 transition cursor-pointer uppercase font-sans hover:bg-violet-500/20"
                      >
                        <Lock className="w-2.5 h-2.5" /> VIP ONLY
                      </span>
                    ) : (
                      <span className="text-[8px] font-extrabold bg-violet-600 text-white px-2 py-0.5 rounded-full uppercase">VIP ACTIVE</span>
                    )}
                  </div>
                  
                  {/* Grid showing all four filters matching user criteria: Gender, Country, State, City */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-500 text-[8px] uppercase font-bold tracking-wider block mb-1">Target Gender</label>
                      <select
                        value={genderFilter}
                        onChange={(e) => {
                          if (!isVIP) { handleFilterClick('gender'); return; }
                          setGenderFilter(e.target.value as any);
                        }}
                        className={`w-full p-2 text-xs rounded-lg focus:outline-none transition border cursor-pointer ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200 text-slate-800'
                            : 'bg-slate-900/60 border-slate-800 text-white'
                        }`}
                      >
                        <option value="None">Any Gender</option>
                        <option value="Male">Male 👦</option>
                        <option value="Female">Female 👧</option>
                        <option value="Other">Other 🌈</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 text-[8px] uppercase font-bold tracking-wider block mb-1">Target Country</label>
                      <input
                        type="text"
                        placeholder={!isVIP ? "🔒 Country (VIP)" : "e.g. India"}
                        value={countryFilter}
                        onClick={() => { if (!isVIP) { handleFilterClick('location'); } }}
                        onChange={(e) => isVIP && setCountryFilter(e.target.value)}
                        className={`w-full p-2 text-xs rounded-lg focus:outline-none transition border ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                            : 'bg-slate-900/60 border-slate-800 text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 text-[8px] uppercase font-bold tracking-wider block mb-1">Target State</label>
                      <input
                        type="text"
                        placeholder={!isVIP ? "🔒 State (VIP)" : "e.g. Karnataka"}
                        value={stateFilter}
                        onClick={() => { if (!isVIP) { handleFilterClick('location'); } }}
                        onChange={(e) => isVIP && setStateFilter(e.target.value)}
                        className={`w-full p-2 text-xs rounded-lg focus:outline-none transition border ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                            : 'bg-slate-900/60 border-slate-800 text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 text-[8px] uppercase font-bold tracking-wider block mb-1">Target City</label>
                      <input
                        type="text"
                        placeholder={!isVIP ? "🔒 City (VIP)" : "e.g. Bengaluru"}
                        value={cityFilter}
                        onClick={() => { if (!isVIP) { handleFilterClick('location'); } }}
                        onChange={(e) => isVIP && setCityFilter(e.target.value)}
                        className={`w-full p-2 text-xs rounded-lg focus:outline-none transition border ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                            : 'bg-slate-900/60 border-slate-800 text-white'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full pt-2">
                  <button
                    onClick={handleStartMatching}
                    className="px-8 py-3.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 hover:from-violet-500 hover:to-sky-400 text-white rounded-2xl font-bold uppercase font-display tracking-widest text-xs shadow-lg shadow-violet-500/15 hover:scale-[1.01] duration-150 cursor-pointer animate-pulse"
                  >
                    🔮 Start Matching Sockets
                  </button>
                </div>
              </div>
            ) : chatState === 'searching' ? (
              <div className="py-20 text-center space-y-6 max-w-sm mx-auto h-full flex flex-col justify-center items-center">
                <div className="relative">
                  <span className="absolute -inset-4 rounded-full bg-violet-600/10 animate-ping"></span>
                  <span className="absolute -inset-8 rounded-full bg-sky-400/5 animate-pulse"></span>
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-violet-500 animate-spin-slow flex items-center justify-center">
                    <span className="text-xl">🛰️</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className={`font-bold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Searching Stranger Matches...</h4>
                  <p className="text-[11px] text-slate-400 animate-pulse">Scanning live socket pool. Connecting you immediately.</p>
                </div>

                <button
                  onClick={handleCancelMatching}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase tracking-wide cursor-pointer transition shadow-lg shadow-rose-500/10"
                >
                  🛑 Cancel Matching
                </button>
              </div>
            ) : historyMessages.length === 0 ? (
              <div className="py-24 text-center space-y-4 max-w-xs mx-auto">
                <span className="w-10 h-10 bg-violet-600/10 border border-violet-500/25 text-violet-400 rounded-full flex items-center justify-center mx-auto text-lg animate-bounce">💡</span>
                <h4 className={`font-bold text-xs ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Vibe Established!</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">Start texting anonymously. Sockets are healthy. Have fun chatting!</p>
              </div>
            ) : (
              historyMessages.map((m) => {
                const isSelf = m.senderId === me.id;
                let quoteText = '';
                let displayedContent = m.content;
                if (m.content.startsWith('↩️ Replying to: "')) {
                  const endIdx = m.content.indexOf('"\n\n');
                  if (endIdx !== -1) {
                    quoteText = m.content.slice(16, endIdx);
                    displayedContent = m.content.slice(endIdx + 4);
                  }
                }

                let pressTimer: any = null;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[70vw] sm:max-w-[50%] group relative ${
                      isSelf ? 'ml-auto items-end' : 'mr-auto items-start animate-fade-in'
                    }`}
                  >
                    <div
                      onContextMenu={(e) => { e.preventDefault(); setActiveMenuMessage(m); }}
                      onTouchStart={() => {
                        pressTimer = setTimeout(() => {
                          setActiveMenuMessage(m);
                        }, 500);
                      }}
                      onTouchEnd={() => {
                        if (pressTimer) clearTimeout(pressTimer);
                      }}
                      className={`p-4 md:p-5 rounded-2xl text-sm md:text-base leading-relaxed cursor-pointer select-none transition duration-150 hover:brightness-[0.98] active:scale-[0.99] select-none ${
                        isSelf
                          ? (theme === 'light' 
                              ? 'bg-gradient-to-tr from-sky-500 to-sky-600 text-white rounded-tr-none shadow-md'
                              : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-tr-none')
                          : (theme === 'light'
                              ? 'bg-white text-slate-900 rounded-tl-none border border-slate-200 shadow-sm'
                              : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-800')
                      }`}
                      title="Right-click, long press or tap for list choices"
                    >
                      {quoteText && (
                        <div className={`mb-2.5 p-2 px-3 border-l-2 text-xs rounded-xl font-medium flex flex-col gap-0.5 ${
                          isSelf 
                            ? 'bg-white/10 border-white/60 text-white/95' 
                            : (theme === 'light' ? 'bg-slate-50 border-violet-500 text-slate-600' : 'bg-slate-900 border-violet-500 text-stone-300')
                        }`}>
                          <span className="font-extrabold uppercase tracking-widest text-[9px] opacity-75">↩️ Quoted Message</span>
                          <span className="truncate italic">"{quoteText}"</span>
                        </div>
                      )}

                      {displayedContent && <div className="break-words whitespace-pre-wrap">{displayedContent}</div>}

                      {m.mediaUrl && m.type === 'image' && (
                        <img src={m.mediaUrl} alt="attachment" className="max-w-[200px] mt-1.5 rounded-lg border border-slate-700/30 w-full cursor-pointer" onClick={() => setFullScreenImage(m.mediaUrl || null)} />
                      )}
                      
                      {m.mediaUrl && m.type === 'voice' && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <audio src={m.mediaUrl} controls className="mt-1.5 max-w-[200px]" />
                        </div>
                      )}
                    </div>
                    
                    <span className="text-xs text-slate-500 font-mono mt-1 pr-1 pl-1 flex items-center gap-1.5 select-none">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {isSelf && (
                        <span className={m.read ? 'text-sky-500' : 'text-slate-400'}>
                          <CheckCheck className="w-4 h-4" />
                        </span>
                      )}
                      
                      {/* Interactive dots click trigger option for mobile users specifically */}
                      <button 
                        onClick={() => setActiveMenuMessage(m)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded cursor-pointer ml-1"
                        title="Message options"
                      >
                        •••
                      </button>
                    </span>
                  </div>
                );
              })
            )}

            {peerTyping && (
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] animate-pulse">
                <CornerDownRight className="w-3.5 h-3.5 text-violet-500" />
                <span>Stranger typing a response...</span>
              </div>
            )}

            {systemAlert && (
              <div className="mx-auto max-w-sm p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl text-[11px] text-center text-slate-400">
                {systemAlert}
              </div>
            )}

            <div ref={messageEndRef} />
            </div>
          </div>

          {/* INPUT BAR CONTROLLER */}
          <form onSubmit={sendChatMessage} className={`p-3 md:p-4 border-t flex flex-col gap-2 shrink-0 relative transition duration-300 w-full ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
          }`}>
            {replyingTo && (
              <div className={`flex items-center justify-between p-2.5 px-4 mb-1 rounded-xl border font-sans text-xs shrink-0 animate-fade-in ${
                theme === 'light'
                  ? 'bg-slate-100/80 border-slate-200 text-slate-700 shadow-sm'
                  : 'bg-slate-900 border-slate-800/80 text-slate-300'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="font-extrabold uppercase tracking-widest text-[9px] text-violet-500 dark:text-violet-400">↩️ Replying to</span>
                    <span className="truncate italic mt-0.5 opacity-90">
                      "{replyingTo.content || (replyingTo.type === 'voice' ? 'Voice memo' : 'File attachment')}"
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0 ml-4 font-bold text-slate-400 hover:text-rose-500 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {chatState === 'matched' || chatState === 'direct' ? (
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                {/* Media Upload Buttons */}
                <input type="file" ref={fileInputRef} onChange={(e) => { handleMediaUpload(e, 'image'); setShowGalleryMenu(false); }} accept="image/*" className="hidden" />
                <input type="file" ref={cameraInputRef} onChange={(e) => { handleMediaUpload(e, 'image'); setShowGalleryMenu(false); }} accept="image/*" capture="environment" className="hidden" />
                <input type="file" ref={voiceInputRef} onChange={(e) => handleMediaUpload(e, 'voice')} accept="audio/*" capture="microphone" className="hidden" />

                <div className="relative flex-shrink-0" ref={galleryRef}>
                  <button
                    type="button"
                    onClick={() => setShowGalleryMenu(!showGalleryMenu)}
                    className={`p-3 sm:p-4 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl border transition cursor-pointer ${theme === 'light' ? 'bg-white hover:bg-slate-100 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
                    title="Gallery Options"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  {showGalleryMenu && (
                    <>
                      <div className={`absolute left-0 bottom-[calc(100%+10px)] w-44 flex flex-col rounded-xl overflow-hidden shadow-2xl z-[150] border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'}`}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`flex items-center gap-3 px-4 py-3 text-sm transition cursor-pointer ${theme === 'light' ? 'hover:bg-slate-50 text-slate-700' : 'hover:bg-slate-800 text-slate-200 hover:text-white'}`}
                        >
                          <Paperclip className="w-4 h-4" /> Upload Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className={`flex items-center gap-3 px-4 py-3 text-sm transition cursor-pointer border-t ${theme === 'light' ? 'hover:bg-slate-50 text-slate-700 border-slate-100' : 'hover:bg-slate-800 text-slate-200 border-slate-800/50 hover:text-white'}`}
                        >
                          <Camera className="w-4 h-4" /> Camera
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={isRecording ? stopPageRecording : startPageRecording}
                  className={`p-3 sm:p-4 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl border transition cursor-pointer shrink-0 ${isRecording ? 'bg-rose-500 text-white' : (theme === 'light' ? 'bg-white hover:bg-slate-100 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white')}`}
                  title={isRecording ? "Stop Recording" : "Send Voice Memo"}
                >
                  {isRecording ? (
                    <span className="font-mono text-xs font-bold">{Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}</span>
                  ) : <Mic className="w-5 h-5" />}
                </button>

                {audioBlob && !isRecording && (
                    <button
                        onClick={sendRecordedVoiceMessage}
                        className="p-3 sm:p-4 w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center"
                        title="Send Audio Message"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                )}

                <input
                  type="text"
                  required
                  value={messageText}
                  onChange={handleMessageChange}
                  placeholder="Share your vibe..."
                  className={`flex-grow min-w-0 p-3 sm:p-4 sm:px-6 min-h-[52px] sm:min-h-[56px] text-sm sm:text-base rounded-2xl border outline-none transition font-sans ${
                    theme === 'light'
                      ? 'bg-white border-slate-200 text-slate-900 focus:border-sky-400 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 focus:border-violet-500 text-white placeholder-slate-500'
                  }`}
                />
                
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className={`p-3 sm:p-4 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl transition duration-150 cursor-pointer shadow-lg disabled:shadow-none shrink-0 ${
                    theme === 'light'
                      ? 'bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-sky-500/10'
                      : 'bg-violet-600 disabled:bg-slate-900 disabled:text-slate-600 hover:bg-violet-500 text-white shadow-violet-500/10'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
                
                {chatState === 'matched' && (
                  <button
                    type="button"
                    onClick={handleNextStranger}
                    className={`px-4 py-3 border text-xs font-semibold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>Next</span>
                    <span>➡️</span>
                  </button>
                )}
              </div>
            ) : chatState === 'searching' ? (
              <div className="flex w-full items-center justify-between gap-4 p-1">
                <span className="text-xs text-indigo-500 animate-pulse italic flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                  Please wait, scanning active sockets...
                </span>
                <button
                  type="button"
                  onClick={handleCancelMatching}
                  className="px-4 py-2 bg-rose-600/15 border border-rose-500/25 hover:bg-rose-600 text-rose-500 hover:text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel Match
                </button>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-4 p-1">
                <span className="text-[11px] text-slate-500 italic">Matching is offline. Match to start chatting.</span>
                <button
                  type="button"
                  onClick={handleStartMatching}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-lg shadow-violet-500/15"
                >
                  🔮 Match Now
                </button>
              </div>
            )}
          </form>

        </div>

      {/* INSPECTED PEER DETAIL MODAL POPUP DISPLAY CARD */}
      {inspectedPeer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-slate-100">
          <div className={`w-full max-w-sm border rounded-3xl p-6 relative overflow-hidden shadow-2xl ${theme === "light" ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-100"}`}>
            <button 
              onClick={() => {
                setInspectedPeer(null);
                setIsAdminEditing(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg p-1 cursor-pointer transition z-10"
            >
              ✕
            </button>
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 blur-xl rounded-full pointer-events-none"></div>
            
            {isAdminEditing ? (
              <form onSubmit={handleSaveAdminOverride} className="w-full text-left space-y-3 font-display text-xs">
                <div className="flex justify-between items-center border-b border-slate-700/50 pb-2 mb-2">
                  <h4 className="text-xs font-black text-violet-400 uppercase tracking-widest">⚙️ Admin Profile Edit</h4>
                  <button 
                    type="button" 
                    onClick={() => setIsAdminEditing(false)} 
                    className="text-[10px] text-slate-400 hover:text-rose-400 uppercase font-bold"
                  >
                    Cancel
                  </button>
                </div>

                {/* Status message banner */}
                {adminStatusMsg && (
                  <div className={`p-2.5 rounded-xl text-[11px] font-bold text-center leading-tight border ${adminStatusMsg.isError ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {adminStatusMsg.text}
                  </div>
                )}

                {/* Picture and file upload trigger */}
                <div className="flex items-center gap-3 bg-violet-500/5 p-2.5 rounded-2xl border border-violet-500/10">
                  <img 
                    src={adminEditForm.profilePic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                    alt="Preview Avatar"
                    className="w-12 h-12 shrink-0 aspect-square rounded-full object-cover border border-violet-500/30"
                  />
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Override User Avatar</span>
                    <label className="inline-block px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-bold cursor-pointer transition">
                      Upload Photo
                      <input type="file" accept="image/*" onChange={handleAdminFormAvatarUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {/* Username input */}
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Username</label>
                    <input 
                      type="text"
                      required
                      value={adminEditForm.username}
                      onChange={(e) => setAdminEditForm({ ...adminEditForm, username: e.target.value })}
                      className={`w-full px-3 py-1.5 border rounded-xl font-bold bg-transparent outline-none transition focus:border-violet-500 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-white'}`}
                    />
                  </div>

                  {/* Gender and Age selections */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Gender</label>
                      <select
                        value={adminEditForm.gender}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, gender: e.target.value })}
                        className={`w-full px-3 py-1.5 border rounded-xl font-bold bg-transparent outline-none transition focus:border-violet-500 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-800 bg-white' : 'border-slate-800 text-white bg-slate-900'}`}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Age</label>
                      <input 
                        type="number"
                        min="12"
                        max="120"
                        required
                        value={adminEditForm.age}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, age: Number(e.target.value) || 18 })}
                        className={`w-full px-3 py-1.5 border rounded-xl font-bold bg-transparent outline-none transition focus:border-violet-500 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-white'}`}
                      />
                    </div>
                  </div>

                  {/* Custom Bio description */}
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Bio</label>
                    <textarea 
                      rows={2}
                      value={adminEditForm.bio}
                      onChange={(e) => setAdminEditForm({ ...adminEditForm, bio: e.target.value })}
                      className={`w-full px-3 py-1.5 border rounded-xl font-medium bg-transparent outline-none transition focus:border-violet-500 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-white'}`}
                    />
                  </div>

                  {/* Location codes */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">City</label>
                      <input 
                        type="text"
                        value={adminEditForm.city}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, city: e.target.value })}
                        className={`w-full px-2 py-1 border rounded-xl font-semibold bg-transparent outline-none transition focus:border-violet-500 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-white'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">State</label>
                      <input 
                        type="text"
                        value={adminEditForm.state}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, state: e.target.value })}
                        className={`w-full px-2 py-1 border rounded-xl font-semibold bg-transparent outline-none transition focus:border-violet-500 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-white'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Country</label>
                      <input 
                        type="text"
                        value={adminEditForm.country}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, country: e.target.value })}
                        className={`w-full px-2 py-1 border rounded-xl font-semibold bg-transparent outline-none transition focus:border-violet-500 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-white'}`}
                      />
                    </div>
                  </div>

                  {/* Badge VIP/Staff and Blocking status */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/45">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Profile Badge</label>
                      <select
                        value={adminEditForm.type}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, type: e.target.value })}
                        className={`w-full px-3 py-1.5 border rounded-xl font-bold bg-transparent outline-none transition focus:border-violet-500 text-xs ${theme === 'light' ? 'border-slate-200 text-slate-800 bg-white' : 'border-slate-800 text-white bg-slate-900'}`}
                      >
                        <option value="Guest">Guest</option>
                        <option value="Registered">Registered</option>
                        <option value="Royal VIP">Royal VIP 👑</option>
                        <option value="Moderator">Moderator 🛡️</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer font-bold select-none py-1.5 px-3 rounded-xl border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 transition">
                        <input 
                          type="checkbox"
                          checked={adminEditForm.isBanned}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, isBanned: e.target.checked })}
                          className="w-4 h-4 rounded accent-rose-600 cursor-pointer"
                        />
                        <span className="text-rose-500 text-[10px] uppercase font-black">Ban User</span>
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-extrabold rounded-2xl text-[10px] tracking-wider uppercase transition shadow-lg shadow-violet-500/20 cursor-pointer transform active:scale-95 text-center block"
                >
                  Save Active Changes
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center text-center space-y-4">
                <img 
                  src={inspectedPeer.profilePic || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238B5CF6'/></svg>`}
                  alt={inspectedPeer.username}
                  className="w-20 h-20 shrink-0 aspect-square rounded-full object-cover border-2 border-violet-500/30"
                />
                
                <div>
                  <h3 className={`text-xl font-bold font-display flex items-center justify-center gap-1.5 flex-wrap ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                    {inspectedPeer.type === 'Admin' ? 'VibeChat ADMIN' : inspectedPeer.username}
                    {(inspectedPeer.type === 'Royal VIP') && <span className="text-[9px] bg-amber-500/15 border border-amber-500/35 text-amber-400 rounded-full px-2 py-0.5 font-extrabold font-display">👑 VIP</span>}
                    {(inspectedPeer.type === 'Moderator') && <span className="text-[9px] bg-indigo-500/15 border border-indigo-500/35 text-indigo-400 rounded-full px-2 py-0.5 font-extrabold font-display">🛡️ MODERATOR</span>}
                    {(inspectedPeer.type === 'Admin') && <span className="text-[9px] bg-slate-500/15 border border-slate-500/35 text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5 font-extrabold font-display">⚙️ ADMIN</span>}
                    {(inspectedPeer.type === 'Registered') && <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 rounded-full px-2 py-0.5 font-extrabold font-display">📸 VERIFIED</span>}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{inspectedPeer.type || 'Standard'} Companion</p>
                </div>

                <div className={`w-full border rounded-2xl p-4 text-left text-xs space-y-2.5 ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950/40 border-slate-800"}`}>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gender</span>
                    <span className={`font-bold ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                      {inspectedFullDetails?.gender || inspectedPeer.gender || 'Any'}
                      {inspectedFullDetails?.age ? ` (${inspectedFullDetails?.age} Yrs)` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className={`font-bold ${theme === "light" ? "text-slate-900" : "text-white"}`}>📍 {inspectedFullDetails?.city || inspectedPeer.city || 'Unknown'}, {inspectedFullDetails?.state || inspectedPeer.state || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Joined</span>
                    <span className="font-bold text-violet-500">
                      {inspectedFullDetails?.createdAt 
                        ? formatJoinedDate(inspectedFullDetails.createdAt)
                        : 'Recently'}
                    </span>
                  </div>
                  {inspectedFullDetails?.bio && (
                    <div className="flex flex-col mt-2 pt-2 border-t border-slate-800/50">
                      <span className="text-slate-500 mb-1">Bio</span>
                      <p className={`italic leading-relaxed whitespace-pre-wrap font-bold ${theme === "light" ? "text-slate-700" : "text-white"}`}>"{inspectedFullDetails.bio}"</p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Seen</span>
                    <span className={`font-bold ${theme === "light" ? "text-slate-700" : "text-slate-300"}`}>
                      {inspectedFullDetails?.lastSeenAt 
                        ? formatLastSeen(inspectedFullDetails.lastSeenAt, inspectedFullDetails?.online)
                        : 'Recently'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Online</span>
                    <span className={`font-bold ${inspectedFullDetails?.online ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {inspectedFullDetails?.online ? 'Active Now' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                <div className="w-full pt-1.5 flex flex-col gap-2 text-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenConversation(inspectedPeer);
                      setInspectedPeer(null);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Start Chatting with {inspectedPeer.username}
                  </button>

                  {me && me.type === 'Admin' && (
                    <div className="flex flex-col gap-2 w-full mt-1">
                      <button
                        type="button"
                        onClick={startAdminEditing}
                        className="w-full py-2 bg-slate-950/40 border border-slate-800 hover:border-violet-500/50 hover:bg-violet-950/10 text-violet-400 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        ⚙️ Edit Profile as Admin Code
                      </button>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Remove this user\'s photo and bio?')) return;
                          await fetch(`/api/admin/users/${inspectedPeer.id}/photo`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                          setInspectedPeer({ ...inspectedPeer, profilePic: '', bio: '[Content removed by moderator]' } as any);
                        }}
                        className="w-full py-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 text-rose-500 hover:text-white rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Moderate Photo/Bio
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* THEME AND WALLPAPER CUSTOMIZATION MODAL */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in text-slate-100">
          <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 relative shadow-2xl border transition duration-300 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white shadow-black/80'
          }`}>
            <button 
              onClick={() => setShowThemeModal(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 p-2 z-10 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h2 className="text-2xl font-black font-display mb-6 tracking-tight flex items-center gap-3">
              <Palette className="w-6 h-6 text-violet-500" /> Chat Theme & Wallpaper
            </h2>

            <div className="space-y-8">
              {/* Wallpaper Opacity */}
              {wallpaper && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-xs uppercase font-bold tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Background Opacity</h3>
                    <span className="text-sm font-mono text-violet-500 font-bold">{Math.round((wallpaperOpacity || 0.5) * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.05"
                    value={wallpaperOpacity}
                    onChange={(e) => handleWallpaperOpacityChange && handleWallpaperOpacityChange(parseFloat(e.target.value))}
                    className="w-full accent-violet-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              {/* Background Wallpapers List */}
              <div className="space-y-3">
                <h3 className={`text-xs uppercase font-bold tracking-wider flex items-center justify-between ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span>Background Wallpaper</span>
                  <label className="text-violet-500 hover:text-violet-400 text-xs font-bold cursor-pointer flex items-center gap-1 transition">
                    <input type="file" accept="image/*" onChange={handleCustomWallpaperUpload} className="hidden" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                     Upload File
                  </label>
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleWallpaperChange && handleWallpaperChange(null)}
                    className={`relative p-1 rounded-xl border-2 overflow-hidden aspect-video flex items-center justify-center transition-all cursor-pointer ${
                      wallpaper === null ? 'border-violet-500 shadow-lg shadow-violet-500/20' : 'border-transparent hover:border-slate-500/50'
                    } ${theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-slate-800/50 text-slate-500'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-1 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                    <span className="absolute bottom-2 text-[10px] font-bold">Standard Solid</span>
                  </button>
                  
                  {PRESET_WALLPAPERS && PRESET_WALLPAPERS.filter(wp => !(failedWallpapers && failedWallpapers.has(wp.url))).map((wp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleWallpaperChange && handleWallpaperChange(wp.url)}
                      className={`relative p-1 rounded-xl border-2 overflow-hidden aspect-video transition-all bg-slate-900 group cursor-pointer ${
                        wallpaper === wp.url ? 'border-violet-500 shadow-lg shadow-violet-500/30' : 'border-transparent hover:border-violet-500/50'
                      }`}
                    >
                      <img 
                        src={wp.url} 
                        alt={wp.name}
                        onError={() => setFailedWallpapers && setFailedWallpapers(prev => new Set(prev).add(wp.url))}
                        className="w-full h-full object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                        <span className="text-[10px] text-white font-bold tracking-wide drop-shadow-md">{wp.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION INTERACTION OPTIONS MODAL CARD */}
      {activeMenuMessage && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in text-slate-100"
          onClick={() => setActiveMenuMessage(null)}
        >
          <div 
            className={`w-full max-w-xs border rounded-3xl p-5 relative overflow-hidden shadow-2xl ${
              theme === "light" 
                ? "bg-white border-slate-200 text-slate-900 shadow-slate-300" 
                : "bg-slate-900 border-slate-800 text-white shadow-black/80"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`text-center pb-3 border-b mb-4 ${theme === "light" ? "border-slate-100" : "border-slate-800"}`}>
              <h4 className={`font-bold font-display text-sm tracking-wide uppercase ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Message Actions
              </h4>
              <p className={`text-xs truncate italic mt-1.5 opacity-85 ${theme === 'light' ? 'text-slate-600' : 'text-stone-300'}`}>
                "{activeMenuMessage.content || (activeMenuMessage.type === 'voice' ? 'Audio voice memo' : 'File attachment')}"
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  handleMessageReply(activeMenuMessage);
                  setActiveMenuMessage(null);
                }}
                className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition text-left cursor-pointer ${
                  theme === "light" 
                    ? "bg-slate-50 hover:bg-slate-100 text-slate-800" 
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white"
                }`}
              >
                <CornerUpLeft className="w-4 h-4 text-violet-500 shrink-0" />
                Reply to Message
              </button>

              <button
                type="button"
                onClick={() => {
                  handleMessageCopy(activeMenuMessage);
                  setActiveMenuMessage(null);
                }}
                className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition text-left cursor-pointer ${
                  theme === "light" 
                    ? "bg-slate-50 hover:bg-slate-100 text-slate-800" 
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white"
                }`}
              >
                <Copy className="w-4 h-4 text-emerald-500 shrink-0" />
                Copy Text
              </button>

              <button
                type="button"
                onClick={() => {
                  handleMessageDelete(activeMenuMessage);
                  setActiveMenuMessage(null);
                }}
                className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 font-semibold text-sm transition text-left cursor-pointer ${
                  theme === "light" 
                    ? "bg-rose-50 hover:bg-rose-100 text-rose-600" 
                    : "bg-rose-600/10 hover:bg-rose-650 text-rose-400 hover:text-rose-100"
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                Delete Message
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveMenuMessage(null)}
              className={`w-full mt-4 py-2.5 rounded-xl border font-semibold text-xs tracking-wide transition cursor-pointer text-center ${
                theme === "light" 
                  ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-500" 
                  : "bg-slate-800 border-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* AUTO-DISMISS FLOATING CHAT NOTICES */}
      {customToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-slate-950/95 border border-slate-800/65 text-white text-xs py-2.5 px-5 rounded-full shadow-2xl flex items-center gap-2 animate-fade-in font-medium pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {customToast}
        </div>
      )}
    </div>
  );
}
