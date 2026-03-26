import { configureStore } from "@reduxjs/toolkit";
import { APISlice } from "./apis/APISlice";

export const store = configureStore({
  reducer: {
    [APISlice.reducerPath]: APISlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(APISlice.middleware),
});