import {
  auth,
  db,
  ensureFirebase,
  isFirebaseConfigured,
} from "./firebaseCore.js";
export {
  validateMatchingLeaderboardResult,
  validateFishingLeaderboardResult,
  validateTypingLeaderboardResult,
} from "./firebaseLeaderboardValidation.js";
export {
  fetchStudentProfile,
  saveStudentProgress,
} from "./firebaseProgress.js";
export {
  shouldReplaceElapsedLeaderboardEntry,
} from "./firebaseLeaderboardPayloads.js";
export {
  fetchTeacherActivityLeaderboards,
  fetchTeacherMatchingLeaderboards,
  fetchTeacherFishingLeaderboards,
  fetchTeacherTypingLeaderboards,
  fetchTeacherSpellingLeaderboards,
  renameTeacherMatchingLeaderboardStudent,
  renameTeacherActivityLeaderboardStudent,
  renameTeacherFishingLeaderboardStudent,
} from "./firebaseTeacherLeaderboards.js";
export {
  renameTeacherTypingLeaderboardStudent,
  renameTeacherSpellingLeaderboardStudent,
  deleteTeacherMatchingLeaderboardStudent,
  deleteTeacherFishingLeaderboardStudent,
  deleteTeacherTypingLeaderboardStudent,
  deleteTeacherSpellingLeaderboardStudent,
  deleteTeacherActivityLeaderboardStudent,
} from "./firebaseTeacherLeaderboardAdmin.js";
export {
  normalizeSchoolName,
  createVocabularySetId,
  getCurrentUser,
  subscribeToAuthChanges,
  signInWithGoogle,
  signOutCurrentUser,
  searchSchoolsByName,
  listPopularSchools,
  findOrCreateSchool,
  getTeacherProfile,
  upsertTeacherProfile,
  syncTeacherVocabularyMetadata,
  deleteTeacherAccountData,
  createTeacherProfileWriteData,
} from "./firebaseSchools.js";
export {
  listTeacherSetCatalog,
  fetchTeacherVocabularySet,
  saveTeacherVocabularySet,
  createTeacherVocabularyImportBatchWriter,
  saveTeacherVocabularyImportBatch,
  deleteTeacherVocabularySet,
  deleteTeacherVocabularySetsForGrade,
  listTeachersForSchool,
  listPublishedUnitsForTeacher,
  searchPublishedPublisherSources,
  fetchPublishedPublisherSourceUnits,
  fetchPublishedVocabularySet,
} from "./firebaseVocabulary.js";
export {
  fetchMatchingLeaderboards,
  fetchFishingLeaderboards,
  fetchTypingLeaderboards,
  fetchSpellingLeaderboards,
  saveMatchingLeaderboardScore,
  saveFishingLeaderboardScore,
  saveTypingLeaderboardScore,
  saveSpellingLeaderboardScore,
} from "./firebaseLeaderboardScores.js";

export {
  auth,
  db,
  ensureFirebase,
  isFirebaseConfigured,
};
export { validateSpellingLeaderboardResult } from "./spellingLeaderboard.js";

export {
  createBingoSession,
  joinBingoSession,
  saveBingoBoardSetupDraft,
  finalizeBingoBoardSetup,
  callBingoWord,
  drawNextBingoWord,
  markBingoCell,
  endBingoSession,
} from "./firebaseBingo.js";

export {
  saveWordMissReports,
  listWordMissReports,
  clearWordMissReports,
} from "./firebaseMissReports.js";
