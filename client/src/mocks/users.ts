import type { User } from "@/features/users/types";

export const mockUsers: User[] = [
  {
    id: "u_sarah",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    role: "holder",
    title: "Senior Software Engineer",
    avatarColor: "#1E3A8A",
    openToOpportunities: true,
  },
  {
    id: "u_alex",
    name: "Alex Patel",
    email: "alex.patel@example.com",
    role: "holder",
    title: "Frontend Engineer",
    avatarColor: "#7C3AED",
    openToOpportunities: false,
  },
  {
    id: "u_mark",
    name: "Mark Johnson",
    email: "mark.johnson@google.com",
    role: "manager",
    orgId: "org_google",
    title: "Engineering Manager",
    avatarColor: "#059669",
  },
  {
    id: "u_linda",
    name: "Linda Rao",
    email: "linda.rao@google.com",
    role: "hr",
    orgId: "org_google",
    title: "Senior HR Partner",
    avatarColor: "#DB2777",
  },
  {
    id: "u_james",
    name: "James Walsh",
    email: "james.walsh@google.com",
    role: "admin",
    orgId: "org_google",
    title: "VP People Operations",
    avatarColor: "#0EA5E9",
  },
  {
    id: "u_priya",
    name: "Priya Shah",
    email: "priya.shah@reevv.com",
    role: "verifier",
    title: "Talent Acquisition Lead",
    avatarColor: "#B45309",
  },
];

export const findUser = (id: string) => mockUsers.find((u) => u.id === id);
export const ACTIVE_HOLDER = mockUsers[0];
