# TalentVis Platform v2.0

A modern recruitment platform for Singapore's adhoc staffing industry, featuring a professional admin portal and a gamified candidate mobile PWA.

## 🚀 Quick Start

```bash
# Install all dependencies
npm run install:all

# Run development servers (all 3 at once)
npm run dev

# Access the apps:
# - Backend API: http://localhost:3000
# - Admin Portal: http://localhost:5173/admin
# - Worker PWA: http://localhost:5174
```

## 📦 Project Structure

```
talentvis-platform/
├── server.js              # Express backend server
├── db/
│   └── database.js        # SQLite database with schema & sample data
├── routes/
│   └── api/v1/            # REST API endpoints
├── admin/                  # TalentVis Command Center (React)
│   └── src/
│       ├── components/    # UI component library
│       ├── pages/         # Dashboard, Candidates, Jobs, BPO, etc.
│       └── contexts/      # Auth, Theme, Data providers
├── worker/                 # GigQuest PWA (React)
│   └── src/
│       ├── components/    # Gamification components
│       └── pages/         # Home, Jobs, Wallet, Profile
└── data/                   # SQLite database file
```

## 🎯 Features

### Admin Portal (TalentVis Command Center)
- **Dashboard**: KPIs, revenue charts, pipeline visualization
- **Candidates**: Pipeline management with XP/level tracking
- **Jobs**: Post and manage job listings
- **Deployments**: Track worker assignments
- **Payments**: Process payroll and withdrawals
- **BPO Automation**: 
  - Tender pipeline (Kanban + Table views)
  - AI-powered acquisition recommendations
  - Singapore tender portal directory
- **Clients**: CRM for enterprise customers
- **Settings**: Database reset for development

### Candidate PWA (GigQuest)
- **Gamification System**:
  - XP & 10-level progression
  - Achievements (12 badges across 5 categories)
  - Daily/weekly quests
  - Streak tracking with multipliers
  - Leaderboards
- **Job Discovery**: Featured jobs with XP bonuses
- **Training**: Earn certifications and XP
- **Wallet**: Track earnings and request withdrawals
- **Profile**: Stats, achievements, certifications

## 🗄️ Database Schema

### Core Tables
- `candidates` - Worker profiles with gamification stats
- `jobs` - Job postings linked to clients
- `deployments` - Worker-to-job assignments
- `payments` - Payroll and withdrawal tracking
- `clients` - Enterprise customer management
- `tenders` - BPO tender tracking

### Gamification Tables
- `achievements` - 12 achievements across 5 categories
- `candidate_achievements` - Unlocked achievements
- `xp_transactions` - XP earning history
- `quests` - Daily, weekly, and special quests
- `candidate_quests` - Quest progress tracking

### BPO Tables
- `tenders` - Government tender tracking
- `scraper_runs` - Scraper execution logs

## 🔌 API Endpoints

### Candidates
```
GET    /api/v1/candidates          # List candidates
GET    /api/v1/candidates/:id      # Get candidate details
POST   /api/v1/candidates          # Create candidate
PUT    /api/v1/candidates/:id      # Update candidate
GET    /api/v1/candidates/stats/pipeline  # Pipeline stats
```

### Jobs
```
GET    /api/v1/jobs                # List jobs
GET    /api/v1/jobs/:id            # Get job with deployments
POST   /api/v1/jobs                # Create job
PUT    /api/v1/jobs/:id            # Update job
POST   /api/v1/jobs/:id/accept     # Candidate accepts job
```

### Tenders (BPO)
```
GET    /api/v1/tenders             # List tenders
GET    /api/v1/tenders/:id         # Get tender details
PATCH  /api/v1/tenders/:id         # Update tender status
GET    /api/v1/tenders/stats/overview         # Tender statistics
GET    /api/v1/tenders/recommendations/acquisition  # AI recommendations
```

### Gamification
```
GET    /api/v1/gamification/profile/:id    # Full gamification profile
POST   /api/v1/gamification/xp/award       # Award XP
GET    /api/v1/gamification/achievements   # All achievements
POST   /api/v1/gamification/achievements/unlock  # Unlock achievement
GET    /api/v1/gamification/quests         # Active quests
POST   /api/v1/gamification/streak/update  # Update daily streak
GET    /api/v1/gamification/leaderboard    # Top candidates
```

### Admin
```
POST   /api/v1/admin/reset-to-sample   # Reset database
GET    /api/v1/admin/stats             # Database statistics
```

## 🎮 XP System

### Earning XP
| Action | XP Reward |
|--------|-----------|
| Complete job | 100 XP base |
| 5★ rating bonus | +50 XP |
| Complete training | 75-250 XP |
| Daily login | 10 XP |
| 7-day streak | 100 XP bonus |
| 30-day streak | 500 XP bonus |
| Referral | 200 XP |

### Level Progression
| Level | Title | XP Required |
|-------|-------|-------------|
| 1 | Rookie | 0 |
| 2 | Starter | 500 |
| 3 | Active | 1,200 |
| 4 | Reliable | 2,500 |
| 5 | Pro | 5,000 |
| 6 | Expert | 8,000 |
| 7 | Elite | 12,000 |
| 8 | Master | 18,000 |
| 9 | Legend | 25,000 |
| 10 | Champion | 35,000 |

## 🏢 Singapore Tender Portals

The platform helps you track opportunities from:
- **GeBIZ** - Primary government procurement
- **Vendors@Gov** - Government vendor registration
- **NTUC Enterprises** - Social enterprise procurement
- **Singapore Tourism Board** - Tourism sector
- **Changi Airport Group** - Aviation services
- **Sentosa Development Corporation** - Entertainment
- **Singapore Sports Hub** - Events and sports
- **Marina Bay Sands** - Hospitality

## 🚂 Railway Deployment

1. Create a new Railway project
2. Add a volume mounted at `/data` for persistent SQLite storage
3. Connect your GitHub repository
4. Railway will auto-detect the `railway.json` configuration
5. Set environment variables if needed

```bash
# Railway will automatically:
# - Install dependencies
# - Build admin and worker apps
# - Start the server
```

## 🛠️ Development

### Reset Database
```bash
# Via npm script
npm run db:reset

# Or via API (when server is running)
curl -X POST http://localhost:3000/api/v1/admin/reset-to-sample
```

### Individual Dev Servers
```bash
npm run dev:server   # Backend only
npm run dev:admin    # Admin portal only
npm run dev:worker   # Worker PWA only
```

## 📝 License

MIT © TalentVis Singapore
