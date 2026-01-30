# Admin & Worker Portal Integration Summary

## Overview
This document details the seamless connection between the Admin Portal and Worker (Candidate) Portal, including real-time data sync via WebSocket, proper routing for all pages, and unified data management.

---

## WebSocket Real-Time Communication

### Connection Architecture
```
Server (websocket.js)
    ├── Admin Clients (Set)
    │   └── Connected via /ws?admin=true
    └── Candidate Clients (Map: candidateId -> WebSocket)
        └── Connected via /ws?candidateId={id}
```

### Event Types Synchronized
| Event | Direction | Description |
|-------|-----------|-------------|
| `chat_message` | Admin ↔ Worker | Real-time chat messages |
| `typing` | Admin ↔ Worker | Typing indicators |
| `messages_read` | Admin ↔ Worker | Read receipts |
| `status_change` | Worker → Admin | Online/offline status |
| `job_created` | Admin → Workers | New job notifications |
| `job_updated` | Both | Job status changes |
| `deployment_created` | Both | New job applications |
| `deployment_updated` | Both | Deployment status changes |
| `payment_created` | Admin → Worker | New payment notifications |
| `payment_status_changed` | Admin → Worker | Payment processed |
| `xp_earned` | Server → Worker | XP rewards |
| `level_up` | Server → Both | Level up notifications |
| `achievement_unlocked` | Server → Both | Achievement notifications |
| `notification` | Server → Worker | General notifications |

---

## Portal Routes

### Admin Portal (/admin)
| Route | Page | Status |
|-------|------|--------|
| `/` | Dashboard | ✅ Existing |
| `/candidates` | Candidates List | ✅ Existing |
| `/candidates/:id` | Candidate Profile | ✅ Existing |
| `/jobs` | Jobs List | ✅ Existing |
| `/jobs/:id` | Job Detail | ✅ **NEW** |
| `/deployments` | Deployments | ✅ Existing |
| `/payments` | Payments | ✅ Existing |
| `/bpo` | BPO Dashboard | ✅ Existing |
| `/ai-automation` | AI Automation | ✅ Existing |
| `/clients` | Clients List | ✅ Existing |
| `/clients/:id` | Client Detail | ✅ **NEW** |
| `/training` | Training Modules | ✅ **NEW** |
| `/gamification` | Gamification Settings | ✅ **NEW** |
| `/chat` | Chat with Workers | ✅ Existing |
| `/financials` | Financial Dashboard | ✅ Existing |
| `/analytics` | Analytics | ✅ Existing |
| `/settings` | Settings | ✅ Existing |

### Worker Portal (/)
| Route | Page | Status |
|-------|------|--------|
| `/` | Home | ✅ Updated with real data |
| `/jobs` | Browse Jobs | ✅ Existing |
| `/jobs/:id` | Job Detail | ✅ Existing |
| `/calendar` | Calendar | ✅ Existing |
| `/wallet` | Wallet/Payments | ✅ Existing |
| `/profile` | Profile | ✅ Existing |
| `/chat` | Chat with Admin | ✅ Updated with WebSocket |
| `/notifications` | Notifications | ✅ **NEW** |
| `/quests` | Quests | ✅ **NEW** |
| `/achievements` | Achievements | ✅ **NEW** |
| `/leaderboard` | Leaderboard | ✅ **NEW** |
| `/training` | Training Courses | ✅ **NEW** |

---

## Data Sync Between Portals

### Candidate Data Updates
When admin updates candidate profile:
1. Database updated via REST API
2. WebSocket broadcasts `candidate_updated` to online candidate
3. Worker portal context updates automatically

### Job Applications
When worker applies for job:
1. WebSocket sends `apply_job` message
2. Server creates deployment record
3. Admin receives `deployment_created` notification
4. Worker receives confirmation with deployment details

### Chat Messages
1. Admin/Worker sends message via WebSocket
2. Server stores message in database
3. Server broadcasts to recipient
4. If recipient offline, notification created
5. Push notification queued (if enabled)

### Payments
When admin creates/updates payment:
1. REST API updates database
2. WebSocket helper broadcasts `payment_created` or `payment_status_changed`
3. Worker receives real-time notification
4. Notification stored in database

