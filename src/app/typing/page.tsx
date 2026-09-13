
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

useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key.length !== 1) return;


    if (
      event.key === conversation[currentTurn].text[currentCharIndex]
    ) {
      setCurrentCharIndex(currentCharIndex + 1);
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


return (
<main>
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
        <p>Typing completed!</p>
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