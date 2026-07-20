type DoItLogoProps = {
	className?: string
	compact?: boolean
}

export default function DoItLogo({ className, compact = false }: DoItLogoProps) {
	const classes = ['doit-logo', compact ? 'doit-logo--compact' : '', className ?? ''].filter(Boolean).join(' ')

	return (
		<span className={classes} role='img' aria-label='DoIt'>
			<img className='doit-logo__mark' src='./vite.svg' alt='' />
			{compact ? null : <span className='doit-logo__wordmark'><span>Do</span><strong>It</strong></span>}
		</span>
	)
}
