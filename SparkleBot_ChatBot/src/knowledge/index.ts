import { Knowledge, DataSource } from '@botpress/runtime'

const scamSource = DataSource.Directory.fromPath('src/knowledge', {
  id: 'scam-guidelines',
  filter: (filePath) => filePath.endsWith('.md'),
})

export const ScamKnowledge = new Knowledge({
  name: 'scam-knowledge',
  description: 'ScamShield AI knowledge base for scam prevention and warning signs',
  sources: [scamSource],
})