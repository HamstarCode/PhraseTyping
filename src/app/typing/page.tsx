
"use client";

import { useState, useEffect } from "react";
import "./typing.css";


export default function TypingPage() {
  const conversation = [
  {
    speaker: 2,
    text: "What would you like to order?",
  },
  {
    speaker: 1,
    text: "Could I have a coffee, please?",
  },
  {
    speaker: 2,
    text: "Sure. What size would you like?",
  },
  {
    speaker: 1,
    text: "A medium, please.",
  },
];
//chatターンの処理
const [currentTurn, setCurrentTurn] = useState(0);

const result = currentTurn >= conversation.length;




useEffect(() => {
  if (result) {//はじめに処理やから＋１後にブッチする
    return;
  }
  if (conversation[currentTurn].speaker === 2) {
    setCurrentTurn(currentTurn + 1);
  }
}, [currentTurn]);
//typingの処理
const [currentCharIndex, setCurrentCharIndex] = useState(0);
const typingFinished =
  !result &&
  currentCharIndex >= conversation[currentTurn].text.length;

//正答率の処理

const [mistakeCount, setMistakeCount] = useState(0);
const [totalTypeCount, setTotalTypeCount] = useState(0);



useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key.length !== 1) return;
    setTotalTypeCount(totalTypeCount + 1);
    if (startTime === null) {
      setStartTime(Date.now());
    }

    if (
      event.key === conversation[currentTurn].text[currentCharIndex]
    ) {
      setCurrentCharIndex(currentCharIndex + 1);
    }
    else {
      setMistakeCount(mistakeCount + 1);
    }

  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [currentTurn, currentCharIndex]);


useEffect(() => {
  if (!typingFinished) return;

  setCurrentTurn((turn) => turn + 1);
  setCurrentCharIndex(0);
}, [typingFinished]);




// 正しく打った回数
const correctTypeCount = totalTypeCount - mistakeCount;

const accuracy =
  totalTypeCount === 0
    ? 100
    : (correctTypeCount / totalTypeCount) * 100;









// タイマーの処理
const [startTime, setStartTime] = useState<number | null>(null);
const [time, setTime] = useState(0);


useEffect(() => {
  if (startTime === null || result) return;

  const timer = setInterval(() => {
    setTime(Math.floor((Date.now() - startTime) / 1000));
  }, 100);

  return () => {
    clearInterval(timer);
  };
}, [[startTime, result]]);


//scoreの処理

// 1秒あたりに正しく打った文字数
const typingSpeed =
  time > 0 ? correctTypeCount / time : 0;

// 4文字/秒を100点として、Speedを0〜100点に変換
const speedScore =
  Math.min((typingSpeed / 4) * 100, 100);

// Accuracy 60% + Speed 40%
const score =
  accuracy * 0.6 + speedScore * 0.4;

// 最終スコアを整数に
const finalScore = Math.round(score);





return (
<main>
  <p>Time：{time} sec</p>
    {conversation.map((message, index) => (
      index <currentTurn && (
    <p 
      key={index}
      className={message.speaker === 1
        ? "message speaker-1"
        : "message speaker-2"
      }
    >
      {message.text}
    </p>
      )
    ))}
    {result ? (
      <div className="result">
      <h2>RESULT</h2>

      <p>Time: {time}s</p>
      <p>Accuracy: {accuracy.toFixed(2)}%</p>
      <p>Speed: {typingSpeed.toFixed(2)} chars/s</p>
      <p>Score: {finalScore}</p>
      </div>
    ) : (
      <div className="now-typing">
      <p>
        <span className="typed">
          {conversation[currentTurn].text.slice(0, currentCharIndex)}
        </span>

        <span className="untyped">
          {conversation[currentTurn].text.slice(currentCharIndex)}
        </span>
      </p>
      </div>
    )}
  </main>
  
);
}