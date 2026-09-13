"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import "./rooms.css";

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

export default function RoomsPage() {
  const router = useRouter();
  const savedRooms = useSyncExternalStore(
    subscribeToStorage,
    () => localStorage.getItem("rooms"),
    () => null,
  );
  const rooms = useMemo<Room[]>(
    () => (savedRooms ? JSON.parse(savedRooms) as Room[] : []),
    [savedRooms],
  );

  const playRoom = (room: Room) => {
    localStorage.setItem("room", JSON.stringify(room));
    router.push("/typing");
  };

  return (
    <main className="rooms-page">
      <div className="rooms-shell">
        <button className="rooms-home-button" type="button" onClick={() => router.push("/")}>
          ← HOME
        </button>

        <header className="rooms-header">
          <div>
            <p className="rooms-app-name">PhraseTyping</p>
            <h1>ROOM一覧</h1>
            <p className="rooms-description">保存した会話を選んで、もう一度練習できます。</p>
          </div>
        </header>

        {rooms.length === 0 ? (
          <section className="rooms-empty">
            <p className="rooms-empty-title">まだROOMがありません</p>
            <p>練習したい場面を入力して、最初のROOMを作りましょう。</p>
            <button type="button" onClick={() => router.push("/")}>ROOMを作成</button>
          </section>
        ) : (
          <section className="rooms-grid" aria-label="保存したROOM">
            {rooms.map((room) => (
              <button
                className="room-card"
                key={room.id}
                type="button"
                onClick={() => playRoom(room)}
              >
                <span className="room-card-top">
                  <span>
                    <span className="room-card-label">TYPE ROOM</span>
                    <strong>{room.title}</strong>
                  </span>
                  <span className="room-play">PLAY →</span>
                </span>

                <span className="room-stats">
                  <span><small>BEST SCORE</small><b>{room.bestScore}</b></span>
                  <span><small>BEST TIME</small><b>{room.bestTime === null ? "--" : `${room.bestTime}s`}</b></span>
                  <span><small>ACCURACY</small><b>{room.bestAccuracy.toFixed(1)}%</b></span>
                </span>

                <span className="room-meta">
                  {room.conversation.length} messages · {room.learningPoints.length} learning points
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
