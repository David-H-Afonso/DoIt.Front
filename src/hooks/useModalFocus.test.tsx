import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { useModalFocus } from './useModalFocus'

function Dialog({ onClose }: { onClose: () => void }) {
	const ref = useRef<HTMLElement>(null)
	useModalFocus(ref, onClose)
	return <section ref={ref} role='dialog' aria-label='Example' tabIndex={-1}><input aria-label='Title' /><button type='button' onClick={onClose}>Close</button></section>
}

function Example() {
	const [open, setOpen] = useState(false)
	return <div><button type='button' onClick={() => setOpen(true)}>Open</button><aside inert>Already isolated</aside>{open ? <Dialog onClose={() => setOpen(false)} /> : null}</div>
}

describe('useModalFocus', () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 44, height: 44 }] as unknown as DOMRectList)
	})
	afterEach(() => {
		vi.restoreAllMocks()
		document.body.style.overflow = ''
	})

	it('isolates the background, wraps both keyboard directions and restores focus on Escape', () => {
		document.body.style.overflow = 'clip'
		render(<Example />)
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()
		fireEvent.click(trigger)
		const title = screen.getByLabelText('Title')
		const close = screen.getByRole('button', { name: 'Close' })
		expect(title).toHaveFocus()
		expect(trigger).toHaveAttribute('inert')
		expect(document.body.style.overflow).toBe('hidden')
		expect(title.getClientRects().length).toBe(1)
		fireEvent.keyDown(title, { key: 'Tab', shiftKey: true })
		expect(close).toHaveFocus()
		fireEvent.keyDown(close, { key: 'Tab' })
		expect(title).toHaveFocus()
		fireEvent.keyDown(title, { key: 'Escape' })
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
		expect(trigger).not.toHaveAttribute('inert')
		expect(screen.getByText('Already isolated')).toHaveAttribute('inert')
		expect(document.body.style.overflow).toBe('clip')
	})

	it('uses the latest dismiss callback without reopening or refocusing a sheet', () => {
		const first = vi.fn()
		const next = vi.fn()
		const { rerender } = render(<Dialog onClose={first} />)
		const close = screen.getByRole('button', { name: 'Close' })
		close.focus()
		rerender(<Dialog onClose={next} />)
		expect(close).toHaveFocus()
		fireEvent.keyDown(close, { key: 'Escape' })
		expect(first).not.toHaveBeenCalled()
		expect(next).toHaveBeenCalledOnce()
	})
})
