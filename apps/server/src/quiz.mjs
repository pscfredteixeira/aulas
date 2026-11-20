import { randomBytes } from "node:crypto";

export const OPTION_IDS = ["A", "B", "C", "D"];

function cleanText(value, min, max) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length < min || text.length > max || /[<>\u0000-\u001f\u007f]/u.test(text)) return null;
  return text;
}

/** Validate all teacher input server-side, never trust form controls alone. */
export function createQuizDraft(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Dados da pergunta inválidos." };
  }
  const prompt = cleanText(input.prompt, 10, 400);
  if (!prompt) return { error: "A pergunta deve ter entre 10 e 400 caracteres, sem códigos HTML." };
  if (!Array.isArray(input.options) || input.options.length !== 4) {
    return { error: "Informe exatamente quatro alternativas." };
  }
  const options = input.options.map((value, index) => ({
    id: OPTION_IDS[index],
    text: cleanText(value, 1, 160)
  }));
  if (options.some(option => option.text === null)) {
    return { error: "Cada alternativa deve ter entre 1 e 160 caracteres e não pode conter HTML." };
  }
  if (new Set(options.map(o => o.text.toLocaleLowerCase("pt-BR"))).size !== 4) {
    return { error: "As quatro alternativas devem ser diferentes." };
  }
  if (!OPTION_IDS.includes(input.correctOptionId)) {
    return { error: "Escolha a alternativa correta." };
  }
  return {
    quiz: {
      id: randomBytes(12).toString("hex"),
      prompt,
      options,
      correctOptionId: input.correctOptionId,
      phase: "draft",
      revealed: false,
      votes: {},
      version: 1
    }
  };
}

export function tallyQuiz(quiz) {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const answer of Object.values(quiz.votes || {})) {
    if (Object.hasOwn(counts, answer)) counts[answer]++;
  }
  return { total: Object.values(counts).reduce((a, b) => a + b, 0), counts };
}

/** Private data (all individual votes and teacher answer key) never leaks via a student API response. */
export function quizForRole(quiz, role, participantId = null) {
  if (!quiz) return null;
  if (role !== "teacher" && quiz.phase === "draft") return null;
  const visible = {
    id: quiz.id,
    prompt: quiz.prompt,
    options: quiz.options,
    phase: quiz.phase,
    version: quiz.version,
    revealed: Boolean(quiz.revealed)
  };
  if (role === "teacher") {
    visible.correctOptionId = quiz.correctOptionId;
    visible.results = tallyQuiz(quiz);
  } else {
    visible.myAnswer = participantId ? (quiz.votes?.[participantId] ?? null) : null;
    if (quiz.phase === "closed" && quiz.revealed) {
      visible.correctOptionId = quiz.correctOptionId;
      visible.results = tallyQuiz(quiz);
    }
  }
  return visible;
}
