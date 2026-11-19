import test from "node:test";
import assert from "node:assert/strict";
import { createRoomId, inviteUrl, isRoomId, readRoomId, vdoUrl } from "../src/room.ts";

test("gera código aleatório de sala com 30 caracteres", () => {
  const fakeCrypto = {
    getRandomValues(array) {
      array.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      return array;
    }
  };
  const id = createRoomId(fakeCrypto);
  assert.equal(id, "aulas-000102030405060708090a0b");
  assert.equal(id.length, 30);
  assert.equal(isRoomId(id), true);
});

test("rejeita código inválido na URL de convite", () => {
  assert.equal(readRoomId("?room=aulas-123"), null);
  assert.equal(readRoomId("?room=https://example.com"), null);
  assert.equal(readRoomId("?room=aulas-000102030405060708090a0b"), "aulas-000102030405060708090a0b");
  assert.throws(() => inviteUrl("sala-invalida", "https://example.org"));
});

test("o convite preserva o subdiretório e remove parâmetros estranhos", () => {
  const id = "aulas-000102030405060708090a0b";
  assert.equal(
    inviteUrl(id, "https://example.org/aulas/?x=123#parte"),
    "https://example.org/aulas/?room=aulas-000102030405060708090a0b"
  );
});

test("VDO.Ninja recebe sala e nome sem permitir injeção de parâmetros", () => {
  const id = "aulas-000102030405060708090a0b";
  const link = new URL(vdoUrl(id, "João &room=outra"));
  assert.equal(link.origin, "https://vdo.ninja");
  assert.equal(link.searchParams.get("room"), id);
  assert.equal(link.searchParams.get("label"), "João &room=outra");
  assert.equal(link.searchParams.has("showlabels"), true);
  assert.equal(link.searchParams.getAll("room").length, 1);
});
