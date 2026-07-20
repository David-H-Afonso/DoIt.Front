import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { translate, useI18n } from '@/i18n'
import { logoutLocal } from '@/store/features/auth/authSlice'
import { fetchNow } from '@/store/features/now/nowSlice'
import { createTask, fetchTasks } from '@/store/features/tasks/tasksSlice'
import { createZone, fetchZones } from '@/store/features/zones/zonesSlice'
import { createUser, fetchUsers, resetUserPassword, updateUser } from '@/store/features/users/usersSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useToast } from '@/components/Toasts/useToast'
import type { CreateTaskRequest } from '@/models/task'
import { BackupService } from '@/services'
import type { BackupSchedule } from '@/models/backup'
import { ApiError } from '@/services/httpClient'

type CsvTaskRow = {
	title: string
	description: string
	zone: string
	scope: string
	frequency: string
	weekday: string
	timesPerWeek: string
	everyNDays: string
	startDate: string
	availableFromTime: string
	availableUntilTime: string
	recommendedTime: string
	timeZoneId: string
	assignmentMode: string
	assigneeUsername: string
}

export default function ProfilePage() {
	const { locale, t } = useI18n()
	const dispatch = useAppDispatch()
	const { showToast } = useToast()
	const user = useAppSelector((state) => state.auth.user)
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const users = useAppSelector((state) => state.users.items)
	const usersLoading = useAppSelector((state) => state.users.loading)
	const usersError = useAppSelector((state) => state.users.error)
	const tasks = useAppSelector((state) => state.tasks.items)
	const xp = useAppSelector((state) => state.xp.value)
	const [newUsername, setNewUsername] = useState('')
	const [newDisplayName, setNewDisplayName] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [newRole, setNewRole] = useState('User')
	const [createUserOpen, setCreateUserOpen] = useState(false)
	const [editingUserId, setEditingUserId] = useState<string | null>(null)
	const [editingDisplayName, setEditingDisplayName] = useState('')
	const [editingRole, setEditingRole] = useState('User')
	const [passwordUserId, setPasswordUserId] = useState<string | null>(null)
	const [resetPassword, setResetPassword] = useState('')
	const [importOpen, setImportOpen] = useState(false)
	const [importFileName, setImportFileName] = useState('')
	const [importRows, setImportRows] = useState<CsvTaskRow[]>([])
	const [importError, setImportError] = useState('')
	const [importStatus, setImportStatus] = useState('')
	const [backupSchedule, setBackupSchedule] = useState<BackupSchedule | null>(null)
	const [backupDestination, setBackupDestination] = useState('/app/data/backups')
	const [backupRetention, setBackupRetention] = useState('7')
	const [backupBusy, setBackupBusy] = useState(false)
	const [backupStatus, setBackupStatus] = useState('')
	const levelStart = xp?.currentLevelXp ?? 0
	const levelEnd = xp?.nextLevelXp ?? 100
	const progress = levelEnd > levelStart ? Math.min(100, Math.round(((xp?.progressToNextLevel ?? 0) / (levelEnd - levelStart)) * 100)) : 0
	const zones = useAppSelector((state) => state.zones.items.filter((zone) => !zone.isArchived))

	useEffect(() => {
		if (accessToken && user?.role === 'Admin' && user.id) {
			dispatch(fetchUsers())
			BackupService.list(accessToken).then((schedules) => {
				const schedule = schedules.find((candidate) => candidate.userId === user.id)
				if (schedule) {
					setBackupSchedule(schedule)
					setBackupDestination(schedule.destinationPath)
					setBackupRetention(String(schedule.retentionCount))
				}
			}).catch((reason: unknown) => {
				const status = reason instanceof ApiError && reason.status > 0 ? ` (${reason.status})` : ''
				setBackupStatus(`${translate(locale, 'backups.loadError')}${status}`)
			})
		}
	}, [accessToken, dispatch, locale, user?.id, user?.role])

	const saveBackup = async (event: FormEvent) => {
		event.preventDefault()
		if (!accessToken || !user) return
		setBackupBusy(true)
		try {
			const schedule = await BackupService.update(accessToken, user.id, {
				destinationPath: backupDestination,
				retentionCount: Number(backupRetention || 0),
				fileNamePrefix: backupSchedule?.fileNamePrefix ?? '',
				fileNameSuffix: backupSchedule?.fileNameSuffix ?? '',
			})
			setBackupSchedule(schedule)
			setBackupStatus(t('backups.saved'))
		} catch {
			setBackupStatus(t('backups.saveError'))
		} finally {
			setBackupBusy(false)
		}
	}

	const runFullBackup = async () => {
		if (!accessToken) return
		setBackupBusy(true)
		try {
			const result = await BackupService.fullRunNow(accessToken)
			setBackupStatus(`${t('backups.started')}: ${result.fileName}`)
		} catch {
			setBackupStatus(t('backups.runError'))
		} finally {
			setBackupBusy(false)
		}
	}

	const submitCreateUser = async (event: FormEvent) => {
		event.preventDefault()
		const result = await dispatch(createUser({ username: newUsername, displayName: newDisplayName, password: newPassword, role: newRole, locale: 'es' }))
		if (createUser.rejected.match(result)) {
			showToast({ type: 'error', title: result.error.message ?? t('toasts.error') })
			return
		}
		setNewUsername('')
		setNewDisplayName('')
		setNewPassword('')
		showToast({ type: 'success', title: t('profile.userCreated') })
	}

	const submitUpdateUser = async (event: FormEvent) => {
		event.preventDefault()
		if (!editingUserId) return
		const target = users.find((candidate) => candidate.id === editingUserId)
		if (!target) return
		const result = await dispatch(updateUser({ id: target.id, request: { displayName: editingDisplayName, locale: target.preferredLocale, role: editingRole, isActive: target.isActive } }))
		if (updateUser.rejected.match(result)) {
			showToast({ type: 'error', title: result.error.message ?? t('toasts.error') })
			return
		}
		setEditingUserId(null)
		showToast({ type: 'success', title: t('profile.userUpdated') })
	}

	const toggleUser = async (target: typeof users[number]) => {
		const result = await dispatch(updateUser({ id: target.id, request: { displayName: target.displayName, locale: target.preferredLocale, role: target.role, isActive: !target.isActive } }))
		if (updateUser.rejected.match(result)) {
			showToast({ type: 'error', title: result.error.message ?? t('toasts.error') })
		}
	}

	const submitResetPassword = async (event: FormEvent) => {
		event.preventDefault()
		if (!passwordUserId) return
		const result = await dispatch(resetUserPassword({ id: passwordUserId, request: { password: resetPassword } }))
		if (resetUserPassword.rejected.match(result)) {
			showToast({ type: 'error', title: result.error.message ?? t('toasts.error') })
			return
		}
		setPasswordUserId(null)
		setResetPassword('')
		showToast({ type: 'success', title: t('profile.passwordUpdated') })
	}

	const selectImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return
		setImportError('')
		setImportStatus('')
		try {
			const rows = parseTaskCsv(await file.text())
			setImportFileName(file.name)
			setImportRows(rows)
		} catch (error) {
			setImportFileName(file.name)
			setImportRows([])
			setImportError(error instanceof Error ? error.message : t('profile.invalidCsv'))
		}
	}

	const importTasksFromCsv = async () => {
		if (importRows.length === 0) return
		const zoneIds = new Map(zones.map((zone) => [zone.name.trim().toLocaleLowerCase(), zone.id]))
		const existingTitles = new Set(tasks.map((task) => task.title.trim().toLocaleLowerCase()))
		let imported = 0
		let skipped = 0
		const errors: string[] = []
		for (const row of importRows) {
			try {
				const normalizedTitle = row.title.trim().toLocaleLowerCase()
				if (existingTitles.has(normalizedTitle)) {
					skipped += 1
					continue
				}

				let zoneId = zoneIds.get(row.zone.trim().toLocaleLowerCase())
				if (!zoneId && row.zone.trim()) {
					const zoneResult = await dispatch(createZone({ name: row.zone.trim() }))
					if (createZone.rejected.match(zoneResult)) throw new Error(zoneResult.error.message ?? t('toasts.error'))
					zoneId = zoneResult.payload.id
					zoneIds.set(row.zone.trim().toLocaleLowerCase(), zoneId)
				}

				const taskResult = await dispatch(createTask(csvRowToTaskRequest(row, zoneId, users)))
				if (createTask.rejected.match(taskResult)) throw new Error(taskResult.error.message ?? t('toasts.error'))
				imported += 1
				existingTitles.add(normalizedTitle)
			} catch (error) {
				errors.push(`${row.title}: ${error instanceof Error ? error.message : t('toasts.error')}`)
			}
		}
		dispatch(fetchZones())
		dispatch(fetchTasks())
		dispatch(fetchNow())
		setImportStatus(`${t('profile.imported')}: ${imported}/${importRows.length}${skipped > 0 ? ` · ${t('profile.skipped')}: ${skipped}` : ''}${errors.length > 0 ? ` · ${t('profile.importErrors')}: ${errors.length}` : ''}`)
		if (errors.length > 0) setImportError(errors.join('\n'))
	}

	return (
		<div className='page-grid page-grid--profile'>
			<section className='profile-hero'>
				<div className='profile-avatar' aria-hidden='true'>{(user?.displayName ?? 'D').slice(0, 1).toUpperCase()}</div>
				<div>
					<span className='eyebrow'>{user?.role}</span>
					<h1>{user?.displayName}</h1>
					<p>{user?.username}</p>
				</div>
			</section>

			<section className='profile-xp-card' aria-labelledby='profile-progress-title'>
				<div className='profile-xp-card__header'>
					<div>
						<span className='eyebrow' id='profile-progress-title'>{t('profile.progress')}</span>
						<strong>{xp?.totalXp ?? 0} XP</strong>
					</div>
					<span className='profile-xp-card__level'>{t('profile.level')} {xp?.currentLevel ?? 1}</span>
				</div>
				<div className='profile-progress-track' aria-label={`${progress}%`}><span style={{ width: `${progress}%` }} /></div>
				<div className='profile-xp-card__footer'><span>{t('profile.weeklyXp')}: {xp?.weeklyXp ?? 0}</span><span>{progress}%</span></div>
			</section>

			<section className='profile-pending-card'>
				<div>
					<span className='eyebrow'>{t('theme.title')}</span>
					<h2>{t('theme.pendingTitle')}</h2>
					<p>{t('theme.pendingDescription')}</p>
				</div>
				<span className='profile-pending-card__badge'>{t('theme.pending')}</span>
			</section>

			{user?.role === 'Admin' ? <section className='profile-admin-card' aria-labelledby='profile-backups-title'>
				<div className='profile-card__header'>
					<div><span className='eyebrow'>{t('profile.tools')}</span><h2 id='profile-backups-title'>{t('backups.fullTitle')}</h2></div>
				</div>
				<p>{t('backups.fullDescription')}</p>
				<form className='profile-admin-create' onSubmit={saveBackup}>
					<label>{t('backups.destination')}<input value={backupDestination} onChange={(event) => setBackupDestination(event.target.value)} required /></label>
					<label>{t('backups.retention')}<input type='number' min='0' value={backupRetention} onChange={(event) => setBackupRetention(event.target.value)} required /></label>
					<button className='primary-action' type='submit' disabled={backupBusy}>{t('backups.save')}</button>
					<button className='secondary-action' type='button' disabled={backupBusy} onClick={() => void runFullBackup()}>{t('backups.fullRunNow')}</button>
				</form>
				{backupStatus ? <p className='profile-import-status'>{backupStatus}</p> : null}
			</section> : null}

			{user?.role === 'Admin' ? <section className='profile-admin-card' aria-labelledby='profile-users-title'>
				<div className='profile-card__header'>
					<div>
						<span className='eyebrow'>{t('profile.admin')}</span>
						<h2 id='profile-users-title'>{t('profile.users')}</h2>
					</div>
					<div className='profile-admin-heading-actions'>
						<span className='profile-card__count'>{users.length}</span>
						<button className='secondary-action profile-admin-toggle' type='button' aria-expanded={createUserOpen} onClick={() => setCreateUserOpen((open) => !open)}>{createUserOpen ? t('common.cancel') : t('profile.createUser')}</button>
					</div>
				</div>
				{createUserOpen ? <form className='profile-admin-create' onSubmit={submitCreateUser}>
					<label>{t('auth.username')}<input required minLength={3} value={newUsername} onChange={(event) => setNewUsername(event.target.value)} /></label>
					<label>{t('auth.displayName')}<input required value={newDisplayName} onChange={(event) => setNewDisplayName(event.target.value)} /></label>
					<label>{t('auth.password')}<input required minLength={8} type='password' value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
					<label>{t('profile.role')}<select value={newRole} onChange={(event) => setNewRole(event.target.value)}><option value='User'>{t('profile.userRole')}</option><option value='Admin'>{t('profile.adminRole')}</option></select></label>
					<button className='primary-action' type='submit'>{t('profile.createUser')}</button>
				</form> : null}
				{usersError ? <p className='form-error'>{usersError}</p> : null}
				{usersLoading ? <p className='empty-state'>{t('common.loading')}</p> : null}
				<div className='profile-users-list'>
					{users.map((target) => <article className='profile-user-row' key={target.id}>
						<div className='profile-user-row__identity'><strong>{target.displayName}</strong><span>@{target.username} · {target.role}</span></div>
						<div className='profile-user-row__status'><span className={target.isActive ? 'is-active' : 'is-inactive'}>{target.isActive ? t('profile.active') : t('profile.inactive')}</span></div>
						<div className='profile-user-row__actions'>
							<button className='secondary-action' type='button' aria-expanded={editingUserId === target.id} onClick={() => { setPasswordUserId(null); if (editingUserId === target.id) { setEditingUserId(null) } else { setEditingUserId(target.id); setEditingDisplayName(target.displayName); setEditingRole(target.role) } }}>{editingUserId === target.id ? t('common.cancel') : t('profile.editUser')}</button>
							<button className='secondary-action' type='button' aria-expanded={passwordUserId === target.id} onClick={() => { setEditingUserId(null); if (passwordUserId === target.id) { setPasswordUserId(null) } else { setPasswordUserId(target.id); setResetPassword('') } }}>{t('profile.resetPassword')}</button>
							<button className='link-action' type='button' disabled={target.id === user?.id} onClick={() => void toggleUser(target)}>{target.isActive ? t('profile.deactivate') : t('profile.activate')}</button>
						</div>
						{editingUserId === target.id ? <form className='profile-user-form' onSubmit={submitUpdateUser}>
							<label>{t('auth.displayName')}<input required value={editingDisplayName} onChange={(event) => setEditingDisplayName(event.target.value)} /></label>
							<label>{t('profile.role')}<select value={editingRole} onChange={(event) => setEditingRole(event.target.value)}><option value='User'>{t('profile.userRole')}</option><option value='Admin'>{t('profile.adminRole')}</option></select></label>
							<button className='primary-action' type='submit'>{t('common.save')}</button>
						</form> : null}
						{passwordUserId === target.id ? <form className='profile-user-form' onSubmit={submitResetPassword}>
							<label>{t('profile.newPassword')}<input required minLength={8} type='password' value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /></label>
							<button className='primary-action' type='submit'>{t('profile.savePassword')}</button>
						</form> : null}
					</article>)}
				</div>
			</section> : null}

			<section className='profile-import-card' aria-labelledby='profile-import-title'>
				<div className='profile-card__header'>
					<div>
						<span className='eyebrow'>{t('profile.tools')}</span>
						<h2 id='profile-import-title'>{t('profile.importCsv')}</h2>
					</div>
					<button className='secondary-action profile-admin-toggle' type='button' aria-expanded={importOpen} onClick={() => setImportOpen((open) => !open)}>{importOpen ? t('common.cancel') : t('profile.openImport')}</button>
				</div>
				{importOpen ? <div className='profile-import-body'>
					<p>{t('profile.importDescription')}</p>
					<label>{t('profile.chooseCsv')}<input type='file' accept='.csv,text/csv' onChange={selectImportFile} /></label>
					{importFileName ? <strong>{importFileName} · {importRows.length} {t('profile.rows')}</strong> : null}
					{importRows.length > 0 ? <button className='primary-action' type='button' onClick={() => void importTasksFromCsv()}>{t('profile.importTasks')}</button> : null}
					{importStatus ? <p className='profile-import-status'>{importStatus}</p> : null}
					{importError ? <pre className='form-error profile-import-error'>{importError}</pre> : null}
				</div> : null}
			</section>

			<button className='secondary-action profile-logout' type='button' onClick={() => dispatch(logoutLocal())}>{t('profile.logout')}</button>
		</div>
	)
}

