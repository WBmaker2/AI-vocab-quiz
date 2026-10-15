export function sanitizeGrammarToken(word) {
  return String(word ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSpeechGrammar(words) {
  const tokens = [];
  const list = Array.isArray(words) ? words : [];

  for (const word of list) {
    const token = sanitizeGrammarToken(word);

    if (token && !tokens.includes(token)) {
      tokens.push(token);
    }

    if (tokens.length >= 100) {
      break;
    }
  }

  if (tokens.length === 0) {
    return "";
  }

  return `#JSGF V1.0; grammar vocab; public <vocab> = ${tokens.join(" | ")};`;
}

export function attachSpeechGrammar(recognition, grammarText) {
  if (!recognition || !grammarText) {
    return false;
  }

  const GrammarList = typeof window !== "undefined"
    ? (window.SpeechGrammarList || window.webkitSpeechGrammarList)
    : null;

  if (!GrammarList) {
    return false;
  }

  try {
    const list = new GrammarList();
    list.addFromString(grammarText, 1);
    recognition.grammars = list;
    return true;
  } catch {
    return false;
  }
}
