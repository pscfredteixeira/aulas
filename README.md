# Aulas

Plataforma web de **aulas ao vivo e interativas**: professor e alunos participam com câmera e microfone, enquanto o professor apresenta quizzes e outras atividades sem interromper a videochamada.

> **Estado:** Sprint 4 — criação e exibição de perguntas durante a videoaula implementadas. Votação e apuração ainda não disponíveis (Sprint 5). A confirmação audiovisual em dois dispositivos continua pendente.  
> **Regra permanente:** professores e alunos usam apenas o navegador — sem Node.js, terminal, extensões ou instalação de aplicativos. O acesso continua sem cadastro na primeira versão.
> **Importante:** as permissões de professor e aluno são verificadas no backend hospedado em https://aulas-api-vrdo.onrender.com. O GitHub Actions já compilou o site com a API, mas os fluxos devem ser verificados em navegadores reais.

## Visão do produto

- Professor cria uma sala e recebe dois acessos distintos: **link do professor** (controle) e **link de aluno** (participação).
- Alunos entram pelo navegador informando um nome de exibição e autorizando câmera e microfone.
- Todas as pessoas na turma podem se ver e conversar.
- Professor aciona uma atividade a qualquer momento. O quiz aparece para todos; as câmeras e o áudio permanecem ativos.
- Professor acompanha respostas e decide quando revelar o resultado.
- Em uma etapa futura, aulas e atividades poderão integrar-se ao **Atelier**, mas o Aulas funciona independentemente.

## Escopo do protótipo (MVP)

1. Criar sala com identificador aleatório e link de convite.
2. Entrar como professor ou aluno, sem conta.
3. Integrar VDO.Ninja para sala de vídeo em grupo.
4. Exibir uma questão de múltipla escolha para todos ao mesmo tempo.
5. Receber uma resposta por participante, mostrar totais ao professor e encerrar quiz.
6. Recuperar a tela após uma desconexão curta, quando tecnicamente possível.
7. Testar com **seis pessoas simultâneas** (meta de teste, não capacidade garantida).

Não faz parte do MVP: login, pagamentos, emissão de certificados, gravações, biblioteca compartilhada entre professores, IA, importação do Atelier, analytics de longo prazo ou suporte comprovado a turmas grandes.

## Documentos

- [Visão e princípios](docs/VISAO.md)
- [Requisitos funcionais e não funcionais](docs/REQUISITOS.md)
- [Arquitetura e decisões técnicas](docs/ARQUITETURA.md)
- [Roadmap e sprints](docs/ROADMAP.md)
- [Critérios de aceite do Sprint 1 e próximos testes](docs/TESTES.md)
- [Sprint 2 — implementação, testes e publicação online](docs/SPRINT-2.md)
- [Sprint 3 — sala protegida, implantação da API e limites](docs/SPRINT-3.md)
- [Sprint 4 — edição e apresentação de perguntas durante a chamada](docs/SPRINT-4.md)
- [Modelo inicial de uma aula em JSON](examples/aula.exemplo.json)

## Usar o Aulas sem instalar nada

**Professores e alunos não precisam instalar Node.js, fazer cadastro, baixar aplicativos ou executar comandos.** O sistema é um site acessado por link, com autorização de câmera e microfone no próprio navegador.

**Site Aulas (frontend publicado):** https://pscfredteixeira.github.io/aulas/

