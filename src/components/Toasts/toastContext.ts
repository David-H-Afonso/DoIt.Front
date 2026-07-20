import { createContext } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type ToastInput = {
	type?: ToastType
	title: string
	description?: string
	actionLabel?: string
	onAction?: () => void
	durationMs?: number
}

export type Toast = ToastInput & { id: string; type: ToastType }

export type ToastContextValue = {
	showToast: (toast: ToastInput) => void
	dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
