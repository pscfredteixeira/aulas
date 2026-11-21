import { randomBytes } from "node:crypto";
import { OPTION_IDS } from "./quiz.mjs";

export const ACTIVITY_TYPES = ["poll", "open_question", "case"];

function text(value, min, max) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < min || cleaned.length > max || /[<>\u0000-\u001f\u007f]/u.test(cleaned)) return null;
  return cleaned;
}

export function makeActivityDraft(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !ACTIVITY_TYPES.includes(input.type)) {
    return { error: "Tipo de atividade inválido." };
  }
  const prompt = text(input.prompt, 10, 400);
  if (!prompt) return { error: "Escreva uma pergunta de 10 a 400 caracteres, sem HTML." };

  const activity = {
    id: randomBytes(12).toString("hex"),
    type: input.type,
    prompt,
    phase: "draft",
    revealed: false,
    version: 1,
    votes: {},
    submissions: {}
  };

  if (input.type === "poll") {
    if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 4) {
      return { error: "Uma enquete precisa de duas a quatro alternativas." };
    }
    const options = input.options.map((value, index) => ({
      id: OPTION_IDS[index], text: text(value, 1, 160)
    }));
    if (options.some(option => !option.text) ||
        new Set(options.map(option => option.text.toLocaleLowerCase("pt-BR"))).size !== options.length) {
      return { error: "Use alternativas diferentes, com até 160 caracteres e sem HTML." };
    }
    activity.options = options;
  } else if (input.type === "case") {
    const context = text(input.context, 20, 1800);
    if (!context) return { error: "O estudo de caso precisa de um contexto com 20 a 1800 caracteres." };
    activity.context = context;
  }

  return { activity };
}

export function pollTotals(activity) {
  const counts = {};
  for (const option of activity.options || []) counts[option.id] = 0;
  for (const choice of Object.values(activity.votes || {})) {
    if (Object.hasOwn(counts, choice)) counts[choice]++;
  }
  return { total: Object.values(counts).reduce((sum, count) => sum + count, 0), counts };
}

/**
 * Students never receive unpublished open-text responses or their authors.
 * Teacher sees all submissions, students see their own and approved items
 * WITHOUT student names, so moderation precedes public disclosure.
 */
export function activityForRole(activity, role, participantId = null) {
  if (!activity) return null;
  if (role !== "teacher" && activity.phase === "draft") return null;
  const visible = {
    id: activity.id,
    type: activity.type,
    prompt: activity.prompt,
    phase: activity.phase,
    revealed: Boolean(activity.revealed),
    version: activity.version
  };
  if (activity.type === "poll") {
    visible.options = activity.options;
    if (role === "teacher") {
      visible.results = pollTotals(activity);
    } else {
      visible.myAnswer = participantId ? (activity.votes?.[participantId] ?? null) : null;
      if (activity.phase === "closed" && activity.revealed) visible.results = pollTotals(activity);
    }
  } else {
    if (activity.type === "case") visible.context = activity.context;
    const responses = Object.values(activity.submissions || {});
    if (role === "teacher") {
      visible.responses = responses.map(r => ({
        id: r.id, name: r.name, text: r.text, approved: Boolean(r.approved)
      }));
    } else {
      const mine = participantId ? activity.submissions?.[participantId] : null;
      visible.myResponse = mine ? { id: mine.id, text: mine.text, approved: Boolean(mine.approved) } : null;
      visible.approvedResponses = responses.filter(r => r.approved).map(r => ({ id: r.id, text: r.text }));
    }
  }
  return visible;
}
