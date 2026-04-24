/**
 * Generates all possible combinations of attribute values.
 * 
 * @param attributes - Array of attributes with their values.
 * @returns Array of combinations, where each combination is an array of values.
 */
export function generateAttributeCombinations(attributes: { name: string; values: string[] }[]): string[][] {
  if (attributes.length === 0) return [];

  return attributes.reduce((acc, attr) => {
    const combinations: string[][] = [];
    attr.values.forEach((value) => {
      acc.forEach((combo) => {
        combinations.push([...combo, value]);
      });
    });
    return combinations;
  }, [[]] as string[][]).filter(combo => combo.length > 0);
}

/**
 * Formats a combination of attribute values into a readable name.
 * Example: ["Red", "S"] -> "Red - S"
 */
export function formatVariantName(combination: string[]): string {
  return combination.join(" - ");
}
