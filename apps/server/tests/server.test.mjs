import test from "node:test";
import assert from "node:assert/strict";
import { createAulasServer } from "../src/server.mjs";

async function start() {
  const server = createAulasServer({ allowedOrigins: ["http://localhost:5173"] });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
async function request(base, method, path, body, token, origin = "http://localhost:5173") {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { code: response.status, data: await response.json().catch(() => null) };
}

test("permissões, revogação e fechamento de sala sem login", async t => {
  const { server, base } = await start();
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

  const created = await request(base, "POST", "/api/rooms", { name: "Professora" });
  assert.equal(created.code, 201);
  const { roomId, teacherSecret } = created.data;
  assert.match(roomId, /^aulas-[0-9a-f]{24}$/);
  assert.match(teacherSecret, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(created.data.room.teacher, "Professora");

  const unauthenticated = await request(base, "GET", `/api/rooms/${roomId}/state`);
  assert.equal(unauthenticated.code, 403);
  const forgedStudent = await request(base, "POST", `/api/rooms/${roomId}/close`, {}, "token-falso");
  assert.equal(forgedStudent.code, 403);

  const student = await request(base, "POST", `/api/rooms/${roomId}/join`, { name: "Aluna" });
  assert.equal(student.code, 201);
  assert.match(student.data.participantToken, /^[A-Za-z0-9_-]{43}$/);
  const studentView = await request(base, "GET", `/api/rooms/${roomId}/state`, undefined, student.data.participantToken);
  assert.equal(studentView.code, 200);
  assert.equal(studentView.data.role, "student");
  assert.equal(studentView.data.room.participants.length, 1);

  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/rotate`, {}, student.data.participantToken)).code, 403);
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/close`, {}, student.data.participantToken)).code, 403);
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/teacher`, { secret: "sem-permissao" })).code, 403);

  const teacher = await request(base, "POST", `/api/rooms/${roomId}/teacher`, { secret: teacherSecret });
  assert.equal(teacher.code, 200);
  assert.equal(teacher.data.role, "teacher");

  const rotated = await request(base, "POST", `/api/rooms/${roomId}/rotate`, {}, teacherSecret);
  assert.equal(rotated.code, 200);
  assert.notEqual(rotated.data.teacherSecret, teacherSecret);
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/close`, {}, teacherSecret)).code, 403);
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/teacher`, { secret: teacherSecret })).code, 403);

  const closed = await request(base, "POST", `/api/rooms/${roomId}/close`, {}, rotated.data.teacherSecret);
  assert.equal(closed.code, 200);
  assert.equal(closed.data.room.status, "closed");
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/join`, { name: "Outra" })).code, 410);
});

test("salas são independentes, origem indevida é rejeitada e entrada valida nome", async t => {
  const { server, base } = await start();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const a = await request(base, "POST", "/api/rooms", { name: "Professor A" });
  const b = await request(base, "POST", "/api/rooms", { name: "Professor B" });
  assert.equal(a.code, 201); assert.equal(b.code, 201);
  assert.notEqual(a.data.roomId, b.data.roomId);

  const illegal = await request(base, "POST", "/api/rooms", { name: "Evil" }, undefined, "https://fora.example");
  assert.equal(illegal.code, 403);

  const invalidName = await request(base, "POST", `/api/rooms/${a.data.roomId}/join`, { name: "<script>" });
  assert.equal(invalidName.code, 400);

  assert.equal((await request(base, "POST", `/api/rooms/${b.data.roomId}/close`, {}, a.data.teacherSecret)).code, 403);
  assert.equal((await request(base, "GET", "/api/health")).data.persistent, false);
});

test("uma sala expirada deixa de aceitar ingresso e segredos", async t => {
  let timestamp = Date.now();
  const server = createAulasServer({ allowedOrigins: ["http://localhost:5173"], now: () => timestamp });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const created = await request(base, "POST", "/api/rooms", { name: "Prof" });
  timestamp += 12 * 60 * 60 * 1000 + 1;
  const state = await request(base, "GET", `/api/rooms/${created.data.roomId}/state`, undefined, created.data.teacherSecret);
  assert.equal(state.code, 404);
});
