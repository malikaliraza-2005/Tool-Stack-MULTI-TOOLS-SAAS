/** First sentence of a tagline, for tight lists: "Combine PDF files into one document." */
export function firstSentence(text: string): string {
  const end = text.indexOf(". ");
  return end === -1 ? text : text.slice(0, end + 1);
}
