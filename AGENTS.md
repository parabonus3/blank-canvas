# Project architecture decisions

- Weekly and annual progress calculations use the profile timezone, Monday-based calendar boundaries, paginated reads, and distinct units; this prevents DST errors and misleading mixed totals.
- Automatic time-goal suggestions are calculated per project and must retain that project reference; all-project history cannot produce a reliable project-scoped goal.
- Shared room-day totals come from the room timezone helper and one query hook; this keeps goal and header totals consistent.
- Scheduled room sessions use room-member RLS, manager-only writes, self-only attendance RPCs, room-timezone display, and uniquely named realtime channels; this prevents forged attendance and channel reuse.
- Timesheets paginate completed entries and group by profile-local start date; each linked task estimate is counted once per project, and exports follow existing subscription feature gates.
- Task estimate notices add the active timer to stored completed time without stopping or altering the session; this avoids double counting and preserves timer behavior.
- Monthly PDF exports render paginated browser-shaped text into jsPDF, while spreadsheets reuse the CSV exporter; this preserves non-Latin scripts without changing existing export modules.
- Achievement totals, days and months derive from one paginated profile-local annual read under the timeEntries cache prefix; this keeps existing session mutations consistent without changing the timer.
- Achievement visuals map to earned milestones, use build-converted images and decode before replacing the displayed image; this avoids empty intermediate levels and eager collection downloads.- Focus routine day status comes from focus_routine_runs keyed by profile-local date through one pure helper; routines never alter time entries or streaks, and linked checklist items are only marked after user confirmation.
