import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useToast } from '@/components/Toasts/useToast'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { acceptProposal, rejectProposal } from '@/store/features/proposals/proposalsSlice'
import { markNotificationRead } from '@/store/features/notifications/notificationsSlice'
import { fetchNow } from '@/store/features/now/nowSlice'
import { fetchTasks } from '@/store/features/tasks/tasksSlice'
import { OccurrenceService } from '@/services'
import type { NotificationInboxItem } from '@/models/notifications'
import type { TaskProposal } from '@/models/proposal'

export default function InboxPage() {
	const { t, locale } = useI18n()
	const dispatch = useAppDispatch()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const { showToast } = useToast()
	const notifications = useAppSelector((state) => state.notifications)
	const proposals = useAppSelector((state) => state.proposals.items)
	const currentUserId = useAppSelector((state) => state.auth.user?.id)
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const [unreadOnly, setUnreadOnly] = useState(false)
	const [selectedProposalId, setSelectedProposalId] = useState<string | null>(searchParams.get('proposalId'))
	const groupKey = searchParams.get('groupKey')
	const visibleNotifications = useMemo(() => {
		const filtered = unreadOnly ? notifications.items.filter((item) => !item.isRead) : notifications.items
		if (!groupKey) return filtered
		return filtered.filter((item) => belongsToPushGroup(item.dueAtUtc, groupKey))
	}, [groupKey, notifications.items, unreadOnly])
	const grouped = groupByDate(visibleNotifications, locale)
	const selectedProposal = proposals.find((proposal) => proposal.id === selectedProposalId)

	const openNotification = (item: NotificationInboxItem) => {
		if (!item.isRead) void dispatch(markNotificationRead(item.id))
		const data = item.data ?? {}
		const proposalId = typeof data.proposalId === 'string' ? data.proposalId : item.sourceType.startsWith('TaskProposal') ? item.sourceId : null
		if (proposalId) {
			setSelectedProposalId(proposalId)
			return
		}
		if (typeof data.occurrenceId === 'string') {
			navigate(`/now?occurrenceId=${encodeURIComponent(data.occurrenceId)}`)
			return
		}
		if (item.url) navigate(item.url.startsWith('/') ? item.url : `/${item.url}`)
	}

	const completeNotificationTask = async (item: NotificationInboxItem) => {
		const occurrenceId = getOccurrenceId(item)
		if (!accessToken || !occurrenceId) return
		try {
			await OccurrenceService.apply(accessToken, occurrenceId, 'done')
			if (!item.isRead) void dispatch(markNotificationRead(item.id))
			dispatch(fetchTasks())
			dispatch(fetchNow())
			showToast({ type: 'success', title: t('inbox.taskCompleted') })
		} catch {
			showToast({ type: 'error', title: t('toasts.error') })
		}
	}

	const resolveProposal = async (proposal: TaskProposal, action: 'accept' | 'reject') => {
		const result = await dispatch(action === 'accept' ? acceptProposal(proposal.id) : rejectProposal(proposal.id))
		if ((action === 'accept' ? acceptProposal : rejectProposal).fulfilled.match(result)) {
			showToast({ type: 'success', title: t(`inbox.proposal${action === 'accept' ? 'Accepted' : 'Rejected'}`) })
		}
	}

	return <div className='page-grid inbox-page'>
		<section className='inbox-heading'>
			<div><span className='eyebrow'>{t('notifications.kicker')}</span><h1>{t('notifications.title')}</h1><p>{t('notifications.inboxDescription')}</p></div>
			<div className='inbox-tabs' role='tablist'>
				<button type='button' className={!unreadOnly ? 'is-active' : undefined} aria-selected={!unreadOnly} onClick={() => setUnreadOnly(false)}>{t('notifications.all')}</button>
				<button type='button' className={unreadOnly ? 'is-active' : undefined} aria-selected={unreadOnly} onClick={() => setUnreadOnly(true)}>{t('notifications.unread')} {notifications.items.filter((item) => !item.isRead).length > 0 ? `(${notifications.items.filter((item) => !item.isRead).length})` : ''}</button>
			</div>
		</section>
		{notifications.error ? <p className='form-error'>{notifications.error}</p> : null}
		{notifications.loading ? <p className='empty-state'>{t('common.loading')}</p> : null}
		{!notifications.loading && visibleNotifications.length === 0 ? <p className='empty-state'>{t('notifications.empty')}</p> : null}
		<div className='inbox-layout'>
			<section className='inbox-list' aria-label={t('notifications.title')}>
				{grouped.map(([date, items]) => <div className='inbox-day' key={date}><h2>{date}</h2>{items.map((item) => <article key={item.id} className={`inbox-item${item.isRead ? '' : ' is-unread'}`}>
					<button type='button' className='inbox-item__open' onClick={() => openNotification(item)}><span className='inbox-item__marker' aria-hidden='true' /><span className='inbox-item__copy'><strong>{item.title}</strong><span>{item.body}</span><small>{formatTime(item.createdAt, locale)}</small></span><span aria-hidden='true' className='inbox-item__arrow'>›</span></button>
					{getOccurrenceId(item) ? <button type='button' className='secondary-action inbox-item__complete' onClick={() => void completeNotificationTask(item)}>{t('inbox.completeTask')}</button> : null}
				</article>)}</div>)}
			</section>
			<section className='proposal-panel' aria-labelledby='proposal-panel-title'>
				<header><div><span className='eyebrow'>{t('inbox.proposalsKicker')}</span><h2 id='proposal-panel-title'>{t('inbox.proposals')}</h2></div><span className='profile-pending-card__badge'>{proposals.filter((proposal) => proposal.status === 'Pending').length}</span></header>
				{proposals.length === 0 ? <p className='empty-state'>{t('inbox.noProposals')}</p> : proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} selected={proposal.id === selectedProposalId} canResolve={proposal.targetUserId === currentUserId} onSelect={() => setSelectedProposalId(proposal.id)} onResolve={(action) => void resolveProposal(proposal, action)} t={t} />)}
			</section>
		</div>
		{selectedProposal && !proposals.some((proposal) => proposal.id === selectedProposal.id) ? null : null}
	</div>
}