function parseTaskCsv(csv: string): CsvTaskRow[] {
	const records = parseCsvRecords(csv)
	if (records.length < 2) throw new Error('El CSV no contiene tareas.')
	const headers = records.shift()!.map((header) => header.trim())
	const required = ['title', 'description', 'zone', 'scope', 'frequency', 'weekday', 'timesPerWeek', 'everyNDays', 'startDate', 'availableFromTime', 'availableUntilTime', 'recommendedTime', 'timeZoneId', 'assignmentMode', 'assigneeUsername']
	if (required.some((header) => !headers.includes(header))) throw new Error('El CSV no tiene las columnas esperadas.')
	return records
		.filter((record) => record.some((value) => value.trim()))
		.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index]?.trim() ?? ''])) as CsvTaskRow)
		.filter((row) => row.title.length > 0)
}

function parseCsvRecords(csv: string): string[][] {
	const records: string[][] = []
	let record: string[] = []
	let field = ''
	let quoted = false
	for (let index = 0; index < csv.length; index += 1) {
		const char = csv[index]
		if (char === '"') {
			if (quoted && csv[index + 1] === '"') {
				field += '"'
				index += 1
			} else {
				quoted = !quoted
			}
		} else if (char === ',' && !quoted) {
			record.push(field)
			field = ''
		} else if ((char === '\n' || char === '\r') && !quoted) {
			if (char === '\r' && csv[index + 1] === '\n') index += 1
			record.push(field)
			if (record.some((value) => value.length > 0)) records.push(record)
			record = []
			field = ''
		} else {
			field += char
		}
	}
	if (field.length > 0 || record.length > 0) {
		record.push(field)
		records.push(record)
	}
	return records
}

