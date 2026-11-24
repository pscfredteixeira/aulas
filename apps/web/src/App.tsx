import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  API_BASE_URL, ApiRequestError, authorizeTeacher, closeProtectedRoom, createProtectedRoom,
  fetchRoomState, joinProtectedRoom, leaveProtectedRoom, rotateTeacherSecret
} from "./api";
import type { RoomSnapshot } from "./api";
import QuizPanel from "./QuizPanel";
import ActivityPanel from "./ActivityPanel";
import { createRoomId, inviteUrl, isRoomId, readRoomId, readTeacherSecret, teacherUrl, vdoUrl } from "./room";

type DeviceStatus = "idle" | "testing" | "ready" | "error";
type Role = "teacher" | "student" | "demo" | null;

function describeMediaError(error: unknown): string {
  if (!window.isSecureContext) {
    return "A câmera exige HTTPS ou localhost. Abra o Aulas pelo endereço seguro.";
  }
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Acesso negado. Libere câmera e microfone nas permissões do navegador e tente novamente.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "Não encontramos câmera ou microfone. Conecte os dispositivos ou ajuste as opções dentro do VDO.Ninja.";
    }
    if (error.name === "NotReadableError") {
      return "Um dispositivo está ocupado por outro programa. Feche esse programa e tente novamente.";
    }
  }
  return "Não foi possível testar os dispositivos. Você ainda pode abrir a chamada e ajustar as opções no VDO.Ninja.";
}

