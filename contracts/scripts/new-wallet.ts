import { ethers } from 'hardhat'
import * as fs from 'node:fs'
import * as path from 'node:path'

const KEY = 'ANCHOR_PRIVATE_KEY'

// Defaults are the two real env files, resolved from this script's own location so
// they don't depend on the cwd `hardhat run` was invoked from. Override with
// NEW_WALLET_ENV_FILES (comma-separated absolute paths) for testing — never point
// this at the real files outside of a deliberate, reviewed run.
const DEFAULT_ENV_FILES = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', 'server', '.env'),
]

function targetFiles(): string[] {
  const raw = process.env.NEW_WALLET_ENV_FILES
  if (!raw) return DEFAULT_ENV_FILES
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => path.resolve(entry))
}

// Seeds a missing env file from a sibling `.env.example`, private by construction:
// mode is set explicitly (not just at open) since umask can weaken the `mode` option.
function ensureFileExists(filePath: string): void {
  if (fs.existsSync(filePath)) return
  const examplePath = path.join(path.dirname(filePath), '.env.example')
  const seed = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : ''
  fs.writeFileSync(filePath, seed, { mode: 0o600 })
  fs.chmodSync(filePath, 0o600)
}

function readExistingValue(content: string, key: string): string | null {
  for (const line of content.split('\n')) {
    if (line.startsWith(`${key}=`)) {
      return line.slice(key.length + 1).trim()
    }
  }
  return null
}

// Replaces the key line if present, otherwise appends it; every other line is
// passed through untouched.
function upsertValue(content: string, key: string, value: string): string {
  const marker = `${key}=`
  const lines = content.split('\n')
  let replaced = false
  const next = lines.map((line) => {
    if (line.startsWith(marker)) {
      replaced = true
      return `${marker}${value}`
    }
    return line
  })
  if (!replaced) {
    next.push(`${marker}${value}`)
  }
  return `${next.join('\n').replace(/\n+$/, '')}\n`
}

async function main() {
  const force = process.env.FORCE === '1'
  const files = targetFiles()

  // Validate every target before writing any of them — a partial write would leave
  // the contracts and server keys out of sync.
  for (const file of files) {
    ensureFileExists(file)
    const content = fs.readFileSync(file, 'utf8')
    const existing = readExistingValue(content, KEY)
    if (existing && existing.length > 0 && !force) {
      throw new Error(
        `Refusing to overwrite a non-empty ${KEY} in ${file}. Re-run with FORCE=1 to replace it.`,
      )
    }
  }

  const wallet = ethers.Wallet.createRandom()

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    fs.writeFileSync(file, upsertValue(content, KEY, wallet.privateKey))
  }

  console.log(`New anchor wallet address: ${wallet.address}`)
  console.log('Fund it on Polygon Amoy before anchoring anything:')
  console.log('  https://faucet.polygon.technology/')
  console.log('  https://www.alchemy.com/faucets/polygon-amoy')
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exitCode = 1
})
