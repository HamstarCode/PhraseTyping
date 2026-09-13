import { NextResponse } from "next/server";

type Difficulty = "easy" | "normal" | "hard";
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

const difficultyInstructions: Record<Difficulty, string> = {
  easy: "Use short, basic CEFR A1-level sentences.",
  normal: "Use natural CEFR A2-B1-level sentences.",
  hard: "Use natural CEFR B2-level sentences with slightly richer expressions.",
};

const genericLearningPhrases = new Set([
  "hello", "hi", "okay", "ok", "yes", "no", "thanks", "thank you", "goodbye",
]);

const normalizePhrase = (phrase: string) =>
  phrase.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function isGeneratedRoom(value: unknown): value is GeneratedRoom {
  if (!value || typeof value !== "object") return false;
  const room = value as Partial<GeneratedRoom>;

  const hasValidConversation =
    typeof room.title === "string" &&
    room.title.trim().length > 0 &&
    Array.isArray(room.conversation) &&
    room.conversation.length === 8 &&
    room.conversation.every(
      (message) =>
        (message.speaker === 1 || message.speaker === 2) &&
        typeof message.text === "string" &&
        message.text.trim().length > 0 &&
        message.text.length <= 100 &&
        typeof message.translation === "string" &&
        message.translation.trim().length > 0,
    );

  if (!hasValidConversation || !room.conversation) return false;

  const uniqueMessageIndexes = new Set(
    room.learningPoints?.map((point) => point.messageIndex),
  );
  const genericPointCount = room.learningPoints?.filter((point) =>
    genericLearningPhrases.has(normalizePhrase(point.phrase)),
  ).length ?? 0;

  return (
    Array.isArray(room.learningPoints) &&
    room.learningPoints.length >= 2 &&
    room.learningPoints.length <= 3 &&
    uniqueMessageIndexes.size === room.learningPoints.length &&
    genericPointCount <= 1 &&
    room.learningPoints.every(
      (point) =>
        Number.isInteger(point.messageIndex) &&
        point.messageIndex >= 0 &&
        point.messageIndex < room.conversation!.length &&
        typeof point.phrase === "string" &&
        point.phrase.length > 0 &&
        room.conversation![point.messageIndex].text.includes(point.phrase) &&
        typeof point.meaning === "string" &&
        point.meaning.length > 0 &&
        typeof point.note === "string" &&
        point.note.length > 0 &&
        typeof point.example === "string" &&
        point.example.length > 0,
    )
  );
}