export default function App() {
  const initialRoom = readRoomId(window.location.search);
  const [roomInput, setRoomInput] = useState(initialRoom ?? "");
  const [name, setName] = useState("");
  const [teacherSecret, setTeacherSecret] = useState(readTeacherSecret(window.location.hash) ?? "");
  const [authToken, setAuthToken] = useState("");
  const [role, setRole] = useState<Role>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [joined, setJoined] = useState(false);
  const [panelTab, setPanelTab] = useState<"quiz" | "activity">("quiz");
  const [videoOnlyAvailable, setVideoOnlyAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("idle");
  const [deviceMessage, setDeviceMessage] = useState("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const room = roomInput.trim().toLowerCase();
  const hasValidRoom = isRoomId(room);
  const isStudentInvite = Boolean(initialRoom && room === initialRoom && !teacherSecret);
  const hasServer = Boolean(API_BASE_URL);
  // O professor precisa do painel para preparar questões. Para alunos, ele só
  // ocupa espaço quando há uma atividade publicada (inclusive resultados).
  const studentHasActivity = snapshot?.focus === "activity"
    ? Boolean(snapshot.activity)
    : Boolean(snapshot?.quiz);
  const showLessonSidebar = hasServer &&
    (role === "teacher" || (role === "student" && studentHasActivity));
  const invitation = useMemo(
    () => (hasValidRoom ? inviteUrl(room, window.location.href) : ""),
    [hasValidRoom, room]
  );
  const privateLink = useMemo(
    () => (hasServer && teacherSecret && hasValidRoom ? teacherUrl(room, teacherSecret, window.location.href) : ""),
    [hasServer, teacherSecret, hasValidRoom, room]
  );
  const mediaUrl = useMemo(
    () => (hasValidRoom && name.trim() ? vdoUrl(room, name) : ""),
    [hasValidRoom, room, name]
  );

  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = previewStream;
  }, [previewStream]);

  useEffect(() => () => {
    localStream.current?.getTracks().forEach(track => track.stop());
  }, []);

  // O servidor é autoritativo: o fechamento da sala no Aulas desmonta o iframe neste navegador.
  useEffect(() => {
    if (!joined || !hasServer || !authToken || !hasValidRoom) return;
    let active = true;
    async function sync() {
      try {
        const result = await fetchRoomState(room, authToken);
        if (!active) return;
        setSnapshot(result.room);
        if (result.room.status === "closed") {
          setJoined(false);
          setErrorMessage("O professor encerrou esta aula no Aulas. Feche qualquer aba externa do VDO.Ninja.");
        }
      } catch (error) {
        if (!active) return;
        // Falha breve da API não deve derrubar o vídeo em andamento.
        setErrorMessage(error instanceof Error
          ? `Não foi possível sincronizar a atividade: ${error.message}. Tentaremos novamente.`
          : "A sincronização falhou temporariamente. Tentaremos novamente.");
      }
    }
    void sync();
    // Sprint 5 (MVP): contagem com atualização aproximada a cada 3 s;
    // notificações instantâneas por WebSocket ainda são evolução futura.
    const timer = window.setInterval(() => { void sync(); }, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [joined, hasServer, authToken, hasValidRoom, room]);

  function stopPreview() {
    localStream.current?.getTracks().forEach(track => track.stop());
    localStream.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setPreviewStream(null);
  }

  async function makeRoom() {
    if (busy) return;
    setErrorMessage("");
    setFeedback("");
    setVideoOnlyAvailable(false);
    stopPreview();
    if (!hasServer) {
      const id = createRoomId();
      setRoomInput(id);
      setTeacherSecret("");
      setRole(null);
      setAuthToken("");
      setSnapshot(null);
      window.history.replaceState(null, "", inviteUrl(id, window.location.href));
      return;
    }
    setBusy(true);
    try {
      const result = await createProtectedRoom(name.trim() || "Professor(a)");
      setRoomInput(result.roomId);
      setTeacherSecret(result.teacherSecret);
      setAuthToken(result.teacherSecret);
      setRole("teacher");
      setSnapshot(result.room);
      window.history.replaceState(null, "", teacherUrl(result.roomId, result.teacherSecret, window.location.href));
      setFeedback("Sala criada. Guarde seu link de professor e compartilhe apenas o convite de aluno.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível criar a sala.");
    } finally { setBusy(false); }
  }

  async function copyText(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(success);
    } catch {
      setFeedback("Seu navegador bloqueou a cópia automática. Selecione o campo e copie manualmente.");
    }
  }

  async function testDevices() {
    stopPreview();
    setDeviceStatus("testing");
    setDeviceMessage("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia indisponível");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      setPreviewStream(stream);
      setDeviceStatus("ready");
      setDeviceMessage("Câmera e microfone acessíveis. O VDO.Ninja poderá pedir autorização novamente ao entrar.");
    } catch (error) {
      setDeviceStatus("error");
      setDeviceMessage(describeMediaError(error));
    }
  }

  async function enterRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasValidRoom || !name.trim() || busy) return;
    stopPreview();
    setBusy(true);
    setErrorMessage("");
    setVideoOnlyAvailable(false);
    try {
      if (hasServer) {
        if (teacherSecret) {
          const data = await authorizeTeacher(room, teacherSecret);
          if (data.room.status !== "open") throw Error("A sala foi encerrada.");
          setAuthToken(teacherSecret);
          setRole("teacher");
          setSnapshot(data.room);
        } else {
          // Recarregar a página não deve criar uma segunda participação (nem permitir
          // votar duas vezes com o mesmo navegador). O token fica só nesta aba.
          const storageKey = `aulas:participante:${room}`;
          let reused = false;
          try {
            const saved = JSON.parse(window.sessionStorage.getItem(storageKey) || "null") as {
              token?: string; name?: string
            } | null;
            if (saved?.token && saved.name === name.trim()) {
              try {
                const restored = await fetchRoomState(room, saved.token);
                if (restored.role === "student" && restored.room.status === "open") {
                  setAuthToken(saved.token);
                  setRole("student");
                  setSnapshot(restored.room);
                  reused = true;
                }
              } catch (error) {
                // Revogado ou expirado: entrar novamente. Falhas de rede não devem
                // criar um segundo aluno durante uma tentativa de reconexão.
                if (!(error instanceof ApiRequestError) || ![403, 404].includes(error.status ?? 0)) throw error;
                window.sessionStorage.removeItem(storageKey);
              }
            }
          } catch (error) {
            if (error instanceof ApiRequestError) throw error;
            // Bloqueio do sessionStorage: a entrada pelo navegador ainda funciona.
          }
          if (!reused) {
            const data = await joinProtectedRoom(room, name.trim());
            setAuthToken(data.participantToken);
            setRole("student");
            setSnapshot(data.room);
            try {
              window.sessionStorage.setItem(storageKey, JSON.stringify({
                name: name.trim(), token: data.participantToken
              }));
            } catch { /* Armazenamento local opcional. */ }
          }
        }
      } else {
        setRole("demo");
      }
      setFrameLoaded(false);
      setVideoOnlyAvailable(false);
      setJoined(true);
      window.history.replaceState(null, "", teacherSecret && hasServer
        ? teacherUrl(room, teacherSecret, window.location.href)
        : inviteUrl(room, window.location.href));
    } catch (error) {
      const canUseVideo = !teacherSecret && error instanceof ApiRequestError &&
        (error.status === undefined || error.status === 404 || [502, 503, 504].includes(error.status));
      setVideoOnlyAvailable(canUseVideo);
      if (canUseVideo && error instanceof ApiRequestError && error.status === 404) {
        setErrorMessage("Este convite não foi encontrado no servidor. A sala pode ter sido apagada após uma atualização ou reinício do Render. Peça ao professor para criar uma nova sala para usar os quizzes. Se ele ainda estiver na videochamada, você pode entrar apenas com áudio e vídeo abaixo.");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
      }
    } finally { setBusy(false); }
  }

  function enterVideoOnly() {
    if (!videoOnlyAvailable || !hasValidRoom || teacherSecret || !name.trim()) return;
    stopPreview();
    setAuthToken("");
    setSnapshot(null);
    setRole("demo");
    setVideoOnlyAvailable(false);
    setFrameLoaded(false);
    setJoined(true);
    setErrorMessage("");
    window.history.replaceState(null, "", inviteUrl(room, window.location.href));
  }

  function leaveRoom() {
    if (hasServer && role === "student" && authToken) {
      try { window.sessionStorage.removeItem(`aulas:participante:${room}`); }
      catch { /* Armazenamento local opcional. */ }
      void leaveProtectedRoom(room, authToken).catch(() => { /* O prazo de presença expira sozinho. */ });
      setAuthToken("");
      setRole(null);
    }
    setJoined(false);
    setFrameLoaded(false);
  }

  async function rotateLink() {
    if (!hasServer || role !== "teacher" || !authToken || busy) return;
    setBusy(true); setErrorMessage("");
    try {
      const { teacherSecret: nextSecret } = await rotateTeacherSecret(room, authToken);
      setTeacherSecret(nextSecret);
      setAuthToken(nextSecret);
      window.history.replaceState(null, "", teacherUrl(room, nextSecret, window.location.href));
      setFeedback("Link do professor renovado. O anterior não funciona mais.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao renovar o link.");
    } finally { setBusy(false); }
  }

  async function endRoom() {
    if (!hasServer || role !== "teacher" || !authToken || busy) return;
    if (!window.confirm("Encerrar esta sala para todos os participantes no Aulas? O VDO.Ninja aberto fora do site não será desconectado automaticamente.")) return;
    setBusy(true); setErrorMessage("");
    try {
      const { room: next } = await closeProtectedRoom(room, authToken);
      setSnapshot(next);
      setJoined(false);
      setFeedback("Sala encerrada no Aulas. O acesso à sala externa do VDO.Ninja não pode ser bloqueado aqui.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao encerrar a sala.");
    } finally { setBusy(false); }
  }

  const invalidInvite = new URLSearchParams(window.location.search).has("room") &&
    initialRoom === null && !hasValidRoom;

  return (
    <div className="app-shell">
      <header className={joined ? "topbar topbar--in-call" : "topbar"}>
        <a className="logo" href={window.location.pathname} aria-label="Página inicial do Aulas">
          <span className="logo-mark">a</span>
          <span>Aulas<span className="logo-dot">.</span></span>
        </a>
        <span className="prototype-label">
          <span className="status-dot" /> {hasServer ? "Aulas interativas · Sprint 6" : "Sala de teste · Sprint 6"}
        </span>
      </header>

      <main className={joined
        ? "main-content main-content--call" + (!showLessonSidebar ? " main-content--video-first" : "")
        : isStudentInvite ? "main-content main-content--student" : "main-content"}>
        {joined && mediaUrl ? (
          <section className="call-screen" aria-label="Sala de videoaula">
            <div className="call-heading">
              <div>
                <div className="eyebrow">{role === "teacher" ? "Você é o professor" : "Sua videoaula está aberta"}</div>
                <h1>Sala <span>{room.slice(0, 12)}…</span></h1>
                <p>Converse normalmente com todos os participantes pelo VDO.Ninja.</p>
              </div>
              <button className="button button-outline" type="button" onClick={leaveRoom}>Sair da chamada</button>
            </div>

            {hasServer && snapshot && (
              <div className="room-status" aria-live="polite">
                <span><strong>{snapshot.participants.length}</strong> aluno(s) com presença recente no Aulas</span>
                <span>{snapshot.participants.map(p => p.name).join(", ") || "Nenhum aluno registrado ainda."}</span>
              </div>
            )}

            <div className={"lesson-workspace" + (!showLessonSidebar ? " lesson-workspace--video-only" : "")}>
              <div className="lesson-video">
                <div className="call-frame-wrap">
                  {!frameLoaded && <div className="loading-overlay" role="status">Carregando interface de vídeo…</div>}
                  <iframe
                    title="Videochamada em grupo VDO.Ninja"
                    src={mediaUrl}
                    allow="camera; microphone; autoplay; display-capture; fullscreen; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    onLoad={() => setFrameLoaded(true)}
                  />
                </div>
              </div>
              {showLessonSidebar && (role === "teacher" || role === "student") && (
                <div className="lesson-sidebar">
                  {role === "teacher" && (
                    <div className="lesson-activity-tabs" role="group" aria-label="Escolher tipo de atividade">
                      <button type="button" className={panelTab === "quiz" ? "active" : ""}
                        aria-pressed={panelTab === "quiz"} onClick={() => setPanelTab("quiz")}>
                        Quiz
                      </button>
                      <button type="button" className={panelTab === "activity" ? "active" : ""}
                        aria-pressed={panelTab === "activity"} onClick={() => setPanelTab("activity")}>
                        Enquetes e discussões
                      </button>
                    </div>
                  )}
                  {(role === "teacher" ? panelTab : snapshot?.focus ?? "quiz") === "quiz" ? (
                    <QuizPanel
                      roomId={room}
                      token={authToken}
                      role={role}
                      quiz={snapshot?.quiz ?? null}
                      onUpdated={quiz => setSnapshot(previous => previous ? {
                        ...previous, quiz, focus: quiz.phase === "open" ? "quiz" : previous.focus
                      } : previous)}
                    />
                  ) : (
                    <ActivityPanel
                      roomId={room}
                      token={authToken}
                      role={role}
                      activity={snapshot?.activity ?? null}
                      onUpdated={activity => setSnapshot(previous => previous ? {
                        ...previous, activity, focus: activity.phase === "open" ? "activity" : previous.focus
                      } : previous)}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="call-footer">
              <div className="call-note">
                <strong>Nota:</strong> os controles da chamada são do VDO.Ninja. Sair ou encerrar
                a sala no Aulas não interrompe uma chamada aberta em outra aba.
              </div>
              <div className="call-actions">
                <button className="button button-primary" type="button" onClick={() => void copyText(invitation, "Convite de aluno copiado.")}>
                  Copiar convite de aluno
                </button>
                <a className="text-link" href={mediaUrl} target="_blank" rel="noopener noreferrer">
                  Abrir vídeo em outra aba
                </a>
              </div>
            </div>
            {hasServer && role === "demo" && (
              <p className="deployment-note" role="status">
                Você entrou somente no vídeo. Nesta modalidade temporária, perguntas e controles de sala
                não ficam sincronizados. Para uma nova aula com quiz, peça um convite atualizado ao professor.
              </p>
            )}
            {hasServer && role === "teacher" && (
              <section className="teacher-panel" aria-label="Controles do professor">
                <h2>Painel do professor</h2>
                <p>Guarde seu link privado. Ele permite administrar a sala sem criar uma conta.</p>
                <div className="teacher-actions">
                  <button className="button button-subtle" type="button" onClick={() => void copyText(privateLink, "Link privado do professor copiado.")}>
                    Copiar meu link de professor
                  </button>
                  <button className="button button-outline" type="button" disabled={busy} onClick={() => void rotateLink()}>Renovar link</button>
                  <button className="button button-danger" type="button" disabled={busy} onClick={() => void endRoom()}>Encerrar sala</button>
                </div>
                <p className="field-hint">Não compartilhe seu link de professor. Apenas o convite de aluno deve ser enviado à turma.</p>
              </section>
            )}
            {feedback && <p className="feedback" role="status">{feedback}</p>}
            {errorMessage && <p className="feedback feedback-error" role="alert">{errorMessage}</p>}
          </section>
        ) : (
          <>
            {!isStudentInvite && <section className="hero">
              <div className="eyebrow">Aulas mais próximas, mesmo à distância</div>
              <h1>Sua sala de aula.<br /><em>Ao vivo, de verdade.</em></h1>
              <p>Professor e alunos juntos com câmera e microfone, sem instalar nada.
                Crie uma pergunta e apresente-a à turma durante a videochamada.</p>
              <div className="hero-features" aria-label="Características">
                <span>Sem cadastro</span><span>Vídeo em grupo</span><span>Convite por link</span>
              </div>
              {!hasServer && (
                <p className="deployment-note"><strong>Modo audiovisual de teste.</strong> A sala de vídeo continua disponível,
                  mas a proteção do link do professor só será ativada quando o serviço de salas estiver hospedado.
                </p>
              )}
            </section>}

            <section className="setup-panel" aria-label={isStudentInvite ? "Entrar na aula recebida" : "Preparar videoaula"}>
              <div className="panel-heading">
                <span className="step-number">{isStudentInvite ? "✓" : "01"}</span>
                <div>
                  <h2>{isStudentInvite ? "Você foi convidado para uma aula" : "Prepare sua sala"}</h2>
                  <p>{isStudentInvite
                    ? "Para participar, informe seu nome. Não precisa criar sala nem fazer cadastro."
                    : "Crie uma aula ou entre pelo link de convite."}</p>
                </div>
              </div>

              {!isStudentInvite && (
                <button type="button" className="button button-outline create-button" onClick={() => void makeRoom()} disabled={busy}>
                  {busy ? "Preparando…" : "+ Criar uma nova sala"}
                </button>
              )}

              <form onSubmit={event => void enterRoom(event)}>
                {!isStudentInvite && (<>
                <label htmlFor="room">Código da sala</label>
                <input
                  id="room" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false}
                  placeholder="Crie uma sala ou use o convite recebido"
                  value={roomInput} onChange={e => {
                    setRoomInput(e.target.value);
                    setTeacherSecret(""); setAuthToken(""); setRole(null);
                    setFeedback(""); setErrorMessage(""); setVideoOnlyAvailable(false);
                    // O segredo anterior não deve ser reaproveitado ao trocar de sala.
                    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
                  }}
                  aria-describedby="room-hint"
                />
                <p className="field-hint" id="room-hint">
                  {invalidInvite ? "Este convite não tem um código de sala válido." :
                    hasValidRoom ? (hasServer ? "Sala identificada. O servidor validará o ingresso." : "Esta é uma sala audiovisual de teste, ainda sem controles exclusivos.") :
                      "Os códigos do Aulas começam com aulas-."}
                </p>
                {hasValidRoom && (
                  <div className="invite-box">
                    <div className="invite-title">Convite para os alunos</div>
                    <input type="text" aria-label="Link de convite de aluno" readOnly value={invitation}
                      onFocus={e => e.target.select()} />
                    <button className="button button-subtle" type="button"
                      onClick={() => void copyText(invitation, "Convite de aluno copiado.")}>Copiar convite</button>
                  </div>
                )}
                {privateLink && (
                  <div className="invite-box private-invite">
                    <div className="invite-title">Acesso exclusivo do professor</div>
                    <input type="text" aria-label="Link privado de professor" readOnly value={privateLink}
                      onFocus={e => e.target.select()} />
                    <button className="button button-subtle" type="button"
                      onClick={() => void copyText(privateLink, "Link privado do professor copiado.")}>Copiar meu link privado</button>
                    <p className="field-hint">Não envie este link aos alunos. O professor deve guardá-lo para reabrir a sala.</p>
                  </div>
                )}

                <div className="divider" />
                <div className="panel-heading panel-heading-small">
                  <span className="step-number">02</span>
                  <div><h2>Entre na chamada</h2><p>Seu nome ficará visível para os participantes.</p></div>
                </div>
                </>)}
                <label htmlFor="display-name">{isStudentInvite ? "Como você quer aparecer na aula?" : "Seu nome"}</label>
                <input
                  id="display-name" type="text" autoComplete="name" maxLength={40}
                  placeholder={isStudentInvite ? "Digite seu nome" : "Como deseja aparecer na aula?"}
                  value={name} onChange={e => setName(e.target.value)}
                />

                <div className="device-test">
                  <div className="device-text">
                    <strong>Teste de câmera e microfone</strong>
                    <span>Opcional. A prévia local será encerrada ao entrar.</span>
                  </div>
                  <button className="button button-subtle" type="button" disabled={deviceStatus === "testing"}
                    onClick={() => void testDevices()}>
                    {deviceStatus === "testing" ? "Testando…" : "Testar dispositivos"}
                  </button>
                </div>
                {previewStream && (
                  <div className="preview-box">
                    <video ref={previewRef} autoPlay muted playsInline aria-label="Prévia local da sua câmera" />
                    <span>Prévia local · sem transmissão</span>
                  </div>
                )}
                {deviceMessage && <p className={deviceStatus === "error" ? "feedback feedback-error" : "feedback"}
                  role="status">{deviceMessage}</p>}
                {feedback && <p className="feedback" role="status">{feedback}</p>}
                {errorMessage && <p className="feedback feedback-error" role="alert">{errorMessage}</p>}
                {videoOnlyAvailable && !teacherSecret && (
                  <div className="video-only-box">
                    <strong>Precisa entrar na chamada mesmo assim?</strong>
                    <p>É possível abrir a sala VDO.Ninja sem passar pelo servidor do Aulas.
                      Essa opção não habilita quizzes nem controle de acesso.</p>
                    <button type="button" className="button button-outline" onClick={enterVideoOnly}>
                      Abrir somente áudio e vídeo
                    </button>
                    {mediaUrl && (
                      <a className="video-direct-link" href={mediaUrl} target="_blank" rel="noopener noreferrer">
                        Ou abrir a videochamada diretamente no VDO.Ninja
                      </a>
                    )}
                  </div>
                )}
                <button className="button button-primary join-button" type="submit"
                  disabled={!hasValidRoom || !name.trim() || busy}>
                  {busy ? "Conectando à sala… o servidor pode demorar um pouco" : teacherSecret && hasServer ? "Entrar como professor →" : "Entrar na videoaula →"}
                </button>
              </form>
            </section>
            <p className="privacy-note">
              Versão em desenvolvimento, sem gravação pelo Aulas. O vídeo utiliza VDO.Ninja, serviço externo.
              Os links não protegem o acesso direto ao vídeo. Não use para conteúdos sigilosos.
            </p>
          </>
        )}
      </main>

      <footer className="site-footer">
        <span>Aulas · Projeto em desenvolvimento</span>
        <span>Áudio e vídeo por VDO.Ninja</span>
      </footer>
    </div>
  );
}
