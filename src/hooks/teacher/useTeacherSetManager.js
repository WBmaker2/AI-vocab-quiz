import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TEACHER_SELECTION,
  createDraftVocabularyItem,
  formatSetLabel,
  getUnitsForGrade,
  normalizeDraftVocabulary,
} from "../../constants/vocabulary.js";
import {
  deleteTeacherVocabularySetsForGrade,
  deleteTeacherVocabularySet,
  fetchPublishedPublisherSourceUnits,
  fetchTeacherVocabularySet,
  isFirebaseConfigured,
  listTeacherSetCatalog,
  saveTeacherVocabularySet,
  searchPublishedPublisherSources,
  upsertTeacherProfile,
} from "../../lib/firebase.js";
import {
  groupPublisherSourcesByTeacherAndSchool,
  summarizePublisherCopyResult,
} from "../../utils/publisherCopy.js";
import { canAutoSaveTeacherSet, getNextTeacherSelection } from "../../utils/teacherSetManager.js";
import { mergeVocabularyItems } from "../../utils/vocabularyMerge.js";
import { parseVocabularyWorkbook } from "../../utils/xlsxImport.js";

function clearTeacherAutoSaveTimer(timerRef) {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

export function useTeacherSetManager({
  userId,
  teacherProfile,
  setTeacherProfile,
  formatErrorMessage,
}) {
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selection, setSelection] = useState(DEFAULT_TEACHER_SELECTION);
  const [publisher, setPublisher] = useState("");
  const [items, setItems] = useState([]);
  const [published, setPublished] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [copySources, setCopySources] = useState([]);
  const [selectedCopySourceId, setSelectedCopySourceId] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [copyError, setCopyError] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [autoSaveToken, setAutoSaveToken] = useState(0);

  const autoSaveTimerRef = useRef(null);
  const autoSaveSnapshotRef = useRef(null);

  useEffect(() => {
    autoSaveSnapshotRef.current = {
      userId,
      profile: teacherProfile,
      selection,
      publisher,
      published,
      items,
      dirty,
      loading,
      saving,
      importing,
      copying,
    };
  }, [
    copying,
    dirty,
    importing,
    items,
    loading,
    published,
    publisher,
    saving,
    selection,
    teacherProfile,
    userId,
  ]);

  useEffect(() => {
    if (!autoSaveToken) {
      return;
    }

    if (!dirty) {
      clearTeacherAutoSaveTimer(autoSaveTimerRef);
      setAutoSaveToken(0);
      setAutoSaveStatus("");
      return;
    }

    queueAutoSave();
  }, [autoSaveToken]);

  useEffect(
    () => () => {
      clearTeacherAutoSaveTimer(autoSaveTimerRef);
    },
    [],
  );

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    if (!userId || !teacherProfile?.userId) {
      clearTeacherAutoSaveTimer(autoSaveTimerRef);
      setAutoSaveToken(0);
      setCatalog([]);
      setSelection(DEFAULT_TEACHER_SELECTION);
      setItems([]);
      setPublished(false);
      setPublisher("");
      setDirty(false);
      setLoading(false);
      setSaving(false);
      setImporting(false);
      setStatus("");
      setAutoSaveStatus("");
      setError("");
      setCopySources([]);
      setSelectedCopySourceId("");
      setCopyLoading(false);
      setCopying(false);
      setCopyStatus("");
      setCopyError("");
      return;
    }
  }, [teacherProfile?.userId, userId]);

  useEffect(() => {
    if (!isFirebaseConfigured || !teacherProfile?.userId) {
      return;
    }

    refreshCatalog(teacherProfile.userId);
  }, [teacherProfile?.userId]);

  useEffect(() => {
    const profilePublisher = teacherProfile?.gradePublishers?.[selection.grade] ?? "";

    setPublisher(profilePublisher);
    setCopySources([]);
    setSelectedCopySourceId("");
    setCopyStatus("");
    setCopyError("");
  }, [selection.grade, teacherProfile?.gradePublishers]);

  async function refreshCatalog(nextUserId = userId) {
    if (!isFirebaseConfigured || !nextUserId) {
      return;
    }

    setCatalogLoading(true);

    try {
      const nextCatalog = await listTeacherSetCatalog(nextUserId);
      setCatalog(nextCatalog);
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "내 단어 세트 목록을 불러오지 못했습니다."),
      );
    } finally {
      setCatalogLoading(false);
    }
  }

  function updateSelection(field, value) {
    setSelection((current) =>
      getNextTeacherSelection({
        currentSelection: current,
        field,
        value,
        teacherCatalog: catalog,
      }),
    );
    clearTeacherAutoSaveTimer(autoSaveTimerRef);
    setAutoSaveToken(0);
    setAutoSaveStatus("");
    setStatus("");
    setError("");
    setCopyStatus("");
    setCopyError("");
    setCopySources([]);
    setSelectedCopySourceId("");
  }

  function updatePublisher(value) {
    setPublisher(value);
    clearTeacherAutoSaveTimer(autoSaveTimerRef);
    setAutoSaveToken(0);
    setAutoSaveStatus("");
    setStatus("");
    setError("");
    setCopyStatus("");
    setCopyError("");
    setCopySources([]);
    setSelectedCopySourceId("");
  }

  function setPublishState(nextPublished) {
    setPublished(nextPublished);
    setDirty(true);
    clearTeacherAutoSaveTimer(autoSaveTimerRef);
    setAutoSaveToken(0);
    setAutoSaveStatus("");
    setStatus("");
  }

  async function persistGradePublisher(grade, nextPublisher) {
    if (!teacherProfile || !userId) {
      throw new Error("선생님 정보가 필요합니다.");
    }

    const cleanGrade = String(grade ?? "").trim();
    const cleanPublisher = String(nextPublisher ?? "").trim();

    if (!cleanGrade || !cleanPublisher) {
      throw new Error("출판사를 먼저 선택하세요.");
    }

    const nextGradePublishers = {
      ...(teacherProfile.gradePublishers ?? {}),
      [cleanGrade]: cleanPublisher,
    };

    await upsertTeacherProfile({
      userId,
      teacherName: teacherProfile.teacherName,
      schoolId: teacherProfile.schoolId,
      schoolName: teacherProfile.schoolName,
      gradePublishers: nextGradePublishers,
    });

    setTeacherProfile((current) =>
      current
        ? {
            ...current,
            gradePublishers: nextGradePublishers,
          }
        : current,
    );

    return nextGradePublishers;
  }

  async function persistSnapshot(snapshot, sourceType) {
    if (!snapshot?.profile || !snapshot?.userId) {
      throw new Error("Google 로그인과 선생님 정보 등록이 필요합니다.");
    }

    const nextSelection = snapshot.selection ?? {};
    if (!nextSelection.grade || !nextSelection.unit) {
      throw new Error("학년과 단원을 먼저 선택하세요.");
    }

    const cleanPublisher = String(snapshot.publisher ?? "").trim();
    if (!cleanPublisher) {
      throw new Error("출판사를 먼저 선택하세요.");
    }

    const nextGradePublishers = {
      ...(snapshot.profile.gradePublishers ?? {}),
      [nextSelection.grade]: cleanPublisher,
    };

    await upsertTeacherProfile({
      userId: snapshot.userId,
      teacherName: snapshot.profile.teacherName,
      schoolId: snapshot.profile.schoolId,
      schoolName: snapshot.profile.schoolName,
      gradePublishers: nextGradePublishers,
    });

    setTeacherProfile((current) =>
      current
        ? {
            ...current,
            gradePublishers: nextGradePublishers,
          }
        : current,
    );

    await saveTeacherVocabularySet({
      userId: snapshot.userId,
      schoolId: snapshot.profile.schoolId,
      schoolName: snapshot.profile.schoolName,
      teacherName: snapshot.profile.teacherName,
      selection: nextSelection,
      items: snapshot.items ?? [],
      published: snapshot.published,
      publisher: cleanPublisher,
      sourceType,
    });

    return {
      cleanPublisher,
      nextGradePublishers,
    };
  }

  function queueAutoSave() {
    if (!dirty) {
      setAutoSaveStatus("");
      return;
    }

    clearTeacherAutoSaveTimer(autoSaveTimerRef);

    if (!canAutoSaveTeacherSet(autoSaveSnapshotRef.current, isFirebaseConfigured)) {
      setAutoSaveStatus("자동 저장 대기 중");
      return;
    }

    setAutoSaveStatus("자동 저장 예약 중");
    autoSaveTimerRef.current = window.setTimeout(async () => {
      const snapshot = autoSaveSnapshotRef.current;
      if (!canAutoSaveTeacherSet(snapshot, isFirebaseConfigured)) {
        setAutoSaveStatus("자동 저장 대기 중");
        clearTeacherAutoSaveTimer(autoSaveTimerRef);
        return;
      }

      setAutoSaveStatus("자동 저장 중...");

      try {
        const { cleanPublisher } = await persistSnapshot(snapshot, "autosave");
        setPublisher(cleanPublisher);
        setDirty(false);
        setAutoSaveStatus("자동 저장됨");
        setError("");
        await refreshCatalog();
      } catch (nextError) {
        setAutoSaveStatus("자동 저장 실패");
        setError(
          formatErrorMessage(nextError, "단어 세트를 자동 저장하지 못했습니다."),
        );
      } finally {
        clearTeacherAutoSaveTimer(autoSaveTimerRef);
      }
    }, 700);
  }

  async function loadSet() {
    if (!isFirebaseConfigured || !userId) {
      setError("Google 로그인 후 단어 세트를 불러올 수 있습니다.");
      return;
    }

    if (!selection.grade || !selection.unit) {
      setError("학년과 단원을 먼저 선택하세요.");
      return;
    }

    setLoading(true);
    setStatus("");
    setAutoSaveStatus("");
    setError("");
    clearTeacherAutoSaveTimer(autoSaveTimerRef);
    setAutoSaveToken(0);

    try {
      const result = await fetchTeacherVocabularySet(userId, selection);
      const profilePublisher =
        teacherProfile?.gradePublishers?.[selection.grade] ?? "";
      const resolvedPublisher =
        profilePublisher || String(result.publisher ?? "").trim();

      setItems(result.items);
      setPublished(result.published);
      setPublisher(resolvedPublisher);
      setDirty(false);
      setStatus(
        result.items.length > 0
          ? `${formatSetLabel(selection)} 세트를 불러왔습니다.`
          : `${formatSetLabel(selection)}에 저장된 단어가 아직 없습니다.`,
      );
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "단어 세트를 불러오지 못했습니다."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSet() {
    if (!isFirebaseConfigured || !teacherProfile || !userId) {
      setError("Google 로그인과 선생님 정보 등록이 필요합니다.");
      return;
    }

    if (!selection.grade || !selection.unit) {
      setError("학년과 단원을 먼저 선택하세요.");
      return;
    }

    clearTeacherAutoSaveTimer(autoSaveTimerRef);
    setAutoSaveToken(0);
    setAutoSaveStatus("");

    const snapshot = autoSaveSnapshotRef.current ?? {
      userId,
      profile: teacherProfile,
      selection,
      publisher,
      published,
      items,
      dirty,
    };

    if (!snapshot.profile || !snapshot.userId) {
      setError("Google 로그인과 선생님 정보 등록이 필요합니다.");
      return;
    }

    if (!snapshot.selection?.grade || !snapshot.selection?.unit) {
      setError("학년과 단원을 먼저 선택하세요.");
      return;
    }

    if (!String(snapshot.publisher ?? "").trim()) {
      setError("출판사를 먼저 선택하세요.");
      return;
    }

    const cleanPublisher = String(snapshot.publisher ?? "").trim();

    setSaving(true);
    setStatus("");
    setError("");

    try {
      await persistSnapshot(snapshot, "manual");
      setPublisher(cleanPublisher);
      setDirty(false);
      setStatus(
        snapshot.published
          ? `${formatSetLabel(snapshot.selection)} 세트를 저장하고 학생에게 공개했습니다.`
          : `${formatSetLabel(snapshot.selection)} 세트를 저장했습니다. 아직 공개 전입니다.`,
      );
      setAutoSaveStatus("");
      await refreshCatalog();
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "단어 세트를 저장하지 못했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSet() {
    if (!isFirebaseConfigured || !userId) {
      setError("Google 로그인 후 단어 세트를 삭제할 수 있습니다.");
      return;
    }

    if (!selection.grade || !selection.unit) {
      setError("학년과 단원을 먼저 선택하세요.");
      return;
    }

    clearTeacherAutoSaveTimer(autoSaveTimerRef);
    setAutoSaveToken(0);
    setAutoSaveStatus("");
    setSaving(true);
    setStatus("");
    setError("");

    try {
      await deleteTeacherVocabularySet(userId, selection);
      setItems([]);
      setPublished(false);
      setDirty(false);
      setStatus(`${formatSetLabel(selection)} 세트를 삭제했습니다.`);
      await refreshCatalog();
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "단어 세트를 삭제하지 못했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetGradeSets() {
    if (!isFirebaseConfigured || !userId) {
      setError("Google 로그인 후 단어 세트를 초기화할 수 있습니다.");
      return;
    }

    if (!selection.grade) {
      setError("초기화할 학년을 먼저 선택하세요.");
      return;
    }

    clearTeacherAutoSaveTimer(autoSaveTimerRef);
    setAutoSaveToken(0);
    setAutoSaveStatus("");
    setSaving(true);
    setStatus("");
    setError("");

    try {
      const deletedCount = await deleteTeacherVocabularySetsForGrade(
        userId,
        selection.grade,
      );

      setItems([]);
      setPublished(false);
      setDirty(false);
      setStatus(
        deletedCount > 0
          ? `${selection.grade}학년의 저장 단원 ${deletedCount}개를 초기화했습니다. 새 엑셀 파일을 다시 업로드할 수 있습니다.`
          : `${selection.grade}학년에 초기화할 저장 단원이 없습니다.`,
      );
      await refreshCatalog();
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "학년 단어카드를 초기화하지 못했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function importWorkbook(file, grade, publishOverride = null) {
    if (!isFirebaseConfigured || !teacherProfile || !userId) {
      setError("Google 로그인과 선생님 정보 등록이 필요합니다.");
      return;
    }

    if (!file) {
      setError("업로드할 엑셀 파일을 선택하세요.");
      return;
    }

    if (!grade) {
      setError("엑셀 업로드용 학년을 먼저 선택하세요.");
      return;
    }

    const cleanPublisher = publisher.trim();
    if (!cleanPublisher) {
      setError("출판사를 먼저 선택하세요.");
      return;
    }

    setImporting(true);
    setStatus("");
    setAutoSaveStatus("");
    setError("");
    clearTeacherAutoSaveTimer(autoSaveTimerRef);
    setAutoSaveToken(0);

    try {
      await persistGradePublisher(grade, cleanPublisher);
      const groupedSets = await parseVocabularyWorkbook(file);
      const publishImportedSets =
        publishOverride === null ? published : publishOverride;
      let savedUnitCount = 0;
      let addedVocabularyCount = 0;
      let duplicateVocabularyCount = 0;
      const savedItemsByUnit = new Map();

      for (const groupedSet of groupedSets) {
        const existingSet = await fetchTeacherVocabularySet(userId, {
          grade,
          unit: groupedSet.unit,
        });
        const { mergedItems, addedCount, duplicateCount } = mergeVocabularyItems(
          existingSet.items ?? [],
          groupedSet.items,
        );
        const normalizedItems = normalizeDraftVocabulary(mergedItems);

        await saveTeacherVocabularySet({
          userId,
          schoolId: teacherProfile.schoolId,
          schoolName: teacherProfile.schoolName,
          teacherName: teacherProfile.teacherName,
          selection: { grade, unit: groupedSet.unit },
          items: normalizedItems,
          published: publishImportedSets,
          publisher: cleanPublisher,
          sourceType: "xlsx",
        });

        savedUnitCount += 1;
        addedVocabularyCount += addedCount;
        duplicateVocabularyCount += duplicateCount;
        savedItemsByUnit.set(groupedSet.unit, normalizedItems);
      }

      await refreshCatalog();

      const matchedSet = groupedSets.find(
        (groupedSet) => groupedSet.unit === selection.unit && selection.grade === grade,
      );

      if (matchedSet) {
        setItems(savedItemsByUnit.get(matchedSet.unit) ?? []);
        setPublished(publishImportedSets);
        setDirty(false);
      }
      setPublisher(cleanPublisher);

      setStatus(
        publishImportedSets
          ? `${grade}학년 엑셀 업로드를 완료했습니다. ${savedUnitCount}개 단원을 반영했고 새 단어 ${addedVocabularyCount}개를 추가했습니다. 중복 ${duplicateVocabularyCount}개는 건너뛰고 모든 반영 단원을 학생 공개로 설정했습니다.`
          : `${grade}학년 엑셀 업로드를 완료했습니다. ${savedUnitCount}개 단원을 반영했고 새 단어 ${addedVocabularyCount}개를 추가했습니다. 중복 ${duplicateVocabularyCount}개는 건너뛰었습니다.`,
      );
    } catch (nextError) {
      setError(
        formatErrorMessage(nextError, "엑셀 업로드를 처리하지 못했습니다."),
      );
    } finally {
      setImporting(false);
    }
  }

  function addItem(item) {
    setItems((current) => [...current, createDraftVocabularyItem(item, current.length)]);
    setDirty(true);
    setAutoSaveToken((current) => current + 1);
  }

  function updateItem(id, nextItem) {
    setItems((current) =>
      current.map((item, index) =>
        item.id === id
          ? {
              ...item,
              ...nextItem,
              order: index + 1,
            }
          : item,
      ),
    );
    setDirty(true);
    setAutoSaveToken((current) => current + 1);
  }

  function removeItem(id) {
    setItems((current) =>
      current
        .filter((item) => item.id !== id)
        .map((item, index) => ({
          ...item,
          order: index + 1,
        })),
    );
    setDirty(true);
    setAutoSaveToken((current) => current + 1);
  }

  function clearItems() {
    setItems([]);
    setDirty(true);
    setAutoSaveToken((current) => current + 1);
  }

  async function searchCopySources() {
    if (!isFirebaseConfigured || !teacherProfile) {
      setCopyError("선생님 정보 등록 후 사용할 수 있습니다.");
      return;
    }

    if (dirty) {
      setCopyError("저장되지 않은 변경사항이 있습니다. 먼저 저장하세요.");
      return;
    }

    if (!selection.grade) {
      setCopyError("학년을 먼저 선택하세요.");
      return;
    }

    const cleanPublisher = publisher.trim();
    if (!cleanPublisher) {
      setCopyError("검색할 출판사를 먼저 선택하세요.");
      return;
    }

    setCopyLoading(true);
    setCopyError("");
    setCopyStatus("");
    setCopySources([]);
    setSelectedCopySourceId("");

    try {
      const entries = await searchPublishedPublisherSources({
        grade: selection.grade,
        publisher: cleanPublisher,
      });
      const grouped = groupPublisherSourcesByTeacherAndSchool(
        entries,
        teacherProfile.schoolId,
      );
      setCopySources(grouped);
      setCopyStatus(
        grouped.length > 0
          ? `${selection.grade}학년 ${cleanPublisher} 공개 카드 ${grouped.length}건을 찾았습니다. 우리 학교 카드도 함께 표시됩니다.`
          : "해당 출판사의 공개 카드가 없습니다.",
      );
    } catch (nextError) {
      setCopyError(
        formatErrorMessage(
          nextError,
          "다른 학교 단어카드를 검색하지 못했습니다.",
        ),
      );
    } finally {
      setCopyLoading(false);
    }
  }

  function selectCopySource(sourceId) {
    setSelectedCopySourceId(sourceId);
    setCopyStatus("");
    setCopyError("");
  }

  async function copySource() {
    if (!isFirebaseConfigured || !teacherProfile || !userId) {
      setCopyError("선생님 정보 등록 후 사용할 수 있습니다.");
      return false;
    }

    if (dirty) {
      setCopyError("저장되지 않은 변경사항이 있습니다. 먼저 저장하세요.");
      return false;
    }

    const selectedSource = copySources.find(
      (source) => source.id === selectedCopySourceId,
    );

    if (!selectedSource) {
      setCopyError("복사할 단어카드를 먼저 선택하세요.");
      return false;
    }

    const publisherToPersist = publisher.trim() || selectedSource.publisher;

    if (!publisherToPersist) {
      setCopyError("출판사를 먼저 선택하세요.");
      return false;
    }

    setCopying(true);
    setCopyError("");
    setCopyStatus("");

    try {
      await persistGradePublisher(selection.grade, publisherToPersist);

      const sourceSets = await fetchPublishedPublisherSourceUnits({
        ownerUid: selectedSource.ownerUid,
        grade: selection.grade,
        publisher: selectedSource.publisher,
      });

      let savedUnitCount = 0;
      let addedVocabularyCount = 0;
      let duplicateVocabularyCount = 0;
      const savedItemsByUnit = new Map();

      for (const sourceSet of sourceSets) {
        const existingSet = await fetchTeacherVocabularySet(userId, {
          grade: selection.grade,
          unit: sourceSet.unit,
        });

        const { mergedItems, addedCount, duplicateCount } = mergeVocabularyItems(
          existingSet.items ?? [],
          sourceSet.items ?? [],
        );
        const normalizedItems = normalizeDraftVocabulary(mergedItems);

        await saveTeacherVocabularySet({
          userId,
          schoolId: teacherProfile.schoolId,
          schoolName: teacherProfile.schoolName,
          teacherName: teacherProfile.teacherName,
          selection: { grade: selection.grade, unit: sourceSet.unit },
          items: normalizedItems,
          published,
          publisher: publisherToPersist,
          sourceType: "copied",
        });

        savedUnitCount += 1;
        addedVocabularyCount += addedCount;
        duplicateVocabularyCount += duplicateCount;
        savedItemsByUnit.set(sourceSet.unit, normalizedItems);
      }

      await refreshCatalog();

      if (savedItemsByUnit.has(selection.unit)) {
        setItems(savedItemsByUnit.get(selection.unit) ?? []);
        setPublished(published);
        setDirty(false);
      }

      setPublisher(publisherToPersist);
      setCopyStatus(
        summarizePublisherCopyResult({
          savedUnitCount,
          addedVocabularyCount,
          duplicateVocabularyCount,
        }),
      );
      setStatus(
        `${selectedSource.schoolName} ${selectedSource.teacherName} 선생님의 공개 카드를 복사했습니다.`,
      );
      return true;
    } catch (nextError) {
      setCopyError(
        formatErrorMessage(
          nextError,
          "다른 학교 단어카드를 복사하지 못했습니다.",
        ),
      );
      return false;
    } finally {
      setCopying(false);
    }
  }

  const units = useMemo(
    () => getUnitsForGrade(catalog, selection.grade),
    [catalog, selection.grade],
  );

  const catalogEntry = useMemo(
    () =>
      catalog.find(
        (entry) => entry.grade === selection.grade && entry.unit === selection.unit,
      ) ?? null,
    [catalog, selection.grade, selection.unit],
  );

  return {
    selection,
    items,
    publisher,
    published,
    dirty,
    loading: loading || catalogLoading,
    saving,
    importing,
    status,
    autoSaveStatus,
    error,
    copySources,
    selectedCopySourceId,
    copyLoading,
    copying,
    copyStatus,
    copyError,
    units,
    catalogEntry,
    updateSelection,
    updatePublisher,
    setPublished: setPublishState,
    loadSet,
    saveSet,
    deleteSet,
    resetGradeSets,
    importWorkbook,
    searchCopySources,
    selectCopySource,
    copySource,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    teacherCatalog: catalog,
    setTeacherCatalog: setCatalog,
    teacherSelection: selection,
    teacherPublisherDraft: publisher,
    teacherAutoSaveSnapshotRef: autoSaveSnapshotRef,
    clearTeacherAutoSaveTimer,
    teacherAutoSaveTimerRef: autoSaveTimerRef,
    setTeacherAutoSaveToken: setAutoSaveToken,
    setTeacherAutoSaveStatus: setAutoSaveStatus,
    persistTeacherSetSnapshot: persistSnapshot,
    setTeacherDirty: setDirty,
  };
}
