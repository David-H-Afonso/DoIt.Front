export type BackupSchedule = {
	userId: string
	username: string
	destinationPath: string
	retentionCount: number
	fileNamePrefix: string
	fileNameSuffix: string
	lastRunAt: string | null
	lastRunStatus: 'never' | 'running' | 'success' | 'failed'
	lastRunMessage: string | null
}

export type UpdateBackupScheduleRequest = {
	destinationPath: string
	retentionCount: number
	fileNamePrefix: string
	fileNameSuffix: string
}

export type FullBackupResponse = {
	fileName: string
	sizeBytes: number
	createdAt: string
	destinationPath: string
}
