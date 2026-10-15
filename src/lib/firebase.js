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
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import {
  LEADERBOARD_PERIOD_DEFINITIONS,
  createLeaderboardPeriodKeys,
  createMatchingLeaderboardGradeScope,
  createMatchingLeaderboardScopeKey,
  normalizeStudentName,
  normalizeStudentNameKey,
  pickBetterMatchingLeaderboardEntry,
} from "../utils/leaderboard.js";
import { normalizeActivityLeaderboardType } from "../utils/activityLeaderboard.js";
import { BADGE_IDS } from "../constants/badges.js";
import {
  buildProgressSummary,
  compareListeningProgress,
  compareMatchingProgress,
  compareSpeakingProgress,
  compareTypingProgress,
  createStudentProfileId,
  evaluateEarnedBadges,
  normalizeStudentProfileName,
} from "../utils/studentProgress.js";
import {
  findStudentProfileCapability,
  getOrCreateStudentProfileCapability,
  isStudentProfileCapabilityToken,
} from "../utils/studentProfileCapability.js";
import {
  canMarkBingoCell,
  computeBingoLines,
  createBingoBoard,
  createBingoSetupBoard,
  createBingoSessionCode,
  createBingoWordId,
  determineBingoBoardSize,
  finalizeBingoBoardPlacements,
  createEmptyBingoBoardCells,
  normalizeBingoItems,
  normalizeBingoText,
  selectNextBingoWord,
} from "../utils/bingo.js";
import {
  mergeBingoCompletedLineKeys,
  normalizeBingoRank,
} from "../utils/bingoPlayer.js";
import {
  assertTeacherVocabularyImportBatchCapacity,
} from "../utils/teacherSetManager.js";
import {
  createSpellingLeaderboardApi,
  validateSpellingLeaderboardResult,
} from "./spellingLeaderboard.js";
export { validateSpellingLeaderboardResult };








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
