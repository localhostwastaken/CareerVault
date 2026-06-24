export interface AnalyticsOverview {
  documents: {
    total: number
    issued: number
    anchored: number
    revoked: number
    inProgress: number
    byStatus: Record<string, number>
  }
  members: {
    total: number
    byRole: Record<string, number>
  }
  sharing: {
    links: number
    views: number
  }
  talent: {
    jobOpenings: number
    matches: number
  }
}
