export interface AuditLogActor {
  fullName: string
  email: string
}

export interface AuditLog {
  id: string
  actorId: string | null
  actorType: 'USER' | 'SYSTEM' | 'CRON'
  action: string
  entityType: string
  entityId: string
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  retentionTier: 'STANDARD' | 'COMPLIANCE'
  createdAt: string
  actor: AuditLogActor | null
}

export interface PageMeta {
  page: number
  limit: number
  total: number
}

export interface AuditLogResponse {
  logs: AuditLog[]
  meta: PageMeta
}

export interface AuditLogQuery {
  page?: number
  limit?: number
  action?: string
  actorType?: string
  retentionTier?: string
}
