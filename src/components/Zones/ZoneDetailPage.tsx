import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { NowZoneSection } from '@/components/Now/NowPage'
import { openQuickCreateInZone } from '@/store/features/ui/uiSlice'
import { fetchNow } from '@/store/features/now/nowSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export default function ZoneDetailPage() {
	const { id } = useParams()
	const { t } = useI18n()
	const dispatch = useAppDispatch()
	const accessToken = useAppSelector((state) => state.auth.accessToken)
	const zone = useAppSelector((state) => state.now.zones.find((candidate) => candidate.zoneId === id))

	useEffect(() => {
		if (accessToken && !zone) {
			dispatch(fetchNow())
		}
	}, [accessToken, dispatch, zone])

	if (!zone) {
		return (
			<div className='page-stack'>
				<p className='empty-state'>{t('zones.detailEmpty')}</p>
			</div>
		)
	}

	return (
		<div className='page-stack zone-detail-page'>
			<section className='summary-card now-summary zone-detail-summary'>
				<div>
					<span>{t('zones.mode')}</span>
					<h1>{zone.zoneName}</h1>
				</div>
				<small>{zone.progress.done}/{zone.progress.total} {t('now.doneLabel')}</small>
			</section>
			<NowZoneSection zone={zone} showOpenLink={false} showCompleted showHeader={false} />
			<button className='secondary-action' type='button' onClick={() => id && dispatch(openQuickCreateInZone(id))}>
				{t('zones.createTaskHere')}
			</button>
		</div>
	)
}
