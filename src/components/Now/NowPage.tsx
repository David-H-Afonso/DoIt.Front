import { useEffect, useState } from 'react'
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

export default function NowPage() {
	const { t, formatDate } = useI18n()
	const dispatch = useAppDispatch()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const { date, zones, progress, loading, error, scope } = useAppSelector((state) => state.now)

	useEffect(() => {
		if (accessToken) {
			dispatch(fetchNow())
		}
	}, [accessToken, dispatch, scope])

	const currentDate = date ? new Date(`${date}T00:00:00`) : new Date()

	return (
		<div className='page-grid page-grid--now'>
			<section className='now-focus' aria-label={t('now.progressLabel')}>
				<div>
					<span className='eyebrow'>{t('now.today')}</span>
					<h1>{formatDate(currentDate)}</h1>
				</div>
				<div className='now-focus__count'>
					<strong>{loading ? '—' : progress.pending}</strong>
					<span>{t('now.pending')}</span>
				</div>
			</section>

			{error ? <div className='form-error'>{error}</div> : null}
			{!loading && zones.length === 0 ? <p className='empty-state'>{t('now.empty')}</p> : null}

			<section className='zone-list'>
				{zones.map((zone) => (
					<NowZoneSection key={zone.zoneId ?? 'general'} zone={zone} />
				))}
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

			<TaskSection title={t('now.sections.overdue')} tasks={zone.overdue} tone='overdue' />
			<TaskSection title={t('now.sections.available')} tasks={zone.available} tone='available' />
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
			{tasks.map((task) => (
				<NowTaskCard key={task.id} task={task} tone={tone} />
			))}
		</div>
	)
}

export function NowTaskCard({ task, tone }: { task: NowTask; tone: NowTask['status'] }) {
	const { t } = useI18n()
	const dispatch = useAppDispatch()
	const { showToast } = useToast()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const zones = useAppSelector((state) => state.now.zones)
	const progress = useAppSelector((state) => state.now.progress)
	const [pendingAction, setPendingAction] = useState<OccurrenceAction | null>(null)
	const timeLabel = getTimeLabel(task, t)
	const isCompleted = tone === 'completed'

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

	return (
		<article className={`task-row task-row--${tone}`}>
			<button className={`task-check${isCompleted ? ' task-check--completed' : ''}`} type='button' disabled={tone === 'unavailable' || isCompleted || pendingAction !== null} onClick={() => applyAction('done')}>
				<span>{pendingAction === 'done' ? t('common.loading') : isCompleted ? t('now.status.completed') : tone === 'unavailable' ? t(`now.status.${tone}`) : t('now.complete')}</span>
			</button>
			<button className='task-row__main task-row__open' type='button' onClick={() => dispatch(openTaskEditor(task.id))}>
				<strong>{task.title}</strong>
				<span>{timeLabel}</span>
			</button>
			{isCompleted ? <span className='task-completed-state'>{t('now.status.completed')}</span> : <div className='task-secondary-actions'>
				<button className='secondary-action task-action task-action--compact' type='button' disabled={pendingAction !== null} onClick={() => applyAction('missed')}>
					{t('now.miss')}
				</button>
				<button className='secondary-action task-action task-action--compact' type='button' disabled={pendingAction !== null} onClick={() => applyAction('notApplicable')}>
					{t('now.notApplicable')}
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
	if (task.status === 'unavailable' && task.availableFromTime) {
		return `${t('now.availableAt')} ${formatScheduleTime(task.availableFromTime, task.timeZoneId)}`
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

function getAssignmentLabel(task: NowTask, t: (key: string) => string) {
	if (task.assignmentMode === 'Anyone') {
		return t('assignment.anyone')
	}
	if (task.assigneeNames.length > 0) {
		return task.assigneeNames.join(', ')
	}
	return t('assignment.assigned')
}
