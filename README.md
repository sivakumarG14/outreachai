# OutreachAI — AI Email Outreach CRM

An AI-powered lead outreach and CRM system for any business. Automate cold email sequences, track engagement, score leads, and manage your sales funnel — all from a premium dark-mode dashboard.

---

## ✨ Features

- **8-Flow Email Funnel** — Automated cold contact → trust building → qualification → call scheduling → re-engagement
- **AI Email Generation** — Groq-powered (LLaMA 3) personalized outreach emails
- **Lead Scoring** — Automatic scoring based on opens, clicks, replies, and engagement
- **Real-Time Dashboard** — Socket.io live updates for lead events
- **Email Tracking** — Open pixel + link click tracking with device/browser analytics
- **CRM Pages** — Dashboard, Contacts, Campaigns, Reports & Analytics, Settings
- **Notification System** — Email notifications for high-priority leads
- **n8n Integration** — Optional workflow automation via n8n webhooks

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| Backend | Node.js + Express 4 |
| Database | MongoDB Atlas (Mongoose) |
| Real-Time | Socket.io |
| Email | Gmail SMTP (Nodemailer) |
| AI | Groq API (LLaMA 3.3 70B) |
| Auth | JWT (8-hour expiry) |
| Styling | Vanilla CSS + Google Fonts (Outfit, Inter) |

---

## 📁 Project Structure

```
ai-email-outreach-eng-version/
├── backend/
│   ├── models/          # Lead, Event schemas
│   ├── routes/          # auth, leads, funnel, track
│   ├── services/        # funnel, groq, mailer, templates, socket, webhook
│   ├── middleware/       # JWT auth middleware
│   ├── server.js        # Express + Socket.io server
│   └── .env             # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/       # Login, Dashboard
│   │   ├── components/  # AddLeadForm, LeadsTable, StatsBar
│   │   ├── api.js       # Axios instance with JWT interceptors
│   │   ├── socket.js    # Socket.io client
│   │   └── index.css    # Design system (gold/dark theme)
│   └── index.html       # Entry point
├── n8n/                 # n8n Dockerfile + workflow
├── postman/             # Postman collection
├── docker-compose.yml   # Docker orchestration
├── README.md
└── setup.md
```

---

## 🚀 Quick Start

See [setup.md](./setup.md) for detailed installation instructions.

```bash
# 1. Install backend dependencies
cd backend && npm install

# 2. Configure .env (update MONGO_URI, ADMIN_EMAIL, etc.)

# 3. Start backend
npm run dev

# 4. In another terminal, install & start frontend
cd frontend && npm install && npm run dev

# 5. Open http://localhost:5173
```

---

## 📊 AI Scoring System

| Event | Score |
|-------|-------|
| Email open | +5 |
| Link click | +10 |
| Reply (no/later) | +10 |
| Reply (yes/question) | +20 |
| Details provided | +30 |
| Call scheduled | +20 |
| **High priority threshold** | **≥ 40** |

---

## 🔄 Email Funnel Flows

1. **Flow 1** — Cold Contact (Day 0)
2. **Flow 2** — Reminder 1 (Day 4-5)
3. **Flow 3** — Trust Building (Day 8-10)
4. **Flow 4** — Reminder 2 / Self-Service (Day 15-20)
5. **Flow 4b** — Behavior Trigger (on link click)
6. **Flow 5** — Qualification (address request / SPIN questions)
7. **Flow 6** — Call Warm-up (1 day before scheduled call)
8. **Flow 8** — Re-engagement (90 days after going cold)

---

## 📡 Real-Time Events

Socket.io events emitted to all connected clients:

- `leadAdded` — new lead created
- `leadUpdated` — status/score changed
- `linkClicked` — tracking link clicked
- `emailOpened` — tracking pixel fired
- `callScheduled` — call date set
- `pageVisit` — JS snippet visit

---

## 🐳 Docker

```bash
docker-compose up --build
```

---

## 📄 License

MIT
