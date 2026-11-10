import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { translate, useI18n } from '@/i18n'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { closeQuickCreate } from '@/store/features/ui/uiSlice'
import { createTask, deleteTask, updateTask } from '@/store/features/tasks/tasksSlice'
import { createZone } from '@/store/features/zones/zonesSlice'
import { fetchNow } from '@/store/features/now/nowSlice'
import { fetchActiveUsers } from '@/store/features/users/usersSlice'
import { createProposal } from '@/store/features/proposals/proposalsSlice'
import { useToast } from '@/components/Toasts/useToast'
import type { NotificationPreferences, TaskNotificationOverride } from '@/models/notifications'
import { NotificationService } from '@/services'
import type { CreateTaskRequest } from '@/models/task'
import { fetchTaskNotificationSettings, setTaskNotificationOverride as setTaskNotificationOverrideInStore } from '@/store/features/taskNotifications/taskNotificationsSlice'
import { hasTaskNotificationOverride, inheritedTaskNotifications } from '@/utils/taskNotifications'
import TaskNotificationSettings from './TaskNotificationSettings'
import { useModalFocus } from '@/hooks/useModalFocus'

export default function QuickCreateSheet() {
	const { locale, t } = useI18n()
	const dispatch = useAppDispatch()
	const { showToast } = useToast()
	const titleId = useId()
	const descriptionId = useId()
	const panelRef = useRef<HTMLElement>(null)
	useModalFocus(panelRef, () => { dispatch(closeQuickCreate()) }, 'input[name="title"]')
	const zoneItems = useAppSelector((state) => state.zones.items)
	const userItems = useAppSelector((state) => state.users.items)
	const zones = useMemo(() => zoneItems.filter((zone) => !zone.isArchived), [zoneItems])
	const users = useMemo(() => userItems.filter((user) => user.isActive), [userItems])
	const currentUser = useAppSelector((state) => state.auth.user)
	const editingTaskId = useAppSelector((state) => state.ui.editingTaskId)
	const quickCreateZoneId = useAppSelector((state) => state.ui.quickCreateZoneId)
	const editingTask = useAppSelector((state) => state.tasks.items.find((task) => task.id === editingTaskId))
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const [title, setTitle] = useState('')
	const [mode, setMode] = useState<'create' | 'propose'>('create')
	const [zoneId, setZoneId] = useState('')
	const [scope, setScope] = useState('Personal')
	const [assignmentMode, setAssignmentMode] = useState('Anyone')
	const [assigneeId, setAssigneeId] = useState('')
	const [personalOwner, setPersonalOwner] = useState<'creator' | 'admin'>('creator')
	const [recurrence, setRecurrence] = useState('Manual')
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [description, setDescription] = useState('')
	const [weekday, setWeekday] = useState('')
	const [weekOfMonth, setWeekOfMonth] = useState('')
	const [timesPerWeek, setTimesPerWeek] = useState('')
	const [everyNDays, setEveryNDays] = useState('')
	const [interval, setInterval] = useState('')
	const [startDate, setStartDate] = useState(localDate())
	const [availableFromTime, setAvailableFromTime] = useState('')
	const [availableUntilTime, setAvailableUntilTime] = useState('')
	const [recommendedTime, setRecommendedTime] = useState('')
	const [extendsUntilNextOccurrence, setExtendsUntilNextOccurrence] = useState(true)
	const [timeZoneId, setTimeZoneId] = useState(getBrowserTimeZone())
	const [importance, setImportance] = useState('Normal')
	const [complexity, setComplexity] = useState('Easy')
	const [obligation, setObligation] = useState('Required')
	const [zoneName, setZoneName] = useState('')
	const [quickZoneOpen, setQuickZoneOpen] = useState(false)
	const [taskNotificationOverride, setTaskNotificationOverride] = useState<TaskNotificationOverride | null>(null)
	const [taskNotificationPreferences, setTaskNotificationPreferences] = useState<NotificationPreferences | null>(null)
	const [taskNotificationLoading, setTaskNotificationLoading] = useState(false)
	const [taskNotificationError, setTaskNotificationError] = useState('')
	const isEditing = Boolean(editingTask)
	const isProposing = mode === 'propose' && !isEditing

	useEffect(() => {
		if ((scope === 'House' || isProposing) && users.length === 0) {
			dispatch(fetchActiveUsers())
		}
	}, [dispatch, isProposing, scope, users.length])

	useEffect(() => {
		if (!editingTask) {
			setTitle('')
			setMode('create')
			setZoneId(quickCreateZoneId ?? '')
			setScope('Personal')
			setAssignmentMode('Anyone')
			setAssigneeId('')
			setPersonalOwner('creator')
			setRecurrence('Manual')
			setDescription('')
			setWeekday('')
			setWeekOfMonth('')
			setTimesPerWeek('')
			setEveryNDays('')
			setInterval('')
			setStartDate(localDate())
			setAvailableFromTime('')
			setAvailableUntilTime('')
			setRecommendedTime('')
			setExtendsUntilNextOccurrence(true)
			setTimeZoneId(getBrowserTimeZone())
			setImportance('Normal')
			setComplexity('Easy')
			setObligation('Required')
			setDetailsOpen(true)
			setQuickZoneOpen(false)
			return
		}

		setTitle(editingTask.title)
		setMode('create')
		setDescription(editingTask.description ?? '')
		setZoneId(editingTask.zoneId ?? '')
		setScope(editingTask.scope)
		setAssignmentMode(editingTask.assignmentMode)
		setAssigneeId(editingTask.assigneeIds[0] ?? '')
		setPersonalOwner('creator')
		setRecurrence(editingTask.schedule?.recurrenceType ?? 'Manual')
		setWeekday(editingTask.schedule?.weekday?.toString() ?? '')
		setWeekOfMonth(editingTask.schedule?.weekOfMonth?.toString() ?? '')
		setTimesPerWeek(editingTask.schedule?.timesPerWeek?.toString() ?? '')
		setEveryNDays(editingTask.schedule?.everyNDays?.toString() ?? '')
		setInterval(editingTask.schedule?.interval?.toString() ?? '')
		setStartDate(editingTask.schedule?.startDate ?? localDate())
		setAvailableFromTime(toInputTime(editingTask.schedule?.availableFromTime, editingTask.schedule?.timeZoneId))
		setAvailableUntilTime(toInputTime(editingTask.schedule?.availableUntilTime, editingTask.schedule?.timeZoneId))
		setRecommendedTime(toInputTime(editingTask.schedule?.recommendedTime, editingTask.schedule?.timeZoneId))
		setExtendsUntilNextOccurrence(editingTask.schedule?.extendsUntilNextOccurrence ?? true)
		setTimeZoneId(editingTask.schedule?.timeZoneId ?? getBrowserTimeZone())
		setImportance(editingTask.importance)
		setComplexity(editingTask.complexity)
		setObligation(editingTask.obligation)
		setDetailsOpen(true)
	}, [editingTask, quickCreateZoneId])

	useEffect(() => {
		let mounted = true
		if (!editingTask || !accessToken || editingTask.createdByUserId !== currentUser?.id) {
			setTaskNotificationOverride(null)
			setTaskNotificationPreferences(null)
			setTaskNotificationLoading(false)
			setTaskNotificationError('')
			return () => { mounted = false }
		}

		setTaskNotificationLoading(true)
		setTaskNotificationError('')
		setTaskNotificationOverride(null)
		setTaskNotificationPreferences(null)
		void Promise.all([NotificationService.getTaskOverride(accessToken, editingTask.id), NotificationService.getPreferences(accessToken)])
			.then(([override, preferences]) => {
				if (mounted) {
					setTaskNotificationOverride(override)
					setTaskNotificationPreferences(preferences)
				}
			})
			.catch(() => {
				if (mounted) setTaskNotificationError(translate(locale, 'notifications.taskSettingsError'))
			})
			.finally(() => {
				if (mounted) setTaskNotificationLoading(false)
			})

		return () => { mounted = false }
	}, [accessToken, currentUser?.id, editingTask?.id, locale])

	const submitTask = async (event: FormEvent) => {
		event.preventDefault()
		if (!title.trim()) {
			return
		}

		const request: CreateTaskRequest & { personalOwner?: 'creator' | 'admin' | null } = {
				title,
				description: description || null,
				zoneId: zoneId || null,
				scope,
				taskType: recurrence === 'Manual' ? 'OneTime' : 'Routine',
				importance,
				complexity,
				obligation,
				schedule: {
					recurrenceType: recurrence,
					startDate: startDate || localDate(),
					weekday: weekday ? Number(weekday) : null,
					weekOfMonth: recurrence === 'MonthlyOrdinalWeekday' && weekOfMonth ? Number(weekOfMonth) : null,
					timesPerWeek: timesPerWeek ? Number(timesPerWeek) : null,
					everyNDays: everyNDays ? Number(everyNDays) : null,
					interval: interval ? Number(interval) : null,
					availableFromTime: availableFromTime || null,
					availableUntilTime: availableUntilTime || null,
					recommendedTime: recommendedTime || null,
					extendsUntilNextOccurrence: recurrence !== 'Manual' && extendsUntilNextOccurrence,
					timeZoneId,
				},
				assignmentMode: scope === 'House' ? assignmentMode : 'SingleUser',
				assigneeIds: scope === 'House' && assignmentMode !== 'Anyone' && assigneeId ? [assigneeId] : [],
				personalOwner: scope === 'Personal' && editingTask?.scope === 'House' && currentUser?.role === 'Admin' ? personalOwner : null,
		}

		if (isProposing) {
			if (!accessToken || !assigneeId || assigneeId === currentUser?.id) {
				showToast({ type: 'error', title: t('errors.proposalTarget') })
				return
			}
			const result = await dispatch(createProposal({ ...request, targetUserId: assigneeId }))
			if (createProposal.rejected.match(result)) {
				showToast({ type: 'error', title: getFriendlyError(result.error.message, t) })
				return
			}
			showToast({ type: 'success', title: t('toasts.proposalCreated') })
		} else if (editingTask) {
			const result = await dispatch(updateTask({ id: editingTask.id, request }))
			if (updateTask.rejected.match(result)) {
				showToast({ type: 'error', title: getFriendlyError(result.error.message, t) })
				return
			}
			if (accessToken && taskNotificationOverride) {
				try {
					if (hasTaskNotificationOverride(taskNotificationOverride)) {
						const saved = await NotificationService.updateTaskOverride(accessToken, editingTask.id, {
							availableFromEnabled: taskNotificationOverride.availableFromEnabled,
							recommendedEnabled: taskNotificationOverride.recommendedEnabled,
							beforeAvailableUntilEnabled: taskNotificationOverride.beforeAvailableUntilEnabled,
							taskExpiredEnabled: taskNotificationOverride.taskExpiredEnabled,
							taskCompletedEnabled: taskNotificationOverride.taskCompletedEnabled,
							beforeAvailableUntilMinutes: taskNotificationOverride.beforeAvailableUntilMinutes,
						})
						dispatch(setTaskNotificationOverrideInStore(saved))
					} else {
						await NotificationService.deleteTaskOverride(accessToken, editingTask.id)
						dispatch(setTaskNotificationOverrideInStore(inheritedTaskNotifications(editingTask.id)))
					}
					void dispatch(fetchTaskNotificationSettings())
				} catch {
					showToast({ type: 'warning', title: t('notifications.taskSettingsSaveError') })
				}
			}
		} else {
			const result = await dispatch(createTask(request))
			if (createTask.rejected.match(result)) {
				showToast({ type: 'error', title: getFriendlyError(result.error.message, t) })
				return
			}
		}
		dispatch(fetchNow())
		if (!isProposing) showToast({ type: 'success', title: isEditing ? t('toasts.taskUpdated') : t('toasts.taskCreated') })
		dispatch(closeQuickCreate())
	}

	const submitZone = async () => {
		if (!zoneName.trim()) {
			return
		}
		await dispatch(createZone({ name: zoneName }))
		setZoneName('')
		showToast({ type: 'success', title: t('toasts.zoneCreated') })
	}


	const removeTask = async () => {
		if (!editingTask || !window.confirm(t('quickCreate.deleteConfirm'))) return
		const result = await dispatch(deleteTask(editingTask.id))
		if (deleteTask.rejected.match(result)) {
			showToast({ type: 'error', title: getFriendlyError(result.error.message, t) })
			return
		}
		dispatch(fetchNow())
		showToast({ type: 'success', title: t('quickCreate.deleted') })
		dispatch(closeQuickCreate())
	}

	return (
		<div className='sheet-backdrop composer-backdrop' role='presentation' onMouseDown={(event) => {
			if (event.target === event.currentTarget) {
				dispatch(closeQuickCreate())
			}
		}}>
			<section className='bottom-sheet composer-panel' ref={panelRef} tabIndex={-1} role='dialog' aria-modal='true' aria-labelledby={titleId} aria-describedby={descriptionId}>
				<header className='composer-header'>
					<div>
						<p id={descriptionId}>{isEditing ? t('quickCreate.editKicker') : t('quickCreate.createKicker')}</p>
						<h2 id={titleId}>{isEditing ? t('quickCreate.editTitle') : t('quickCreate.title')}</h2>
					</div>
					<button className='composer-close' type='button' onClick={() => dispatch(closeQuickCreate())} aria-label={t('common.cancel')}>
						<span aria-hidden='true'>×</span>
					</button>
				</header>

				<form onSubmit={submitTask} className='sheet-form composer-form'>
					{!isEditing ? <div className='composer-mode' role='group' aria-label={t('quickCreate.mode')}>
						<button type='button' aria-pressed={!isProposing} className={!isProposing ? 'is-active' : undefined} onClick={() => setMode('create')}>{t('quickCreate.createMode')}</button>
						<button type='button' aria-pressed={isProposing} className={isProposing ? 'is-active' : undefined} onClick={() => { setMode('propose'); setScope('Personal'); setAssignmentMode('SingleUser') }}>{t('quickCreate.proposeMode')}</button>
					</div> : null}
					<label className='composer-title-field'>
						<span>{t('quickCreate.taskTitle')}</span>
						<input
							name='title'
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							onKeyDown={(event) => {
								if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
								event.preventDefault()
								event.currentTarget.form?.requestSubmit()
							}}
							enterKeyHint='done'
						/>
					</label>
					<div className='composer-field-grid'>
						<label className='composer-field'>{t('quickCreate.importance')}<select value={importance} onChange={(event) => setImportance(event.target.value)}><option value='Low'>{t('quickCreate.importanceLow')}</option><option value='Normal'>{t('quickCreate.importanceNormal')}</option><option value='High'>{t('quickCreate.importanceHigh')}</option><option value='Critical'>{t('quickCreate.importanceCritical')}</option></select></label>
						<label className='composer-field'>{t('quickCreate.complexity')}<select value={complexity} onChange={(event) => setComplexity(event.target.value)}><option value='VeryQuick'>{t('quickCreate.complexityVeryQuick')}</option><option value='Easy'>{t('quickCreate.complexityEasy')}</option><option value='Medium'>{t('quickCreate.complexityMedium')}</option><option value='Heavy'>{t('quickCreate.complexityHeavy')}</option><option value='SmallProject'>{t('quickCreate.complexitySmallProject')}</option></select></label>
						<label className='composer-field'>{t('quickCreate.obligation')}<select value={obligation} onChange={(event) => setObligation(event.target.value)}><option value='Required'>{t('quickCreate.obligationRequired')}</option><option value='Optional'>{t('quickCreate.obligationOptional')}</option></select></label>
					</div>

					<button className='composer-disclosure' type='button' aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
						<span>{t('quickCreate.moreDetails')}</span>
						<strong>{detailsOpen ? '−' : '+'}</strong>
					</button>

					{detailsOpen ? (
						<div className='composer-details'>
							<label className='composer-field'>
								{t('quickCreate.startDate')}
								<input name='startDate' value={startDate} onChange={(event) => setStartDate(event.target.value)} type='date' required />
							</label>
							<p className='composer-preview'>{formatSchedulePreview(recurrence, startDate, interval, t, locale)}</p>
							<label className='composer-field composer-field--full'>
								{t('quickCreate.description')}
								<input value={description} onChange={(event) => setDescription(event.target.value)} />
							</label>
							{recurrence === 'Weekday' || recurrence === 'MonthlyOrdinalWeekday' ? <label className='composer-field'>
								{t('quickCreate.weekday')}
								<select value={weekday} onChange={(event) => setWeekday(event.target.value)}>
									<option value=''>{t('quickCreate.selectWeekday')}</option>
									{[1, 2, 3, 4, 5, 6, 0].map((day) => <option key={day} value={day}>{t(`weekdays.${day}`)}</option>)}
								</select>
							</label> : null}
							{recurrence === 'MonthlyOrdinalWeekday' ? <label className='composer-field'>
								{t('quickCreate.weekOfMonth')}
								<select value={weekOfMonth} onChange={(event) => setWeekOfMonth(event.target.value)}>
									<option value=''>{t('quickCreate.selectWeekOfMonth')}</option>
									{[1, 2, 3, 4].map((ordinal) => <option key={ordinal} value={ordinal}>{t(`quickCreate.ordinal.${ordinal}`)}</option>)}
								</select>
							</label> : null}
							{recurrence === 'TimesPerWeek' ? <label className='composer-field'>
								{t('quickCreate.timesPerWeek')}
								<input min={1} max={7} value={timesPerWeek} onChange={(event) => setTimesPerWeek(event.target.value)} type='number' />
							</label> : null}
							{recurrence === 'EveryNDays' ? <label className='composer-field'>
								{t('quickCreate.everyNDays')}
								<input min={1} value={everyNDays} onChange={(event) => setEveryNDays(event.target.value)} type='number' />
							</label> : null}
							{recurrence === 'EveryNWeeks' || recurrence === 'EveryNMonths' || recurrence === 'EveryNYears' ? <label className='composer-field'>
								{t('quickCreate.interval')}
								<input min={1} value={interval} onChange={(event) => setInterval(event.target.value)} type='number' required />
							</label> : null}
							<>
							<label className='composer-field'>
								{t('quickCreate.availableFrom')}
								<input value={availableFromTime} onChange={(event) => setAvailableFromTime(event.target.value)} type='time' />
							</label>
							<label className='composer-field'>
								{t('quickCreate.availableUntil')}
								<input value={availableUntilTime} onChange={(event) => setAvailableUntilTime(event.target.value)} type='time' />
							</label>
							<label className='composer-field'>
								<span>{t('quickCreate.recommendedTime')}</span>
								<input value={recommendedTime} onChange={(event) => setRecommendedTime(event.target.value)} type='time' />
							</label>
							{recurrence !== 'Manual' ? <label className='composer-toggle composer-field--full'>
								<input type='checkbox' checked={extendsUntilNextOccurrence} onChange={(event) => setExtendsUntilNextOccurrence(event.target.checked)} />
								<span>{t('quickCreate.extendsUntilNextOccurrence')}</span>
							</label> : null}
							</>
						</div>
					) : null}

					{editingTask ? <section className='composer-notification-settings' aria-label={t('notifications.taskSettingsTitle')}>
						<h3>{t('notifications.taskSettingsTitle')}</h3>
						{taskNotificationLoading ? <p className='empty-state'>{t('common.loading')}</p> : null}
						{taskNotificationOverride && taskNotificationPreferences ? <TaskNotificationSettings task={{ ...editingTask, scope, schedule: editingTask.schedule ? { ...editingTask.schedule, availableFromTime: availableFromTime || null, availableUntilTime: availableUntilTime || null, recommendedTime: recommendedTime || null, timeZoneId: getBrowserTimeZone() } : null }} preferences={taskNotificationPreferences} value={taskNotificationOverride} onChange={setTaskNotificationOverride} /> : null}
						{editingTask.createdByUserId !== currentUser?.id ? <p className='task-notification-note'>{t('taskAlerts.ownerOnly')}</p> : null}
						{taskNotificationError ? <p className='form-error'>{taskNotificationError}</p> : null}
					</section> : null}

					<div className='composer-section'>
						<div className='composer-chip-group' aria-label={t('quickCreate.scope')}>
							<span>{t('quickCreate.scope')}</span>
							<div>
				<button type='button' className={scope === 'Personal' ? 'is-active' : undefined} aria-pressed={scope === 'Personal'} onClick={() => setScope('Personal')}>
									{t('quickCreate.personal')}
								</button>
				<button type='button' className={scope === 'House' ? 'is-active' : undefined} aria-pressed={scope === 'House'} onClick={() => {
					setScope('House')
					setAssignmentMode('Anyone')
					setPersonalOwner('creator')
				}}>
									{t('quickCreate.house')}
								</button>
			</div>
		</div>
		{scope === 'Personal' && editingTask?.scope === 'House' && currentUser?.role === 'Admin' ? (
			<label className='composer-field composer-field--full'>
				{t('quickCreate.personalOwner')}
				<select value={personalOwner} onChange={(event) => setPersonalOwner(event.target.value as 'creator' | 'admin')}>
					<option value='creator'>{t('quickCreate.taskCreator')}</option>
					<option value='admin'>{t('quickCreate.me')}</option>
				</select>
			</label>
		) : null}

		<label className='composer-field composer-field--full composer-recurrence-select'>
							{t('quickCreate.recurrence')}
							<select name='recurrence' value={recurrence} onChange={(event) => { setRecurrence(event.target.value); setDetailsOpen(true) }}>
								<option value='Manual'>{t('quickCreate.manual')}</option>
								<option value='Daily'>{t('quickCreate.daily')}</option>
								<option value='Weekday'>{t('quickCreate.weekly')}</option>
								<option value='TimesPerWeek'>{t('quickCreate.xPerWeek')}</option>
								<option value='EveryNDays'>{t('quickCreate.everyNDaysShort')}</option>
								<option value='EveryNWeeks'>{t('quickCreate.everyNWeeks')}</option>
								<option value='Monthly'>{t('quickCreate.monthlyDay')}</option>
								<option value='EveryNMonths'>{t('quickCreate.everyNMonths')}</option>
								<option value='EveryNYears'>{t('quickCreate.everyNYears')}</option>
								<option value='MonthlyOrdinalWeekday'>{t('quickCreate.monthlyOrdinal')}</option>
							</select>
						</label>
					</div>

					<label className='composer-field'>
						{t('quickCreate.zone')}
						<select value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
							<option value=''>{t('quickCreate.noZone')}</option>
							{zones.map((zone) => (
								<option key={zone.id} value={zone.id}>
									{zone.name}
								</option>
							))}
						</select>
					</label>

					{scope === 'House' || isProposing ? (
						<div className='composer-house-panel'>
							<div className='composer-chip-group' aria-label={t('quickCreate.assignmentMode')}>
								<span>{t('quickCreate.assignmentMode')}</span>
								<div>
									{!isProposing ? <button type='button' className={assignmentMode === 'Anyone' ? 'is-active' : undefined} aria-pressed={assignmentMode === 'Anyone'} onClick={() => setAssignmentMode('Anyone')}>{t('assignment.anyone')}</button> : null}
									<button type='button' className={assignmentMode === 'SingleUser' ? 'is-active' : undefined} aria-pressed={assignmentMode === 'SingleUser'} onClick={() => setAssignmentMode('SingleUser')}>{t('assignment.singleUser')}</button>
									<button type='button' className={assignmentMode === 'AllAssignees' ? 'is-active' : undefined} aria-pressed={assignmentMode === 'AllAssignees'} onClick={() => setAssignmentMode('AllAssignees')}>{t('assignment.allAssignees')}</button>
								</div>
							</div>
							{assignmentMode !== 'Anyone' ? (
								<label className='composer-field'>
									{isProposing ? t('quickCreate.proposeTo') : t('quickCreate.assignee')}
									<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} required>
										<option value=''>{t('quickCreate.selectAssignee')}</option>
										{users.map((user) => (
											<option key={user.id} value={user.id}>
												{user.displayName}
											</option>
										))}
									</select>
								</label>
							) : null}
						</div>
					) : null}


					<div className={`composer-actions${isEditing ? ' composer-actions--editing' : ''}`}>
						{isEditing ? <button className='danger-action' type='button' onClick={() => void removeTask()}>{t('quickCreate.delete')}</button> : null}
						<button className='secondary-action' type='button' onClick={() => dispatch(closeQuickCreate())}>{t('common.cancel')}</button>
						<button className='primary-action composer-submit' type='submit'>{isEditing ? t('common.save') : isProposing ? t('quickCreate.sendProposal') : t('common.create')}</button>
					</div>
				</form>

				<div className='quick-zone composer-zone-create'>
					<button className='quick-zone__toggle' type='button' aria-expanded={quickZoneOpen} onClick={() => setQuickZoneOpen((open) => !open)}>
						<span>{t('quickCreate.createZone')}</span>
						<strong>{quickZoneOpen ? '−' : '+'}</strong>
					</button>
					{quickZoneOpen ? (
						<div className='quick-zone__body'>
							<label>
								{t('quickCreate.zoneName')}
								<input value={zoneName} onChange={(event) => setZoneName(event.target.value)} />
							</label>
							<button className='secondary-action' type='button' onClick={submitZone}>{t('common.create')}</button>
						</div>
					) : null}
				</div>
			</section>
		</div>
	)
}

function getBrowserTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function localDate() {
	const date = new Date()
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getFriendlyError(message: string | undefined, t: (key: string) => string) {
	if (message?.includes('data_changed') || message?.includes('data_conflict')) return t('errors.conflict')
	if (message?.includes('invalid_assignee') || message?.includes('assignee_required')) return t('errors.assignment')
	if (message?.includes('invalid_zone')) return t('errors.zone')
	if (message?.includes('task_exists')) return t('errors.duplicateTask')
	return message && !message.includes('HTTP') && !message.includes('Request failed') ? message : t('errors.generic')
}

function formatSchedulePreview(recurrence: string, startDate: string, interval: string, t: (key: string) => string, locale: string) {
	if (!startDate) return ''
	const date = new Date(`${startDate}T12:00:00`)
	const formatted = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
	const prefix = `${t('quickCreate.from')} ${formatted}`
	if (recurrence === 'EveryNWeeks') return `${prefix}, ${t('quickCreate.everyNWeeksPreview').replace('{count}', interval || 'X')}`
	if (recurrence === 'EveryNMonths') return `${prefix}, ${t('quickCreate.everyNMonthsPreview').replace('{count}', interval || 'X')}`
	if (recurrence === 'EveryNYears') return `${prefix}, ${t('quickCreate.everyNYearsPreview').replace('{count}', interval || 'X')}`
	if (recurrence === 'Monthly') return `${prefix}, ${t('quickCreate.monthlyDayPreview')}`
	return prefix
}

function toInputTime(value?: string | null, timeZoneId?: string | null) {
	if (!value) {
		return ''
	}

	if (!timeZoneId || timeZoneId === getBrowserTimeZone()) {
		return value.slice(0, 5)
	}

	const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
	const reference = new Date()
	const source = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate(), hours, minutes))
	const sourceParts = new Intl.DateTimeFormat('en-CA', {
		timeZone: timeZoneId,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(source)
	const read = (type: string) => Number(sourceParts.find((part) => part.type === type)?.value ?? 0)
	const localAsUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'))
	const offsetMinutes = Math.round((localAsUtc - source.getTime()) / 60000)
	return new Date(source.getTime() - offsetMinutes * 60000).toISOString().slice(11, 16)
}
