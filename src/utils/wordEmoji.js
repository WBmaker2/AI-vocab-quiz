const WORD_EMOJI = {
  apple: "🍎",
  banana: "🍌",
  orange: "🍊",
  strawberry: "🍓",
  grape: "🍇",
  watermelon: "🍉",
  milk: "🥛",
  bread: "🍞",
  egg: "🍳",
  rice: "🍚",
  dog: "🐶",
  cat: "🐱",
  bird: "🐦",
  fish: "🐟",
  rabbit: "🐰",
  bear: "🐻",
  tiger: "🐯",
  lion: "🦁",
  monkey: "🐵",
  pig: "🐷",
  cow: "🐄",
  horse: "🐴",
  duck: "🦆",
  frog: "🐸",
  butterfly: "🦋",
  bee: "🐝",
  flower: "🌸",
  tree: "🌳",
  sun: "☀️",
  moon: "🌙",
  star: "⭐",
  rain: "🌧️",
  snow: "❄️",
  water: "💧",
  school: "🏫",
  book: "📖",
  pencil: "✏️",
  bag: "🎒",
  chair: "🪑",
  door: "🚪",
  ball: "⚽",
  bike: "🚲",
  car: "🚗",
  bus: "🚌",
  train: "🚂",
  plane: "✈️",
  ship: "🚢",
  house: "🏠",
  bed: "🛏️",
  father: "👨",
  mother: "👩",
  brother: "👦",
  sister: "👧",
  eye: "👁️",
  nose: "👃",
  mouth: "👄",
  hand: "✋",
  foot: "🦶",
  pants: "👖",
  shirt: "👕",
  tshirt: "👕",
  dress: "👗",
  shoes: "👟",
  hat: "🧢",
  eat: "🍽️",
  run: "🏃",
  swim: "🏊",
};

function normalizeEmojiKey(word) {
  return String(word ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function getWordEmoji(word) {
  const key = normalizeEmojiKey(word);

  if (!key) {
    return "";
  }

  if (WORD_EMOJI[key]) {
    return WORD_EMOJI[key];
  }

  if (key.endsWith("ies") && WORD_EMOJI[`${key.slice(0, -3)}y`]) {
    return WORD_EMOJI[`${key.slice(0, -3)}y`];
  }

  if (key.endsWith("es") && WORD_EMOJI[key.slice(0, -2)]) {
    return WORD_EMOJI[key.slice(0, -2)];
  }

  if (key.endsWith("s") && WORD_EMOJI[key.slice(0, -1)]) {
    return WORD_EMOJI[key.slice(0, -1)];
  }

  return "";
}
