# 🚀 MavsTracker — Time Allocation & Analytics Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-v15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-Backend-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

An enterprise-grade, high-performance time-tracking and productivity analytics platform designed for teams to easily log hours, fetch Google Calendar meetings in real-time, and analyze resource allocations across projects and clients.

---

## 🌟 Key Features

*   📅 **Google Calendar Integration:** Automatically import, group, and log meeting hours directly from Google Calendar, skipping duplicate logs.
*   📊 **Interactive Dashboards:** Distinct dashboards for **Core Team Members**, **Managers**, and **Super Admins** containing real-time total logs, projections, and monthly client targets.
*   ⚡ **Searchable Dropdowns:** Ultra-responsive searchable select dropdowns for rosters and clients with horizontal auto-fitting and overflow prevention.
*   🔒 **Google OAuth Security:** Secure corporate access restricted to official domains.
*   🗄️ **Relational DB Power:** Backed by a high-availability Supabase PostgreSQL database holding records, roles, client budgets, and direct team reporting lines.

---

## 🗺️ System Flow & Architecture

This flowchart illustrates how the frontend, Express backend, Google Ecosystem, and Supabase Database interact seamlessly in real-time:

```mermaid
graph TD
    subgraph User Interface [Frontend - Next.js]
        A["Dashboard UI (User / Team / Manager)"]
        B["Calendar Import UI"]
    end

    subgraph Authentication [Security]
        OAuth["Google OAuth Login"]
        AuthM["Auth Middleware (JWT Verify)"]
    end

    subgraph Service Backend [API Server - Node.js & Express]
        API["API Routers (Allocations, Clients, Reports)"]
        CalS["Calendar Service (googleapis)"]
    end

    subgraph Data Layer [Database & External]
        GCal["Google Calendar API"]
        DB[("Supabase PostgreSQL DB")]
    end

    %% User Interaction Flows
    OAuth -->|"1. Authenticates"| A
    A -->|"2. Fetches Data"| AuthM
    AuthM -->|"3. Processes Route"| API
    API -->|"4. Reads/Writes Data"| DB
    
    %% Calendar Import Flows
    B -->|"1. Requests Events"| CalS
    CalS -->|"2. Fetches Raw Events"| GCal
    CalS -->|"3. Groups & Filters (IST)"| B
    B -->|"4. Commits Allocations"| API
```

---

## 📂 Project Structure

```text
Time-Allocation-Project/
├── client/                     # Next.js (Frontend Client App)
│   ├── src/
│   │   ├── app/                # Next.js Pages (Dashboard, Manager, Core, Team)
│   │   ├── components/         # SearchableSelect, MemberInsights, Sidebar, ClientAdmin
│   │   ├── hooks/              # useAllocations custom reactive state handlers
│   │   └── lib/                # Supabase configurations and Client APIs
│   ├── package.json
│   └── tsconfig.json
├── server/                     # Node.js + Express (Backend API Server)
│   ├── src/
│   │   ├── config/             # Supabase credentials initialization
│   │   ├── controllers/        # Business Logic (allocations, teams, reports, clients)
│   │   ├── middleware/         # Security & JWT Authentication checks
│   │   ├── routes/             # REST endpoints (router mappings)
│   │   └── services/           # Google Calendar Service integrations
│   ├── package.json
│   └── tsconfig.json
├── code.gs                     # Google Apps Script Utility (Calendar sync automation)
├── supabase_schema.sql         # SQL Database Schema & RLS Policies
└── seed_production.js          # Direct DB Seeding tool
```

---

## 🚀 Quick Setup & Installation

### Prerequisite
Ensure you have **Node.js (v18+)** installed on your system.

### 1. Setup Backend Server
```bash
cd server
npm install
# Create an .env file inside server/ based on .env.example
npm run build
npm start
```

### 2. Setup Frontend Client
```bash
cd client
npm install
# Create an .env.local file inside client/
npm run dev
```
Open **`http://localhost:3000`** in your browser to view the application locally.

---

## 🛡️ Security Best Practices
*   Environment files (`.env`, `.env.local`) are strictly excluded via `.gitignore` to prevent secret leakages.
*   Production database seed files (`Credentials*.xlsx`) are untracked and locked out of version control.
*   Cross-origin endpoints are secured using JSON Web Token (JWT) auth middleware.

---

## 🏆 Credits & Attribution

> [!NOTE]
> ### 💡 Developer Spotlight
> This system is designed, developed, and maintained with architectural excellence by:
> 
> **Satyam Kr. Singh**  
> 🏢 *The Mavericks Communication LLP*  
> 
> Supporting modern, data-driven productivity workflows across the enterprise.

