import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dbManager from './server-db';
import { ChatMessage, UserProfile, SystemStats, UserType, VipPaymentInvoice } from './src/types';

const APP = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vibechat_secret_key_889988_!!';

// Body parsers with larger limit for base64 screenshots and profiles
APP.use(express.json({ limit: '10mb' }));
APP.use(express.urlencoded({ extended: true, limit: '10mb' }));

const SERVER = http.createServer(APP);
const WSS = new WebSocketServer({ noServer: true });

// Map to track active websocket connections by User ID
// Since a user can connect from multiple sessions (unlikely but possible), let's hold a set of connections or simpler, a single active WebSocket.
const ACTIVE_CONNECTIONS = new Map<string, WebSocket>();
const ACTIVE_ROOM_FOCUS = new Map<string, string>(); // userId -> currently focused recipientId
const OTP_STORE = new Map<string, string>();
const ADMIN_LOGIN_STATE = new Map<string, { step: number; verifiedUsername?: boolean; verifiedPassword?: string; otpCode?: string }>();

// Matching Queue item structure
interface MatchCandidate {
  userId: string;
  gender: 'Male' | 'Female' | 'Other';
  city: string;
  state: string;
  country: string;
  type: UserType;
  filters: {
    gender?: 'Male' | 'Female' | 'Other';
    country?: string;
    state?: string;
    city?: string;
  };
}

// Global Matchmaking Queue
let MATCHING_QUEUE: MatchCandidate[] = [];

// Current live call sessions to track ongoing peer-to-peer relationships
// userId -> recipientId
const ACTIVE_CALLS = new Map<string, { peerId: string; type: 'audio' | 'video' }>();

// Helper to get real live online stats
function getLiveStats(): SystemStats {
  const users = dbManager.getUsers();
  
  // Real live online counts from connected WebSockets
  let guestMaleOnline = 0;
  let guestFemaleOnline = 0;
  let registeredMaleOnline = 0;
  let registeredFemaleOnline = 0;
  let totalVIPs = 0;

  for (const [userId] of ACTIVE_CONNECTIONS) {
    const user = dbManager.getUser(userId);
    if (user) {
      const isGuest = user.id.startsWith('guest_') || user.type === 'Guest';
      if (isGuest) {
        if (user.gender === 'Male') guestMaleOnline++;
        else guestFemaleOnline++;
      } else {
        if (user.gender === 'Male') registeredMaleOnline++;
        else registeredFemaleOnline++;
      }
    }
  }

  // Aggregate all database indicators for overall statistics
  const totalOnline = ACTIVE_CONNECTIONS.size;
  const maleOnline = guestMaleOnline + registeredMaleOnline;
  const femaleOnline = guestFemaleOnline + registeredFemaleOnline;

  const totalUsers = users.filter(u => !u.id.startsWith('guest_')).length;
   totalVIPs = users.filter(u => u.type === 'Royal VIP' || u.type === 'Moderator').length;

  const payments = dbManager.getPayments();
  const totalRevenue = payments
    .filter(p => p.status === 'Approved')
    .reduce((sum, p) => sum + p.price, 0);

  const pendingReports = dbManager.getReports().filter(r => r.status === 'Pending').length;

  return {
    totalOnline,
    maleOnline,
    femaleOnline,
    guestMaleOnline,
    guestFemaleOnline,
    registeredMaleOnline,
    registeredFemaleOnline,
    totalUsers,
    totalVIPs,
    totalRevenue,
    pendingReports
  };
}

// Broadcast message helper
function broadcastToAll(event: string, data: any) {
  const payload = JSON.stringify({ event, data });
  for (const [_, client] of ACTIVE_CONNECTIONS) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Matchmaking execution
function searchMatches() {
  if (MATCHING_QUEUE.length < 2) return;

  const matchedIndices = new Set<number>();

  for (let i = 0; i < MATCHING_QUEUE.length; i++) {
    if (matchedIndices.has(i)) continue;
    const userA = MATCHING_QUEUE[i];

    for (let j = i + 1; j < MATCHING_QUEUE.length; j++) {
      if (matchedIndices.has(j)) continue;
      const userB = MATCHING_QUEUE[j];

      // Check filters
      // Note: Admin, VIP ('Royal VIP') users have filter benefits. Guest/Registered might have restricted filters.
      // If user A has filters:
      const matchesFilterA = checkUserFilters(userA, userB);
      // If user B has filters:
      const matchesFilterB = checkUserFilters(userB, userA);

      if (matchesFilterA && matchesFilterB) {
        // MATCH MADE!
        matchedIndices.add(i);
        matchedIndices.add(j);

        const profileA = dbManager.getUser(userA.userId);
        const profileB = dbManager.getUser(userB.userId);

        if (profileA && profileB) {
          sendWSMessage(userA.userId, 'match:success', {
            peerId: profileB.id,
            peerName: profileB.username,
            peerGender: profileB.gender,
            peerType: profileB.type,
            peerPic: profileB.profilePic,
            peerCity: profileB.city,
            peerState: profileB.state,
            peerCountry: profileB.country
          });

          sendWSMessage(userB.userId, 'match:success', {
            peerId: profileA.id,
            peerName: profileA.username,
            peerGender: profileA.gender,
            peerType: profileA.type,
            peerPic: profileA.profilePic,
            peerCity: profileA.city,
            peerState: profileA.state,
            peerCountry: profileA.country
          });
        }
        break;
      }
    }
  }

  // Remove matched candidates from queue
  if (matchedIndices.size > 0) {
    MATCHING_QUEUE = MATCHING_QUEUE.filter((_, index) => !matchedIndices.has(index));
    broadcastToAll('stats:update', getLiveStats());
  }
}

function checkUserFilters(user: MatchCandidate, target: MatchCandidate): boolean {
  // If user is not VIP, filters are ignored or empty
  const hasGenderFilter = user.filters.gender && user.filters.gender !== target.gender;
  if (hasGenderFilter) return false;

  const hasCountryFilter = user.filters.country && user.filters.country.toLowerCase() !== target.country.toLowerCase();
  if (hasCountryFilter) return false;

  const hasStateFilter = user.filters.state && user.filters.state.toLowerCase() !== target.state.toLowerCase();
  if (hasStateFilter) return false;

  const hasCityFilter = user.filters.city && user.filters.city.toLowerCase() !== target.city.toLowerCase();
  if (hasCityFilter) return false;

  return true;
}

function sendWSMessage(userId: string, event: string, data: any) {
  const ws = ACTIVE_CONNECTIONS.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }));
  }
}

// ---------------------------------------------------------
// JWT Authentication Middlware
// ---------------------------------------------------------
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

const adminRequired = (req: any, res: any, next: any) => {
  if (req.user && req.user.type === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied: Administrator privileges required' });
  }
};

// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------

