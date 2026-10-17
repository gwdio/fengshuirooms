// Starts the Vite dev server on a free port, runs every e2e/*.e2e.ts file with node:test against
// it, then shuts the server down. Usage: npm run e2e [-- <file filter>]
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const filter = process.argv[2] ?? ''
const files = readdirSync(here)
  .filter((f) => f.endsWith('.e2e.ts') && f.includes(filter))
  .map((f) => join(here, f))

const server = await createServer({
  root: join(here, '..'),
  configFile: join(here, '..', 'vite.config.ts'),
  server: { port: 0, strictPort: false },
  logLevel: 'warn',
})
await server.listen()
const url = server.resolvedUrls?.local[0]
if (!url) throw new Error('Vite did not report a URL')

// Async spawn: the dev server lives in this process and must keep serving while tests run.
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files], {
  stdio: 'inherit',
  env: { ...process.env, E2E_BASE_URL: url },
})
const code = await new Promise<number>((resolve) => child.on('exit', (c) => resolve(c ?? 1)))
await server.close()
process.exit(code)
