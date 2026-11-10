import { notificationPreferences, notificationTask } from '../../src/test/taskNotificationFixtures'
import { inheritedTaskNotifications } from '../../src/utils/taskNotifications'

describe('Shared workspace and mobile navigation (isolated API)', () => {
	const today = new Date().toISOString().slice(0, 10)
	const stamp = `${today}T08:00:00Z`
	const title = 'Organizar los documentos de la casa y revisar las próximas citas'
	const user = { id: 'owner', username: 'demo', displayName: 'Persona de prueba', role: 'Admin', preferredLocale: 'es', isActive: true, createdAt: stamp, updatedAt: stamp }
	const task = notificationTask('responsive', { title, zoneId: 'home', zoneName: 'Casa', occurrenceDate: today })
	const event = { id: 'event-test', title: 'Revisión anual con un título largo que debe poder leerse en el móvil', description: 'Documentación y citas de la familia', zoneId: 'home', zoneName: 'Casa', startAtUtc: `${today}T10:00:00Z`, endAtUtc: `${today}T11:00:00Z`, isAllDay: false, timeZoneId: 'UTC', isCancelled: false, createdAt: stamp, updatedAt: stamp, reminders: [] }

	function start(mode = 'light') {
		const theme = { mode, locale: 'es', primaryColor: '#6d5df6', accentColor: '#16a34a', backgroundColor: mode === 'dark' ? '#111113' : '#f6efe6', surfaceColor: mode === 'dark' ? '#1c1c1e' : '#fffaf4', textColor: mode === 'dark' ? '#f5f5f7' : '#1f2937', backgroundImagePath: null, backgroundOverlayColor: '#f6efe6', backgroundOverlayOpacity: 0.78 }
		const auth = { user, accessToken: 'isolated-access', refreshToken: 'isolated-refresh', accessTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 31_536_000_000).toISOString(), loading: false, error: null }
		cy.intercept('/api/**', { statusCode: 501, body: { message: 'Unexpected isolated request' } })
		cy.intercept('GET', '/api/tasks', [task])
		cy.intercept('GET', '/api/zones', [{ id: 'home', name: 'Casa', description: title, sortOrder: 0, isArchived: false, createdAt: stamp, updatedAt: stamp }])
		cy.intercept('GET', '/api/now*', { date: today, scope: 'me', progress: { total: 1, done: 0, missed: 0, notApplicable: 0, pending: 1 }, upcoming: [], zones: [{ zoneId: 'home', zoneName: 'Casa', progress: { total: 1, done: 0, missed: 0, notApplicable: 0, pending: 1 }, available: [{ ...task, status: 'available', recurrenceType: 'Daily', recommendedTime: '11:00:00', assigneeNames: [], timeZoneId: 'UTC' }], overdue: [], unavailable: [], completed: [] }] })
		cy.intercept('GET', '/api/xp/me', { totalXp: 240, weeklyXp: 55, currentLevel: 2, currentLevelXp: 100, nextLevelXp: 400, progressToNextLevel: 140 })
		cy.intercept('GET', '/api/theme/me', { ...theme, themeMode: mode })
		cy.intercept('GET', '/api/users*', [user])
		cy.intercept('GET', '/api/users/active', [user])
		cy.intercept('GET', '/api/backups/users', [])
		cy.intercept('GET', '/api/notifications/config', { enabled: false, publicKey: null })
		cy.intercept('GET', '/api/notifications/preferences', notificationPreferences)
		cy.intercept('GET', '/api/notifications/tasks', { preferences: notificationPreferences, tasks: [inheritedTaskNotifications(task.id)] })
		cy.intercept('GET', '/api/notifications/tasks/*', inheritedTaskNotifications(task.id))
		cy.intercept('GET', '/api/notifications/inbox', [{ id: 'notice-1', title, body: 'Una notificación larga con toda la información necesaria para decidir qué hacer.', sourceType: 'TaskProposalCreated', sourceId: 'proposal-1', isRead: false, createdAt: stamp, dueAtUtc: stamp, data: { proposalId: 'proposal-1' } }])
		cy.intercept('GET', '/api/tasks/proposals', [{ id: 'proposal-1', proposerUserId: 'other', targetUserId: 'owner', status: 'Pending', draft: { ...task, schedule: { ...task.schedule, startDate: today } }, createdAt: stamp, updatedAt: stamp }])
		cy.intercept('GET', '/api/review/*', { date: today, xpEarned: 25, created: [], done: [], missed: [], notApplicable: [], pending: [{ occurrenceId: 'occ-review', taskId: task.id, title, zoneName: 'Casa', status: 'Pending', xpEarned: 0, taskCreatedAt: stamp }], byZone: [] })
		cy.intercept('GET', '/api/statistics*', { from: today, to: today, summary: { scheduled: 1, completed: 0, completedEarly: 0, completedLate: 0, completedOverdue: 0, missed: 0, completionRate: 0 }, buckets: [], tasks: [] })
		cy.intercept('GET', '/api/calendar/events*', [event])
		cy.intercept('GET', '/api/calendar/reminders/due*', [])
		cy.intercept('GET', '/api/calendar/reports/monthly*', { activeEvents: 1, totalEvents: 1, enabledReminders: 0, acknowledgedReminders: 0 })
		cy.visit('/now', { onBeforeLoad: win => {
			win.localStorage.clear()
			win.localStorage.setItem('persist:root', JSON.stringify({ auth: JSON.stringify(auth), theme: JSON.stringify(theme), _persist: JSON.stringify({ version: -1, rehydrated: true }) }))
		} })
		cy.contains(title).should('be.visible')
	}

	function fitsViewport() {
		cy.get('.app-loading').should('not.exist')
		cy.document().then(doc => doc.fonts.ready)
		cy.window().then(win => {
			expect(Math.max(win.document.body.scrollWidth, win.document.documentElement.scrollWidth)).to.be.at.most(win.innerWidth + 1)
			const root = win.document.querySelector('.app-content')!
			expect(win.getComputedStyle(root).fontFamily).to.contain('Inter')
			const offenders = [...root.querySelectorAll<HTMLElement>('*')].filter(el => {
				const r = el.getBoundingClientRect()
				return r.width > 1 && r.height > 1 && (r.left < -1 || r.right > win.innerWidth + 1)
			}).map(el => el.className)
			expect(offenders, 'no content is clipped outside the viewport').to.deep.equal([])
			const smallTargets = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, summary')].filter(el => {
				const r = el.getBoundingClientRect()
				return r.width > 1 && r.height > 1 && (r.width < 43.9 || r.height < 43.9)
			}).map(el => ({ className: el.className, text: el.textContent }))
			expect(smallTargets, '44px touch targets').to.deep.equal([])
		})
	}

	for (const mode of ['light', 'dark']) it(`keeps every route consistent and usable at phone, tablet and desktop sizes (${mode})`, () => {
		start(mode)
		for (const width of [320, 390, 768, 1440]) {
			cy.viewport(width, width === 768 ? 1024 : 844)
			for (const route of ['/now', '/tasks', '/zones', '/zones/home', '/review', '/statistics', '/calendar', '/inbox', '/profile']) {
				cy.visit(route)
				cy.get('.app-page-title').should('be.visible')
				fitsViewport()
			}
		}
	})

	it('supports keyboard, outside-tap dismissal and focus return in mobile navigation and sheets', () => {
		cy.viewport(390, 844)
		start()
		cy.contains('.mobile-dock__more', 'Más').click()
		cy.get('.mobile-dock__more-menu [role="menuitem"]').first().should('have.focus').trigger('keydown', { key: 'End' })
		cy.get('.mobile-dock__more-menu [role="menuitem"]').last().should('have.focus').trigger('keydown', { key: 'Escape' })
		cy.get('.mobile-dock__more-menu').should('not.exist')
		cy.get('.mobile-dock__more').should('have.focus').click()
		cy.get('.app-page-title').click()
		cy.get('.mobile-dock__more-menu').should('not.exist')
		cy.get('.mobile-dock__create').click()
		cy.get('.composer-panel input[name="title"]').should('have.focus').trigger('keydown', { key: 'Tab', shiftKey: true })
		cy.get('.quick-zone__toggle').should('have.attr', 'aria-expanded', 'false')
		cy.focused().trigger('keydown', { key: 'Escape' })
		cy.get('.composer-panel').should('not.exist')
		cy.get('.mobile-dock__create').should('have.focus')
		cy.get('body').should('not.have.css', 'overflow', 'hidden')
		cy.contains('.task-action', 'Posponer').click()
		cy.get('.snooze-menu__options [role="menuitem"]').first().should('have.focus').trigger('keydown', { key: 'Escape' })
		cy.get('.snooze-menu__options').should('not.exist')
		cy.contains('.task-action', 'Posponer').should('have.focus')
	})

	it('opens full mobile event details from the agenda, traps focus and shows validation in the sheet', () => {
		cy.viewport(390, 844)
		start()
		cy.visit('/calendar')
		cy.get('.calendar-day__select[aria-current="date"]').click()
		cy.get('.calendar-agenda').contains('button', event.title).click()
		cy.get('.calendar-modal').should('be.visible')
		cy.get('.calendar-editor').contains('label', 'Título').find('input').should('have.value', event.title)
		cy.get('.calendar-editor .icon-button').first().click()
		cy.get('.calendar-agenda__event').should('have.focus')
		cy.get('.calendar-header').contains('button', 'Nuevo evento').click()
		cy.get('.calendar-editor').contains('label', 'Título').find('input').type('Evento de prueba')
		cy.get('.calendar-editor input[type="datetime-local"]').last().clear().type(`${today}T09:00`)
		cy.get('.calendar-editor button[type="submit"]').click()
		cy.get('.calendar-modal [role="alert"]').should('be.visible')
		cy.get('.calendar-editor button[type="submit"]').focus().trigger('keydown', { key: 'Tab' })
		cy.get('.calendar-editor .icon-button').first().should('have.focus').trigger('keydown', { key: 'Escape' })
		cy.get('.calendar-modal').should('not.exist')
		cy.get('.calendar-header button').should('have.focus')
	})

	it('preserves profile preference saves and inbox filters in the new controls', () => {
		cy.viewport(390, 844)
		start()
		cy.intercept('PUT', '/api/notifications/preferences', request => request.reply(request.body)).as('preferences')
		cy.visit('/profile')
		cy.get('.profile-notification-setting').first().find('input').uncheck()
		cy.get('.profile-notification-preferences button[type="submit"]').click()
		cy.wait('@preferences').its('request.body.availableFromEnabled').should('eq', false)
		cy.visit('/inbox')
		cy.contains('.inbox-tabs button', 'Sin leer').click().should('have.attr', 'aria-pressed', 'true')
		cy.get('.inbox-item').should('have.length', 1)
		cy.get('.proposal-card__heading').click().should('have.attr', 'aria-expanded', 'true')
		cy.get('.proposal-card__actions').should('contain', 'Aceptar').and('contain', 'Rechazar')
	})
})
