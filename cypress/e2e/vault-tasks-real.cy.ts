type TaskSeed = {
	title: string
	recurrenceType: 'Daily' | 'Weekday' | 'TimesPerWeek' | 'EveryNDays'
	weekday?: number
	timesPerWeek?: number
	everyNDays?: number
	availableFromTime?: string
	recommendedTime?: string
	description?: string
}

const vaultTasks: TaskSeed[] = [
	{ title: 'Tanques agua aspiradora', recurrenceType: 'Daily' },
	{ title: 'Dientes', recurrenceType: 'Daily' },
	{ title: 'Ducha', recurrenceType: 'Daily' },
	{ title: 'Comida gatos', recurrenceType: 'Daily' },
	{ title: 'Agua gatos', recurrenceType: 'Daily' },
	{ title: 'Uñas', recurrenceType: 'EveryNDays', everyNDays: 7 },
	{ title: 'Limpiar robot', recurrenceType: 'EveryNDays', everyNDays: 7 },
	{ title: 'Comederos y bebederos gatos', recurrenceType: 'EveryNDays', everyNDays: 7 },
	{ title: 'Raparme', recurrenceType: 'EveryNDays', everyNDays: 7 },
	{ title: 'Limpiar mesa y organizar', recurrenceType: 'EveryNDays', everyNDays: 7, description: 'Salón' },
	{ title: 'Tirar basuras', recurrenceType: 'EveryNDays', everyNDays: 7, description: 'Salón' },
	{ title: 'Pasar robot', recurrenceType: 'EveryNDays', everyNDays: 7, description: 'Salón' },
	{ title: 'Aspirar sofá', recurrenceType: 'EveryNDays', everyNDays: 7, description: 'Salón' },
	{ title: 'Recoger basuras y loza', recurrenceType: 'EveryNDays', everyNDays: 7, availableFromTime: '20:00', description: 'Oficina' },
	{ title: 'Japonés', recurrenceType: 'TimesPerWeek', timesPerWeek: 3 },
	{ title: 'LeetCode', recurrenceType: 'TimesPerWeek', timesPerWeek: 3 },
	{ title: 'Deportes', recurrenceType: 'TimesPerWeek', timesPerWeek: 3 },
	{ title: 'Epic Games Store games', recurrenceType: 'Weekday', weekday: 4, recommendedTime: '17:00', description: 'Jueves a las 17:00 hora peninsular.' },
	{ title: 'Humble Bundle nuevo', recurrenceType: 'EveryNDays', everyNDays: 30, recommendedTime: '19:00', description: 'Humble Choice: primer martes de cada mes a las 10:00 PT, 19:00 en Santiago durante CEST.' },
	{ title: 'PS Plus monthly games', recurrenceType: 'EveryNDays', everyNDays: 30, recommendedTime: '12:00', description: 'Primer martes de cada mes, normalmente entre 11:00 y 13:00 en España.' },
	{ title: 'Drops de ONI', recurrenceType: 'Weekday', weekday: 5, description: 'Revisar los viernes la hora exacta de drops.' },
	{ title: 'Tienda diaria Destiny 2', recurrenceType: 'Daily', description: 'Revisar tienda diaria en Shoppation.' },
	{ title: 'Reset semanal Destiny 2', recurrenceType: 'Weekday', weekday: 2, recommendedTime: '19:00', description: 'Reset semanal martes 17:00 UTC, 19:00 en Santiago durante CEST.' },
	{ title: 'Xûr Destiny 2', recurrenceType: 'Weekday', weekday: 5, recommendedTime: '19:00', description: 'Xûr aparece viernes 17:00 UTC, 19:00 en Santiago durante CEST.' },
]

