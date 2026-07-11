// Premium default SVG avatar collections for VibeChat

export const MALE_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&top=shortWaved&facialHair=beardLight&facialHairProbability=100&backgroundColor=b6e3f4";
export const FEMALE_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasmine&top=straight02&skinColor=ffdbb4&backgroundColor=ffdfbf";
export const OTHER_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1&backgroundColor=e2e8f0";

export function getRandomAvatar(gender: 'Male' | 'Female' | 'Other' | string) {
  if (gender === 'Male') {
    return MALE_AVATAR;
  } else if (gender === 'Female') {
    return FEMALE_AVATAR;
  } else {
    // Other or Fallback
    return OTHER_AVATAR;
  }
}
