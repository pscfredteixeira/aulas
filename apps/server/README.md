# Aulas — Backend de salas, quizzes e respostas

API Node.js 22+ hospedada no Render, usando `firebase-admin` para armazenar salas e votos no Cloud Firestore. **Professores e alunos não instalam Node.js**: entram pelo site HTTPS do Aulas.

A API **não** transmite nem controla a mídia VDO.Ninja, que continua no iframe do navegador.

## Configuração

- `PORT`: porta HTTP, definida pelo Render.
- `AULAS_ALLOWED_ORIGINS`: origens exatas separadas por vírgula; atualmente `https://pscfredteixeira.github.io`.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: conteúdo integral da credencial de conta de serviço do Firebase Admin, **somente no ambiente privado do Render**. Nunca colocar a chave no GitHub, em logs, em mensagens ou no frontend. Sem ela, a API volta ao modo temporário em memória.
- `GET /api/health`: informa `{"ok":true,"persistent":true}` quando Firestore está ativo (não expõe credenciais).

O servidor usa apenas uma instância no Render Free. O Firestore guarda documentos de salas, incluindo hashes SHA-256 de credenciais (sem tokens em texto), perguntas, fase e votos por identificador efêmero de participação. As salas expiram em 12 horas. Reinícios do processo não devem apagá-las; a implantação atual foi testada contra o Firestore, mas a recuperação depois de reinício real deve ser validada em dois aparelhos.

## Endpoints das salas

Todas as rotas aceitam JSON e respondem com `Cache-Control: no-store`:

- `GET /api/health`: integridade do backend e indicador de Firestore.
- `POST /api/rooms` com `{"name":"Docente"}`: cria uma sala e retorna um segredo privado de professor.
- `POST /api/rooms/:id/teacher` com `{"secret":"..."}`: valida o professor.
- `POST /api/rooms/:id/join` com `{"name":"Aluno"}`: cria participação e retorna token exclusivo de aluno.
- `GET /api/rooms/:id/state` com `Authorization: Bearer <token>`: estado para o papel autenticado.
- `POST /api/rooms/:id/leave`: aluno encerra sua participação.
- `POST /api/rooms/:id/close`: professor encerra a sala **no Aulas**.
- `POST /api/rooms/:id/rotate`: professor renova o segredo privado (revoga o anterior).

## Endpoints de quiz

- `POST /api/rooms/:id/quiz` com token do **professor** e `{"prompt":"Pergunta válida?","options":["A","B","C","D"],"correctOptionId":"A"}`: cria rascunho. Quatro alternativas distintas, enunciado 10–400 caracteres e alternativas 1–160 caracteres.
- `POST /api/rooms/:id/quiz-open`: professor abre a votação.
- `POST /api/rooms/:id/quiz-answer` com token de **aluno**, `{"quizId":"id","optionId":"A"}`: um voto por participação. Repetir o mesmo é idempotente; tentar trocar devolve HTTP 409. O voto só é aceito com questão e sala abertas.
- `POST /api/rooms/:id/quiz-close`: professor encerra a votação e bloqueia novos votos.
- `POST /api/rooms/:id/quiz-reveal`: professor divulga resultado e gabarito para a turma, **somente depois de encerrar**.

A API retorna para alunos `quiz.myAnswer` individualmente, nunca `quiz.votes` completo. As contagens agregadas `quiz.results` e `quiz.correctOptionId` aparecem aos alunos **somente após a revelação**; o professor sempre tem acesso. O frontend consulta o estado a cada ~3 segundos. WebSocket/SSE ainda não está implementado.

## Endpoints de atividades (Sprint 6)

Há três modalidades: **`poll`** (enquete sem gabarito), **`open_question`** (pergunta aberta) e **`case`** (estudo de caso com texto de contexto). Todos os comandos administrativos são validados com token de professor:

- `POST /api/rooms/:id/activity`: criar rascunho, JSON `{"type":"poll","prompt":"Qual tema prefere?","options":["Freud","Lacan"]}`. Para um caso usar `{"type":"case","prompt":"Como discutir a situação?","context":"Descrição fictícia com ao menos vinte caracteres."}`.
- `POST /api/rooms/:id/activity-open`: abrir atividade, desde que não haja quiz aberto.
- `POST /api/rooms/:id/activity-close`: encerrar e bloquear novas contribuições.
- `POST /api/rooms/:id/activity-answer`: token **de aluno**; JSON `{"activityId":"...","optionId":"A"}` para enquete, ou `{"activityId":"...","text":"Minha contribuição"}` nas atividades escritas.
- `POST /api/rooms/:id/activity-reveal`: professor publica contagem de uma enquete encerrada.
- `POST /api/rooms/:id/activity-moderate`: professor controla visibilidade de um texto `{"activityId":"...","responseId":"...","approved":true}`.

`GET /api/rooms/:id/state` retorna `room.activity` por papel e `room.focus` com o tipo de atividade mais recente. **Alunos nunca recebem textos não aprovados de outras pessoas nem seus nomes vinculados às contribuições.** Textos são compartilhados com a turma somente quando moderados; mesmo assim, evitar dados clínicos e pessoais.

Os dados ficam no Firestore durante as 12h de validade da sala; cada nova atividade substitui a anterior da mesma modalidade. Não há garantia de uma resposta por pessoa real sem identidade.

[Documentação do Sprint 6](../../docs/SPRINT-6.md).

## Testes

```bash
cd apps/server
npm install
npm run test
```

O GitHub Actions também testa criação, segurança de papéis, votos duplicados e recuperação com Firestore simulado. A publicação executa `node apps/server/tests/live-smoke.mjs` contra a API real com nomes fictícios: cria sala, registra dois votos, apura e revela gabarito.

**Limitações:** sem conta não há garantia de um voto por pessoa real; apenas por token. O Firestore atual não tem controle distribuído de concorrência para múltiplas instâncias. O plano Render Free pode hibernar e atrasar respostas. O segredo do professor protege somente a API do Aulas, **não** impede acesso direto à chamada VDO.Ninja. Não usar para informações confidenciais nem avaliações formais.

Mais detalhes em [Sprint 5](../../docs/SPRINT-5.md) e [Firebase](../../docs/FIREBASE.md).
