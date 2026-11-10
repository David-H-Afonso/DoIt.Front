import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

it('replaces grouped completion feedback without dropping unrelated notifications or the latest Undo', async () => {
	const firstUndo = vi.fn()
	const lastUndo = vi.fn()
	function Controls() {
		const { showToast } = useToast()
		return <>
			<button onClick={() => showToast({ groupKey: 'completion', title: 'First task completed', actionLabel: 'Undo', onAction: firstUndo, durationMs: 0 })}>First</button>
			<button onClick={() => showToast({ title: 'Unrelated reminder', durationMs: 0 })}>Other</button>
			<button onClick={() => showToast({ groupKey: 'completion', title: 'Latest task completed', actionLabel: 'Undo', onAction: lastUndo, durationMs: 0 })}>Latest</button>
		</>
	}
	render(<ToastProvider><Controls /></ToastProvider>)
	await userEvent.click(screen.getByRole('button', { name: 'First' }))
	await userEvent.click(screen.getByRole('button', { name: 'Other' }))
	await userEvent.click(screen.getByRole('button', { name: 'Latest' }))
	expect(screen.queryByText('First task completed')).not.toBeInTheDocument()
	expect(screen.getByText('Unrelated reminder')).toBeInTheDocument()
	expect(screen.getByText('Latest task completed')).toBeInTheDocument()
	await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
	expect(lastUndo).toHaveBeenCalledOnce()
	expect(firstUndo).not.toHaveBeenCalled()
})
