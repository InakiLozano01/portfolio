// Run in a networkless container with the installed release dependencies.
const assert = require('node:assert/strict')
const { getToken } = require('next-auth/jwt')
const DOMPurify = require('isomorphic-dompurify')
const nodemailer = require('portfolio-nodemailer')
const sharp = require('sharp')

async function check() {
  assert.equal(await getToken({
    req: { headers: { authorization: 'Bearer %' }, cookies: {} },
    secret: 'synthetic-security-check',
  }), null, 'Malformed bearer tokens must fail closed without throwing')

  const clean = DOMPurify.sanitize('<p>Keep this</p><script>alert(1)</script>')
  assert.equal(clean, '<p>Keep this</p>')

  const jpeg = await sharp({
    create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
  }).jpeg().toBuffer()
  assert.equal((await sharp(jpeg).metadata()).format, 'jpeg')

  // streamTransport builds MIME in memory; it cannot send a message.
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true })
  const message = await transport.sendMail({
    from: 'sender@example.invalid',
    to: 'recipient@example.invalid',
    subject: 'Dependency check',
    text: 'Synthetic message',
    attachments: [{ filename: 'image.jpg', content: jpeg, cid: 'image' }],
  })
  assert.match(message.message.toString(), /Content-ID: <image>/)
  assert.match(message.message.toString(), /Synthetic message/)
  console.log('Security dependency checks passed: auth, HTML, images, and MIME')
}

check().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
