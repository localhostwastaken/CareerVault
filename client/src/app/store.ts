import { configureStore } from "@reduxjs/toolkit";
import { APISlice } from "@/apis/APISlice";
import roleReducer from "./slices/roleSlice";

export const store = configureStore({
  reducer: {
    [APISlice.reducerPath]: APISlice.reducer,
    role: roleReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(APISlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