async function requestGemini(
  apiKey: string,
  model: string,
  prompt: string,
  responseSchema: object,
) {
  const effectivePrompt = prompt.startsWith("Judge whether")
    ? `${prompt}\nFor the optional expression, also return expressionStatus as none, valid, corrected, or unclear, and correctedExpression when corrected.`
    : prompt;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: effectivePrompt }] }],
        generationConfig: {
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    console.error("Gemini API error:", response.status, details);
    throw new Error("Gemini API request failed");
  }

  const result = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Gemini API returned no text");
  return JSON.parse(text) as unknown;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバーにGEMINI_API_KEYが設定されていません。" },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as {
      situation?: unknown;
      difficulty?: unknown;
      requestedExpression?: unknown;
    };
    const situation =
      typeof body.situation === "string" ? body.situation.trim() : "";
    const difficulty = body.difficulty;
    const requestedExpression =
      typeof body.requestedExpression === "string"
        ? body.requestedExpression.trim()
        : "";

    if (!situation || situation.length > 500) {
      return NextResponse.json(
        { error: "状況は1文字以上500文字以内で入力してください。" },
        { status: 400 },
      );
    }

    if (difficulty !== "easy" && difficulty !== "normal" && difficulty !== "hard") {
      return NextResponse.json(
        { error: "難易度が正しくありません。" },
        { status: 400 },
      );
    }

    if (requestedExpression.length > 300) {
      return NextResponse.json(
        { error: "使ってほしい表現は300文字以内で入力してください。" },
        { status: 400 },
      );
    }

    const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
    const validation = (await requestGemini(
      apiKey,
      model,
      `Judge whether this user input describes or strongly implies a usable conversation scene: ${JSON.stringify(situation)}\nRequested English expression: ${requestedExpression ? JSON.stringify(requestedExpression) : "None"}\n\nShort meaningful inputs such as "cafe", "at a station", or "job interview" are valid because roles can be inferred. Random characters, meaningless repetition, incoherent word salad, or text with no inferable conversation scene are unclear. Return a short helpful clarification message in Japanese only when unclear.`,
      {
        type: "OBJECT",
        properties: {
          status: { type: "STRING", enum: ["valid", "unclear"] },
          clarificationMessage: { type: "STRING" },
          expressionStatus: { type: "STRING", enum: ["none", "valid", "corrected", "unclear"] },
          correctedExpression: { type: "STRING" },
        },
        required: ["status", "clarificationMessage", "expressionStatus"],
      },
    )) as { status?: unknown; clarificationMessage?: unknown; expressionStatus?: unknown; correctedExpression?: unknown };

    if (validation.status === "unclear") {
      return NextResponse.json(
        {
          error:
            typeof validation.clarificationMessage === "string" &&
            validation.clarificationMessage
              ? validation.clarificationMessage
              : "状況が分かるように、もう少し具体的に入力してください。",
        },
        { status: 422 },
      );
    }

    if (validation.status !== "valid") {
      throw new Error("Gemini API returned an invalid validation result");
    }

    if (validation.expressionStatus === "unclear") {
      return NextResponse.json(
        { error: "使ってほしい表現の意味を確認できません。別の表現を入力してください。" },
        { status: 422 },
      );
    }

    if (
      validation.expressionStatus === "corrected" &&
      typeof validation.correctedExpression === "string" &&
      validation.correctedExpression.trim()
    ) {
      return NextResponse.json(
        { needsConfirmation: true, correctedExpression: validation.correctedExpression.trim() },
        { status: 409 },
      );
    }

    const generatedRoom = await requestGemini(
      apiKey,
      model,
      `Create an English conversation for a typing practice game.\n\nSituation requested by the learner: ${JSON.stringify(situation)}\nDifficulty: ${difficultyInstructions[difficulty]}\nRequested expression (optional): ${requestedExpression ? JSON.stringify(requestedExpression) : "None"}\n\nRequirements:\n- Infer natural roles from the situation when they are not explicitly provided.\n- Give the room a short English title.\n- Create exactly 8 conversation messages.\n- Alternate speakers strictly, beginning with speaker 2, then speaker 1.\n- Speaker 2 is the conversation partner. Speaker 1 is the learner who types.\n- Every message text must be in English.\n- If a requested expression is provided, correct obvious spelling mistakes, include the corrected expression naturally in at least one speaker 1 message, and prioritize it as a learning point.\n- Keep each message suitable for typing practice and under 100 characters.\n- Add a natural Japanese translation for every English message in translation.\n- Select 2 or 3 useful learning points from the actual conversation.\n- Each learning point phrase must be an exact, case-sensitive substring of the message at messageIndex.\n- Prioritize expressions specific to this situation and useful for completing its goal, such as "I'm looking for ..." when asking for directions or "For here or to go?" when ordering food.\n- Then prefer useful fixed expressions, idioms, phrasal verbs, or polite patterns appropriate to the selected difficulty.\n- Common greetings, acknowledgements, and thanks such as "Hello", "Okay", and "Thank you" are fallback choices only; do not select more than one generic phrase when more specific expressions are available.\n- Choose points from different messages when possible and avoid duplicate or near-duplicate expressions.\n- Write meaning and note in natural Japanese, and example as a different English example sentence.`,
      {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          conversation: {
            type: "ARRAY",
            minItems: 8,
            maxItems: 8,
            items: {
              type: "OBJECT",
              properties: {
                speaker: { type: "INTEGER" },
                text: { type: "STRING" },
                translation: { type: "STRING" },
              },
              required: ["speaker", "text", "translation"],
            },
          },
          learningPoints: {
            type: "ARRAY",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "OBJECT",
              properties: {
                messageIndex: { type: "INTEGER" },
                phrase: { type: "STRING" },
                meaning: { type: "STRING" },
                note: { type: "STRING" },
                example: { type: "STRING" },
              },
              required: ["messageIndex", "phrase", "meaning", "note", "example"],
            },
          },
        },
        required: ["title", "conversation", "learningPoints"],
      },
    );

    if (!isGeneratedRoom(generatedRoom)) {
      throw new Error("Gemini API returned an invalid room");
    }

    const alternatesCorrectly = generatedRoom.conversation.every(
      (message, index) => message.speaker === (index % 2 === 0 ? 2 : 1),
    );
    if (!alternatesCorrectly) {
      throw new Error("Gemini API returned an invalid speaker order");
    }

    return NextResponse.json(generatedRoom);
  } catch (error) {
    console.error("Room generation error:", error);
    return NextResponse.json(
      { error: "ROOMの生成中にエラーが発生しました。" },
      { status: 500 },
    );
  }
}
