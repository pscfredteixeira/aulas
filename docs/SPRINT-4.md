# Sprint 4 — Criar e apresentar perguntas durante a videoaula

**Estado:** código implementado e integrado ao site Aulas e à API de salas. A implantação do backend deve ser verificada antes do teste com pessoas reais. O envio de respostas e os resultados ao vivo estão programados para o **Sprint 5**.

## Como funciona

1. Abra [o Aulas](https://pscfredteixeira.github.io/aulas/) no navegador e crie uma sala como professor.
2. Copie seu **link privado de professor** e o **convite de aluno** separadamente.
3. Entre na videoaula. Ao lado do quadro de câmeras, aparece **Quiz da aula**.
4. Escreva um enunciado (10–400 caracteres) e quatro alternativas (até 160 caracteres cada), marcando a resposta certa.
5. Clique em **Salvar rascunho**. Neste estado somente o professor vê a pergunta e o gabarito.
6. Se desejar, edite e salve novamente o rascunho.
7. Clique em **Abrir pergunta para os alunos**. Em até alguns segundos, a turma verá a pergunta e suas alternativas, sem gabarito e sem sair da chamada.
8. Clique em **Encerrar pergunta** para mudar seu estado para encerrado.
9. Depois de encerrar, use **Criar próxima pergunta**. A pergunta nova substitui a anterior nesta versão de demonstração.

## O que foi implementado

- Componente responsivo `QuizPanel.tsx` ao lado da videochamada.
- Editor de enunciado, quatro alternativas e opção correta.
- Estado autoritativo no backend: **rascunho → aberta → encerrada**.
- Endpoints de criação/abertura/encerramento exigindo o token de professor.
- API retorna o gabarito **somente** para o professor.
- Alunos **não** podem ver rascunhos, alterar perguntas nem receber `correctOptionId`.
- Acompanhamento por consulta de estado a cada aproximadamente **3 segundos**. É atualização periódica, **não** WebSocket/Socke.IO instantâneo; o Sprint 5 criará a sincronização de respostas.
- React atualiza somente o conteúdo do quiz, mantendo o iframe VDO.Ninja montado.

## Testes automatizados

Os testes de backend em `apps/server/tests/server.test.mjs` conferem que:

- um aluno recebe **403** ao tentar criar, abrir ou encerrar pergunta;
- a API rejeita menos de quatro alternativas, alternativas repetidas, gabaritos inválidos e texto HTML;
- rascunho não é visível para alunos;
- pergunta aberta chega ao aluno com as quatro alternativas, mas **nunca** com a resposta correta;
- só uma pergunta fica aberta por vez;
- a pergunta pode ser encerrada e substituída pela próxima;
- um professor de outra sala não consegue controlar a primeira.

O GitHub Actions executa testes do frontend e do backend, valida a saúde da API e publica o site. **Teste automático não substitui uma aula real com duas pessoas.**

## Pontos a verificar manualmente

- [ ] Abrir professor e aluno em **dois navegadores/aparelhos diferentes**.
- [ ] Conferir que as câmeras e microfones continuam funcionando enquanto a pergunta aparece.
- [ ] Confirmar que aluno vê apenas alternativas, não a opção correta.
- [ ] Confirmar que o aluno visualiza a pergunta poucos segundos após o professor clicar em **Abrir**.
- [ ] Encerrar a pergunta e verificar a mudança no aluno.
- [ ] Testar em computador e telefone; conferir se vídeo e quiz estão legíveis sem rolagem lateral.
- [ ] Confirmar o funcionamento após a hospedagem do novo backend no Render.

## Limites explícitos desta versão

- **Responder ao quiz dentro da plataforma ainda não está implementado.** As alternativas aparecem para discussão, não como botões de votação. Votos, porcentagens e gabarito revelado para a turma fazem parte do Sprint 5.
- Perguntas ficam **somente na memória da API**. Como o Render está no plano Free, reinícios/hibernações apagam salas e perguntas. Não use como biblioteca definitiva.
- O link administrativo do Aulas **não protege a sala audiovisual do VDO.Ninja** de acesso direto. A publicação atual é experimental, não apropriada para dados clínicos ou de alunos sensíveis.
- A reprodução audiovisual depende das permissões de câmera e microfone e dos recursos do VDO.Ninja.

## Próximo sprint — respostas

O Sprint 5 implementará a votação individual, recebimento pelo servidor, prevenção de voto duplicado, contagem do professor, encerramento, revelação de gabarito e reconexão. Para isso será necessário um contrato de eventos em tempo real ou outra estratégia confiável de sincronização; o polling do Sprint 4 é provisório.
