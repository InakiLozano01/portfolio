// Minimal S3 client for the artifacts MinIO bucket: aws4 signing over fetch. Shared by the app and the encoder.
import aws4 from 'aws4'

const env = () => ({
  endpoint: new URL(process.env.ARTIFACTS_S3_ENDPOINT || 'http://minio:9000'),
  bucket: process.env.ARTIFACTS_S3_BUCKET || 'artifacts',
  credentials: { accessKeyId: process.env.ARTIFACTS_S3_ACCESS_KEY || '', secretAccessKey: process.env.ARTIFACTS_S3_SECRET_KEY || '' },
})

const enc = (key) => key.split('/').map(encodeURIComponent).join('/')

/** One signed request. `key` null targets the bucket itself. Throws on any status outside `ok`. */
export async function s3(method, key, { query = '', headers = {}, body, ok = [200, 204, 206] } = {}) {
  const { endpoint, bucket, credentials } = env()
  const path = `/${bucket}${key == null ? '' : `/${enc(key)}`}${query ? `?${query}` : ''}`
  const signed = aws4.sign(
    { host: endpoint.host, path, method, service: 's3', region: 'us-east-1', headers: { ...headers, 'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD' } },
    credentials,
  )
  const res = await fetch(`${endpoint.origin}${path}`, { method, headers: signed.headers, body, duplex: body ? 'half' : undefined })
  if (!ok.includes(res.status)) {
    const text = await res.text().catch(() => '')
    const err = new Error(`S3 ${method} ${key ?? ''} failed: ${res.status} ${/<Code>([^<]+)/.exec(text)?.[1] || ''}`)
    err.status = res.status
    throw err
  }
  return res
}

export const putObject = (key, body, contentType) => s3('PUT', key, { body, headers: { 'Content-Type': contentType } })

/** Streams an object; `range` is passed through as-is so the response can be 206. */
export const getObject = (key, range) => s3('GET', key, { headers: range ? { Range: range } : {}, ok: [200, 206, 416] })

export async function deleteObject(key) {
  await s3('DELETE', key, { ok: [204, 200, 404] })
}

/** Deletes every object under a prefix (an HLS rendition tree). */
export async function deletePrefix(prefix) {
  for (;;) {
    const xml = await (await s3('GET', null, { query: `list-type=2&max-keys=1000&prefix=${encodeURIComponent(prefix)}` })).text()
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => unxml(m[1]))
    if (!keys.length) return
    for (const key of keys) await deleteObject(key)
  }
}

const unxml = (s) => s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[e])

export async function createMultipart(key, contentType) {
  const xml = await (await s3('POST', key, { query: 'uploads=', headers: { 'Content-Type': contentType } })).text()
  return unxml(/<UploadId>([^<]+)<\/UploadId>/.exec(xml)[1])
}

export async function uploadPart(key, uploadId, n, body) {
  const res = await s3('PUT', key, { query: `partNumber=${n}&uploadId=${encodeURIComponent(uploadId)}`, body })
  return res.headers.get('etag')
}

export async function completeMultipart(key, uploadId, etags) {
  const parts = etags.map((etag, i) => `<Part><PartNumber>${i + 1}</PartNumber><ETag>${etag.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</ETag></Part>`).join('')
  const res = await s3('POST', key, { query: `uploadId=${encodeURIComponent(uploadId)}`, body: `<CompleteMultipartUpload>${parts}</CompleteMultipartUpload>` })
  // S3 can answer 200 with an <Error> body when completion fails late.
  const text = await res.text()
  if (/<Error>/.test(text)) throw new Error(`S3 complete failed: ${/<Code>([^<]+)/.exec(text)?.[1]}`)
}

export async function abortMultipart(key, uploadId) {
  await s3('DELETE', key, { query: `uploadId=${encodeURIComponent(uploadId)}`, ok: [204, 200, 404] })
}

export async function ensureBucket() {
  await s3('PUT', null, { ok: [200, 409] })
}
