import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  db,
  createBingoSession,
  drawNextBingoWord,
  endBingoSession,
  joinBingoSession,
  markBingoCell,
  callBingoWord,
} from "../lib/firebase.js";
import {
  normalizeBingoText,
  summarizeBingoPlayerStatuses,
} from "../utils/bingo.js";

function normalizeSessionDoc(snapshot) {
  if (!snapshot?.exists?.()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function normalizePlayerDoc(snapshot) {
  if (!snapshot?.exists?.()) {
    return null;
  }

  return {
    id: snapshot.id,
    playerId: snapshot.id,
    ...snapshot.data(),
  };
}

function getSessionRef(sessionCode) {
  if (!db || !normalizeBingoText(sessionCode)) {
    return null;
  }

  return doc(db, "bingoSessions", normalizeBingoText(sessionCode));
}

function getPlayerRef(sessionCode, playerId) {
  if (!db || !normalizeBingoText(sessionCode) || !normalizeBingoText(playerId)) {
    return null;
  }

  return doc(
    db,
    "bingoSessions",
    normalizeBingoText(sessionCode),
    "players",
    normalizeBingoText(playerId),
  );
}

export function useBingoSession({
  sessionCode: initialSessionCode = "",
  playerId: initialPlayerId = "",
  autoSubscribe = true,
} = {}) {
  const [sessionCode, setSessionCode] = useState(
    normalizeBingoText(initialSessionCode),
  );
  const [playerId, setPlayerId] = useState(normalizeBingoText(initialPlayerId));
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionCode));
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!autoSubscribe || !db || !sessionCode) {
      setSession(null);
      setPlayers([]);
      setPlayer(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");

    const sessionRef = getSessionRef(sessionCode);
    const playersQuery = query(
      collection(db, "bingoSessions", sessionCode, "players"),
      orderBy("joinedAt", "asc"),
    );

    const unsubscribeSession = sessionRef
      ? onSnapshot(
          sessionRef,
          (snapshot) => {
            setSession(normalizeSessionDoc(snapshot));
            setLoading(false);
          },
          (snapshotError) => {
            setError(snapshotError.message || "빙고 세션을 불러오지 못했습니다.");
            setLoading(false);
          },
        )
      : () => {};

    const unsubscribePlayers = onSnapshot(
      playersQuery,
      (snapshot) => {
        setPlayers(snapshot.docs.map((item) => normalizePlayerDoc(item)));
      },
      (snapshotError) => {
        setError(snapshotError.message || "빙고 참가자를 불러오지 못했습니다.");
      },
    );

    const playerRef = getPlayerRef(sessionCode, playerId);
    const unsubscribePlayer = playerRef
      ? onSnapshot(
          playerRef,
          (snapshot) => {
            setPlayer(normalizePlayerDoc(snapshot));
          },
          (snapshotError) => {
            setError(snapshotError.message || "내 빙고 상태를 불러오지 못했습니다.");
          },
        )
      : () => {};

    return () => {
      unsubscribeSession();
      unsubscribePlayers();
      unsubscribePlayer();
    };
  }, [autoSubscribe, playerId, sessionCode]);

  useEffect(() => {
    if (initialSessionCode) {
      setSessionCode(normalizeBingoText(initialSessionCode));
    }
  }, [initialSessionCode]);

  useEffect(() => {
    if (initialPlayerId) {
      setPlayerId(normalizeBingoText(initialPlayerId));
    }
  }, [initialPlayerId]);

  const statusSummary = useMemo(
    () => summarizeBingoPlayerStatuses(players),
    [players],
  );

  const playerCounts = useMemo(
    () => ({
      total: players.length,
      waiting: statusSummary.waiting.length,
      oneBingo: statusSummary.one.length,
      twoBingo: statusSummary.two.length,
      threePlusBingo: statusSummary.threePlus.length,
    }),
    [players.length, statusSummary],
  );

  async function startSession(payload) {
    setActionLoading(true);
    setError("");

    try {
      const result = await createBingoSession(payload);
      setSessionCode(result.sessionCode);
      setSession(result.session);
      return result;
    } catch (sessionError) {
      setError(sessionError.message || "빙고 세션을 시작하지 못했습니다.");
      throw sessionError;
    } finally {
      setActionLoading(false);
    }
  }

  async function joinSession(payload) {
    setActionLoading(true);
    setError("");

    try {
      const result = await joinBingoSession(payload);
      setSessionCode(result.sessionCode);
      setPlayerId(result.playerId);
      setSession(result.session);
      setPlayer(result.player);
      return result;
    } catch (sessionError) {
      setError(sessionError.message || "빙고 세션에 참여하지 못했습니다.");
      throw sessionError;
    } finally {
      setActionLoading(false);
    }
  }

  async function callWord(payload) {
    setActionLoading(true);
    setError("");

    try {
      return await callBingoWord(payload);
    } catch (sessionError) {
      setError(sessionError.message || "호출 단어를 저장하지 못했습니다.");
      throw sessionError;
    } finally {
      setActionLoading(false);
    }
  }

  async function drawWord(payload) {
    setActionLoading(true);
    setError("");

    try {
      return await drawNextBingoWord(payload);
    } catch (sessionError) {
      setError(sessionError.message || "랜덤 단어를 뽑지 못했습니다.");
      throw sessionError;
    } finally {
      setActionLoading(false);
    }
  }

  async function markCell(payload) {
    setActionLoading(true);
    setError("");

    try {
      return await markBingoCell(payload);
    } catch (sessionError) {
      setError(sessionError.message || "빙고 칸을 체크하지 못했습니다.");
      throw sessionError;
    } finally {
      setActionLoading(false);
    }
  }

  async function endSession(payload) {
    setActionLoading(true);
    setError("");

    try {
      return await endBingoSession(payload);
    } catch (sessionError) {
      setError(sessionError.message || "빙고 세션을 종료하지 못했습니다.");
      throw sessionError;
    } finally {
      setActionLoading(false);
    }
  }

  return {
    loading,
    actionLoading,
    error,
    sessionCode,
    playerId,
    session,
    players,
    player,
    statusSummary,
    playerCounts,
    setSessionCode,
    setPlayerId,
    startSession,
    joinSession,
    callWord,
    drawWord,
    markCell,
    endSession,
  };
}
