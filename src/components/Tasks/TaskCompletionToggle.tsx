import { useId } from 'react'
import { useI18n } from '@/i18n'
import type { TaskItem } from '@/models/task'
import type { TaskCompletionControl } from '@/utils/taskCompletion'
import TaskIcon from './TaskIcon'

export default function TaskCompletionToggle({ task, control, busy, onToggle }: { task: TaskItem; control: TaskCompletionControl; busy: boolean; onToggle: () => void }) {
	const { t, formatDate } = useI18n()
	const descriptionId = useId()
	const labelKey = busy ? 'savingTask' : control.action === 'undo' ? 'undoTask' : control.action === 'early' ? 'completeEarlyTask' : control.action === 'complete' ? 'completeTask' : control.reason === 'unavailable' ? 'waitingTask' : control.reason === 'unassigned' ? 'unassignedTask' : control.state === 'done' ? 'completedTask' : control.reason === 'archived' ? 'archivedTask' : 'inactiveTask'
	const label = t(`taskActions.${labelKey}`).replace('{title}', task.title)
	const description = `${t(`taskActions.state.${control.state}`)}${control.date ? ` · ${formatDate(new Date(`${control.date}T00:00:00`))}` : ''}`
	return <>
		<button id={`task-complete-${task.id}`} className={`task-completion is-${control.state}${control.action === 'early' ? ' is-planned' : ''}${busy ? ' is-saving' : ''}`} type='button' role='checkbox' aria-checked={control.state === 'partial' ? 'mixed' : control.state === 'done'} aria-busy={busy || undefined} aria-label={label} aria-describedby={descriptionId} title={`${label} — ${description}`} disabled={busy || !control.action} onClick={onToggle}>
			<span className='task-completion__mark' aria-hidden='true'>{busy ? <TaskIcon name='spinner' /> : control.state === 'done' ? <TaskIcon name='check' /> : control.state === 'partial' || control.state === 'notApplicable' ? <TaskIcon name='minus' /> : control.state === 'missed' ? <TaskIcon name='close' /> : control.state === 'blocked' ? <TaskIcon name={control.reason === 'archived' ? 'archive' : 'clock'} /> : null}</span>
		</button>
		<span id={descriptionId} className='task-sr-only'>{description}</span>
	</>
}
