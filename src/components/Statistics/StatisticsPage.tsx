import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import type { StatisticsOccurrence, StatisticsResponse, StatisticsSummary } from '@/models/statistics'
import { StatisticsService } from '@/services'
import { useAppSelector } from '@/store/hooks'

type Period = 'day' | 'week' | 'month'

export default function StatisticsPage() {
	const { t } = useI18n()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const [period, setPeriod] = useState<Period>('week')
	const [groupBy, setGroupBy] = useState<Period>('day')
	const [value, setValue] = useState<StatisticsResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const range = useMemo(() => getRange(period), [period])

	useEffect(() => {
		if (!accessToken) return
		setLoading(true)
		StatisticsService.get(accessToken, range.from, range.to, groupBy)
			.then(setValue)
			.catch((reason: Error) => setError(reason.message))
			.finally(() => setLoading(false))
	}, [accessToken, groupBy, range.from, range.to])

	return (
		<div className='page-grid statistics-page'>
			<section className='statistics-header'>
				<div>
					<span className='eyebrow'>{t('statistics.kicker')}</span>
					<h1>{t('statistics.title')}</h1>
				</div>
				<div className='statistics-controls'>
					{(['day', 'week', 'month'] as Period[]).map((option) => (
						<button key={option} type='button' className={period === option ? 'is-active' : undefined} onClick={() => setPeriod(option)}>{t(`statistics.period.${option}`)}</button>
					))}
				</div>
			</section>

			<div className='statistics-view-controls'>
				<span>{t('statistics.groupBy')}</span>
				{(['day', 'week', 'month'] as Period[]).map((option) => (
					<button key={option} type='button' className={groupBy === option ? 'is-active' : undefined} onClick={() => setGroupBy(option)}>{t(`statistics.period.${option}`)}</button>
				))}
			</div>

			{error ? <div className='form-error'>{error}</div> : null}
			{loading ? <p className='empty-state'>{t('common.loading')}</p> : null}
			{value ? <>
				<SummaryGrid summary={value.summary} />
				<section className='statistics-panel'>
					<header className='zone-panel__header'><h2>{t('statistics.timeline')}</h2><span>{formatRange(value.from, value.to)}</span></header>
					<div className='statistics-buckets'>
						{value.buckets.map((bucket) => <BucketRow key={bucket.key} bucket={bucket} />)}
					</div>
				</section>
				<section className='statistics-panel'>
					<header className='zone-panel__header'><h2>{t('statistics.byTask')}</h2><span>{value.tasks.length}</span></header>
					<div className='statistics-task-list'>
						{value.tasks.map((task) => <TaskRow key={task.taskId} task={task} />)}
					</div>
				</section>
			</> : null}
		</div>
	)
}

function SummaryGrid({ summary }: { summary: StatisticsSummary }) {
	const { t } = useI18n()
	const items = [
		[t('statistics.completed'), summary.completed],
		[t('statistics.early'), summary.completedEarly],
		[t('statistics.late'), summary.completedLate],
		[t('statistics.overdue'), summary.completedOverdue],
		[t('statistics.missed'), summary.missed],
		[t('statistics.rate'), `${summary.completionRate}%`],
	]
	return <section className='statistics-summary'>{items.map(([label, value]) => <div className='statistics-card' key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
}

function BucketRow({ bucket }: { bucket: { key: string; summary: StatisticsSummary } }) {
	return <div className='statistics-bucket'><strong>{bucket.key}</strong><span>{bucket.summary.completed}/{bucket.summary.scheduled}</span><em>{bucket.summary.completionRate}%</em></div>
}

function TaskRow({ task }: { task: { title: string; zoneName?: string | null; summary: StatisticsSummary; occurrences: StatisticsOccurrence[] } }) {
	const { t } = useI18n()
	const lastCompleted = [...task.occurrences].filter((occurrence) => occurrence.completedAt).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))[0]
	return <article className='statistics-task'>
		<div className='statistics-task__heading'><div><strong>{task.title}</strong><span>{task.zoneName ?? t('statistics.noZone')}</span></div><b>{task.summary.completionRate}%</b></div>
		<div className='statistics-task__bar'><span style={{ width: `${Math.min(task.summary.completionRate, 100)}%` }} /></div>
		<div className='statistics-task__meta'><span>{task.summary.completed} {t('statistics.timesCompleted')}</span><span>{task.summary.completedOverdue} {t('statistics.overdue').toLowerCase()}</span><span>{lastCompleted ? new Date(lastCompleted.completedAt!).toLocaleString() : t('statistics.noCompletions')}</span></div>
		{task.occurrences.length > 0 ? <details className='statistics-task__details'>
			<summary>{t('statistics.viewDetails')}</summary>
			<div className='statistics-occurrences'>
				{task.occurrences.map((occurrence) => <div className='statistics-occurrence' key={`${occurrence.occurrenceId ?? occurrence.scheduledDate}-${occurrence.completedAt ?? occurrence.status}`}>
					<strong>{new Date(`${occurrence.scheduledDate}T00:00:00`).toLocaleDateString()}</strong>
					<span>{occurrence.completedAt ? new Date(occurrence.completedAt).toLocaleString() : t(`statistics.status.${occurrence.status}`)}</span>
					<em>{t(`statistics.timing.${occurrence.timing}`)}{occurrence.differenceMinutes ? ` · ${formatDifference(occurrence.differenceMinutes)}` : ''}</em>
				</div>)}
			</div>
		</details> : null}
	</article>
}

function formatDifference(minutes: number) {
	const absolute = Math.abs(minutes)
	if (absolute >= 1440) return `${Math.floor(absolute / 1440)}d`
	if (absolute >= 60) return `${Math.floor(absolute / 60)}h ${absolute % 60}m`
	return `${absolute}m`
}

function getRange(period: Period) {
	const to = new Date()
	if (period === 'month') {
		return { from: toLocalDate(new Date(to.getFullYear(), to.getMonth(), 1)), to: toLocalDate(new Date(to.getFullYear(), to.getMonth() + 1, 0)) }
	}
	const from = new Date(to)
	from.setDate(from.getDate() - (period === 'day' ? 0 : 6))
	return { from: toLocalDate(from), to: toLocalDate(to) }
}

function toLocalDate(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatRange(from: string, to: string) {
	return `${new Date(`${from}T00:00:00`).toLocaleDateString()} - ${new Date(`${to}T00:00:00`).toLocaleDateString()}`
}
