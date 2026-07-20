import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useI18n } from '@/i18n'
import type { CalendarEvent, CalendarEventInput, CalendarMonthlyReport, CalendarReminderInput, CalendarReminderDue } from '@/models/calendar'
import { CalendarService } from '@/services'
import { useAppSelector } from '@/store/hooks'

type ReminderDraft = CalendarReminderInput & { key: string }
type EventDraft = {
	title: string
	description: string
	zoneId: string | null
	startAt: string
	endAt: string
	isAllDay: boolean
	timeZoneId: string
	reminders: ReminderDraft[]
}

export default function CalendarPage() {
	const { t } = useI18n()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const zones = useAppSelector((state) => state.zones.items.filter((zone) => !zone.isArchived))
	const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
	const [events, setEvents] = useState<CalendarEvent[]>([])
	const [report, setReport] = useState<CalendarMonthlyReport | null>(null)
	const [dueReminders, setDueReminders] = useState<CalendarReminderDue[]>([])
	const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()))
	const [draft, setDraft] = useState<EventDraft | null>(null)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')

	const cells = useMemo(() => buildMonthCells(month), [month])

	useEffect(() => {
		if (!accessToken) return
		const from = new Date(month.getFullYear(), month.getMonth(), 1)
		const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)
		setLoading(true)
		setError('')
		Promise.all([
			CalendarService.list(accessToken, from.toISOString(), to.toISOString()),
			CalendarService.monthlyReport(accessToken, month.getFullYear(), month.getMonth() + 1, getTimeZone()),
		])
			.then(([nextEvents, nextReport]) => {
				setEvents(nextEvents)
				setReport(nextReport)
			})
			.catch((reason: Error) => setError(reason.message))
			.finally(() => setLoading(false))
	}, [accessToken, month])

	useEffect(() => {
		if (!accessToken) return
		const loadDueReminders = () => {
			const from = new Date(Date.now() - 60 * 60 * 1000)
			const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
			CalendarService.dueReminders(accessToken, from.toISOString(), to.toISOString()).then(setDueReminders).catch(() => undefined)
		}
		loadDueReminders()
		const timer = window.setInterval(loadDueReminders, 60_000)
		return () => window.clearInterval(timer)
	}, [accessToken, events])

	const openNew = (dateKey = selectedDate) => {
		const start = new Date(`${dateKey}T10:00:00`)
		const end = new Date(`${dateKey}T11:00:00`)
		setEditingId(null)
		setError('')
		setDraft({ title: '', description: '', zoneId: null, startAt: toDateTimeInput(start), endAt: toDateTimeInput(end), isAllDay: false, timeZoneId: getTimeZone(), reminders: [newReminder(3 * 24 * 60), newReminder(60)] })
	}

	const openEdit = (calendarEvent: CalendarEvent) => {
		setEditingId(calendarEvent.id)
		setError('')
		setDraft({
			title: calendarEvent.title,
			description: calendarEvent.description ?? '',
			zoneId: calendarEvent.zoneId,
			startAt: toDateTimeInput(new Date(calendarEvent.startAtUtc)),
			endAt: toDateTimeInput(new Date(calendarEvent.endAtUtc)),
			isAllDay: calendarEvent.isAllDay,
			timeZoneId: calendarEvent.timeZoneId,
			reminders: calendarEvent.reminders.map((reminder) => ({ key: reminder.id, offsetMinutes: reminder.offsetMinutes, isEnabled: reminder.isEnabled })),
		})
	}

	const save = async (event: FormEvent) => {
		event.preventDefault()
		if (!accessToken || !draft) return
		if (!draft.title.trim() || new Date(draft.endAt) <= new Date(draft.startAt)) {
			setError(t('calendar.invalidEvent'))
			return
		}
		setSaving(true)
		setError('')
		const request: CalendarEventInput = {
			title: draft.title.trim(),
			description: draft.description.trim() || null,
			zoneId: draft.zoneId,
			startAt: new Date(draft.startAt).toISOString(),
			endAt: new Date(draft.endAt).toISOString(),
			isAllDay: draft.isAllDay,
			timeZoneId: draft.timeZoneId,
			reminders: draft.reminders.map(({ offsetMinutes, isEnabled }) => ({ offsetMinutes: Number(offsetMinutes), isEnabled })),
		}
		try {
			const saved = editingId
				? await CalendarService.update(accessToken, editingId, { ...request, isCancelled: false })
				: await CalendarService.create(accessToken, request)
			setEvents((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved].sort((a, b) => a.startAtUtc.localeCompare(b.startAtUtc)))
			setDraft(null)
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t('calendar.saveError'))
		} finally {
			setSaving(false)
		}
	}

	const remove = async () => {
		if (!accessToken || !editingId) return
		setSaving(true)
		try {
			await CalendarService.remove(accessToken, editingId)
			setEvents((current) => current.filter((item) => item.id !== editingId))
			setDraft(null)
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t('calendar.deleteError'))
		} finally {
			setSaving(false)
		}
	}

	const acknowledge = async (reminderId: string) => {
		if (!accessToken) return
		await CalendarService.acknowledgeReminder(accessToken, reminderId)
		setDueReminders((current) => current.filter((reminder) => reminder.reminderId !== reminderId))
		setEvents((current) => current.map((item) => ({ ...item, reminders: item.reminders.map((reminder) => reminder.id === reminderId ? { ...reminder, acknowledgedAt: new Date().toISOString() } : reminder) })))
	}

	const shiftMonth = (offset: number) => {
		setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
	}

	return (
		<div className='page-grid calendar-page'>
			<section className='calendar-header'>
				<div><span className='eyebrow'>{t('calendar.kicker')}</span><h1>{t('calendar.title')}</h1><p>{t('calendar.subtitle')}</p></div>
				<button className='primary-action' type='button' onClick={() => openNew()}>{t('calendar.newEvent')}</button>
			</section>
			{dueReminders.length > 0 ? <section className='calendar-alerts' aria-label={t('calendar.remindersDue')}>
				<strong>{t('calendar.remindersDue')}</strong>
				{dueReminders.map((reminder) => <div className='calendar-alert' key={reminder.reminderId}><span>{reminder.eventTitle}</span><small>{formatReminderOffset(reminder.offsetMinutes, t)}</small><button type='button' onClick={() => void acknowledge(reminder.reminderId)}>{t('calendar.markDone')}</button></div>)}
			</section> : null}
			{error ? <div className='form-error'>{error}</div> : null}
			<section className='calendar-layout'>
				<div className='calendar-main'>
					<div className='calendar-month-nav'><button type='button' onClick={() => shiftMonth(-1)} aria-label={t('calendar.previousMonth')}>‹</button><h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><button type='button' onClick={() => shiftMonth(1)} aria-label={t('calendar.nextMonth')}>›</button></div>
					<div className='calendar-weekdays'>{getWeekdayLabels(t).map((label) => <span key={label}>{label}</span>)}</div>
					<div className='calendar-grid'>{cells.map((date) => <CalendarDay key={formatDateKey(date)} date={date} currentMonth={month} selectedDate={selectedDate} events={events.filter((item) => formatDateKey(new Date(item.startAtUtc)) === formatDateKey(date))} onSelect={() => setSelectedDate(formatDateKey(date))} onCreate={() => { setSelectedDate(formatDateKey(date)); openNew(formatDateKey(date)) }} onEdit={openEdit} />)}</div>
					{loading ? <p className='empty-state'>{t('common.loading')}</p> : null}
				</div>
				<div className='calendar-side'>
					{report ? <section className='calendar-report'><span className='eyebrow'>{t('calendar.monthlyReport')}</span><div className='calendar-report__grid'><strong>{report.activeEvents}<small>{t('calendar.activeEvents')}</small></strong><strong>{report.totalEvents}<small>{t('calendar.totalEvents')}</small></strong><strong>{report.enabledReminders}<small>{t('calendar.reminders')}</small></strong><strong>{report.acknowledgedReminders}<small>{t('calendar.markedReminders')}</small></strong></div></section> : null}
					{draft ? <EventEditor draft={draft} zones={zones} saving={saving} editing={Boolean(editingId)} onChange={setDraft} onSubmit={save} onDelete={editingId ? remove : undefined} onCancel={() => setDraft(null)} /> : <section className='calendar-empty-editor'><span className='eyebrow'>{selectedDate}</span><h2>{t('calendar.selectEvent')}</h2><p>{t('calendar.selectEventDescription')}</p><button className='secondary-action' type='button' onClick={() => openNew()}>{t('calendar.newEvent')}</button></section>}
				</div>
			</section>
		</div>
	)
	}