A publicação do frontend é automatizada pelo arquivo [deploy-pages.yml](.github/workflows/deploy-pages.yml): ao atualizar o código em `apps/web`, o GitHub instala as dependências, testa, compila e disponibiliza os arquivos. A primeira publicação foi **concluída com sucesso** no [GitHub Actions](https://github.com/pscfredteixeira/aulas/actions/runs/44595144704). O teste audiovisual entre dois aparelhos continua pendente.

**Se o site exibir o README em vez da interface:** confira em [Settings → Pages](https://github.com/pscfredteixeira/aulas/settings/pages) se a origem é **GitHub Actions** e consulte [as instruções](docs/SPRINT-2.md#publicação-online-sem-instalação).

Para quem **quiser programar/testar localmente** (opcional), é preciso Node.js 22.12+:

```bash
git clone https://github.com/pscfredteixeira/aulas.git
cd aulas/apps/web
npm install
npm run dev
```

O Node.js nunca será exigido de quem apenas ministra ou assiste às aulas. **O protótipo exibe perguntas, mas ainda não recebe votos; o VDO.Ninja não é protegido pela API de salas.** Não o utilize com dados sensíveis.

## Ativar a API sem instalar nada — preparação concluída

O backend do Sprint 3 **foi implantado no Render** em https://aulas-api-vrdo.onrender.com e seu endpoint de saúde foi verificado pelo GitHub Actions. O botão abaixo cria a configuração de hospedagem a partir do `render.yaml` do próprio repositório:

[![Implantar no Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/pscfredteixeira/aulas)

**Implantação realizada.** O workflow já utiliza a URL do Render, com possibilidade de substituí-la posteriormente pela variável `AULAS_API_URL`. [Passo a passo (sem terminal)](docs/IMPLANTAR-API.md).

O plano gratuito do Render pode hibernar e reiniciar a API, perdendo salas que ainda ficam em memória. Portanto, isto serve para testes: **não use este protótipo em aulas reais com dados sensíveis**.

## Sprint 3 — Sala do professor e dos alunos

O código do Sprint 3 já existe: professor cria uma sala com um link privado, alunos recebem outro link e o servidor verifica permissões para **renovar o link de professor** e **encerrar a aula no Aulas**. Esses comandos precisam de um serviço remoto.

**Status no site público:** a compilação publicada já aponta para a API hospedada. Falta testar no navegador se professor e alunos entram com os links corretos. A proteção de API **não** protege a entrada direta na sala do VDO.Ninja.

O backend está em [apps/server](apps/server/README.md). A implantação está explicada em [docs/SPRINT-3.md](docs/SPRINT-3.md). **Os professores e alunos não precisam instalar Node.js**, inclusive depois de habilitarmos o serviço remoto.

## Sprint 4 — Apresentação de perguntas

Já é possível preparar uma pergunta com **quatro alternativas e gabarito**, salvar um rascunho, **abrir a atividade para os alunos** e encerrá-la, sem desmontar o vídeo VDO.Ninja. A pergunta é exibida ao lado da chamada, em uma área responsiva.

**Importante:** o aluno ainda não envia a resposta pela plataforma. A votação, a contagem e os resultados serão implementados no Sprint 5.

- [Como testar uma pergunta ao vivo](docs/SPRINT-4.md)
- [Código do painel de quiz](apps/web/src/QuizPanel.tsx)

As perguntas são temporárias: ficam apenas na memória do Render e podem desaparecer se o serviço reiniciar ou hibernar.

## Pilha técnica e arquitetura

- **Frontend:** React + TypeScript + Vite (implementado no Sprint 2)
- **Vídeo/áudio:** VDO.Ninja incorporado no navegador (testar comportamento real da sala e restrições dos iframes)
- **Atividades:** Node.js com HTTP e atualização periódica (~3 s) no Sprint 4; sincronização de votos por WebSocket/Socket.IO prevista para o Sprint 5
- **Persistência:** atualmente apenas em memória no Render Free (salas e perguntas são perdidas em reinícios); banco persistente em etapa posterior
- **Versionamento:** GitHub, com separação entre frontend, backend e conteúdo

A tecnologia audiovisual e a sincronização dos quizzes são **subsistemas distintos**. Não presumir que a API do VDO.Ninja sincronize automaticamente os quizzes.

## Segurança e privacidade

Um link administrativo secreto é uma **credencial de acesso**, mesmo sem login: não deve aparecer no link de convite, em logs ou em conteúdo público; precisa ser revogável. A autorização para iniciar atividades deve ser verificada no servidor. O aplicativo não gravará aulas por padrão. Antes de testes com pessoas, informar sobre o uso de serviço de vídeo externo e definir o tratamento de nomes e respostas. Ver detalhes em [Arquitetura](docs/ARQUITETURA.md).

## Como contribuir

Por ora, acompanhe os sprints em [docs/ROADMAP.md](docs/ROADMAP.md). Antes de implementar novas funcionalidades, confira os critérios de aceite e mantenha o escopo do MVP.
