import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastInput } from './toastContext'

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([])

	const dismissToast = useCallback((id: string) => {
		setToasts((current) => current.filter((toast) => toast.id !== id))
	}, [])

	const showToast = useCallback(
		(input: ToastInput) => {
			const id = crypto.randomUUID()
			const toast: Toast = { ...input, id, type: input.type ?? 'info' }
			setToasts((current) => [toast, ...current].slice(0, 3))

			if (input.durationMs !== 0) {
				window.setTimeout(() => dismissToast(id), input.durationMs ?? 4000)
			}
		},
		[dismissToast]
	)

	const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className='toast-viewport' aria-live='polite' aria-label='Notifications'>
				{toasts.map((toast) => (
					<div className={`toast toast--${toast.type}`} key={toast.id} role='status'>
						<div className='toast__icon' aria-hidden='true' />
						<div className='toast__body'>
							<strong>{toast.title}</strong>
						{toast.description ? <p>{toast.description}</p> : null}
					</div>
					{toast.actionLabel && toast.onAction ? (
						<button className='toast__action' type='button' onClick={() => {
							dismissToast(toast.id)
							void toast.onAction?.()
						}}>
							{toast.actionLabel}
						</button>
					) : null}
						<button className='toast__close' type='button' aria-label='Dismiss notification' onClick={() => dismissToast(toast.id)}>
							×
						</button>
						<div className='toast__progress' />
					</div>
				))}
			</div>
		</ToastContext.Provider>
	)
}
