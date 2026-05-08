import { NavLink } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAppSelector } from "@/app/hooks";
import { ROLE_LABELS } from "@/app/slices/roleSlice";
import { NAV_BY_ROLE } from "./navConfig";
import { cn } from "@/lib/cn";

export const Sidebar = () => {
  const role = useAppSelector((s) => s.role.activeRole);
  const sections = NAV_BY_ROLE[role];

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
          <ShieldCheck className="size-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-text">CareerVault</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">
            {ROLE_LABELS[role]} workspace
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-4">
            {section.heading ? (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                {section.heading}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === `/${role === "verifier" ? "recruit" : role}`}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-soft text-primary"
                          : "text-text-muted hover:bg-surface-2 hover:text-text",
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" strokeWidth={2} />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto rounded-full bg-pending-soft px-1.5 text-[10px] font-semibold text-pending tnum">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3 text-[10px] text-text-subtle">
        <p>v1.0.0 · Demo prototype</p>
      </div>
    </aside>
  );
};