// Health check
APP.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Detect Location
APP.get('/api/location/detect', async (req, res) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  let clientIp = Array.isArray(rawIp) ? rawIp[0] : rawIp;
  clientIp = clientIp.replace('::ffff:', '').trim();

  // If local/empty, let's try to resolve a public IP using ipify or default to a dummy local IP indicator
  if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('10.') || clientIp.startsWith('192.168.')) {
    try {
      const publicIpRes = await fetch('https://api.ipify.org?format=json');
      const publicIpData = await publicIpRes.json();
      if (publicIpData && publicIpData.ip) {
        clientIp = publicIpData.ip;
      }
    } catch (e) {
      // Keep it or use fallback
    }
  }

  let geo = {
    city: 'Detecting Location...',
    state: 'IP Network',
    country: 'IP Location',
    ip: clientIp
  };

  try {
    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && !clientIp.startsWith('10.') && !clientIp.startsWith('192.168.')) {
      const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,query`);
      const body = await geoRes.json();
      if (body && body.status === 'success') {
        const detectedCity = body.city || '';
        const detectedRegion = body.regionName || '';
        const detectedCountry = body.country || '';
        const ipAddress = body.query || clientIp;

        geo.city = detectedCity || 'Unknown City';
        geo.state = detectedRegion || 'Unknown State';
        geo.country = detectedCountry || 'Unknown Country';
        geo.ip = ipAddress;
      } else {
        // Fallback to a second service if the first one fails or returns nothing
        const geoJSRes = await fetch(`https://get.geojs.io/v1/ip/geo/${clientIp}.json`);
        if (geoJSRes.ok) {
          const bodyJS = await geoJSRes.json();
          if (bodyJS && bodyJS.city) {
              geo.city = bodyJS.city;
              geo.state = bodyJS.region || 'Unknown State';
              geo.country = bodyJS.country || 'Unknown Country';
          }
        }
      }
    }
  } catch (error) {
    console.error('[VibeChat Server GeoIP Error]', error);
  }

  res.json(geo);
});

const bgCyan = "b6e3f4";
const bgOrange = "ffdfbf";
const bgGray = "e2e8f0";

const MALE_AVATAR = `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&top=shortWaved&facialHair=beardLight&facialHairProbability=100&backgroundColor=${bgCyan}`;
const FEMALE_AVATAR = `https://api.dicebear.com/7.x/avataaars/svg?seed=Jasmine&top=straight02&skinColor=ffdbb4&backgroundColor=${bgOrange}`;
const OTHER_AVATAR = `https://api.dicebear.com/7.x/bottts/svg?seed=Robot1&backgroundColor=${bgGray}`;

function getDefaultUserAvatar(gender: string, providedPic: string) {
  if (providedPic && (providedPic.startsWith('http') || providedPic.startsWith('data:'))) {
    return providedPic;
  }
  if (gender === 'Male') return MALE_AVATAR;
  if (gender === 'Female') return FEMALE_AVATAR;
  return OTHER_AVATAR;
}

// Guest Login
APP.post('/api/auth/guest', (req, res) => {
  const { username, gender, age, city, state, country, profilePic, deviceId } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  const requestedUsername = username.trim().substring(0, 15);

  const bannedUser = dbManager.getUsers().find(u => u.username.toLowerCase() === requestedUsername.toLowerCase() && u.isBanned);
  if (bannedUser) {
    return res.status(403).json({ error: 'You have been banned for violating the community rules. Your account is no longer existing because you have violated the community rules.' });
  }

  const existingOtherUser = dbManager.getUsers().find(u => u.username.toLowerCase() === requestedUsername.toLowerCase() && u.type !== 'Guest');
  if (existingOtherUser) {
    return res.status(400).json({ error: 'This name is already registered by a member. Please give another username.' });
  }
  
  const existingUser = dbManager.getUsers().find(u => u.username === requestedUsername && u.type === 'Guest');
  
  if (existingUser) {
    if (existingUser.deviceId !== deviceId) {
      return res.status(400).json({ error: 'This name is already registered in another device. Please give another username.' });
    }
    // Check gender and age (convert age to number for comparison)
    const existingAge = existingUser.age;
    const incomingAge = age ? Number(age) : undefined;
    if (existingUser.gender !== (gender || 'Other') || existingAge !== incomingAge) {
      return res.status(400).json({ error: 'Username exists but details (gender or age) do not match the original registration.' });
    }
    
    // Existing user matches device and details!
    const token = jwt.sign({ id: existingUser.id, username: existingUser.username, type: 'Guest' }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token, user: existingUser });
  }

  // Create absolute unique guest user on stack
  const guestId = `guest_${Date.now()}_${Math.floor(Math.random() * 1005)}`;
  const guestUser: UserProfile = {
    id: guestId,
    username: requestedUsername,
    deviceId: deviceId,
    gender: gender || 'Other',
    age: age ? Number(age) : undefined,
    profilePic: getDefaultUserAvatar(gender || 'Other', profilePic),
    city: city || 'Unknown City',
    state: state || 'Unknown State',
    country: country || 'Unknown Country',
    originalCity: city || 'Unknown City',
    originalState: state || 'Unknown State',
    originalCountry: country || 'Unknown Country',
    online: false,
    type: 'Guest',
    createdAt: new Date().toISOString()
  };

  dbManager.addUser(guestUser);
  const token = jwt.sign({ id: guestId, username: guestUser.username, type: 'Guest' }, JWT_SECRET, { expiresIn: '1d' });

  res.json({ token, user: guestUser });
});

// Send Email Verification OTP Code
APP.post('/api/auth/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  OTP_STORE.set(email.toLowerCase(), otp);
  console.log(`[VibeChat simulated email OTP sent to: ${email}] OTP CODE: ${otp}`);
  res.json({ success: true, message: 'OTP dispatch simulation successful', otp });
});

// Verify Registration OTP
APP.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }
  const storedOtp = OTP_STORE.get(email.toLowerCase());
  if (storedOtp && storedOtp === otp) {
    return res.json({ success: true, message: 'OTP verified successfully' });
  }
  return res.status(400).json({ error: 'Incorrect 4-digit OTP code' });
});

// Forgot Password Flow
APP.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const user = dbManager.getUsers().find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'No user registered with this email address' });
  }
  const tempPass = Math.floor(100000 + Math.random() * 900000).toString();
  const hashed = dbManager.hashPassword(tempPass);
  dbManager.updatePassword(user.id, hashed);
  console.log(`[VibeChat password reset] New temp pass for ${email}: ${tempPass}`);
  res.json({ success: true, message: 'Password reset successful', tempPass });
});

// ADMIN LOGIN Multi-step - Step 1: Username
APP.post('/api/auth/admin-login-step1', (req, res) => {
  const { username } = req.body; // Actually this receives identifier
  if (!username) {
    return res.status(400).json({ error: 'Admin username is required' });
  }
  let user = dbManager.getUsers().find(u => u.username === username && u.type === 'Admin');
  if (!user && (username === 'vijay@123' || username === process.env.ADMIN_USER)) {
    user = dbManager.getUsers().find(u => u.type === 'Admin');
  }
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid administrators credentials username' });
  }
  ADMIN_LOGIN_STATE.set(username, { step: 2, verifiedUsername: true });
  res.json({ success: true, step: 2, message: 'Username validated.' });
});

