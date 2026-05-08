import {
  Anchor,
  ClipboardCheck,
  FileSignature,
  FileText,
  GanttChartSquare,
  Inbox,
  LayoutDashboard,
  Link2,
  Search,
  ShieldCheck,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/app/slices/roleSlice";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  holder: [
    {
      items: [
        { label: "Dashboard", to: "/holder", icon: LayoutDashboard },
        { label: "My documents", to: "/holder/documents", icon: FileText },
        { label: "Request a document", to: "/holder/request", icon: FileSignature },
        { label: "Share links", to: "/holder/links", icon: Link2 },
      ],
    },
  ],
  manager: [
    {
      items: [
        { label: "Inbox", to: "/manager", icon: Inbox },
        { label: "Draft a document", to: "/manager/draft", icon: FileSignature },
      ],
    },
  ],
  hr: [
    {
      items: [
        { label: "Approval queue", to: "/hr", icon: ClipboardCheck },
        { label: "Bulk issuance", to: "/hr/bulk", icon: UploadCloud },
      ],
    },
  ],
  admin: [
    {
      items: [
        { label: "Organisation", to: "/admin", icon: ShieldCheck },
        { label: "Members & allowlist", to: "/admin/members", icon: Users },
        { label: "Audit log", to: "/admin/audit", icon: GanttChartSquare },
      ],
    },
  ],
  verifier: [
    {
      items: [
        { label: "Talent search", to: "/recruit", icon: Search },
        { label: "Anchor engine", to: "/recruit/anchor", icon: Anchor },
      ],
    },
  ],
};

export const ROLE_HOME: Record<Role, string> = {
  holder: "/holder",
  manager: "/manager",
  hr: "/hr",
  admin: "/admin",
  verifier: "/recruit",
};