describe('DoIt real vault task import', () => {
	let apiUrl = 'http://localhost:5098'
	let token = ''
	let createdTaskIds: string[] = []

	afterEach(() => {
		if (!token || createdTaskIds.length === 0) {
			return
		}

		createdTaskIds.forEach((id) => {
			cy.request({ method: 'DELETE', url: `${apiUrl}/api/tasks/${id}`, auth: { bearer: token }, failOnStatusCode: false })
		})
	})

	it('creates every task from Todos.md and archives them afterwards', () => {
		createdTaskIds = []
		token = ''

		cy.env(['DOIT_API_URL', 'DOIT_E2E_REAL', 'DOIT_E2E_USERNAME', 'DOIT_E2E_PASSWORD'], { log: false }).then((env) => {
			apiUrl = String(env.DOIT_API_URL || 'http://localhost:5098')

			if (env.DOIT_E2E_REAL !== '1') {
				cy.log('Skipped. Set DOIT_E2E_REAL=1 plus DOIT_E2E_USERNAME and DOIT_E2E_PASSWORD to run against a real API.')
				return
			}

			const username = String(env.DOIT_E2E_USERNAME || '')
			const password = String(env.DOIT_E2E_PASSWORD || '')
			const runPrefix = `[e2e-vault-${Date.now()}]`

			if (!username || !password) {
				throw new Error('Missing DOIT_E2E_USERNAME or DOIT_E2E_PASSWORD')
			}

			cy.request('POST', `${apiUrl}/api/auth/login`, { username, password })
				.its('body.accessToken')
				.then((accessToken) => {
					token = accessToken
					cy.request({ url: `${apiUrl}/api/tasks`, auth: { bearer: token } })
				})
				.its('body')
				.then((existingTasks) => {
					const staleIds = existingTasks
						.filter((task: { id: string; title: string; isArchived: boolean }) => !task.isArchived && task.title.startsWith('[e2e-vault-'))
						.map((task: { id: string }) => task.id)

					staleIds.forEach((id: string) => {
						cy.request({ method: 'DELETE', url: `${apiUrl}/api/tasks/${id}`, auth: { bearer: token }, failOnStatusCode: false })
					})
				})

			vaultTasks.forEach((task) => {
				cy.request({
					method: 'POST',
					url: `${apiUrl}/api/tasks`,
					auth: { bearer: token },
					body: {
						title: `${runPrefix} ${task.title}`,
						description: task.description ?? null,
						scope: 'Personal',
						taskType: 'Routine',
						assignmentMode: 'SingleUser',
						schedule: {
							recurrenceType: task.recurrenceType,
							weekday: task.weekday ?? null,
							timesPerWeek: task.timesPerWeek ?? null,
							everyNDays: task.everyNDays ?? null,
							availableFromTime: task.availableFromTime ?? null,
							recommendedTime: task.recommendedTime ?? null,
						},
					},
				}).then((response) => {
					expect(response.status).to.eq(200)
					expect(response.body.title).to.eq(`${runPrefix} ${task.title}`)
					expect(response.body.schedule.recurrenceType).to.eq(task.recurrenceType)
					createdTaskIds.push(response.body.id)
				})
			})

			cy.request({ url: `${apiUrl}/api/tasks`, auth: { bearer: token } })
				.its('body')
				.then((tasks) => {
					const created = tasks.filter((task: { title: string; isArchived: boolean }) => !task.isArchived && task.title.startsWith(runPrefix))
					expect(created).to.have.length(vaultTasks.length)
				})

			cy.visit('/login')
			cy.contains('label', 'Usuario').find('input').type(username)
			cy.contains('label', 'Contraseña').find('input').type(password, { log: false })
			cy.contains('button', 'Entrar').click()
			cy.contains(`${runPrefix} Dientes`).should('be.visible')
			cy.window().then((window) => {
				expect(window.document.documentElement.scrollWidth).to.be.lte(window.innerWidth)
			})

			createdTaskIds.forEach((id) => {
				cy.request({ method: 'DELETE', url: `${apiUrl}/api/tasks/${id}`, auth: { bearer: token }, failOnStatusCode: false })
			})

			cy.request({ url: `${apiUrl}/api/tasks`, auth: { bearer: token } })
				.its('body')
				.then((tasks) => {
					const stillActive = tasks.filter((task: { title: string; isArchived: boolean }) => !task.isArchived && task.title.startsWith(runPrefix))
					expect(stillActive).to.have.length(0)
				})
		})
	})
})
