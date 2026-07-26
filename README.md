# SubGuard - Subscription Detector

Detect hidden subscriptions, recurring charges, and spending leaks from your bank statements. Upload a PDF statement or forward SMS/email alerts — SubGuard analyzes transactions, identifies subscriptions, tracks price trends, and recommends cancellation actions.

## Live Demo

- **Frontend**: https://frontend-five-khaki-94.vercel.app
- **Backend API**: https://subscription-dectector.onrender.com
- **Demo Video**: [Watch on Google Drive](https://drive.google.com/file/d/13oErXQtpfgH4qBIs8m6az1PWuHhKFWSD/view?usp=drivesdk)
- **Presentation**: [Google Slides](https://docs.google.com/presentation/d/1dG5H6tKGdZEwvLB39PWU-lUSc845vIHD/edit?usp=sharing&ouid=108650897223386794163&rtpof=true&sd=true)

## Features

- **PDF Statement Parsing** — Extract transactions from bank PDFs (SBI, HDFC, ICICI, Axis, BOB, PNB)
- **SMS/Email Forwarding** — Forward transaction alerts via Twilio SMS or email
- **Subscription Detection** — Identify recurring charges with confidence scoring
- **Price Trend Tracking** — Detect price increases over time
- **Leak Scoring** — Find unused or forgotten subscriptions
- **AI-Powered Summaries** — Gemini-based spending insights
- **PDF Export** — Generate analysis reports
- **Multi-User Auth** — JWT-based authentication with password reset

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy, Python 3.11 |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Database | SQLite (production: PostgreSQL) |
| AI | Google Gemini API |
| SMS | Twilio |
| Auth | JWT (python-jose), bcrypt |

## Project Structure

```
subscription-detector/
├── app/
│   ├── main.py              # FastAPI application
│   ├── auth/                # Authentication (JWT, middleware)
│   ├── user/                # User routes (settings, SMS config)
│   ├── api/                 # API routes (v2)
│   ├── parsers/             # PDF, SMS, Email parsers
│   ├── extraction/          # Transaction extraction engine
│   ├── intelligence/        # Subscription detection, categorization
│   ├── services/            # Twilio, email, AI summary, PDF export
│   ├── security/            # Encryption, rate limiting, audit
│   └── repositories/        # Database CRUD operations
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Upload, Settings, etc.
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # React Query hooks
│   │   └── lib/             # API client, types, utils
│   └── package.json
├── requirements.txt
└── .env.example
```

## Local Setup

### Backend

```bash
# Clone
git clone https://github.com/ronak-ravtode/subscription-dectector.git
cd subscription-dectector

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your API keys

# Run
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:8000`.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `SECRET_KEY` | JWT secret key | Yes |
| `ENCRYPTION_KEY` | Base64 encryption key | Yes |
| `DATABASE_URL` | Database connection string | No (defaults to SQLite) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | For SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For SMS |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | For SMS |
| `SMTP_HOST` | SMTP server host | For email |
| `SMTP_USER` | SMTP username | For email |
| `SMTP_PASS` | SMTP password | For email |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/upload` | Upload bank statement PDF |
| GET | `/api/analysis/{id}` | Get analysis results |
| GET | `/api/subscriptions` | List detected subscriptions |
| POST | `/api/user/sms-settings` | Configure SMS forwarding |
| POST | `/api/user/sms-test` | Test SMS forwarding |
| POST | `/api/v2/upload-email` | Upload via email attachment |
| GET | `/api/v2/spending-trends` | Get spending trends |

## Deployment

### Backend (Render)

1. Push to GitHub
2. Create a Web Service on [Render](https://render.com)
3. Set build command: `pip install -r requirements.txt && cd frontend && npm install && npm run build`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in Render dashboard

### Frontend (Vercel)

1. Connect repo to [Vercel](https://vercel.com)
2. Set root directory to `frontend`
3. Add env variable: `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

## License

MIT
