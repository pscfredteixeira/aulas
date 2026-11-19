import { useState } from "react";
import type { FormEvent } from "react";
import { closeQuiz, openQuiz, saveQuizDraft } from "./api";
import type { Quiz, QuizDraftInput } from "./api";

const LETTERS = ["A", "B", "C", "D"] as const;

type Props = {
  roomId: string;
  token: string;
  role: "teacher" | "student";
  quiz: Quiz | null;
  onUpdated: (quiz: Quiz) => void;
};

export default function QuizPanel({ roomId, token, role, quiz, onUpdated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOptionId, setCorrectOptionId] = useState<QuizDraftInput["correctOptionId"]>("A");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  async function perform(action: () => Promise<{ quiz: Quiz }>, success: string) {
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    try {
      const result = await action();
      onUpdated(result.quiz);
      setMessage(success);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ocorreu um erro ao atualizar a pergunta.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (quiz?.phase === "open" || busy) return;
    void perform(
      () => saveQuizDraft(roomId, token, { prompt: prompt.trim(), options: options.map(v => v.trim()), correctOptionId }),
      "Rascunho salvo. Abra a pergunta para mostrá-la à turma."
    );
  }

  const isTeacher = role === "teacher";
  const canEdit = isTeacher && (!quiz || quiz.phase === "closed");

  return (
    <aside className="quiz-panel" aria-label={isTeacher ? "Atividade do professor" : "Atividade da aula"}>
      <div className="quiz-panel-title">
        <div>
          <span className="eyebrow">Atividades ao vivo</span>
          <h2>Quiz da aula</h2>
        </div>
        <span className={"quiz-badge quiz-badge--" + (quiz?.phase ?? "waiting")}>
          {quiz?.phase === "draft" ? "Rascunho" :
            quiz?.phase === "open" ? "Na tela da turma" :
              quiz?.phase === "closed" ? "Encerrado" : "Aguardando"}
        </span>
      </div>

      {!isTeacher && !quiz && (
        <div className="quiz-empty" role="status">
          <span className="quiz-empty-icon" aria-hidden="true">?</span>
          <h3>Aguardando uma pergunta</h3>
          <p>Quando o professor abrir uma atividade, ela aparecerá aqui sem interromper a chamada.</p>
        </div>
      )}

      {quiz && (
        <div className="quiz-question" aria-live="polite" key={quiz.id}>
          <p className="quiz-question-kicker">
            {quiz.phase === "draft" ? "Prévia do professor" :
              quiz.phase === "open" ? "Pergunta em andamento" : "Pergunta encerrada"}
          </p>
          <h3>{quiz.prompt}</h3>
          <ol className="quiz-options">
            {quiz.options.map(option => (
              <li key={option.id} className={isTeacher && option.id === quiz.correctOptionId ? "quiz-option quiz-option--correct" : "quiz-option"}>
                <span className="quiz-option-letter">{option.id}</span>
                <span>{option.text}</span>
                {isTeacher && option.id === quiz.correctOptionId && <span className="quiz-correct-label">Gabarito</span>}
              </li>
            ))}
          </ol>
          {!isTeacher && <p className="quiz-info">
            {quiz.phase === "open"
              ? "A pergunta está sendo apresentada. A opção de responder pela plataforma será ativada no próximo sprint."
              : "O professor encerrou esta pergunta. Aguarde a próxima atividade."}
          </p>}
        </div>
      )}

      {isTeacher && quiz?.phase === "draft" && (
        <div className="quiz-controls">
          <p className="quiz-info">O rascunho só está visível para você. Ao abrir, os alunos verão a pergunta, mas não o gabarito.</p>
          <button className="button button-primary" type="button" disabled={busy}
            onClick={() => void perform(() => openQuiz(roomId, token), "Pergunta aberta para a turma.")}>
            Abrir pergunta para os alunos
          </button>
        </div>
      )}
      {isTeacher && quiz?.phase === "open" && (
        <div className="quiz-controls">
          <p className="quiz-info">A pergunta aparece aos alunos em poucos segundos. Câmeras e áudio continuam na mesma chamada.</p>
          <button className="button button-outline" type="button" disabled={busy}
            onClick={() => void perform(() => closeQuiz(roomId, token), "Pergunta encerrada para a turma.")}>
            Encerrar pergunta
          </button>
        </div>
      )}

      {canEdit && (
        <form className="quiz-editor" onSubmit={save}>
          {quiz?.phase === "closed" && <div className="quiz-divider" />}
          <h3>{quiz?.phase === "closed" ? "Criar próxima pergunta" : "Criar uma pergunta"}</h3>
          <label htmlFor="quiz-prompt">Enunciado</label>
          <textarea id="quiz-prompt" rows={3} minLength={10} maxLength={400} required
            value={prompt} placeholder="Escreva a pergunta para seus alunos..."
            onChange={event => setPrompt(event.target.value)} disabled={busy} />
          <div className="quiz-alternatives-heading">Quatro alternativas</div>
          {options.map((value, index) => (
            <div className="quiz-option-field" key={LETTERS[index]}>
              <label htmlFor={`quiz-option-${index}`}>{LETTERS[index]}</label>
              <input id={`quiz-option-${index}`} type="text" required maxLength={160} disabled={busy}
                placeholder={`Alternativa ${LETTERS[index]}`} value={value}
                onChange={event => {
                  const updated = [...options];
                  updated[index] = event.target.value;
                  setOptions(updated);
                }} />
            </div>
          ))}
          <label htmlFor="quiz-correct">Resposta correta (visível apenas ao professor)</label>
          <select id="quiz-correct" value={correctOptionId} disabled={busy}
            onChange={event => setCorrectOptionId(event.target.value as QuizDraftInput["correctOptionId"])}>
            {LETTERS.map(letter => <option value={letter} key={letter}>Alternativa {letter}</option>)}
          </select>
          <button className="button button-primary quiz-save" type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Salvar rascunho"}
          </button>
          <p className="quiz-info">Uma pergunta por vez. O próximo passo será permitir que cada aluno envie sua resposta.</p>
        </form>
      )}

      {!isTeacher && !quiz && <p className="quiz-info">Mantenha o áudio ativado para acompanhar as orientações do professor.</p>}
      {message && <p className="feedback" role="status">{message}</p>}
      {errorMessage && <p className="feedback feedback-error" role="alert">{errorMessage}</p>}
    </aside>
  );
}
