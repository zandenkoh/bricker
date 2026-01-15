# Bricker Firebase Security Implementation Guide

## ⚠️ CRITICAL FIRST STEPS - DO IMMEDIATELY

Your Firebase credentials are **EXPOSED** in your public GitHub repository. You must immediately:

### 1. **REGENERATE ALL CREDENTIALS**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate a new Private Key
   - Update any backend services using the old key
   
### 2. **ROTATE YOUR API KEY**
   - Firebase Console → APIs & Services → Credentials
   - Delete the old API key that's in your repository
   - Create a new API key (restrict to your domain only)

### 3. **UPDATE YOUR .gitignore**
```
# Add to .gitignore
firebase-credentials.json
.env.local
.env
firebase-key.json
```

---

## 📋 Security Rules Overview

The provided `firebase-security-rules.json` implements:

### Authentication Requirements
- **All read/write operations require user authentication** (`auth != null`)
- Users can **only modify their own data** (`auth.uid === $uid`)
- No anonymous guest access to database writes

### Data Validation
All numeric fields are validated for:
- **Correct data type** (numbers, strings, booleans)
- **Reasonable ranges** (prevents excessively large values)
- **No negative values** where inappropriate

Example validations:
```
gold: 0-9,999,999,999 (prevents cheating by inflating gold)
level: 1-999,999 (reasonable level cap)
rebirthCount: 0-10,000 (prevents rebirth inflation)
ballCounts: 0-100,000 per ball type
username: 0-50 characters
```

### Database Structure Protection

#### `/users/{uid}/gameState/` ✅
- Only the authenticated user (`auth.uid === $uid`) can write their own game state
- All game progress fields are validated for type and value ranges
- Prevents writing arbitrary data structures

#### `/globalChat/{messageId}/` ✅
- Users can only post **new** messages (not edit/delete others)
- Message must include: uid, message text, timestamp
- Message author is validated (`uid === auth.uid`)
- Messages limited to 500 characters
- Prevents spam and abuse

#### `/teams/{teamId}/` ✅
- Teams can only be created by authenticated users
- Only team admins can modify members
- Members can update their own rebirth counts
- Prevents unauthorized team manipulation

#### `/presence/` & `/reload/` ✅
- Users can only set their own presence/reload status
- Real-time synchronization only for authenticated users

#### `/settings/` & `/updates/` ✅
- Read-only for all authenticated users
- Admin-only writes (no client-side modification)
- Used for game announcements and configurations

---

## 🔒 What's NOW Protected

### ❌ Prevented Attacks
1. **Mass Gold Injection**: Rules reject gold > 9,999,999,999
2. **Level Hacking**: Rules reject unrealistic level values
3. **Ball Count Manipulation**: Each ball type has a 100,000 cap
4. **Rebirth Cheating**: Rebirth count capped at 10,000
5. **Data Corruption**: Validates every field type and structure
6. **Team Hijacking**: Only admins can modify team structure
7. **Unauthorized Chat**: Only message creators can post
8. **Cross-User Access**: Users cannot read/write other users' data except through authorized channels

### ✅ What Still Works
- Users log in with email/password
- Game saves automatically to their own profile
- Leaderboard reads work (filtered by rules)
- Global chat posts to the stream (validated)
- Team creation and management
- Donation system (between authenticated users)
- All game mechanics continue functioning

---

## 🚀 Implementation Steps

### Step 1: Update Firebase Realtime Database Rules
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project "bricker-by-zlabs"
3. Navigate to **Realtime Database** → **Rules**
4. Replace the entire rules content with the content from `firebase-security-rules.json`
5. Click **Publish**

### Step 2: Regenerate Firebase API Key
1. Go to Firebase Console → Project Settings
2. Click **APIs & Services** (or go to Google Cloud Console)
3. Delete the exposed API key from `index.js`
4. Create a new API key
5. **IMPORTANT**: Restrict this key to:
   - **Application restrictions**: HTTP referrers
   - Add your domain (e.g., `yourdomain.com/*` and `localhost/*` for testing)
6. Update `index.js` with the new key

### Step 3: Verify No Other Credentials Are Exposed
- Check your GitHub commit history for any `.env` files
- Use GitHub's security tools to scan for secrets
- Enable branch protection rules

### Step 4: Test the Rules

