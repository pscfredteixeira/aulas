# Aulas

Plataforma web de **aulas ao vivo e interativas**: professor e alunos participam com câmera e microfone, enquanto o professor apresenta quizzes e outras atividades sem interromper a videochamada.

> **Estado:** Sprint 2 — frontend de demonstração implementado, com integração inicial ao VDO.Ninja. **A chamada entre dois dispositivos ainda precisa ser testada.**  
> **Regra permanente:** professores e alunos usam apenas o navegador — sem Node.js, terminal, extensões ou instalação de aplicativos. O acesso continua sem cadastro na primeira versão.
> **Importante:** a prova de conceito do Sprint 2 não separa permissões de professor e aluno; isso será implementado com validação no servidor no Sprint 3.

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
- [Modelo inicial de uma aula em JSON](examples/aula.exemplo.json)

## Usar o Aulas sem instalar nada

**Professores e alunos não precisam instalar Node.js, fazer cadastro, baixar aplicativos ou executar comandos.** O sistema é um site acessado por link, com autorização de câmera e microfone no próprio navegador.

**Endereço que receberá o aplicativo após ajustar a origem do Pages:** https://pscfredteixeira.github.io/aulas/

A publicação do frontend é automatizada pelo arquivo [deploy-pages.yml](.github/workflows/deploy-pages.yml): ao atualizar o código em `apps/web`, o GitHub instala as dependências, testa, compila e disponibiliza os arquivos. A primeira publicação foi **concluída com sucesso** no [GitHub Actions](https://github.com/pscfredteixeira/aulas/actions/runs/44595144704). O teste audiovisual entre dois aparelhos continua pendente.

**Ação manual indispensável:** abra [Settings → Pages](https://github.com/pscfredteixeira/aulas/settings/pages), localize **Build and deployment → Source**, troque de **Deploy from a branch** para **GitHub Actions**. Depois vá a [Actions → Publicar Aulas no GitHub Pages](https://github.com/pscfredteixeira/aulas/actions/workflows/deploy-pages.yml), clique em **Run workflow**, selecione `main` e execute. Atualize o endereço do Aulas. Consulte [as instruções completas](docs/SPRINT-2.md#publicação-online-sem-instalação).

Para quem **quiser programar/testar localmente** (opcional), é preciso Node.js 22.12+:

```bash
git clone https://github.com/pscfredteixeira/aulas.git
cd aulas/apps/web
npm install
npm run dev
```

O Node.js nunca será exigido de quem apenas ministra ou assiste às aulas. **O protótipo do Sprint 2 ainda não tem quiz, moderação ou acesso protegido**; não utilizá-lo com dados sensíveis.

## Pilha técnica e arquitetura

- **Frontend:** React + TypeScript + Vite (implementado no Sprint 2)
- **Vídeo/áudio:** VDO.Ninja incorporado no navegador (testar comportamento real da sala e restrições dos iframes)
- **Tempo real das atividades:** Node.js + TypeScript + Socket.IO
- **Persistência:** armazenamento simples no início, com modelo de dados preparado para banco relacional
- **Versionamento:** GitHub, com separação entre frontend, backend e conteúdo

A tecnologia audiovisual e a sincronização dos quizzes são **subsistemas distintos**. Não presumir que a API do VDO.Ninja sincronize automaticamente os quizzes.

## Segurança e privacidade

Um link administrativo secreto é uma **credencial de acesso**, mesmo sem login: não deve aparecer no link de convite, em logs ou em conteúdo público; precisa ser revogável. A autorização para iniciar atividades deve ser verificada no servidor. O aplicativo não gravará aulas por padrão. Antes de testes com pessoas, informar sobre o uso de serviço de vídeo externo e definir o tratamento de nomes e respostas. Ver detalhes em [Arquitetura](docs/ARQUITETURA.md).

## Como contribuir

Por ora, acompanhe os sprints em [docs/ROADMAP.md](docs/ROADMAP.md). Antes de implementar novas funcionalidades, confira os critérios de aceite e mantenha o escopo do MVP.
