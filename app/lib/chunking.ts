export function splitIntoChunks(text: string, chunkSize = 500, overlap = 50): string[] {
  if (!text) return [];
  // Split by sentence endings and newlines
  const sentences = text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length <= chunkSize) {
      current = (current + " " + sentence).trim();
    } else {
      if (current) chunks.push(current);
      // start new chunk with overlap from end of previous chunk
      current = sentence.slice(0, chunkSize);
    }

    // If current chunk is big enough, push and start overlap
    if (current.length >= chunkSize) {
      chunks.push(current.slice(0, chunkSize));
      // keep overlap
      current = current.slice(Math.max(0, chunkSize - overlap));
    }
  }

  if (current) chunks.push(current);

  // Merge small last chunk into previous if too small
  if (chunks.length >= 2 && chunks[chunks.length - 1].length < 50) {
    const last = chunks.pop() as string;
    chunks[chunks.length - 1] = (chunks[chunks.length - 1] + " " + last).trim();
  }

  return chunks;
}
