import { useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { RichBio } from '../packages/partners-config/RichBio'
import { BIO_LIMIT, decodeBio, encodeBio } from '../packages/partners-config/bio-format'
import './bio-editor.css'

function initialContent(value: string) {
  return decodeBio(value) || renderToStaticMarkup(<RichBio value={value}/>).replaceAll('<h3', '<h1').replaceAll('</h3>', '</h1>').replaceAll('<h4', '<h2').replaceAll('</h4>', '</h2>')
}

export function BioEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [limitReached, setLimitReached] = useState(false)
  const latestChange = useRef(onChange)
  latestChange.current = onChange
  const lastValue = useRef(value)
  const [startingContent] = useState(() => initialContent(value))
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2] }, blockquote: false, code: false, codeBlock: false, horizontalRule: false, link: false, strike: false, trailingNode: false }),
      Extension.create({ name: 'bioLength', addProseMirrorPlugins: () => [new Plugin({ filterTransaction(transaction, state) {
        if (!transaction.docChanged || transaction.getMeta('preventUpdate')) return true
        const size = encodeBio(transaction.doc.toJSON()).length
        const allowed = size <= BIO_LIMIT || size < encodeBio(state.doc.toJSON()).length
        setLimitReached(!allowed || size > BIO_LIMIT)
        return allowed
      } })] })],
    content: startingContent,
    editorProps: { attributes: { id: 'professional-bio', role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': 'bio-label', 'aria-describedby': 'bio-help', class: 'bio-document' } },
    onUpdate: ({ editor: current }) => {
      const next = current.getText().trim() ? encodeBio(current.getJSON()) : ''
      lastValue.current = next
      latestChange.current(next)
    },
  })
  const active = useEditorState({ editor, selector: ({ editor: current }) => ({
    h1: current?.isActive('heading', { level: 1 }), h2: current?.isActive('heading', { level: 2 }),
    bold: current?.isActive('bold'), italic: current?.isActive('italic'), underline: current?.isActive('underline'),
    bullets: current?.isActive('bulletList'), numbers: current?.isActive('orderedList'),
  }) })
  useEffect(() => {
    if (editor && value !== lastValue.current) {
      editor.commands.setContent(initialContent(value), { emitUpdate: false })
      lastValue.current = value
    }
  }, [editor, value])
  if (!editor) return null
  const buttons = [
    { label: 'Negrita', text: <strong>B</strong>, active: active?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: 'Cursiva', text: <em>I</em>, active: active?.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Subrayado', text: <u>U</u>, active: active?.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    { label: 'Viñetas', text: '• Lista', active: active?.bullets, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Lista numerada', text: '1. Lista', active: active?.numbers, run: () => editor.chain().focus().toggleOrderedList().run() },
  ]
  return <div className="bio-editor form-span">
    <label id="bio-label" htmlFor="professional-bio">Quién soy</label>
    <div className="bio-editor-frame">
      <div className="bio-toolbar" role="group" aria-label="Formato de la descripción">
        <select aria-label="Estilo de texto" value={active?.h1 ? 'h1' : active?.h2 ? 'h2' : 'p'} onChange={event => {
          const chain = editor.chain().focus()
          if (event.target.value === 'p') chain.setParagraph().run()
          else chain.setHeading({ level: event.target.value === 'h1' ? 1 : 2 }).run()
        }}><option value="p">Párrafo</option><option value="h1">Título 1</option><option value="h2">Título 2</option></select>
        {buttons.map(button => <button key={button.label} type="button" title={button.label} aria-label={button.label} aria-pressed={!!button.active} onMouseDown={event => event.preventDefault()} onClick={button.run}>{button.text}</button>)}
      </div>
      <EditorContent editor={editor}/>
    </div>
    <small id="bio-help">Escribe y selecciona el texto que quieras destacar. El formato se verá en tu landing.</small>
    {limitReached && <small role="alert">No queda espacio para ese cambio. Acorta la descripción o reduce el formato para continuar.</small>}
  </div>
}
