/**
 * RETVec / Adversarial Unicode & Zero-Width Text Normalizer
 *
 * Resilient normalizer inspired by Google RETVec (Resilient & Efficient Text Vectorizer)
 * designed to defeat homoglyph substitution, zero-width obfuscation, and unicode evasion tactics
 * used in spam, phishing, and scam messages.
 */

// Zero-width, invisible, and format characters used to break spam heuristics
// \u200B: Zero-width space
// \u200C: Zero-width non-joiner
// \u200D: Zero-width joiner
// \uFEFF: Zero-width no-break space / BOM
// \u00AD: Soft hyphen
// \u2060: Word joiner
// \u180E: Mongolian vowel separator
// \u200E-\u200F: Left-to-right / right-to-left marks
// \u202A-\u202E: Bidirectional text overrides
// \u2061-\u2064: Invisible mathematical operators
export const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E\u200E\u200F\u202A-\u202E\u2061-\u2064]/gu;

// Common Cyrillic and Greek homoglyphs mapped directly to base ASCII equivalents
export const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic lowercase
  '\u0430': 'a', // Cyrillic Small Letter A
  '\u0441': 'c', // Cyrillic Small Letter Es
  '\u0435': 'e', // Cyrillic Small Letter Ie
  '\u043E': 'o', // Cyrillic Small Letter O
  '\u0440': 'p', // Cyrillic Small Letter Er
  '\u0445': 'x', // Cyrillic Small Letter Ha
  '\u0443': 'y', // Cyrillic Small Letter U
  '\u0456': 'i', // Cyrillic Small Letter Byelorussian-Ukrainian I
  '\u0458': 'j', // Cyrillic Small Letter Je
  '\u0455': 's', // Cyrillic Small Letter Dze
  '\u0432': 'b', // Cyrillic Small Letter Ve
  '\u043D': 'n', // Cyrillic Small Letter En
  '\u0442': 't', // Cyrillic Small Letter Te
  // Cyrillic uppercase
  '\u0410': 'A', // Cyrillic Capital Letter A
  '\u0412': 'B', // Cyrillic Capital Letter Ve
  '\u0421': 'C', // Cyrillic Capital Letter Es
  '\u0415': 'E', // Cyrillic Capital Letter Ie
  '\u041D': 'H', // Cyrillic Capital Letter En
  '\u0406': 'I', // Cyrillic Capital Letter Byelorussian-Ukrainian I
  '\u0408': 'J', // Cyrillic Capital Letter Je
  '\u041A': 'K', // Cyrillic Capital Letter Ka
  '\u041C': 'M', // Cyrillic Capital Letter Em
  '\u041E': 'O', // Cyrillic Capital Letter O
  '\u0420': 'P', // Cyrillic Capital Letter Er
  '\u0422': 'T', // Cyrillic Capital Letter Te
  '\u0425': 'X', // Cyrillic Capital Letter Ha
  '\u0423': 'Y', // Cyrillic Capital Letter U
  // Greek lowercase
  '\u03B1': 'a', // Alpha
  '\u03B2': 'b', // Beta
  '\u03B5': 'e', // Epsilon
  '\u03B9': 'i', // Iota
  '\u03BA': 'k', // Kappa
  '\u03BF': 'o', // Omicron
  '\u03C1': 'p', // Rho
  '\u03C5': 'u', // Upsilon
  '\u03BD': 'v', // Nu
  '\u03C7': 'x', // Chi
  // Greek uppercase
  '\u0391': 'A', // Alpha
  '\u0392': 'B', // Beta
  '\u0395': 'E', // Epsilon
  '\u0397': 'H', // Eta
  '\u0399': 'I', // Iota
  '\u039A': 'K', // Kappa
  '\u039C': 'M', // Mu
  '\u039D': 'N', // Nu
  '\u039F': 'O', // Omicron
  '\u03A1': 'P', // Rho
  '\u03A4': 'T', // Tau
  '\u03A7': 'X', // Chi
  '\u03A5': 'Y', // Upsilon
  '\u0396': 'Z', // Zeta
};

export interface AdversarialAnalysisResult {
  originalText: string;
  normalizedText: string;
  zeroWidthCount: number;
  homoglyphCount: number;
  isAdversarial: boolean;
  evasionPenalty: number;
}

/**
 * Strips zero-width and invisible characters from input string.
 */
export function stripZeroWidth(input: string): { text: string; count: number } {
  if (!input) return { text: '', count: 0 };
  let count = 0;
  const text = input.replace(ZERO_WIDTH_REGEX, () => {
    count++;
    return '';
  });
  return { text, count };
}

/**
 * Maps homoglyphs from Cyrillic/Greek scripts to base ASCII equivalents.
 */
export function normalizeHomoglyphs(input: string): { text: string; count: number } {
  if (!input) return { text: '', count: 0 };
  let count = 0;
  let text = '';
  for (const char of input) {
    if (HOMOGLYPH_MAP[char]) {
      text += HOMOGLYPH_MAP[char];
      count++;
    } else {
      text += char;
    }
  }
  return { text, count };
}

/**
 * Comprehensive RETVec text normalizer.
 * Applies Unicode NFKD canonical decomposition, zero-width stripping, and homoglyph mapping.
 */
export function normalizeAdversarialText(input: string): AdversarialAnalysisResult {
  if (!input) {
    return {
      originalText: '',
      normalizedText: '',
      zeroWidthCount: 0,
      homoglyphCount: 0,
      isAdversarial: false,
      evasionPenalty: 0,
    };
  }

  // 1. Strip zero-width invisible characters
  const { text: strippedZeroWidth, count: zeroWidthCount } = stripZeroWidth(input);

  // 2. Map homoglyphs
  const { text: mappedHomoglyphs, count: homoglyphCount } = normalizeHomoglyphs(strippedZeroWidth);

  // 3. Normalize Unicode compatibility decomposition (NFKD)
  const normalizedText = mappedHomoglyphs.normalize('NFKD');

  // 4. Determine evasion penalty:
  // Zero-width chars and homoglyph substitutions signal adversarial evasion attempts
  let evasionPenalty = 0;
  if (zeroWidthCount >= 1) {
    evasionPenalty += Math.min(0.25, zeroWidthCount * 0.05);
  }
  if (homoglyphCount >= 1) {
    evasionPenalty += Math.min(0.25, homoglyphCount * 0.04);
  }

  const isAdversarial = zeroWidthCount >= 2 || homoglyphCount >= 2 || evasionPenalty >= 0.2;

  return {
    originalText: input,
    normalizedText,
    zeroWidthCount,
    homoglyphCount,
    isAdversarial,
    evasionPenalty: Math.min(0.45, Math.round(evasionPenalty * 100) / 100),
  };
}