function ProposalCard({ proposal, selected, canResolve, onSelect, onResolve, t }: { proposal: TaskProposal; selected: boolean; canResolve: boolean; onSelect: () => void; onResolve: (action: 'accept' | 'reject') => void; t: (key: string) => string }) {
	const draft = proposal.draft
	return <article className={`proposal-card${selected ? ' is-selected' : ''}`}>
		<button type='button' className='proposal-card__heading' onClick={onSelect}><span className='proposal-card__icon'>↗</span><span><strong>{draft.title}</strong><small>{t(`inbox.status.${proposal.status}`)}</small></span><span aria-hidden='true'>⌄</span></button>
		{selected ? <div className='proposal-card__details'><p>{draft.description || t('inbox.noDescription')}</p><dl><div><dt>{t('quickCreate.scope')}</dt><dd>{draft.scope || '—'}</dd></div><div><dt>{t('quickCreate.recurrence')}</dt><dd>{draft.schedule?.recurrenceType || t('quickCreate.manual')}</dd></div><div><dt>{t('quickCreate.startDate')}</dt><dd>{draft.schedule?.startDate || '—'}</dd></div></dl>{proposal.status === 'Pending' && canResolve ? <div className='proposal-card__actions'><button type='button' className='secondary-action' onClick={() => onResolve('reject')}>{t('inbox.reject')}</button><button type='button' className='primary-action' onClick={() => onResolve('accept')}>{t('inbox.accept')}</button></div> : proposal.resultingTaskId ? <Link className='inline-link' to={`/tasks?taskId=${proposal.resultingTaskId}`}>{t('inbox.openTask')}</Link> : null}</div> : null}
	</article>
}

function groupByDate(items: NotificationInboxItem[], locale: string) {
	const groups = new Map<string, NotificationInboxItem[]>()
	for (const item of items) {
		const key = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(item.createdAt))
		groups.set(key, [...(groups.get(key) ?? []), item])
	}
	return [...groups.entries()]
}

function formatTime(value: string, locale: string) {
	return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function belongsToPushGroup(value: string, groupKey: string) {
	const bucket = Number(groupKey.split(':')[2])
	if (!Number.isFinite(bucket)) return false
	return Math.floor(new Date(value).getTime() / 1000 / 120) === bucket
}

function getOccurrenceId(item: NotificationInboxItem) {
	if (!item.sourceType.startsWith('Task') || item.sourceType === 'TaskCompleted') return null
	const occurrenceId = item.data?.occurrenceId
	return typeof occurrenceId === 'string' ? occurrenceId : null
}
