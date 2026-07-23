import { useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { useToast } from '@/components/Toasts/useToast'
import { archiveTask, deleteTask, fetchTasks, restoreTask } from '@/store/features/tasks/tasksSlice'
import { fetchNow } from '@/store/features/now/nowSlice'
import { openTaskEditor } from '@/store/features/ui/uiSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { OccurrenceService } from '@/services'
import type { TaskItem } from '@/models/task'
import { formatScheduleTime } from '@/utils/scheduleTime'
import { setXp } from '@/store/features/xp/xpSlice'

type StatusFilter = 'active' | 'archived'
type SortMode = 'alphabetical' | 'createdDesc' | 'createdAsc'

export default function TasksPage() {
	const { t } = useI18n()
	const dispatch = useAppDispatch()
	const { showToast } = useToast()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const currentUser = useAppSelector((state) => state.auth.user)
	const tasks = useAppSelector((state) => state.tasks.items)
	const zones = useAppSelector((state) => state.zones.items.filter((zone) => !zone.isArchived))
	const loading = useAppSelector((state) => state.tasks.loading)
	const [status, setStatus] = useState<StatusFilter>('active')
	const [query, setQuery] = useState('')
	const [zoneId, setZoneId] = useState('')
	const [recurrence, setRecurrence] = useState('')
	const [sortMode, setSortMode] = useState<SortMode>('alphabetical')

	const markMissed = async (task: TaskItem) => {
		if (!accessToken || !task.occurrenceId) return
		try {
			await OccurrenceService.apply(accessToken, task.occurrenceId, 'missed')
			dispatch(fetchTasks())
			dispatch(fetchNow())
			showToast({ type: 'success', title: t('toasts.missed') })
		} catch {
			showToast({ type: 'error', title: t('toasts.error') })
		}
	}

	const completeEarly = async (task: TaskItem) => {
		const occurrence = task.upcomingOccurrence
		if (!accessToken || !occurrence || occurrence.status !== 'Pending') return
		try {
			const response = await OccurrenceService.completeEarly(accessToken, occurrence.id)
			if (response.userXp) {
				dispatch(setXp(response.userXp))
			}
			dispatch(fetchTasks())
			dispatch(fetchNow())
			showToast({ type: 'success', title: t('toasts.doneEarly') })
		} catch {
			showToast({ type: 'error', title: t('toasts.error') })
		}
	}

	const undoUpcoming = async (task: TaskItem) => {
		const occurrence = task.upcomingOccurrence
		if (!accessToken || !occurrence || !canUndoOccurrenceSummary(task, currentUser?.id, currentUser?.role)) return
		try {
			await OccurrenceService.undo(accessToken, occurrence.id)
			dispatch(fetchTasks())
			dispatch(fetchNow())
			showToast({ type: 'success', title: t('toasts.undone') })
		} catch {
			showToast({ type: 'error', title: t('toasts.error') })
		}
	}

	const undoOccurrence = async (task: TaskItem) => {
		if (!accessToken || !task.occurrenceId) return
		try {
			await OccurrenceService.undo(accessToken, task.occurrenceId)
			dispatch(fetchTasks())
			dispatch(fetchNow())
			showToast({ type: 'success', title: t('toasts.undone') })
		} catch {
			showToast({ type: 'error', title: t('toasts.error') })
		}
	}

	const visibleTasks = useMemo(() => tasks
		.filter((task) => status === 'archived' ? task.isArchived : !task.isArchived)
		.filter((task) => !zoneId || task.zoneId === zoneId)
		.filter((task) => !recurrence || task.schedule?.recurrenceType === recurrence)
		.filter((task) => task.title.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()))
		.sort((left, right) => sortMode === 'alphabetical'
			? left.title.localeCompare(right.title, 'es', { sensitivity: 'base' })
			: sortMode === 'createdDesc'
				? right.createdAt.localeCompare(left.createdAt)
			: left.createdAt.localeCompare(right.createdAt)), [query, recurrence, sortMode, status, tasks, zoneId])

	return (
		<div className='page-grid tasks-page'>
			<section className='tasks-toolbar' aria-label={t('tasks.title')}>
				<div className='tasks-status-tabs' role='tablist'>
					<button type='button' className={status === 'active' ? 'is-active' : undefined} onClick={() => setStatus('active')}>{t('tasks.active')}</button>
					<button type='button' className={status === 'archived' ? 'is-active' : undefined} onClick={() => setStatus('archived')}>{t('tasks.archived')}</button>
				</div>
				<label className='tasks-search'>
					<span>{t('tasks.search')}</span>
					<input aria-label={t('tasks.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
				</label>
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
			</section>

			{loading ? <p className='empty-state'>{t('common.loading')}</p> : null}
			{!loading && visibleTasks.length === 0 ? <p className='empty-state'>{t('tasks.empty')}</p> : null}
			{(['Overdue', 'Manual', 'Recurring'] as const).map((group) => {
				const groupTasks = visibleTasks.filter((task) => {
					const isOverdue = task.occurrenceStatus === 'Pending' && task.isOverdue === true
					return group === 'Overdue' ? isOverdue : !isOverdue && (group === 'Manual' ? task.schedule?.recurrenceType === 'Manual' : task.schedule?.recurrenceType !== 'Manual')
				})
				if (groupTasks.length === 0) return null
				return <section className='task-inventory-group' key={group} aria-label={group === 'Overdue' ? t('tasks.overdue') : group === 'Manual' ? t('tasks.oneOff') : t('tasks.recurring')}>
					<header><h2>{group === 'Overdue' ? t('tasks.overdue') : group === 'Manual' ? t('tasks.oneOff') : t('tasks.recurring')}</h2><span>{groupTasks.length}</span></header>
					<div className='task-inventory'>
						{groupTasks.map((task) => <TaskInventoryRow key={task.id} task={task} canEdit={task.createdByUserId === currentUser?.id} canAct={canActOnTask(task, currentUser?.id, currentUser?.role)} canUndo={canUndoOccurrence(task, currentUser?.id, currentUser?.role)} canUndoUpcoming={canUndoOccurrenceSummary(task, currentUser?.id, currentUser?.role)} onEdit={() => dispatch(openTaskEditor(task.id))} onMiss={() => void markMissed(task)} onUndo={() => void undoOccurrence(task)} onCompleteEarly={() => void completeEarly(task)} onUndoUpcoming={() => void undoUpcoming(task)} onArchive={() => dispatch(archiveTask(task.id))} onRestore={() => dispatch(restoreTask(task.id))} onDelete={() => {
							if (window.confirm(t('tasks.deleteConfirm'))) dispatch(deleteTask(task.id))
						}} />)}
					</div>
				</section>
			})}
		</div>
	)
}

function TaskInventoryRow({ task, canEdit, canAct, canUndo, canUndoUpcoming, onEdit, onMiss, onUndo, onCompleteEarly, onUndoUpcoming, onArchive, onRestore, onDelete }: { task: TaskItem; canEdit: boolean; canAct: boolean; canUndo: boolean; canUndoUpcoming: boolean; onEdit: () => void; onMiss: () => void; onUndo: () => void; onCompleteEarly: () => void; onUndoUpcoming: () => void; onArchive: () => void; onRestore: () => void; onDelete: () => void }) {
	const { t, formatDate } = useI18n()
	const schedule = task.schedule
	const recurrence = schedule ? getRecurrenceLabel(schedule.recurrenceType, schedule, t) : t('tasks.oneOff')
	const time = schedule?.recommendedTime ? ` · ${formatScheduleTime(schedule.recommendedTime, schedule.timeZoneId, schedule.startDate)}` : ''

	return (
		<article className='task-inventory__row'>
			<div className='task-inventory__main'>
				<strong>{task.title}</strong>
				<div className='task-inventory__meta'>
					<span>{recurrence}{time}</span>
					<span>{task.zoneName ?? t('quickCreate.noZone')}</span>
					{task.upcomingOccurrence ? <span className={task.upcomingOccurrence.status === 'Done' ? 'task-inventory__early' : 'task-inventory__upcoming'}>
						{task.upcomingOccurrence.status === 'Done' ? t('tasks.completedEarly') : `${t('tasks.nextOccurrence')} ${formatDate(new Date(`${task.upcomingOccurrence.date}T00:00:00`))}`}
					</span> : null}
					{task.occurrenceStatus === 'Pending' && task.isOverdue
						? <span className='task-inventory__overdue'>{t('tasks.notDone')} {formatDate(new Date(`${task.occurrenceDate}T00:00:00`))}</span>
						: null}
					{task.isArchived ? <span>{t('tasks.archivedLabel')}</span> : null}
				</div>
				<div className='task-inventory__history'>
					<span>{t('tasks.created')} {formatDate(new Date(task.createdAt))}</span>
					{task.occurrenceCompletedAt ? <span>{t('tasks.completed')} {new Date(task.occurrenceCompletedAt).toLocaleString()}</span> : null}
				</div>
			</div>
			<div className='task-inventory__actions'>
				{canEdit ? <button className='secondary-action task-action--compact' type='button' onClick={onEdit}>{t('tasks.edit')}</button> : null}
				{canAct && task.upcomingOccurrence?.status === 'Pending' ? <button className='secondary-action task-action--compact' type='button' onClick={onCompleteEarly}>{t('tasks.completeEarly')}</button> : null}
				{canUndoUpcoming && task.upcomingOccurrence?.status === 'Done' ? <button className='secondary-action task-action--compact' type='button' onClick={onUndoUpcoming}>{t('common.undo')}</button> : null}
				{canAct && task.occurrenceId && task.occurrenceStatus === 'Pending' && task.schedule?.recurrenceType !== 'TimesPerWeek' ? <button className='secondary-action task-action--compact' type='button' onClick={onMiss}>{t('now.miss')}</button> : null}
				{canUndo && task.occurrenceId && task.occurrenceStatus && task.occurrenceStatus !== 'Pending' ? <button className='secondary-action task-action--compact' type='button' onClick={onUndo}>{t('common.undo')}</button> : null}
				{canEdit ? (task.isArchived ? <button className='secondary-action task-action--compact' type='button' onClick={onRestore}>{t('tasks.restore')}</button> : <button className='link-action task-action--compact' type='button' onClick={onArchive}>{t('tasks.archive')}</button>) : null}
				{canEdit ? <button className='danger-action task-action--compact' type='button' onClick={onDelete}>{t('tasks.delete')}</button> : null}
			</div>
		</article>
	)
}

function canActOnTask(task: TaskItem, userId?: string, role?: string) {
	if (!userId) return false
	if (task.scope === 'Personal') return task.createdByUserId === userId
	return role === 'Admin' || task.assignmentMode === 'Anyone' || task.assigneeIds.includes(userId)
}

function canUndoOccurrence(task: TaskItem, userId?: string, role?: string) {
	if (!userId || !task.occurrenceCompletedByUserId) return false
	return task.occurrenceCompletedByUserId === userId || role === 'Admin' && task.scope === 'House'
}

function canUndoOccurrenceSummary(task: TaskItem, userId?: string, role?: string) {
	const occurrence = task.upcomingOccurrence
	if (!occurrence) return false
	if (!userId || !occurrence.completedByUserId) return false
	return occurrence.completedByUserId === userId || role === 'Admin' && task.scope === 'House'
}

function getRecurrenceLabel(type: string, schedule: NonNullable<TaskItem['schedule']>, t: (key: string) => string) {
	if (type === 'Daily') return t('tasks.daily')
	if (type === 'Weekday') return replace(t('tasks.weekday'), t(`weekdays.${schedule.weekday ?? 0}`).toLocaleLowerCase())
	if (type === 'TimesPerWeek') return replace(t('tasks.timesPerWeek'), String(schedule.timesPerWeek ?? 0))
	if (type === 'EveryNDays') return replace(t('tasks.everyNDays'), String(schedule.everyNDays ?? 0))
	if (type === 'EveryNWeeks') return replace(t('quickCreate.everyNWeeks'), String(schedule.interval ?? 0))
	if (type === 'Monthly') return t('quickCreate.monthlyDay')
	if (type === 'EveryNMonths') return replace(t('quickCreate.everyNMonths'), String(schedule.interval ?? 0))
	if (type === 'EveryNYears') return replace(t('quickCreate.everyNYears'), String(schedule.interval ?? 0))
	if (type === 'MonthlyOrdinalWeekday') return `${t(`quickCreate.ordinal.${schedule.weekOfMonth ?? 1}`)} ${t(`weekdays.${schedule.weekday ?? 0}`)}`
	return t('tasks.oneOff')
}

function replace(template: string, value: string) {
	return template.replace('{day}', value).replace('{count}', value).replace('X', value)
}
