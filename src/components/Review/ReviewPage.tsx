import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import type { ReviewTask } from '@/models/review'
import { fetchReview } from '@/store/features/review/reviewSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export default function ReviewPage() {
	const { t, formatDate } = useI18n()
	const dispatch = useAppDispatch()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const { value, loading, error } = useAppSelector((state) => state.review)
	const [selectedDate, setSelectedDate] = useState(getLocalDate)

	useEffect(() => {
		if (accessToken) {
			dispatch(fetchReview(selectedDate))
		}
	}, [accessToken, dispatch, selectedDate])

	const date = value?.date ? new Date(`${value.date}T00:00:00`) : new Date()

	return (
		<div className='page-grid review-page'>
			<section className='review-header'>
				<h1>{formatDate(date)}</h1>
				<div className='review-date-controls'>
					<button type='button' onClick={() => moveDate(-1)} aria-label={t('review.previous')}>‹</button>
					<input aria-label={t('review.selectDate')} type='date' value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
					<button type='button' onClick={() => moveDate(1)} aria-label={t('review.next')}>›</button>
				</div>
				<strong className='review-xp'>{value?.xpEarned ?? 0} XP</strong>
			</section>
			{error ? <div className='form-error'>{error}</div> : null}
			{loading ? <p className='empty-state'>{t('common.loading')}</p> : null}
			{!loading && !value ? <p className='empty-state'>{t('review.empty')}</p> : null}
			{value ? (
				<>
					<ReviewSection title={t('review.createdSection')} tasks={value.created ?? []} />
					<ReviewSection title={t('review.done')} tasks={value.done} />
					<ReviewSection title={t('review.missed')} tasks={value.missed} />
					<ReviewSection title={t('review.notApplicable')} tasks={value.notApplicable} />
					<ReviewSection title={t('review.pending')} tasks={value.pending} />
				</>
			) : null}
		</div>
	)

	function moveDate(days: number) {
		const next = new Date(`${selectedDate}T00:00:00`)
		next.setDate(next.getDate() + days)
		setSelectedDate(formatLocalDate(next))
	}
}

function getLocalDate() {
	return formatLocalDate(new Date())
}

function formatLocalDate(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function ReviewSection({ title, tasks }: { title: string; tasks: ReviewTask[] }) {
	const { t } = useI18n()
	if (tasks.length === 0) {
		return null
	}

	return (
		<section className='zone-panel'>
			<header className='zone-panel__header'>
				<h2>{title}</h2>
				<span>{tasks.length}</span>
			</header>
			{tasks.map((task) => (
				<article className='task-row task-row--review' key={task.occurrenceId}>
					<div className='task-row__main'>
						<strong>{task.title}</strong>
						<span>{task.completedBy ?? task.zoneName ?? task.status}</span>
						{task.taskCreatedAt ? <small>{t('review.created')}: {new Date(task.taskCreatedAt).toLocaleDateString()} {task.completedAt ? ` · ${t('review.completed')}: ${new Date(task.completedAt).toLocaleString()}` : ''}</small> : null}
					</div>
					{task.xpEarned > 0 ? <small>+{task.xpEarned} XP</small> : null}
				</article>
			))}
		</section>
	)
}
