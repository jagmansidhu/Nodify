# Nodify

A modern personal CRM and email management platform with AI-powered prioritization. Built with Next.js 15, React, Snowflake, and Google's Gemini AI.

![Apple-Inspired Design](https://img.shields.io/badge/Design-Apple%20Inspired-000?style=flat-square&logo=apple)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Snowflake](https://img.shields.io/badge/Snowflake-Data-29B5E8?style=flat-square&logo=snowflake)

## Features

### 🔗 Connections Manager
- **Visual Network Graph** - D3-powered interactive graph of your professional connections
- **LinkedIn Import** - Import connections directly from LinkedIn CSV exports
- **Smart Filtering** - Filter by company, tags, relationship strength, and more
- **Connection Details** - View and edit contact information, notes, and relationship history
- **Snowflake Integration** - Store connections in Snowflake cloud database for persistence

### 📧 Email Dashboard
- **Gmail Integration** - Connect your Google account to fetch and manage emails
- **AI-Powered Analysis** - Gemini AI analyzes emails for priority, urgency, and suggested actions
- **Smart Prioritization** - Automatic sorting by importance with urgency scores (1-10)
- **Quick Overview** - One-click preview modals with AI-generated summaries
- **Category Visualization** - Interactive node graph showing email distribution by sender

### 🎨 Design
- Apple-inspired UI with glassmorphism effects
- Dark mode with refined typography
- Smooth animations and transitions
- Responsive layout for all screen sizes

## Getting Started

### Prerequisites
- Node.js 18+
- Google Cloud Project with Gmail API enabled
- Gemini API key
- Snowflake account (optional, for connections persistence)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Gmail OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Snowflake (optional - for connections persistence)
SNOWFLAKE_ACCOUNT=your_snowflake_account
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=CONNECTION_GRAPH
SNOWFLAKE_ACCESS_TOKEN=your_programmatic_access_token
NEXT_PUBLIC_USE_SNOWFLAKE=true

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── connections/   # Snowflake connections API
│   │   ├── email/         # Email list endpoint
│   │   └── gmail/         # Gmail OAuth endpoints
│   ├── connections/       # Connections network page
│   └── emails/           # Email dashboard page
├── components/            # React components
│   ├── AddConnection/    # Add connection modal
│   ├── ConnectionDetails/# Connection detail panel
│   ├── EmailCard/        # Email card component
│   ├── EmailDashboard/   # Email dashboard
│   ├── EmailNodeGraph/   # D3 email visualization
│   ├── EmailPreview/     # Email preview modal
│   ├── FilterPanel/      # Connection filters
│   ├── GraphCanvas/      # D3 network graph
│   ├── LinkedInImport/   # LinkedIn CSV import
│   └── Navbar/           # Navigation bar
├── context/               # React contexts
│   └── ConnectionsContext # Connections state management
└── lib/                   # Utilities
    ├── gemini/           # Gemini AI service
    ├── gmail/            # Gmail service
    └── snowflake.ts      # Snowflake SQL API
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **AI**: Google Gemini API
- **Email**: Gmail API with OAuth2
- **Database**: Snowflake (SQL REST API)
- **Visualization**: D3.js

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connections` | GET | Fetch all connections from Snowflake |
| `/api/connections` | POST | Add new connection to Snowflake |
| `/api/connections` | DELETE | Remove connection from Snowflake |
| `/api/gmail/auth` | GET | Initiate OAuth2 flow |
| `/api/gmail/callback` | GET | OAuth2 callback |
| `/api/gmail/status` | GET | Check connection status |
| `/api/gmail/disconnect` | POST | Disconnect Gmail |
| `/api/email/list` | GET | Fetch analyzed emails |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/connections` | Professional network visualization |
| `/emails` | AI-powered email dashboard |

## License

MIT
