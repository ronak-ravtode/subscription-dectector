# Subscription Leak Detector — Project Documentation

**Version:** 1.0  
**Last Updated:** 2026-07-25  
**Status:** Active Development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Backend](#3-backend)
4. [Frontend](#4-frontend)
5. [Features](#5-features)
6. [API Reference](#6-api-reference)
7. [Database Schema](#7-database-schema)
8. [Development Guide](#8-development-guide)
9. [Testing](#9-testing)
10. [Deployment](#10-deployment)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Project Overview

### Problem

Most people lose money monthly to forgotten subscriptions, unnoticed price hikes, and unused services buried in bank statements.

### Solution

A system that scans bank statement PDFs to automatically detect recurring subscriptions, flag price increases, score "leakiness," and recommend actions (cancel/downgrade/renegotiate).

### Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| AI/ML | Google Gemini (recommendations), PyPDF2 (PDF parsing) |
| Auth | JWT (python-jose), bcrypt |
| Data Fetching | TanStack Query, Axios |
| State | Zustand (auth), TanStack Query (server state) |
| Charts | Recharts |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│  Pages: Login, Register, Dashboard, Upload, Analysis,       │
│         Subscriptions, History, Settings,                    │
│         ForgotPassword, ResetPassword                        │
├─────────────────────────────────────────────────────────────┤
│                        FastAPI                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │  Upload  │  │ Analysis │  │  User    │   │
│  │  Routes  │  │  Route   │  │  Route   │  │  Routes  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │          │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────┐  │
│  │              Repositories (SQLAlchemy)                 │  │
│  │  user | analysis | subscription | price_history       │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │                   SQLite Database                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Pipeline: PDF Parser → Transaction Extractor →              │
│            Recurring Detector → Leak Scorer →                 │
│            Action Recommender (Gemini)                       │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
subscription-detector/
├── app/
│   ├── main.py                  # FastAPI app, routes, analysis pipeline
│   ├── database.py              # SQLAlchemy engine, session, migrations
│   ├── models.py                # Pydantic models (API schemas)
│   ├── models_db.py             # SQLAlchemy ORM models
│   ├── dashboard/               # Dashboard data aggregation
│   │   └── routes.py            # /api/dashboard/* endpoints
│   ├── auth/
│   │   ├── manager.py           # JWT + bcrypt utilities
│   │   ├── middleware.py         # get_current_user dependency
│   │   ├── routes.py            # /api/auth/* endpoints
│   │   └── schemas.py           # Auth request/response models
│   ├── user/
│   │   └── routes.py            # /api/user/* endpoints
│   ├── repositories/
│   │   ├── user.py              # User CRUD
│   │   ├── analysis.py          # Analysis CRUD
│   │   ├── subscription.py      # Subscription CRUD + price matching
│   │   ├── price_history.py     # Price history queries
│   │   ├── password_reset.py    # Password reset token CRUD
│   │   └── settings.py          # User settings CRUD
│   ├── parsers/
│   │   ├── pdf_parser.py        # PyPDF2 + Gemini Vision fallback
│   │   ├── gemini_vision.py     # PDF-to-image → Gemini OCR
│   │   └── email_parser.py      # Email body → transactions
│   ├── extractors/
│   │   └── transaction_extractor.py  # Regex transaction parsing
│   ├── detectors/
│   │   └── recurring_detector.py     # Pattern matching
│   ├── scoring/
│   │   └── leak_scorer.py       # Rules-based scoring (0-100)
│   ├── recommenders/
│   │   └── action_recommender.py  # Gemini-based recommendations
│   ├── services/
│   │   ├── email.py             # SMTP email sending
│   │   └── webhook.py           # Webhook signature verification
│   └── utils/
│       └── email.py             # Forwarding address parsing
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui primitives
│   │   │   ├── layout/          # Navbar, PageWrapper
│   │   │   └── shared/          # ScoreBadge, ActionBadge, Charts, etc.
│   │   ├── pages/               # Route components
│   │   ├── hooks/               # TanStack Query hooks
│   │   ├── lib/                 # api.ts, types.ts, utils.ts
│   │   └── store/               # authStore.ts (Zustand)
│   └── package.json
├── tests/
│   ├── test_auth.py
│   ├── test_repositories.py
│   ├── test_transaction_extractor.py
│   ├── test_recurring_detector.py
│   ├── test_leak_scorer.py
│   ├── test_action_recommender.py
│   └── test_pdf_parser.py
├── create_sample.py             # Sample data generator
├── sample_statements/           # Example PDFs for testing
│   └── sample_statement.pdf
├── subscription_detector.db     # SQLite database (gitignored)
├── requirements.txt
└── .env
```

---

## 3. Backend

### 3.1 Environment Variables

```env
GEMINI_API_KEY=your_api_key
SECRET_KEY=your_random_secret_key
DATABASE_URL=sqlite:///./subscription_detector.db

# SMTP (Password Reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@subguard.app

# Webhook (Email Forwarding)
INBOUND_WEBHOOK_SECRET=your-webhook-secret
EMAIL_DOMAIN=subguard.app
```

### 3.2 Dependencies

```
fastapi==0.115.0
uvicorn==0.32.0
python-multipart==0.0.12
PyPDF2==3.0.1
google-generativeai==0.8.0
pydantic==2.10.0
jinja2==3.1.4
python-dotenv==1.0.1
sqlalchemy==2.0.36
python-jose[cryptography]==3.3.0
bcrypt==4.2.1
pytest==8.3.3
httpx==0.28.1
```

### 3.3 Core Pipeline

```
1. Upload PDF → Parse text (PyPDF2 → Gemini Vision fallback)
2. Extract transactions (regex + Gemini fallback)
3. Detect recurring patterns (fuzzy merchant matching, frequency detection)
4. Calculate leak scores (0-100: price hikes + duration + frequency + category)
5. Recommend actions (Gemini AI: keep/review/downgrade/renegotiate/cancel)
6. Store results in SQLite
```

### 3.4 Scoring Rules

| Factor | Weight | Logic |
|--------|--------|-------|
| Price Increase | 0-40 pts | More increases = higher score |
| Duration | 0-25 pts | Longer subscription = more suspicious |
| Frequency | 0-20 pts | Weekly > Monthly > Quarterly > Annual |
| Category | 0-15 pts | Entertainment > Software > Utilities |

**Action Thresholds:** 0-30 Keep | 31-60 Review | 61-80 Downgrade/Renegotiate | 81-100 Cancel

### 3.5 Database Models

```python
# User
id, email, hashed_password, created_at, is_active, forwarding_address

# UserSettings
user_id (FK), notification_email, currency, theme

# Analysis
id, user_id (FK), status, total_monthly_leak, overall_score, created_at, warnings

# Subscription
id, analysis_id (FK), merchant, amount, frequency, category, leak_score,
action, reasoning, price_trend, duration_months, price_increases

# PriceHistory
id, subscription_id (FK), amount, recorded_at, source_analysis_id (FK)

# PasswordResetToken
id, user_id (FK), token, expires_at, used, created_at
```

### 3.6 Key Behaviors

- **User Isolation:** All queries filter by `user_id` — users only see their own data
- **Price History:** When a new analysis matches a previous subscription (fuzzy merchant match >80%), price is recorded
- **DB Migrations:** `database.py:init_db()` runs `ALTER TABLE` for columns added after initial creation (SQLite limitation)
- **Analysis ID:** Caller generates the ID and passes it to `analyze_statement()` to avoid ID mismatch

---

## 4. Frontend

### 4.1 Pages & Routes

| Route | Page | Auth | Description |
|-------|------|------|-------------|
| `/login` | Login.tsx | No | Email/password login |
| `/register` | Register.tsx | No | Registration form |
| `/forgot-password` | ForgotPassword.tsx | No | Request password reset |
| `/reset-password` | ResetPassword.tsx | No | Set new password via token |
| `/` | Dashboard.tsx | Yes | Summary cards + charts + recent analyses |
| `/upload` | Upload.tsx | Yes | PDF drag-and-drop upload |
| `/analysis/:id` | Analysis.tsx | Yes | Full results + expandable price history |
| `/subscriptions` | Subscriptions.tsx | Yes | All subscriptions + charts + price dialog |
| `/history` | History.tsx | Yes | Paginated past analyses |
| `/settings` | Settings.tsx | Yes | Preferences + email forwarding address |

### 4.2 Components

**shadcn/ui:** Button, Card, Table, Input, Label, Badge, Dialog, Select, Tabs, Progress, DropdownMenu, Separator, Skeleton

**Custom Shared:**
| Component | Purpose |
|-----------|---------|
| ScoreBadge | Color-coded leak score (0-100) |
| ActionBadge | Action type indicator |
| SummaryCard | Dashboard metric card |
| SubscriptionCard | Subscription details with price trend |
| FileUpload | PDF drag-and-drop zone |
| AuthGuard | Protected route wrapper |
| CategoryPieChart | Subscription breakdown by category |
| SpendingTrendChart | Monthly spending line chart |
| PriceHistoryChart | Per-subscription price over time |

### 4.3 Hooks

| Hook | Endpoint | Purpose |
|------|----------|---------|
| `useLogin` | POST /api/auth/login | Login mutation |
| `useRegister` | POST /api/auth/register | Register mutation |
| `useUpload` | POST /api/upload | Upload mutation |
| `useAnalysis(id)` | GET /api/analysis/{id} | Fetch analysis |
| `useSubscription(id)` | GET /api/subscriptions/{id} | Fetch single subscription |
| `useSubscriptions()` | GET /api/subscriptions | Fetch all subscriptions |
| `useHistory(page)` | GET /api/user/history | Paginated history |
| `useSettings()` | GET /api/user/settings | Fetch settings |
| `useUpdateSettings()` | PUT /api/user/settings | Update settings |
| `useUpdateNotifications()` | PUT /api/user/settings/notifications | Update notification preferences |
| `useUpdateTheme()` | PUT /api/user/settings/theme | Update theme preference |
| `useSpendingTrend()` | GET /api/user/spending-trend | Monthly spending data |
| `usePriceHistory(id)` | GET /api/user/subscriptions/{id}/price-history | Price history |
| `useForwardingAddress()` | GET /api/user/forwarding-address | Email forwarding address |
| `useUpdateForwardingAddress()` | PUT /api/user/forwarding-address | Update forwarding address |
| `useDashboardData()` | GET /api/dashboard/summary | Dashboard aggregated data |
| `useSummary()` | GET /api/summary | Leak summary for all analyses |
| `useTheme()` | localStorage | Theme preference (light/dark) |

### 4.4 State Management

- **Zustand (`authStore.ts`):** user, token, isAuthenticated, login(), logout()
- **TanStack Query:** All server state (caching, refetching, loading/error states)
- **localStorage:** JWT token persistence, theme preference

---

## 5. Features

### 5.1 Charts & Visualizations

- **CategoryPieChart:** Breakdown of subscriptions by category (entertainment, software, utilities, etc.)
- **SpendingTrendChart:** Monthly spending trend over time (line chart)
- **PriceHistoryChart:** Per-subscription price history with avg/min/max aggregates

**Dashboard:** Pie chart (left) + spending trend (right) below summary cards  
**Analysis:** Category breakdown pie chart + expandable rows with price history  
**Subscriptions:** Category pie chart above filters + price history dialog on merchant click

### 5.2 Price Tracking

- Records price snapshots in `price_history` table when subscription is re-detected
- Monthly aggregates computed: avg, min, max per month
- User isolation enforced on all price history queries

### 5.3 Password Reset

- `POST /api/auth/forgot-password` — generates token, sends email via SMTP
- `POST /api/auth/reset-password` — validates token, updates password
- Tokens: 64-char hex, 1-hour expiry, single-use
- Frontend: `/forgot-password` and `/reset-password?token=...` pages

### 5.4 Email Forwarding

- Each user gets unique address: `{first8chars_of_user_id}@subguard.app`
- `POST /api/inbound-email` — webhook endpoint for SendGrid/SES
- Parses PDF attachments → runs analysis pipeline
- Falls back to email body parsing if no attachments
- Settings page shows forwarding address + setup instructions

---

## 6. API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Get JWT token |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset password with token |

### Analysis

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload` | Yes | Upload PDF statement |
| GET | `/api/analysis/{id}` | Yes | Get analysis results |
| GET | `/api/subscriptions` | Yes | List all subscriptions |
| GET | `/api/summary` | Yes | Get leak summary |

### User

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/settings` | Yes | Get settings |
| PUT | `/api/user/settings` | Yes | Update settings |
| GET | `/api/user/history` | Yes | Paginated analysis history |
| GET | `/api/user/history/{id}` | Yes | Get specific analysis |
| GET | `/api/user/spending-trend` | Yes | Monthly spending aggregates |
| GET | `/api/user/subscriptions/{id}/price-history` | Yes | Price history for subscription |
| GET | `/api/user/forwarding-address` | Yes | Get/set email forwarding address |

### Webhook

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/inbound-email` | Webhook signature | Receive bank statement emails |

---

## 7. Database Schema

```sql
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    created_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    forwarding_address VARCHAR UNIQUE
);

CREATE TABLE user_settings (
    user_id VARCHAR PRIMARY KEY REFERENCES users(id),
    notification_email BOOLEAN DEFAULT TRUE,
    currency VARCHAR DEFAULT 'USD',
    theme VARCHAR DEFAULT 'light'
);

CREATE TABLE analyses (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    status VARCHAR DEFAULT 'processing',
    total_monthly_leak FLOAT DEFAULT 0.0,
    overall_score INTEGER DEFAULT 0,
    created_at DATETIME,
    warnings JSON DEFAULT '[]'
);

CREATE TABLE subscriptions (
    id VARCHAR PRIMARY KEY,
    analysis_id VARCHAR NOT NULL REFERENCES analyses(id),
    merchant VARCHAR NOT NULL,
    amount FLOAT NOT NULL,
    frequency VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    leak_score INTEGER DEFAULT 0,
    action VARCHAR DEFAULT 'review',
    reasoning TEXT DEFAULT '',
    price_trend VARCHAR DEFAULT 'stable',
    duration_months INTEGER DEFAULT 0,
    price_increases INTEGER DEFAULT 0
);

CREATE TABLE price_history (
    id VARCHAR PRIMARY KEY,
    subscription_id VARCHAR NOT NULL REFERENCES subscriptions(id),
    amount FLOAT NOT NULL,
    recorded_at DATETIME,
    source_analysis_id VARCHAR NOT NULL REFERENCES analyses(id)
);

CREATE TABLE password_reset_tokens (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    token VARCHAR UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at DATETIME
);
```

---

## 8. Development Guide

### Setup

```bash
# Backend
cd subscription-detector
pip install -r requirements.txt

# Frontend
cd subscription-detector/frontend
npm install
```

### Running

```bash
# Terminal 1: Backend
cd subscription-detector
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd subscription-detector/frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

### Adding a New Page

1. Create `frontend/src/pages/NewPage.tsx`
2. Add route in `frontend/src/App.tsx`
3. Create hook in `frontend/src/hooks/useNewData.ts` if needed

### Adding a New API Endpoint

1. Add route in `app/user/routes.py` or `app/main.py`
2. Add repository function if needed
3. Create frontend hook in `frontend/src/hooks/`

### Adding a New shadcn/ui Component

```bash
cd frontend
npx shadcn@latest add <component-name>
```

---

## 9. Testing

### Backend

```bash
cd subscription-detector
pytest tests/ -v
```

**67 tests covering:** auth, repositories, transaction extraction, recurring detection, leak scoring, action recommendations, PDF parsing

### Frontend

```bash
cd subscription-detector/frontend
npm run type-check    # TypeScript compilation
npm run build         # Production build
```

### E2E (Playwright)

```bash
cd subscription-detector/frontend
npx playwright test
```

**47 E2E tests covering:** auth flows, dashboard, upload, navigation, full user journey

---

## 10. Deployment

### Production Build

```bash
cd frontend && npm run build    # Outputs to frontend/dist/
cd .. && uvicorn app.main:app   # FastAPI serves built React app
```

FastAPI serves `frontend/dist/` as static files with SPA fallback.

### CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 11. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 on `/api/analysis/{id}` | ID mismatch between upload and query | Ensure `analyze_statement()` receives `analysis_id` from caller |
| `forwarding_address` column missing | SQLite `create_all()` doesn't alter tables | `database.py:init_db()` runs `ALTER TABLE` migration |
| CORS errors | Backend CORS not configured | Add CORSMiddleware to `main.py` |
| TypeScript build errors | Type mismatches in recharts | Use `any` types for recharts Tooltip `formatter` props |
| 401 redirect loop | Token not stored/cleared | Check `localStorage` and `api.ts` interceptor |
| Email not sending | SMTP not configured | Set `SMTP_*` env vars in `.env` |

---

**Document maintained by:** Development Team
