describe('DoIt foundation', () => {
	it('loads the mobile-first login screen', () => {
		cy.viewport(390, 844)
		cy.visit('/')
		cy.contains('h1', 'Bienvenido').should('be.visible')
		cy.contains('Usuario').should('be.visible')
		cy.contains('Contraseña').should('be.visible')
	})

	it('registers, creates a zone and task, and shows it in Now', () => {
		cy.viewport(390, 844)

		const zone = {
			id: 'zone-kitchen',
			name: 'Cocina',
			description: null,
			color: null,
			icon: null,
			sortOrder: 0,
			isArchived: false,
			createdAt: '2026-07-11T10:00:00Z',
			updatedAt: '2026-07-11T10:00:00Z',
		}
		const task = {
			id: 'task-dishes',
			title: 'Fregar platos',
			description: null,
			zoneId: zone.id,
			zoneName: zone.name,
			scope: 'Personal',
			taskType: 'OneTime',
			importance: 'Normal',
			complexity: 'Easy',
			obligation: 'Required',
			isArchived: false,
			createdByUserId: 'user-1',
			createdAt: '2026-07-11T10:00:00Z',
			updatedAt: '2026-07-11T10:00:00Z',
			schedule: {
				id: 'schedule-1',
				recurrenceType: 'Manual',
				startDate: '2026-07-11',
				endDate: null,
				weekday: null,
				timesPerWeek: null,
				everyNDays: null,
				availableFromTime: null,
				availableUntilTime: null,
				recommendedTime: null,
				unavailableVisibilityMode: 'Dimmed',
				createdAt: '2026-07-11T10:00:00Z',
				updatedAt: '2026-07-11T10:00:00Z',
			},
		}
		let nowBody = {
			date: '2026-07-11',
			scope: 'me',
			progress: { total: 0, done: 0, missed: 0, notApplicable: 0, pending: 0 },
			zones: [],
		}

		cy.intercept('POST', '/api/auth/register', {
			user: {
				id: 'user-1',
				username: 'admin',
				displayName: 'Admin',
				role: 'Admin',
				preferredLocale: 'es',
				isActive: true,
				createdAt: '2026-07-11T10:00:00Z',
				updatedAt: '2026-07-11T10:00:00Z',
			},
			accessToken: 'access-token',
			refreshToken: 'refresh-token',
			accessTokenExpiresAt: '2027-07-11T10:15:00Z',
			refreshTokenExpiresAt: '2027-07-11T10:00:00Z',
		}).as('register')
		cy.intercept('GET', '/api/zones', []).as('listZones')
		cy.intercept('GET', '/api/tasks', []).as('listTasks')
		cy.intercept('GET', '/api/users', []).as('listUsers')
		cy.intercept('GET', '/api/xp/me', { totalXp: 0, weeklyXp: 0, currentLevel: 1, currentLevelXp: 0, nextLevelXp: 100, progressToNextLevel: 0 }).as('getXp')
		cy.intercept('GET', '/api/theme/me', { themeMode: 'system', primaryColor: '#0a84ff', accentColor: '#34c759', backgroundColor: '#f7f4ee', surfaceColor: '#fffdf9', textColor: '#1d1d1f', backgroundImagePath: null, backgroundOverlayColor: '#f7f4ee', backgroundOverlayOpacity: 0.92 }).as('getTheme')
		cy.intercept('GET', '/api/now*', (request) => request.reply(nowBody)).as('getNow')
		cy.intercept('POST', '/api/zones', zone).as('createZone')
		cy.intercept('POST', '/api/occurrences/occ-dishes/complete', { occurrenceId: 'occ-dishes', taskId: task.id, date: '2026-07-11', status: 'Done' }).as('completeTask')
		cy.intercept('POST', '/api/occurrences/occ-dishes/miss', { occurrenceId: 'occ-dishes', taskId: task.id, date: '2026-07-11', status: 'Missed' }).as('missTask')
		cy.intercept('POST', '/api/occurrences/occ-dishes/undo', { occurrenceId: 'occ-dishes', taskId: task.id, date: '2026-07-11', status: 'Pending' }).as('undoTask')
		cy.intercept('POST', '/api/tasks', (request) => {
			nowBody = {
				date: '2026-07-11',
				scope: 'me',
				progress: { total: 1, done: 0, missed: 0, notApplicable: 0, pending: 1 },
				zones: [
					{
						zoneId: zone.id,
						zoneName: zone.name,
						progress: { total: 1, done: 0, missed: 0, notApplicable: 0, pending: 1 },
						overdue: [],
						available: [{ occurrenceId: 'occ-dishes', id: task.id, title: task.title, zoneId: zone.id, zoneName: zone.name, scope: 'Personal', status: 'available', occurrenceStatus: 'Pending', availableFromTime: null, availableUntilTime: null, recommendedTime: null }],
						unavailable: [],
					},
				],
			}
			request.reply(task)
		}).as('createTask')

		cy.visit('/')
		cy.contains('button', 'Crear primer usuario').click()
		cy.contains('label', 'Usuario').find('input').type('admin')
		cy.contains('label', 'Nombre visible').find('input').type('Admin')
		cy.contains('label', 'Contraseña').find('input').type('Password123!')
		cy.contains('button', 'Crear usuario').click()
		cy.wait('@register')
		cy.get('.app-title-block').contains('Ahora').should('be.visible')

		cy.get('[aria-label="Crear"]').filter(':visible').first().click()
		cy.contains('button', 'Nueva zona rápida').click()
		cy.contains('label', 'Nombre de zona').find('input').type(zone.name)
		cy.get('.quick-zone').contains('button', 'Crear').click()
		cy.wait('@createZone')
		cy.contains('label', 'Qué hay que hacer').find('input').type(task.title)
		cy.contains('label', 'Zona').find('select').select(zone.name)
		cy.get('form.sheet-form').contains('button', 'Crear').click()
		cy.wait('@createTask')

		cy.contains(zone.name).should('be.visible')
		cy.contains(task.title).should('be.visible')
		cy.contains('button', 'No hecha').click()
		cy.wait('@missTask')
		cy.contains(task.title).should('not.exist')
		cy.contains('button', 'Deshacer').click()
		cy.wait('@undoTask')
		cy.contains(task.title).should('be.visible')
		cy.contains('button', 'Completar').should('be.visible')
		cy.contains('button', 'Completar').click()
		cy.contains(task.title).should('not.exist')
		cy.contains('button', 'Deshacer').click()
		cy.wait('@undoTask')
		cy.contains(task.title).should('be.visible')
		cy.window().then((window) => {
			expect(window.document.documentElement.scrollWidth).to.be.lte(window.innerWidth)
		})
	})
})
