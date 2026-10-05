import { useState, type DragEvent } from 'react'
import { FileUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CredentialDropzoneProps {
  onFile: (file: File) => void
}

// The file never leaves the browser: it is read locally and checked by verifyCredential.
export function CredentialDropzone({ onFile }: CredentialDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        isDragging ? 'border-seal bg-accent' : 'border-input hover:bg-surface-2',
      )}
    >
      <FileUp className="size-6 text-seal" aria-hidden />
      <span className="text-body font-semibold text-foreground">Drop the proof file here, or choose it</span>
      <span className="max-w-sm text-label text-muted-foreground">
        The <span className="font-mono">careervault-credential-….jsonld</span> file from a document&rsquo;s
        &ldquo;Download proof file&rdquo;. It is read in your browser and never uploaded.
      </span>
      <input
        type="file"
        accept=".jsonld,.json,application/ld+json,application/json"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
    </label>
  )
}
