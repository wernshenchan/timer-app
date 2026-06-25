## 1. Product Overview

A minimalist, single-user time tracking tool for logging hours spent on personal projects.

- **Purpose**: Track time spent on specific projects with the ability to backdate start times for projects already in progress
- **Target Users**: Single user (the developer) — no multi-user support, no authentication
- **Value**: Simple, fast, and free time tracking that runs anywhere without a backend

## 2. Core Features

### 2.1 User Roles

| Role | Access Method | Core Permissions |
|------|--------------|------------------|
| Single User | Open the app | Add projects, start/stop timers, adjust start times, view history |

### 2.2 Feature Module

1. **Project Management**: Add, rename, and delete projects
2. **Time Tracking**: Start/stop timer per project, manual time adjustment
3. **Time History**: View accumulated time per project per day/session
4. **Persistence**: Data saved locally and persists across sessions

### 2.3 Page Details

| Page Name | Module Name | Feature Description |
|-----------|-------------|---------------------|
| Main Page | Project List | Display all projects with current timer status and accumulated time |
| Main Page | Timer Controls | Start/Stop button per project, edit start time for backdating |
| Main Page | Add Project | Input field to create new projects |
| Main Page | Time Display | Show running time, total time per project, daily breakdown |

## 3. Core Process

User flow for tracking time:

1. User opens the app → sees list of existing projects
2. User can add a new project by typing a name and hitting enter
3. To start tracking, user clicks "Start" on a project → timer begins
4. To stop tracking, user clicks "Stop" → time is logged to that project
5. If a project started before tracking, user can click "Adjust" → set a custom start time
6. All data is automatically saved to localStorage

```mermaid
flowchart TD
    "Open App" --> "View Project List"
    "View Project List" --> "Create New Project"
    "View Project List" --> "Start Timer"
    "Start Timer" --> "Timer Running"
    "Timer Running" --> "Stop Timer"
    "Timer Running" --> "Adjust Start Time"
    "Adjust Start Time" --> "Timer Running (Updated)"
    "Stop Timer" --> "Time Logged to History"
    "Time Logged to History" --> "View Project List"
```

## 4. User Interface Design

### 4.1 Design Style
- **Theme**: Dark mode with warm amber/gold accents — easy on the eyes for extended use
- **Buttons**: Minimal, clean buttons with subtle hover effects
- **Typography**: Monospace font for timer display, clean sans-serif for UI
- **Layout**: Single-page, card-based layout with projects listed vertically
- **Vibe**: Tool-like, utilitarian, no clutter

### 4.2 Page Design Overview

| Page Name | Module Name | UI Elements |
|-----------|-------------|-------------|
| Main Page | Header | App title, total time summary |
| Main Page | Project List | Cards with project name, timer display, action buttons |
| Main Page | Timer Controls | Start/Stop buttons, adjust time input |
| Main Page | Add Project | Text input + add button |

### 4.3 Responsiveness
- Desktop-first design
- Mobile-friendly layout with stacked cards
- Touch-friendly button sizes

## 5. Technical Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State/Persistence**: localStorage (no backend required)
- **Deployment**: GitHub Pages or Netlify (free tier)
- **Local Usage**: Open dist/index.html or run dev server
