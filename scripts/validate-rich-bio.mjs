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
new Function('require', 'exports', compiled)(require, exports)
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
