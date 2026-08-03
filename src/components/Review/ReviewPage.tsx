import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import type { ReviewTask } from '@/models/review'
import { OccurrenceService } from '@/services'
import { useToast } from '@/components/Toasts/useToast'
import { fetchReview } from '@/store/features/review/reviewSlice'
import { setXp } from '@/store/features/xp/xpSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { formatInstant } from '@/utils/scheduleTime'

export default function ReviewPage() {
	const { t, formatDate } = useI18n()
	const dispatch = useAppDispatch()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const { value, loading, error } = useAppSelector((state) => state.review)
	const [selectedDate, setSelectedDate] = useState(getLocalDate)
	const [completingOccurrenceId, setCompletingOccurrenceId] = useState<string | null>(null)
	const { showToast } = useToast()

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
					<ReviewSection
						title={t('review.missed')}
						tasks={value.missed}
						onComplete={completeMissed}
						completingOccurrenceId={completingOccurrenceId}
					/>
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

	async function completeMissed(task: ReviewTask) {
		if (!accessToken || completingOccurrenceId) {
			return
		}

		setCompletingOccurrenceId(task.occurrenceId)
		try {
			const response = await OccurrenceService.completeRetroactive(accessToken, task.occurrenceId, selectedDate)
			if (response.userXp) {
				dispatch(setXp(response.userXp))
			}
			await dispatch(fetchReview(selectedDate)).unwrap()
			showToast({ type: 'success', title: t('toasts.done') })
		} catch {
			showToast({ type: 'error', title: t('toasts.error') })
		} finally {
			setCompletingOccurrenceId(null)
		}
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

function ReviewSection({ title, tasks, onComplete, completingOccurrenceId }: {
	title: string
	tasks: ReviewTask[]
	onComplete?: (task: ReviewTask) => void
	completingOccurrenceId?: string | null
}) {
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
						{task.taskCreatedAt ? <small>{t('review.created')}: {new Date(task.taskCreatedAt).toLocaleDateString()} {task.completedAt ? ` · ${t('review.completed')}: ${formatInstant(task.completedAt)}` : ''}</small> : null}
					</div>
					{onComplete ? <button
						className='secondary-action task-action task-action--compact'
						type='button'
						disabled={completingOccurrenceId !== null}
						onClick={() => void onComplete(task)}
					>
						{completingOccurrenceId === task.occurrenceId ? t('common.loading') : t('review.completeOnDate')}
					</button> : null}
					{task.xpEarned > 0 ? <small>+{task.xpEarned} XP</small> : null}
				</article>
			))}
		</section>
	)
}
