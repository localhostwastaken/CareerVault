import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingHero } from "./sections/LandingHero";
import { LandingRoleSelector } from "./sections/LandingRoleSelector";
import { LandingHowItWorks } from "./sections/LandingHowItWorks";
import { LandingTrust } from "./sections/LandingTrust";
import { LandingCta, LandingFooter } from "./sections/LandingFooter";

const TopNav = () => (
  <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
    <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="size-4 text-white" strokeWidth={2.5} />
        </span>
        <span className="text-sm font-bold tracking-tight text-text">CareerVault</span>
      </Link>
      <nav className="hidden items-center gap-6 sm:flex">
        <a href="#how" className="text-sm font-medium text-text-muted hover:text-text">How it works</a>
        <a href="#roles" className="text-sm font-medium text-text-muted hover:text-text">Roles</a>
        <Link to="/verify/abc-123-def-456" className="text-sm font-medium text-text-muted hover:text-text">
          Try a verifier link
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <Link to="/auth/login">
          <Button size="sm" variant="ghost">Sign in</Button>
        </Link>
        <Link to="/auth/register">
          <Button size="sm">Get started</Button>
        </Link>
      </div>
    </div>
  </header>
);

const Landing = () => (
  <div className="bg-bg">
    <TopNav />
    <LandingHero />
    <section id="roles">
      <LandingRoleSelector />
    </section>
    <section id="how">
      <LandingHowItWorks />
    </section>
    <LandingTrust />
    <LandingCta />
    <LandingFooter />
  </div>
);

export default Landing;