function csvRowToTaskRequest(row: CsvTaskRow, zoneId: string | undefined, users: { id: string; username: string; isActive: boolean }[]): CreateTaskRequest {
	const recurrence = normalizeRecurrence(row.frequency)
	const assignmentMode = row.assignmentMode || (row.scope === 'House' ? 'Anyone' : 'SingleUser')
	const assignee = users.find((user) => user.isActive && user.username.toLocaleLowerCase() === row.assigneeUsername.toLocaleLowerCase())
	return {
		title: row.title,
		description: row.description || null,
		zoneId: zoneId ?? null,
		scope: row.scope || 'Personal',
		taskType: recurrence === 'Manual' ? 'OneTime' : 'Routine',
		schedule: {
			recurrenceType: recurrence,
			startDate: /^\d{4}-\d{2}-\d{2}$/.test(row.startDate) ? row.startDate : localDate(),
			weekday: recurrence === 'Weekday' ? parseWeekday(row.weekday) : null,
			weekOfMonth: null,
			timesPerWeek: recurrence === 'TimesPerWeek' ? Number(row.timesPerWeek || 1) : null,
			everyNDays: recurrence === 'EveryNDays' ? Number(row.everyNDays || 1) : null,
			availableFromTime: row.availableFromTime || null,
			availableUntilTime: row.availableUntilTime || null,
			recommendedTime: row.recommendedTime || null,
			timeZoneId: row.timeZoneId || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
			unavailableVisibilityMode: 'Dimmed',
		},
		assignmentMode,
		assigneeIds: assignee ? [assignee.id] : [],
	}
}

function normalizeRecurrence(value: string) {
	const normalized = value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
	if (normalized === 'daily' || normalized === 'cada dia') return 'Daily'
	if (normalized === 'weekday' || normalized.startsWith('cada ')) return 'Weekday'
	if (normalized === 'timesperweek' || normalized === 'x por semana') return 'TimesPerWeek'
	if (normalized === 'everyndays' || normalized === 'cada x dias') return 'EveryNDays'
	return 'Manual'
}

function parseWeekday(value: string) {
	if (/^\d$/.test(value)) return Number(value)
	const weekdays: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }
	return weekdays[value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] ?? 1
}

function localDate() {
	const date = new Date()
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
