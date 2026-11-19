# Aulas — Serviço de salas (Sprint 3)

Este é o backend que **valida quem é professor e quem é aluno**. Ele não transmite vídeo: o VDO.Ninja continua responsável por áudio e imagem. O código não requer bibliotecas externas e usa APIs nativas do Node.js 22+.

## Onde ele roda?

O serviço roda em **servidor remoto**, nunca na máquina do professor ou do aluno. Em produção, hospedar em provedor que ofereça Node.js persistente, HTTPS e variável de ambiente `AULAS_ALLOWED_ORIGINS=https://pscfredteixeira.github.io`. O GitHub Pages **não** executa esse backend.

A interface utiliza a variável de build `VITE_AULAS_API_URL`. O workflow do GitHub Pages lê a variável de repositório `AULAS_API_URL` automaticamente. Não configurar esse valor até a API estar disponível em HTTPS; enquanto isso, o site continua em **modo audiovisual experimental**, sem links administrativos.

## Para desenvolvedores (opcional)

```bash
cd apps/server
npm run test
npm start
```

Por padrão, porta 8787; `AULAS_ALLOWED_ORIGINS` é uma lista separada por vírgulas de origens exatas permitidas. Frontend local pode usar `VITE_AULAS_API_URL=http://localhost:8787`.

## Contrato HTTP do Sprint 3

- `GET /api/health`: status técnico, sem informações das salas.
- `POST /api/rooms` com `{"name":"Professor"}`: cria sala e devolve `roomId` e `teacherSecret` **uma única vez**.
- `POST /api/rooms/:id/teacher` com `{"secret":"..."}`: valida acesso administrativo.
- `POST /api/rooms/:id/join` com `{"name":"Aluno"}`: retorna `participantToken`.
- `GET /api/rooms/:id/state` com cabeçalho `Authorization: Bearer <token>`: informações do estado e participantes ativos.
- `POST /api/rooms/:id/leave` com token do aluno: encerra presença.
- `POST /api/rooms/:id/close` com token do professor: encerra sala **na aplicação Aulas**.
- `POST /api/rooms/:id/rotate` com token do professor: revoga segredo anterior e gera outro.

Todas as respostas usam JSON e `Cache-Control: no-store`. Segredos são gerados com aleatoriedade criptográfica e armazenados somente como hashes SHA-256 no servidor. A API verifica permissões em cada requisição, restringe origens e aplica limites básicos por IP. A sala expira em 12 horas; o armazenamento é **em memória** e reiniciar o processo perde as salas.

## Limites importantes

**O controle de acesso protege os endpoints do Aulas, não a sala audiovisual do VDO.Ninja.** Conhecer o nome real da sala no VDO.Ninja permite tentar acessá-la diretamente. O encerramento de sala do Aulas não remove pessoas conectadas no VDO.Ninja em outra aba, e não equivale à moderação de chamada. A aplicação usa o código de sala compartilhado para vídeo. Portanto, não use esta versão para discussões confidenciais nem para classes em produção com dados sensíveis.

A API ainda não oferece sincronização de quizzes (Sprints 4 e 5), não guarda histórico e não possui login. Tokens e nomes não devem constar em logs. CORS não substitui autenticação; a API autentica cada ação privilegiada no servidor.

### Testes

`npm run test`: cria um servidor isolado na porta aleatória e valida criação de sala, segregação de acessos, revogação, encerramento e entrada por aluno. A implantação em hospedagem externa precisa ser validada separadamente.
