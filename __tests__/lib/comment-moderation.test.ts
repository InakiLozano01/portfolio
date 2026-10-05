import { decideModeration, moderateComment, moderationCategories } from '../../lib/comment-moderation'

function answers(choice = 'allow', score = 0.01) {
  return { decision: { type: 'choice', choice, confidence: 0.99, probabilities: { allow: choice === 'allow' ? 0.99 : 0.005, review: choice === 'review' ? 0.99 : 0.005, deny: choice === 'deny' ? 0.99 : 0.005 } }, ...Object.fromEntries(Object.keys(moderationCategories).map(key => [key, { type: 'noul', noul: score }])) }
}

describe('comment decisions', () => {
  test('publishes a confidently safe comment', () => expect(decideModeration(answers(), 'jev').status).toBe('approved'))
  test('retains clear violations as rejected for override', () => expect(decideModeration(answers('deny', 0.99), 'jev').status).toBe('rejected'))
  test('conflicting category evidence prevents publication', () => expect(decideModeration(answers('allow', 0.5), 'jev').status).toBe('pending'))
  test('uncertain decisions go to review', () => expect(decideModeration({ ...answers(), decision: { ...answers().decision, confidence: 0.5 } }, 'jev').status).toBe('pending'))
  test('missing categories and invalid probabilities are refused', () => {
    expect(() => decideModeration({ decision: answers().decision }, 'jev')).toThrow()
    expect(() => decideModeration({ ...answers(), spam: { type: 'noul', noul: 2 } }, 'jev')).toThrow()
  })
  test('missing key and upstream failures hold comments', async () => {
    const previous = process.env.OPENROUTER_API_KEY
    const previousFetch = global.fetch
    try {
      delete process.env.OPENROUTER_API_KEY
      expect((await moderateComment('hello')).status).toBe('pending')
      process.env.OPENROUTER_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({ ok: false })
      expect((await moderateComment('hello')).status).toBe('pending')
      global.fetch = jest.fn().mockRejectedValue(new Error('unavailable'))
      expect((await moderateComment('hello')).status).toBe('pending')
    } finally {
      if (previous === undefined) delete process.env.OPENROUTER_API_KEY
      else process.env.OPENROUTER_API_KEY = previous
      global.fetch = previousFetch
    }
  })
})
