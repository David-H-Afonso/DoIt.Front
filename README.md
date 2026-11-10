# DoIt Frontend

React 19 + TypeScript + Vite frontend for DoIt `v0.6.0`.

See [CHANGELOG.md](CHANGELOG.md) for this minor version's task controls and app-wide mobile-first UI changes. Deploy it together with DoIt.Api `0.6.0`.

## Commands

```powershell
npm install
npm run dev
npm run build
npm run lint
npm run test
npm run cypress:run
```

## Notes

- Keep the app mobile-first.
- Use Vitest for unit/integration tests.
- Use Cypress for E2E tests.
- Keep visible text ready for i18n.

## Shared mobile-first workspace

- Every route, including login and account consent, shares self-hosted Inter variable typography, theme-derived paper surfaces, inset group
  headings and light separators. The font license is distributed at `/licenses/Inter-OFL.txt`; no external font service is called at runtime.
- `src/App.scss` composes the shared foundation, shell, pages and composer SCSS modules in `src/assets/styles/`. Task-specific inventory styles
  stay in `components/Tasks/TaskWorkspace.scss`; the shell must not change its appearance when navigating away from Tasks.
- Phones use a safe-area-aware bottom dock, 44px touch targets and 16px form inputs. Task/event sheets keep keyboard focus inside, prevent
  background scrolling and restore the trigger. Mobile navigation and snooze menus also close on Escape or an outside tap.
- The mobile calendar pairs its compact month with a selected-day agenda so long event names remain readable and editable. Calendar and
  Statistics are loaded on demand, with a localized loading state.

## Task and notification controls

- The Tasks view shows the effective push-alert state for the signed-in user, with **All / With alerts / No alerts** filters and counts.
- Tasks share a compact grouped worklist with aligned alert controls. Click a task name to edit it; **Filters** reveals zone, recurrence and sort
  controls without losing their current values when collapsed. Shared quick actions explicitly say they affect everyone.
- The circle at the left of each row completes its current occurrence; a checked circle can undo an authorized completion. Recurring tasks do
  not complete their next occurrence by accident. Future-only occurrences have a dashed control and an explicit early-completion label.
- Completed one-off tasks automatically move to **Archived**, matching the existing API behavior. Restore them with the success message's
  **Undo** or the checked control in Archived. Partial shared completions remain visibly partial until all required people have finished.
- **Select** changes the leading control to a square selection checkbox; it never completes tasks. Completion changes refresh the task,
  XP and Now, and failures leave the original state intact. Compact feedback appears at the bottom instead of covering status tabs.
- **Mute** disables all five notification events without opening or editing the task. **Select** supports up to 500 visible, owned tasks in one atomic request. Success messages include **Undo**, which restores each task's previous nullable overrides and lead time.
- Click a task's alert status to open its dedicated settings dialog. Switches show the effective values and whether they come from general settings. **Use general settings** restores inheritance; it is deliberately different from muting.
- Task overrides are shared by recipients of a House task, and only its creator can change them. Other users can inspect eligible task settings but cannot mute or select them. Tasks without applicable notification times and archived tasks are not labelled as actively notifying.
- These controls do not remove inbox activity or enable browser push permissions. Device activation remains in Profile.
- The API and frontend must be updated together: the view uses `GET /api/notifications/tasks` and atomic `PUT /api/notifications/tasks`. Existing individual endpoints remain supported; no database migration is required.

With Vite already running, run the isolated notification browser tests with:

```powershell
npm run cypress:run -- --spec cypress/e2e/task-notifications.cy.ts
npm run cypress:run -- --spec cypress/e2e/task-completion.cy.ts
npm run cypress:run -- --spec cypress/e2e/responsive-workspace.cy.ts
```
