# Colocar o servidor de salas no ar sem instalar nada

## O que isso ativa

O frontend do Aulas já está no GitHub Pages. Para ativar o link **privado do professor**, a renovação desse link e o controle de sala, precisamos hospedar o backend `apps/server`. O Pages **não executa servidor Node.js**.

Preparamos um arquivo [render.yaml](../render.yaml) para criar essa API no **Render**, um serviço de hospedagem que instala e executa Node.js nos próprios servidores, não nos computadores dos professores/alunos.

**Atenção:** o plano Render gratuito hiberna quando não recebe solicitações por aproximadamente 15 minutos. O nosso backend atual guarda salas **na memória**, por isso a hibernação, um deploy ou uma reinicialização pode apagar salas ativas. É somente uma implantação de **teste**; não utilizar ainda para aulas reais ou dados sensíveis.

## 1 — Criar a API no Render

1. Entre em **https://render.com/deploy?repo=https://github.com/pscfredteixeira/aulas**.
2. Entre ou crie uma conta Render e conecte sua conta GitHub (a ação é somente do administrador do projeto).
3. Confira no resumo que há **um web service** com nome `aulas-api`, no plano **Free**, usando o diretório `apps/server`. **Não aceite cobrança nem troque para plano pago sem avaliar antes.**
4. Clique para aplicar/deploy da Blueprint e confira se os testes/health check passaram.
5. Abra a URL HTTPS fornecida pelo Render. Ela normalmente termina em `.onrender.com`, mas **use a URL EXATA mostrada no seu painel**, não presuma um endereço.
6. Acrescente `/api/health` ao final e confirme que aparece um JSON com `"ok":true`.

Se não houver plano gratuito disponível ou o Render solicitar pagamento, não avance automaticamente: podemos avaliar outro provedor.

## 2 — Apontar o site Aulas para a API

1. Abra [GitHub Actions – variáveis do repositório](https://github.com/pscfredteixeira/aulas/settings/variables/actions).
2. Escolha **New repository variable**.
3. Nome: `AULAS_API_URL`; valor: **URL HTTPS exata do backend no Render**, por exemplo `https://algum-servico.onrender.com` (exemplo fictício; use sua URL real).
4. Salve.
5. Abra [GitHub Actions – Publicar Aulas no GitHub Pages](https://github.com/pscfredteixeira/aulas/actions/workflows/deploy-pages.yml).
6. Clique em **Run workflow**, escolha `main` e execute.
7. Depois de confirmar o deploy, abra **https://pscfredteixeira.github.io/aulas/** no navegador. A etiqueta da interface deverá dizer **Sala de aula · Sprint 3**, em vez de **Sala de teste · Sprint 3**.

Se a interface continuar na versão antiga, confira em **Settings → Pages** se a origem é **GitHub Actions**. O Pages não exige instalação local.

## 3 — Fazer um teste de ponta a ponta

1. No site Aulas, informe seu nome e clique em **Criar uma nova sala**.
2. Guarde **Copiar meu link privado**: é o único que permite encerrar/renovar link pelo Aulas. Não envie aos alunos.
3. Compartilhe **Copiar convite de aluno** com outro dispositivo/navegador.
4. No segundo aparelho, informe o nome e entre na videochamada. Confirme a comunicação de áudio/vídeo.
5. No painel do professor, observe a lista de alunos. A presença no Aulas é atualizada periodicamente e não comprova que a câmera está ativa.
6. Renove o link privado: o antigo deve deixar de autorizar comandos de professor.
7. Encerre a sala no Aulas e confirme que o aluno volta da tela de videochamada.
8. **Aviso:** encerrar a sala no Aulas não desconecta alguém que abriu a URL do VDO.Ninja em outra aba. O controle do provedor de vídeo ainda será aperfeiçoado.

## O que continua pendente

- O próprio Render precisa ser autorizado por quem controla a conta; **o repositório, por si só, não cria o serviço automaticamente**.
- A URL da API precisa ser definida como variável `AULAS_API_URL` pelo administrador do GitHub.
- Não há persistência: salas somem ao reiniciar/hibernar o servidor de teste.
- Não há sistema de quizzes até os próximos sprints.
- Não há restrição de acesso a quem souber o nome de sala diretamente no VDO.Ninja.
- Não há suporte validado para seis câmeras simultâneas em dispositivos variados.

## Arquitetura ao final

```text
Professor / alunos (somente navegador)
              │
              ├── HTTPS → GitHub Pages → interface React e iframe VDO.Ninja
              │
              └── HTTPS → Render → API de salas e permissões (Node.js)
```

## Referências

- [Render — documentação oficial de Blueprints](https://render.com/docs/infrastructure-as-code)
- [Render — free tier](https://render.com/docs/free)
- [GitHub Pages — publicação do frontend](SPRINT-2.md)
- [Sprint 3 — requisitos e limites de segurança](SPRINT-3.md)
