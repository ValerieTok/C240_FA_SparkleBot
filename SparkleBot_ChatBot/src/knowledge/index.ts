import { Knowledge, DataSource } from '@botpress/runtime'

const scamSource = DataSource.Directory.fromPath('src/knowledge', {
  id: 'scam-guidelines',
  filter: (filePath) => /\.(md|pdf|txt|html|docx?)$/i.test(filePath),
})

export const ScamKnowledge = new Knowledge({
  name: 'scam-knowledge',
  description: 'ScamShield AI knowledge base for scam prevention and warning signs',
  sources: [scamSource],
})
