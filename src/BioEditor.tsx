import { useRef } from 'react'
import { RichBio } from '../packages/partners-config/RichBio'
import './bio-editor.css'

export function BioEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLTextAreaElement>(null)
  const apply = (style: string) => {
    const field = input.current
    if (!field) return
    const start = field.selectionStart, end = field.selectionEnd
    const selected = value.slice(start, end) || 'Texto'
    let from = start, to = end, replacement: string
    if (['bold', 'italic', 'underline'].includes(style)) {
      const marker = style === 'bold' ? '**' : style === 'italic' ? '*' : '__'
      replacement = marker + selected + marker
    } else {
      from = value.lastIndexOf('\n', start - 1) + 1
      const nextLine = value.indexOf('\n', end)
      to = nextLine < 0 ? value.length : nextLine
      replacement = (value.slice(from, to) || 'Texto').split('\n').map((line, i) => {
        const text = line.replace(/^(#{1,2}\s+|-\s+|\d+\.\s+)/, '')
        return (style === 'h1' ? '# ' : style === 'h2' ? '## ' : style === 'bullets' ? '- ' : style === 'numbers' ? `${i + 1}. ` : '') + text
      }).join('\n')
    }
    const next = value.slice(0, from) + replacement + value.slice(to)
    if (next.length > 1200) return
    onChange(next)
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(from, from + replacement.length) })
  }
  return <div className="bio-editor form-span">
    <label htmlFor="professional-bio">Quién soy</label>
    <div className="bio-toolbar" role="group" aria-label="Formato de la descripción">
      {([['h1','Título 1'],['h2','Título 2'],['paragraph','Párrafo'],['bullets','Viñetas'],['numbers','Lista numerada'],['bold','Negrita'],['underline','Subrayado'],['italic','Cursiva']] as const).map(([style,label]) => <button key={style} type="button" onMouseDown={event => event.preventDefault()} onClick={() => apply(style)}>{label}</button>)}
    </div>
    <textarea ref={input} id="professional-bio" value={value} maxLength={1200} rows={7} aria-describedby="bio-help" onChange={event => onChange(event.target.value)}/>
    <small id="bio-help">Selecciona texto y aplica un formato. Las marcas se convierten en estilos en la vista previa. {value.length}/1200 caracteres, incluido el formato.</small>
    <div className="bio-editor-preview"><strong>Vista previa</strong><RichBio value={value}/></div>
  </div>
}
