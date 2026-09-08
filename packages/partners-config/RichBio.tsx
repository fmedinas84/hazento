import { Fragment, type ReactNode } from 'react'
import './rich-bio.css'

// A deliberately small formatting vocabulary. HTML and URLs remain plain text.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('__') && part.endsWith('__')) return <u key={i}>{part.slice(2, -2)}</u>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

export function RichBio({ value }: { value: string }) {
  const lines = value.split(/\r?\n/)
  const blocks: ReactNode[] = []
  for (let i = 0; i < lines.length;) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const heading = line.match(/^(#{1,2})\s+(.+)$/)
    if (heading) {
      // Page name owns h1; these are two levels within the description section.
      blocks.push(heading[1].length === 1 ? <h3 key={i}>{inline(heading[2])}</h3> : <h4 key={i}>{inline(heading[2])}</h4>)
      i++; continue
    }
    const list = line.match(/^(- |\d+\. )/)
    if (list) {
      const start = i
      const ordered = list[1] !== '- '
      const pattern = ordered ? /^\d+\. (.*)$/ : /^- (.*)$/
      const items: ReactNode[] = []
      while (i < lines.length) {
        const match = lines[i].match(pattern)
        if (!match) break
        items.push(<li key={i}>{inline(match[1])}</li>); i++
      }
      blocks.push(ordered ? <ol key={start}>{items}</ol> : <ul key={start}>{items}</ul>)
      continue
    }
    const start = i
    const paragraph: ReactNode[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,2}\s+.+$|- |\d+\. )/.test(lines[i])) {
      paragraph.push(<Fragment key={i}>{i > start && <br/>}{inline(lines[i])}</Fragment>); i++
    }
    blocks.push(<p key={start}>{paragraph}</p>)
  }
  return <div className="rich-bio">{blocks}</div>
}
