import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useAppSelector } from '@/store/hooks'

export default function ZonesPage() {
	const { t } = useI18n()
	const zones = useAppSelector((state) => state.zones.items.filter((zone) => !zone.isArchived))
	const nowZones = useAppSelector((state) => state.now.zones)

	return (
		<div className='page-grid zones-overview-page'>
			<h1>{t('zones.title')}</h1>
			{zones.length === 0 ? <p className='empty-state'>{t('zones.empty')}</p> : null}
			<section className='zone-list zone-list--overview'>
			{zones.map((zone) => (
				<Link className='zone-card zone-card--overview' to={`/zones/${zone.id}`} key={zone.id}>
					<span className='zone-card__glyph' aria-hidden='true'>{zone.name.slice(0, 1).toUpperCase()}</span>
					<div className='zone-card__main'>
						<strong>{zone.name}</strong>
						<span>{zone.description || t('zones.open')}</span>
					</div>
					<div className='zone-card__meta'>
						<strong>{nowZones.find((candidate) => candidate.zoneId === zone.id)?.progress.pending ?? 0}</strong>
						<span>{t('now.pending')}</span>
					</div>
					<svg className='zone-card__arrow' aria-hidden='true' viewBox='0 0 24 24'><path d='M5 12h14m-6-6 6 6-6 6' /></svg>
				</Link>
			))}
			</section>
		</div>
	)
}
