/** Pfad vor dem Senden an den Server bereinigen (Anführungszeichen, ~). */
export function normalizeFolderPathInput(inputPath: string): string {
  let s = inputPath.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith('„') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}
