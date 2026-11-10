# Changelog

## 0.6.0 — Unreleased

### Added

- Effective task-alert states, notification filters/counts, one-click mute/enable and bulk mute for visible owned tasks, with Undo restoring the exact previous overrides.
- A dedicated notification dialog with effective event switches, explicit inheritance/reset behavior, permission feedback and keyboard focus containment.
- Inline task completion and Undo, explicit future-only completion, partial shared-completion states and separate square controls for selection mode.
- An app-wide mobile-first workspace shared by Now, Tasks, Zones, Review, Statistics, Calendar, Inbox, Profile, authentication and account consent.
- A compact mobile calendar with a selected-day agenda that keeps full event names readable.

### Changed

- Use self-hosted Inter variable typography, theme-derived paper surfaces, inset group headings and light separators consistently across routes.
- Improve safe-area spacing, 44px touch targets, 16px form inputs, long-content wrapping and phone/tablet/desktop layouts in light and dark themes.
- Keep task/event sheets focused and scroll-contained, restore their triggers on close, focus event errors inside the dialog and support Escape/outside-tap dismissal in mobile navigation and snooze menus.
- Load Calendar and Statistics on demand and consolidate shared styling instead of maintaining a separate Tasks-only shell.
- Protect task mutations against duplicate requests and stale inventory reads; synchronize Now and XP, and distinguish failed writes from successful writes followed by failed refreshes.
- Preserve one-off automatic archival with Undo from both feedback and the Archived view.

### Compatibility

- Deploy with DoIt.Api `0.6.0` for the notification collection and atomic batch endpoints.
- Saved theme preferences, existing task behavior and per-user inbox activity are preserved. No additional database migration is required.
