export const BIO_PREFIX = 'hazento-bio-v2:'
export const BIO_LIMIT = 1200
export type BioNode = { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: BioNode[] }
type Packed = [string, string | Packed[], number?]
const tags: Record<string, string> = { doc: 'd', paragraph: 'p', heading: 'h', bulletList: 'b', orderedList: 'o', listItem: 'l', hardBreak: 'r' }
const types = Object.fromEntries(Object.entries(tags).map(([type, tag]) => [tag, type]))
// Compact, versioned data, never executable HTML. Legacy text remains readable.
export function encodeBio(node: BioNode): string {
  const pack = (item: BioNode): Packed => item.type === 'text'
    ? ['t', item.text || '', (item.marks || []).reduce((bits, mark) => bits | ({ bold: 1, italic: 2, underline: 4 }[mark.type] || 0), 0)]
    : [tags[item.type || ''] || 'p', (item.content || []).map(pack), item.type === 'heading' ? Number(item.attrs?.level) : 0]
  return BIO_PREFIX + JSON.stringify(pack(node))
}
export function decodeBio(value: string): BioNode | null {
  if (!value.startsWith(BIO_PREFIX)) return null
  const unpack = (raw: unknown, depth: number): BioNode => {
    if (depth > 24 || !Array.isArray(raw)) throw new Error('Invalid biography')
    const [tag, content, flags] = raw
    if (tag === 't' && typeof content === 'string') return { type: 'text', text: content, marks: ['bold', 'italic', 'underline'].filter((_, i) => Number(flags) & (1 << i)).map(type => ({ type })) }
    if (!Object.hasOwn(types, tag) || !Array.isArray(content)) throw new Error('Invalid biography')
    return { type: types[tag], ...(tag === 'h' ? { attrs: { level: flags === 1 ? 1 : 2 } } : {}), content: content.map(child => unpack(child, depth + 1)) }
  }
  try { return unpack(JSON.parse(value.slice(BIO_PREFIX.length)), 0) } catch { return null }
}
