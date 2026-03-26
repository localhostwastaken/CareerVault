import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import apiConfig from "../config/APIEndpoints";

const baseQuery = fetchBaseQuery({
  baseUrl: apiConfig.getEndpoint(),
  credentials: "include",
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

export const APISlice = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Project", "User", "Auth"],
  endpoints: (_builder) => ({}),
});