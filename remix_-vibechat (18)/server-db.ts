import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  UserProfile, 
  ChatMessage, 
  Report, 
  VipPaymentInvoice, 
  PlatformConfig,
  VIPPlan,
  FriendRequest,
  FriendRecord,
  RecentChat
} from './src/types';

const DB_PATH = path.join(process.cwd(), 'database.json');

// Interface for DB file schema
interface DiskDatabase {
  users: UserProfile[];
  passwords: Record<string, string>; // userId -> hashed password
  messages: ChatMessage[];
  reports: Report[];
  payments: VipPaymentInvoice[];
  config: PlatformConfig;
  blocks: { userId: string; blockedId: string }[];
  friendRequests: FriendRequest[];
  friendRecords: FriendRecord[];
  plans?: VIPPlan[];
}

// Initial default configuration
const DEFAULT_CONFIG: PlatformConfig = {
  homepageTitle: "VibeChat",
  homepageTagline: "Meet New People. Share Your Vibe.",
  announcement: "🎉 Welcome to VibeChat! Upgrade to Royal VIP to access gender and location filters, unlimited recent chats, and priority stranger matching!",
  communityRules: [
    "No explicit or adult content on public profiles or streams.",
    "Do not solicit users for financial transactions.",
    "Hate speech, racism, and targeted harassment will result in a permanent ban.",
    "Do not share personal identifying information publicly."
  ],
  qrCodeUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='200' height='200' fill='whitesmoke'/><rect x='20' y='20' width='40' height='40' fill='black'/><rect x='140' y='20' width='40' height='40' fill='black'/><rect x='20' y='140' width='40' height='40' fill='black'/><rect x='70' y='70' width='60' height='60' fill='indigo'/><text x='100' y='190' font-family='sans-serif' font-size='10' text-anchor='middle' fill='%23666'>VibeChat Official QR</text></svg>",
  paymentMethodsEnabled: true
};

const DEFAULT_PLANS: VIPPlan[] = [
  { id: 'lite', name: 'Royal VIP Lite', price: 39, days: 2 },
  { id: 'mini', name: 'Royal VIP Mini', price: 59, days: 3 },
  { id: 'standard', name: 'Royal VIP Standard', price: 99, days: 5 },
  { id: 'plus', name: 'Royal VIP Plus', price: 139, days: 8 },
  { id: 'premium', name: 'Royal VIP Premium', price: 199, days: 10 }
];

class DatabaseManager {
  private db: DiskDatabase;

  constructor() {
    this.db = {
      users: [],
      passwords: {},
      messages: [],
      reports: [],
      payments: [],
      config: DEFAULT_CONFIG,
      blocks: [],
      friendRequests: [],
      friendRecords: [],
      plans: [...DEFAULT_PLANS]
    };
    this.load();
    this.ensureAdmin();
  }

