import { PageHeader } from '@/components/shared/PageHeader'
import { ChainPreflight } from '@/features/demo/components/ChainPreflight'
import { DemoAccounts } from '@/features/demo/components/DemoAccounts'
import { DemoClickPath } from '@/features/demo/components/DemoClickPath'
import { EncryptionFacts } from '@/features/system-status/components/EncryptionFacts'
import { RegistryFacts } from '@/features/system-status/components/RegistryFacts'
import { useGetSystemStatusQuery } from '@/features/system-status/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// The presenter's cockpit: the live trust configuration, the accounts, and the click
// path with a link to every screen and every PolygonScan page the demo touches, so
// nothing has to be found outside the app mid-presentation.
const DemoGuide = () => {
  useDocumentTitle('Demo guide')
  const chain = useGetSystemStatusQuery().data?.blockchain
  // The public RPCs the pre-flight reads are Amoy-only, and a local simulator has no chain.
  const isOnAmoy = chain?.chainId === 80002

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:px-8">
      <PageHeader
        eyebrow="Live fallback"
        title="Run the demo by hand"
        description="If the video can't be played, follow the same eleven steps live. Open the site five minutes early so Render wakes up, and check the pre-flight before you start."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RegistryFacts />
        <EncryptionFacts />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <DemoClickPath />
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {isOnAmoy && chain.contractAddress && chain.walletAddress && (
            <ChainPreflight contract={chain.contractAddress} wallet={chain.walletAddress} />
          )}
          <DemoAccounts />
        </div>
      </div>
    </div>
  )
}

export default DemoGuide
