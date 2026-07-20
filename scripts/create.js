import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Resolve src/ relative to this script
const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '../src')

const [, , flag, name] = process.argv

if (!flag || !name) {
	console.error('Usage: npm run create -- --element <Name> | --component <Name>')
	process.exit(1)
}

// Converts PascalCase to kebab-case for CSS class names
function toKebab(str) {
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

// Creates a file and its parent directories; skips if file already exists
function writeFile(filePath, content) {
	mkdirSync(dirname(filePath), { recursive: true })

	if (existsSync(filePath)) {
		console.warn(`  skip    ${filePath} (already exists)`)
		return
	}

	writeFileSync(filePath, content, 'utf8')
	console.log(`  create  ${filePath}`)
}

// Creates a new element inside src/components/elements/
function createElement(name) {
	const kebab = toKebab(name)
	const base = `${SRC}/components/elements/${name}`

	writeFile(
		`${base}/${name}.tsx`,
		`import type { FC } from 'react'

interface ${name}Props {
	// Define props here
}

export const ${name}: FC<${name}Props> = (props) => {
	const { } = props
	return <div className='${kebab}'></div>
}
`
	)

	writeFile(
		`${base}/${name}.scss`,
		`@use '@/assets/styles' as *;

.${kebab} {
	// Styles here
}
`
	)

	// Auto-append named export to elements/index.ts
	const indexPath = `${SRC}/components/elements/index.ts`
	const exportLine = `export { ${name} } from './${name}/${name}'\n`
	const current = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''

	if (!current.includes(exportLine.trim())) {
		writeFileSync(indexPath, current + exportLine, 'utf8')
		console.log(`  update  ${indexPath}`)
	}
}

// Creates a new page component inside src/components/ with components/ and containers/
function createComponent(name) {
	const kebab = toKebab(name)
	const base = `${SRC}/components/${name}`

	writeFile(
		`${base}/components/${name}Component.tsx`,
		`import type { FC } from 'react'

const ${name}Component: FC = () => {
	return <div className='${kebab}-component'></div>
}

export default ${name}Component
`
	)

	writeFile(
		`${base}/components/${name}Component.scss`,
		`.${kebab}-component {
	// Styles here
}
`
	)

	writeFile(
		`${base}/containers/${name}.tsx`,
		`import '../components/${name}Component.scss'
import ${name}Component from '../components/${name}Component'

const ${name} = () => {
	return <${name}Component />
}

export default ${name}
`
	)
}

switch (flag) {
	case '--element':
		createElement(name)
		break
	case '--component':
		createComponent(name)
		break
	default:
		console.error(`Unknown flag: ${flag}. Use --element or --component.`)
		process.exit(1)
}
