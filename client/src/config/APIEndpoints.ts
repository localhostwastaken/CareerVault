const config = {
  // Use Vite-prefixed environment variables
  environment: (import.meta.env.VITE_APP_ENV as string) || 'local',
  endpoints: {
    prod: (import.meta.env.VITE_API_URL_PROD as string) || 'https://api.yourapp.com',
    dev: (import.meta.env.VITE_API_URL_DEV as string) || 'https://dev-api.yourapp.com',
    local: (import.meta.env.VITE_API_URL_LOCAL as string) || 'http://localhost:3001',
  },
  getEndpoint() {
    switch (this.environment) {
      case 'local':
        return this.endpoints.local;
      case 'development':
      case 'dev':
        return this.endpoints.dev;
      case 'production':
      case 'prod':
        return this.endpoints.prod;
      default:
        return this.endpoints.local;
    }
  },
};

export default config;
