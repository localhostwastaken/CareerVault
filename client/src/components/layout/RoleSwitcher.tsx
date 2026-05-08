import { useNavigate } from "react-router-dom";
import { Briefcase, ChevronDown, ClipboardCheck, FileSignature, Search, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { ROLE_LABELS, setRole, type Role } from "@/app/slices/roleSlice";
import { ROLE_HOME } from "./navConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_ICON: Record<Role, LucideIcon> = {
  holder: User,
  manager: FileSignature,
  hr: ClipboardCheck,
  admin: ShieldCheck,
  verifier: Search,
};

const ROLE_TAGLINE: Record<Role, string> = {
  holder: "Career wallet & sharing",
  manager: "Sign documents",
  hr: "Approve & issue",
  admin: "Trust & members",
  verifier: "Verify candidates",
};

export const RoleSwitcher = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.role.activeRole);
  const demoMode = useAppSelector((s) => s.role.demoMode);

  if (!demoMode) return null;

  const handleSwitch = (next: Role) => {
    dispatch(setRole(next));
    navigate(ROLE_HOME[next]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
        <Briefcase className="size-4 text-text-muted" />
        <span>Demo as {ROLE_LABELS[role]}</span>
        <ChevronDown className="size-3.5 text-text-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Switch role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => {
          const RoleIcon = ROLE_ICON[r];
          const active = r === role;
          return (
            <DropdownMenuItem key={r} onClick={() => handleSwitch(r)} className="gap-3">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary text-white" : "bg-surface-2 text-text-muted"}`}>
                <RoleIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{ROLE_LABELS[r]}</p>
                <p className="truncate text-xs text-text-muted">{ROLE_TAGLINE[r]}</p>
              </div>
              {active ? <span className="ml-2 rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-verified">Active</span> : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[10px] text-text-subtle">
          Demo control · hidden when <code className="font-mono">?demo=0</code>
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
