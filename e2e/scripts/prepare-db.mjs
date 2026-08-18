// Creates the dedicated e2e database and its pgvector extension.
//
// Runs as the first link of the API web-server command rather than from Playwright's
// globalSetup, because Playwright starts web servers BEFORE globalSetup — the API would
// otherwise race a database that does not exist yet.
//
// Connection strings arrive through the environment the Playwright config already builds,
// so the rule for deriving them lives in exactly one place (e2e/env.ts).
import pg from 'pg'

const adminUrl = process.env.E2E_ADMIN_DATABASE_URL
const targetUrl = process.env.DATABASE_URL
const targetName = process.env.E2E_DATABASE_NAME

if (!adminUrl || !targetUrl || !targetName) {
  console.error(
    '[e2e] E2E_ADMIN_DATABASE_URL, DATABASE_URL and E2E_DATABASE_NAME must all be set ' +
      '(the Playwright config supplies them).',
  )
  process.exit(1)
}

async function main() {
  const admin = new pg.Client({ connectionString: adminUrl })
  await admin.connect()
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      targetName,
    ])
    if (rowCount === 0) {
      // An identifier cannot be parameterised. The name is a constant in e2e/env.ts.
      await admin.query(`CREATE DATABASE "${targetName}"`)
      console.log(`[e2e] created database ${targetName}`)
    }
  } finally {
    await admin.end()
  }

  const db = new pg.Client({ connectionString: targetUrl })
  await db.connect()
  try {
    await db.query('CREATE EXTENSION IF NOT EXISTS vector')
  } finally {
    await db.end()
  }
  console.log(`[e2e] database ready: ${targetName}`)
}

main().catch((error) => {
  console.error('[e2e] database preparation failed:', error)
  process.exit(1)
})
