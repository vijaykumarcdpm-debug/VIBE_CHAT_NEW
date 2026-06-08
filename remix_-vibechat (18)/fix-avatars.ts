import fs from 'fs';

const bgCyan = "b6e3f4";
const bgOrange = "ffdfbf";
const bgGray = "e2e8f0";

const MALE_AVATAR = `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&top=shortWaved&facialHair=beardLight&facialHairProbability=100&backgroundColor=${bgCyan}`;
const FEMALE_AVATAR = `https://api.dicebear.com/7.x/avataaars/svg?seed=Jasmine&top=straight02&skinColor=ffdbb4&backgroundColor=${bgOrange}`;
const OTHER_AVATAR = `https://api.dicebear.com/7.x/bottts/svg?seed=Robot1&backgroundColor=${bgGray}`;

try {
  if (fs.existsSync('database.json')) {
    const data = JSON.parse(fs.readFileSync('database.json', 'utf8'));
    let changed = false;
    for (const u of data.users) {
      if (!u.profilePic || u.profilePic.includes('api.dicebear.com') || u.profilePic.includes('data:image/svg')) {
        const expected = u.gender === 'Male' ? MALE_AVATAR : (u.gender === 'Female' ? FEMALE_AVATAR : OTHER_AVATAR);
        if (u.profilePic !== expected) {
          u.profilePic = expected;
          changed = true;
        }
      }
    }
    if (changed) {
      fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
      console.log('Fixed avatars.');
    } else {
      console.log('No avatars needed fixing.');
    }
  }
} catch (e) {
  console.error(e);
}
