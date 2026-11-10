import type { TaskNotificationOverride, TaskNotificationUpdate } from '../../src/models/notifications'
import { notificationPreferences, notificationTask } from '../../src/test/taskNotificationFixtures'
import { inheritedTaskNotifications, setAllTaskNotifications, taskNotificationKeys } from '../../src/utils/taskNotifications'

describe('Task notification management (isolated API)', () => {
	const tasks = [
		notificationTask('dishes', { title: 'Lavar platos' }),
		notificationTask('plants', { title: 'Regar plantas' }),
		notificationTask('package', { title: 'Recoger paquete', schedule: null }),
		notificationTask('shared', { title: 'Casa ajena', scope: 'House', assignmentMode: 'Anyone', assigneeIds: [], createdByUserId: 'other' }),
	]
	let overrides: Record<string, TaskNotificationOverride>
	let failSave: boolean

	beforeEach(() => {
		cy.viewport(390, 844)
		failSave = false
		overrides = Object.fromEntries(tasks.map((task) => [task.id, inheritedTaskNotifications(task.id)]))
		overrides.plants = setAllTaskNotifications(overrides.plants, false)
		const user = { id: 'owner', username: 'test', displayName: 'Test', role: 'Admin', preferredLocale: 'es', isActive: true, createdAt: '', updatedAt: '' }
		const auth = { user, accessToken: 'isolated-access', refreshToken: 'isolated-refresh', accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(), loading: false, error: null }
		const theme = { mode: 'light', locale: 'es', primaryColor: '#6d5df6', accentColor: '#16a34a', backgroundColor: '#f6efe6', surfaceColor: '#fffaf4', textColor: '#1f2937', backgroundImagePath: null, backgroundOverlayColor: '#f6efe6', backgroundOverlayOpacity: 0.78 }
		// Fail closed: no test request may reach a real API or production data.
		cy.intercept('/api/**', { statusCode: 501, body: { message: 'Unexpected isolated request' } })
		cy.intercept('GET', '/api/tasks', tasks)
		cy.intercept('GET', '/api/zones', [])
		cy.intercept('GET', '/api/now*', { date: '2026-11-10', scope: 'me', progress: { total: 0, done: 0, missed: 0, notApplicable: 0, pending: 0 }, zones: [] })
		cy.intercept('GET', '/api/xp/me', { totalXp: 0, weeklyXp: 0, currentLevel: 1, currentLevelXp: 0, nextLevelXp: 100, progressToNextLevel: 0 })
		cy.intercept('GET', '/api/theme/me', { ...theme, themeMode: 'light' })
		cy.intercept('GET', '/api/notifications/inbox', [])
		cy.intercept('GET', '/api/tasks/proposals', [])
		cy.intercept('GET', '/api/notifications/preferences', notificationPreferences)
		cy.intercept('GET', '/api/notifications/tasks/*', (request) => request.reply(overrides[request.url.split('/').at(-1)!]))
		cy.intercept('GET', '/api/notifications/tasks', (request) => request.reply({ preferences: notificationPreferences, tasks: Object.values(overrides) })).as('loadAlerts')
		cy.intercept('PUT', '/api/notifications/tasks', (request) => {
			if (failSave) { request.reply({ statusCode: 500, body: { message: 'Isolated failure' } }); return }
			const updates = request.body.tasks as TaskNotificationUpdate[]
			const saved = updates.map(({ taskId, settings }) => (overrides[taskId] = { taskId, ...settings }))
			request.reply(saved)
		}).as('saveAlerts')
		cy.visit('/tasks', { onBeforeLoad: (win) => {
			win.localStorage.clear()
			win.localStorage.setItem('persist:root', JSON.stringify({ auth: JSON.stringify(auth), theme: JSON.stringify(theme), _persist: JSON.stringify({ version: -1, rehydrated: true }) }))
		} })
		cy.wait('@loadAlerts')
		cy.get('[aria-label="Silenciar avisos de Lavar platos"]').should('be.enabled')
	})

	it('keeps advanced filters available without displaying three selects by default', () => {
		cy.get('select[aria-label="Frecuencia: todas"]').should('not.be.visible')
		cy.contains('button', 'Filtros').click().should('have.attr', 'aria-expanded', 'true')
		cy.get('select[aria-label="Frecuencia: todas"]').select('Daily')
		cy.get('.task-inventory__row').should('have.length', 3)
		cy.contains('button', 'Filtros').click().should('have.attr', 'aria-expanded', 'false')
		cy.get('select[aria-label="Frecuencia: todas"]').should('not.be.visible').and('have.value', 'Daily')
		cy.get('.task-inventory__row').should('have.length', 3)
	})

	it('filters by effective state, including muted and unconfigured tasks', () => {
		cy.get('[aria-label="Con avisos 2"]').click()
		cy.get('.task-inventory__row').should('have.length', 2)
		cy.get('[aria-label="Sin avisos 2"]').click()
		cy.get('.task-inventory__row').should('have.length', 2)
		cy.contains('Silenciada').should('be.visible')
		cy.contains('Sin hora de aviso').should('be.visible')
	})

	it('mutes in one click and undoes the exact inherited settings', () => {
		cy.get('[aria-label="Silenciar avisos de Lavar platos"]').click()
		cy.wait('@saveAlerts').then(({ request }) => {
			expect(request.body.tasks).to.have.length(1)
			taskNotificationKeys.forEach((key) => expect(request.body.tasks[0].settings[key]).to.eq(false))
		})
		cy.get('article[aria-label="Lavar platos"]').contains('Sin avisos').should('be.visible')
		cy.get('dialog').should('not.exist')
		cy.contains('.toast__action', 'Deshacer').click()
		cy.wait('@saveAlerts').then(({ request }) => {
			taskNotificationKeys.forEach((key) => expect(request.body.tasks[0].settings[key]).to.eq(null))
		})
		cy.get('article[aria-label="Lavar platos"]').contains('Con avisos').should('be.visible')
	})

	it('only bulk-mutes owned tasks still visible after filtering', () => {
		cy.contains('button', 'Seleccionar').click()
		cy.get('[aria-label="Seleccionar Casa ajena"]').should('be.disabled')
		cy.contains('label', 'Seleccionar visibles').click()
		cy.contains('3 seleccionadas').should('be.visible')
		cy.get('input[type="search"]').type('Lavar')
		cy.contains('0 seleccionadas').should('be.visible')
		cy.contains('button', 'Silenciar seleccionadas').should('be.disabled')
		cy.contains('label', 'Seleccionar visibles').click()
		cy.contains('button', 'Silenciar seleccionadas').click()
		cy.wait('@saveAlerts').then(({ request }) => expect(request.body.tasks.map((task: TaskNotificationUpdate) => task.taskId)).to.deep.eq(['dishes']))
	})

	it('keeps state unchanged and permits retry when saving fails', () => {
		failSave = true
		cy.get('[aria-label="Silenciar avisos de Lavar platos"]').click()
		cy.wait('@saveAlerts').its('response.statusCode').should('eq', 500)
		cy.contains('No se cambiaron los avisos. Inténtalo de nuevo.').should('be.visible')
		cy.get('article[aria-label="Lavar platos"]').contains('Con avisos').should('be.visible')
		cy.get('[aria-label="Silenciar avisos de Lavar platos"]').should('be.enabled')
	})

	it('opens a short settings dialog with effective switches and an explicit defaults action', () => {
		cy.get('[aria-label="Configurar avisos de Regar plantas"]').click()
		cy.get('dialog[open]').within(() => {
			cy.contains('Sin avisos').should('be.visible')
			cy.get('[role="switch"][aria-label="Hora recomendada"]').should('not.be.checked')
			cy.contains('button', 'Usar ajustes generales').click()
			cy.get('[role="switch"][aria-label="Hora recomendada"]').should('be.checked')
			cy.contains('button', 'Guardar cambios').click()
		})
		cy.wait('@saveAlerts').then(({ request }) => expect(request.body.tasks[0].settings.recommendedEnabled).to.eq(null))
		cy.get('dialog').should('not.exist')
		cy.get('article[aria-label="Regar plantas"]').contains('Con avisos').should('be.visible')
	})
})
