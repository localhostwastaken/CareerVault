import type { Role } from "@/app/slices/roleSlice";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgId?: string;
  title?: string;
  avatarColor?: string;
  openToOpportunities?: boolean;
}
