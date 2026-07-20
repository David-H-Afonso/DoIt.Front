type DoItLogoProps = {
	className?: string
	compact?: boolean
}

export default function DoItLogo({ className, compact = false }: DoItLogoProps) {
	const classes = ['doit-logo', compact ? 'doit-logo--compact' : '', className ?? ''].filter(Boolean).join(' ')

	return (
		<span className={classes} role='img' aria-label='DoIt'>
			<svg className='doit-logo__mark' viewBox='0 0 32 32' aria-hidden='true'>
				<rect x='2' y='2' width='28' height='28' rx='9' fill='currentColor' stroke='none' />
				<path d='m9 16 4.2 4.2L23 10.5' fill='none' stroke='var(--doit-logo-check, #fff)' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
			</svg>
			{compact ? null : <span className='doit-logo__wordmark'><span>Do</span><strong>It</strong></span>}
		</span>
	)
}
