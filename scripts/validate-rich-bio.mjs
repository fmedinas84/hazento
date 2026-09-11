import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

const require = createRequire(import.meta.url)
const source = fs.readFileSync(new URL('../packages/partners-config/RichBio.tsx', import.meta.url), 'utf8').replace("import './rich-bio.css'", '')
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
const format = {}
const formatSource = fs.readFileSync(new URL('../packages/partners-config/bio-format.ts', import.meta.url), 'utf8')
new Function('exports', ts.transpileModule(formatSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(format)
new Function('require', 'exports', compiled)(name => name === './bio-format' ? format : require(name), exports)
const render = value => renderToStaticMarkup(createElement(exports.RichBio, { value }))
const formatted = render('# Presentación\n## Servicios\nUn **texto** con *énfasis* y __subrayado__.\n\n- Uno\n- Dos\n\n1. Primero\n2. Segundo')
for (const tag of ['h3', 'h4', 'p', 'strong', 'em', 'u', 'ul', 'ol', 'li']) assert.ok(formatted.includes(`<${tag}>`), tag)
assert.ok(!formatted.includes('<h1>'))
assert.ok(render('<script>alert(1)</script>').includes('&lt;script&gt;'))
assert.ok(!render('<img src=x onerror=alert(1)>').includes('<img'))
assert.ok(render('Texto anterior\nSegunda línea').includes('<br/>'))
assert.ok(render('# ').includes('# '))
assert.ok(render('##').includes('##'))
console.log('Rich bio validation passed: formats, plain text, incomplete headings and HTML escaping.')
const doc = { type: 'doc', content: [
  { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Título' }] },
  { type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)>', marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }] }] },
  { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Uno' }] }] }] },
] }
const saved = format.encodeBio(doc)
assert.ok(saved.length < 1200)
const html = render(saved)
for (const tag of ['h3', 'strong', 'em', 'u', 'ol', 'li']) assert.ok(html.includes(`<${tag}>`))
assert.ok(html.includes('&lt;img'))
assert.ok(!html.includes('<img'))
assert.equal(format.encodeBio(format.decodeBio(saved)), saved)
assert.equal(format.decodeBio(format.BIO_PREFIX + '["script",[]]'), null)
assert.equal(format.decodeBio(format.BIO_PREFIX + '["__proto__",[]]'), null)
console.log('Visual bio validation passed: round trip, nested formatting, whitelist and escaped HTML.')
