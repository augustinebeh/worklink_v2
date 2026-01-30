# WorkLink v2

A modern recruitment and workforce management platform with admin portal and worker PWA.

## 🚀 Features

- **Admin Portal** - Manage candidates, jobs, clients, deployments, and analytics
- **Worker PWA** - Mobile-first app for workers to browse jobs, track earnings, and chat
- **Real-time Chat** - WebSocket-powered messaging between admin and workers
- **Gamification** - XP, levels, achievements, quests, and leaderboards
- **Financial Dashboard** - Revenue tracking, projections, and tender management
- **AI Automation** - Intelligent candidate matching and job recommendations

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, better-sqlite3
- **Frontend**: React, Vite, TailwindCSS
- **Real-time**: WebSockets (ws)
- **Database**: SQLite with WAL mode

## 📦 Quick Start

### Local Development

```bash
# Install all dependencies
npm run install:all

# Start development servers (backend + admin + worker)
npm run dev

# Or start individually:
npm run dev:server  # Backend API on port 3000
npm run dev:admin   # Admin portal on port 5173
npm run dev:worker  # Worker PWA on port 5174
```

### Production Build

```bash
# Build both frontends
npm run build

# Start production server
npm start
```

## 🚄 Railway Deployment

### One-Click Deploy

1. Fork this repository
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Railway will auto-detect the configuration and deploy

### Manual Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add a volume for persistent database storage
railway volume add

# Set environment variables
railway variables set NODE_ENV=production
railway variables set RAILWAY_VOLUME_MOUNT_PATH=/data

# Deploy
railway up
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (auto-set by Railway) | Auto |
| `NODE_ENV` | Environment mode | Recommended |
| `RAILWAY_VOLUME_MOUNT_PATH` | Path for persistent storage | For persistence |
| `VAPID_PUBLIC_KEY` | Push notification public key | Optional |
| `VAPID_PRIVATE_KEY` | Push notification private key | Optional |
| `VAPID_EMAIL` | Push notification email | Optional |

### Volume Setup (Required for Data Persistence)

Railway's ephemeral filesystem means data is lost on redeploy. To persist your SQLite database:

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Volumes" tab
4. Add a new volume with mount path `/data`
5. Redeploy your service

## 📁 Project Structure

```
worklink_v2/
├── admin/              # Admin portal (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── pages/
│   └── dist/          # Built admin files
├── worker/            # Worker PWA (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── pages/
│   └── dist/          # Built worker files
├── db/
│   ├── database.js    # Database setup & schema
│   └── migrate.js     # Database migrations
├── routes/
│   └── api/v1/        # API endpoints
├── data/              # SQLite database (local)
├── server.js          # Express server entry
├── websocket.js       # WebSocket handler
├── railway.json       # Railway configuration
├── nixpacks.toml      # Nixpacks build config
└── package.json
```

## 🔗 Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Worker PWA |
| `/admin` | Admin Portal |
| `/api/v1/*` | REST API |
| `/ws` | WebSocket |
| `/health` | Health check |

## 📱 API Routes

- `GET/POST /api/v1/candidates` - Candidate management
- `GET/POST /api/v1/jobs` - Job listings
- `GET/POST /api/v1/clients` - Client management
- `GET/POST /api/v1/deployments` - Deployment tracking
- `GET/POST /api/v1/payments` - Payment processing
- `GET/POST /api/v1/chat` - Chat messages
- `GET /api/v1/analytics` - Dashboard analytics
- `GET /api/v1/gamification` - XP, achievements, quests

## 🔧 Database Reset

To reset the database with sample data:

```bash
npm run db:reset
```

## 📄 License

MIT License
