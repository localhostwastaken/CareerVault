import { Link } from 'react-router-dom'
import { ArrowRight, Binary } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function Sha256LabCard() {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Binary className="size-4 text-seal" aria-hidden />
          <h2 className="text-h2 text-foreground">SHA-256 lab</h2>
        </div>
        <p className="mt-0.5 text-body text-muted-foreground">
          Type a word and follow it bit by bit through padding, the 64-word message schedule and all 64 compression
          rounds, in our own implementation.
        </p>
      </div>
      <Button asChild variant="outline" className="w-fit">
        <Link to="/demo/sha256">
          Open the lab
          <ArrowRight />
        </Link>
      </Button>
    </Card>
  )
}
