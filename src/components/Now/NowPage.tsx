import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import type { NowProgress, NowTask, NowZone, OccurrenceAction } from '@/models/now'
import { OccurrenceService } from '@/services'
import { useToast } from '@/components/Toasts/useToast'
import { applyOccurrenceStatus, fetchNow, restoreNowSnapshot } from '@/store/features/now/nowSlice'
import { fetchTasks } from '@/store/features/tasks/tasksSlice'
import { setXp } from '@/store/features/xp/xpSlice'
import { openTaskEditor } from '@/store/features/ui/uiSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { formatScheduleTime } from '@/utils/scheduleTime'

type PendingAction = OccurrenceAction | 'undo'

export default function NowPage() {
	const { t, formatDate } = useI18n()
	const { date, zones, upcoming, loading, error, scope } = useAppSelector((state) => state.now)
	const displayZones = mergeUpcoming(zones, upcoming ?? [])
	const visibleZones = displayZones.filter((zone) => zone.overdue.length > 0 || zone.available.length > 0 || zone.unavailable.length > 0 || (zone.completed?.length ?? 0) > 0)
	const visibleTasks = visibleZones.flatMap((zone) => [...zone.overdue, ...zone.available, ...zone.unavailable, ...(zone.completed ?? [])])
	const actionablePending = visibleTasks.filter((task) => task.occurrenceStatus === 'Pending').length

	const currentDate = date ? new Date(`${date}T00:00:00`) : new Date()

	return (
		<div className='page-grid page-grid--now'>
			<section className='now-focus' aria-label={t('now.progressLabel')}>
				<div>
					<span className='eyebrow'>{t('now.today')}</span>
					<h1>{formatDate(currentDate)}</h1>
				</div>
				<div className='now-focus__count'>
					<strong>{loading ? '—' : actionablePending}</strong>
					<span>{t('now.pending')}</span>
				</div>
			</section>

			{error ? <div className='form-error'>{error}</div> : null}
			{!loading && visibleZones.length === 0 ? <p className='empty-state'>{t('now.empty')}</p> : null}

			<section className='zone-list'>
				{scope === 'me' ? <FlatTaskList tasks={visibleTasks} /> : visibleZones.map((zone) => <NowZoneSection key={zone.zoneId ?? 'general'} zone={zone} showCompleted />)}
			</section>

		</div>
	)
}

export function NowZoneSection({ zone, showOpenLink = true, showCompleted = false, showHeader = true }: { zone: NowZone; showOpenLink?: boolean; showCompleted?: boolean; showHeader?: boolean }) {
	const { t } = useI18n()
	const target = zone.zoneId ? `/zones/${zone.zoneId}` : '/zones'

	return (
		<section className='zone-panel' aria-labelledby={`zone-${zone.zoneId ?? 'general'}`}>
			{showHeader ? <header className='zone-panel__header'>
				<div>
					<h2 id={`zone-${zone.zoneId ?? 'general'}`}>{zone.zoneName}</h2>
				</div>
				{showOpenLink ? <Link to={target}>{t('zones.open')}</Link> : null}
			</header> : null}

			<TaskSection title={t('now.sections.available')} tasks={zone.available} tone='available' />
			<TaskSection title={t('now.sections.overdue')} tasks={zone.overdue} tone='overdue' />
			<TaskSection title={t('now.sections.unavailable')} tasks={zone.unavailable} tone='unavailable' />
			{showCompleted ? <TaskSection title={t('now.sections.completed')} tasks={zone.completed ?? []} tone='completed' /> : null}
		</section>
	)
}

export function TaskSection({ title, tasks, tone }: { title: string; tasks: NowTask[]; tone: NowTask['status'] }) {
	if (tasks.length === 0) {
		return null
	}

	return (
		<div className={`task-section task-section--${tone}`}>
			<h3>{title}</h3>
			{[...tasks].sort(compareTasks).map((task) => (
				<NowTaskCard key={task.id} task={task} tone={tone} />
			))}
		</div>
	)
}

function FlatTaskList({ tasks }: { tasks: NowTask[] }) {
	return <div className='zone-panel now-flat-list'>
		{[...tasks].sort(compareTasks).map((task) => <NowTaskCard key={task.occurrenceId} task={task} tone={getTaskTone(task)} />)}
	</div>
}

