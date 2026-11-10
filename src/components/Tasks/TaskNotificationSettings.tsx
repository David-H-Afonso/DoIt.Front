import { useId } from 'react'
import { useI18n } from '@/i18n'
import type { NotificationPreferences, TaskNotificationOverride } from '@/models/notifications'
import type { TaskItem } from '@/models/task'
import { getApplicableNotificationKeys, getTaskNotificationState, hasTaskNotificationOverride, inheritedTaskNotifications, setAllTaskNotifications, taskNotificationKeys, taskNotificationLabels, type TaskNotificationKey } from '@/utils/taskNotifications'
import { formatScheduleTime } from '@/utils/scheduleTime'
import { useAppSelector } from '@/store/hooks'
import TaskIcon from './TaskIcon'
import './TaskNotifications.scss'

type Props = {
	task: TaskItem
	preferences: NotificationPreferences
	value: TaskNotificationOverride
	onChange: (value: TaskNotificationOverride) => void
	readOnly?: boolean
	busy?: boolean
}

export default function TaskNotificationSettings({ task, preferences, value, onChange, readOnly = false, busy = false }: Props) {
	const { t } = useI18n()
	const userId = useAppSelector((state) => state.auth.user?.id)
	const titleId = useId()
	const state = getTaskNotificationState(task, preferences, value, userId)
	const applicableKeys = getApplicableNotificationKeys(task)
	const canToggle = !readOnly && !busy && applicableKeys.length > 0 && !task.isArchived
	const configuredOn = applicableKeys.some((key) => value[key] ?? preferences[key])
	const time = (key: TaskNotificationKey) => {
		const schedule = task.schedule
		if (key === 'taskCompletedEnabled') return t(task.scope === 'House' ? 'taskAlerts.whenSomeoneCompletes' : 'taskAlerts.onlySharedTasks')
		if (!applicableKeys.includes(key)) return t(key === 'recommendedEnabled' ? 'taskAlerts.needsRecommendedTime' : key === 'availableFromEnabled' ? 'taskAlerts.needsStartTime' : 'taskAlerts.needsEndTime')
		if (key === 'beforeAvailableUntilEnabled') return t('taskAlerts.minutesBefore').replace('{minutes}', String(value.beforeAvailableUntilMinutes ?? preferences.beforeAvailableUntilMinutes))
		const rawTime = key === 'availableFromEnabled' ? schedule?.availableFromTime : key === 'recommendedEnabled' ? schedule?.recommendedTime : schedule?.availableUntilTime
		return formatScheduleTime(rawTime, schedule?.timeZoneId, schedule?.startDate)
	}

	return <section className='task-notification-settings' aria-labelledby={titleId}>
		<div className={`task-notification-summary${state.enabled ? ' is-on' : ''}`}>
			<span className='task-notification-summary__icon'><TaskIcon name={state.enabled ? 'bell' : 'bell-off'} /></span>
			<div><strong id={titleId}>{t(state.enabled ? 'taskAlerts.on' : 'taskAlerts.off')}</strong><span>{t(`taskAlerts.reason.${state.reason}`)}</span></div>
			<button className='task-text-button' type='button' disabled={!canToggle} onClick={() => onChange(setAllTaskNotifications(value, !configuredOn))}>{t(configuredOn ? 'taskAlerts.muteAll' : 'taskAlerts.enable')}</button>
		</div>
		{task.scope === 'House' ? <p className='task-notification-shared'><TaskIcon name='bell' /><span>{t('taskAlerts.sharedWarning')}</span></p> : null}
		{readOnly ? <p className='task-notification-readonly'>{t(task.isArchived ? 'taskAlerts.archivedReadOnly' : 'taskAlerts.ownerOnly')}</p> : null}
		<fieldset className='task-notification-events' disabled={readOnly || busy}>
			<legend>{t('taskAlerts.whenToNotify')}</legend>
			{taskNotificationKeys.map((key) => {
				const applicable = applicableKeys.includes(key)
				const enabled = value[key] ?? preferences[key]
				return <label className={`task-notification-event${!applicable ? ' is-unavailable' : ''}`} key={key}>
					<span className='task-notification-event__copy'><strong>{t(taskNotificationLabels[key])}</strong><span className='task-notification-event__details'><span>{time(key)}</span>{applicable ? <small>{value[key] === null ? `${t('taskAlerts.fromDefaults')}: ${t(enabled ? 'notifications.overrideOn' : 'notifications.overrideOff')}` : t('taskAlerts.customSetting')}</small> : null}</span></span>
					<span className='task-switch'><input type='checkbox' role='switch' aria-label={t(taskNotificationLabels[key])} checked={applicable && enabled} disabled={!applicable} onChange={(event) => onChange({ ...value, [key]: event.target.checked })} /><span aria-hidden='true' /></span>
				</label>
			})}
			{applicableKeys.includes('beforeAvailableUntilEnabled') ? <label className='task-notification-offset'>
				<span><strong>{t('notifications.beforeAvailableUntilMinutes')}</strong><small>{t('taskAlerts.defaultMinutes').replace('{minutes}', String(preferences.beforeAvailableUntilMinutes))}</small></span>
				<span><input aria-label={t('notifications.beforeAvailableUntilMinutes')} type='number' min='0' max='1440' placeholder={String(preferences.beforeAvailableUntilMinutes)} value={value.beforeAvailableUntilMinutes ?? ''} onChange={(event) => onChange({ ...value, beforeAvailableUntilMinutes: event.target.value === '' ? null : Number(event.target.value) })} /><span>{t('taskAlerts.minutesShort')}</span></span>
			</label> : null}
		</fieldset>
		<button className='task-text-button task-notification-reset' type='button' disabled={readOnly || busy || !hasTaskNotificationOverride(value)} onClick={() => onChange(inheritedTaskNotifications(value.taskId))}><TaskIcon name='undo' />{t('taskAlerts.useDefaults')}</button>
		<p className='task-notification-note'>{t('taskAlerts.pushOnly')}</p>
	</section>
}