#### Test Case 1: User Can Save Own Data ✅
```javascript
// This should WORK
firebase.auth().signInWithEmailAndPassword(email, password).then(user => {
  database.ref(`users/${user.uid}/gameState`).update({
    gold: 500,
    level: 25
  }).then(() => console.log("Save successful"));
});
```

#### Test Case 2: Prevent Cross-User Write ❌
```javascript
// This should FAIL - user trying to modify another user's data
const otherUserUid = "differentuid";
database.ref(`users/${otherUserUid}/gameState/gold`).set(9999999)
  .catch(error => console.log("Blocked: " + error.message));
```

#### Test Case 3: Prevent Unauthorized Chat ❌
```javascript
// This should FAIL - message uid doesn't match auth.uid
database.ref("globalChat").push().set({
  uid: "different-uid",  // Doesn't match current user
  message: "Hack attempt",
  timestamp: Date.now()
}).catch(error => console.log("Blocked: " + error.message));
```

#### Test Case 4: Prevent Invalid Data ❌
```javascript
// This should FAIL - gold value exceeds validation limit
database.ref(`users/${user.uid}/gameState/gold`).set(999999999999)
  .catch(error => console.log("Blocked: Invalid value"));
```

---

## 🛡️ Additional Security Recommendations

### 1. **Enable Firebase Authentication Security**
   - Go to Authentication → Settings
   - Enable "Anonymous Disabled" (already should be)
   - Configure email/password as your auth method
   - Set strong password requirements

### 2. **Enable Firebase Database Backup**
   - Realtime Database → Backups
   - Configure automatic backups (daily/weekly)

### 3. **Monitor Database Activity**
   - Enable Google Cloud Logging
   - Set up alerts for unusual activity

### 4. **Add Rate Limiting** (on client side for UX)
   - Prevent message spam with timestamps
   - Throttle database writes to 1 per 100ms max

### 5. **Use Custom Claims (Optional)**
   - For admin operations, set custom claims in authentication
   - Example: `admin: true` claim for players who need special privileges

### 6. **Implement Presence System**
   - Your `/presence/` path is set up - use it to track active players
   - Helps detect suspicious simultaneous accounts

---

## 📊 Database Structure Reference

Your database now looks like:
```
root/
├── users/
│   └── {uid}/
│       ├── gameState/
│       │   ├── gold (number)
│       │   ├── level (number)
│       │   ├── ballCounts (object)
│       │   ├── ballUpgrades (object)
│       │   ├── stats (object)
│       │   ├── username (string)
│       │   ├── rebirthCount (number)
│       │   └── ... (other validated fields)
│       ├── invitesLeft (number)
│       └── invitedUsers/
├── globalChat/
│   └── {messageId}/
│       ├── uid (string)
│       ├── message (string)
│       └── timestamp (number)
├── teams/
│   └── {teamId}/
│       ├── admins/
│       ├── members/
│       ├── memberRebirths/
│       └── name (string)
├── userTeams/
│   └── {uid}: {teamId}
├── presence/
│   └── {uid}: boolean
├── reload/
│   └── {uid}: boolean
├── settings/ (read-only)
└── updates/ (read-only)
```

---

## ⚠️ Warnings & Notes

1. **Game Logic Still Client-Side**: The rules prevent **unauthorized** writes but don't prevent **client-side cheating**. For critical anti-cheat, move game logic to Cloud Functions.

2. **Cost Implications**: Validation at the database level is more cost-efficient than Cloud Functions.

3. **Donation System**: Currently allows any authenticated user to donate to another. Add server-side validation if you need rate limiting.

4. **Chat Moderation**: No automatic content filtering. Consider adding Cloud Functions for inappropriate content detection.

5. **Backup Your Rules**: Keep a copy of your rules in version control (but not in public repo).

---

## 🚨 Emergency Checklist

If you suspect a breach:
1. ✅ Disable the exposed API key immediately
2. ✅ Regenerate all Firebase credentials
3. ✅ Deploy new security rules
4. ✅ Check Firebase logs for suspicious activity
5. ✅ Notify your players of the security update
6. ✅ Consider a database reset if compromise is confirmed

---

## 📞 Support & Testing

- Test your rules using Firebase Console's Rules Simulator
- Use `console.error()` and Firebase error messages to debug
- Check Cloud Logging for detailed error information
- Firebase Documentation: https://firebase.google.com/docs/database/security

---

**Last Updated**: 2026-01-15
**Rule Version**: 1.0
**Status**: Ready for Production
