import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const casesDirectory = path.join(
  projectDirectory,
  'frontend/app/data/scenarios/cases',
)

const outputFile = path.join(
  projectDirectory,
  'backend/database/data/detective-cases.json',
)

const caseFiles = fs
  .readdirSync(casesDirectory)
  .filter(file => /^case\d+\.ts$/.test(file))
  .sort()

const scenarios = caseFiles.map(file => {
  const source = fs.readFileSync(
    path.join(casesDirectory, file),
    'utf8',
  )

  const assignmentIndex = source.indexOf('Scenario =')

  if (assignmentIndex === -1) {
    throw new Error(`Cannot find Scenario assignment in ${file}`)
  }

  const objectStart = source.indexOf('{', assignmentIndex)
  const objectEnd = source.lastIndexOf('}')

  if (objectStart === -1 || objectEnd <= objectStart) {
    throw new Error(`Cannot extract scenario object from ${file}`)
  }

  const objectSource = source.slice(
    objectStart,
    objectEnd + 1,
  )

  return vm.runInNewContext(
    `(${objectSource})`,
    Object.create(null),
    { filename: file },
  )
})

fs.mkdirSync(path.dirname(outputFile), {
  recursive: true,
})

fs.writeFileSync(
  outputFile,
  `${JSON.stringify(scenarios, null, 2)}\n`,
)

console.log(
  `Exported ${scenarios.length} detective cases to ${outputFile}`,
)
