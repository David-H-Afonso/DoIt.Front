export function formatScheduleTime(value: string | null | undefined, sourceTimeZone: string | null | undefined, referenceDate?: string | null) {
	if (!value) {
		return ''
	}

	const targetTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'
	if (!sourceTimeZone || sourceTimeZone === targetTimeZone) {
		return value.slice(0, 5)
	}

	const date = referenceDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
	const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
	const sourceWallTime = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hours, minutes)
	let instant = sourceWallTime

	for (let attempt = 0; attempt < 3; attempt += 1) {
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone: sourceTimeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		}).formatToParts(new Date(instant))
		const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
		const observedWallTime = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'))
		instant = sourceWallTime - (observedWallTime - instant)
	}

	return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant))
}
