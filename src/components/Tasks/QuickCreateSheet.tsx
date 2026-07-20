import { useEffect, useId, useState, type FormEvent } from 'react'
import { useI18n } from '@/i18n'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { closeQuickCreate } from '@/store/features/ui/uiSlice'
import { createTask, deleteTask, updateTask } from '@/store/features/tasks/tasksSlice'
import { createZone } from '@/store/features/zones/zonesSlice'
import { fetchNow } from '@/store/features/now/nowSlice'
import { fetchUsers } from '@/store/features/users/usersSlice'
import { useToast } from '@/components/Toasts/useToast'

export default function QuickCreateSheet() {
	const { t } = useI18n()
	const dispatch = useAppDispatch()
	const { showToast } = useToast()
	const titleId = useId()
	const descriptionId = useId()
	const zones = useAppSelector((state) => state.zones.items.filter((zone) => !zone.isArchived))
   	const users = useAppSelector((state) => state.users.items.filter((user) => user.isActive))
	const editingTaskId = useAppSelector((state) => state.ui.editingTaskId)
	const quickCreateZoneId = useAppSelector((state) => state.ui.quickCreateZoneId)
	const editingTask = useAppSelector((state) => state.tasks.items.find((task) => task.id === editingTaskId))
	const [title, setTitle] = useState('')
	const [zoneId, setZoneId] = useState('')
	const [scope, setScope] = useState('Personal')
	const [assignmentMode, setAssignmentMode] = useState('Anyone')
	const [assigneeId, setAssigneeId] = useState('')
	const [recurrence, setRecurrence] = useState('Manual')
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [description, setDescription] = useState('')
	const [weekday, setWeekday] = useState('')
	const [weekOfMonth, setWeekOfMonth] = useState('')
	const [timesPerWeek, setTimesPerWeek] = useState('')
	const [everyNDays, setEveryNDays] = useState('')
	const [availableFromTime, setAvailableFromTime] = useState('')
	const [availableUntilTime, setAvailableUntilTime] = useState('')
	const [recommendedTime, setRecommendedTime] = useState('')
	const [timeZoneId, setTimeZoneId] = useState(getBrowserTimeZone())
	const [zoneName, setZoneName] = useState('')
	const [quickZoneOpen, setQuickZoneOpen] = useState(false)
	const isEditing = Boolean(editingTask)

	useEffect(() => {
		if (scope === 'House' && users.length === 0) {
			dispatch(fetchUsers())
		}
	}, [dispatch, scope, users.length])

	useEffect(() => {
		if (!editingTask) {
			setTitle('')
			setZoneId(quickCreateZoneId ?? '')
			setScope('Personal')
			setAssignmentMode('Anyone')
			setAssigneeId('')
			setRecurrence('Manual')
			setDescription('')
			setWeekday('')
			setWeekOfMonth('')
			setTimesPerWeek('')
			setEveryNDays('')
			setAvailableFromTime('')
			setAvailableUntilTime('')
			setRecommendedTime('')
			setTimeZoneId(getBrowserTimeZone())
			setDetailsOpen(false)
			setQuickZoneOpen(false)
			return
		}

		setTitle(editingTask.title)
		setDescription(editingTask.description ?? '')
		setZoneId(editingTask.zoneId ?? '')
		setScope(editingTask.scope)
		setAssignmentMode(editingTask.assignmentMode)
		setAssigneeId(editingTask.assigneeIds[0] ?? '')
		setRecurrence(editingTask.schedule?.recurrenceType ?? 'Manual')
		setWeekday(editingTask.schedule?.weekday?.toString() ?? '')
		setWeekOfMonth(editingTask.schedule?.weekOfMonth?.toString() ?? '')
		setTimesPerWeek(editingTask.schedule?.timesPerWeek?.toString() ?? '')
		setEveryNDays(editingTask.schedule?.everyNDays?.toString() ?? '')
		setAvailableFromTime(toInputTime(editingTask.schedule?.availableFromTime, editingTask.schedule?.timeZoneId))
		setAvailableUntilTime(toInputTime(editingTask.schedule?.availableUntilTime, editingTask.schedule?.timeZoneId))
		setRecommendedTime(toInputTime(editingTask.schedule?.recommendedTime, editingTask.schedule?.timeZoneId))
		setTimeZoneId(editingTask.schedule?.timeZoneId ?? getBrowserTimeZone())
		setDetailsOpen(true)
	}, [editingTask, quickCreateZoneId])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				dispatch(closeQuickCreate())
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [dispatch])

	const submitTask = async (event: FormEvent) => {
		event.preventDefault()
		if (!title.trim()) {
			return
		}

		const request = {
				title,
				description: description || null,
				zoneId: zoneId || null,
				scope,
				taskType: recurrence === 'Manual' ? 'OneTime' : 'Routine',
				schedule: {
					recurrenceType: recurrence,
					weekday: weekday ? Number(weekday) : null,
					weekOfMonth: recurrence === 'MonthlyOrdinalWeekday' && weekOfMonth ? Number(weekOfMonth) : null,
					timesPerWeek: timesPerWeek ? Number(timesPerWeek) : null,
					everyNDays: everyNDays ? Number(everyNDays) : null,
					availableFromTime: availableFromTime || null,
					availableUntilTime: availableUntilTime || null,
				recommendedTime: recommendedTime || null,
				timeZoneId,
				},
				assignmentMode: scope === 'House' ? assignmentMode : 'SingleUser',
				assigneeIds: scope === 'House' && assignmentMode !== 'Anyone' && assigneeId ? [assigneeId] : [],
		}

		if (editingTask) {
			const result = await dispatch(updateTask({ id: editingTask.id, request }))
			if (updateTask.rejected.match(result)) {
				showToast({ type: 'error', title: result.error.message ?? t('toasts.error') })
				return
			}
		} else {
			const result = await dispatch(createTask(request))
			if (createTask.rejected.match(result)) {
				showToast({ type: 'error', title: result.error.message ?? t('toasts.error') })
				return
			}
		}
		dispatch(fetchNow())
		showToast({ type: 'success', title: isEditing ? t('toasts.taskUpdated') : t('toasts.taskCreated') })
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
			showToast({ type: 'error', title: result.error.message ?? t('toasts.error') })
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
			<section className='bottom-sheet composer-panel' role='dialog' aria-modal='true' aria-labelledby={titleId} aria-describedby={descriptionId}>
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
					<label className='composer-title-field'>
						<span>{t('quickCreate.taskTitle')}</span>
						<input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
					</label>

					<button className='composer-disclosure' type='button' aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
						<span>{t('quickCreate.moreDetails')}</span>
						<strong>{detailsOpen ? '−' : '+'}</strong>
					</button>

					{detailsOpen ? (
						<div className='composer-details'>
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
								<input min={1} max={14} value={timesPerWeek} onChange={(event) => setTimesPerWeek(event.target.value)} type='number' />
							</label> : null}
							{recurrence === 'EveryNDays' ? <label className='composer-field'>
								{t('quickCreate.everyNDays')}
								<input min={1} value={everyNDays} onChange={(event) => setEveryNDays(event.target.value)} type='number' />
							</label> : null}
							{recurrence !== 'Manual' ? <>
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
							</> : null}
						</div>
					) : null}

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
								}}>
									{t('quickCreate.house')}
								</button>
							</div>
						</div>

						<div className='composer-chip-group' aria-label={t('quickCreate.recurrence')}>
							<span>{t('quickCreate.recurrence')}</span>
							<div>
								<button type='button' className={recurrence === 'Manual' ? 'is-active' : undefined} aria-pressed={recurrence === 'Manual'} onClick={() => { setRecurrence('Manual'); setDetailsOpen(false) }}>
									{t('quickCreate.manual')}
								</button>
								<button type='button' className={recurrence === 'Daily' ? 'is-active' : undefined} aria-pressed={recurrence === 'Daily'} onClick={() => { setRecurrence('Daily'); setDetailsOpen(false) }}>
									{t('quickCreate.daily')}
								</button>
								<button type='button' className={recurrence === 'Weekday' ? 'is-active' : undefined} aria-pressed={recurrence === 'Weekday'} onClick={() => { setRecurrence('Weekday'); setDetailsOpen(true) }}>
									{t('quickCreate.weekly')}
								</button>
								<button type='button' className={recurrence === 'TimesPerWeek' ? 'is-active' : undefined} aria-pressed={recurrence === 'TimesPerWeek'} onClick={() => { setRecurrence('TimesPerWeek'); setDetailsOpen(true) }}>
									{t('quickCreate.xPerWeek')}
								</button>
								<button type='button' className={recurrence === 'EveryNDays' ? 'is-active' : undefined} aria-pressed={recurrence === 'EveryNDays'} onClick={() => { setRecurrence('EveryNDays'); setDetailsOpen(true) }}>
									{t('quickCreate.everyNDaysShort')}
								</button>
								<button type='button' className={recurrence === 'MonthlyOrdinalWeekday' ? 'is-active' : undefined} aria-pressed={recurrence === 'MonthlyOrdinalWeekday'} onClick={() => { setRecurrence('MonthlyOrdinalWeekday'); setDetailsOpen(true) }}>
									{t('quickCreate.monthlyOrdinal')}
								</button>
							</div>
						</div>
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

					{scope === 'House' ? (
						<div className='composer-house-panel'>
							<div className='composer-chip-group' aria-label={t('quickCreate.assignmentMode')}>
								<span>{t('quickCreate.assignmentMode')}</span>
								<div>
									<button type='button' className={assignmentMode === 'Anyone' ? 'is-active' : undefined} aria-pressed={assignmentMode === 'Anyone'} onClick={() => setAssignmentMode('Anyone')}>{t('assignment.anyone')}</button>
									<button type='button' className={assignmentMode === 'SingleUser' ? 'is-active' : undefined} aria-pressed={assignmentMode === 'SingleUser'} onClick={() => setAssignmentMode('SingleUser')}>{t('assignment.singleUser')}</button>
									<button type='button' className={assignmentMode === 'AllAssignees' ? 'is-active' : undefined} aria-pressed={assignmentMode === 'AllAssignees'} onClick={() => setAssignmentMode('AllAssignees')}>{t('assignment.allAssignees')}</button>
								</div>
							</div>
							{assignmentMode !== 'Anyone' ? (
								<label className='composer-field'>
									{t('quickCreate.assignee')}
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
						<button className='primary-action composer-submit' type='submit'>{isEditing ? t('common.save') : t('common.create')}</button>
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
