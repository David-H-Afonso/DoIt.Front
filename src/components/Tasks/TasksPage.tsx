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

type StatusFilter = 'active' | 'archived'
type SortMode = 'alphabetical' | 'createdDesc' | 'createdAsc'

export default function TasksPage() {
	const { t } = useI18n()
	const dispatch = useAppDispatch()
	const { showToast } = useToast()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
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
					const isOverdue = task.occurrenceStatus === 'Pending' && Boolean(task.occurrenceDate && task.occurrenceDate < new Date().toISOString().slice(0, 10))
					return group === 'Overdue' ? isOverdue : !isOverdue && (group === 'Manual' ? task.schedule?.recurrenceType === 'Manual' : task.schedule?.recurrenceType !== 'Manual')
				})
				if (groupTasks.length === 0) return null
				return <section className='task-inventory-group' key={group} aria-label={group === 'Overdue' ? t('tasks.overdue') : group === 'Manual' ? t('tasks.oneOff') : t('tasks.recurring')}>
					<header><h2>{group === 'Overdue' ? t('tasks.overdue') : group === 'Manual' ? t('tasks.oneOff') : t('tasks.recurring')}</h2><span>{groupTasks.length}</span></header>
					<div className='task-inventory'>
						{groupTasks.map((task) => <TaskInventoryRow key={task.id} task={task} onEdit={() => dispatch(openTaskEditor(task.id))} onMiss={() => void markMissed(task)} onUndo={() => void undoOccurrence(task)} onArchive={() => dispatch(archiveTask(task.id))} onRestore={() => dispatch(restoreTask(task.id))} onDelete={() => {
							if (window.confirm(t('tasks.deleteConfirm'))) dispatch(deleteTask(task.id))
						}} />)}
					</div>
				</section>
			})}
		</div>
	)
}

function TaskInventoryRow({ task, onEdit, onMiss, onUndo, onArchive, onRestore, onDelete }: { task: TaskItem; onEdit: () => void; onMiss: () => void; onUndo: () => void; onArchive: () => void; onRestore: () => void; onDelete: () => void }) {
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
					{task.occurrenceStatus === 'Pending' && task.occurrenceDate && task.occurrenceDate < new Date().toISOString().slice(0, 10)
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
				<button className='secondary-action task-action--compact' type='button' onClick={onEdit}>{t('tasks.edit')}</button>
				{task.occurrenceId && task.occurrenceStatus === 'Pending' ? <button className='secondary-action task-action--compact' type='button' onClick={onMiss}>{t('now.miss')}</button> : null}
				{task.occurrenceId && task.occurrenceStatus && task.occurrenceStatus !== 'Pending' ? <button className='secondary-action task-action--compact' type='button' onClick={onUndo}>{t('common.undo')}</button> : null}
				{task.isArchived ? <button className='secondary-action task-action--compact' type='button' onClick={onRestore}>{t('tasks.restore')}</button> : <button className='link-action task-action--compact' type='button' onClick={onArchive}>{t('tasks.archive')}</button>}
				<button className='danger-action task-action--compact' type='button' onClick={onDelete}>{t('tasks.delete')}</button>
			</div>
		</article>
	)
}

function getRecurrenceLabel(type: string, schedule: NonNullable<TaskItem['schedule']>, t: (key: string) => string) {
	if (type === 'Daily') return t('tasks.daily')
	if (type === 'Weekday') return replace(t('tasks.weekday'), t(`weekdays.${schedule.weekday ?? 0}`).toLocaleLowerCase())
	if (type === 'TimesPerWeek') return replace(t('tasks.timesPerWeek'), String(schedule.timesPerWeek ?? 0))
	if (type === 'EveryNDays') return replace(t('tasks.everyNDays'), String(schedule.everyNDays ?? 0))
	if (type === 'MonthlyOrdinalWeekday') return `${t(`quickCreate.ordinal.${schedule.weekOfMonth ?? 1}`)} ${t(`weekdays.${schedule.weekday ?? 0}`)}`
	return t('tasks.oneOff')
}

function replace(template: string, value: string) {
	return template.replace('{day}', value).replace('{count}', value)
}
