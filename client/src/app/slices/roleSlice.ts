import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Role = "holder" | "manager" | "hr" | "admin" | "verifier";

export const ROLE_LABELS: Record<Role, string> = {
  holder: "Holder",
  manager: "Manager",
  hr: "HR Approver",
  admin: "Org Admin",
  verifier: "Recruiter",
};

interface RoleState {
  activeRole: Role;
  isAuthenticated: boolean;
  demoMode: boolean;
}

const STORAGE_KEY = "cv:activeRole";

function readStored(): Role | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "holder" || v === "manager" || v === "hr" || v === "admin" || v === "verifier") return v;
  return null;
}

const initialState: RoleState = {
  activeRole: readStored() ?? "holder",
  isAuthenticated: true,
  demoMode: typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") !== "0",
};

export const roleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    setRole(state, action: PayloadAction<Role>) {
      state.activeRole = action.payload;
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, action.payload);
    },
    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },
    setDemoMode(state, action: PayloadAction<boolean>) {
      state.demoMode = action.payload;
    },
  },
});

export const { setRole, setAuthenticated, setDemoMode } = roleSlice.actions;
export default roleSlice.reducer;
