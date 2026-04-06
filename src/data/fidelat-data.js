export const VARIANT_NAMES = ['ግእዝ', 'ካዕብ', 'ሣልስ', 'ራብዕ', 'ኀምስ', 'ሳድስ', 'ሳብዕ'];

export const PRIMARY_ROWS = [
  ['ሀ', 'ሁ', 'ሂ', 'ሃ', 'ሄ', 'ህ', 'ሆ'],
  ['ለ', 'ሉ', 'ሊ', 'ላ', 'ሌ', 'ል', 'ሎ'],
  ['ሐ', 'ሑ', 'ሒ', 'ሓ', 'ሔ', 'ሕ', 'ሖ'],
  ['መ', 'ሙ', 'ሚ', 'ማ', 'ሜ', 'ም', 'ሞ'],
  ['ሰ', 'ሱ', 'ሲ', 'ሳ', 'ሴ', 'ስ', 'ሶ'],
  ['ረ', 'ሩ', 'ሪ', 'ራ', 'ሬ', 'ር', 'ሮ'],
  ['ሸ', 'ሹ', 'ሺ', 'ሻ', 'ሼ', 'ሽ', 'ሾ'],
  ['ቀ', 'ቁ', 'ቂ', 'ቃ', 'ቄ', 'ቅ', 'ቆ'],
  ['በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ'],
  ['ተ', 'ቱ', 'ቲ', 'ታ', 'ቴ', 'ት', 'ቶ'],
  ['ነ', 'ኑ', 'ኒ', 'ና', 'ኔ', 'ን', 'ኖ'],
  ['አ', 'ኡ', 'ኢ', 'ኣ', 'ኤ', 'እ', 'ኦ'],
  ['ከ', 'ኩ', 'ኪ', 'ካ', 'ኬ', 'ክ', 'ኮ'],
  ['ጸ', 'ጹ', 'ጺ', 'ጻ', 'ጼ', 'ጽ', 'ጾ']
];

export const SECONDARY_ROWS = [
  ['ሠ', 'ሡ', 'ሢ', 'ሣ', 'ሤ', 'ሥ', 'ሦ'],
  ['ኀ', 'ኁ', 'ኂ', 'ኃ', 'ኄ', 'ኅ', 'ኆ'],
  ['ፀ', 'ፁ', 'ፂ', 'ፃ', 'ፄ', 'ፅ', 'ፆ'],
  ['ዘ', 'ዙ', 'ዚ', 'ዛ', 'ዜ', 'ዝ', 'ዞ'],
  ['ዠ', 'ዡ', 'ዢ', 'ዣ', 'ዤ', 'ዥ', 'ዦ'],
  ['የ', 'ዩ', 'ዪ', 'ያ', 'ዬ', 'ይ', 'ዮ'],
  ['ደ', 'ዱ', 'ዲ', 'ዳ', 'ዴ', 'ድ', 'ዶ'],
  ['ገ', 'ጉ', 'ጊ', 'ጋ', 'ጌ', 'ግ', 'ጎ'],
  ['ጠ', 'ጡ', 'ጢ', 'ጣ', 'ጤ', 'ጥ', 'ጦ'],
  ['ጨ', 'ጩ', 'ጪ', 'ጫ', 'ጬ', 'ጭ', 'ጮ'],
  ['ወ', 'ዉ', 'ዊ', 'ዋ', 'ዌ', 'ው', 'ዎ'],
  ['ዐ', 'ዑ', 'ዒ', 'ዓ', 'ዔ', 'ዕ', 'ዖ'],
  ['ፈ', 'ፉ', 'ፊ', 'ፋ', 'ፌ', 'ፍ', 'ፎ']
];

export function createEmptyMastery() {
  return VARIANT_NAMES.map(() => ({ part1: [], part2: [] }));
}

export function getSymbolsForVariant(variantIndex, part) {
  const rows = part === 1 ? PRIMARY_ROWS : SECONDARY_ROWS;
  return rows.map((row) => row[variantIndex]).filter(Boolean);
}

export function getAllSymbolsForVariant(variantIndex) {
  return [...getSymbolsForVariant(variantIndex, 1), ...getSymbolsForVariant(variantIndex, 2)];
}

export function countPlayableSymbols(symbols, audioMap) {
  return symbols.filter((symbol) => typeof audioMap[symbol] === 'string' && audioMap[symbol].trim()).length;
}

export function isVariantComplete(mastery, variantIndex) {
  const variant = mastery[variantIndex];
  if (!variant) return false;

  return (
    variant.part1.length >= getSymbolsForVariant(variantIndex, 1).length &&
    variant.part2.length >= getSymbolsForVariant(variantIndex, 2).length
  );
}

export function getHighestUnlockedVariant(mastery) {
  let highest = 0;
  for (let index = 0; index < VARIANT_NAMES.length - 1; index += 1) {
    if (isVariantComplete(mastery, index)) highest = index + 1;
    else break;
  }
  return highest;
}
