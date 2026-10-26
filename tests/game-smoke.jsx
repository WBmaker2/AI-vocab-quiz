import { createRoot } from "react-dom/client";
import { WordFishingGame } from "../src/components/WordFishingGame.jsx";
import { WordTypingGame } from "../src/components/WordTypingGame.jsx";

const fishingItems = [
  { id: "item-1", word: "apple", meaning: "사과" },
  { id: "item-2", word: "banana", meaning: "바나나" },
  { id: "item-3", word: "book", meaning: "책" },
  { id: "item-4", word: "cat", meaning: "고양이" },
  { id: "item-5", word: "dog", meaning: "강아지" },
  { id: "item-6", word: "egg", meaning: "달걀" },
];

const typingItems = [{ id: "item-1", word: "apple", meaning: "사과" }];

const speech = {
  supported: true,
  cancel() {},
  speak() {},
};

const celebration = {
  playSuccess() {},
  playCompletion() {},
};

const leaderboardContext = {
  schoolId: "school-1",
  schoolName: "테스트초",
  grade: "3",
};

const progressionContext = {
  ...leaderboardContext,
  unit: "1",
  teacherUserId: "teacher-1",
  teacherName: "김선생",
};

const game = new URLSearchParams(window.location.search).get("game");
const commonProps = {
  items: game === "typing" ? typingItems : fishingItems,
  speech,
  celebration,
  leaderboardContext,
  remoteConfigured: false,
  studentNameDraft: "",
  onStudentNameDraftChange: () => {},
  onBack: () => {},
};

const root = createRoot(document.getElementById("root"));

root.render(
  game === "typing" ? (
    <WordTypingGame {...commonProps} progressionContext={progressionContext} />
  ) : (
    <WordFishingGame {...commonProps} />
  ),
);
