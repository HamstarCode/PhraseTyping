"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type GeneratedRoom = {
  title: string;
  conversation: { speaker: 1 | 2; text: string; translation: string }[];
  learningPoints: {
    messageIndex: number;
    phrase: string;
    meaning: string;
    note: string;
    example: string;
  }[];
};

type Room = GeneratedRoom & {
  id: string;
  bestScore: number;
  bestTime: number | null;
  bestAccuracy: number;
};

export default function Home() {
  const router = useRouter();
  const [situation, setSituation] = useState("");
  const [difficulty, setDifficulty] = useState("normal");
  const [requestedExpression, setRequestedExpression] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [pendingCorrection, setPendingCorrection] = useState("");

  const createRoom = async (expressionOverride?: string) => {
    const trimmedSituation = situation.trim();

    if (!trimmedSituation) {
      setError("練習したい状況を入力してください。");
      return;
    }

    setIsGenerating(true);
    setError("");
    setPendingCorrection("");
    const expression = expressionOverride ?? requestedExpression.trim();

    try {
      const response = await fetch("/api/generate-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: trimmedSituation,
          difficulty,
          requestedExpression: expression,
        }),
      });

      const data = (await response.json()) as GeneratedRoom & {
        error?: string;
        needsConfirmation?: boolean;
        correctedExpression?: string;
      };

      if (response.status === 409 && data.correctedExpression) {
        setPendingCorrection(data.correctedExpression);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "ROOMの生成に失敗しました。");
      }

      const room: Room = {
        id: crypto.randomUUID(),
        title: data.title,
        conversation: data.conversation,
        learningPoints: data.learningPoints,
        bestScore: 0,
        bestTime: null,
        bestAccuracy: 0,
      };

      const savedRooms = localStorage.getItem("rooms");
      const rooms: Room[] = savedRooms ? JSON.parse(savedRooms) : [];

      rooms.push(room);
      localStorage.setItem("rooms", JSON.stringify(rooms));
      localStorage.setItem("room", JSON.stringify(room));
      router.push("/typing");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "ROOMの生成に失敗しました。",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.appName}>PhraseTyping</p>
          <h1>使えるフレーズを、<br />タイプして丸ごと身につける。</h1>
          <p className={styles.lead}>練習したい場面を入力すると、AIがあなただけの英会話ROOMを作ります。</p>
        </header>

      <section className={styles.form} aria-label="TYPE ROOM作成フォーム">
        <div className={styles.formHeading}>
          <div>
            <p className={styles.stepLabel}>NEW TYPE ROOM</p>
            <h2>会話を作成</h2>
          </div>
          <span>約8メッセージ</span>
        </div>

        <div className={styles.field}>
          <label htmlFor="situation">状況入力</label>
          <p className={styles.fieldHelp}>練習したい場所や目的を日本語で入力してください。</p>
          <textarea
            id="situation"
            name="situation"
            placeholder="例：海外のカフェで注文するとき"
            rows={4}
            value={situation}
            onChange={(event) => setSituation(event.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="difficulty">難易度</label>
          <p className={styles.fieldHelp}>英文の語彙や言い回しのレベルを選びます。</p>
          <div className={styles.selectWrapper}>
            <select
              id="difficulty"
              name="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              disabled={isGenerating}
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="requestedExpression">使ってほしい表現</label>
            <span>OPTIONAL</span>
          </div>
          <p className={styles.fieldHelp}>単語・熟語・定型表現を会話と学習ポイントに含めます。</p>
          <input
            id="requestedExpression"
            name="requestedExpression"
            type="text"
            placeholder="例：Could I ...? / I'd like to ..."
            value={requestedExpression}
            onChange={(event) => setRequestedExpression(event.target.value)}
            disabled={isGenerating}
          />
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        {pendingCorrection && (
          <div className={styles.correction} role="alert">
            <p>もしかして：</p>
            <p className={styles.correctionExpression}>{pendingCorrection}</p>
            <div className={styles.correctionActions}>
              <button type="button" onClick={() => createRoom(pendingCorrection)}>
                修正して使う
              </button>
              <button type="button" onClick={() => setPendingCorrection("")}>入力に戻る</button>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.createButton}
            type="button"
            onClick={() => createRoom()}
            disabled={isGenerating}
          >
            {isGenerating ? "会話を生成中..." : "TYPE ROOM作成"}
          </button>
          <button
            className={styles.roomListButton}
            type="button"
            onClick={() => router.push("/rooms")}
            disabled={isGenerating}
          >
            ROOM一覧
          </button>
        </div>
      </section>
      </div>
    </main>
  );
}
