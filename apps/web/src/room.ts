/** Identificadores de sala limitados a 30 caracteres, compatíveis com VDO.Ninja. */
export const ROOM_PATTERN = /^aulas-[0-9a-f]{24}$/;

/** A fonte aleatória é injetável para testes; em produção usa crypto seguro do navegador. */
export function createRoomId(random: Pick<Crypto, "getRandomValues"> = globalThis.crypto): string {
  if (!random || typeof random.getRandomValues !== "function") {
    throw new Error("Seu navegador não oferece geração segura de códigos de sala.");
  }
  const bytes = random.getRandomValues(new Uint8Array(12));
  return "aulas-" + [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isRoomId(value: string): boolean {
  return ROOM_PATTERN.test(value);
}

export function readRoomId(query: string): string | null {
  const room = new URLSearchParams(query).get("room");
  return room && isRoomId(room) ? room : null;
}

export function inviteUrl(room: string, baseUrl: string): string {
  if (!isRoomId(room)) throw new Error("Código de sala inválido.");
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", room);
  return url.toString();
}

export function vdoUrl(room: string, name: string): string {
  if (!isRoomId(room)) throw new Error("Código de sala inválido.");
  const url = new URL("https://vdo.ninja/");
  url.searchParams.set("room", room);
  url.searchParams.set("label", name.trim().slice(0, 40));
  url.searchParams.set("showlabels", "");
  return url.toString();
}
