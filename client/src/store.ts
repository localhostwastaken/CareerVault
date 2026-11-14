import { configureStore } from '@reduxjs/toolkit'
import { APISlice } from './apis/APISlice'
import { sessionCacheReset } from './apis/sessionCacheReset'
import authReducer from './features/auth/authSlice'

// A factory so tests can build an isolated store with the app's exact wiring.
export function createAppStore() {
  return configureStore({
    reducer: {
      [APISlice.reducerPath]: APISlice.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(sessionCacheReset.middleware).concat(APISlice.middleware),
  })
}

export const store = createAppStore()

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
