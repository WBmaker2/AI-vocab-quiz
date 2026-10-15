import { useState } from "react";
import { getWordEmoji } from "../utils/wordEmoji.js";

export function WordImage({ item, variant = "card" }) {
  const imageUrl = String(item?.imageUrl ?? "").trim();
  const word = String(item?.word ?? "").trim();
  const [failed, setFailed] = useState(false);
  const emoji = getWordEmoji(word);
  const className = variant === "thumb" ? "word-image word-image-thumb" : "word-image";

  if (imageUrl && !failed) {
    return (
      <img
        className={className}
        src={imageUrl}
        alt={word ? `${word} 그림` : "단어 그림"}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  if (emoji) {
    return (
      <span className={`${className} word-image-emoji`} role="img" aria-label={word ? `${word} 그림` : "단어 그림"}>
        {emoji}
      </span>
    );
  }

  return null;
}
