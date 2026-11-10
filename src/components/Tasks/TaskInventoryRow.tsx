import { useId } from 'react'
import { useI18n } from '@/i18n'
import type { TaskItem } from '@/models/task'
import { getTaskNotificationState } from '@/utils/taskNotifications'
import { formatInstant, formatScheduleTime } from '@/utils/scheduleTime'
import TaskIcon from './TaskIcon'
import TaskActionsMenu, { type TaskMenuAction } from './TaskActionsMenu'
import TaskCompletionToggle from './TaskCompletionToggle'
import type { TaskCompletionControl } from '@/utils/taskCompletion'

type Props = {
	task: TaskItem
	notificationState?: ReturnType<typeof getTaskNotificationState>
	completion: TaskCompletionControl
	completionBusy: boolean
	onComplete: () => void
	selecting: boolean
	selected: boolean
	selectable: boolean
	busy: boolean
	canToggle: boolean
	canInspect: boolean
	actions: TaskMenuAction[]
	onSelect: () => void
	onConfigure: () => void
	onToggle: () => void
}

export default function TaskInventoryRow({ task, notificationState, completion, completionBusy, onComplete, selecting, selected, selectable, busy, canToggle, canInspect, actions, onSelect, onConfigure, onToggle }: Props) {
	const { locale, t, formatDate } = useI18n()
	const metadataId = useId()
	const statusId = useId()
	const schedule = task.schedule
	const recurrence = schedule ? getRecurrenceLabel(schedule.recurrenceType, schedule, t) : t('tasks.oneOff')
	const time = schedule?.recommendedTime ? ` · ${formatScheduleTime(schedule.recommendedTime, schedule.timeZoneId, schedule.startDate)}` : ''
	const enabled = notificationState?.enabled
	const editAction = actions.find((action) => action.icon === 'edit')
	const reason = notificationState ? t(`taskAlerts.reason.${notificationState.reason}`) : t('taskAlerts.checking')
	const stateLabel = t(notificationState ? enabled ? 'taskAlerts.on' : 'taskAlerts.off' : 'taskAlerts.unknown')
	const statusContent = <><TaskIcon name={enabled ? 'bell' : 'bell-off'} /><span id={statusId}><strong>{stateLabel}</strong><small className={notificationState?.reason === 'defaults' ? 'task-sr-only' : undefined}>{reason}</small></span></>
	const mainContent = <><strong>{task.title}</strong><span id={metadataId} className='task-inventory__meta'>
		{schedule?.recurrenceType !== 'Manual' || time ? <span>{recurrence}{time}</span> : null}
		{task.zoneName ? <span>{task.zoneName}</span> : null}
		{task.scope === 'House' ? <span className='task-inventory__scope'>{t('taskAlerts.sharedTask')}</span> : null}
		{task.upcomingOccurrence ? <span className={task.upcomingOccurrence.status === 'Done' ? 'task-inventory__early' : 'task-inventory__upcoming'} title={`${t('tasks.nextOccurrence')} ${formatDate(new Date(`${task.upcomingOccurrence.date}T00:00:00`))}`}>{task.upcomingOccurrence.status === 'Done' ? t('tasks.completedEarly') : <>{t('taskAlerts.nextShort')} <time dateTime={task.upcomingOccurrence.date}>{shortDate(task.upcomingOccurrence.date, locale)}</time></>}</span> : null}
		{task.occurrenceStatus === 'Pending' && task.isOverdue && task.occurrenceDate ? <span className='task-inventory__overdue' title={`${t('tasks.notDone')} ${formatDate(new Date(`${task.occurrenceDate}T00:00:00`))}`}>{t('taskAlerts.pendingShort')} <time dateTime={task.occurrenceDate}>{shortDate(task.occurrenceDate, locale)}</time></span> : null}
		{task.occurrenceCompletedAt ? <span className='task-inventory__completed' title={formatInstant(task.occurrenceCompletedAt, task.schedule?.timeZoneId, locale)}>{t('tasks.completed')} {formatInstant(task.occurrenceCompletedAt, task.schedule?.timeZoneId, locale, true)}</span> : null}
		{completion.action === 'early' ? <span className='task-inventory__completion-hint'>{t('taskActions.earlyHint')}</span> : null}
		{completion.state === 'partial' ? <span className='task-inventory__completion-hint'>{t('taskActions.partPending')}</span> : null}
		{completion.reason === 'unavailable' ? <span>{t('now.availableAt')} {formatScheduleTime(schedule?.availableFromTime, schedule?.timeZoneId, task.occurrenceDate)}</span> : null}
	</span></>

	return <article className={`task-inventory__row${selecting ? ' is-selecting' : ''}${selected ? ' is-selected' : ''}${completion.state === 'done' ? ' is-completed' : ''}`} aria-label={task.title}>
		{selecting ? <label className='task-selection-checkbox'><input type='checkbox' checked={selected} disabled={!selectable || busy} aria-label={t('taskAlerts.selectTask').replace('{title}', task.title)} onChange={onSelect} /></label> : <TaskCompletionToggle task={task} control={completion} busy={completionBusy} onToggle={onComplete} />}
		{editAction ? <button className='task-inventory__main task-inventory__main--editable' type='button' onClick={editAction.onSelect} aria-label={t('taskAlerts.editTask').replace('{title}', task.title)} aria-describedby={metadataId}>{mainContent}</button> : <div className='task-inventory__main'>{mainContent}</div>}
		<div className='task-inventory__notifications'>
			{notificationState && canInspect ? <button className={`task-alert-status${enabled ? ' is-on' : ''}`} type='button' disabled={busy} aria-label={t('taskAlerts.configureTask').replace('{title}', task.title)} aria-describedby={statusId} title={`${stateLabel} · ${reason}`} aria-haspopup='dialog' onClick={onConfigure}>{statusContent}<TaskIcon name='chevron' /></button> : <div className='task-alert-status'>{statusContent}</div>}
			{canToggle ? <button className={`task-quick-toggle${enabled ? '' : ' is-off'}`} type='button' disabled={busy} aria-label={t(enabled ? 'taskAlerts.muteTask' : 'taskAlerts.enableTask').replace('{title}', task.title)} title={task.scope === 'House' ? t('taskAlerts.sharedWarning') : undefined} onClick={onToggle}><span>{t(busy ? 'common.loading' : task.scope === 'House' ? enabled ? 'taskAlerts.muteShared' : 'taskAlerts.enableShared' : enabled ? 'taskAlerts.mute' : 'taskAlerts.enable')}</span></button> : null}
		</div>
		<TaskActionsMenu title={task.title} actions={actions} footer={`${t('tasks.created')} ${formatDate(new Date(task.createdAt))}`} />
	</article>
}

