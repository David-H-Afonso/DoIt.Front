import type { TaskItem } from '../../src/models/task'
import { notificationPreferences, notificationTask } from '../../src/test/taskNotificationFixtures'
import { inheritedTaskNotifications } from '../../src/utils/taskNotifications'

describe('Task inventory completion (isolated API)', () => {
	let tasks: TaskItem[]
	let failSave: boolean
	const today = new Date().toISOString().slice(0, 10)
	const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

	beforeEach(() => {
		cy.viewport(390, 844)
		failSave = false
		const schedule = { ...notificationTask('base').schedule!, startDate: today, timeZoneId: 'UTC', recommendedTime: null }
		tasks = [
			notificationTask('routine', { title: 'Rutina de prueba', occurrenceDate: today, isOverdue: true, schedule: { ...schedule, availableUntilTime: '00:01:00' }, upcomingOccurrence: { id: 'future-routine', date: tomorrow, status: 'Pending' } }),
			notificationTask('oneoff', { title: 'Tarea puntual', taskType: 'OneTime', occurrenceDate: today, schedule: { ...schedule, recurrenceType: 'Manual' } }),
			notificationTask('future', { title: 'Tarea futura', occurrenceId: null, occurrenceStatus: null, schedule: { ...schedule, startDate: tomorrow }, upcomingOccurrence: { id: 'future-only', date: tomorrow, status: 'Pending' } }),
			notificationTask('other', { title: 'Tarea de otra persona', scope: 'House', createdByUserId: 'other', assigneeIds: ['other'], occurrenceDate: today, schedule }),
		]
		const user = { id: 'owner', username: 'test', displayName: 'Test', role: 'User', preferredLocale: 'es', isActive: true, createdAt: '', updatedAt: '' }
		const auth = { user, accessToken: 'isolated-access', refreshToken: 'isolated-refresh', accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(), loading: false, error: null }
		const theme = { mode: 'light', locale: 'es', primaryColor: '#6d5df6', accentColor: '#16a34a', backgroundColor: '#f6efe6', surfaceColor: '#fffaf4', textColor: '#1f2937', backgroundImagePath: null, backgroundOverlayColor: '#f6efe6', backgroundOverlayOpacity: 0.78 }
		cy.intercept('/api/**', { statusCode: 501, body: { message: 'Unexpected isolated request' } })
		cy.intercept('GET', '/api/tasks', (request) => request.reply(tasks))
		cy.intercept('GET', '/api/tasks/*', (request) => {
			const task = tasks.find((item) => item.id === request.url.split('/').at(-1))
			request.reply(task ? { body: task } : { statusCode: 404 })
		})
		cy.intercept('GET', '/api/zones', [])
		cy.intercept('GET', '/api/now*', { date: today, scope: 'me', progress: { total: 0, done: 0, missed: 0, notApplicable: 0, pending: 0 }, zones: [] })
		cy.intercept('GET', '/api/xp/me', { totalXp: 0, weeklyXp: 0, currentLevel: 1, currentLevelXp: 0, nextLevelXp: 100, progressToNextLevel: 0 })
		cy.intercept('GET', '/api/theme/me', { ...theme, themeMode: 'light' })
		cy.intercept('GET', '/api/notifications/inbox', [])
		cy.intercept('GET', '/api/tasks/proposals', [])
		cy.intercept('GET', '/api/notifications/tasks', { preferences: notificationPreferences, tasks: ['routine', 'oneoff', 'future'].map(inheritedTaskNotifications) })
		cy.intercept('POST', /\/api\/occurrences\/[^/]+\/(complete|complete-early|undo)$/, (request) => {
			if (failSave) { request.reply({ statusCode: 503, body: { message: 'Isolated failure' } }); return }
			const parts = request.url.split('/')
			const id = parts.at(-2)!
			const action = parts.at(-1)!
			const task = tasks.find((item) => item.occurrenceId === id || item.upcomingOccurrence?.id === id)!
			const status = action === 'undo' ? 'Pending' : 'Done'
			if (id === task.occurrenceId) {
				expect(action).not.to.eq('complete-early')
				task.occurrenceStatus = status
				task.occurrenceCompletedByUserId = status === 'Done' ? 'owner' : null
				task.occurrenceCompletedAt = status === 'Done' ? new Date().toISOString() : null
				task.isOverdue = status === 'Pending' && task.id === 'routine'
				if (task.schedule?.recurrenceType === 'Manual') task.isArchived = status === 'Done'
			} else {
				expect(action).not.to.eq('complete')
				task.upcomingOccurrence!.status = status
				task.upcomingOccurrence!.completedByUserId = status === 'Done' ? 'owner' : null
				task.upcomingOccurrence!.completedAt = status === 'Done' ? new Date().toISOString() : null
			}
			request.reply({ occurrenceId: id, taskId: task.id, date: id === task.occurrenceId ? today : tomorrow, status, xpEarned: action === 'undo' ? 0 : 10 })
		}).as('occurrenceAction')
		cy.visit('/tasks', { onBeforeLoad: (win) => {
			win.localStorage.clear()
			win.localStorage.setItem('persist:root', JSON.stringify({ auth: JSON.stringify(auth), theme: JSON.stringify(theme), _persist: JSON.stringify({ version: -1, rehydrated: true }) }))
		} })
		cy.get('#task-complete-routine').should('be.enabled')
	})

	it('completes from the row, preserves the future occurrence, and restores keyboard focus after regrouping', () => {
		cy.get('#task-complete-routine').click()
		cy.wait('@occurrenceAction').its('request.url').should('match', /occ-routine\/complete$/)
		cy.get('#task-complete-routine').should('have.attr', 'aria-checked', 'true').and('have.focus')
		cy.then(() => expect(tasks[0].upcomingOccurrence!.status).to.eq('Pending'))
		cy.get('#task-complete-routine').click()
		cy.wait('@occurrenceAction').its('request.url').should('match', /occ-routine\/undo$/)
		cy.get('#task-complete-routine').should('have.attr', 'aria-checked', 'false').and('have.focus')
	})

	it('does not pretend a failed completion was saved', () => {
		failSave = true
		cy.get('#task-complete-routine').click()
		cy.wait('@occurrenceAction').its('response.statusCode').should('eq', 503)
		cy.get('#task-complete-routine').should('have.attr', 'aria-checked', 'false').and('be.enabled')
		cy.contains('No se pudo cambiar el estado de la tarea. Inténtalo de nuevo.').should('be.visible')
	})

	it('archives a completed one-off task and can restore it with Undo', () => {
		cy.get('#task-complete-oneoff').click()
		cy.wait('@occurrenceAction')
		cy.get('article[aria-label="Tarea puntual"]').should('not.exist')
		cy.contains('La tarea puntual se ha guardado en Archivadas. Puedes deshacerlo.').should('be.visible')
		cy.contains('.toast__action', 'Deshacer').click()
		cy.wait('@occurrenceAction')
		cy.get('#task-complete-oneoff').should('have.attr', 'aria-checked', 'false')
	})

	it('can undo a completed one-off directly from the Archived view', () => {
		cy.get('#task-complete-oneoff').click()
		cy.wait('@occurrenceAction')
		cy.get('.tasks-status-tabs').contains('button', 'Archivadas').click()
		cy.get('#task-complete-oneoff').should('have.attr', 'aria-checked', 'true').click()
		cy.wait('@occurrenceAction')
		cy.get('.tasks-status-tabs').contains('button', 'Activas').click()
		cy.get('#task-complete-oneoff').should('have.attr', 'aria-checked', 'false')
	})

	it('uses a distinct early action for future-only work', () => {
		cy.get('#task-complete-future').should('have.attr', 'aria-label', 'Completar antes de su fecha: Tarea futura').click()
		cy.wait('@occurrenceAction').its('request.url').should('match', /future-only\/complete-early$/)
		cy.get('#task-complete-future').should('have.attr', 'aria-checked', 'true')
		cy.get('#task-complete-future').click()
		cy.wait('@occurrenceAction').its('request.url').should('match', /future-only\/undo$/)
	})

	it('does not confuse selection mode or permissions with completing work', () => {
		cy.get('#task-complete-other').should('be.disabled')
		cy.contains('button', 'Seleccionar').click()
		cy.get('#task-complete-routine').should('not.exist')
		cy.get('[aria-label="Seleccionar Rutina de prueba"]').check()
		cy.then(() => expect(tasks[0].occurrenceStatus).to.eq('Pending'))
		cy.contains('button', 'Cancelar').click()
		cy.get('#task-complete-routine').should('have.attr', 'aria-checked', 'false')
	})
})
