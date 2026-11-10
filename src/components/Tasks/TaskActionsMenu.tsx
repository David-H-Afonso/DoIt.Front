import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '@/i18n'
import TaskIcon, { type TaskIconName } from './TaskIcon'

export type TaskMenuAction = { label: string; icon: TaskIconName; onSelect: () => void; danger?: boolean }

export default function TaskActionsMenu({ title, actions, footer }: { title: string; actions: TaskMenuAction[]; footer: string }) {
	const { t } = useI18n()
	const [open, setOpen] = useState(false)
	const [placement, setPlacement] = useState({ above: false, maxHeight: 420 })
	const id = useId()
	const rootRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const focusLast = useRef(false)

	useLayoutEffect(() => {
		if (!open || !triggerRef.current || !menuRef.current) return
		const trigger = triggerRef.current.getBoundingClientRect()
		const above = trigger.top - 12
		const below = window.innerHeight - trigger.bottom - (window.innerWidth < 960 ? 110 : 16)
		const useAbove = menuRef.current.scrollHeight > below && above > below
		setPlacement({ above: useAbove, maxHeight: Math.max(100, useAbove ? above : below) })
	}, [open])

	useEffect(() => {
		if (!open) return
		const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
		items?.[focusLast.current ? items.length - 1 : 0]?.focus({ preventScroll: true })
		const handleOutside = (event: PointerEvent) => {
			if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
		}
		document.addEventListener('pointerdown', handleOutside)
		return () => document.removeEventListener('pointerdown', handleOutside)
	}, [open])

	const onMenuKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' || event.key === 'Tab') {
			if (event.key === 'Escape') event.preventDefault()
			event.stopPropagation()
			setOpen(false)
			triggerRef.current?.focus()
			return
		}
		const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
		const index = items.indexOf(document.activeElement as HTMLButtonElement)
		const next = event.key === 'ArrowDown' ? (index + 1) % items.length
			: event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length
				: event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null
		if (next !== null) {
			event.preventDefault()
			items[next]?.focus()
		}
	}

	if (actions.length === 0) return null
	return <div className='task-actions-menu' ref={rootRef}>
		<button className='task-icon-button' type='button' ref={triggerRef} aria-label={t('taskAlerts.moreActions').replace('{title}', title)} aria-haspopup='menu' aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { focusLast.current = false; setOpen(!open) }} onKeyDown={(event) => {
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault()
				focusLast.current = event.key === 'ArrowUp'
				setOpen(true)
			}
		}}><TaskIcon name='more' /></button>
		{open ? <div id={id} className='task-actions-menu__popover' role='menu' aria-label={title} ref={menuRef} onKeyDown={onMenuKeyDown} style={{ top: placement.above ? 'auto' : 48, bottom: placement.above ? 48 : 'auto', maxHeight: placement.maxHeight, overflowY: 'auto' }}>
			{actions.map((action) => <button key={action.label} type='button' role='menuitem' tabIndex={-1} className={action.danger ? 'is-danger' : undefined} onClick={() => {
				setOpen(false)
				triggerRef.current?.focus()
				action.onSelect()
			}}><TaskIcon name={action.icon} /><span>{action.label}</span></button>)}
			<p role='none'>{footer}</p>
		</div> : null}
	</div>
}