export function NowTaskCard({ task, tone }: { task: NowTask; tone: NowTask['status'] }) {
	const { t } = useI18n()
	const dispatch = useAppDispatch()
	const { showToast } = useToast()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const currentUser = useAppSelector((state) => state.auth.user)
	const zones = useAppSelector((state) => state.now.zones)
	const progress = useAppSelector((state) => state.now.progress)
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
	const timeLabel = getTimeLabel(task, t)
	const isCompleted = tone === 'completed'
	const isFuture = tone === 'unavailable' || tone === 'upcoming'
	const canUndo = isCompleted && Boolean(currentUser && (task.completedByUserId === currentUser.id || currentUser.role === 'Admin' && task.scope === 'House'))

	const applyAction = async (action: OccurrenceAction) => {
			if (!accessToken || pendingAction) {
			return
		}

		const previous = cloneSnapshot({ zones, progress })
		const status = actionToStatus(action)
		setPendingAction(action)
		dispatch(applyOccurrenceStatus({ occurrenceId: task.occurrenceId, status }))

		try {
			const response = await OccurrenceService.apply(accessToken, task.occurrenceId, action)
			if (response.userXp) {
				dispatch(setXp(response.userXp))
			}
			dispatch(fetchTasks())
			dispatch(fetchNow())
			showToast({
				type: 'success',
				title: response.xpEarned > 0 ? `${t(`toasts.${action}`)} +${response.xpEarned} XP` : t(`toasts.${action}`),
				actionLabel: t('common.undo'),
				onAction: async () => {
					dispatch(restoreNowSnapshot(previous))
					try {
						const undoResponse = await OccurrenceService.undo(accessToken, task.occurrenceId)
						if (undoResponse.userXp) {
							dispatch(setXp(undoResponse.userXp))
						}
						dispatch(fetchTasks())
						dispatch(fetchNow())
					} catch {
						showToast({ type: 'error', title: t('toasts.error') })
						dispatch(fetchNow())
					}
				},
			})
		} catch {
			dispatch(restoreNowSnapshot(previous))
			showToast({ type: 'error', title: t('toasts.error') })
		} finally {
			setPendingAction(null)
		}
	}

	const undo = async () => {
		if (!accessToken || pendingAction || !canUndo) return
		setPendingAction('undo')
		try {
			const response = await OccurrenceService.undo(accessToken, task.occurrenceId)
			if (response.userXp) dispatch(setXp(response.userXp))
			dispatch(fetchTasks())
			dispatch(fetchNow())
			showToast({ type: 'success', title: t('toasts.undone') })
		} catch {
			showToast({ type: 'error', title: t('toasts.error') })
		} finally {
			setPendingAction(null)
		}
	}

	return (
		<article className={`task-row task-row--${tone}`}>
			<button className={`task-check${isCompleted ? ' task-check--completed' : ''}`} type='button' disabled={isFuture || isCompleted || pendingAction !== null} onClick={() => applyAction('done')}>
				<span>{pendingAction === 'done' ? t('common.loading') : isCompleted ? t('now.status.completed') : tone === 'unavailable' ? t(`now.status.${tone}`) : t('now.complete')}</span>
			</button>
			<button className='task-row__main task-row__open' type='button' onClick={() => dispatch(openTaskEditor(task.id))}>
				<strong>{task.title}</strong>
				<span>{timeLabel}</span>
			</button>
			{isFuture ? null : isCompleted ? <div className='task-secondary-actions task-secondary-actions--completed'>
				<span className='task-completed-state'>{task.completionTiming === 'Early' ? t('now.doneEarly') : t('now.status.completed')}</span>
				{canUndo ? <button className='secondary-action task-action task-action--compact' type='button' disabled={pendingAction !== null} onClick={() => void undo()}>{pendingAction === 'undo' ? t('common.loading') : t('common.undo')}</button> : null}
				{task.completionTiming === 'Early' ? <button className='secondary-action task-action task-action--compact' type='button' disabled={pendingAction !== null} onClick={() => applyAction('notApplicable')}>{t('now.notApplicable')}</button> : null}
			</div> : <div className='task-secondary-actions'>
				{task.recurrenceType !== 'TimesPerWeek' ? <button className='secondary-action task-action task-action--compact' type='button' disabled={pendingAction !== null} onClick={() => applyAction('missed')}>
					{t('now.miss')}
				</button> : null}
				<button className='secondary-action task-action task-action--compact' type='button' disabled={pendingAction !== null} onClick={() => applyAction('notApplicable')}>
					{task.recurrenceType === 'TimesPerWeek' ? t('now.notToday') : t('now.notApplicable')}
				</button>
			</div>}
		</article>
	)
}

function actionToStatus(action: OccurrenceAction) {
	return action === 'done' ? 'Done' : action === 'missed' ? 'Missed' : 'NotApplicable'
}

function cloneSnapshot(snapshot: { zones: NowZone[]; progress: NowProgress }) {
	return JSON.parse(JSON.stringify(snapshot)) as { zones: NowZone[]; progress: NowProgress }
}

