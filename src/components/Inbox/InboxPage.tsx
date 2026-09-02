import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useToast } from '@/components/Toasts/useToast'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { acceptProposal, rejectProposal } from '@/store/features/proposals/proposalsSlice'
import { markAllNotificationsRead, markNotificationRead } from '@/store/features/notifications/notificationsSlice'
import { fetchNow } from '@/store/features/now/nowSlice'
import { fetchTasks } from '@/store/features/tasks/tasksSlice'
import { OccurrenceService } from '@/services'
import { isCountedNotification, type NotificationInboxItem } from '@/models/notifications'
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
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
	const [proposalsOpen, setProposalsOpen] = useState(true)
	const groupKey = searchParams.get('groupKey')
	const visibleNotifications = useMemo(() => {
		const filtered = unreadOnly
			? notifications.items.filter((item) => !item.isRead && isCountedNotification(item))
			: notifications.items
		if (!groupKey) return filtered
		return filtered.filter((item) => belongsToPushGroup(item.dueAtUtc, groupKey))
	}, [groupKey, notifications.items, unreadOnly])
	const selectedProposal = proposals.find((proposal) => proposal.id === selectedProposalId)
	const unreadCount = notifications.items.filter((item) => !item.isRead && isCountedNotification(item)).length
	const hasUnreadItems = notifications.items.some((item) => !item.isRead)
	const sections = groupByCategory(visibleNotifications, t)

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

	const markAllRead = async () => {
		if (!hasUnreadItems) return
		try {
			await dispatch(markAllNotificationsRead()).unwrap()
			showToast({ type: 'success', title: t('inbox.allMarkedRead') })
		} catch {
			showToast({ type: 'error', title: t('toasts.error') })
		}
	}

	return <div className='page-grid inbox-page'>
		<section className='inbox-toolbar' aria-label={t('notifications.title')}>
			<div className='inbox-tabs' role='tablist'>
				<button type='button' className={!unreadOnly ? 'is-active' : undefined} aria-selected={!unreadOnly} onClick={() => setUnreadOnly(false)}>{t('notifications.all')}</button>
				<button type='button' className={unreadOnly ? 'is-active' : undefined} aria-selected={unreadOnly} onClick={() => setUnreadOnly(true)}>{t('notifications.unread')} {unreadCount > 0 ? `(${unreadCount})` : ''}</button>
			</div>
			<button type='button' className='link-action inbox-mark-all' onClick={() => void markAllRead()} disabled={!hasUnreadItems}>{t('inbox.markAllRead')}</button>
		</section>
		{notifications.error ? <p className='form-error'>{notifications.error}</p> : null}
		{notifications.loading ? <p className='empty-state'>{t('common.loading')}</p> : null}
		{!notifications.loading && visibleNotifications.length === 0 ? <p className='empty-state'>{t('notifications.empty')}</p> : null}
		<div className='inbox-layout'>
			<section className='inbox-list' aria-label={t('notifications.title')}>
				{sections.map((section) => {
					const isCollapsed = collapsedSections.has(section.key)
					return <section className='inbox-section' key={section.key} aria-labelledby={`inbox-section-${section.key}`}>
						<header className='inbox-section__header'><button type='button' aria-expanded={!isCollapsed} aria-controls={`inbox-section-content-${section.key}`} onClick={() => setCollapsedSections((current) => { const next = new Set(current); if (next.has(section.key)) next.delete(section.key); else next.add(section.key); return next })}><span><SectionIcon name={section.icon} /><h2 id={`inbox-section-${section.key}`}>{section.label}</h2></span><span className='inbox-section__header-meta'><small>{section.items.length}</small><span aria-hidden='true' className={`inbox-section__chevron${isCollapsed ? '' : ' is-open'}`}>⌄</span></span></button></header>
						{!isCollapsed ? <div id={`inbox-section-content-${section.key}`}>
							{groupByDate(section.items, locale).map(([date, items]) => <div className='inbox-day' key={date}><h3>{date}</h3>{items.map((item) => <article key={item.id} className={`inbox-item${item.isRead ? '' : ' is-unread'}`}>
								<button type='button' className='inbox-item__open' onClick={() => openNotification(item)}><span className='inbox-item__marker' aria-hidden='true' /><span className='inbox-item__copy'><strong>{item.title}</strong><span>{item.body}</span><small>{formatTime(item.createdAt, locale)}</small></span><span aria-hidden='true' className='inbox-item__arrow'>›</span></button>
								{getOccurrenceId(item) ? <button type='button' className='secondary-action inbox-item__complete' onClick={() => void completeNotificationTask(item)}>{t('inbox.completeTask')}</button> : null}
							</article>)}</div>)}
						</div> : null}
					</section>
				})}
			</section>
			<section className='proposal-panel' aria-labelledby='proposal-panel-title'>
				<header><button type='button' className='proposal-panel__toggle' aria-expanded={proposalsOpen} aria-controls='inbox-proposals-content' onClick={() => setProposalsOpen((open) => !open)}><span><span className='eyebrow'>{t('inbox.proposalsKicker')}</span><h2 id='proposal-panel-title'>{t('inbox.proposals')}</h2></span><span className='proposal-panel__header-meta'><span className='profile-pending-card__badge'>{proposals.filter((proposal) => proposal.status === 'Pending').length}</span><span aria-hidden='true' className={`inbox-section__chevron${proposalsOpen ? ' is-open' : ''}`}>⌄</span></span></button></header>
				{proposalsOpen ? <div id='inbox-proposals-content'>{proposals.length === 0 ? <p className='empty-state'>{t('inbox.noProposals')}</p> : proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} selected={proposal.id === selectedProposalId} canResolve={proposal.targetUserId === currentUserId} onSelect={() => setSelectedProposalId(proposal.id)} onResolve={(action) => void resolveProposal(proposal, action)} t={t} />)}</div> : null}
			</section>
		</div>
		{selectedProposal && !proposals.some((proposal) => proposal.id === selectedProposal.id) ? null : null}
	</div>
}

type NotificationSection = { key: string; label: string; icon: 'availability' | 'suggestions' | 'shared' | 'activity'; items: NotificationInboxItem[] }

function SectionIcon({ name }: { name: NotificationSection['icon'] }) {
	const paths = {
		availability: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
		suggestions: 'm12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z',
		shared: 'm8 12 3 3 6-7M5 5h14v14H5z',
		activity: 'm5 12 4 4L19 6',
	} as const
	return <span className='inbox-section__icon' aria-hidden='true'><svg viewBox='0 0 24 24'><path d={paths[name]} /></svg></span>
}

function groupByCategory(items: NotificationInboxItem[], t: (key: string) => string): NotificationSection[] {
	const sections: NotificationSection[] = [
		{ key: 'availability', label: t('inbox.sections.availability'), icon: 'availability', items: [] },
		{ key: 'suggestions', label: t('inbox.sections.suggestions'), icon: 'suggestions', items: [] },
		{ key: 'shared', label: t('inbox.sections.shared'), icon: 'shared', items: [] },
		{ key: 'activity', label: t('inbox.sections.activity'), icon: 'activity', items: [] },
	]
	for (const item of items) {
		const section = item.sourceType === 'TaskRecommended'
			? sections[1]
			: item.sourceType.startsWith('TaskProposal')
				? sections[2]
				: item.sourceType === 'TaskCompleted'
					? sections[3]
					: sections[0]
		section.items.push(item)
	}
	return sections.filter((section) => section.items.length > 0)
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
