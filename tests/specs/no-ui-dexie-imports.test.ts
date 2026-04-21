import fs from 'fs'
import path from 'path'

// TDD: RED test that fails if any UI component imports the Dexie DB directly.
// This enforces the rule: UI -> Hook -> Service -> DB

const ROOT = path.resolve(__dirname, '..')

function listFiles(dir: string, ext = '.tsx'): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  let results: string[] = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) results = results.concat(listFiles(full, ext))
    else if (e.isFile() && full.endsWith(ext)) results.push(full)
  }
  return results
}

test('UI components must not import the Dexie DB directly', () => {
  const componentsDir = path.join(ROOT, 'features')
  if (!fs.existsSync(componentsDir)) return

  const files = listFiles(componentsDir, '.tsx')
  const offenders: string[] = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    // Match import statements that reference db/dexie or lib/db
    if (/from ['"]@\/lib\/db\/dexie['"]/m.test(content)) offenders.push(file)
    else if (/from ['"]@\/lib\/db['"]/m.test(content)) offenders.push(file)
    else if (/from ['"]\.\.\/\.\.\/lib\/db\/dexie['"]/m.test(content)) offenders.push(file)
  }

  if (offenders.length > 0) {
    const message = ['Found UI components importing Dexie DB directly:']
      .concat(offenders.map(f => ` - ${path.relative(ROOT, f)}`))
      .join('\n')
    throw new Error(message)
  }
})
