import { lazy, Suspense, useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useToast } from '@/components/Toasts/useToast'
import { archiveTask, deleteTask, mutateTaskOccurrence, restoreTask } from '@/store/features/tasks/tasksSlice'
import { fetchNow } from '@/store/features/now/nowSlice'
import { openTaskEditor } from '@/store/features/ui/uiSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { TaskItem } from '@/models/task'
import type { TaskNotificationOverride } from '@/models/notifications'
import { getTaskNotificationState, inheritedTaskNotifications, setAllTaskNotifications } from '@/utils/taskNotifications'
import { fetchTaskNotificationSettings, saveTaskNotificationOverrides } from '@/store/features/taskNotifications/taskNotificationsSlice'
import { fetchXp, setXp } from '@/store/features/xp/xpSlice'
import { canActOnTask, canUndoOccurrence, canUndoOccurrenceSummary, getTaskCompletionControl, type TaskOccurrenceMutation } from '@/utils/taskCompletion'
import TaskIcon from './TaskIcon'
import TaskInventoryRow from './TaskInventoryRow'
import type { TaskMenuAction } from './TaskActionsMenu'
import './TaskWorkspace.scss'

type StatusFilter = 'active' | 'archived'
type SortMode = 'alphabetical' | 'createdDesc' | 'createdAsc'
type NotificationFilter = 'all' | 'on' | 'off'
const TaskNotificationsDialog = lazy(() => import('./TaskNotificationsDialog'))