function CalendarDay({ date, currentMonth, selectedDate, events, onSelect, onCreate, onEdit }: { date: Date; currentMonth: Date; selectedDate: string; events: CalendarEvent[]; onSelect: () => void; onCreate: () => void; onEdit: (event: CalendarEvent) => void }) {
	const dateKey = formatDateKey(date)
	return <article className={`calendar-day${dateKey === selectedDate ? ' is-selected' : ''}${date.getMonth() !== currentMonth.getMonth() ? ' is-muted' : ''}`} role='button' tabIndex={0} aria-selected={dateKey === selectedDate} aria-label={dateKey} onClick={onSelect} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect() } }}>
		<header><strong>{date.getDate()}</strong><button type='button' onClick={(event) => { event.stopPropagation(); onCreate() }} aria-label={`Create event ${dateKey}`}>+</button></header>
		<div>{events.map((calendarEvent) => <button className={`calendar-event${calendarEvent.isCancelled ? ' is-cancelled' : ''}`} key={calendarEvent.id} type='button' onClick={(event) => { event.stopPropagation(); onEdit(calendarEvent) }}><span>{calendarEvent.isAllDay ? '•' : new Date(calendarEvent.startAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{calendarEvent.title}</button>)}</div>
	</article>
}

function EventEditor({ draft, zones, saving, editing, onChange, onSubmit, onDelete, onCancel }: { draft: EventDraft; zones: { id: string; name: string }[]; saving: boolean; editing: boolean; onChange: (draft: EventDraft) => void; onSubmit: (event: FormEvent) => void; onDelete?: () => void; onCancel: () => void }) {
	const { t } = useI18n()
	const update = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => onChange({ ...draft, [key]: value })
	return <form className='calendar-editor' onSubmit={onSubmit}>
		<div className='calendar-editor__heading'><div><span className='eyebrow'>{editing ? t('calendar.editEvent') : t('calendar.newEvent')}</span><h2>{t('calendar.eventDetails')}</h2></div><button type='button' className='icon-button' onClick={onCancel} aria-label={t('common.close')}>×</button></div>
		<label>{t('calendar.eventTitle')}<input value={draft.title} onChange={(event) => update('title', event.target.value)} maxLength={220} required /></label>
		<label>{t('calendar.description')}<textarea value={draft.description} onChange={(event) => update('description', event.target.value)} rows={3} maxLength={2000} /></label>
		<label>{t('calendar.zone')}<select value={draft.zoneId ?? ''} onChange={(event) => update('zoneId', event.target.value || null)}><option value=''>{t('calendar.noZone')}</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
		<div className='calendar-editor__row'><label>{t('calendar.starts')}<input type='datetime-local' value={draft.startAt} onChange={(event) => update('startAt', event.target.value)} required /></label><label>{t('calendar.ends')}<input type='datetime-local' value={draft.endAt} onChange={(event) => update('endAt', event.target.value)} required /></label></div>
		<label className='check-field'><input type='checkbox' checked={draft.isAllDay} onChange={(event) => update('isAllDay', event.target.checked)} />{t('calendar.allDay')}</label>
		<div className='calendar-reminders'><div className='calendar-editor__heading'><h3>{t('calendar.reminders')}</h3><button type='button' className='link-action' onClick={() => update('reminders', [...draft.reminders, newReminder(30)])}>{t('calendar.addReminder')}</button></div>{draft.reminders.map((reminder) => <div className='calendar-reminder-row' key={reminder.key}><input type='number' min='0' value={reminder.offsetMinutes} onChange={(event) => update('reminders', draft.reminders.map((item) => item.key === reminder.key ? { ...item, offsetMinutes: Number(event.target.value) } : item))} aria-label={t('calendar.minutesBefore')} /><span>{t('calendar.minutesBefore')}</span><label className='check-field'><input type='checkbox' checked={reminder.isEnabled} onChange={(event) => update('reminders', draft.reminders.map((item) => item.key === reminder.key ? { ...item, isEnabled: event.target.checked } : item))} />{t('calendar.enabled')}</label><button type='button' className='icon-button' onClick={() => update('reminders', draft.reminders.filter((item) => item.key !== reminder.key))} aria-label={t('calendar.removeReminder')}>×</button></div>)}</div>
		<div className='calendar-editor__actions'><button className='primary-action' type='submit' disabled={saving}>{t('calendar.save')}</button>{onDelete ? <button className='danger-action' type='button' disabled={saving} onClick={() => void onDelete()}>{t('calendar.delete')}</button> : null}</div>
	</form>
}

function newReminder(offsetMinutes: number): ReminderDraft {
	return { key: crypto.randomUUID(), offsetMinutes, isEnabled: true }
}

function buildMonthCells(month: Date) {
	const first = new Date(month.getFullYear(), month.getMonth(), 1)
	const mondayOffset = (first.getDay() + 6) % 7
	return Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - mondayOffset + 1))
}

function getWeekdayLabels(t: (key: string) => string) {
	return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => t(`calendar.weekdays.${day}`))
}

function formatDateKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toDateTimeInput(date: Date) {
	return `${formatDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function formatReminderOffset(minutes: number, t: (key: string) => string) {
	if (minutes >= 1440) return `${Math.floor(minutes / 1440)} ${t('calendar.daysBefore')}`
	if (minutes >= 60) return `${Math.floor(minutes / 60)} ${t('calendar.hoursBefore')}`
	return `${minutes} ${t('calendar.minutesBefore')}`
}
