// Date formatting utilities for Last Seen and Joined Date

export function formatLastSeen(lastSeenAtStr?: string, online?: boolean): string {
  if (online) return 'Active Now';
  if (!lastSeenAtStr) return 'Offline';
  
  try {
    const lastSeen = new Date(lastSeenAtStr);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    
    if (diffMins < 1) {
      return 'Just Now';
    }
    if (diffMins < 60) {
      return `${diffMins} Minutes Ago`;
    }
    
    // Check if today
    const isToday = lastSeen.toDateString() === now.toDateString();
    if (isToday) {
      const timeStr = lastSeen.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `Today ${timeStr}`;
    }

    const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === lastSeen.toDateString();
    if (isYesterday) {
      const timeStr = lastSeen.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `Yesterday ${timeStr}`;
    }

    // Default formatting e.g. 12 June 2026 or similar fallback
    return lastSeen.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return 'Recently';
  }
}

export function formatJoinedDate(createdAtStr?: string): string {
  if (!createdAtStr) return 'Unknown';

  try {
    const joined = new Date(createdAtStr);
    return joined.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return 'Recently';
  }
}