  private load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        this.db = {
          users: parsed.users || [],
          passwords: parsed.passwords || {},
          messages: parsed.messages || [],
          reports: parsed.reports || [],
          payments: parsed.payments || [],
          config: parsed.config || DEFAULT_CONFIG,
          blocks: parsed.blocks || [],
          friendRequests: parsed.friendRequests || [],
          friendRecords: parsed.friendRecords || [],
          plans: parsed.plans || [...DEFAULT_PLANS]
        };
        // Reset online status on load for peace of mind
        this.db.users.forEach(u => {
          u.online = false;
        });
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Error loading database, resetting to default', e);
      this.save();
    }
  }

  public save() {
    try {
      // Ensure directory exists if needed (usually it is process root)
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database', e);
    }
  }

  private ensureAdmin() {
    let adminExists = this.db.users.find(u => u.type === 'Admin');
    const adminId = adminExists ? adminExists.id : 'admin_root';
    const adminUsername = 'VibeChat ADMIN';
    const adminPassword = process.env.ADMIN_PASS || 'vijaykumar9980';
    
    if (!adminExists) {
      const adminUser: UserProfile = {
        id: adminId,
        username: adminUsername,
        email: 'admin@vibechat.com',
        gender: 'Male',
        profilePic: '', // Will use default in frontend
        city: 'Vibechat admin',
        state: 'Vibechat admin',
        country: 'Vibechat admin',
        online: false,
        bio: 'VibeChat Admin for Help',
        type: 'Admin',
        createdAt: new Date().toISOString()
      };
      this.db.users.push(adminUser);
      adminExists = adminUser;
    } else {
      adminExists.username = adminUsername;
      adminExists.gender = 'Male';
      if (!adminExists.city || adminExists.city === 'Mysuru') adminExists.city = 'Vibechat admin';
      if (!adminExists.state || adminExists.state === 'Karnataka') adminExists.state = 'Vibechat admin';
      if (!adminExists.country || adminExists.country === 'India') adminExists.country = 'Vibechat admin';
      adminExists.bio = adminExists.bio || 'VibeChat Admin for Help';
    }
    
    this.db.passwords[adminId] = this.hashPassword(adminPassword);
    this.save();
    
    console.log(`\n======================================================`);
    console.log(`[SECURE BOOT]: Admin account seeded and generated.`);
    console.log(`USERNAME: ${adminUsername}`);
    console.log(`PASSWORD: ${adminPassword}`);
    console.log(`Note: Store these credentials securely. They will not be printed again.`);
    console.log(`======================================================\n`);
  }

  public hashPassword(pwd: string): string {
    return crypto.createHash('sha256').update(pwd).digest('hex');
  }

  // USER CRUD
  public getUsers(): UserProfile[] {
    return this.db.users;
  }

  public getUser(id: string): UserProfile | undefined {
    return this.db.users.find(u => u.id === id);
  }

  public getUserByEmailOrUsername(identifier: string): UserProfile | undefined {
    return this.db.users.find(u => 
      u.email?.toLowerCase() === identifier.toLowerCase() || 
      u.username.toLowerCase() === identifier.toLowerCase()
    );
  }

  public addUser(user: UserProfile, passwordHash?: string) {
    this.db.users.push(user);
    if (passwordHash) {
      this.db.passwords[user.id] = passwordHash;
    }
    this.save();
  }

  public updateUser(id: string, updates: Partial<UserProfile>) {
    const idx = this.db.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.db.users[idx] = { ...this.db.users[idx], ...updates };
      this.save();
      return this.db.users[idx];
    }
    return undefined;
  }

  public deleteUser(id: string) {
    this.db.users = this.db.users.filter(u => u.id !== id);
    delete this.db.passwords[id];
    this.db.reports = this.db.reports.filter(r => r.reportedId !== id && r.reporterId !== id);
    this.db.payments = this.db.payments.filter(p => p.userId !== id);
    this.db.blocks = this.db.blocks.filter(b => b.userId !== id && b.blockedId !== id);
    this.db.friendRequests = this.db.friendRequests.filter(fr => fr.senderId !== id && fr.recipientId !== id);
    this.db.friendRecords = this.db.friendRecords.filter(fr => fr.userId !== id && fr.friendId !== id);
    this.save();
  }

  public verifyPassword(userId: string, pwdPlain: string): boolean {
    const hash = this.db.passwords[userId];
    if (!hash) return false;
    return hash === this.hashPassword(pwdPlain);
  }

  public updatePassword(userId: string, hashedPass: string) {
    this.db.passwords[userId] = hashedPass;
    this.save();
  }

  // MESSAGES
  public getMessagesBetween(u1: string, u2: string): ChatMessage[] {
    return this.db.messages.filter(m => 
      (m.senderId === u1 && m.recipientId === u2) ||
      (m.senderId === u2 && m.recipientId === u1)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }

  public addMessage(msg: ChatMessage) {
    this.db.messages.push(msg);
    this.save();
  }

  public deleteMessage(id: string) {
    this.db.messages = this.db.messages.filter(m => m.id !== id);
    this.save();
  }

  public getRecentChatsFor(userId: string, maxLimit?: number): RecentChat[] {
    const userMsgs = this.db.messages.filter(m => m.senderId === userId || m.recipientId === userId);
    const peersMap = new Map<string, { lastMsg: ChatMessage; unread: number }>();

    userMsgs.forEach(m => {
      const peerId = m.senderId === userId ? m.recipientId : m.senderId;
      const current = peersMap.get(peerId);
      const isUnread = m.recipientId === userId && !m.read;

      if (!current || m.timestamp > current.lastMsg.timestamp) {
        peersMap.set(peerId, {
          lastMsg: m,
          unread: (current?.unread || 0) + (isUnread ? 1 : 0)
        });
      } else if (isUnread) {
        peersMap.set(peerId, {
          lastMsg: current.lastMsg,
          unread: current.unread + 1
        });
      }
    });

    const recent: RecentChat[] = Array.from(peersMap.entries()).map(([peerId, data]) => {
      const peer = this.getUser(peerId);
      return {
        peerId,
        peerName: peer?.username || 'Stranger',
        peerGender: peer?.gender || 'Other',
        peerType: peer?.type || 'Guest',
        peerPic: peer?.profilePic || '',
        lastMessage: data.lastMsg.content,
        timestamp: data.lastMsg.timestamp,
        unreadCount: data.unread,
        peerCity: peer?.city,
        peerState: peer?.state,
        peerCountry: peer?.country,
        peerAge: peer?.age,
        peerCreatedAt: peer?.createdAt,
        peerLastSeenAt: peer?.lastSeenAt
      };
    }).sort((a, b) => {
      const isVIPA = a.peerType === 'Royal VIP' || a.peerType === 'Admin' ? 1 : 0;
      const isVIPB = b.peerType === 'Royal VIP' || b.peerType === 'Admin' ? 1 : 0;
      if (isVIPA !== isVIPB) {
        return isVIPB - isVIPA; // VIP users appear first
      }
      return b.timestamp - a.timestamp;
    });

    if (maxLimit) {
      return recent.slice(0, maxLimit);
    }
    return recent;
  }

  public markMessagesRead(senderId: string, recipientId: string) {
    this.db.messages.forEach(m => {
      if (m.senderId === senderId && m.recipientId === recipientId) {
        m.read = true;
      }
    });
    this.save();
  }

  // REPORTS
  public getReports(): Report[] {
    return this.db.reports;
  }

  public addReport(report: Report) {
    this.db.reports.push(report);
    this.save();
  }

  public resolveReport(id: string) {
    const report = this.db.reports.find(r => r.id === id);
    if (report) {
      report.status = 'Resolved';
      this.save();
    }
  }

  // BLOCKS
  public getBlocks(userId: string): string[] {
    return this.db.blocks.filter(b => b.userId === userId).map(b => b.blockedId);
  }

  public isBlocked(userA: string, userB: string): boolean {
    return this.db.blocks.some(b => 
      (b.userId === userA && b.blockedId === userB) ||
      (b.userId === userB && b.blockedId === userA)
    );
  }

  public blockUser(userId: string, blockedId: string) {
    const exists = this.db.blocks.some(b => b.userId === userId && b.blockedId === blockedId);
    if (!exists) {
      this.db.blocks.push({ userId, blockedId });
      this.save();
    }
  }

  public unblockUser(userId: string, blockedId: string) {
    this.db.blocks = this.db.blocks.filter(b => !(b.userId === userId && b.blockedId === blockedId));
    this.save();
  }

  // PAYMENTS & VIP
  public getPayments(): VipPaymentInvoice[] {
    return this.db.payments;
  }

  public addPayment(pay: VipPaymentInvoice) {
    this.db.payments.push(pay);
    this.save();
  }

  public getPlans(): VIPPlan[] {
    if (!this.db.plans || this.db.plans.length === 0) {
      this.db.plans = [...DEFAULT_PLANS];
    }
    return this.db.plans;
  }

  public updatePlans(newPlans: VIPPlan[]) {
    this.db.plans = newPlans;
    this.save();
    return this.db.plans;
  }

  public approvePayment(id: string): { success: boolean; userId?: string } {
    const pay = this.db.payments.find(p => p.id === id);
    if (!pay) return { success: false };

    pay.status = 'Approved';
    const user = this.getUser(pay.userId);
    if (user) {
      const plan = this.getPlans().find(p => p.id === pay.planId);
      const days = plan ? plan.days : 3;

      let currentExpiry = user.vipExpiresAt ? new Date(user.vipExpiresAt) : new Date();
      if (currentExpiry < new Date()) {
        currentExpiry = new Date();
      }
      currentExpiry.setDate(currentExpiry.getDate() + days);

      user.vipPurchaseCount = (user.vipPurchaseCount || 0) + 1;
      
      if (user.vipPurchaseCount >= 3) {
        user.isModerator = true;
        user.type = 'Moderator';
      } else if (user.type !== 'Admin' && user.type !== 'Moderator') {
         user.type = 'Royal VIP';
      }

      user.vipExpiresAt = currentExpiry.toISOString();
      this.save();
      return { success: true, userId: pay.userId };
    }
    return { success: false };
  }

  public rejectPayment(id: string): { success: boolean; userId?: string } {
    const pay = this.db.payments.find(p => p.id === id);
    if (!pay) return { success: false };
    pay.status = 'Rejected';
    this.save();
    return { success: true, userId: pay.userId };
  }

  // PLATFORM SETTINGS
  public getConfig(): PlatformConfig {
    return this.db.config;
  }

  public updateConfig(updates: Partial<PlatformConfig>) {
    this.db.config = { ...this.db.config, ...updates };
    this.save();
    return this.db.config;
  }

  // FRIEND ACTIONS
  public getFriendRequests(userId: string): FriendRequest[] {
    return this.db.friendRequests.filter(fr => fr.recipientId === userId);
  }

  public addFriendRequest(req: FriendRequest) {
    const exists = this.db.friendRequests.some(fr => 
      fr.senderId === req.senderId && fr.recipientId === req.recipientId
    );
    if (!exists) {
      this.db.friendRequests.push(req);
      this.save();
    }
  }

  public removeFriendRequest(id: string) {
    this.db.friendRequests = this.db.friendRequests.filter(fr => fr.id !== id);
    this.save();
  }

  public getFriends(userId: string): FriendRecord[] {
    return this.db.friendRecords.filter(f => f.userId === userId);
  }

  public addFriend(u1: string, u2: string) {
    const user1 = this.getUser(u1);
    const user2 = this.getUser(u2);
    if (!user1 || !user2) return;

    const exists = this.db.friendRecords.some(f => f.userId === u1 && f.friendId === u2);
    if (!exists) {
      this.db.friendRecords.push({
        userId: u1,
        friendId: u2,
        friendName: user2.username,
        friendPic: user2.profilePic,
        friendType: user2.type,
        friendGender: user2.gender
      });
      this.db.friendRecords.push({
        userId: u2,
        friendId: u1,
        friendName: user1.username,
        friendPic: user1.profilePic,
        friendType: user1.type,
        friendGender: user1.gender
      });
      this.save();
    }
  }

  public removeFriend(userId: string, friendId: string) {
    this.db.friendRecords = this.db.friendRecords.filter(f => 
      !(f.userId === userId && f.friendId === friendId) &&
      !(f.userId === friendId && f.friendId === userId)
    );
    this.save();
  }
}

export const dbManager = new DatabaseManager();
export default dbManager;
