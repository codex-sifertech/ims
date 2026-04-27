# IMS (Internal Management System) - Deep Dive Project Architecture & UI Breakdown

This document provides an exhaustive, button-by-button, page-by-page breakdown of the entire IMS platform. It covers the UI elements, interactive options, and data flow of each module.

---

## 1. Authentication & Onboarding

### Login Page (`/login`)
- **Background**: Dynamic background image with glassmorphism overlay and ambient glow effects.
- **Form Elements**:
  - `Email Input`: Text field for the user's email.
  - `Password Input`: Secure text field.
  - `Show/Hide Password Button`: A toggle (Eye/EyeOff icon) inside the password field to reveal text.
- **Actions**:
  - `Sign In Button`: Submits the form. Displays a loading spinner when authenticating via Firebase.
  - `Create an account Link`: Redirects the user to the Signup page.

### Signup Page (`/signup`)
- **Form Elements**:
  - `Full Name Input`: Text field for the user's display name.
  - `Email Input`: Text field for registration.
  - `Password Input`: Secure text field with `Show/Hide` toggle. Requires a minimum of 6 characters.
- **Actions**:
  - `Create Account Button`: Registers the user in Firebase Auth and creates a profile in the Firestore `users` collection.
  - `Sign In Link`: Redirects back to the Login page.

### Workspace / Company Selection (`/`)
*This is the gatekeeper page. Users must select an active company before accessing the dashboard.*
- **Display Elements**:
  - A list of all workspaces the user is a member of, showing the workspace name, avatar (first letter), and user's role (e.g., "Owner").
- **Actions**:
  - `Sign Out Button`: Logs the user out.
  - `Workspace Cards`: Clicking a workspace selects it and redirects to the Dashboard.
- **Create New Workspace (Expandable Form)**:
  - `Create New Workspace Button`: Expands the creation form.
  - `Workspace Name Input`: Text field for the new company name.
  - `Cancel Button`: Closes the form.
  - `Create Button`: Commits the new company to Firestore and automatically adds the user as the `admin`/`owner`.

---

## 2. Global Layout & Navigation (`DashboardLayout`)

The main dashboard layout wraps all internal pages.
- **Sidebar (Collapsible)**:
  - `Collapse Toggle Button` (`<` / `>`): Shrinks or expands the sidebar.
  - `Workspace Switcher`: A dropdown component to switch between different companies without returning to the selection screen.
- **Navigation Menu (Tabs)**:
  - `Dashboard`: Expandable accordion with sub-tabs (`Overview`, `Operational`, `Financial`, `Marketing`).
  - `My Board`: Links to the personal task management space.
  - `Projects`: Links to the centralized project portfolio.
  - `Chat`: Links to the internal messaging system.
  - `AI Ecosystem`: Links to AI integrations.
  - `Meetings`: Links to video conferencing / scheduling.
  - `People HR`: Links to the company directory.
  - `Workspace Details` / `Admin Panel`: Contextual settings button depending on if the user is a standard member, workspace owner, or `master_admin`.
- **Footer Utilities**:
  - `User Profile Banner`: Displays the user's avatar, name, and "Online" status.
  - `Theme Toggle Button`: Switches between Day Mode (Sun icon) and Night Mode (Moon icon).
  - `Logout Button`: Ends the session.

---

## 3. Core Pages & Feature Breakdown

### Analytics Dashboard (`/dashboard`)
*The central command center ("Parent Controller") for the workspace.*
- **Top Header**:
  - `Initialize Session / Finish Shift Button`: Interacts with the `GlobalTimeTracker` to punch in/out. Changes from green to red when active.
- **Overview Tab**:
  - **Metric Cards (4)**: Displays `Total Projects`, `Task Success (%)`, `Pending Tasks`, and `Active Members`.
  - **Eco Load Panel**: A real-time presence widget showing avatars of online team members. Includes a pulse indicator and hover tooltips showing Name/Role.
  - **Ecosystem Velocity Chart**: A large `recharts` Area Chart showing the trend of Tasks and Projects over the last 7 days.
  - **Health Matrix**: A Pie Chart breaking down project statuses (Ongoing, Completed, Urgent).
  - **Mammu AI Widget**: A sticky sidebar chatbot acting as a "System Analyst". Users can input prompts to query workspace data.
  - **Company Kanban**: A high-level Kanban board component summarizing company-wide tasks.
