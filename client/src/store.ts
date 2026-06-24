import { configureStore } from '@reduxjs/toolkit'
import { APISlice } from './apis/APISlice'
import authReducer from './features/auth/authSlice'

export const store = configureStore({
  reducer: {
    [APISlice.reducerPath]: APISlice.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(APISlice.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