// ADMIN LOGIN - Step 2: Password
APP.post('/api/auth/admin-login-step2', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password credentials required' });
  }
  const state = ADMIN_LOGIN_STATE.get(username);
  if (!state || !state.verifiedUsername) {
    return res.status(400).json({ error: 'Must initiate Step 1 username verification first' });
  }
  let user = dbManager.getUsers().find(u => u.username === username && u.type === 'Admin');
  if (!user && (username === 'vijay@123' || username === process.env.ADMIN_USER)) {
    user = dbManager.getUsers().find(u => u.type === 'Admin');
  }
  if (!user) {
    return res.status(404).json({ error: 'Admin root profile not found' });
  }
  const verified = dbManager.verifyPassword(user.id, password);
  if (!verified) {
    return res.status(401).json({ error: 'Incorrect administrator password credentials' });
  }
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  ADMIN_LOGIN_STATE.set(username, { ...state, step: 3, verifiedPassword: password, otpCode });
  console.log(`[VibeChat Admin Multi-step 2FA login OTP]: OTP: ${otpCode}`);
  res.json({ success: true, step: 3, message: 'Password validated. 2-step verification code triggered.', otpCode });
});

// ADMIN LOGIN - Step 3: OTP 2FA Code
APP.post('/api/auth/admin-login-step3', (req, res) => {
  const { username, otp } = req.body;
  if (!username || !otp) {
    return res.status(400).json({ error: 'Username and OTP 2FA code are required' });
  }
  const state = ADMIN_LOGIN_STATE.get(username);
  if (!state || state.step !== 3 || !state.otpCode) {
    return res.status(400).json({ error: 'Must pass step 1 & 2 verification first' });
  }
  if (otp !== state.otpCode) {
    return res.status(401).json({ error: 'Incorrect 2-step OTP verification code' });
  }
  let user = dbManager.getUsers().find(u => u.username === username && u.type === 'Admin');
  if (!user && (username === 'vijay@123' || username === process.env.ADMIN_USER)) {
    user = dbManager.getUsers().find(u => u.type === 'Admin');
  }
  if (!user) {
    return res.status(404).json({ error: 'Admin user details database session error' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, type: 'Admin' }, JWT_SECRET, { expiresIn: '7d' });
  ADMIN_LOGIN_STATE.delete(username);
  res.json({ success: true, token, user: { ...user, username: 'VIBECHAT ADMIN' } });
});

// Member Register
APP.post('/api/auth/register', (req, res) => {
  const { username, email, password, gender, age, dateOfBirth, profilePic, city, state, country, otpVerified, photoVerified, humanVerificationPic } = req.body;

  if (!username || !email || !password || !gender) {
    return res.status(400).json({ error: 'Username, Email, Password and Gender are required' });
  }

  // Validate OTP was verified
  if (!otpVerified) {
    return res.status(400).json({ error: 'Email verification OTP is required' });
  }

  const bannedUser = dbManager.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase() && u.isBanned);
  if (bannedUser) {
    return res.status(403).json({ error: 'You have been banned for violating the community rules. Your account is no longer existing because you have violated the community rules.' });
  }

  const existing = dbManager.getUserByEmailOrUsername(username) || dbManager.getUserByEmailOrUsername(email);
  if (existing) {
    return res.status(400).json({ error: 'Username or Email is already registered' });
  }

  const memberId = `member_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const hash = dbManager.hashPassword(password);
  
  const defaultAva = getDefaultUserAvatar(gender || 'Other', profilePic);

  const newUser: UserProfile = {
    id: memberId,
    username: username.trim(),
    email: email.trim(),
    gender,
    photoVerified: false,
    photoVerificationPending: !!humanVerificationPic,
    photoVerificationSubmittedAt: humanVerificationPic ? Date.now() : undefined,
    humanVerificationPic,
    dateOfBirth,
    age: age ? Number(age) : undefined,
    profilePic: defaultAva,
    city: city || 'Unknown City',
    state: state || 'Unknown State',
    country: country || 'Unknown Country',
    originalCity: city || 'Unknown City',
    originalState: state || 'Unknown State',
    originalCountry: country || 'Unknown Country',
    online: false,
    type: 'Registered',
    createdAt: new Date().toISOString()
  };

  dbManager.addUser(newUser, hash);
  const token = jwt.sign({ id: memberId, username: newUser.username, type: 'Registered' }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: newUser });
});

// Member Login
APP.post('/api/auth/login', (req, res) => {
  const { identifier, password, city, state, country } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/Username and Password are required' });
  }

  const user = dbManager.getUserByEmailOrUsername(identifier);
  if (!user || user.id.startsWith('guest_')) {
    return res.status(401).json({ error: 'Invalid identification credentials' });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'You have been banned for violating the community rules. Your account is no longer existing because you have violated the community rules.' });
  }

  const matches = dbManager.verifyPassword(user.id, password);
  if (!matches) {
    return res.status(401).json({ error: 'Invalid identification credentials' });
  }

  // Check VIP Expiry
  if ((user.type === 'Royal VIP' || user.type === 'Moderator') && user.vipExpiresAt) {
    if (new Date(user.vipExpiresAt) < new Date()) {
      user.type = user.email ? 'Registered' : 'Guest';
      user.isModerator = false;
      const stepDownUpdates: any = { 
        type: user.type, 
        isModerator: false,
        city: user.originalCity || user.city,
        state: user.originalState || user.state,
        country: user.originalCountry || user.country
      };
      if (user.type === 'Registered') {
         stepDownUpdates.photoVerified = true;
      }
      Object.assign(user, stepDownUpdates);
      dbManager.updateUser(user.id, stepDownUpdates);
    }
  }

  // Update physical location strictly on login
  if (city || state || country) {
    const locUpdates: any = {};
    if (city) locUpdates.city = city;
    if (state) locUpdates.state = state;
    if (country) locUpdates.country = country;
    Object.assign(user, locUpdates);
    dbManager.updateUser(user.id, locUpdates);
  }

  const token = jwt.sign({ id: user.id, username: user.username, type: user.type }, JWT_SECRET, { expiresIn: '7d' });
  const secureUser = user.type === 'Admin' ? { ...user, username: user.username || 'VibeChat ADMIN' } : user;
  res.json({ token, user: secureUser });
});

// Dedicated Admin Login with multi-factor OTP verification
let ADMIN_LOGIN_OTP = '';

APP.post('/api/auth/admin-login', (req, res) => {
  const { identifier, password, otp } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username and Password are required' });
  }

  let user = dbManager.getUserByEmailOrUsername(identifier);
  
  if (!user && (identifier === 'vijay@123' || identifier === process.env.ADMIN_USER)) {
    user = dbManager.getUsers().find(u => u.type === 'Admin');
  }

  if (!user || user.type !== 'Admin') {
    return res.status(401).json({ error: 'Access Denied: Not an authorized Administrator' });
  }

  const matches = dbManager.verifyPassword(user.id, password);
  if (!matches) {
    return res.status(401).json({ error: 'Invalid administrator credentials' });
  }

  // If no OTP was passed, generate and dispatch simulated MFA code
  if (!otp) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    ADMIN_LOGIN_OTP = code;
    console.log(`[VIBECHAT-ADMIN-SECURITY] MFA OTP Code generated: ${code}`);
    return res.json({ otpRequired: true, msg: 'MFA OTP Security Code sent to registered Admin device.', simulatedOtp: code });
  }

  if (otp !== ADMIN_LOGIN_OTP) {
    return res.status(401).json({ error: 'MFA Verification failed: Invalid OTP security code' });
  }

  // Success! Issue Admin JWT Token
  const token = jwt.sign({ id: user.id, username: user.username, type: 'Admin' }, JWT_SECRET, { expiresIn: '1d' });
  const secureUser = { ...user, username: user.username || 'VibeChat ADMIN' };
  res.json({ success: true, token, user: secureUser });
});

// Current Auth User
APP.get('/api/auth/me', authenticateToken, (req: any, res) => {
  let user = dbManager.getUser(req.user.id);
  if (!user) {
    if (req.user && req.user.id) {
      const type = req.user.type || 'Guest';
      const userGender = req.user.gender || 'Other';
      const defaultPic = userGender === 'Male' 
        ? "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%236366f1'/><circle cx='50' cy='35' r='18' fill='%23ffffff'/><path d='M50,58 C32,58 20,72 20,85 L80,85 C80,72 68,58 50,58 Z' fill='%23ffffff'/></svg>" 
        : (userGender === 'Female' 
           ? "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23ec4899'/><circle cx='50' cy='35' r='18' fill='%23ffffff'/><path d='M50,58 C32,58 20,72 20,85 L80,85 C80,72 68,58 50,58 Z' fill='%23ffffff'/></svg>" 
           : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23a855f7'/><circle cx='50' cy='35' r='18' fill='%23ffffff'/><path d='M50,58 C32,58 20,72 20,85 L80,85 C80,72 68,58 50,58 Z' fill='%23ffffff'/></svg>");
      
      user = {
        id: req.user.id,
        username: req.user.username || (type === 'Guest' ? 'Guest_' + req.user.id.substring(Math.max(0, req.user.id.length - 6)) : 'User_' + req.user.id.substring(Math.max(0, req.user.id.length - 6))),
        email: req.user.email || undefined,
        deviceId: 'restored-session-device',
        gender: userGender,
        profilePic: req.user.profilePic || defaultPic,
        online: true,
        type: type,
        city: 'VibeChat Lounge',
        state: 'Online',
        country: 'Worldwide',
        originalCity: 'VibeChat Lounge',
        originalState: 'Online',
        originalCountry: 'Worldwide',
        createdAt: new Date().toISOString()
      };
      dbManager.addUser(user);
      console.log(`[VibeChat Session Restore] On-the-fly session recovery for: ${user.username} (${user.type})`);
    } else {
      return res.status(404).json({ error: 'User profile session not found' });
    }
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'You have been banned for violating the community rules. Your account is no longer existing because you have violated the community rules.' });
  }

  // Check VIP Expiry in real-time
  if ((user.type === 'Royal VIP' || user.type === 'Moderator') && user.vipExpiresAt) {
    if (new Date(user.vipExpiresAt) < new Date()) {
      user.type = user.email ? 'Registered' : 'Guest';
      user.isModerator = false;
      const stepDownUpdates: any = { 
        type: user.type, 
        isModerator: false,
        city: user.originalCity || user.city,
        state: user.originalState || user.state,
        country: user.originalCountry || user.country
      };
      if (user.type === 'Registered') {
         stepDownUpdates.photoVerified = true;
      }
      dbManager.updateUser(user.id, stepDownUpdates);
    }
  }

  const secureUser = {
    ...(user.type === 'Admin' ? { ...user, username: user.username || 'VibeChat ADMIN' } : user),
    blockedUsers: dbManager.getBlocks(user.id)
  };
  res.json(secureUser);
});

// Update Profile
APP.post('/api/profile/update', authenticateToken, (req: any, res) => {
  const { city, state, country, profilePic, username, gender, bio, age } = req.body;
  const user = dbManager.getUser(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User does not exist' });
  }

  const updates: Partial<UserProfile> = {};
  
  if (profilePic) updates.profilePic = profilePic;
  if (username) updates.username = username;
  if (bio !== undefined) updates.bio = bio;
  if (gender !== undefined) updates.gender = gender;
  if (age !== undefined) updates.age = age;

  // Only VIPs or Admins can spoof/change their location manually
  if (user.type === 'Royal VIP' || user.type === 'Moderator' || user.type === 'Admin') {
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (country !== undefined) updates.country = country;
  }

  const updatedProfile = dbManager.updateUser(user.id, updates);
  broadcastToAll('stats:update', getLiveStats());
  res.json(updatedProfile);
});

// Live stats report
APP.get('/api/stats', (req, res) => {
  res.json(getLiveStats());
});

// Platform plans lists
APP.get('/api/vip/plans', (req, res) => {
  res.json(dbManager.getPlans());
});

// Fetch active online users sorted with VIP priority
APP.get('/api/users/online', authenticateToken, (req: any, res) => {
  const meId = req.user.id;
  const list = dbManager.getUsers()
    .filter(u => u.online && u.id !== meId && !u.isBanned)
    .sort((a, b) => {
      const getPriority = (type: string) => {
        if (type === 'Admin') return 5;
        if (type === 'Moderator') return 4;
        if (type === 'Royal VIP') return 3;
        if (type === 'Registered') return 2;
        return 1; // Guest
      };
      
      const pA = getPriority(a.type);
      const pB = getPriority(b.type);
      
      if (pA !== pB) {
        return pB - pA;
      }
      return a.username.localeCompare(b.username); // Secondary alphabet sorting
    })
    .map(u => ({
      ...u,
      username: u.type === 'Admin' ? (u.username || 'VibeChat ADMIN') : u.username
    }));
  res.json(list);
});

// Search for offline/online candidates by name or city in people lounge search
APP.get('/api/users/search', authenticateToken, (req: any, res) => {
  const meId = req.user.id;
  const q = String(req.query.q || '').toLowerCase().trim();
  if (!q) {
    return res.json([]);
  }

  const matches = dbManager.getUsers()
    .filter(u => u.id !== meId && !u.isBanned && (
      (u.username || '').toLowerCase().includes(q) || 
      (u.city && u.city.toLowerCase().includes(q))
    ))
    .sort((a, b) => {
      // 1. Online users first
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;

      // 2. VIP Role Priority
      const getPriority = (type: string) => {
        if (type === 'Admin') return 5;
        if (type === 'Moderator') return 4;
        if (type === 'Royal VIP') return 3;
        if (type === 'Registered') return 2;
        return 1; // Guest
      };
      const pA = getPriority(a.type);
      const pB = getPriority(b.type);
      if (pA !== pB) {
        return pB - pA;
      }
      return (a.username || '').localeCompare(b.username || '');
    })
    .map(u => ({
      id: u.id,
      username: u.username,
      gender: u.gender,
      type: u.type,
      profilePic: u.profilePic,
      bio: u.bio || '',
      city: u.city || '',
      state: u.state || '',
      country: u.country || '',
      online: u.online,
      lastSeenAt: u.lastSeenAt || null
    }));

  res.json(matches);
});

// Update VIP plans (Admin Only)
APP.post('/api/admin/vip/plans', authenticateToken, adminRequired, (req, res) => {
  const { plans } = req.body;
  if (!Array.isArray(plans)) {
    return res.status(400).json({ error: 'Plans array is required' });
  }
  const updated = dbManager.updatePlans(plans);
  broadcastToAll('plans:update', updated);
  res.json(updated);
});

// Create report
APP.post('/api/reports', authenticateToken, (req: any, res) => {
  const { reportedId, reason } = req.body;
  if (!reportedId || !reason) {
    return res.status(400).json({ error: 'reportedId and reason are required' });
  }

  const reporter = dbManager.getUser(req.user.id);
  const reported = dbManager.getUser(reportedId);

  if (!reporter || !reported) {
    return res.status(404).json({ error: 'Users not found' });
  }

  const reportId = `rep_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  dbManager.addReport({
    id: reportId,
    reporterId: reporter.id,
    reporterName: reporter.username,
    reportedId: reported.id,
    reportedName: reported.username,
    reason,
    timestamp: Date.now(),
    status: 'Pending'
  });

  res.json({ success: true, message: 'Thank you for your report. The system moderators have been alerted.' });
});

