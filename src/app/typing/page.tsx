"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import "./typing.css";

type Room = {
  id: string;
  title: string;
  conversation: {
    speaker: number;
    text: string;
    translation: string;
  }[];

  learningPoints: {
    messageIndex: number;
    phrase: string;
    meaning: string;
    note: string;
    example: string;
  }[];

  bestScore: number;
  bestTime: number | null;
  bestAccuracy: number;
};

const subscribeToStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getNextTypingTurn = (room: Room, startTurn: number) => {
  let turn = startTurn;

  while (
    turn < room.conversation.length &&
    room.conversation[turn].speaker === 2
  ) {
    turn += 1;
  }

  return turn;
};

/* ========================================
   Room読み込み担当
======================================== */

export default function TypingPage() {
  const savedRoom = useSyncExternalStore(
    subscribeToStorage,
    () => localStorage.getItem("room"),
    () => null,
  );
  const room = useMemo<Room | null>(
    () => (savedRoom ? JSON.parse(savedRoom) as Room : null),
    [savedRoom],
  );

  if (!room) {
    return <p>Loading...</p>;
  }

  return <TypingGame room={room} />;
}

/* ========================================
   タイピングゲーム本体
======================================== */

function TypingGame({ room }: { room: Room }) {
  const router = useRouter();
  const typingBoxRef = useRef<HTMLDivElement | null>(null);
  const [visibleTranslations, setVisibleTranslations] = useState<number[]>([]);

  const toggleTranslation = (index: number) => {
    setVisibleTranslations((visible) =>
      visible.includes(index)
        ? visible.filter((visibleIndex) => visibleIndex !== index)
        : [...visible, index],
    );
  };

  const isLearningPointCharacter = (messageIndex: number, charIndex: number) =>
    room.learningPoints.some((point) => {
      if (point.messageIndex !== messageIndex) return false;
      const start = room.conversation[messageIndex].text.indexOf(point.phrase);
      return start >= 0 && charIndex >= start && charIndex < start + point.phrase.length;
    });

  // ----------------------------------------
  // 会話ターン
  // ----------------------------------------

  const [currentTurn, setCurrentTurn] = useState(() => getNextTypingTurn(room, 0));

  const result = currentTurn >= room.conversation.length;

  const currentMessage = result
    ? null
    : room.conversation[currentTurn];

  useEffect(() => {
    if (currentMessage?.speaker !== 1) return;

    const frame = requestAnimationFrame(() => {
      typingBoxRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [currentTurn, currentMessage]);

  // ----------------------------------------
  // タイピング
  // ----------------------------------------

  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  // ----------------------------------------
  // 正確率
  // ----------------------------------------

  const [mistakeCount, setMistakeCount] = useState(0);
  const [totalTypeCount, setTotalTypeCount] = useState(0);
  const [isMistake, setIsMistake] = useState(false);
  const mistakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (mistakeTimerRef.current) {
        clearTimeout(mistakeTimerRef.current);
      }
    };
  }, []);

  const correctTypeCount =
    totalTypeCount - mistakeCount;

  const accuracy =
    totalTypeCount === 0
      ? 100
      : (correctTypeCount / totalTypeCount) * 100;

  // ----------------------------------------
  // タイマー
  // ----------------------------------------

  const [startTime, setStartTime] =
    useState<number | null>(null);

  const [time, setTime] = useState(0);

  useEffect(() => {
    if (startTime === null || result) return;

    const timer = setInterval(() => {
      setTime(
        Math.floor((Date.now() - startTime) / 1000)
      );
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, [startTime, result]);

  // ----------------------------------------
  // キー入力
  // ----------------------------------------

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 終了後は入力を受け付けない
      if (result) return;

      // speaker 1 のときだけ入力
      if (currentMessage?.speaker !== 1) return;

      // Shift / Enter / Backspaceなどを除外
      if (event.key.length !== 1) return;

      // 総タイプ数
      setTotalTypeCount((count) => count + 1);

      // 最初の有効入力でタイマー開始
      setStartTime((time) => {
        if (time === null) {
          return Date.now();
        }

        return time;
      });

      // 正誤判定
      if (
        event.key ===
        currentMessage.text[currentCharIndex]
      ) {
        const nextCharIndex = currentCharIndex + 1;

        if (nextCharIndex >= currentMessage.text.length) {
          setCurrentTurn(getNextTypingTurn(room, currentTurn + 1));
          setCurrentCharIndex(0);
        } else {
          setCurrentCharIndex(nextCharIndex);
        }
      } else {
        setMistakeCount(
          (count) => count + 1
        );

        setIsMistake(true);

        if (mistakeTimerRef.current) {
          clearTimeout(mistakeTimerRef.current);
        }

        mistakeTimerRef.current = setTimeout(() => {
          setIsMistake(false);
        }, 180);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    currentCharIndex,
    currentMessage,
    currentTurn,
    result,
    room,
  ]);

  // ----------------------------------------
  // Score
  // ----------------------------------------

  // 1秒あたりの正タイプ数
  const typingSpeed =
    time > 0
      ? correctTypeCount / time
      : 0;

  // 4文字/秒を100点
  const speedScore =
    Math.min(
      (typingSpeed / 4) * 100,
      100
    );

  // 正確性60% + 速度40%
  const score =
    accuracy * 0.6 +
    speedScore * 0.4;

  const finalScore =
    Math.round(score);
  useEffect(() => {
    if (!result) return;

    const savedRooms = localStorage.getItem("rooms");
    if (!savedRooms) return;

    const rooms: Room[] = JSON.parse(savedRooms);

    const updatedRooms = rooms.map((savedRoom) => {
      if (savedRoom.id !== room.id) {
        return savedRoom;
      }

      return {
        ...savedRoom,

        bestScore: Math.max(
          savedRoom.bestScore ?? 0,
          finalScore
        ),

        bestTime:
          savedRoom.bestTime === null ||
          savedRoom.bestTime === undefined
            ? time
            : Math.min(savedRoom.bestTime, time),

        bestAccuracy: Math.max(
          savedRoom.bestAccuracy ?? 0,
          accuracy
        ),
      };
    });

    localStorage.setItem(
      "rooms",
      JSON.stringify(updatedRooms)
    );
  }, [accuracy, finalScore, result, room.id, time]);
  // ----------------------------------------
  // Retry
  // ----------------------------------------

  const resetGame = () => {
    setCurrentTurn(getNextTypingTurn(room, 0));
    setCurrentCharIndex(0);

    setMistakeCount(0);
    setTotalTypeCount(0);
    setIsMistake(false);

    if (mistakeTimerRef.current) {
      clearTimeout(mistakeTimerRef.current);
    }

    setStartTime(null);
    setTime(0);
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------

  return (
    <main className="typing-page">
      <div className="typing-shell">
        <button className="typing-home-button" type="button" onClick={() => router.push("/")}>
          ← HOME
        </button>

        <header className="typing-header">
          <div>
            <p className="app-name">PhraseTyping</p>
            <h1>{room.title}</h1>
          </div>

          <div className="typing-status">
            <span className="turn-count">
              {Math.min(currentTurn + 1, room.conversation.length)} / {room.conversation.length}
            </span>
            <span className="timer" aria-label={`経過時間 ${time}秒`}>
              {String(Math.floor(time / 60)).padStart(2, "0")}:
              {String(time % 60).padStart(2, "0")}
            </span>
          </div>
        </header>

        <div className="header-line" />

        <section className="conversation" aria-label="英会話">

      {/* 確定済みチャット */}
      {room.conversation.map(
        (message, index) =>
          index < currentTurn && (
            <div
              key={index}
              className={
                message.speaker === 1
                  ? "message speaker-1"
                  : "message speaker-2"
              }
            >
              <span className="speaker-label">
                {message.speaker === 1 ? "YOU" : "PARTNER"}
              </span>
              <p>
                {Array.from(message.text).map((character, charIndex) => (
                  <span
                    key={charIndex}
                    className={
                      isLearningPointCharacter(index, charIndex)
                        ? "learning-phrase"
                        : undefined
                    }
                  >
                    {character}
                  </span>
                ))}
              </p>

              <button
                  className="translation-button"
                  type="button"
                  onClick={(event) => {
                    toggleTranslation(index);
                    event.currentTarget.blur();
                  }}
              >
                {visibleTranslations.includes(index) ? "閉じる" : "日本語"}
              </button>

              {visibleTranslations.includes(index) && (
                <p className="translation">{message.translation}</p>
              )}
            </div>
          )
      )}

      {/* Result / Now Typing */}
      {result ? (
        <div className="result">
          <p className="result-label">RESULT</p>
          <p className="result-score">{finalScore}</p>
          <p className="result-score-label">SCORE</p>

          <div className="result-stats">
            <div><span>TIME</span><strong>{time}s</strong></div>
            <div><span>ACCURACY</span><strong>{accuracy.toFixed(2)}%</strong></div>
            <div><span>SPEED</span><strong>{typingSpeed.toFixed(2)}</strong></div>
          </div>

          <section className="learning-points" aria-labelledby="learning-points-title">
            <h3 id="learning-points-title">今回の重要表現</h3>

            {room.learningPoints.map((point, index) => (
              <article className="learning-card" key={`${point.messageIndex}-${point.phrase}`}>
                <p className="learning-number">POINT {index + 1}</p>
                <p className="learning-card-phrase">{point.phrase}</p>
                <p className="learning-meaning">{point.meaning}</p>
                <p className="learning-note">{point.note}</p>
                <p className="learning-example">Example: {point.example}</p>
              </article>
            ))}
          </section>

          <div className="result-actions">
            <button className="primary-action" onClick={resetGame}>Restart</button>
            <button className="secondary-action" onClick={() => router.push("/")}>Home</button>
          </div>
        </div>
      ) : (
        currentMessage?.speaker === 1 && (
          <div
            ref={typingBoxRef}
            key={mistakeCount}
            className={`now-typing${isMistake ? " mistake" : ""}`}
          >
            <span className="speaker-label">YOU · TYPE THIS</span>
            <p>
              {Array.from(currentMessage.text).map((character, charIndex) => {
                const typingState =
                  charIndex < currentCharIndex
                    ? "typed"
                    : charIndex === currentCharIndex
                      ? "current-character"
                      : "untyped";
                const learningClass = isLearningPointCharacter(currentTurn, charIndex)
                  ? " learning-phrase"
                  : "";

                return (
                  <span key={charIndex} className={`${typingState}${learningClass}`}>
                    {character}
                  </span>
                );
              })}
            </p>

            <button
              className="translation-button"
              type="button"
              onClick={(event) => {
                toggleTranslation(currentTurn);
                event.currentTarget.blur();
              }}
            >
              {visibleTranslations.includes(currentTurn) ? "閉じる" : "日本語"}
            </button>

            {visibleTranslations.includes(currentTurn) && (
              <p className="translation">{currentMessage.translation}</p>
            )}
          </div>
        )
      )}
        </section>
      </div>
    </main>
  );
}