export default function TasksPage() {
	const { locale, t } = useI18n()
	const dispatch = useAppDispatch()
	const [searchParams] = useSearchParams()
	const { showToast } = useToast()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const currentUser = useAppSelector((state) => state.auth.user)
	const tasks = useAppSelector((state) => state.tasks.items)
	const tasksError = useAppSelector((state) => state.tasks.error)
	const pendingOccurrences = useAppSelector((state) => state.tasks.pendingOccurrences)
	const notifications = useAppSelector((state) => state.taskNotifications)
	const linkedTaskId = searchParams.get('taskId')
	const linkedTaskAvailable = tasks.some((task) => task.id === linkedTaskId)
	const zoneItems = useAppSelector((state) => state.zones.items)
	const zones = useMemo(() => zoneItems.filter((zone) => !zone.isArchived), [zoneItems])
	const loading = useAppSelector((state) => state.tasks.loading)
	const [status, setStatus] = useState<StatusFilter>('active')
	const [query, setQuery] = useState('')
	const [zoneId, setZoneId] = useState('')
	const [recurrence, setRecurrence] = useState('')
	const [sortMode, setSortMode] = useState<SortMode>('alphabetical')
	const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all')
	const [filtersOpen, setFiltersOpen] = useState(false)
	const [selecting, setSelecting] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [notificationTaskId, setNotificationTaskId] = useState<string | null>(null)
	const [clock, setClock] = useState(() => new Date())
	const filterPanelId = useId()
	const ready = notifications.loaded && notifications.preferences !== null && !notifications.error
	const busy = notifications.pendingTaskIds.length > 0
	const notificationTask = tasks.find((task) => task.id === notificationTaskId)
	const activeFilterCount = Number(Boolean(zoneId)) + Number(Boolean(recurrence)) + Number(sortMode !== 'alphabetical')

	useEffect(() => {
		if (accessToken) void dispatch(fetchTaskNotificationSettings())
	}, [accessToken, dispatch])

	useEffect(() => {
		const timer = window.setInterval(() => setClock(new Date()), 30_000)
		return () => window.clearInterval(timer)
	}, [])

	useEffect(() => {
		setSelectedIds([])
	}, [status, notificationFilter, query, zoneId, recurrence])
	useEffect(() => {
		if (linkedTaskId && linkedTaskAvailable) {
			dispatch(openTaskEditor(linkedTaskId))
		}
	}, [dispatch, linkedTaskId, linkedTaskAvailable])

	const runOccurrenceAction = async (request: TaskOccurrenceMutation, focusTask = false) => {
		const returnToControl = focusTask || document.activeElement?.id === `task-complete-${request.taskId}`
		try {
			const { response, task } = await dispatch(mutateTaskOccurrence(request)).unwrap()
			if (response.userXp && request.action !== 'undo') dispatch(setXp(response.userXp))
			else void dispatch(fetchXp())
			void dispatch(fetchNow())
			const completed = request.action === 'complete' || request.action === 'early'
			const partial = completed && response.status === 'Pending'
			const actor = request.target === 'current' ? task?.occurrenceCompletedByUserId : task?.upcomingOccurrence?.completedByUserId
			const canUndo = request.action !== 'undo' && (actor === currentUser?.id || response.xpEarned > 0)
			const description = [completed && task?.isArchived ? t('taskActions.archivedOnDone') : '', !task ? t('taskActions.refreshWarning') : ''].filter(Boolean).join(' ')
			showToast({
				groupKey: 'task-occurrence',
				type: !task ? 'warning' : partial ? 'info' : 'success',
				title: t(partial ? 'taskActions.partDone' : request.action === 'undo' ? 'toasts.undone' : request.action === 'missed' ? 'toasts.missed' : request.action === 'early' ? 'toasts.doneEarly' : 'toasts.done'),
				description: description || undefined,
				durationMs: 8000,
				actionLabel: canUndo ? t('common.undo') : undefined,
				onAction: canUndo ? () => { void runOccurrenceAction({ ...request, action: 'undo' }, true) } : undefined,
			})
		} catch (error) {
			if (typeof error === 'object' && error && 'name' in error && error.name === 'ConditionError') return
			const code = typeof error === 'object' && error && 'code' in error ? error.code : null
			showToast({ groupKey: 'task-occurrence', type: 'error', title: t(code === 'occurrence_snoozed' ? 'taskActions.snoozedError' : code === 'occurrence_unavailable' ? 'taskActions.unavailableError' : 'taskActions.saveError') })
		} finally {
			if (returnToControl) window.requestAnimationFrame(() => {
				const active = document.activeElement
				if (active && active !== document.body && active.id !== `task-complete-${request.taskId}` && !active.closest('.toast')) return
				const control = document.getElementById(`task-complete-${request.taskId}`) as HTMLButtonElement | null
				const target = control && !control.disabled ? control : document.querySelector<HTMLElement>('.tasks-status-tabs button[aria-pressed="true"]')
				target?.focus({ preventScroll: true })
				if (control && target === control && window.innerWidth < 960 && control.getBoundingClientRect().bottom > window.innerHeight - 220) control.scrollIntoView({ block: 'center', behavior: 'auto' })
			})
		}
	}

	const notificationStates = useMemo(() => new Map(tasks.flatMap((task) => ready && notifications.preferences
		? [[task.id, getTaskNotificationState(task, notifications.preferences, notifications.overrides[task.id] ?? inheritedTaskNotifications(task.id), currentUser?.id)] as const]
		: [])), [tasks, ready, notifications.preferences, notifications.overrides, currentUser?.id])
	const matchingTasks = useMemo(() => tasks
		.filter((task) => status === 'archived' ? task.isArchived : !task.isArchived)
		.filter((task) => !zoneId || task.zoneId === zoneId)
		.filter((task) => !recurrence || task.schedule?.recurrenceType === recurrence)
		.filter((task) => task.title.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()))
		.sort((left, right) => sortMode === 'alphabetical'
			? left.title.localeCompare(right.title, locale, { sensitivity: 'base' })
			: sortMode === 'createdDesc'
				? right.createdAt.localeCompare(left.createdAt)
			: left.createdAt.localeCompare(right.createdAt)), [locale, query, recurrence, sortMode, status, tasks, zoneId])
	const visibleTasks = matchingTasks.filter((task) => notificationFilter === 'all' || ready && (notificationFilter === 'on' ? notificationStates.get(task.id)?.enabled : !notificationStates.get(task.id)?.enabled))
	const withNotifications = ready ? matchingTasks.filter((task) => notificationStates.get(task.id)?.enabled).length : null
	const notificationCounts = { all: matchingTasks.length, on: withNotifications ?? '—', off: withNotifications === null ? '—' : matchingTasks.length - withNotifications }
	const selectableTasks = visibleTasks.filter((task) => task.createdByUserId === currentUser?.id && !task.isArchived)
	// Only the visible, owned selection may be changed, even if a refresh or filter
	// removes an item while the user is selecting tasks.
	const selectedTasks = selectableTasks.filter((task) => selectedIds.includes(task.id))
	const allSelected = selectableTasks.length > 0 && selectedTasks.length === Math.min(500, selectableTasks.length)

	const persistOverrides = async (values: TaskNotificationOverride[], title: string) => {
		const previous = values.map((value) => notifications.overrides[value.taskId] ?? inheritedTaskNotifications(value.taskId))
		try {
			await dispatch(saveTaskNotificationOverrides(values)).unwrap()
			showToast({ type: 'success', title, durationMs: 8000, actionLabel: t('common.undo'), onAction: () => {
				void dispatch(saveTaskNotificationOverrides(previous)).unwrap().then(() => {
					showToast({ type: 'success', title: t('taskAlerts.restored') })
				}).catch(() => showToast({ type: 'error', title: t('taskAlerts.saveError') }))
			} })
			return true
		} catch {
			showToast({ type: 'error', title: t('taskAlerts.saveError') })
			return false
		}
	}

	const toggleTaskNotifications = (task: TaskItem) => {
		const state = notificationStates.get(task.id)
		if (!ready || busy || !state || task.createdByUserId !== currentUser?.id) return
		const value = notifications.overrides[task.id] ?? inheritedTaskNotifications(task.id)
		void persistOverrides([setAllTaskNotifications(value, !state.enabled)], t(state.enabled ? 'taskAlerts.mutedToast' : 'taskAlerts.enabledToast'))
	}

	const muteSelected = async () => {
		if (!ready || busy || selectedTasks.length === 0) return
		const values = selectedTasks.map((task) => setAllTaskNotifications(notifications.overrides[task.id] ?? inheritedTaskNotifications(task.id), false))
		if (await persistOverrides(values, t(values.length === 1 ? 'taskAlerts.bulkMutedOne' : 'taskAlerts.bulkMuted').replace('{count}', String(values.length)))) {
			setSelectedIds([])
			setSelecting(false)
		}
	}

	const clearFilters = () => { setQuery(''); setZoneId(''); setRecurrence(''); setNotificationFilter('all'); setSortMode('alphabetical') }

	const getActions = (task: TaskItem): TaskMenuAction[] => {
		const actions: TaskMenuAction[] = []
		if (canEditTask(task, currentUser?.id, currentUser?.role)) actions.push({ label: t('tasks.edit'), icon: 'edit', onSelect: () => dispatch(openTaskEditor(task.id)) })
		if (canActOnTask(task, currentUser?.id, currentUser?.role) && task.upcomingOccurrence?.status === 'Pending') actions.push({ label: t('tasks.completeEarly'), icon: 'check', onSelect: () => void runOccurrenceAction({ taskId: task.id, occurrenceId: task.upcomingOccurrence!.id, target: 'upcoming', action: 'early' }) })
		if (canUndoOccurrenceSummary(task, currentUser?.id, currentUser?.role) && task.upcomingOccurrence?.status === 'Done') actions.push({ label: t('taskAlerts.undoUpcoming'), icon: 'undo', onSelect: () => void runOccurrenceAction({ taskId: task.id, occurrenceId: task.upcomingOccurrence!.id, target: 'upcoming', action: 'undo' }) })
		if (canActOnTask(task, currentUser?.id, currentUser?.role) && task.occurrenceId && task.occurrenceStatus === 'Pending' && task.schedule?.recurrenceType !== 'TimesPerWeek') actions.push({ label: t('now.miss'), icon: 'close', onSelect: () => void runOccurrenceAction({ taskId: task.id, occurrenceId: task.occurrenceId!, target: 'current', action: 'missed' }) })
		if (canUndoOccurrence(task, currentUser?.id, currentUser?.role) && task.occurrenceId && task.occurrenceStatus !== 'Pending') actions.push({ label: t('common.undo'), icon: 'undo', onSelect: () => void runOccurrenceAction({ taskId: task.id, occurrenceId: task.occurrenceId!, target: 'current', action: 'undo' }) })
		if (task.createdByUserId === currentUser?.id) {
			actions.push({ label: t(task.isArchived ? 'tasks.restore' : 'tasks.archive'), icon: task.isArchived ? 'undo' : 'archive', onSelect: () => { void dispatch(task.isArchived ? restoreTask(task.id) : archiveTask(task.id)).unwrap().catch(() => showToast({ type: 'error', title: t('toasts.error') })) } })
			actions.push({ label: t('tasks.delete'), icon: 'trash', danger: true, onSelect: () => { if (window.confirm(t('tasks.deleteConfirm'))) void dispatch(deleteTask(task.id)).unwrap().catch(() => showToast({ type: 'error', title: t('toasts.error') })) } })
		}
		return actions
	}

	return (
		<div className='page-grid tasks-page'>
			<section className='tasks-toolbar' aria-label={t('tasks.title')}>
				<div className='tasks-toolbar__navigation'><div className='tasks-status-tabs' role='group' aria-label={t('taskAlerts.taskStatus')}>
					{(['active', 'archived'] as const).map((value) => <button key={value} type='button' aria-pressed={status === value} className={status === value ? 'is-active' : undefined} onClick={() => { setStatus(value); setSelecting(false) }}>{t(`tasks.${value}`)}<span>{tasks.filter((task) => value === 'archived' ? task.isArchived : !task.isArchived).length}</span></button>)}
				</div>
				<div className='tasks-notification-filters' role='group' aria-label={t('taskAlerts.filterLabel')}>
					{(['all', 'on', 'off'] as const).map((value) => <button type='button' key={value} aria-label={`${t(`taskAlerts.${value}`)} ${notificationCounts[value]}`} aria-pressed={notificationFilter === value} disabled={value !== 'all' && !ready} className={notificationFilter === value ? 'is-active' : undefined} onClick={() => setNotificationFilter(value)}><TaskIcon name={value === 'all' ? 'list' : value === 'on' ? 'bell' : 'bell-off'} /><span>{t(`taskAlerts.${value}`)}</span><b>{notificationCounts[value]}</b></button>)}
				</div>
				</div>
				<div className='tasks-toolbar__controls'>
					<label className='tasks-search'><TaskIcon name='search' /><input type='search' aria-label={t('tasks.search')} placeholder={t('tasks.search')} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
					<div className='tasks-toolbar__tools'><button className='task-text-button tasks-filter-toggle' type='button' aria-expanded={filtersOpen} aria-controls={filterPanelId} onClick={() => setFiltersOpen(!filtersOpen)}><TaskIcon name='filters' />{t('taskAlerts.filters')}{activeFilterCount ? <b>{activeFilterCount}</b> : null}</button>
					{status === 'active' ? <button className={`task-text-button tasks-select-button${selecting ? ' is-active' : ''}`} type='button' aria-pressed={selecting} disabled={!ready || busy || selectableTasks.length === 0} onClick={() => { setSelecting(!selecting); setSelectedIds([]) }}><TaskIcon name={selecting ? 'close' : 'check'} />{t(selecting ? 'common.cancel' : 'taskAlerts.select')}</button> : null}</div>
				</div>
				<div id={filterPanelId} className={`tasks-extra-filters${filtersOpen ? ' is-open' : ''}`}>
				<select aria-label={t('tasks.allZones')} value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
					<option value=''>{t('tasks.allZones')}</option>
					{zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}
				</select>
				<select aria-label={t('tasks.allRecurrences')} value={recurrence} onChange={(event) => setRecurrence(event.target.value)}>
					<option value=''>{t('tasks.allRecurrences')}</option>
					<option value='Manual'>{t('tasks.oneOff')}</option>
					<option value='Daily'>{t('tasks.daily')}</option>
					<option value='Weekday'>{t('tasks.weekly')}</option>
					<option value='TimesPerWeek'>{t('quickCreate.xPerWeek')}</option>
					<option value='EveryNDays'>{t('quickCreate.everyNDaysShort')}</option>
					<option value='EveryNWeeks'>{t('quickCreate.everyNWeeks')}</option>
					<option value='Monthly'>{t('quickCreate.monthlyDay')}</option>
					<option value='EveryNMonths'>{t('quickCreate.everyNMonths')}</option>
					<option value='EveryNYears'>{t('quickCreate.everyNYears')}</option>
					<option value='MonthlyOrdinalWeekday'>{t('quickCreate.monthlyOrdinal')}</option>
				</select>
				<select aria-label={t('tasks.sort')} value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
					<option value='alphabetical'>{t('tasks.sortAlphabetical')}</option>
					<option value='createdDesc'>{t('tasks.sortNewest')}</option>
					<option value='createdAsc'>{t('tasks.sortOldest')}</option>
				</select>
				</div>
			</section>

			{notifications.error ? <div className='tasks-load-error' role='alert'><span>{t('taskAlerts.loadError')}</span><button className='task-text-button' type='button' disabled={notifications.loading} onClick={() => void dispatch(fetchTaskNotificationSettings())}>{t('taskAlerts.retry')}</button></div> : null}
			{tasksError ? <p className='form-error' role='alert'>{t('taskAlerts.tasksLoadError')}</p> : null}
			{selecting ? <section className='tasks-bulk-bar' aria-label={t('taskAlerts.selection')}>
				<div><label className='task-select-all'><input type='checkbox' checked={allSelected} ref={(element) => { if (element) element.indeterminate = selectedTasks.length > 0 && !allSelected }} disabled={busy} onChange={() => setSelectedIds(allSelected ? [] : selectableTasks.slice(0, 500).map((task) => task.id))} /><span>{t('taskAlerts.selectAll')}</span></label><strong aria-live='polite'>{t(selectedTasks.length === 1 ? 'taskAlerts.selectedOne' : 'taskAlerts.selectedCount').replace('{count}', String(selectedTasks.length))}</strong></div>
				<button className='task-primary-button' type='button' disabled={selectedTasks.length === 0 || busy} onClick={() => void muteSelected()}><TaskIcon name='bell-off' />{t(busy ? 'common.loading' : 'taskAlerts.muteSelected')}</button>
				<p>{t(selectedTasks.some((task) => task.scope === 'House') ? 'taskAlerts.sharedWarning' : 'taskAlerts.selectionHelp')}{selectableTasks.length > 500 ? ` ${t('taskAlerts.selectionLimit')}` : ''}</p>
			</section> : null}
			{loading ? <p className='empty-state'>{t('common.loading')}</p> : null}
			{!loading && visibleTasks.length === 0 ? <div className='tasks-empty-state'><TaskIcon name='search' /><h2>{t('taskAlerts.noResults')}</h2><p>{t('tasks.empty')}</p>{query || zoneId || recurrence || notificationFilter !== 'all' ? <button className='task-text-button' type='button' onClick={clearFilters}>{t('taskAlerts.clearFilters')}</button> : null}</div> : null}
			{visibleTasks.length > 0 ? <div className='tasks-worklist'>{(['Overdue', 'Manual', 'Recurring'] as const).map((group) => {
				const groupTasks = visibleTasks.filter((task) => {
					const isOverdue = task.occurrenceStatus === 'Pending' && task.isOverdue === true
					return group === 'Overdue' ? isOverdue : !isOverdue && (group === 'Manual' ? task.schedule?.recurrenceType === 'Manual' : task.schedule?.recurrenceType !== 'Manual')
				})
				if (groupTasks.length === 0) return null
				return <section className='task-inventory-group' key={group} aria-label={group === 'Overdue' ? t('tasks.overdue') : group === 'Manual' ? t('tasks.oneOffGroup') : t('tasks.recurring')}>
					<header><h2>{group === 'Overdue' ? t('tasks.overdue') : group === 'Manual' ? t('tasks.oneOffGroup') : t('tasks.recurring')}</h2><span>{groupTasks.length}</span></header>
					<div className='task-inventory'>
						{groupTasks.map((task) => {
							const state = notificationStates.get(task.id)
							const completion = getTaskCompletionControl(task, currentUser?.id, currentUser?.role, clock)
							return <TaskInventoryRow key={task.id} task={task} notificationState={state} completion={completion} completionBusy={Boolean(pendingOccurrences?.[task.id])} onComplete={() => { if (completion.action && completion.target && completion.occurrenceId) void runOccurrenceAction({ taskId: task.id, occurrenceId: completion.occurrenceId, target: completion.target, action: completion.action }) }} selecting={selecting} selected={selectedTasks.some((selected) => selected.id === task.id)} selectable={task.createdByUserId === currentUser?.id && (selectedIds.length < 500 || selectedIds.includes(task.id))} busy={busy} canInspect={Boolean(notifications.overrides[task.id]) || task.createdByUserId === currentUser?.id} canToggle={Boolean(state && task.createdByUserId === currentUser?.id && !task.isArchived && state.isRecipient && state.applicableKeys.length > 0)} actions={getActions(task)} onSelect={() => setSelectedIds((ids) => ids.includes(task.id) ? ids.filter((id) => id !== task.id) : ids.length < 500 ? [...ids, task.id] : ids)} onConfigure={() => setNotificationTaskId(task.id)} onToggle={() => toggleTaskNotifications(task)} />
						})}
					</div>
				</section>
			})}</div> : null}
			<details className='tasks-notification-help'><summary><TaskIcon name='bell' /><span>{t('taskAlerts.aboutAlerts')}</span><TaskIcon name='chevron' /></summary><div><p>{t('taskAlerts.listHelp')}</p><p>{t('taskAlerts.sharedWarning')}</p></div></details>
			{notificationTask && ready && notifications.preferences ? <Suspense fallback={null}><TaskNotificationsDialog key={notificationTask.id} task={notificationTask} preferences={notifications.preferences} value={notifications.overrides[notificationTask.id] ?? inheritedTaskNotifications(notificationTask.id)} canManage={notificationTask.createdByUserId === currentUser?.id && !notificationTask.isArchived} onSave={(value) => persistOverrides([value], t('taskAlerts.savedToast'))} onClose={() => setNotificationTaskId(null)} /></Suspense> : null}
		</div>
	)
}

function canEditTask(task: TaskItem, userId?: string, role?: string) {
	return task.createdByUserId === userId || role === 'Admin' && task.scope === 'House'
}