// Block User
APP.post('/api/blocks', authenticateToken, (req: any, res) => {
  const { blockedId } = req.body;
  if (!blockedId) {
    return res.status(400).json({ error: 'blockedId is required' });
  }

  dbManager.blockUser(req.user.id, blockedId);
  res.json({ success: true, message: 'User blocked' });
});

// Unblock User
APP.post('/api/blocks/unblock', authenticateToken, (req: any, res) => {
  const { blockedId } = req.body;
  if (!blockedId) {
    return res.status(400).json({ error: 'blockedId is required' });
  }

  dbManager.unblockUser(req.user.id, blockedId);
  res.json({ success: true, message: 'User unblocked' });
});

// Friends management
APP.get('/api/friends', authenticateToken, (req: any, res) => {
  res.json(dbManager.getFriends(req.user.id));
});

APP.get('/api/friends/requests', authenticateToken, (req: any, res) => {
  res.json(dbManager.getFriendRequests(req.user.id));
});

APP.post('/api/friends/request', authenticateToken, (req: any, res) => {
  const { recipientId } = req.body;
  if (!recipientId) return res.status(400).json({ error: 'recipientId required' });

  const sender = dbManager.getUser(req.user.id);
  if (!sender) return res.status(404).json({ error: 'No user session' });

  const freqId = `freq_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  dbManager.addFriendRequest({
    id: freqId,
    senderId: sender.id,
    senderName: sender.username,
    senderPic: sender.profilePic,
    recipientId,
    timestamp: Date.now()
  });

  // Relay friend request in real-time over websocket if recipient is online
  sendWSMessage(recipientId, 'friend:request', {
    id: freqId,
    senderId: sender.id,
    senderName: sender.username,
    senderPic: sender.profilePic,
    timestamp: Date.now()
  });

  res.json({ success: true, message: 'Friend request dispatched' });
});

APP.post('/api/friends/accept', authenticateToken, (req: any, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'requestId required' });

  const reqs = dbManager.getFriendRequests(req.user.id);
  const found = reqs.find(fr => fr.id === requestId);
  if (!found) return res.status(404).json({ error: 'Friend request not found' });

  dbManager.addFriend(req.user.id, found.senderId);
  dbManager.removeFriendRequest(requestId);

  // Send real-time ws triggers to both peers to update friends views
  sendWSMessage(found.senderId, 'friend:accepted', { friendId: req.user.id });
  sendWSMessage(req.user.id, 'friend:accepted', { friendId: found.senderId });

  res.json({ success: true });
});

APP.post('/api/friends/reject', authenticateToken, (req: any, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'requestId required' });

  dbManager.removeFriendRequest(requestId);
  res.json({ success: true });
});

APP.delete('/api/friends/:friendId', authenticateToken, (req: any, res) => {
  const friendId = req.params.friendId;
  dbManager.removeFriend(req.user.id, friendId);
  sendWSMessage(friendId, 'friend:removed', { companionId: req.user.id });
  res.json({ success: true });
});

// Fetch historical messages for 1v1 conversation
APP.get('/api/messages/:peerId', authenticateToken, (req: any, res) => {
  const senderId = req.user.id;
  const recipientId = req.params.peerId;

  // Retrieve VIP limits
  const selfProfile = dbManager.getUser(senderId);
  if (selfProfile && selfProfile.type !== 'Royal VIP') {
    // Non-VIP limit check: Count of distinct recent contacts
    const recents = dbManager.getRecentChatsFor(senderId);
    const peerIsRecent = recents.some(r => r.peerId === recipientId);
    
    // If the conversation is NOT in the top 5, and we already have 5+ recent contacts, deny access unless peerIsRecent
    if (!peerIsRecent && recents.length >= 5) {
      return res.status(403).json({ 
        error: 'Recent boundary reached', 
        isLocked: true 
      });
    }
  }

  const messages = dbManager.getMessagesBetween(senderId, recipientId);
  dbManager.markMessagesRead(recipientId, senderId);
  res.json(messages);
});

// Fetch recent chats with VIP-check constraints
APP.get('/api/messages-list', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const user = dbManager.getUser(userId);

  if (!user) return res.status(404).json({ error: 'Session User expired' });

  const isVIP = user.type === 'Royal VIP' || user.type === 'Moderator' || user.type === 'Admin';
  // If not VIP, limit to strictly max 5 recent chats.
  const limitValue = isVIP ? undefined : 6; // fetch 1 extra to show unlocking button when count > 5
  const recents = dbManager.getRecentChatsFor(userId, limitValue);

  res.json({
    chats: recents.slice(0, 5),
    hasMore: recents.length > 5,
    isVIP
  });
});

// Submit/Initiate Payment
APP.post('/api/vip/pay', authenticateToken, (req: any, res) => {
  const { planId, screenshotUrl } = req.body;
  if (!planId || !screenshotUrl) {
    return res.status(400).json({ error: 'planId and screenshotUrl (base64) are required' });
  }

  const user = dbManager.getUser(req.user.id);
  if (!user) return res.status(404).json({ error: 'User does not exist' });

  const plan = dbManager.getPlans().find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'Selected VIP plan not found' });

  const payId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const payReq: VipPaymentInvoice = {
    id: payId,
    userId: user.id,
    username: user.username,
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    screenshotUrl,
    status: 'Pending',
    timestamp: Date.now()
  };

  dbManager.addPayment(payReq);

  res.json({ success: true, message: 'VIP Payment submitted successfully. Admin verification pending.', invoice: payReq });
});

// Fetch user profile detail cleanly
APP.get('/api/users/profile/:id', authenticateToken, (req: any, res) => {
  const targetId = req.params.id;
  const user = dbManager.getUser(targetId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  // Sanitize profile details for public viewing
  const cleanProfile = {
    id: user.id,
    username: user.type === 'Admin' ? (user.username || 'VibeChat ADMIN') : user.username,
    gender: user.gender,
    age: user.age,
    profilePic: user.profilePic,
    city: user.city,
    state: user.state,
    country: user.country,
    type: user.type,
    online: user.online || ACTIVE_CONNECTIONS.has(user.id),
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt,
    bio: user.bio
  };
  res.json(cleanProfile);
});

// ---------------------------------------------------------
// SECURE ADMIN CONTROL ROUTES
// ---------------------------------------------------------
APP.get('/api/config/public', (req, res) => {
  const config = dbManager.getConfig();
  // Strip sensitive things if any, but currently config is just qrCodeUrl, upiId, announcement.
  res.json({
    announcement: config.announcement,
    qrCodeUrl: config.qrCodeUrl
  });
});

APP.get('/api/admin/config', authenticateToken, adminRequired, (req, res) => {
  res.json(dbManager.getConfig());
});

APP.post('/api/admin/config', authenticateToken, adminRequired, (req, res) => {
  const updated = dbManager.updateConfig(req.body);
  broadcastToAll('config:update', updated);
  res.json(updated);
});

APP.get('/api/admin/users', authenticateToken, adminRequired, (req, res) => {
  res.json(dbManager.getUsers().filter(u => u.type !== 'Admin'));
});

// Admin endpoint to edit/control ANY property of any user profile pin-to-pin
APP.post('/api/admin/users/update', authenticateToken, adminRequired, (req, res) => {
  const { userId, username, gender, age, bio, city, state, country, profilePic, type, isBanned } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required in the body' });
  }

  const user = dbManager.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updates: Partial<UserProfile> = {};
  if (username !== undefined) updates.username = username;
  if (gender !== undefined) updates.gender = gender;
  if (age !== undefined) updates.age = Number(age) || undefined;
  if (bio !== undefined) updates.bio = bio;
  if (city !== undefined) updates.city = city;
  if (state !== undefined) updates.state = state;
  if (country !== undefined) updates.country = country;
  if (profilePic !== undefined) updates.profilePic = profilePic;
  if (type !== undefined) updates.type = type;
  if (isBanned !== undefined) {
    updates.isBanned = !!isBanned;
    if (isBanned) {
      // Instantly disconnect client if online
      const userSocket = ACTIVE_CONNECTIONS.get(userId);
      if (userSocket) {
        userSocket.send(JSON.stringify({ event: 'auth:banned', data: {} }));
        userSocket.close();
      }
    }
  }

  // Pre-calculate what exact changes are happening to show in the user's pop-up info
  const changesList: string[] = [];
  if (username !== undefined && user.username !== username) changesList.push(`Username modified to "${username}"`);
  if (gender !== undefined && user.gender !== gender) changesList.push(`Gender updated to "${gender}"`);
  if (age !== undefined && user.age !== Number(age)) changesList.push(`Age changed to ${age}`);
  if (bio !== undefined && user.bio !== bio) changesList.push(`Bio changed to "${bio}"`);
  if (city !== undefined && user.city !== city) changesList.push(`City updated to "${city}"`);
  if (state !== undefined && user.state !== state) changesList.push(`State updated to "${state}"`);
  if (country !== undefined && user.country !== country) changesList.push(`Country updated to "${country}"`);
  if (profilePic !== undefined && user.profilePic !== profilePic) changesList.push(`Profile photo reloaded`);
  if (type !== undefined && user.type !== type) changesList.push(`Rank level updated to "${type}"`);

  const updatedProfile = dbManager.updateUser(userId, updates);
  broadcastToAll('stats:update', getLiveStats());

  // Notify the user if they are actively connected
  if (changesList.length > 0) {
    const userSocket = ACTIVE_CONNECTIONS.get(userId);
    if (userSocket) {
      userSocket.send(JSON.stringify({
        event: 'profile:admin_force_updated',
        data: {
          by: 'VibeChat System Administrator',
          changes: changesList,
          user: updatedProfile
        }
      }));
    }
  }

  res.json({ success: true, user: updatedProfile });
});

APP.post('/api/admin/users/ban', authenticateToken, adminRequired, (req: any, res) => {
  const { userId, ban } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const user = dbManager.getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  dbManager.updateUser(userId, { isBanned: !!ban });

  if (ban) {
    // Instantly disconnect client if online
    const userSocket = ACTIVE_CONNECTIONS.get(userId);
    if (userSocket) {
      userSocket.send(JSON.stringify({ event: 'auth:banned', data: {} }));
      userSocket.close();
    }
  }

  res.json({ success: true, isBanned: !!ban });
});

APP.delete('/api/admin/users/:userId', authenticateToken, adminRequired, (req, res) => {
  const uId = req.params.userId;
  const userSocket = ACTIVE_CONNECTIONS.get(uId);
  if (userSocket) {
    userSocket.send(JSON.stringify({ event: 'auth:deleted', data: {} }));
    userSocket.close();
  }
  dbManager.deleteUser(uId);
  res.json({ success: true });
});

APP.delete('/api/admin/users/:userId/photo', authenticateToken, adminRequired, (req, res) => {
  const uId = req.params.userId;
  dbManager.updateUser(uId, { profilePic: '', bio: '[Content removed by moderator]' });
  res.json({ success: true });
});

APP.post('/api/admin/verify-photo', authenticateToken, adminRequired, (req, res) => {
  const { userId, approve } = req.body;
  const user = dbManager.getUser(userId);
  if (!user) return res.status(404).json({error: 'User not found'});

  const updates: any = {
    photoVerificationPending: false
  };

  if (approve) {
    updates.photoVerified = true;
  } else {
    updates.photoVerified = false;
    updates.humanVerificationPic = ''; // wipe on reject
  }
  
  dbManager.updateUser(userId, updates);
  res.json({ success: true, user: dbManager.getUser(userId) });
});

// Auto-approval interval (20 minutes)
setInterval(() => {
  const users = dbManager.getUsers();
  const now = Date.now();
  let updated = false;

  // 1. Auto-verify photos
  users.forEach(u => {
    if (u.photoVerificationPending && u.photoVerificationSubmittedAt && (now - u.photoVerificationSubmittedAt > 20 * 60 * 1000)) {
      dbManager.updateUser(u.id, {
        photoVerificationPending: false,
        photoVerified: true
      });
      updated = true;
      console.log(`[VibeChat Auto-Verify] Approved photo for user ${u.username} after 20 minutes.`);
    }
  });

  // 2. Auto-verify pending VIP payments
  const payments = dbManager.getPayments();
  payments.forEach(p => {
    if (p.status === 'Pending' && p.timestamp && (now - p.timestamp > 20 * 60 * 1000)) {
      const result = dbManager.approvePayment(p.id);
      console.log(`[VibeChat Auto-Verify] Approved payment ${p.id} after 20 minutes.`);
      if (result.success && result.userId) {
        const u = dbManager.getUser(result.userId);
        if (u) {
          // Notify the user client via websocket that they were promoted
          try {
            sendWSMessage(u.id, 'vip:activated', {
              type: u.type,
              expiresAt: u.vipExpiresAt,
              status: 'Approved'
            });
            broadcastToAll('stats:update', getLiveStats());
          } catch (e) {
            console.error("Failed to notify user of auto-approve", e);
          }
        }
      }
    }
  });

  // 3. Auto-ban users from unresolved reports after 20 minutes
  const reports = dbManager.getReports();
  reports.forEach(r => {
    if (r.status === 'Pending' && r.timestamp && (now - r.timestamp > 20 * 60 * 1000)) {
      dbManager.updateUser(r.reportedId, { isBanned: true });
      dbManager.resolveReport(r.id);
      
      const userSocket = ACTIVE_CONNECTIONS.get(r.reportedId);
      if (userSocket) {
        userSocket.send(JSON.stringify({ event: 'auth:banned', data: {} }));
        userSocket.close();
      }
      updated = true;
      console.log(`[VibeChat Auto-Ban] Automatically banned user ${r.reportedId} after 20 minutes of unresolved report.`);
    }
  });

  // 4. Auto-expire VIP plans
  users.forEach(u => {
    if ((u.type === 'Royal VIP' || u.type === 'Moderator') && u.vipExpiresAt) {
      if (new Date(u.vipExpiresAt) < new Date(now)) {
        const fallBackType = u.email ? 'Registered' : 'Guest';
        dbManager.updateUser(u.id, {
          type: fallBackType,
          vipExpiresAt: undefined,
          isModerator: false,
          city: u.originalCity || u.city,
          state: u.originalState || u.state,
          country: u.originalCountry || u.country
        });
        updated = true;
        
        // Notify user if online
        const userSocket = ACTIVE_CONNECTIONS.get(u.id);
        if (userSocket) {
           userSocket.send(JSON.stringify({ event: 'auth:deleted', data: { message: "Your VIP plan has naturally expired." } }));
        }
        console.log(`[VibeChat Expiry] Removed VIP for ${u.username} as time elapsed.`);
      }
    }
  });

}, 60000); // Check every minute

APP.get('/api/admin/payments', authenticateToken, adminRequired, (req, res) => {
  res.json(dbManager.getPayments());
});

APP.post('/api/admin/payments/review', authenticateToken, adminRequired, (req, res) => {
  const { id, status } = req.body; // status 'Approved' | 'Rejected'
  if (!id || !status) return res.status(400).json({ error: 'id and status required' });

  let result;
  if (status === 'Approved') {
    result = dbManager.approvePayment(id);
  } else {
    result = dbManager.rejectPayment(id);
  }

  if (result.success && result.userId) {
    const updatedUser = dbManager.getUser(result.userId);
    // Notify the user in real-time if online
    if (updatedUser) {
      sendWSMessage(result.userId, 'vip:activated', { 
        type: updatedUser.type,
        expiresAt: updatedUser.vipExpiresAt,
        status
      });
      // push full roster stats update
      broadcastToAll('stats:update', getLiveStats());
    }
  }

  res.json({ success: result.success });
});

APP.post('/api/admin/users/promote-mod', authenticateToken, adminRequired, (req, res) => {
  const { userId } = req.body;
  const user = dbManager.getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  dbManager.updateUser(userId, { type: 'Moderator', isModerator: true });
  sendWSMessage(userId, 'vip:activated', { type: 'Moderator', status: 'Approved' });
  broadcastToAll('stats:update', getLiveStats());
  res.json({ success: true });
});

APP.post('/api/admin/users/demote-mod', authenticateToken, adminRequired, (req, res) => {
  const { userId } = req.body;
  const user = dbManager.getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newType = (user.vipExpiresAt && new Date(user.vipExpiresAt) > new Date()) ? 'Royal VIP' : 'Registered';
  dbManager.updateUser(userId, { type: newType, isModerator: false });
  sendWSMessage(userId, 'vip:activated', { type: newType, status: 'Demoted' });
  broadcastToAll('stats:update', getLiveStats());
  res.json({ success: true });
});

// Force Grant VIP
APP.post('/api/admin/users/grant-vip', authenticateToken, adminRequired, (req, res) => {
  const { userId, days } = req.body;
  const user = dbManager.getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const activeDays = parseInt(days) || 30;
  let currentExpiry = user.vipExpiresAt ? new Date(user.vipExpiresAt) : new Date();
  if (currentExpiry < new Date()) {
    currentExpiry = new Date();
  }
  currentExpiry.setDate(currentExpiry.getDate() + activeDays);

  const newType = (user.type === 'Admin' || user.type === 'Moderator') ? user.type : 'Royal VIP';

  const updatedProfile = dbManager.updateUser(userId, {
    type: newType,
    vipExpiresAt: currentExpiry.toISOString()
  });

  sendWSMessage(userId, 'vip:activated', {
    type: newType,
    expiresAt: currentExpiry.toISOString(),
    status: 'Approved'
  });
  broadcastToAll('stats:update', getLiveStats());

  res.json(updatedProfile);
});

// Remove VIP
APP.post('/api/admin/users/remove-vip', authenticateToken, adminRequired, (req, res) => {
  const { userId } = req.body;
  const user = dbManager.getUser(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const fallBackType = user.email ? 'Registered' : 'Guest';
  const updatedProfile = dbManager.updateUser(userId, {
    type: fallBackType,
    vipExpiresAt: undefined,
    city: user.originalCity || user.city,
    state: user.originalState || user.state,
    country: user.originalCountry || user.country
  });

  sendWSMessage(userId, 'vip:revoked', {});
  broadcastToAll('stats:update', getLiveStats());

  res.json(updatedProfile);
});

APP.get('/api/admin/reports', authenticateToken, adminRequired, (req, res) => {
  res.json(dbManager.getReports());
});

APP.post('/api/admin/reports/resolve', authenticateToken, adminRequired, (req, res) => {
  const { reportId } = req.body;
  if (!reportId) return res.status(400).json({ error: 'reportId is required' });
  dbManager.resolveReport(reportId);
  res.json({ success: true });
});

// ---------------------------------------------------------
// WEBSOCKET HANDLERS & REAL-TIME SERVER
// ---------------------------------------------------------
WSS.on('connection', (ws: WebSocket, request, decodedUser: any) => {
  const userId = decodedUser.id;
  const userProfile = dbManager.getUser(userId);

  if (!userProfile) {
    ws.close(1008, 'Identity profile not registered');
    return;
  }

  // Set local state in DB to online
  dbManager.updateUser(userId, { online: true });
  ACTIVE_CONNECTIONS.set(userId, ws);

  // Send initial welcome state and fresh live stats
  ws.send(JSON.stringify({
    event: 'welcome',
    data: {
      profile: userProfile,
      stats: getLiveStats(),
      announcement: dbManager.getConfig().announcement
    }
  }));

  // Synchronously update everyone on connection changes
  broadcastToAll('stats:update', getLiveStats());

  ws.on('message', (messageRaw: string) => {
    try {
      const { event, data } = JSON.parse(messageRaw);
      
      // Keep-alive or Ping matching
      if (event === 'ping') {
        ws.send(JSON.stringify({ event: 'pong', data: {} }));
        return;
      }

      // MATCHMAKING TRIGGERS
      if (event === 'match:start') {
        // Remove from existing queues
        MATCHING_QUEUE = MATCHING_QUEUE.filter(c => c.userId !== userId);

        const currentProfile = dbManager.getUser(userId);
        if (currentProfile) {
          // Put candidate inside matchmaking stack
          MATCHING_QUEUE.push({
            userId: currentProfile.id,
            gender: currentProfile.gender,
            city: currentProfile.city,
            state: currentProfile.state,
            country: currentProfile.country,
            type: currentProfile.type,
            filters: data?.filters || {}
          });

          ws.send(JSON.stringify({ event: 'match:searching', data: {} }));
          searchMatches();
        }
      }

      if (event === 'match:cancel') {
        MATCHING_QUEUE = MATCHING_QUEUE.filter(c => c.userId !== userId);
        ws.send(JSON.stringify({ event: 'match:stopped', data: {} }));
      }

      // CHAT MESSAGES
      if (event === 'chat:message') {
        const { recipientId, content, mediaUrl, type } = data;
        const msgId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Spam mitigation safety layer (rate limit count of chats etc inside memory if necessary, done at client)
        if (!recipientId || (!content && !mediaUrl)) return;

        // Block checks
        if (dbManager.isBlocked(userId, recipientId)) {
          ws.send(JSON.stringify({ event: 'chat:blocked', data: { recipientId } }));
          return;
        }

        const msgRecord: ChatMessage = {
          id: msgId,
          senderId: userId,
          recipientId,
          content: content ? content.trim() : '',
          mediaUrl,
          type: type || 'text',
          timestamp: Date.now(),
          read: false
        };

        dbManager.addMessage(msgRecord);

        // Forward message in real-time
        if (ACTIVE_CONNECTIONS.has(recipientId)) {
          sendWSMessage(recipientId, 'chat:message', msgRecord);
        }
        
        // Notify sender confirmation
        ws.send(JSON.stringify({ event: 'chat:delivered', data: msgRecord }));
      }

      // TYPING STATUS
      if (event === 'chat:typing') {
        const { recipientId, typing } = data;
        if (recipientId && ACTIVE_CONNECTIONS.has(recipientId)) {
          sendWSMessage(recipientId, 'chat:typing', {
            senderId: userId,
            typing: !!typing
          });
        }
      }

      // CHAT ROOM ACCESSIBILITY / SEEN FOCUS
      if (event === 'chat:focus') {
        const { recipientId } = data;
        if (recipientId) {
          ACTIVE_ROOM_FOCUS.set(userId, recipientId);
          
          // Inform the recipient that userId is actively viewing their chat (Yellow light ONLINE)
          const targetSocket = ACTIVE_CONNECTIONS.get(recipientId);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              event: 'chat:presence',
              data: {
                userId: userId,
                focusing: true
              }
            }));
          }

          // If the recipient was already focusing userId's chat, inform userId immediately too!
          if (ACTIVE_ROOM_FOCUS.get(recipientId) === userId) {
            ws.send(JSON.stringify({
              event: 'chat:presence',
              data: {
                userId: recipientId,
                focusing: true
              }
            }));
          }
        }
      }

      if (event === 'chat:blur') {
        const { recipientId } = data;
        if (recipientId) {
          ACTIVE_ROOM_FOCUS.delete(userId);
          
          // Inform the recipient that userId stopped viewing their chat
          const targetSocket = ACTIVE_CONNECTIONS.get(recipientId);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              event: 'chat:presence',
              data: {
                userId: userId,
                focusing: false
              }
            }));
          }
        }
      }

      if (event === 'chat:delete_message') {
        const { messageId, recipientId } = data;
        if (messageId) {
          dbManager.deleteMessage(messageId);
          
          // Notify the recipient
          if (recipientId && ACTIVE_CONNECTIONS.has(recipientId)) {
            sendWSMessage(recipientId, 'chat:delete_message', { messageId });
          }
          
          // Confirm back to sender
          ws.send(JSON.stringify({
            event: 'chat:delete_message_confirmed',
            data: { messageId }
          }));
        }
      }

      // WEBRTC CALL INITIATION / SIGNALING
      if (event === 'call:request') {
        const { recipientId, type } = data; // type: 'audio' | 'video'
        
        if (dbManager.isBlocked(userId, recipientId)) {
          ws.send(JSON.stringify({ event: 'call:rejected', data: { reason: 'User blocked' } }));
          return;
        }

        const user = dbManager.getUser(userId);
        const isCallerVIP = user?.type === 'Royal VIP' || user?.type === 'Admin';
        
        // Check if recipient is busy (in a call)
        let isBusy = false;
        for (const [activeUserId, callData] of ACTIVE_CALLS.entries()) {
          if (activeUserId === recipientId || callData.peerId === recipientId) {
            isBusy = true;
            break;
          }
        }

        if (isBusy && !isCallerVIP) {
          ws.send(JSON.stringify({ event: 'call:failed', data: { reason: 'Recipient is currently busy' } }));
          return;
        }

        const recipientSocket = ACTIVE_CONNECTIONS.get(recipientId);
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(JSON.stringify({
            event: 'call:request',
            data: {
              callerId: userId,
              callerName: user?.username || 'Stranger',
              callerPic: user?.profilePic || '',
              type,
              breakthrough: isBusy && isCallerVIP
            }
          }));
          ACTIVE_CALLS.set(userId, { peerId: recipientId, type });
        } else {
          ws.send(JSON.stringify({ event: 'call:failed', data: { reason: 'Recipient is currently offline' } }));
        }
      }

      if (event === 'call:response') {
        const { callerId, accepted } = data;
        const callerSocket = ACTIVE_CONNECTIONS.get(callerId);
        
        if (accepted) {
          ACTIVE_CALLS.set(userId, { peerId: callerId, type: 'audio' }); // default
        } else {
          ACTIVE_CALLS.delete(callerId);
        }

        if (callerSocket && callerSocket.readyState === WebSocket.OPEN) {
          callerSocket.send(JSON.stringify({
            event: 'call:response',
            data: {
              responderId: userId,
              accepted
            }
          }));
        }
      }

      if (event === 'webrtc:signal') {
        const { targetId, signal } = data;
        const targetSocket = ACTIVE_CONNECTIONS.get(targetId);
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify({
            event: 'webrtc:signal',
            data: {
              senderId: userId,
              signal
            }
          }));
        }
      }

      if (event === 'call:hangup') {
        const { targetId } = data;
        ACTIVE_CALLS.delete(userId);
        ACTIVE_CALLS.delete(targetId);

        const targetSocket = ACTIVE_CONNECTIONS.get(targetId);
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify({
            event: 'call:hangup',
            data: {
              senderId: userId
            }
          }));
        }
      }

    } catch (e) {
      console.error('Error handling WebSocket message', e);
    }
  });

  ws.on('close', () => {
    // Notify room focus recipient if we were focusing
    const focusedRecipient = ACTIVE_ROOM_FOCUS.get(userId);
    if (focusedRecipient) {
      ACTIVE_ROOM_FOCUS.delete(userId);
      const targetSocket = ACTIVE_CONNECTIONS.get(focusedRecipient);
      if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
        targetSocket.send(JSON.stringify({
          event: 'chat:presence',
          data: {
            userId: userId,
            focusing: false
          }
        }));
      }
    }

    dbManager.updateUser(userId, { online: false, lastSeenAt: new Date().toISOString() });
    ACTIVE_CONNECTIONS.delete(userId);
    MATCHING_QUEUE = MATCHING_QUEUE.filter(c => c.userId !== userId);
    
    // Clear ongoing active calls involving this client
    for (const [callerId, call] of ACTIVE_CALLS.entries()) {
      if (callerId === userId || call.peerId === userId) {
        const peerSocket = ACTIVE_CONNECTIONS.get(callerId === userId ? call.peerId : callerId);
        if (peerSocket) {
          peerSocket.send(JSON.stringify({ event: 'call:hangup', data: { senderId: userId } }));
        }
        ACTIVE_CALLS.delete(callerId);
      }
    }

    broadcastToAll('stats:update', getLiveStats());
  });
});

// Handshake for websocket upgrading with JWT auth validation
SERVER.on('upgrade', (request, socket, head) => {
  const urlParams = new URL(request.url || '', `http://${request.headers.host}`);
  const token = urlParams.searchParams.get('token');

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err || !decoded) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    WSS.handleUpgrade(request, socket, head, (ws) => {
      WSS.emit('connection', ws, request, decoded);
    });
  });
});

// ---------------------------------------------------------
// EXTREME VITE DEVELOPMENT OR STAGE SERVING
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite in dev mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    APP.use(vite.middlewares);
  } else {
    // Serve static compiled UI files in production
    const distPath = path.join(process.cwd(), 'dist');
    APP.use(express.static(distPath));
    APP.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  SERVER.listen(PORT, '0.0.0.0', () => {
    console.log(`VibeChat Application running on http://localhost:${PORT}`);
  });
}

startServer();
export default APP;
