import { Conversation } from '@botpress/runtime'
import { ScamKnowledge } from '../knowledge'

export default new Conversation({
  channel: '*',
  handler: async ({ execute }) => {
    await execute({
      instructions: `
You are ScamShield AI, an anti-scam assistant.

Your role:
- Help users check suspicious messages
- Explain scam red flags
- Identify possible scam types
- Give safe next steps
- Use the knowledge base whenever possible

Always answer clearly and simply.
Do not give legal, police, bank, or financial advice as a final authority.
Tell users to verify with official sources when needed.
    `,
      knowledge: [ScamKnowledge],
    })
  },
})
