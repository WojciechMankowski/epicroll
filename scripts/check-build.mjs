// Sprawdza, czy build zawiera plik usługi i manifest działania bez internetu (SPEC.md F10).
// Uruchomienie po `npm run build`: npm run check:build
import { existsSync, readFileSync } from 'node:fs'

const dist = new URL('../dist/', import.meta.url)
const problems = []
const read = (name) => (existsSync(new URL(name, dist)) ? readFileSync(new URL(name, dist), 'utf8') : null)

const sw = read('sw.js')
if (!sw) problems.push('brak dist/sw.js')
else {
  if (!sw.includes('index.html')) problems.push('sw.js nie zapisuje index.html')
  if (!/latin-ext-[\w-]*\.woff2/.test(sw)) problems.push('sw.js nie zapisuje fontów z polskimi znakami')
  if (/script\.google\.com/.test(sw)) problems.push('sw.js nie może zapisywać odpowiedzi API')
}

const manifestText = read('manifest.webmanifest')
if (!manifestText) problems.push('brak dist/manifest.webmanifest')
else {
  const m = JSON.parse(manifestText)
  if (m.start_url !== '/epicroll/' || m.scope !== '/epicroll/') problems.push('manifest: start_url i scope muszą być /epicroll/')
  if (!m.icons?.some((i) => i.sizes === '512x512')) problems.push('manifest: brak ikony 512x512')
}

const html = read('index.html')
if (!html?.includes('manifest.webmanifest')) problems.push('index.html nie wskazuje manifestu')
if (!html?.includes('viewport-fit=cover')) problems.push('index.html: brak viewport-fit=cover')

if (problems.length) {
  console.error(`Build: ${problems.length} problem(y):\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log('Build: plik usługi, manifest i ikony na miejscu.')
