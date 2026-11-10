import { configureStore } from '@reduxjs/toolkit'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { ToastProvider } from '@/components/Toasts/ToastProvider'
import { NotificationService, NowService, OccurrenceService, TaskService, XpService } from '@/services'
import { authReducer } from '@/store/features/auth/authSlice'
import { tasksReducer } from '@/store/features/tasks/tasksSlice'
import { taskNotificationsReducer } from '@/store/features/taskNotifications/taskNotificationsSlice'
import { themeReducer } from '@/store/features/theme/themeSlice'
import { zonesReducer } from '@/store/features/zones/zonesSlice'
import { closeQuickCreate, uiReducer } from '@/store/features/ui/uiSlice'
import { nowReducer } from '@/store/features/now/nowSlice'
import { xpReducer } from '@/store/features/xp/xpSlice'
import type { TaskItem } from '@/models/task'
import { notificationPreferences, notificationTask } from '@/test/taskNotificationFixtures'
import { inheritedTaskNotifications, setAllTaskNotifications, taskNotificationKeys, toTaskNotificationUpdate } from '@/utils/taskNotifications'
import TasksPage from './TasksPage'

const tasks = [
	notificationTask('dishes', { title: 'Lavar platos' }),
	notificationTask('plants', { title: 'Regar plantas' }),
	notificationTask('package', { title: 'Recoger paquete', schedule: null }),
	notificationTask('shared', { title: 'Casa ajena', scope: 'House', assignmentMode: 'Anyone', assigneeIds: [], createdByUserId: 'other' }),
]
const overrides = tasks.map((task) => task.id === 'plants' ? setAllTaskNotifications(inheritedTaskNotifications(task.id), false) : inheritedTaskNotifications(task.id))
const settings = { preferences: notificationPreferences, tasks: overrides }
let liveTasks: TaskItem[]

function renderPage(items = tasks, role: 'Admin' | 'User' = 'Admin', entry = '/') {
	liveTasks = structuredClone(items)
	const store = configureStore({
		reducer: { auth: authReducer, tasks: tasksReducer, taskNotifications: taskNotificationsReducer, theme: themeReducer, zones: zonesReducer, ui: uiReducer, now: nowReducer, xp: xpReducer },
		preloadedState: {
			auth: { ...authReducer(undefined, { type: 'init' }), accessToken: 'token', user: { id: 'owner', username: 'owner', displayName: 'Owner', role, preferredLocale: 'es', isActive: true, createdAt: '', updatedAt: '' } },
			tasks: { items, loading: false, error: null },
		},
	})
	render(<Provider store={store}><MemoryRouter initialEntries={[entry]}><ToastProvider><TasksPage /></ToastProvider></MemoryRouter></Provider>)
	return store
}

beforeAll(() => {
	// jsdom does not implement native modal behavior; keyboard/focus trapping is
	// verified in the real-browser suite instead.
	Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true } })
	Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false } })
})

beforeEach(() => {
	vi.spyOn(NotificationService, 'getTaskSettings').mockResolvedValue(settings)
	vi.spyOn(NotificationService, 'updateTaskOverrides').mockImplementation(async (_token, updates) => updates.map(({ taskId, settings: value }) => ({ taskId, ...value })))
	vi.spyOn(NowService, 'get').mockResolvedValue({ date: '2026-11-10', scope: 'me', progress: { total: 0, pending: 0, done: 0, missed: 0, notApplicable: 0 }, zones: [] })
	vi.spyOn(XpService, 'me').mockResolvedValue({ totalXp: 0, weeklyXp: 0, currentLevel: 1, currentLevelXp: 0, nextLevelXp: 100, progressToNextLevel: 0 })
	vi.spyOn(TaskService, 'get').mockImplementation(async (_token, id) => structuredClone(liveTasks.find((task) => task.id === id)!))
	vi.spyOn(OccurrenceService, 'apply').mockImplementation(async (_token, id, action) => {
		const task = liveTasks.find((item) => item.occurrenceId === id)!
		task.occurrenceStatus = action === 'done' ? 'Done' : action === 'missed' ? 'Missed' : 'NotApplicable'
		task.occurrenceCompletedByUserId = 'owner'
		task.occurrenceCompletedAt = action === 'done' ? '2026-11-10T12:00:00Z' : null
		if (action === 'done' && task.schedule?.recurrenceType === 'Manual') task.isArchived = true
		return { occurrenceId: id, taskId: task.id, date: task.occurrenceDate!, status: task.occurrenceStatus, xpEarned: action === 'done' ? 10 : 0 }
	})
	vi.spyOn(OccurrenceService, 'undo').mockImplementation(async (_token, id) => {
		const task = liveTasks.find((item) => item.occurrenceId === id)!
		task.occurrenceStatus = 'Pending'
		task.occurrenceCompletedByUserId = null
		task.occurrenceCompletedAt = null
		task.isArchived = false
		return { occurrenceId: id, taskId: task.id, date: task.occurrenceDate!, status: 'Pending', xpEarned: 0 }
	})
})
afterEach(() => vi.restoreAllMocks())

