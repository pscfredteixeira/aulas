# Sprint 5 — Respostas, apuração e revelação de quiz

**Estado (20/11/2026):** implementação funcional de votos e totais no backend e no frontend, testes automatizados e teste de ponta a ponta contra a API pública. O sistema usa **atualização periódica de aproximadamente 3 segundos**, não um canal WebSocket instantâneo. Antes de chamar de versão estável, é necessário testar a interface de dois aparelhos reais e seis pessoas simultâneas.

## Fluxo para o professor

1. Abra [o Aulas](https://pscfredteixeira.github.io/aulas/) e crie sua sala.
2. Guarde seu link privado de professor. Compartilhe **somente o convite de aluno**.
3. Entre no vídeo, escreva um enunciado e quatro alternativas, escolha o gabarito e clique em **Salvar rascunho**.
4. Clique em **Abrir votação para os alunos**.
5. Os alunos podem clicar em uma das quatro alternativas. O professor acompanha o total de votos e as barras por opção, atualizadas a cada ~3 segundos. O gabarito ainda não é enviado aos alunos.
6. Clique em **Encerrar votação**. A partir daí o servidor rejeita novos votos.
7. Clique em **Mostrar resultado e gabarito**. Só então os alunos veem o total, as porcentagens e a alternativa correta.
8. Para continuar a aula, prepare outra pergunta no mesmo painel.

## Fluxo do aluno

1. Abra o convite enviado pelo professor. A tela de convite exibe apenas o campo de **nome** e o botão **Entrar na videoaula**, com teste opcional de câmera e microfone.
2. Autorize câmera/microfone na área VDO.Ninja.
3. Quando o quiz abrir, selecione uma alternativa no painel ao lado do vídeo.
4. Receba a confirmação **Resposta registrada**. A plataforma aceita **uma resposta por token de participação** em cada pergunta. Repetir a mesma resposta é idempotente; trocar a alternativa é bloqueado pelo servidor.
5. Aguarde o professor encerrar e divulgar o resultado.

O navegador tenta reutilizar a credencial de participação **na mesma aba** após atualizar a página, para não cadastrar outro aluno involuntariamente. Sair explicitamente da aula encerra essa participação.

## Segurança e privacidade

O servidor, e não o frontend, verifica os papéis de professor/aluno. Nenhum aluno pode criar perguntas, encerrar a votação ou revelar resultados. Respostas individuais são identificadas no banco por **ID efêmero de participação**, e o token de autorização é armazenado somente como hash. A API retorna para cada aluno apenas a **própria alternativa**, nunca as escolhas dos demais. O professor recebe contagens agregadas.

Enquanto a pergunta está aberta, a API devolve ao aluno **apenas texto, opções e a própria resposta**: sem gabarito nem contagens. Depois que o professor encerra e clica em **Mostrar resultado e gabarito**, as contagens e o gabarito ficam disponíveis para a turma.

**Limite:** como não existe cadastro de usuário, um aluno pode abrir outra sessão/navegador e entrar como outra participação. A proteção atual evita duplicação **por token**, mas não garante um voto por pessoa real. Não usar resultados como prova, avaliação formal ou identificação pessoal.

## Arquitetura e persistência

- Frontend estático React/Vite hospedado no GitHub Pages.
- Vídeo e voz incorporados pelo VDO.Ninja, permanecendo na tela durante a votação.
- Render `aulas-api`: servidor HTTP com os endpoints de sala e quizzes.
- Firebase Firestore ativado no Render: salas, hashes de tokens, perguntas e votos são recuperáveis após reinício, enquanto a sala não expirar (12h).
- O painel consulta `GET /api/rooms/:id/state` a cada ~3 segundos, com autorização. Os votos são submetidos por HTTP; **não usamos Socket.IO ou WebSocket neste estágio**.

**Atenção:** Render Free pode hibernar e gerar atraso ao retornar; Firestore preserva dados, mas não impede essa latência. O Firestore não protege as chamadas do VDO.Ninja de acesso direto.

## Contrato de votação

- `POST /api/rooms/:id/quiz-answer` requer **Bearer token de aluno**, JSON `{"quizId":"id_da_questao","optionId":"A"}`, sala e questão abertas. Retorna a questão do ponto de vista do aluno. O mesmo voto repetido retorna 200; um voto diferente do mesmo participante recebe 409; opção inválida recebe 422; token de professor recebe 403.
- `POST /api/rooms/:id/quiz-reveal` requer **Bearer token do professor** e questão previamente encerrada. Retorna estado de questão para professor, com gabarito e totais. Repetir a revelação é idempotente.
- `GET /api/rooms/:id/state` retorna `quiz.results` somente para professor ou, depois da revelação, para aluno; `quiz.myAnswer` é individual. Nunca retorna `quiz.votes` completo.

Resultados têm o formato `{"total":2,"counts":{"A":1,"B":1,"C":0,"D":0}}`. A pergunta tem flag `revealed` para indicar divulgação autorizada.

## Testes e limites da entrega

- [x] Teste automatizado: duas pessoas votam, reenvio igual idempotente, alternativa diferente rejeitada.
- [x] Teste automatizado: aluno não vota usando token de professor; professor não vota como aluno.
- [x] Teste automatizado: aluno não recebe gabarito/contagem antes da revelação.
- [x] Teste automatizado: outro professor não pode manipular a pergunta e cada sala fica isolada.
- [x] Teste automatizado: após reiniciar o backend com armazenamento persistente simulado, voto e token permanecem válidos.
- [x] Teste automatizado de publicação contra a API real: criar sala, entrar com dois alunos, abrir quiz, votar, rejeitar duplicação, encerrar, revelar e fechar.
- [x] Build do frontend e testes de backend via GitHub Actions.
- [ ] Teste manual de interface: professor + aluno em dois navegadores/aparelhos com áudio/vídeo.
- [ ] Teste ampliado de seis participantes e redes lentas.
- [ ] Confirmar GitHub Pages configurado exclusivamente na origem **GitHub Actions**; o antigo workflow de Jekyll ainda aparece no repositório.
- [ ] Evolução opcional: WebSocket/SSE para latência menor que o polling de 3 segundos.
- [ ] Robustez maior contra votos duplicados de pessoas que criam múltiplas participações (requer identidade/cadastro ou outra estratégia).
- [ ] Persistência multi-instância com coordenação/transações e histórico de várias perguntas (atualmente há uma pergunta corrente por sala, substituída pela próxima).

## Próximo passo

Teste com professor e aluno reais em navegadores diferentes. Se a interface estiver adequada, avançar ao Sprint 6 (enquete sem gabarito, questão aberta moderada e casos), priorizando clareza da experiência de quem participa pelo link.