function shortDate(value: string, locale: string) {
	const date = new Date(`${value}T00:00:00`)
	return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}) }).format(date)
}

function getRecurrenceLabel(type: string, schedule: NonNullable<TaskItem['schedule']>, t: (key: string) => string) {
	if (type === 'Daily') return t('tasks.daily')
	if (type === 'Weekday') return t('tasks.weekday').replace('{day}', t(`weekdays.${schedule.weekday ?? 0}`).toLocaleLowerCase())
	if (type === 'TimesPerWeek') return t('tasks.timesPerWeek').replace('{count}', String(schedule.timesPerWeek ?? 0))
	if (type === 'EveryNDays') return t('tasks.everyNDays').replace('{count}', String(schedule.everyNDays ?? 0))
	if (type === 'EveryNWeeks') return t('quickCreate.everyNWeeks').replace('X', String(schedule.interval ?? 0))
	if (type === 'Monthly') return t('quickCreate.monthlyDay')
	if (type === 'EveryNMonths') return t('quickCreate.everyNMonths').replace('X', String(schedule.interval ?? 0))
	if (type === 'EveryNYears') return t('quickCreate.everyNYears').replace('X', String(schedule.interval ?? 0))
	if (type === 'MonthlyOrdinalWeekday') return `${t(`quickCreate.ordinal.${schedule.weekOfMonth ?? 1}`)} ${t(`weekdays.${schedule.weekday ?? 0}`)}`
	return t('tasks.oneOff')
}
