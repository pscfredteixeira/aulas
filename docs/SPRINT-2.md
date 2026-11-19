# Sprint 2 — Prova audiovisual

## Estado

Código do primeiro protótipo enviado para `apps/web` em 19/11/2026. O app ainda não foi validado em uma chamada real entre dois dispositivos: testes de câmera, microfone, browsers e seis participantes **pendentes**.

## O que já existe no código

- Interface React + TypeScript + Vite, responsiva e em português.
- Criar sala com identificador aleatório usando a API criptográfica do navegador.
- Entrar por convite sem cadastro, informando nome.
- Compartilhar URL de participação.
- Teste **opcional** de câmera e microfone com prévia local; os tracks usados no teste são encerrados antes de abrir o VDO.Ninja.
- Abrir sala de grupo no VDO.Ninja dentro de iframe autorizado a solicitar câmera/microfone.
- Acesso alternativo à sala no site do VDO.Ninja em nova aba.
- Sair da sala desmontando o iframe.
- Testes automatizados dos utilitários de URL e código de sala.

## O que este protótipo NÃO oferece

- Ainda não diferencia permissões de professor e aluno. O botão “criar sala” é apenas conveniência.
- Sem link administrativo seguro, moderação, login ou controle de participantes.
- Sem quizzes, sincronização de respostas ou servidor próprio.
- Nome e código da sala **não autenticam** identidade.
- A sala do VDO.Ninja pode ser acessada diretamente; o código da sala não é senha.
- Não foi comprovada a estabilidade com seis câmeras, em Safari iOS, Chrome Android ou rede lenta.
- O status de carregamento do iframe não significa conexão de mídia bem-sucedida.

## Publicação online sem instalação\n\n**Regra do projeto:** professor e aluno acessam o Aulas pelo navegador, sem Node.js, terminal ou aplicativos. O Node.js é ferramenta de compilação do GitHub, não requisito de uso.\n\nO arquivo [deploy-pages.yml](../.github/workflows/deploy-pages.yml) foi criado para publicar automaticamente o React/Vite no GitHub Pages, com testes e compilação no GitHub Actions. Endereço publicado (primeiro deploy concluído): **https://pscfredteixeira.github.io/aulas/**. O [workflow de publicação](https://github.com/pscfredteixeira/aulas/actions/runs/44595144704) confirmou o resultado, mas o teste de navegador e videochamada ainda não foi executado. A configuração de base `/aulas/` está no Vite.\n\n**Se a configuração do Pages mudar no futuro:** abrir o repositório → **Settings → Pages → Build and deployment → Source → GitHub Actions**. Após selecionar, executar/reexecutar o workflow **Publicar Aulas no GitHub Pages** em **Actions**. Verificar sucesso e abrir o site em dois aparelhos. Uma execução verde de `npm run build` não comprova que o site foi publicado ou que a chamada funciona.\n\nQuando o site estiver online, basta professor criar sala e enviar o convite HTTPS ao aluno, que entra sem instalar nada e apenas autoriza câmera/microfone. O uso em computador local abaixo é **opcional e exclusivo de desenvolvimento**.\n\n## Como executar localmente (opcional, somente para desenvolvedores)

Requisitos de desenvolvimento local: Node.js **22.12+** e npm. Professores e alunos **não precisam** deles.

```bash
git clone https://github.com/pscfredteixeira/aulas.git
cd aulas/apps/web
npm install
npm run dev
```

Abra `http://localhost:5173` e clique em **Criar uma nova sala**. Digite seu nome e selecione **Entrar na videoaula**. No quadro do VDO.Ninja, faça a confirmação de entrada que o serviço solicitar.

Para participar de outro aparelho fora da máquina local, é necessário **publicar o frontend com HTTPS**; usar `http://IP-LOCAL:5173` pode impedir acesso à câmera/microfone. O link de convite só funciona para outras pessoas quando a página está acessível no endereço publicado. Não envie convites que comecem por localhost.

```bash
npm run test
npm run build
```

`npm run test` verifica apenas utilitários locais (códigos e URLs), **não** faz chamada audiovisual de verdade.

## Roteiro de teste manual

1. Em um computador: `npm run dev`, abrir localhost, criar sala e entrar com câmera e microfone.
2. Confirmar que o VDO.Ninja abre no iframe e solicita os dispositivos necessários.
3. Usar o link de convite **depois de publicar em HTTPS** num segundo dispositivo e informar outro nome.
4. Confirmar que participantes se veem e se ouvem nos dois sentidos. Preferir fones para evitar microfonia.
5. Fechar a chamada em um aparelho e conferir se o outro percebe a saída.
6. Negar permissão de câmera e verificar instruções de erro.
7. Testar abertura da sala em nova aba, caso o iframe apresente falhas.
8. Repetir em Safari iOS e Chrome Android.
9. Se dois participantes funcionarem, tentar até seis participantes e registrar limitações de CPU/rede.

Para cada teste, preencher modelo do [plano de testes](TESTES.md).

## Critérios para marcar Sprint 2 concluído

- [x] Aplicativo frontend escrito e versionado.
- [x] Página de entrada com nome e convite por link.
- [x] Integração inicial do iframe VDO.Ninja.
- [x] Teste de dispositivos e tratamento de erro.
- [x] Testes unitários de códigos/URLs incluídos.
- [x] Instalação/build e testes aprovados no GitHub Actions (compilação automática).\n- [x] Workflow de publicação no GitHub Pages criado.\n- [x] Deploy confirmado com sucesso pelo GitHub Actions e URL de ambiente declarada pelo workflow.\n- [ ] Verificar manualmente o carregamento da interface no endereço público em navegador real.
- [ ] Teste de vídeo/áudio **real**, em dois dispositivos.
- [ ] Registrar resultado e limitações dos testes em mobile.
- [ ] Teste exploratório com até seis pessoas, quando disponível.

**Não declarar Sprint 2 integralmente concluído antes de cumprir os critérios de execução.**

## Decisão para Sprint 3

Implementar servidor e permissões seguras para papel de professor. **Não** reaproveitar o mesmo link de aluno como acesso administrativo. Link administrativo deve ter segredo forte, verificação no servidor e possibilidade de revogação.

## Referências externas

- https://docs.vdo.ninja/getting-started/rooms
- https://docs.vdo.ninja/guides/iframe-api-documentation
- https://docs.vdo.ninja/advanced-settings/setup-parameters/room
- https://docs.vdo.ninja/advanced-settings/setup-parameters/label
