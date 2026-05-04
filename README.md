# IMS — Internal Management System

A real-time, multi-tenant workspace platform for task management, project collaboration, HR, and team productivity. Built for [SiferTech](https://sifertech.com).

---

## Features

| Area | Capabilities |
|---|---|
| **Tasks** | Personal, company-wide, and project-level Kanban boards with drag-and-drop |
| **Projects** | Full project lifecycle — kanban, mind map, workflow editor, file sharing, team chat |
| **People HR** | Member management, role assignment, attendance logs, time tracking |
| **Analytics** | Overview, operational, financial, and marketing dashboards with live charts |
| **Collaboration** | Real-time screen sharing, group chat, project comments, online presence |
| **AI Ecosystem** | AI chat widget and ecosystem integrations |
| **Meetings** | Meeting scheduling and management |
| **Multi-tenant** | Company / workspace switcher; full data isolation per workspace |
| **Auth** | Email + Google OAuth via Firebase; role-based access (master_admin, admin, member) |
| **Theme** | Dark / light mode toggle, persisted per user |

---

## Tech Stack

- **Frontend:** React 19, Vite 7, React Router 7
- **Styling:** Tailwind CSS 4, Framer Motion
- **State:** Zustand 5 (global), custom hooks (data + business logic)
- **Backend:** Firebase — Firestore (real-time DB), Auth, Storage
- **UI libs:** `@hello-pangea/dnd` (drag-drop), `@xyflow/react` (mind maps / workflows), Recharts (charts), Lucide React (icons)

---

## Project Structure

```
src/
├── assets/             # Static images / SVGs
├── components/
│   ├── auth/           # Login, Signup
│   ├── dashboard/      # Kanban widgets, AI chat, Vision board
│   ├── layout/         # DashboardLayout, CompanySwitcher, GlobalTimeTracker
│   ├── projects/       # Project detail, MindMap, WorkflowEditor, ScreenShare
│   ├── shared/         # TaskDetailPanel, ErrorBoundary, LoadingScreen
│   └── work/           # WorkKanban, NotesSection
├── config/
│   └── accessControl.js  # Role constants + static admin list
├── hooks/              # Custom hooks (useGlobalTasks, useTimeTracker, etc.)
├── pages/              # Route-level page components (17 pages)
├── store/
│   └── useStore.js     # Zustand global store
├── App.jsx             # Router, auth listener, presence sync
├── firebase.js         # Firebase SDK initialization
└── main.jsx            # React entry point + ErrorBoundary
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase](https://console.firebase.google.com/) project with Firestore, Auth, and Storage enabled

### 1. Clone & install

```bash
git clone <repo-url>
cd ims
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Firebase project values:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### 3. Deploy Firestore rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules
```

### 4. Run locally

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build        # Output: dist/
npm run preview      # Preview production build locally
```

---

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all `VITE_FIREBASE_*` environment variables in the Vercel dashboard
4. Deploy — the `vercel.json` SPA rewrite is already configured

### Render / Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add the same `VITE_FIREBASE_*` environment variables

---

## Access Control

Roles are defined in [`src/config/accessControl.js`](src/config/accessControl.js):

| Role | Permissions |
|---|---|
| `master_admin` | Full access to all companies, admin panel, user management |
| `admin` | Manage members, projects, and settings within their company |
| `member` | Read/write tasks and projects within their company |

The master admin email is set in `accessControl.js`. Firestore security rules enforce all permissions server-side.

---

## Firestore Data Model

```
companies/{companyId}
  members/{userId}
  projects/{projectId}
    tasks/{taskId}
    comments/, chat/, files/, kanban/
  tasks/{taskId}           # company-wide tasks
  kanban/, timeLogs/, attendance/, messages/

globalTasks/{userId}/tasks/{taskId}
personalBoards/{userId}/...
screenSessions/{sessionId}/viewers/, controlRequests/
users/{userId}/settings/, integrations/
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## License

Private — SiferTech internal project.
