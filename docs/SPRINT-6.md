# Sprint 6 — Enquetes, perguntas abertas e estudos de caso

**Estado (21/11/2026):** código implementado no frontend e backend; API publicada no Render com armazenamento Firebase. Testes de permissões e moderação automatizados. O teste final de ponta a ponta contra a API pública e a validação audiovisual em dois dispositivos devem ser conferidos separadamente.

## Novas modalidades

1. **Enquete sem gabarito:** professor escreve a pergunta, fornece de **2 a 4 alternativas**, salva um rascunho e abre a votação. Cada aluno vota uma vez por participação. O professor vê total e porcentagens. Após encerrar, decide quando publicar o resultado para a turma. Não existe alternativa correta.
2. **Pergunta aberta:** professor publica uma pergunta. Cada aluno envia **uma contribuição escrita de até 600 caracteres**. Ela não aparece automaticamente para outros alunos: o professor precisa aprová-la e pode ocultá-la depois. O professor vê quem enviou; a turma vê apenas os textos aprovados, **sem o nome** do autor.
3. **Estudo de caso:** professor descreve uma **situação fictícia** (contexto de 20 a 1800 caracteres), com uma pergunta para discussão. Os alunos enviam contribuições escritas sob o mesmo processo de moderação da pergunta aberta. Não inserir dados reais de pacientes, alunos ou prontuários.

O vídeo e o áudio seguem dentro do VDO.Ninja, num iframe separado. Alterar a aba de atividades no painel do professor **não remonta o iframe**. A turma recebe automaticamente a atividade aberta por último; o backend impede abrir quiz e outra atividade ao mesmo tempo.

## Como testar como professor

1. Entre em https://pscfredteixeira.github.io/aulas/ e crie uma nova sala.
2. Entre pelo **link privado de professor**. Na área ao lado das câmeras, escolha a aba **Enquetes e discussões**.
3. Escolha **Enquete**, escreva uma pergunta e duas ou mais opções. Salve, clique em **Abrir atividade**, convide alguém e acompanhe os votos. Encerre e selecione **Mostrar resultado da enquete**.
4. Em seguida, escolha **Pergunta aberta** e crie outra atividade; abra. Peça ao aluno uma resposta e examine **Contribuições recebidas**. Clique em **Aprovar para a turma**. O aluno verá o texto aprovado sem o nome. Use **Ocultar da turma** se não quiser mantê-lo público.
5. Teste **Estudo de caso**: escreva uma situação fictícia e uma pergunta para discussão, abra a atividade, receba contribuições e modere.
6. Alterne de volta à aba **Quiz**: as questões com gabarito do Sprint 5 continuam disponíveis. O sistema bloqueia abrir outra modalidade enquanto uma pergunta estiver em andamento.

## Como testar como aluno

1. Clique no link de convite de aluno e informe seu nome.
2. Com a videochamada aberta, a atividade do professor aparecerá no painel ao lado.
3. Em **enquete**, clique em uma opção. A votação é única para sua participação, sem gabarito.
4. Em **pergunta aberta ou caso**, digite seu comentário e clique em **Enviar contribuição**. Só o professor o verá inicialmente; depois de aprovado, o **texto** poderá aparecer aos demais, sem nome do autor.
5. A atualização ocorre a cada **~3 segundos**, por consultas da API. Ainda não há WebSocket/SSE.

## Segurança, dados e limites

- Todas as operações administrativas exigem token **de professor** no servidor.
- A API nunca devolve ao aluno rascunhos, respostas escritas ainda não aprovadas, o nome de quem escreveu um texto aprovado ou os votos de outros alunos antes da divulgação.
- Cada token de aluno tem **uma resposta por atividade**: enviar a mesma resposta novamente é idempotente; mudar o voto ou texto retorna erro. Sem conta/login, uma pessoa pode abrir várias participações; não usar para avaliações com identificação.
- Textos são validados no servidor e renderizados pelo React como texto, sem HTML executável.
- Os dados de participação, votos e textos são gravados no **Cloud Firestore** pelo servidor Render; expiram junto com a sala (**12 horas**). Não há biblioteca de atividades/histórico permanente. A nova atividade substitui a anterior da mesma modalidade.
- O serviço Render gratuito pode hibernar. A conexão Firestore permite recuperação dos dados, mas pode haver atraso para iniciar a API.
- Os links administrativos do Aulas **não** protegem a entrada direta na sala audiovisual do VDO.Ninja; não usar com casos clínicos reais ou dados sensíveis.

## Endpoints HTTP adicionados

- `POST /api/rooms/:id/activity` — token de professor; JSON com `type`, `prompt`, e `options` para enquete ou `context` para estudo de caso. Cria o rascunho.
- `POST /api/rooms/:id/activity-open` — professor abre para a turma.
- `POST /api/rooms/:id/activity-close` — professor encerra e impede novas respostas.
- `POST /api/rooms/:id/activity-answer` — token de aluno; JSON `{"activityId":"...","optionId":"A"}` na enquete, ou `{"activityId":"...","text":"Minha contribuição"}` nas outras modalidades.
- `POST /api/rooms/:id/activity-reveal` — professor publica os totais de uma **enquete encerrada**.
- `POST /api/rooms/:id/activity-moderate` — professor envia `{"activityId":"...","responseId":"...","approved":true}` ou `false` para aprovar/ocultar uma contribuição.

A rota `GET /api/rooms/:id/state` retorna `room.activity` filtrado conforme o papel e `room.focus` para definir automaticamente a modalidade visível na tela do aluno.

## Critérios de aceite

- [x] UI com três modalidades e controles de professor.
- [x] API valida tipos, tamanhos, texto e autorização por perfil.
- [x] Enquete contabiliza votos e só revela percentuais aos alunos com autorização.
- [x] Texto de aluno passa por aprovação; nomes não aparecem no retorno dos outros alunos.
- [x] Estudo de caso tem contexto e pergunta próprios.
- [x] Firebase persiste dados de atividades entre execuções.
- [x] Vídeo permanece montado durante alternância de atividade.
- [x] Testes unitários verificam votos, moderação, proteção, recuperação e isolamento.
- [ ] Confirmação final do teste integrado de **todas as modalidades contra Render**.
- [ ] Validação manual do fluxo em dois aparelhos com câmera e microfone.
- [ ] Teste da interface no celular e com seis participantes.
- [ ] Revisão de acessibilidade e retenção de dados antes de uso real.

## Próximo sprint

**Sprint 7:** biblioteca de aulas e questões reutilizáveis, importação e exportação JSON; considerar armazenamento permanente somente após definir contas, permissões, retenção e privacidade.