describe('TasksPage notification controls', () => {
	it('labels one-off tasks as a group without changing the completion control', () => {
		const task = notificationTask('package', { title: 'Recoger paquete', schedule: { ...notificationTask('package').schedule!, recurrenceType: 'Manual', recommendedTime: null } })
		renderPage([task])
		const group = screen.getByRole('region', { name: 'Puntuales' })
		expect(within(group).getByRole('heading', { name: 'Puntuales', level: 2 })).toBeInTheDocument()
		expect(within(group).getByRole('checkbox', { name: 'Completar Recoger paquete' })).toBeEnabled()
	})

	it('completes a task directly from its row and can undo the exact current occurrence', async () => {
		const store = renderPage()
		await userEvent.click(screen.getByRole('checkbox', { name: 'Completar Lavar platos' }))
		await screen.findByText('Tarea completada')
		expect(OccurrenceService.apply).toHaveBeenCalledExactlyOnceWith('token', 'occ-dishes', 'done')
		expect(screen.getByRole('checkbox', { name: 'Deshacer la acción de Lavar platos' })).toBeChecked()
		expect(store.getState().tasks.items.find((task) => task.id === 'dishes')?.occurrenceStatus).toBe('Done')
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('checkbox', { name: 'Deshacer la acción de Lavar platos' }))
		await screen.findByText('Tarea restaurada')
		expect(OccurrenceService.undo).toHaveBeenCalledExactlyOnceWith('token', 'occ-dishes')
		expect(screen.getByRole('checkbox', { name: 'Completar Lavar platos' })).not.toBeChecked()
	})

	it('does not check a task or claim success if completing fails', async () => {
		vi.mocked(OccurrenceService.apply).mockRejectedValue(new Error('offline'))
		renderPage()
		await userEvent.click(screen.getByRole('checkbox', { name: 'Completar Lavar platos' }))
		await screen.findByText('No se pudo cambiar el estado de la tarea. Inténtalo de nuevo.')
		expect(screen.getByRole('checkbox', { name: 'Completar Lavar platos' })).not.toBeChecked()
		expect(screen.getByRole('checkbox', { name: 'Completar Lavar platos' })).toBeEnabled()
	})

	it('does not reopen an old deep-linked editor after completing a task', async () => {
		const store = renderPage(tasks, 'Admin', '/tasks?taskId=dishes')
		expect(store.getState().ui.editingTaskId).toBe('dishes')
		act(() => { store.dispatch(closeQuickCreate()) })
		await userEvent.click(screen.getByRole('checkbox', { name: 'Completar Lavar platos' }))
		await screen.findByText('Tarea completada')
		expect(store.getState().ui.quickCreateOpen).toBe(false)
	})

	it('retains the existing one-off archival behavior and restores the task through toast undo', async () => {
		const manual = notificationTask('package', { title: 'Recoger paquete', taskType: 'OneTime', schedule: { ...notificationTask('package').schedule!, recurrenceType: 'Manual', recommendedTime: null } })
		renderPage([manual])
		await userEvent.click(screen.getByRole('checkbox', { name: 'Completar Recoger paquete' }))
		await screen.findByText('La tarea puntual se ha guardado en Archivadas. Puedes deshacerlo.')
		expect(screen.queryByRole('article', { name: 'Recoger paquete' })).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
		await screen.findByText('Tarea restaurada')
		expect(screen.getByRole('checkbox', { name: 'Completar Recoger paquete' })).toBeInTheDocument()
	})

	it('does not use a recurring tasks future occurrence when completing the current one', async () => {
		const task = notificationTask('dishes', { title: 'Lavar platos', upcomingOccurrence: { id: 'future', date: '2099-01-01', status: 'Pending' } })
		renderPage([task])
		await userEvent.click(screen.getByRole('checkbox', { name: 'Completar Lavar platos' }))
		await screen.findByText('Tarea completada')
		expect(OccurrenceService.apply).toHaveBeenCalledWith('token', 'occ-dishes', 'done')
		expect(screen.getByRole('checkbox', { name: 'Deshacer la acción de Lavar platos' })).toBeChecked()
	})

	it('makes bulk selection distinct from completing a task', async () => {
		renderPage()
		await waitFor(() => expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeEnabled())
		await userEvent.click(screen.getByRole('button', { name: 'Seleccionar' }))
		expect(screen.queryByRole('checkbox', { name: 'Completar Lavar platos' })).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Lavar platos' }))
		expect(OccurrenceService.apply).not.toHaveBeenCalled()
		expect(screen.getByText('1 seleccionada')).toBeInTheDocument()
	})

	it('does not show a shared task as completed while the API still reports Pending', async () => {
		const task = notificationTask('dishes', { title: 'Lavar platos', scope: 'House', assignmentMode: 'AllAssignees', assigneeIds: ['owner', 'other'] })
		vi.mocked(OccurrenceService.apply).mockResolvedValue({ taskId: task.id, occurrenceId: task.occurrenceId!, date: '2026-11-10', status: 'Pending', xpEarned: 0 })
		vi.mocked(TaskService.get).mockResolvedValue({ ...task, occurrenceCompletedAt: '2026-11-10T12:00:00Z', occurrenceCompletedByUserId: 'owner' })
		renderPage([task])
		await userEvent.click(screen.getByRole('checkbox', { name: 'Completar Lavar platos' }))
		await screen.findByText('Tu parte está hecha; faltan otras personas')
		expect(screen.getByRole('checkbox', { name: 'Deshacer la acción de Lavar platos' })).toHaveAttribute('aria-checked', 'mixed')
	})

	it('does not offer completion to an unassigned non-admin user', () => {
		renderPage([notificationTask('shared', { title: 'Casa ajena', scope: 'House', createdByUserId: 'other', assigneeIds: ['other'] })], 'User')
		expect(screen.getByRole('checkbox', { name: 'No puedes completar Casa ajena: no está asignada a ti' })).toBeDisabled()
	})

	it('keeps task metadata accessible and opens the existing editor from the task name', async () => {
		const store = renderPage()
		const edit = screen.getByRole('button', { name: 'Editar Lavar platos' })
		expect(edit).toHaveAccessibleDescription(/Cada día/)
		await userEvent.click(edit)
		expect(store.getState().ui.editingTaskId).toBe('dishes')
		expect(store.getState().ui.quickCreateOpen).toBe(true)
	})

	it('exposes advanced filters on demand without losing their active state when collapsed', async () => {
		renderPage()
		const filters = screen.getByRole('button', { name: 'Filtros' })
		expect(filters).toHaveAttribute('aria-expanded', 'false')
		await userEvent.click(filters)
		expect(filters).toHaveAttribute('aria-expanded', 'true')
		await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Frecuencia: todas' }), 'Daily')
		expect(screen.getAllByRole('article')).toHaveLength(3)
		await userEvent.click(screen.getByRole('button', { name: /^Filtros/ }))
		expect(screen.getByRole('button', { name: /^Filtros/ })).toHaveAttribute('aria-expanded', 'false')
		expect(screen.getByRole('combobox', { name: 'Frecuencia: todas' })).toHaveValue('Daily')
		expect(screen.getAllByRole('article')).toHaveLength(3)
	})

	it('shows effective alert states and filters tasks without opening their editor', async () => {
		renderPage()
		await screen.findByRole('button', { name: 'Silenciar avisos de Lavar platos' })
		expect(within(screen.getByRole('article', { name: 'Lavar platos' })).getByText('Con avisos')).toBeInTheDocument()
		expect(within(screen.getByRole('article', { name: 'Regar plantas' })).getByText('Silenciada')).toBeInTheDocument()
		expect(within(screen.getByRole('article', { name: 'Recoger paquete' })).getByText('Sin hora de aviso')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: /^Con avisos 2$/ }))
		expect(screen.queryByRole('article', { name: 'Regar plantas' })).not.toBeInTheDocument()
		expect(screen.getAllByRole('article')).toHaveLength(2)
		await userEvent.click(screen.getByRole('button', { name: /^Sin avisos 2$/ }))
		expect(screen.getAllByRole('article')).toHaveLength(2)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('mutes all events in one click and restores the exact inherited values on undo', async () => {
		const store = renderPage()
		await userEvent.click(await screen.findByRole('button', { name: 'Silenciar avisos de Lavar platos' }))
		await screen.findByText('Avisos de la tarea silenciados')
		const saved = store.getState().taskNotifications.overrides.dishes
		expect(taskNotificationKeys.every((key) => saved[key] === false)).toBe(true)
		expect(within(screen.getByRole('article', { name: 'Lavar platos' })).getByText('Sin avisos')).toBeInTheDocument()
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
		await screen.findByText('Configuración anterior restaurada')
		expect(store.getState().taskNotifications.overrides.dishes).toEqual(inheritedTaskNotifications('dishes'))
		expect(NotificationService.updateTaskOverrides).toHaveBeenCalledTimes(2)
	})

	it('does not pretend a failed save muted a task', async () => {
		vi.mocked(NotificationService.updateTaskOverrides).mockRejectedValue(new Error('offline'))
		renderPage()
		await userEvent.click(await screen.findByRole('button', { name: 'Silenciar avisos de Lavar platos' }))
		await screen.findByText('No se cambiaron los avisos. Inténtalo de nuevo.')
		expect(within(screen.getByRole('article', { name: 'Lavar platos' })).getByText('Con avisos')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Silenciar avisos de Lavar platos' })).toBeEnabled()
	})

	it('bulk-mutes only owned tasks and keeps task data intact', async () => {
		const store = renderPage()
		await waitFor(() => expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeEnabled())
		await userEvent.click(screen.getByRole('button', { name: 'Seleccionar' }))
		expect(screen.getByRole('checkbox', { name: 'Seleccionar Casa ajena' })).toBeDisabled()
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar visibles' }))
		expect(screen.getByText('3 seleccionadas')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Silenciar seleccionadas' }))
		await screen.findByText('Avisos silenciados en 3 tareas')
		const ids = vi.mocked(NotificationService.updateTaskOverrides).mock.calls[0][1].map((update) => update.taskId)
		expect(ids.sort()).toEqual(['dishes', 'package', 'plants'])
		expect(store.getState().tasks.items).toEqual(tasks)
	})

	it('clears a selection when filters change so hidden tasks cannot be muted', async () => {
		renderPage()
		await waitFor(() => expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeEnabled())
		await userEvent.click(screen.getByRole('button', { name: 'Seleccionar' }))
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar visibles' }))
		await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar tareas' }), 'Lavar')
		expect(screen.getByText('0 seleccionadas')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Silenciar seleccionadas' })).toBeDisabled()
		await userEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar visibles' }))
		await userEvent.click(screen.getByRole('button', { name: 'Silenciar seleccionadas' }))
		await screen.findByText('Avisos silenciados en 1 tarea')
		expect(vi.mocked(NotificationService.updateTaskOverrides).mock.calls[0][1].map((update) => update.taskId)).toEqual(['dishes'])
	})

	it('shows unknown states on a load error instead of mislabelling tasks as muted, and retries', async () => {
		vi.mocked(NotificationService.getTaskSettings).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(settings)
		renderPage()
		await screen.findByRole('alert')
		expect(screen.getAllByText('Sin comprobar')).toHaveLength(4)
		expect(screen.getByRole('button', { name: /^Sin avisos/ })).toBeDisabled()
		expect(screen.queryByRole('button', { name: 'Silenciar avisos de Lavar platos' })).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
		await screen.findByRole('button', { name: 'Silenciar avisos de Lavar platos' })
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})

	it('opens a dedicated dialog with effective switches and saves only the changed event', async () => {
		renderPage()
		await waitFor(() => expect(screen.getByRole('button', { name: 'Configurar avisos de Lavar platos' })).toBeEnabled())
		await userEvent.click(screen.getByRole('button', { name: 'Configurar avisos de Lavar platos' }))
		const dialog = await screen.findByRole('dialog')
		const recommended = within(dialog).getByRole('switch', { name: 'Hora recomendada' })
		expect(recommended).toBeChecked()
		expect(within(dialog).getByRole('switch', { name: 'Tarea completada' })).toBeDisabled()
		await userEvent.click(recommended)
		await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
		await screen.findByText('Avisos actualizados')
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(vi.mocked(NotificationService.updateTaskOverrides).mock.calls[0][1][0].settings).toEqual({ ...toTaskNotificationUpdate(inheritedTaskNotifications('dishes')).settings, recommendedEnabled: false })
	})

	it('isolates the modal background and restores interaction and focus when closed', async () => {
		renderPage()
		const trigger = await screen.findByRole('button', { name: 'Configurar avisos de Lavar platos' })
		await waitFor(() => expect(trigger).toBeEnabled())
		const toolbar = screen.getByRole('region', { name: 'Tareas' })
		expect(toolbar).not.toHaveAttribute('inert')
		await userEvent.click(trigger)
		const dialog = await screen.findByRole('dialog')
		expect(dialog).toHaveAttribute('aria-modal', 'true')
		expect(toolbar).toHaveAttribute('inert')
		await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
		expect(toolbar).not.toHaveAttribute('inert')
		expect(trigger).toHaveFocus()
	})

	it('does not expose quick or editable notification controls for another creators House task', async () => {
		renderPage()
		await waitFor(() => expect(screen.getByRole('button', { name: 'Configurar avisos de Casa ajena' })).toBeEnabled())
		expect(screen.queryByRole('button', { name: 'Silenciar avisos de Casa ajena' })).not.toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Configurar avisos de Casa ajena' }))
		const dialog = await screen.findByRole('dialog')
		expect(within(dialog).getByText('Solo quien creó esta tarea puede cambiar sus avisos.')).toBeInTheDocument()
		expect(within(dialog).getByRole('switch', { name: 'Hora recomendada' })).toBeDisabled()
		expect(within(dialog).queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
	})

	it('does not invent inherited settings for a House task whose notification settings are not visible', async () => {
		vi.mocked(NotificationService.getTaskSettings).mockResolvedValue({ ...settings, tasks: overrides.filter((value) => value.taskId !== 'shared') })
		renderPage(tasks.map((task) => task.id === 'shared' ? { ...task, assignmentMode: 'SingleUser', assigneeIds: ['other'] } : task))
		await screen.findByRole('button', { name: 'Silenciar avisos de Lavar platos' })
		const row = screen.getByRole('article', { name: 'Casa ajena' })
		expect(within(row).getByText('No dirigidos a ti')).toBeInTheDocument()
		expect(within(row).queryByRole('button', { name: 'Configurar avisos de Casa ajena' })).not.toBeInTheDocument()
	})
})
