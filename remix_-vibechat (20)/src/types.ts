/**
 * Shared types for VibeChat platform.
 */

export type UserType = 'Guest' | 'Registered' | 'Royal VIP' | 'Admin' | 'Moderator';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  profilePic: string; // Base64 or local URL or default SVG avatar
  city: string;
  state: string;
  country: string;
  originalCity?: string;
  originalState?: string;
  originalCountry?: string;
  online: boolean;
  type: UserType;
  isBanned?: boolean;
  vipExpiresAt?: string; // ISO date string
  vipPurchaseCount?: number;
  isModerator?: boolean;
  bio?: string;
  age?: number;
  deviceId?: string;
  photoVerified?: boolean;
  photoVerificationPending?: boolean;
  photoVerificationSubmittedAt?: number;
  humanVerificationPic?: string;
  createdAt: string;
  lastSeenAt?: string; // ISO date string
  blockedUsers?: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  mediaUrl?: string;
  type?: 'text' | 'image' | 'voice' | 'video';
  timestamp: number;
  read: boolean;
}

export interface RecentChat {
  peerId: string;
  peerName: string;
  peerGender: 'Male' | 'Female' | 'Other';
  peerType: UserType;
  peerIsModerator?: boolean;
  peerPic: string;
  lastMessage: string;
  timestamp: number;
  unreadCount: number;
  peerCity?: string;
  peerState?: string;
  peerCountry?: string;
  peerAge?: number;
  peerCreatedAt?: string;
  peerLastSeenAt?: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  reason: string;
  timestamp: number;
  status: 'Pending' | 'Resolved';
}

export interface BlockRecord {
  userId: string;
  blockedId: string;
}

export interface VIPPlan {
  id: string;
  name: string;
  price: number; // in INR e.g. 39, 59, etc.
  days: number;
}

export interface VipPaymentInvoice {
  id: string;
  userId: string;
  username: string;
  planId: string;
  planName: string;
  price: number;
  screenshotUrl: string; // Base64
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp: number;
}

export interface PlatformConfig {
  homepageTitle: string;
  homepageTagline: string;
  announcement: string;
  communityRules: string[];
  qrCodeUrl: string; // Base64 or placeholder URL
  paymentMethodsEnabled: boolean;
}

export interface SystemStats {
  totalOnline: number;
  maleOnline: number;
  femaleOnline: number;
  guestMaleOnline: number;
  guestFemaleOnline: number;
  registeredMaleOnline: number;
  registeredFemaleOnline: number;
  totalUsers: number;
  totalVIPs: number;
  totalRevenue: number; // Sum of approved VIP plans
  pendingReports?: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderPic: string;
  recipientId: string;
  timestamp: number;
}

export interface FriendRecord {
  userId: string;
  friendId: string;
  friendName: string;
  friendPic: string;
  friendType: UserType;
  friendGender: 'Male' | 'Female' | 'Other';
}
