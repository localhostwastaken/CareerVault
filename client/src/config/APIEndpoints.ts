const config = {
  environment: import.meta.env.VITE_APP_ENV || 'local',
  endpoints: {
    // Relative, same-origin: vercel.json proxies /api/v1/* to the Render API, so the browser only ever talks to career-vault-steel.vercel.app. That's what makes the auth cookies first-party instead of cross-site — see auth.controller.ts's cookieSecurity() comment for why cross-site cookies were getting dropped.
    prod: '/api/v1',
    dev: import.meta.env.VITE_API_URL || '',
    local: 'http://localhost:9900/api/v1',
  },
  getEndpoint(): string {
    switch (this.environment) {
      case 'local':
        return this.endpoints.local
      case 'development':
        return this.endpoints.dev
      case 'production':
        return this.endpoints.prod
      default:
        return 'http://localhost:9900/api/v1'
    }
  },
}

export default config
