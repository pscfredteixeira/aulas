# Sprint 3 — Acesso do professor e do aluno, sem cadastro

**Estado:** implementado no código, testes automatizados; ativação pública depende de hospedar a API por HTTPS e configurar a variável `AULAS_API_URL` no GitHub. A videochamada anterior permanece disponível em modo demonstração sem o servidor. Não anunciar acesso protegido na versão pública antes dessa configuração.

## Recursos implementados

- Backend HTTP em `apps/server`, sem dependências npm extras, usando Node.js 22+.
- Criação de sala no backend com identificador aleatório e **segredo do professor diferente do convite de aluno**.
- Link do professor fica no fragmento `#teacher=...` e é separado do link de convite.
- Validação da credencial administrativa em **cada operação privilegiada no servidor**.
- Aluno participa sem conta; recebe token efêmero para presença e estado.
- O professor consulta a quantidade e o nome de participantes recentemente conectados ao Aulas.
- O professor pode renovar seu link privado (invalida o anterior) e encerrar a sala no **Aulas**.
- A interface continua com vídeo e microfone por VDO.Ninja em iframe.
- A sala é temporária (12 horas); os dados ficam em memória e serão perdidos se o servidor reiniciar.
- Testes automatizados de permissões, rotação, encerramento, CORS e expiração.

## Regra de acesso sem instalação

**Professor e aluno precisam somente de navegador com HTTPS e câmera/microfone.** O serviço Node.js roda no provedor do backend, não no computador de cada usuário. A compilação do site continua acontecendo no GitHub Actions.

## Modo de compatibilidade quando a API não está hospedada

Por padrão, `VITE_AULAS_API_URL` não foi configurado no Pages. Nesse caso:
- O Aulas permanece utilizável como **sala audiovisual de teste**, como no Sprint 2.
- Criar sala e compartilhar convite continuam funcionando.
- **Não** há proteção de professor, lista de presença confiável ou encerramento controlado.
- A interface mostra aviso explícito de modo audiovisual de teste.

Isso evita que a implantação do Sprint 3 interrompa a sala de vídeo existente. Também evita oferecer um **falso link secreto sem servidor**.

## Hospedagem preparada para testes

Foi criado [render.yaml](../render.yaml), que permite ao responsável colocar a API no Render através do botão [Implantar no Render](https://render.com/deploy?repo=https://github.com/pscfredteixeira/aulas). Veja o [passo a passo sem terminal](IMPLANTAR-API.md).

O **plano Free hiberna** quando o serviço fica inativo. Como as salas ainda estão em memória, a hibernação/reinicialização apaga salas: o sistema ainda não está pronto para uso real.

## Como ativar o Sprint 3 em ambiente remoto de teste

1. Hospedar `apps/server` em uma infraestrutura que rode Node.js persistentemente, com HTTPS de verdade. Configurar `AULAS_ALLOWED_ORIGINS=https://pscfredteixeira.github.io` e `PORT` conforme o provedor.
2. Confirmar que `https://SEU-BACKEND/api/health` retorna `{"ok":true,...}`. A rota não autentica e não revela salas.
3. No GitHub do projeto: **Settings → Secrets and variables → Actions → Variables → New repository variable**. Criar `AULAS_API_URL` apontando para a origem HTTPS do backend (sem barra final), por exemplo `https://api.exemplo.com`.
4. Executar **Publicar Aulas no GitHub Pages** em **Actions**, branch `main`. O workflow injeta `vars.AULAS_API_URL` como `VITE_AULAS_API_URL` no build do frontend.
5. Abrir https://pscfredteixeira.github.io/aulas/ e conferir se aparece **Sala de aula · Sprint 3** (e não modo de teste).
6. Professor cria sala, copia separadamente o **link de aluno** e o **link privado de professor**. Testar com outro navegador/dispositivo.
7. Aluno tenta `close` e `rotate` usando apenas o próprio token: ambos devem ser negados. Testar a revogação do segredo antigo.
8. Testar encerramento e reentrada, incluindo o aviso de que uma aba externa do VDO.Ninja **não é desconectada por esse comando**.

**Nenhum desses passos precisa ser realizado por professores ou alunos.** Apenas a implantação inicial do servidor é feita por quem administra o projeto. Sem infraestrutura externa o GitHub Pages não consegue executar essa API.

## Riscos e limitações

**A proteção dos links vale para a API do Aulas, não para a infraestrutura do VDO.Ninja.** Quem conhece o identificador de vídeo pode tentar acessar diretamente o VDO.Ninja, inclusive depois de encerrar uma sala no Aulas. Portanto, **não usar para conteúdo sigiloso**, não considerar a chamada moderada por senha e não afirmar que “encerrar” remove todas as pessoas da chamada. Isso exigirá etapa separada de moderação audiovisual.

Ainda não há quizzes, banco persistente, autenticação por conta, gravação, lista de presença baseada na atividade real da câmera ou proteção contra participantes que mentem sobre o nome. O resumo de participantes é atualizado em intervalos de aproximadamente nove segundos e pode ficar momentaneamente desatualizado.

## Critérios de aceite

- [x] API com separação de permissões, código enviado ao GitHub.
- [x] Links de professor e aluno separados na interface.
- [x] Comandos administrativos verificam papel no backend.
- [x] Renovar segredo invalida o link anterior (teste automatizado).
- [x] Aluno não pode encerrar sala pelo endpoint da API (teste automatizado).
- [x] Frontend mantém fallback de vídeo quando a API não está configurada.
- [ ] Hospedar o backend e informar URL pública HTTPS.
- [ ] Configurar `AULAS_API_URL` no GitHub e publicar com API.
- [ ] Testar interface real em duas sessões com servidor remoto.
- [ ] Verificar manualmente que o controle de encerramento corresponde ao estado do Aulas (não à moderação do VDO.Ninja).

O Sprint 4 (quizzes) deve esperar a API remota estar disponível para evitar desenvolver sincronização de atividade sem um serviço acessível aos alunos.
