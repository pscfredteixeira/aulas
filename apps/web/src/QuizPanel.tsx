import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { closeQuiz, openQuiz, revealQuizResults, saveQuizDraft, submitQuizAnswer } from "./api";
import type { Quiz, QuizDraftInput, QuizOptionId } from "./api";

const LETTERS: QuizOptionId[] = ["A", "B", "C", "D"];

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
  const [correctOptionId, setCorrectOptionId] = useState<QuizOptionId>("A");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  const isTeacher = role === "teacher";
  const canEdit = isTeacher && quiz?.phase !== "open";
  const studentCanAnswer = !isTeacher && quiz?.phase === "open" && !quiz.myAnswer;

  useEffect(() => {
    setErrorMessage("");
    setMessage("");
    if (isTeacher && quiz?.phase === "draft") {
      setPrompt(quiz.prompt);
      setOptions(quiz.options.map(option => option.text));
      setCorrectOptionId(quiz.correctOptionId ?? "A");
    }
  }, [isTeacher, quiz?.id]);

  async function perform(action: () => Promise<{ quiz: Quiz }>, success: string) {
    if (busy) return;
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
    if (!canEdit || busy) return;
    void perform(
      () => saveQuizDraft(roomId, token, {
        prompt: prompt.trim(), options: options.map(value => value.trim()), correctOptionId
      }),
      "Rascunho salvo. Você pode abrir a pergunta quando quiser."
    );
  }

  function submitAnswer(optionId: QuizOptionId) {
    if (!quiz || !studentCanAnswer || busy) return;
    void perform(
      () => submitQuizAnswer(roomId, token, quiz.id, optionId),
      "Resposta registrada! Aguarde o professor encerrar a votação."
    );
  }

  const showResults = Boolean(quiz?.results && (isTeacher || quiz.revealed));
  const totalVotes = quiz?.results?.total ?? 0;

  return (
    <aside className="quiz-panel" aria-label={isTeacher ? "Atividade do professor" : "Atividade da aula"}>
      <div className="quiz-panel-title">
        <div>
          <span className="eyebrow">Interação com a turma</span>
          <h2>Quiz da aula</h2>
        </div>
        <span className={"quiz-badge quiz-badge--" + (quiz?.phase ?? "waiting")}>
          {quiz?.phase === "draft" ? "Rascunho" :
            quiz?.phase === "open" ? "Recebendo respostas" :
              quiz?.phase === "closed" ? "Votação encerrada" : "Aguardando"}
        </span>
      </div>

      {!isTeacher && !quiz && (
        <div className="quiz-empty" role="status">
          <span className="quiz-empty-icon" aria-hidden="true">?</span>
          <h3>Aguardando uma pergunta</h3>
          <p>Quando o professor abrir uma atividade, ela aparecerá aqui sem interromper sua chamada.</p>
        </div>
      )}

      {quiz && (
        <div className="quiz-question" key={quiz.id}>
          <p className="quiz-question-kicker">
            {quiz.phase === "draft" ? "Prévia do professor" :
              quiz.phase === "open" ? "Pergunta em andamento" :
                quiz.revealed ? "Resultado da turma" : "Pergunta encerrada"}
          </p>
          <h3>{quiz.prompt}</h3>
          {!isTeacher && quiz.phase === "open" && !quiz.myAnswer && (
            <p className="quiz-info">Selecione uma alternativa. Você pode responder uma vez por participação.</p>
          )}
          <ol className="quiz-options">
            {quiz.options.map(option => {
              const selected = !isTeacher && quiz.myAnswer === option.id;
              const correct = (isTeacher || quiz.revealed) && option.id === quiz.correctOptionId;
              const className = "quiz-option" +
                (correct ? " quiz-option--correct" : "") +
                (selected ? " quiz-option--selected" : "");
              const content = (
                <>
                  <span className="quiz-option-letter">{option.id}</span>
                  <span className="quiz-option-text">{option.text}</span>
                  {correct && <span className="quiz-correct-label">Correta</span>}
                  {selected && <span className="quiz-selected-label">Sua resposta</span>}
                </>
              );
              return (
                <li key={option.id}>
                  {studentCanAnswer ? (
                    <button type="button" className={className + " quiz-answer-button"}
                      disabled={busy} onClick={() => submitAnswer(option.id)}
                      aria-label={`Responder alternativa ${option.id}: ${option.text}`}>
                      {content}
                    </button>
                  ) : (
                    <div className={className}>{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
          {!isTeacher && quiz.myAnswer && (
            <p className="quiz-answer-confirmation" role="status">
              Você respondeu <strong>{quiz.myAnswer}</strong>.
              {quiz.phase === "open" ? " Sua resposta foi registrada." :
                quiz.revealed ? " Confira o resultado abaixo." : " Aguarde a divulgação do resultado."}
            </p>
          )}
          {!isTeacher && quiz.phase === "closed" && !quiz.revealed && (
            <p className="quiz-info" role="status">
              A votação terminou. O professor decidirá quando mostrar o resultado.
            </p>
          )}
          {showResults && quiz.results && (
            <section className="quiz-results" aria-label="Resultado da votação" aria-live="polite">
              <h4>{isTeacher ? "Respostas da turma" : "Resultado da turma"}</h4>
              <p><strong>{totalVotes}</strong> {totalVotes === 1 ? "resposta registrada" : "respostas registradas"}</p>
              {LETTERS.map(letter => {
                const count = quiz.results?.counts[letter] ?? 0;
                const percent = totalVotes ? Math.round(count / totalVotes * 100) : 0;
                return (
                  <div className="quiz-result-row" key={letter}>
                    <div className="quiz-result-label"><strong>{letter}</strong><span>{count} · {percent}%</span></div>
                    <div className="quiz-result-track">
                      <div className="quiz-result-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </section>
          )}
          {!isTeacher && quiz.phase === "open" && !quiz.myAnswer && (
            <p className="quiz-info">A pergunta ficará aberta até o professor encerrar.</p>
          )}
        </div>
      )}

      {isTeacher && quiz?.phase === "draft" && (
        <div className="quiz-controls">
          <p className="quiz-info">O rascunho só aparece para você. O gabarito continuará oculto até a divulgação.</p>
          <button className="button button-primary" type="button" disabled={busy}
            onClick={() => void perform(() => openQuiz(roomId, token), "Pergunta aberta! Os alunos já podem responder.")}>
            Abrir votação para os alunos
          </button>
        </div>
      )}
      {isTeacher && quiz?.phase === "open" && (
        <div className="quiz-controls">
          <p className="quiz-info">As respostas são atualizadas aproximadamente a cada 3 segundos, sem interromper as câmeras.</p>
          <button className="button button-outline" type="button" disabled={busy}
            onClick={() => void perform(() => closeQuiz(roomId, token), "Votação encerrada. Você pode divulgar o resultado.")}>
            Encerrar votação
          </button>
        </div>
      )}
      {isTeacher && quiz?.phase === "closed" && !quiz.revealed && (
        <div className="quiz-controls">
          <p className="quiz-info">Só você vê o resultado neste momento. Clique abaixo para mostrá-lo à turma.</p>
          <button className="button button-primary" type="button" disabled={busy}
            onClick={() => void perform(() => revealQuizResults(roomId, token), "Resultado e gabarito divulgados à turma.")}>
            Mostrar resultado e gabarito
          </button>
        </div>
      )}
      {isTeacher && quiz?.phase === "closed" && quiz.revealed && (
        <p className="quiz-answer-confirmation" role="status">Resultado e gabarito já foram enviados aos alunos.</p>
      )}

      {canEdit && (
        <form className="quiz-editor" onSubmit={save}>
          {quiz?.phase === "closed" && <div className="quiz-divider" />}
          <h3>{quiz?.phase === "closed" ? "Criar próxima pergunta" :
            quiz?.phase === "draft" ? "Editar rascunho" : "Criar uma pergunta"}</h3>
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
          <label htmlFor="quiz-correct">Resposta correta (reservada ao professor)</label>
          <select id="quiz-correct" value={correctOptionId} disabled={busy}
            onChange={event => setCorrectOptionId(event.target.value as QuizDraftInput["correctOptionId"])}>
            {LETTERS.map(letter => <option value={letter} key={letter}>Alternativa {letter}</option>)}
          </select>
          <button className="button button-primary quiz-save" type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Salvar rascunho"}
          </button>
          <p className="quiz-info">Uma pergunta por vez. Cada aluno pode registrar uma resposta por participação.</p>
        </form>
      )}

      {!isTeacher && !quiz && <p className="quiz-info">Mantenha o áudio ativado para acompanhar as orientações do professor.</p>}
      {message && <p className="feedback" role="status">{message}</p>}
      {errorMessage && <p className="feedback feedback-error" role="alert">{errorMessage}</p>}
    </aside>
  );
}
