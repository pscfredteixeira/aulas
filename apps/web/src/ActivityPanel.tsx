import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  closeActivity, moderateActivityResponse, openActivity, revealActivity,
  saveActivityDraft, submitActivityAnswer
} from "./api";
import type { Activity, ActivityDraftInput, ActivityType, QuizOptionId } from "./api";

const LABELS: Record<ActivityType, string> = {
  poll: "Enquete",
  open_question: "Pergunta aberta",
  case: "Estudo de caso"
};
const LETTERS: QuizOptionId[] = ["A", "B", "C", "D"];

type Props = {
  roomId: string;
  token: string;
  role: "teacher" | "student";
  activity: Activity | null;
  onUpdated: (activity: Activity) => void;
};

export default function ActivityPanel({ roomId, token, role, activity, onUpdated }: Props) {
  const [type, setType] = useState<ActivityType>("poll");
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isTeacher = role === "teacher";
  const canEdit = isTeacher && activity?.phase !== "open";

  useEffect(() => {
    setError("");
    setMessage("");
    setReply("");
    if (isTeacher && activity?.phase === "draft") {
      setType(activity.type);
      setPrompt(activity.prompt);
      setContext(activity.context || "");
      setOptions(activity.options?.map(option => option.text) || ["", "", "", ""]);
    }
  }, [isTeacher, activity?.id]);

  async function execute(operation: () => Promise<{ activity: Activity }>, done: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await operation();
      onUpdated(result.activity);
      setMessage(done);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a atividade.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || busy) return;
    const draft: ActivityDraftInput = { type, prompt: prompt.trim() };
    if (type === "poll") draft.options = options.map(v => v.trim()).filter(Boolean);
    if (type === "case") draft.context = context.trim();
    void execute(
      () => saveActivityDraft(roomId, token, draft),
      "Rascunho salvo. Apenas o professor pode vê-lo até a abertura."
    );
  }

  function sendPoll(optionId: QuizOptionId) {
    if (!activity || isTeacher || activity.phase !== "open" || activity.myAnswer || busy) return;
    void execute(
      () => submitActivityAnswer(roomId, token, activity.id, { optionId }),
      "Voto registrado. Aguarde o professor encerrar a enquete."
    );
  }

  function sendText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activity || isTeacher || activity.phase !== "open" || activity.myResponse || busy) return;
    void execute(
      () => submitActivityAnswer(roomId, token, activity.id, { text: reply.trim() }),
      "Contribuição recebida. O professor decidirá se ela ficará visível para a turma."
    );
  }

  return (
    <aside className="quiz-panel activity-panel" aria-label={isTeacher ? "Atividades do professor" : "Atividade da aula"}>
      <div className="quiz-panel-title">
        <div>
          <span className="eyebrow">Atividades ao vivo</span>
          <h2>{activity ? LABELS[activity.type] : "Enquetes e discussões"}</h2>
        </div>
        <span className={"quiz-badge quiz-badge--" + (activity?.phase ?? "waiting")}>
          {activity?.phase === "draft" ? "Rascunho" :
            activity?.phase === "open" ? "Em andamento" :
              activity?.phase === "closed" ? "Encerrada" : "Aguardando"}
        </span>
      </div>

      {!isTeacher && !activity && (
        <div className="quiz-empty" role="status">
          <span className="quiz-empty-icon" aria-hidden="true">?</span>
          <h3>Aguardando a atividade</h3>
          <p>O professor pode abrir uma enquete, uma discussão ou um estudo de caso sem interromper a chamada.</p>
        </div>
      )}

      {activity && (
        <section className="activity-question" key={activity.id}>
          <p className="quiz-question-kicker">
            {activity.phase === "draft" ? "Prévia do professor" :
              activity.phase === "open" ? "Atividade aberta" : "Atividade encerrada"}
          </p>
          {activity.type === "case" && activity.context && (
            <div className="activity-case-context">
              <strong>Situação para discussão</strong>
              <p>{activity.context}</p>
            </div>
          )}
          <h3 className="activity-prompt">{activity.prompt}</h3>

          {activity.type === "poll" && (
            <>
              <p className="quiz-info">
                {isTeacher ? "Enquete sem resposta certa: acompanhe a participação da turma." :
                  activity.phase === "open" && !activity.myAnswer ? "Escolha uma alternativa para votar." :
                    activity.phase === "closed" && !activity.revealed ? "Aguarde a divulgação do resultado." : ""}
              </p>
              <div className="quiz-options" role="group" aria-label="Alternativas da enquete">
                {(activity.options || []).map(option => {
                  const selected = !isTeacher && activity.myAnswer === option.id;
                  const cls = "quiz-option" + (selected ? " quiz-option--selected" : "");
                  const inside = <>
                    <span className="quiz-option-letter">{option.id}</span>
                    <span className="quiz-option-text">{option.text}</span>
                    {selected && <span className="quiz-selected-label">Seu voto</span>}
                  </>;
                  return !isTeacher && activity.phase === "open" && !activity.myAnswer
                    ? <button type="button" key={option.id} className={cls + " quiz-answer-button"}
                        disabled={busy} onClick={() => sendPoll(option.id)}>
                        {inside}
                      </button>
                    : <div key={option.id} className={cls}>{inside}</div>;
                })}
              </div>
              {!isTeacher && activity.myAnswer && (
                <p className="quiz-answer-confirmation" role="status">
                  Você votou na alternativa <strong>{activity.myAnswer}</strong>.
                </p>
              )}
              {activity.results && (isTeacher || activity.revealed) && (
                <section className="quiz-results" aria-label="Resultado da enquete" aria-live="polite">
                  <h4>Resultado da enquete</h4>
                  <p><strong>{activity.results.total}</strong> {activity.results.total === 1 ? "voto" : "votos"}</p>
                  {(activity.options || []).map(option => {
                    const count = activity.results?.counts[option.id] ?? 0;
                    const total = activity.results?.total ?? 0;
                    const percentage = total ? Math.round(100 * count / total) : 0;
                    return (
                      <div className="quiz-result-row" key={option.id}>
                        <div className="quiz-result-label"><strong>{option.id} · {option.text}</strong><span>{count} · {percentage}%</span></div>
                        <div className="quiz-result-track">
                          <div className="quiz-result-fill" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}
            </>
          )}

          {activity.type !== "poll" && (
            <>
              {!isTeacher && activity.phase === "open" && !activity.myResponse && (
                <form className="activity-response-form" onSubmit={sendText}>
                  <label htmlFor="activity-student-response">Sua contribuição</label>
                  <textarea id="activity-student-response" rows={4} minLength={2} maxLength={600} required
                    value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Escreva uma ideia ou uma pergunta para a discussão…" disabled={busy} />
                  <p className="quiz-info">O professor verá sua contribuição e seu nome. Somente respostas aprovadas serão mostradas aos demais, sem o nome do autor. Não compartilhe informações pessoais ou clínicas.</p>
                  <button type="submit" className="button button-primary" disabled={busy || reply.trim().length < 2}>
                    {busy ? "Enviando…" : "Enviar contribuição"}
                  </button>
                </form>
              )}
              {!isTeacher && activity.myResponse && (
                <div className="activity-my-response">
                  <strong>Sua contribuição foi recebida</strong>
                  <p>{activity.myResponse.text}</p>
                  <span>{activity.myResponse.approved ? "Aprovada pelo professor" : "Aguardando moderação"}</span>
                </div>
              )}
              {isTeacher && (
                <section className="activity-moderation" aria-label="Moderação de contribuições">
                  <h4>Contribuições recebidas ({activity.responses?.length || 0})</h4>
                  {!activity.responses?.length && <p className="quiz-info">Nenhuma contribuição enviada até agora.</p>}
                  {activity.responses?.map(response => (
                    <article className="activity-response" key={response.id}>
                      <div className="activity-response-heading">
                        <strong>{response.name || "Participante"}</strong>
                        <span>{response.approved ? "Visível à turma (sem nome)" : "Privada"}</span>
                      </div>
                      <p>{response.text}</p>
                      <button className="button button-outline" type="button" disabled={busy}
                        onClick={() => void execute(
                          () => moderateActivityResponse(roomId, token, activity.id, response.id, !response.approved),
                          response.approved ? "Contribuição retirada da visualização dos alunos." : "Contribuição aprovada para a turma."
                        )}>
                        {response.approved ? "Ocultar da turma" : "Aprovar para a turma"}
                      </button>
                    </article>
                  ))}
                </section>
              )}
              {!isTeacher && Boolean(activity.approvedResponses?.length) && (
                <section className="activity-public-responses" aria-label="Contribuições aprovadas">
                  <h4>Contribuições selecionadas pelo professor</h4>
                  {activity.approvedResponses?.map(response => (
                    <p key={response.id}>{response.text}</p>
                  ))}
                </section>
              )}
              {!isTeacher && activity.phase === "closed" && !activity.myResponse && (
                <p className="quiz-info">Esta atividade foi encerrada. Aguarde a próxima.</p>
              )}
            </>
          )}
        </section>
      )}

      {isTeacher && activity?.phase === "draft" && (
        <div className="quiz-controls">
          <p className="quiz-info">O rascunho é privado. Ao abrir, a atividade aparecerá aos alunos ao lado do vídeo.</p>
          <button type="button" className="button button-primary" disabled={busy}
            onClick={() => void execute(() => openActivity(roomId, token), "Atividade aberta para a turma.")}>
            Abrir atividade
          </button>
        </div>
      )}
      {isTeacher && activity?.phase === "open" && (
        <div className="quiz-controls">
          <button type="button" className="button button-outline" disabled={busy}
            onClick={() => void execute(() => closeActivity(roomId, token), "Atividade encerrada.")}>
            Encerrar atividade
          </button>
        </div>
      )}
      {isTeacher && activity?.phase === "closed" && activity.type === "poll" && !activity.revealed && (
        <div className="quiz-controls">
          <p className="quiz-info">As porcentagens ainda não estão visíveis aos alunos.</p>
          <button type="button" className="button button-primary" disabled={busy}
            onClick={() => void execute(() => revealActivity(roomId, token), "Resultado divulgado para os alunos.")}>
            Mostrar resultado da enquete
          </button>
        </div>
      )}
      {isTeacher && activity?.phase === "closed" && activity.type === "poll" && activity.revealed && (
        <p className="quiz-answer-confirmation">O resultado já foi publicado para a turma.</p>
      )}

      {canEdit && (
        <form className="quiz-editor activity-editor" onSubmit={save}>
          {activity?.phase === "closed" && <div className="quiz-divider" />}
          <h3>{activity?.phase === "closed" ? "Criar próxima atividade" :
            activity?.phase === "draft" ? "Editar rascunho" : "Preparar uma atividade"}</h3>
          <label htmlFor="activity-type">Modalidade</label>
          <select id="activity-type" value={type} disabled={busy} onChange={e => setType(e.target.value as ActivityType)}>
            <option value="poll">Enquete — sem resposta certa</option>
            <option value="open_question">Pergunta aberta — com moderação</option>
            <option value="case">Estudo de caso — discussão orientada</option>
          </select>
          {type === "case" && (
            <>
              <label htmlFor="activity-context">Contexto do caso (20 a 1800 caracteres)</label>
              <textarea id="activity-context" rows={5} required minLength={20} maxLength={1800}
                disabled={busy} value={context} onChange={e => setContext(e.target.value)}
                placeholder="Descreva uma situação fictícia, sem dados reais de pacientes…" />
            </>
          )}
          <label htmlFor="activity-prompt">{type === "poll" ? "Pergunta da enquete" : "Pergunta para discussão"}</label>
          <textarea id="activity-prompt" rows={3} required minLength={10} maxLength={400}
            disabled={busy} value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder={type === "poll" ? "Que tema a turma prefere discutir?" : "Qual pergunta será apresentada à turma?"} />
          {type === "poll" && (
            <>
              <span className="quiz-alternatives-heading">Duas a quatro alternativas</span>
              {options.map((value, index) => (
                <div className="quiz-option-field" key={LETTERS[index]}>
                  <label htmlFor={`activity-option-${index}`}>{LETTERS[index]}</label>
                  <input id={`activity-option-${index}`} type="text" maxLength={160}
                    required={index < 2} disabled={busy} value={value}
                    placeholder={index < 2 ? "Alternativa obrigatória" : "Opcional"}
                    onChange={e => setOptions(current => current.map((v, i) => i === index ? e.target.value : v))} />
                </div>
              ))}
              <p className="quiz-info">Não existe gabarito nas enquetes. A turma vota na opção que preferir.</p>
            </>
          )}
          <button className="button button-primary quiz-save" type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Salvar rascunho"}
          </button>
        </form>
      )}
      {message && <p className="feedback" role="status">{message}</p>}
      {error && <p className="feedback feedback-error" role="alert">{error}</p>}
    </aside>
  );
}
