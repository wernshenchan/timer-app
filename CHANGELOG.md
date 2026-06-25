# Changelog

## 2026-06-25

### v1.0 — Initial Release

**Core Features**
- Project management: add, rename, delete projects
- Timer controls: start, pause, resume, end session
- Only one timer runs at a time (starting/resuming another auto-pauses the current)
- Adjust start time for backdating sessions
- Per-session editing: change start/end dates and times
- Per-session notes: label what each session was for
- Daily history grouped by project, expandable to see individual sessions
- All-time chronological session list with date labels

**Data**
- Full localStorage persistence (no backend needed)
- Migration support for old data when new fields are added

**Report & Export**
- Report modal with overview stats (total time, sessions, active days, projects)
- Filter by project for per-project reports
- Copy to clipboard (formatted text)
- CSV export — opens directly in Google Sheets

**Deployment**
- GitHub Pages auto-deploy via GitHub Actions
- Base path set to `/timer-app/`
- Noindex/nofollow meta tags

### Bug Fixes
- Project totals now computed from entries (source of truth) instead of accumulators, preventing drift
- `editTimeEntry` now uses the new end time (not old) to recalculate the date — backdated sessions move to the correct day
- `resumeTimer` now pauses other running projects — prevents two timers running simultaneously
