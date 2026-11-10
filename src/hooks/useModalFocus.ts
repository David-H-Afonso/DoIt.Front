import { useEffect, useRef, type RefObject } from 'react'

const focusable = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'

/** Contain keyboard/scroll interaction in an app-owned sheet and restore its trigger. */
export function useModalFocus(ref: RefObject<HTMLElement | null>, onDismiss: () => void, initialFocus = 'input') {
	const dismissRef = useRef(onDismiss)
	useEffect(() => { dismissRef.current = onDismiss }, [onDismiss])

	useEffect(() => {
		const modal = ref.current
		if (!modal) return
		const trigger = document.activeElement as HTMLElement | null
		const previousOverflow = document.body.style.overflow
		const background: Array<{ element: HTMLElement; previous: string | null }> = []
		let branch: HTMLElement = modal
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
		document.body.style.overflow = 'hidden'
		;(modal.querySelector<HTMLElement>(initialFocus) ?? modal).focus({ preventScroll: true })
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				dismissRef.current()
				return
			}
			if (event.key !== 'Tab') return
			const controls = [...modal.querySelectorAll<HTMLElement>('*')].filter(element => element.matches(focusable) && element.getClientRects().length > 0)
			const first = controls[0]
			const last = controls[controls.length - 1]
			if (!first || event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last || !modal.contains(document.activeElement)) {
				event.preventDefault()
				;(event.shiftKey ? last : first)?.focus()
			}
		}
		document.addEventListener('keydown', handleKey)
		return () => {
			document.removeEventListener('keydown', handleKey)
			for (const { element, previous } of background) {
				if (previous === null) element.removeAttribute('inert')
				else element.setAttribute('inert', previous)
			}
			document.body.style.overflow = previousOverflow
			if (trigger?.isConnected) trigger.focus({ preventScroll: true })
		}
	}, [initialFocus, ref])
}
