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



return (
  <main>
    {conversation.map((message, index) => (
    <p 
      key={index}
      className={message.speaker === 1
        ? "message speaker-1"
        : "message speaker-2"
      }
    >
      {message.text}
    </p>
    ))}
  </main>
);
}