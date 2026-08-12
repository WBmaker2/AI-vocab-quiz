import test from "node:test";
import assert from "node:assert/strict";
import { getAppChromeLayout } from "./appChrome.js";

test("getAppChromeLayout keeps the home screen hero fully expanded", () => {
  assert.deepEqual(getAppChromeLayout("home"), {
    heroVariant: "full",
    showSupportNotice: true,
    eyebrow: "Elementary English Classroom App",
    title: "AI 원어민 단어 퀴즈 쇼",
    subtitle:
      "오늘의 단어를 불러오면 듣기·말하기·게임 활동을 바로 시작할 수 있습니다.",
    focusLabel: "학생 활동 선택",
  });
});

const compactLayouts = [
  [
    "teacher",
    "Teacher Workspace",
    "교사 관리",
    "단어 세트와 수업 활동을 준비하세요.",
    "교사 관리 화면",
  ],
  [
    "listening",
    "Listening Quiz",
    "듣기 퀴즈",
    "소리를 듣고 알맞은 뜻을 골라보세요.",
    "듣기 퀴즈 화면",
  ],
  [
    "speaking",
    "Speaking Practice",
    "말하기 연습",
    "영어 단어를 듣고 또렷하게 말해보세요.",
    "말하기 연습 화면",
  ],
  [
    "matching",
    "Word Matching",
    "단어 짝 맞추기",
    "영단어와 뜻을 빠르게 연결해보세요.",
    "단어 짝 맞추기 화면",
  ],
  [
    "fishing",
    "Word Fishing",
    "단어 낚시",
    "소리를 듣고 알맞은 뜻 카드를 낚아보세요.",
    "단어 낚시 화면",
  ],
  [
    "spelling",
    "Spelling Completion",
    "철자 완성 게임",
    "가려진 철자를 보고 영어 단어를 완성해보세요.",
    "철자 완성 게임 화면",
  ],
  [
    "typing",
    "Word Typing",
    "영어 단어 타자",
    "뜻을 보고 영어 단어를 정확하게 입력해보세요.",
    "영어 단어 타자 화면",
  ],
  [
    "bingo-host",
    "Class Bingo Host",
    "학급 빙고 진행",
    "단어를 부르고 학생들의 빙고 현황을 확인하세요.",
    "학급 빙고 진행 화면",
  ],
  [
    "bingo-join",
    "Class Bingo",
    "빙고 참여",
    "참여 코드를 입력하고 학급 빙고에 들어가세요.",
    "빙고 참여 화면",
  ],
  [
    "bingo-board",
    "Class Bingo",
    "빙고 보드",
    "불린 단어를 확인하며 빙고판을 완성하세요.",
    "빙고 보드 화면",
  ],
];

for (const [view, eyebrow, title, subtitle, focusLabel] of compactLayouts) {
  test(`getAppChromeLayout compacts and labels the ${view} screen`, () => {
    assert.deepEqual(getAppChromeLayout(view), {
      heroVariant: "compact",
      showSupportNotice: false,
      eyebrow,
      title,
      subtitle,
      focusLabel,
    });
  });
}
