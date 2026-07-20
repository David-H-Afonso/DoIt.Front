describe('DoIt design review captures', () => {
	const expectNoHorizontalOverflow = () => {
		cy.window().then((win) => {
			const overflow = Math.max(win.document.body.scrollWidth, win.document.documentElement.scrollWidth) - win.innerWidth
			if (overflow > 1) {
				const offenders = [...win.document.querySelectorAll('*')]
					.map((element) => {
						const rect = element.getBoundingClientRect()
						return {
							tag: element.tagName.toLowerCase(),
							className: element.getAttribute('class'),
							left: Math.round(rect.left),
							right: Math.round(rect.right),
							width: Math.round(rect.width),
						}
					})
					.filter((rect) => rect.left < -1 || rect.right > win.innerWidth + 1)
				throw new Error(`Horizontal overflow: ${overflow}px ${JSON.stringify(offenders.slice(0, 8))}`)
			}
		})
	}

	const user = {
		id: 'user-1',
		username: 'admin',
		displayName: 'Rikku',
		role: 'Admin',
		preferredLocale: 'es',
		isActive: true,
		createdAt: '2026-07-12T10:00:00Z',
		updatedAt: '2026-07-12T10:00:00Z',
	}

	const auth = {
		user,
		accessToken: 'access-token',
		refreshToken: 'refresh-token',
		accessTokenExpiresAt: '2027-07-12T10:15:00Z',
		refreshTokenExpiresAt: '2027-07-12T10:00:00Z',
	}

	const now = {
		date: '2026-07-12',
		scope: 'me',
		progress: { total: 5, done: 1, missed: 1, notApplicable: 0, pending: 3 },
		zones: [
			{
				zoneId: 'kitchen',
				zoneName: 'Cocina',
				progress: { total: 3, done: 0, missed: 0, notApplicable: 0, pending: 3 },
				overdue: [{ occurrenceId: 'occ-1', id: 'task-1', title: 'Sacar basura', zoneId: 'kitchen', zoneName: 'Cocina', scope: 'House', assignmentMode: 'Anyone', assigneeIds: [], assigneeNames: [], status: 'overdue', occurrenceStatus: 'Pending', availableUntilTime: '09:00:00' }],
				available: [{ occurrenceId: 'occ-2', id: 'task-2', title: 'Fregar platos', zoneId: 'kitchen', zoneName: 'Cocina', scope: 'Personal', assignmentMode: 'SingleUser', assigneeIds: ['user-1'], assigneeNames: ['Rikku'], status: 'available', occurrenceStatus: 'Pending', recommendedTime: '10:30:00' }],
				unavailable: [{ occurrenceId: 'occ-3', id: 'task-3', title: 'Preparar cena', zoneId: 'kitchen', zoneName: 'Cocina', scope: 'House', assignmentMode: 'Anyone', assigneeIds: [], assigneeNames: [], status: 'unavailable', occurrenceStatus: 'Pending', availableFromTime: '20:00:00' }],
			},
			{
				zoneId: 'office',
				zoneName: 'Oficina',
				progress: { total: 2, done: 1, missed: 1, notApplicable: 0, pending: 0 },
				overdue: [],
				available: [],
				unavailable: [],
			},
		],
	}

	beforeEach(() => {
		cy.viewport(390, 844)
		cy.intercept('POST', '/api/auth/register', auth)
		cy.intercept('POST', '/api/auth/login', auth)
		cy.intercept('GET', '/api/zones', [{ id: 'kitchen', name: 'Cocina', description: 'Rutina diaria', color: null, icon: null, sortOrder: 0, isArchived: false, createdAt: '2026-07-12T10:00:00Z', updatedAt: '2026-07-12T10:00:00Z' }])
		cy.intercept('GET', '/api/tasks', [
			{ id: 'task-epic', title: 'Epic Games Store', description: null, zoneId: null, zoneName: null, scope: 'Personal', taskType: 'Routine', importance: 'Normal', complexity: 'Easy', obligation: 'Required', assignmentMode: 'SingleUser', assigneeIds: ['user-1'], isArchived: false, createdByUserId: 'user-1', createdAt: '2026-07-11T10:00:00Z', updatedAt: '2026-07-11T10:00:00Z', occurrenceStatus: null, occurrenceDate: null, schedule: { id: 'schedule-epic', recurrenceType: 'Weekday', startDate: '2026-07-11', endDate: null, weekday: 4, timesPerWeek: null, everyNDays: null, availableFromTime: null, availableUntilTime: null, recommendedTime: '16:00:00', timeZoneId: 'Europe/Madrid', unavailableVisibilityMode: 'Dimmed', createdAt: '2026-07-11T10:00:00Z', updatedAt: '2026-07-11T10:00:00Z' } },
		])
		cy.intercept('GET', '/api/users', [user])
		cy.intercept('GET', '/api/backups/users', [])
		cy.intercept('GET', '/api/xp/me', { totalXp: 240, weeklyXp: 55, currentLevel: 2, currentLevelXp: 100, nextLevelXp: 400, progressToNextLevel: 140 })
		cy.intercept('GET', '/api/theme/me', { themeMode: 'light', primaryColor: '#6d5df6', accentColor: '#16a34a', backgroundColor: '#f6efe6', surfaceColor: '#fffaf4', textColor: '#1f2937', backgroundImagePath: null, backgroundOverlayColor: '#f6efe6', backgroundOverlayOpacity: 0.78 })
		cy.intercept('GET', '/api/now*', now)
		cy.intercept('GET', '**/api/review/**', { date: '2026-07-12', xpEarned: 25, created: [], done: [{ occurrenceId: 'occ-4', taskId: 'task-4', title: 'Planificar compra', zoneName: 'Oficina', status: 'Done', completedBy: 'Rikku', xpEarned: 25, taskCreatedAt: '2026-07-01T10:00:00Z', completedAt: '2026-07-12T10:00:00Z' }], missed: [{ occurrenceId: 'occ-5', taskId: 'task-5', title: 'Regar plantas', zoneName: null, status: 'Missed', completedBy: 'Rikku', xpEarned: 0, taskCreatedAt: '2026-07-01T10:00:00Z', completedAt: null }], notApplicable: [], pending: now.zones[0].available, byZone: [] })
	})

	it('captures core app surfaces', () => {
		cy.visit('/login')
		cy.screenshot('design-before-login', { capture: 'viewport' })
		cy.contains('label', 'Usuario').find('input').type('admin')
		cy.contains('label', 'Contraseña').find('input').type('Password123!')
		cy.contains('button', 'Entrar').click()
		cy.contains('Cocina').should('be.visible')
		cy.screenshot('design-before-now-mobile', { capture: 'viewport' })
		cy.viewport(1440, 900)
		expectNoHorizontalOverflow()
		cy.screenshot('design-before-now-desktop', { capture: 'viewport' })
		cy.contains('Tareas').click()
		cy.contains('Epic Games Store').should('be.visible')
		expectNoHorizontalOverflow()
		cy.screenshot('design-after-tasks-desktop', { capture: 'viewport' })
		cy.contains('Revisión').click()
		cy.contains('Planificar compra').should('be.visible')
		expectNoHorizontalOverflow()
		cy.screenshot('design-before-review-desktop', { capture: 'viewport' })
		cy.contains('Perfil').click()
		cy.get('.app-title-block').contains('Perfil').should('be.visible')
		expectNoHorizontalOverflow()
		cy.screenshot('design-before-profile-desktop', { capture: 'viewport' })
	})
})
