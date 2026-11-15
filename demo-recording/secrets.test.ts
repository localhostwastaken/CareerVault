import assert from 'node:assert/strict'
import { test } from 'node:test'
import { redact } from './secrets.js'

// Playwright's call log quotes fill("…") values, so a take that fails after typing the
// password would print it. Every message the take prints goes through redact first.

test('removes every occurrence of the password from an error message', () => {
  const message = 'locator.fill: Timeout\n  - fill("hunter2-Secret")\n  - retrying fill("hunter2-Secret")'
  const clean = redact(message, ['hunter2-Secret'])
  assert.doesNotMatch(clean, /hunter2/)
  assert.match(clean, /fill\("•+"\)/)
})

test('leaves messages without secrets unchanged and ignores empty secrets', () => {
  assert.equal(redact('waiting for getByLabel("Email")', ['', 'x9-Secret']), 'waiting for getByLabel("Email")')
})
