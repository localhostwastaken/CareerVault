const config = {
  environment: import.meta.env.VITE_APP_ENV || 'local',
  endpoints: {
    prod: '',
    dev: '',
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
