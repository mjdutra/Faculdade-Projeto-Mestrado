/**
 * Encurta morada completa: Local, Cidade, País.
 */
export function shortenLocation(fullLocation?: string | null): string {
  if (!fullLocation) return "";

  // Remove conteúdo entre parênteses (ex: freguesias "(Sé Nova, Santa Cruz...)")
  const withoutParens = fullLocation.replace(/\([^)]*\)/g, "");

  const isPostcodeOrNumber = (part: string) => /^\d{4}-\d{3}$|^\d+$/.test(part);

  const parts = withoutParens
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !isPostcodeOrNumber(part));

  // Remove duplicados consecutivos
  const deduped = parts.filter((part, i) => part !== parts[i - 1]);

  if (deduped.length <= 3) return deduped.join(", ");

  const place = deduped[0];
  const city = deduped[deduped.length - 2];
  const country = deduped[deduped.length - 1];

  // Evita repetir a mesma parte
  const shortened = [place, city, country].filter(
    (part, i, arr) => arr.indexOf(part) === i
  );

  return shortened.join(", ");
}