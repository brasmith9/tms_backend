export function generateReference(seq: number, year: number): string {
  return `TUR-${year}-${seq.toString().padStart(4, '0')}`;
}
