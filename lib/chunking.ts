export function splitIntoChunks(text: string, chunkSize = 500, overlap = 50): string[] {
  if (!text) return []

  // Split into sentences keeping punctuation (. ! ? and newlines)
  const sentenceRegex = /[^.!?\n]+(?:[.!?\n]+|$)/g
  const sentences = text.match(sentenceRegex)?.map(s => s.trim()).filter(Boolean) || []

  const chunks: string[] = []
  let current = ''

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]
    // If current is empty, start with sentence
    if (!current) current = s
    else current = current + (current.endsWith('\n') ? '' : ' ') + s

    if (current.length >= chunkSize) {
      chunks.push(current.trim())

      // prepare overlap: take last `overlap` chars of current as start of next chunk
      const overlapText = current.slice(Math.max(0, current.length - overlap))
      current = overlapText.trim()
    }
  }

  if (current && current.trim().length > 0) chunks.push(current.trim())

  // If chunks are empty but there were no sentence matches, fallback to simple slicing
  if (chunks.length === 0 && text) {
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize))
    }
  }

  return chunks
}

export default splitIntoChunks
