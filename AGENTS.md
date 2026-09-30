# Project architecture decisions

- Weekly and annual progress calculations use the profile timezone, Monday-based calendar boundaries, paginated reads, and distinct units; this prevents DST errors and misleading mixed totals.
- Automatic time-goal suggestions are calculated per project and must retain that project reference; all-project history cannot produce a reliable project-scoped goal.
- Shared room-day totals come from the room timezone helper and one query hook; this keeps goal and header totals consistent.