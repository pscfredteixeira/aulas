# Aulas

Plataforma web de **aulas ao vivo e interativas**: professor e alunos participam com câmera e microfone, enquanto o professor apresenta quizzes e outras atividades sem interromper a videochamada.

> **Estado:** planejamento técnico (Sprint 1). Ainda não existe aplicativo funcional.  
> **Princípio da primeira versão:** participar e criar aulas sem exigir cadastro/login.

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
- [Modelo inicial de uma aula em JSON](examples/aula.exemplo.json)

## Pilha técnica proposta (a validar no Sprint 2)

- **Frontend:** React + TypeScript + Vite
- **Vídeo/áudio:** VDO.Ninja incorporado no navegador (testar comportamento real da sala e restrições dos iframes)
- **Tempo real das atividades:** Node.js + TypeScript + Socket.IO
- **Persistência:** armazenamento simples no início, com modelo de dados preparado para banco relacional
- **Versionamento:** GitHub, com separação entre frontend, backend e conteúdo

A tecnologia audiovisual e a sincronização dos quizzes são **subsistemas distintos**. Não presumir que a API do VDO.Ninja sincronize automaticamente os quizzes.

## Segurança e privacidade

Um link administrativo secreto é uma **credencial de acesso**, mesmo sem login: não deve aparecer no link de convite, em logs ou em conteúdo público; precisa ser revogável. A autorização para iniciar atividades deve ser verificada no servidor. O aplicativo não gravará aulas por padrão. Antes de testes com pessoas, informar sobre o uso de serviço de vídeo externo e definir o tratamento de nomes e respostas. Ver detalhes em [Arquitetura](docs/ARQUITETURA.md).

## Como contribuir

Por ora, acompanhe os sprints em [docs/ROADMAP.md](docs/ROADMAP.md). Antes de implementar novas funcionalidades, confira os critérios de aceite e mantenha o escopo do MVP.