function getTimeLabel(task: NowTask, t: (key: string) => string) {
	if (task.occurrenceDate && task.occurrenceDate > new Date().toISOString().slice(0, 10)) {
		const time = task.recommendedTime ?? task.availableFromTime
		return `${t('now.scheduledFor')} ${new Date(`${task.occurrenceDate}T00:00:00`).toLocaleDateString()}${time ? ` · ${formatScheduleTime(time, task.timeZoneId)}` : ''}`
	}
	if (task.completionTiming === 'Early') {
		return t('now.doneEarly')
	}
	if (task.status === 'unavailable' && task.availableFromTime) {
		return `${t('now.availableAt')} ${formatScheduleTime(task.availableFromTime, task.timeZoneId)}`
	}
	if (task.status === 'upcoming') {
		return task.occurrenceDate ? `${t('now.scheduledFor')} ${new Date(`${task.occurrenceDate}T00:00:00`).toLocaleDateString()}` : t('now.upcomingTitle')
	}
	if (task.status === 'overdue' && task.availableUntilTime) {
		return `${t('now.overdueSince')} ${formatScheduleTime(task.availableUntilTime, task.timeZoneId)}`
	}
	if (task.recommendedTime) {
		return `${t('now.recommendedAt')} ${formatScheduleTime(task.recommendedTime, task.timeZoneId)}`
	}
	if (task.scope === 'House') {
		return getAssignmentLabel(task, t)
	}
	return task.zoneName ?? task.scope
}

function compareTasks(left: NowTask, right: NowTask) {
	const leftTone = getTaskTone(left)
	const rightTone = getTaskTone(right)
	const leftStatusRank = leftTone === 'available' ? 0 : leftTone === 'overdue' ? 1 : leftTone === 'completed' ? 3 : 2
	const rightStatusRank = rightTone === 'available' ? 0 : rightTone === 'overdue' ? 1 : rightTone === 'completed' ? 3 : 2
	if (leftStatusRank !== rightStatusRank) return leftStatusRank - rightStatusRank
	const leftRank = left.recurrenceType === 'Manual' ? 2 : left.recommendedTime || left.availableFromTime || left.availableUntilTime ? 0 : 1
	const rightRank = right.recurrenceType === 'Manual' ? 2 : right.recommendedTime || right.availableFromTime || right.availableUntilTime ? 0 : 1
	if (leftRank !== rightRank) return leftRank - rightRank
	const leftTime = timeToMinutes(sortTime(left))
	const rightTime = timeToMinutes(sortTime(right))
	if (leftTime !== rightTime) return leftTime - rightTime
	return left.title.localeCompare(right.title, 'es', { sensitivity: 'base' })
}

function getTaskTone(task: NowTask): NowTask['status'] {
	return task.occurrenceStatus === 'Pending' ? task.status : 'completed'
}

function sortTime(task: NowTask) {
	return task.status === 'unavailable' || task.status === 'upcoming'
		? task.availableFromTime ?? task.recommendedTime ?? task.availableUntilTime
		: task.recommendedTime ?? task.availableFromTime ?? task.availableUntilTime
}

function timeToMinutes(value?: string | null) {
	if (!value) return Number.MAX_SAFE_INTEGER
	const [hours, minutes] = value.split(':').map(Number)
	return hours * 60 + minutes
}

function mergeUpcoming(zones: NowZone[], upcoming: NowTask[]): NowZone[] {
	const merged = zones.map((zone) => ({ ...zone, unavailable: [...zone.unavailable] }))
	const currentTaskIds = new Set(merged.flatMap((zone) => [...zone.overdue, ...zone.available, ...zone.unavailable].map((task) => task.id)))
	for (const task of upcoming) {
		if (currentTaskIds.has(task.id)) {
			continue
		}
		let zone = merged.find(candidate => candidate.zoneId === task.zoneId)
		if (!zone) {
			zone = {
				zoneId: task.zoneId,
				zoneName: task.zoneName ?? 'General',
				progress: { total: 0, done: 0, missed: 0, notApplicable: 0, pending: 0 },
				overdue: [],
				available: [],
				unavailable: [],
				completed: [],
			}
			merged.push(zone)
		}
		zone.unavailable.push({ ...task, status: 'unavailable' })
	}
	return merged
}

function getAssignmentLabel(task: NowTask, t: (key: string) => string) {
	if (task.assignmentMode === 'Anyone') {
		return t('assignment.anyone')
	}
	if (task.assigneeNames.length > 0) {
		return task.assigneeNames.join(', ')
	}
	return t('assignment.assigned')
}
