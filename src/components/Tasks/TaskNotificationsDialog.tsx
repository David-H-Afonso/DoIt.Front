import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useI18n } from '@/i18n'
import type { NotificationPreferences, TaskNotificationOverride } from '@/models/notifications'
import type { TaskItem } from '@/models/task'
import TaskIcon from './TaskIcon'
import TaskNotificationSettings from './TaskNotificationSettings'

type Props = {
	task: TaskItem
	preferences: NotificationPreferences
	value: TaskNotificationOverride
	canManage: boolean
	onSave: (value: TaskNotificationOverride) => Promise<boolean>
	onClose: () => void
}

export default function TaskNotificationsDialog({ task, preferences, value, canManage, onSave, onClose }: Props) {
	const { t } = useI18n()
	const titleId = useId()
	const taskId = useId()
	const dialogRef = useRef<HTMLDialogElement>(null)
	const closeRef = useRef<HTMLButtonElement>(null)
	const [draft, setDraft] = useState(value)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState(false)
	const dirty = JSON.stringify(draft) !== JSON.stringify(value)

	useEffect(() => {
		const dialog = dialogRef.current!
		const trigger = document.activeElement as HTMLElement | null
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		dialog.showModal()
		closeRef.current?.focus({ preventScroll: true })
		// Reflect native modal isolation in the DOM as well, including the fixed
		// navigation behind it. Preserve any pre-existing inert state on cleanup.
		const background: Array<{ element: HTMLElement; previous: string | null }> = []
		let branch: HTMLElement = dialog
		while (branch.parentElement && branch.parentElement !== document.body) {
			const parent = branch.parentElement
			for (const sibling of parent.children) {
				if (sibling !== branch && sibling instanceof HTMLElement) {
					background.push({ element: sibling, previous: sibling.getAttribute('inert') })
					sibling.setAttribute('inert', '')
				}
			}
			branch = parent
		}
		return () => {
			dialog.close()
			for (const { element, previous } of background) {
				if (previous === null) element.removeAttribute('inert')
				else element.setAttribute('inert', previous)
			}
			document.body.style.overflow = previousOverflow
			if (trigger?.isConnected) trigger.focus({ preventScroll: true })
			else document.querySelector<HTMLButtonElement>('.tasks-notification-filters button[aria-pressed="true"]')?.focus({ preventScroll: true })
		}
	}, [])

	const containFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
		if (event.key !== 'Tab') return
		const dialog = event.currentTarget
		const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
			.filter((element) => element.getClientRects().length > 0)
		if (controls.length === 0) {
			event.preventDefault()
			dialog.focus()
			return
		}
		const first = controls[0]
		const last = controls[controls.length - 1]
		if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
			event.preventDefault()
			const target = event.shiftKey ? last : first
			target.focus()
		}
	}

	const submit = async (event: FormEvent) => {
		event.preventDefault()
		if (busy || !canManage || !dirty) return
		setBusy(true)
		setError(false)
		try {
			if (await onSave(draft)) onClose()
			else setError(true)
		} finally {
			setBusy(false)
		}
	}

	return <dialog className='task-notification-dialog' ref={dialogRef} tabIndex={-1} aria-modal='true' aria-labelledby={titleId} aria-describedby={taskId} onKeyDown={containFocus} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
		<form onSubmit={submit}>
			<header className='task-notification-dialog__header'><div><h2 id={titleId}>{t('notifications.taskSettingsTitle')}</h2><span id={taskId}>{task.title}</span></div><button className='task-icon-button' ref={closeRef} type='button' disabled={busy} onClick={onClose} aria-label={t('common.close')}><TaskIcon name='close' /></button></header>
			<div className='task-notification-dialog__body'><TaskNotificationSettings task={task} preferences={preferences} value={draft} onChange={setDraft} readOnly={!canManage} busy={busy} />{error ? <p className='form-error' role='alert'>{t('taskAlerts.saveError')}</p> : null}</div>
			<footer className='task-notification-dialog__footer'><button className='task-text-button' type='button' disabled={busy} onClick={onClose}>{t(canManage ? 'common.cancel' : 'common.close')}</button>{canManage ? <button className='task-primary-button' type='submit' disabled={!dirty || busy}>{t(busy ? 'common.loading' : 'taskAlerts.saveChanges')}</button> : null}</footer>
		</form>
	</dialog>
}
