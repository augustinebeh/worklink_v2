# WorkLink v2

A modern workforce management platform designed for gig economy and BPO services. Built with a microservices-inspired architecture featuring a **Worker PWA** (Progressive Web App) for field workers and an **Admin Portal** for workforce management.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Worker Portal (PWA)](#worker-portal-pwa)
- [Admin Portal](#admin-portal)
- [API & Backend](#api--backend)
- [Database](#database)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)

---

## Overview

WorkLink v2 is a full-stack recruitment and workforce management platform that connects businesses with gig workers. The platform features:

- **Real-time communication** via WebSocket
- **Gamification system** with XP, levels, achievements, and leaderboards
- **AI-powered automation** using Claude API for intelligent messaging and candidate matching
- **Multi-channel messaging** (In-app, WhatsApp, Telegram)
- **Progressive Web App** for offline-capable mobile experience
- **Comprehensive analytics** and financial dashboards

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js (v20+) | Runtime environment |
| Express.js | Web framework |
| SQLite + better-sqlite3 | Database (WAL mode) |
| WebSocket (ws) | Real-time communication |
| Sharp | Image processing |
| web-push | Push notifications (VAPID) |
| Multer | File uploads |

### Frontend (Shared)
| Technology | Purpose |
|------------|---------|
| React 18.2 | UI framework |
| Vite | Build tool & dev server |
| React Router v6 | Client-side routing |
| TailwindCSS | Utility-first styling |
| Lucide React | Icon library |
| Framer Motion | Animations |

### External Services
| Service | Purpose |
|---------|---------|
| Anthropic Claude API | AI chat & automation |
| Telegram Bot API | Multi-channel messaging |
| Google Cloud APIs | Location & other services |
| VAPID Push | Browser push notifications |

---

## Project Structure

```
worklink_v2/
├── admin/                      # Admin Portal (React + Vite)
│   ├── src/
│   │   ├── pages/              # Dashboard, Candidates, Jobs, Chat, etc.
│   │   ├── components/         # UI components (layout, forms, tables)
│   │   ├── contexts/           # Auth, WebSocket, Data, Theme
│   │   └── utils/              # Helper functions
│   ├── package.json
│   └── vite.config.js          # Dev port: 5173, Base: /admin/
│
├── worker/                     # Worker PWA (React + Vite)
│   ├── src/
│   │   ├── pages/              # Home, Jobs, Wallet, Profile, etc.
│   │   ├── components/         # Layout, UI, Gamification
│   │   ├── contexts/           # Auth, WebSocket, Chat, Theme
│   │   ├── hooks/              # usePushNotifications, useHaptic, etc.
│   │   └── utils/              # Gamification, constants
│   ├── public/                 # PWA manifest & icons
│   ├── package.json
│   └── vite.config.js          # Dev port: 8080
│
├── db/
│   ├── database.js             # Schema creation & initialization
│   ├── migrate.js              # Database migrations
│   └── worklink.db             # SQLite database
│
├── routes/api/v1/              # REST API routes
│   ├── auth.js                 # Authentication
│   ├── candidates.js           # Worker management
│   ├── jobs.js                 # Job listings
│   ├── chat.js                 # Messaging
│   ├── payments.js             # Payments & earnings
│   ├── gamification.js         # XP, achievements, quests
│   └── ...                     # 20+ route modules
│
├── services/                   # Business logic
│   ├── ai-chat/                # Claude AI integration
│   ├── messaging/              # Telegram & messaging
│   ├── ml/                     # ML models & training
│   └── ...                     # Other services
│
├── middleware/                 # Express middleware
├── utils/                      # Shared utilities
├── public/uploads/             # File storage
│
├── server.js                   # Express entry point
├── websocket.js                # WebSocket handler
├── package.json                # Root dependencies & scripts
└── railway.json                # Deployment config
```

---

## Worker Portal (PWA)

The Worker Portal is a Progressive Web App optimized for mobile devices, providing field workers with everything they need to manage their gig work.

### Features

#### Job Management
- **Browse Jobs** - Search and filter available opportunities
- **Job Details** - View pay rates, location, requirements, and slots
- **One-Click Apply** - Quick application process
- **Featured/Urgent Tags** - Highlighted priority jobs
- **Today/Tomorrow Badges** - Time-sensitive indicators

#### Earnings & Wallet
- **Real-time Earnings** - Track income as it's confirmed
- **Transaction History** - Complete payment records
- **Payment Status** - Pending, confirmed, paid tracking
- **Bank Account Management** - Configure payout methods

#### Gamification System
| Feature | Description |
|---------|-------------|
| **XP & Levels** | Earn experience points, level up through tiers |
| **Streaks** | Maintain consecutive working days for bonuses |
| **Achievements** | Unlock badges for milestones |
| **Quests** | Complete daily/weekly tasks for rewards |
| **Leaderboard** | Compete with other workers |
| **Tier System** | Bronze -> Silver -> Gold -> Platinum -> Diamond -> Mythic |

#### Calendar & Availability
- **Visual Calendar** - See scheduled jobs at a glance
- **Availability Settings** - Set weekly availability patterns
- **Time Slot Management** - Fine-grained schedule control

#### Communication
- **Real-time Chat** - Instant messaging with admin/team
- **Read Receipts** - Message delivery confirmation
- **Typing Indicators** - See when others are typing
- **File Attachments** - Share images and documents
- **Push Notifications** - Stay updated on new opportunities

#### Training & Development
- **Training Modules** - Skill development courses
- **Certifications** - Track completed certifications
- **Progress Tracking** - Monitor learning journey

#### Referral Program
- **Unique Referral Code** - Personal invite link
- **Tiered Rewards** - Increasing bonuses per referral
- **Native Share** - Easy sharing via device share sheet
- **Referral Dashboard** - Track invited workers

### PWA Capabilities
- **Offline Support** - Works without internet connection
- **Install Prompt** - Add to home screen
- **Push Notifications** - Background alerts
- **Haptic Feedback** - Native-like touch response
- **Dark/Light Theme** - User preference support

### Pages
| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Dashboard with stats, quests, job feed |
| Jobs | `/jobs` | Browse and search jobs |
| Job Detail | `/jobs/:id` | Full job information |
| Wallet | `/wallet` | Earnings and payments |
| Calendar | `/calendar` | Availability management |
| Profile | `/profile` | Personal information |
| Complete Profile | `/complete-profile` | Profile editor |
| Achievements | `/achievements` | Badges and milestones |
| Quests | `/quests` | Daily/weekly tasks |
| Leaderboard | `/leaderboard` | Worker rankings |
| Referrals | `/referrals` | Referral program |
| Training | `/training` | Learning modules |
| Notifications | `/notifications` | Alert center |

---

## Admin Portal

The Admin Portal is a comprehensive management interface for administrators to oversee all aspects of the workforce platform.

### Features

#### Candidate Management
- **Candidate Database** - Full worker profiles with photos
- **Status Tracking** - Lead, pending, active, inactive, blacklisted
- **Skills & Certifications** - Competency tracking
- **Performance Ratings** - Historical ratings and feedback
- **Referral Attribution** - Track who referred whom
- **Bulk Operations** - Mass updates and exports

#### Job Management
- **Create Jobs** - Full job listing creation
- **Slot Management** - Control worker capacity
- **Rate Configuration** - Pay rate vs. charge rate
- **Skills Requirements** - Define needed competencies
- **Featured/Urgent Flags** - Priority indicators
- **Job Cloning** - Duplicate similar jobs

#### Chat & Messaging
| Feature | Description |
|---------|-------------|
| **Direct Messaging** | One-on-one candidate chat |
| **Group Conversations** | Multi-candidate threads |
| **AI Suggestions** | Claude-powered reply suggestions |
| **Auto-Reply Mode** | AI handles routine messages |
| **Quick Replies** | Template-based responses |
| **File Sharing** | Send documents and images |
| **Message Search** | Find past conversations |

#### Deployments
- **Deployment Tracking** - Monitor active assignments
- **Hours Management** - Record worked hours
- **Rating System** - Post-deployment feedback
- **Revenue Tracking** - Per-deployment financials

#### Payments
- **Payment Processing** - Manage worker payouts
- **Invoice Generation** - Client billing
- **Status Tracking** - Pending, processed, paid
- **Financial Reconciliation** - Balance accounts

#### Analytics & Dashboards

**Main Dashboard**
- Real-time platform metrics
- Active workers count
- Open jobs summary
- Recent activity feed

**Analytics Dashboard**
- Revenue trends
- Worker performance metrics
- Job completion rates
- Growth analytics

**Financial Dashboard**
- Revenue projections
- Profit margins
- Payment summaries
- Financial health indicators

**BPO Dashboard**
- Utilization rates
- Team performance
- Client metrics
- Operational efficiency

**ML Dashboard**
- Model performance
- Prediction accuracy
- Training data insights
- A/B test results

#### Gamification Management
- **Quest Configuration** - Create daily/weekly challenges
- **Achievement Setup** - Define unlock criteria
- **XP Rewards** - Configure point values
- **Leaderboard Settings** - Ranking parameters

#### AI Automation
- **AI Chat Settings** - Configure Claude integration
- **Candidate Matching** - ML-powered job suggestions
- **Smart Notifications** - Intelligent alert timing
- **Automation Rules** - Define auto-reply triggers

#### Additional Features
- **Training Management** - Create and assign courses
- **Tender Monitoring** - Track business opportunities
- **Telegram Groups** - Manage channel communications
- **Client Management** - Business client profiles

### Pages
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Overview and metrics |
| Candidates | `/candidates` | Worker management |
| Candidate Detail | `/candidates/:id` | Individual profile |
| Jobs | `/jobs` | Job listings |
| Job Detail | `/jobs/:id` | Job management |
| Deployments | `/deployments` | Active assignments |
| Chat | `/chat` | Messaging center |
| Payments | `/payments` | Financial management |
| Clients | `/clients` | Business clients |
| Client Detail | `/clients/:id` | Client profile |
| Analytics | `/analytics` | Platform metrics |
| Financial | `/financial` | Financial dashboard |
| Gamification | `/gamification` | Rewards management |
| AI Automation | `/ai-automation` | AI settings |
| AI Sourcing | `/ai-sourcing` | Candidate matching |
| ML Dashboard | `/ml-dashboard` | ML metrics |
| BPO Dashboard | `/bpo-dashboard` | BPO operations |
| Ad Optimization | `/ad-optimization` | Ad performance |
| Training | `/training` | Course management |
| Tenders | `/tenders` | Tender tracking |
| Telegram Groups | `/telegram-groups` | Channel management |
| Settings | `/settings` | Platform settings |

---

## API & Backend

### REST API Endpoints

Base URL: `/api/v1`

#### Authentication
```
POST /auth/login          # Login/registration
POST /auth/telegram       # Telegram OAuth
```

#### Candidates
```
GET    /candidates              # List all candidates
POST   /candidates              # Create candidate
GET    /candidates/:id          # Get candidate
PATCH  /candidates/:id          # Update candidate
GET    /candidates/:id/deployments    # Candidate jobs
```

#### Jobs
```
GET    /jobs                    # List jobs
POST   /jobs                    # Create job
GET    /jobs/:id                # Get job details
PUT    /jobs/:id                # Update job
POST   /jobs/:id/apply          # Apply for job
```

#### Chat
```
GET    /chat/conversations      # List conversations
GET    /chat/:conversationId    # Get messages
POST   /chat/:conversationId/send    # Send message
POST   /chat/:conversationId/typing  # Typing indicator
```

#### Gamification
```
GET    /gamification/xp/:candidateId       # XP info
GET    /gamification/achievements          # All achievements
POST   /gamification/achievements/claim    # Claim achievement
GET    /gamification/quests               # Available quests
POST   /gamification/quests/claim         # Claim quest reward
GET    /gamification/leaderboard          # Rankings
```

#### Payments
```
GET    /payments                # List payments
POST   /payments                # Create payment
PATCH  /payments/:id            # Update status
```

#### Analytics
```
GET    /analytics/dashboard     # Dashboard metrics
GET    /analytics/revenue       # Revenue data
GET    /analytics/performance   # Performance metrics
```

### WebSocket Events

Connect: `ws://localhost:8080/ws`

#### Client to Server
```javascript
{ type: 'auth', token: 'jwt_token' }
{ type: 'typing', conversationId: 123, isTyping: true }
{ type: 'read', conversationId: 123, messageId: 456 }
```

#### Server to Client
```javascript
{ type: 'message', data: { ... } }
{ type: 'typing', data: { conversationId, userId, isTyping } }
{ type: 'notification', data: { ... } }
{ type: 'xp_update', data: { candidateId, newXP, delta } }
```

---

## Database

### Core Tables

| Table | Description |
|-------|-------------|
| `candidates` | Worker profiles, XP, levels, earnings |
| `clients` | Business client information |
| `jobs` | Job listings with rates and requirements |
| `deployments` | Worker assignment records |
| `payments` | Payment and earning records |
| `messages` | Chat messages |
| `conversations` | Chat threads |
| `candidate_availability` | Availability calendar |

### Gamification Tables

| Table | Description |
|-------|-------------|
| `quests` | Quest definitions |
| `candidate_quests` | Quest progress/completion |
| `achievements` | Achievement definitions |
| `candidate_achievements` | Unlocked achievements |
| `xp_transactions` | XP history log |
| `referrals` | Referral relationships |
| `referral_tiers` | Tier-based reward config |

### Communication Tables

| Table | Description |
|-------|-------------|
| `message_templates` | Quick reply templates |
| `chat_attachments` | File uploads |
| `typing_indicators` | Real-time typing status |
| `push_queue` | Notification queue |
| `telegram_groups` | Telegram channel config |

---

## Getting Started

### Prerequisites

- Node.js v20 or higher
- npm v9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/worklink_v2.git
cd worklink_v2

# Install all dependencies (root + admin + worker)
npm run install:all

# Initialize database with sample data
npm run db:reset
```

### Development

```bash
# Start all servers concurrently
npm run dev

# Or start individually:
npm run dev:server   # Backend API (port 3000)
npm run dev:admin    # Admin Portal (port 5173)
npm run dev:worker   # Worker PWA (port 8080)
```

### Access Points (Development)

| Service | URL |
|---------|-----|
| Worker PWA | http://localhost:8080 |
| Admin Portal | http://localhost:5173 |
| API | http://localhost:3000/api/v1 |
| WebSocket | ws://localhost:3000/ws |

### Production Build

```bash
# Build both frontends
npm run build

# Start production server
npm start
```

### Access Points (Production)

| Service | URL |
|---------|-----|
| Worker PWA | http://localhost:8080 |
| Admin Portal | http://localhost:8080/admin |
| API | http://localhost:8080/api/v1 |
| Health Check | http://localhost:8080/health |

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@yourcompany.com

# AI Integration (Anthropic Claude)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-xxxxx
TELEGRAM_BOT_USERNAME=YourBotName

# Google APIs (optional)
GOOGLE_API_KEY=your_google_api_key

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com

# Railway Deployment (auto-configured)
RAILWAY_VOLUME_MOUNT_PATH=/data
RAILWAY_PUBLIC_DOMAIN=yourapp.railway.app
```

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

---

## Deployment

### Railway (Recommended)

1. **Fork** the repository to your GitHub account
2. **Create** a new Railway project
3. **Connect** your GitHub repository
4. **Add Volume** for data persistence:
   - Mount path: `/data`
5. **Set** environment variables in Railway dashboard
6. **Deploy** - Railway auto-detects configuration

### Configuration Files

- `railway.json` - Railway deployment settings
- `nixpacks.toml` - Build configuration
- `.railwayignore` - Excluded files

### Important Notes

- Railway uses ephemeral filesystem - **volume is required** for database persistence
- SQLite database is stored in the mounted volume at `/data/worklink.db`
- Static files are served from Express in production

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all services concurrently |
| `npm run dev:server` | Start backend only |
| `npm run dev:admin` | Start admin portal only |
| `npm run dev:worker` | Start worker PWA only |
| `npm run build` | Build both frontends |
| `npm start` | Start production server |
| `npm run install:all` | Install all dependencies |
| `npm run db:reset` | Reset database with sample data |
| `npm run dev:fresh` | Clean cache and restart |

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For support, please contact the development team or open an issue in the repository.
