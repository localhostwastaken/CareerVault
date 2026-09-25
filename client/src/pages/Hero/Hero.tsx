import { Link } from 'react-router-dom'
import { Anchor, ArrowRight, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AudiencePaths } from '@/features/landing/components/AudiencePaths'
import { HeroVerificationSample } from '@/features/landing/components/HeroVerificationSample'
import { HowItWorks } from '@/features/landing/components/HowItWorks'
import { VerifyTeaser } from '@/features/landing/components/VerifyTeaser'
import { PILLARS } from '@/features/landing/content'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// Act I of the product story, in the skill's Trust & Authority order:
// mission → proof → how it works → pick your path → try it → commit.
const Hero = () => {
  useDocumentTitle('Provable career credentials')

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8 lg:py-28">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-anchor/25 bg-anchor-soft px-3 py-1 text-micro text-anchor">
              <Anchor className="size-3.5" />
              Web 2.5 — SQL speed, blockchain trust
            </span>
            <h1 className="mt-6 font-serif text-h1 text-foreground sm:text-display">
              Career credentials you can <span className="text-seal">prove</span>.
            </h1>
            <p className="mt-5 max-w-xl text-body-lg text-muted-foreground">
              A fake experience letter takes five minutes to make and weeks to disprove. CareerVault lets companies
              issue cryptographically signed career documents, and gives people a lifelong wallet to prove them —
              in seconds, without anyone calling HR.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth/register">
                  Get started
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/verify">
                  <ScanLine />
                  Verify a document
                </Link>
              </Button>
            </div>

            <dl className="mt-12 flex flex-col gap-5 border-t border-border pt-6">
              {PILLARS.map((pillar) => (
                <div key={pillar.title} className="flex gap-3">
                  <pillar.icon className="mt-0.5 size-4 shrink-0 text-seal" aria-hidden />
                  <div>
                    <dt className="text-label font-semibold text-foreground">{pillar.title}</dt>
                    <dd className="mt-0.5 text-body text-muted-foreground">{pillar.body}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex shrink-0 justify-center lg:justify-end">
            <HeroVerificationSample />
          </div>
        </div>
      </section>

      <HowItWorks />
      <AudiencePaths />
      <VerifyTeaser />

      <section className="border-t border-border bg-primary py-16 lg:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="font-serif text-h1 text-primary-foreground">Start your verifiable record.</h2>
            <p className="mt-2 max-w-xl text-body-lg text-primary-foreground/75">
              Free for employees. Your documents stay yours, even after you leave.
            </p>
          </div>
          <Button asChild size="lg" variant="outline" className="shrink-0">
            <Link to="/auth/register">
              Create your wallet
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}

export default Hero
