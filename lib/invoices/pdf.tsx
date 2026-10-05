/* eslint-disable jsx-a11y/alt-text -- React-PDF images are PDF primitives, not HTML images. */
import React from 'react'
import path from 'node:path'
import fs from 'node:fs'
import { Document, Page, View, Text, Image, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { decimal, displayDate, InvoiceError, type InvoiceSnapshot } from './domain'

const assets = path.join(process.cwd(), 'assets', 'invoices')
const arialDir = process.env.INVOICE_ARIAL_DIR || path.join(assets, 'fonts')
const arialRegular = path.join(arialDir, 'Arial.ttf')
const arialBold = path.join(arialDir, 'Arial-Bold.ttf')
const hasArial = fs.existsSync(arialRegular) && fs.existsSync(arialBold)
Font.register({ family: 'InvoiceSans', fonts: [
  { src: hasArial ? arialRegular : path.join(assets, 'fonts/LiberationSans-Regular.ttf'), fontWeight: 400 },
  { src: hasArial ? arialBold : path.join(assets, 'fonts/LiberationSans-Bold.ttf'), fontWeight: 700 },
] })
Font.register({ family: 'InvoiceMono', src: path.join(assets, 'fonts/RobotoMono-Regular.ttf') })
Font.registerHyphenationCallback(word => [word])
const s = StyleSheet.create({
  page: { fontFamily: 'InvoiceSans', fontSize: 11, color: '#000000', paddingTop: 58, paddingLeft: 43.5, paddingRight: 45.5, paddingBottom: 36 },
  row: { flexDirection: 'row' },
  border: { borderWidth: 1, borderColor: '#000000' },
  third: { width: '33.3333%', padding: 5, justifyContent: 'center' },
  bold: { fontWeight: 700 },
  heading: { fontSize: 13, fontWeight: 700 },
  center: { textAlign: 'center' },
  leftRule: { borderLeftWidth: 1 },
  topRule: { borderTopWidth: 1 },
  labelRow: { minHeight: 26, alignItems: 'center', justifyContent: 'center', padding: 4 },
  valueRow: { minHeight: 23, alignItems: 'center', justifyContent: 'center', padding: 4 },
  customerRow: { minHeight: 26, padding: 5, justifyContent: 'center' },
  item: { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1 },
  itemId: { width: 44, justifyContent: 'center', padding: 4, textAlign: 'center' },
  description: { width: 267, borderLeftWidth: 1, padding: 5, fontSize: 10, lineHeight: 1.15 },
  unit: { width: 90, borderLeftWidth: 1, padding: 4, justifyContent: 'center', textAlign: 'center' },
  total: { width: 106, borderLeftWidth: 1, padding: 4, justifyContent: 'center', textAlign: 'center' },
})

// Bound every unbreakable row, including long URLs/words. React-PDF can then move
// complete rows to the next page without clipping or losing description text.
const fontDescriptors = [
  { fontFamily: 'InvoiceSans', fontWeight: 400 },
  { fontFamily: 'InvoiceSans', fontWeight: 700 },
  { fontFamily: 'InvoiceMono', fontWeight: 400 },
]
function breakWords(text: string, region = 24) {
  const font = Font.getFont(fontDescriptors[region === 40 ? 2 : region === 24 ? 1 : 0]).data!
  const size = region === 24 || region === 40 ? 10 : 11
  const width = region === 14 || region === 26 ? 154 : 254
  return text.replace(/\S+/gu, word => {
    const lines: string[] = []; let line = ''
    for (const char of Array.from(word)) {
      const next = line + char
      const advance = font.layout(next).positions.reduce((sum: number, position: { xAdvance: number }) => sum + position.xAdvance, 0) * size / font.unitsPerEm
      if (line && advance > width) { lines.push(line); line = char } else line = next
    }
    lines.push(line)
    return lines.join('\n')
  })
}
export function chunks(text: string): string[] {
  const result: string[] = []
  let rest = text
  while (rest.length) {
    const lineBreaks = [...rest.matchAll(/\n/g)]
    const limit = Math.min(650, lineBreaks.length > 9 ? lineBreaks[9].index! + 1 : rest.length)
    if (rest.length <= limit) { result.push(rest); break }
    let at = rest.lastIndexOf(' ', limit)
    if (at < Math.min(350, limit)) at = limit
    // Avoid splitting UTF-16 surrogate pairs.
    if (/[\uD800-\uDBFF]/.test(rest[at - 1])) at--
    result.push(rest.slice(0, at)); rest = rest.slice(at)
  }
  return result
}
const amount = (value: string) => 'U$D ' + decimal(value).replace(/\.00$/, '')

export function InvoiceDocument({ snapshot, proof = false, signature }: { snapshot: InvoiceSnapshot; proof?: boolean; signature?: Buffer }) {
  const v = snapshot.invoice
  const rows = v.items.flatMap((item, index) => chunks(item.description).map((part, segment) => <View style={[s.item, { minHeight: 70 }]} key={`${index}-${segment}`} wrap={false}>
        <View style={s.itemId}><Text>{String(index + 1).padStart(3, '0')}</Text></View>
        <View style={s.description}>
          <Text style={[s.bold, s.center]}>{breakWords(item.title)}{segment > 0 ? ' (continued)' : ''}</Text>
          <Text style={{ textAlign: 'justify' }}>{part.split(/(\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?)/gi).map((piece, i) => <Text key={i} style={i % 2 ? { fontFamily: 'InvoiceMono', color: '#188038' } : {}}>{breakWords(piece, i % 2 ? 40 : 24)}</Text>)}</Text>
        </View>
        <View style={s.unit}><Text>{segment === 0 ? amount(snapshot.lineCents[index]) : ''}</Text></View>
        <View style={s.total}><Text>{segment === 0 ? amount(snapshot.lineCents[index]) : ''}</Text></View>
      </View>))
  return <Document title={`Invoice ${snapshot.number}`} author="Iñaki Lozano Tech Solutions" language="en">
    <Page size={[596, 842]} style={s.page}>
      {proof && <Text fixed style={{ position: 'absolute', top: 10, left: 43.5, color: '#9b2525', fontSize: 9 }}>DESIGN PROOF — NOT ISSUED — UNSIGNED</Text>}
      <Text fixed style={{ position: 'absolute', top: 26, left: 43.5, fontSize: 9 }} render={({ pageNumber }) => pageNumber > 1 ? `${snapshot.number} · continued` : ''} />
      <View style={[s.border, { width: 506 }]} wrap={false}>
        <View style={[s.row, { minHeight: 106 }]}>
          <View style={[s.third, { alignItems: 'center' }]}><Image src={path.join(assets, 'logo-primary.png')} style={{ width: 91.5, height: 90.75 }} /></View>
          <View style={[s.third, s.leftRule]}><Text style={[s.bold, s.center, { fontSize: 18 }]}>INVOICE</Text></View>
          <View style={[s.third, s.leftRule]}><Text style={[s.heading, s.center]}>Iñaki Lozano Tech{'\n'}Solutions</Text></View>
        </View>
        <View style={[s.row, s.topRule]}>{['Invoice No.', 'Place of Issue', 'Date of Issue'].map((label, i) => <View key={label} style={[s.third, s.labelRow, ...(i ? [s.leftRule] : [])]}><Text style={[s.heading, s.center]}>{label}</Text></View>)}</View>
        <View style={[s.row, s.topRule]}>{[snapshot.number, v.placeOfIssue, displayDate(v.issueDate)].map((value, i) => <View key={i} style={[s.third, s.valueRow, ...(i ? [s.leftRule] : [])]}><Text style={s.center}>{breakWords(value, 14)}</Text></View>)}</View>
        <View style={[s.topRule, s.customerRow]}><Text><Text style={s.heading}>Supplier: </Text>{breakWords(v.supplier)}</Text></View>
        <View style={[s.row, s.topRule, { minHeight: 42 }]}>
          <View style={s.third}><Text style={s.heading}>Representative:</Text><Text>{breakWords(v.representative, 14)}</Text></View>
          <View style={[s.third, s.leftRule]}><Text style={s.heading}>Email:</Text><Text>{breakWords(v.email, 26)}</Text></View>
          <View style={[s.third, s.leftRule]}><Text><Text style={s.heading}>Phone: </Text>{breakWords(v.phone, 14)}</Text></View>
        </View>
      </View>
      <View style={[s.border, { marginTop: 14, width: 507 }]} wrap={false}>
        <View style={[s.customerRow, { minHeight: 25 }]}><Text><Text style={s.heading}>Company Name: </Text>{breakWords(v.customerCompany)}</Text></View>
        <View style={[s.customerRow, s.topRule]}><Text><Text style={s.heading}>Business Address: </Text>{breakWords(v.customerAddress)}</Text></View>
      </View>
      <View wrap={false}>
      <View style={[s.item, { marginTop: 15, borderTopWidth: 1, minHeight: 42 }]} wrap={false}>
        <View style={s.itemId}><Text style={s.heading}>ITEM</Text></View>
        <View style={[s.description, { justifyContent: 'center' }]}><Text style={[s.heading, s.center]}>DESCRIPTION</Text></View>
        <View style={s.unit}><Text style={s.heading}>UNIT PRICE{'\n'}($ - USD)</Text></View>
        <View style={s.total}><Text style={s.heading}>TOTAL{'\n'}($ - USD)</Text></View>
      </View>
      {rows[0]}
      </View>
      {rows.slice(1)}
      <View wrap={false}>
        <View style={[s.item, { minHeight: 90 }]}>
          <View style={{ width: 311, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
            <Image src={path.join(assets, 'logo-muted.png')} style={{ width: 56.25, height: 55.5 }} />
            <Text style={{ marginTop: 5 }}>Iñaki Lozano Tech Solutions</Text>
          </View>
          <View style={{ width: 196, borderLeftWidth: 1 }}>
            <View style={[s.row, { minHeight: 37 }]}>
              <View style={{ width: 90, padding: 5, justifyContent: 'center' }}><Text style={s.bold}>CURRENCY:</Text></View>
              <View style={{ width: 106, padding: 5, borderLeftWidth: 1 }}><Text style={s.bold}>USD - United{'\n'}States Dollars</Text></View>
            </View>
            <View style={[s.row, s.topRule, { minHeight: 53 }]}>
              <View style={{ width: 90, padding: 5 }}><Text style={s.bold}>TOTAL{'\n'}AMMOUNT{'\n'}(USD):</Text></View>
              <View style={{ width: 106, padding: 5, borderLeftWidth: 1, justifyContent: 'center' }}><Text style={s.center}>{amount(snapshot.totalCents)}</Text></View>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 30, marginLeft: 266 }}>
          <Text style={s.heading}>SIGNATURE:</Text>
          {signature && <Image src={{ data: signature, format: 'png' }} style={{ width: 190, height: 46, marginTop: 8 }} />}
        </View>
      </View>
      <Text fixed style={{ position: 'absolute', bottom: 20, right: 45.5, fontSize: 8 }} render={({ pageNumber, totalPages }) => totalPages > 1 ? `${pageNumber} / ${totalPages}` : ''} />
    </Page>
  </Document>
}

// Serialize renderer work in each process to bound font/layout memory usage.
let tail: Promise<unknown> = Promise.resolve()
export function renderInvoice(snapshot: InvoiceSnapshot, proof = false): Promise<Buffer> {
  if (!proof && !hasArial && process.env.INVOICE_FONT !== 'liberation-sans') return Promise.reject(new InvoiceError(503, 'PDF export requires licensed Arial fonts or approval to use Liberation Sans'))
  const result = tail.then(async () => {
    // Read only the operator-configured private file, never a client-supplied path.
    // Proofs remain unsigned. A normal export must not silently omit the signature.
    let signature: Buffer | undefined
    if (!proof) {
      try {
        const file = process.env.INVOICE_SIGNATURE_PATH
        if (!file || !path.isAbsolute(file)) throw new Error('Missing signature')
        const stat = await fs.promises.stat(file)
        if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('Invalid signature')
        signature = await fs.promises.readFile(file)
        if (signature.length < 24 || signature.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid signature')
      } catch {
        throw new InvoiceError(503, 'The private invoice signature is unavailable; PDF export can be retried after configuration is restored')
      }
    }
    await Promise.all(fontDescriptors.map(descriptor => Font.load(descriptor)))
    const fonts = fontDescriptors.slice(0, 2).map(descriptor => Font.getFont(descriptor).data!)
    const text = Object.entries(snapshot.invoice).filter(([key]) => key !== 'items').map(([, value]) => String(value)).join('') + snapshot.invoice.items.map(i => i.title + i.description).join('')
    if (Array.from(text).some(char => !/\s/u.test(char) && fonts.some(font => !font.hasGlyphForCodePoint(char.codePointAt(0)!)))) {
      throw new InvoiceError(422, 'Some characters are not supported by the invoice fonts; revise the text before exporting')
    }
    return renderToBuffer(<InvoiceDocument snapshot={snapshot} proof={proof} signature={signature} />)
  })
  tail = result.catch(() => undefined)
  return result
}
