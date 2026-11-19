import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createRoomId, inviteUrl, isRoomId, readRoomId, vdoUrl } from "./room";

type DeviceStatus = "idle" | "testing" | "ready" | "error";

function describeMediaError(error: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "O teste de câmera exige HTTPS ou localhost. Publique a página com HTTPS para testar em outro aparelho.";
  }
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Acesso negado. Libere câmera e microfone nas permissões do navegador e tente novamente.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "Não encontramos câmera ou microfone. Conecte os dispositivos ou entre na chamada para ajustar as opções.";
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
  const [joined, setJoined] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("idle");
  const [deviceMessage, setDeviceMessage] = useState("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const room = roomInput.trim().toLowerCase();
  const hasValidRoom = isRoomId(room);
  const invitation = useMemo(
    () => (hasValidRoom ? inviteUrl(room, window.location.href) : ""),
    [hasValidRoom, room]
  );
  const mediaUrl = useMemo(
    () => (hasValidRoom && name.trim() ? vdoUrl(room, name) : ""),
    [hasValidRoom, room, name]
  );

  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = previewStream;
  }, [previewStream]);

  useEffect(() => {
    return () => {
      localStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopPreview() {
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setPreviewStream(null);
  }

  function makeRoom() {
    const id = createRoomId();
    stopPreview();
    setDeviceStatus("idle");
    setDeviceMessage("");
    setRoomInput(id);
    setCopyFeedback("");
    window.history.replaceState(null, "", inviteUrl(id, window.location.href));
  }

  async function copyInvitation() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation);
      setCopyFeedback("Link copiado. Compartilhe com os alunos.");
    } catch {
      setCopyFeedback("Selecione o link acima e copie manualmente.");
    }
  }

  async function testDevices() {
    stopPreview();
    setDeviceStatus("testing");
    setDeviceMessage("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia indisponível");
      }
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

  function enterRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasValidRoom || !name.trim()) return;
    stopPreview();
    setFrameLoaded(false);
    setJoined(true);
    window.history.replaceState(null, "", inviteUrl(room, window.location.href));
  }

  function leaveRoom() {
    setJoined(false);
    setFrameLoaded(false);
    // Desmontar o iframe interrompe a instância local da chamada.
  }

  const invalidInvite =
    new URLSearchParams(window.location.search).has("room") &&
    initialRoom === null &&
    !hasValidRoom;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="logo" href={window.location.pathname} aria-label="Página inicial do Aulas">
          <span className="logo-mark">a</span>
          <span>Aulas<span className="logo-dot">.</span></span>
        </a>
        <span className="prototype-label"><span className="status-dot" /> Protótipo audiovisual · Sprint 2</span>
      </header>

      <main className={joined ? "main-content main-content--call" : "main-content"}>
        {joined && mediaUrl ? (
          <section className="call-screen" aria-label="Sala de videoaula">
            <div className="call-heading">
              <div>
                <div className="eyebrow">Sua videoaula está aberta</div>
                <h1>Sala <span>{room.slice(0, 12)}…</span></h1>
                <p>A câmera e o microfone são controlados dentro do VDO.Ninja.</p>
              </div>
              <button className="button button-outline" type="button" onClick={leaveRoom}>
                Sair da chamada
              </button>
            </div>

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

            <div className="call-footer">
              <div className="call-note">
                <strong>Importante:</strong> carregar a janela não confirma que a chamada está conectada.
                Confirme a entrada no VDO.Ninja dentro do quadro.
              </div>
              <div className="call-actions">
                <button className="button button-primary" type="button" onClick={copyInvitation}>
                  Copiar convite
                </button>
                <a className="text-link" href={mediaUrl} target="_blank" rel="noopener noreferrer">
                  Abrir vídeo em outra aba
                </a>
              </div>
            </div>
            {copyFeedback && <p className="feedback" role="status">{copyFeedback}</p>}
          </section>
        ) : (
          <>
            <section className="hero">
              <div className="eyebrow">Aulas mais próximas, mesmo à distância</div>
              <h1>Sua sala de aula.<br /><em>Ao vivo, de verdade.</em></h1>
              <p>
                Reúna professor e alunos com câmera e microfone, diretamente no navegador.
                Estamos construindo a base para quizzes e atividades em tempo real.
              </p>
              <div className="hero-features" aria-label="Características do protótipo">
                <span>Sem cadastro</span>
                <span>Vídeo em grupo</span>
                <span>Convite por link</span>
              </div>
            </section>

            <section className="setup-panel" aria-label="Preparar videoaula">
              <div className="panel-heading">
                <span className="step-number">01</span>
                <div>
                  <h2>Prepare sua sala</h2>
                  <p>Crie uma sala ou abra o link que o professor enviou.</p>
                </div>
              </div>

              <button type="button" className="button button-outline create-button" onClick={makeRoom}>
                + Criar uma nova sala
              </button>

              <form onSubmit={enterRoom}>
                <label htmlFor="room">Código da sala</label>
                <input
                  id="room"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Clique em criar sala ou use um convite"
                  value={roomInput}
                  onChange={(event) => { setRoomInput(event.target.value); setCopyFeedback(""); }}
                  aria-describedby="room-hint"
                />
                <p className="field-hint" id="room-hint">
                  {invalidInvite ? "Este convite não tem um código de sala válido." :
                    hasValidRoom ? "Sala pronta. Quem tiver o link pode participar: ainda não há acesso restrito." :
                      "Os códigos criados pelo Aulas começam com aulas-."}
                </p>
                {hasValidRoom && (
                  <div className="invite-box">
                    <div className="invite-title">Convite para a turma</div>
                    <input type="text" aria-label="Link de convite" readOnly value={invitation} onFocus={(event) => event.target.select()} />
                    <button className="button button-subtle" type="button" onClick={copyInvitation}>Copiar link</button>
                    {copyFeedback && <p className="feedback" role="status">{copyFeedback}</p>}
                  </div>
                )}

                <div className="divider" />

                <div className="panel-heading panel-heading-small">
                  <span className="step-number">02</span>
                  <div>
                    <h2>Entre na chamada</h2>
                    <p>Seu nome aparecerá para os outros participantes.</p>
                  </div>
                </div>
                <label htmlFor="display-name">Seu nome</label>
                <input
                  id="display-name"
                  type="text"
                  autoComplete="name"
                  maxLength={40}
                  placeholder="Como você quer aparecer na aula?"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />

                <div className="device-test">
                  <div className="device-text">
                    <strong>Teste de câmera e microfone</strong>
                    <span>Opcional. O acesso será encerrado antes de entrar na chamada.</span>
                  </div>
                  <button
                    className="button button-subtle"
                    type="button"
                    disabled={deviceStatus === "testing"}
                    onClick={testDevices}
                  >
                    {deviceStatus === "testing" ? "Testando…" : "Testar dispositivos"}
                  </button>
                </div>
                {previewStream && (
                  <div className="preview-box">
                    <video ref={previewRef} autoPlay muted playsInline aria-label="Prévia local da sua câmera" />
                    <span>Prévia local · sem transmissão</span>
                  </div>
                )}
                {deviceMessage && (
                  <p className={deviceStatus === "error" ? "feedback feedback-error" : "feedback"} role="status">
                    {deviceMessage}
                  </p>
                )}
                <button className="button button-primary join-button" type="submit" disabled={!hasValidRoom || !name.trim()}>
                  Entrar na videoaula <span aria-hidden="true">→</span>
                </button>
              </form>
            </section>
            <p className="privacy-note">
              Versão de teste: sem contas, moderação, quizzes ou gravação automática pelo Aulas.
              O vídeo utiliza o serviço externo VDO.Ninja. Não use esta versão para aulas com dados sensíveis.
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