- **Specialized Hubs (Operational/Financial/Marketing)**:
  - Accessible via the sidebar sub-menu. Currently displays an empty state with a large `Download Reports` button.

### My Board (`/dashboard/my-board`)
*A personalized workspace for individual focus.*
- **Top Navigation Tabs**:
  - `Global Task Board`: A Kanban view filtering tasks assigned specifically to the user across all projects.
  - `Notes & Journals`: A text editor/notepad for personal scratchpad items.
  - `Vision Board`: A visual canvas for goals.
  - `Calendar`: (Integration placeholder) For viewing upcoming deadlines.
  - `Roadmap`: (Integration placeholder) For long-term personal planning.

### Projects Board (`/dashboard/projects`)
*The portfolio view of all active initiatives.*
- **Top Header**:
  - Displays tallies for `active`, `upcoming`, and `done` projects.
  - `New Project Button`: Opens the creation modal.
- **Kanban Interface**:
  - Three columns: `In Progress`, `Upcoming`, `Completed`.
  - **Project Cards**: Each card displays the Title, Colored Labels (e.g., Design, Engineering), Description snippet, Creator's Avatar, Due Date, and Status. Clicking a card navigates to `Project Details`.
- **New Project Modal**:
  - `Project Name Input`: Required text field.
  - `Description Textarea`: Optional scope definition.
  - `Labels Toggle Buttons`: Multi-select pill buttons for tags (Design, Engineering, Marketing, Research, Operations, Finance).
  - `Status Radio Buttons`: Select between Ongoing, Upcoming, Completed.
  - `Due Date Picker`: Native HTML date input.
  - `Cancel` & `Create Project` Buttons.

### Project Details (`/dashboard/projects/:projectId`)
*The deep-dive view for a specific project.*
- **Top Header**:
  - `Back Arrow Button`: Returns to the Projects Board.
  - Status Badge & Project Title.
  - `Chat Button`: Opens a slide-out `ProjectCollaborationSidebar` for project-specific messaging.
- **Main View Tabs**:
  - `Details`: Form to edit project name, description, and metadata.
  - `Analytics`: Charts showing task completion rates specifically for this project.
  - `Tasks`: A dedicated internal Kanban board for this project's micro-tasks.
  - **`Tools` Tab** (Reveals a sub-navigation bar):
    - `Screen Share`: Button to initialize or view a WebRTC screen share session.
    - `Mind Map`: An interactive node-based canvas (`@xyflow/react`) to map out ideas.
    - `Workflow`: A tree/list builder for structured processes.
    - `AI`: A panel with a `Start Analysis Session` button to trigger project-specific AI insights.
    - `Settings`: Danger zone for deleting or archiving the project.

### AI Ecosystem (`/dashboard/ai`)
*A hub linking out to external AI tools.*
- **Layout**: A responsive grid of cards.
- **Tools Included**: ChatGPT, Gemini, Claude, Perplexity, Midjourney.
- **Card Interactions**: Each card has a Tool Icon, Title, Description, and an External Link Icon. Clicking anywhere on the card opens the respective platform in a new browser tab.

---

## 4. Additional Modules (Overview)

### Inbox / Chat (`/dashboard/chat`)
- **Sidebar**: List of direct messages and group channels.
- **Chat Window**: 
  - Message history feed.
  - `Message Input Field` with formatting options.
  - `Send Button`.
  - `Attachment Button` to upload files to Firebase Storage.

### People HR (`/dashboard/people` & `/dashboard/people/:memberId`)
- **Directory**: A grid/list of all members in the current workspace.
- **Actions**:
  - `Invite Member Button`: Opens a modal with an `Email Input` and `Role Select` dropdown to add new users to the company access list.
- **Member Details**: Clicking a user shows their profile, contact info, recent activity, and their specific task load.

### Meetings (`/dashboard/meetings`)
- A centralized hub for scheduling. Contains a `Schedule Meeting Button` (date/time/participants inputs) and lists upcoming calls with a `Join` button.

### Admin Panel & Settings (`/dashboard/settings` / `/dashboard/admin`)
- Accessible only to Workspace Owners or `master_admin`s.
- Contains form fields for `Company Name`, `Billing Information`, and `Role Management` (dropdowns to promote/demote users or a `Remove User` button).