### Gamification
When XP is awarded:
1. API calculates new XP total
2. Checks for level up
3. Checks for achievement unlock
4. Broadcasts relevant events via WebSocket
5. Worker portal updates XP bar and shows celebrations

---

## API Endpoints

### New/Updated Endpoints
```
GET  /api/v1/jobs/:id                    - Job details
GET  /api/v1/jobs/:id/deployments        - Job's deployments
GET  /api/v1/clients/:id                 - Client details
GET  /api/v1/clients/:id/jobs            - Client's jobs
GET  /api/v1/candidates/:id/achievements - Candidate achievements
GET  /api/v1/candidates/:id/deployments  - Candidate deployments
GET  /api/v1/candidates/:id/notifications - Candidate notifications
POST /api/v1/candidates/:id/notifications/:nid/read - Mark notification read
POST /api/v1/candidates/:id/notifications/read-all - Mark all read
GET  /api/v1/gamification/leaderboard    - Global leaderboard
```

---

## Context Providers

### Worker Portal
- `AuthContext` - User authentication state
- `WebSocketContext` - Real-time communication
  - `isConnected` - Connection status
  - `unreadMessages` - Chat unread count
  - `unreadNotifications` - Notification unread count
  - `notifications` - Recent notifications
  - `subscribe()` - Event listeners
  - `sendChatMessage()` - Send chat
  - `applyForJob()` - Job application
  - `markNotificationRead()` - Mark read

### Admin Portal
- `AuthContext` - Admin authentication
- `ThemeContext` - Light/dark mode
- `DataContext` - Shared data caching
- `WebSocketContext` - Real-time communication
  - `isConnected` - Connection status
  - `onlineCandidates` - List of online worker IDs
  - `unreadTotal` - Total unread messages
  - `subscribe()` - Event listeners
  - `sendMessageToCandidate()` - Send chat
  - `isCandidateOnline()` - Check online status

---

## Bottom Navigation (Worker PWA)
- Unread message badge on Chat icon
- Badge updates in real-time via WebSocket

---

## Files Created/Modified

### New Files
- `worker/src/pages/Quests.jsx`
- `worker/src/pages/Achievements.jsx`
- `worker/src/pages/Leaderboard.jsx`
- `worker/src/pages/Training.jsx`
- `worker/src/pages/Notifications.jsx`
- `worker/src/contexts/WebSocketContext.jsx`
- `admin/src/pages/JobDetail.jsx`
- `admin/src/pages/ClientDetail.jsx`
- `admin/src/pages/Training.jsx`
- `admin/src/pages/Gamification.jsx`
- `admin/src/contexts/WebSocketContext.jsx`

### Modified Files
- `websocket.js` - Enhanced with all event types
- `worker/src/App.jsx` - Added WebSocket provider & routes
- `worker/src/pages/Home.jsx` - Real data & WebSocket
- `worker/src/pages/Chat.jsx` - WebSocket integration
- `worker/src/components/layout/BottomNav.jsx` - Badge support
- `admin/src/App.jsx` - Added WebSocket provider & routes
- `routes/api/v1/candidates.js` - Added new endpoints
- `routes/api/v1/jobs.js` - Added deployments endpoint
- `routes/api/v1/clients.js` - Split jobs endpoint
- `db/migrate.js` - Added migration for new tables

---

## Testing Instructions

1. Start the server:
   ```bash
   cd /home/augustine/Augustine_Projects/worklink_v2
   npm run dev
   ```

2. Open Admin Portal:
   - Navigate to http://localhost:5173/admin
   - Login with admin credentials

3. Open Worker Portal:
   - Navigate to http://localhost:5173
   - Login as a candidate

4. Test Real-Time Chat:
   - Send message from Admin Chat
   - See message appear instantly in Worker Chat
   - Verify unread badge updates

5. Test Job Application:
   - Worker clicks Apply on a job
   - Admin sees deployment in real-time

6. Test Notifications:
   - Admin sends message to offline worker
   - Worker sees notification when logging in

7. Verify All Routes:
   - Click through all sidebar items in Admin
   - Click through all bottom nav + gamification links in Worker
   - Ensure no 404 errors or broken pages
