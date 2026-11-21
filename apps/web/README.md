# Aulas — Frontend React/Vite (Sprint 6)

A plataforma de videoaulas funciona no navegador sem conta ou instalação. O GitHub Pages publica o frontend; o **VDO.Ninja** transmite vídeo/áudio e a **API hospedada no Render** sincroniza salas, questões e votos pelo **Firebase Firestore**.

## Como participar

**Professor:** abrir https://pscfredteixeira.github.io/aulas/, digitar nome e criar uma sala. A plataforma gera **link privado do professor** (administração) e **convite de alunos** (sem segredos). Guardar o primeiro; compartilhar somente o segundo. O professor prepara questão de quatro alternativas, abre a votação, acompanha contagem, encerra e decide quando revelar gabarito.

**Aluno:** clicar no convite, digitar nome, clicar em **Entrar na videoaula** e autorizar câmera/microfone. Quando surgir uma pergunta ao lado da chamada, clicar em uma alternativa. A resposta é registrada uma vez por token de participação; o resultado aparece quando o professor o revelar.

As alterações chegam com consultas de estado a cada **aproximadamente 3 segundos**. WebSocket ainda não foi implementado. Recarregar a mesma aba tenta reutilizar o token anterior; sair explicitamente encerra a participação.

## Desenvolvimento local opcional

```bash
cd apps/web
npm install
npm run test
npm run build
npm run dev
```

Somente desenvolvedores precisam instalar Node.js. O frontend utiliza `VITE_AULAS_API_URL` como origem da API (definida no workflow do Pages). Câmera/microfone exigem HTTPS ou localhost; a chamada é estabelecida pelo serviço externo VDO.Ninja.

## Privacidade e limites

O backend recebe nomes de exibição, identificadores efêmeros e votos, **não recebe os streams de áudio/vídeo**. O Firebase Admin SDK e sua credencial ficam somente no Render. A API não garante um voto por pessoa: um aluno pode criar outra participação em novo navegador. **Não usar como avaliação formal ou com dados clínicos/sensíveis.** Os controles administrativos não bloqueiam acesso direto ao VDO.Ninja por quem conhece o código da chamada.

## Enquetes e discussões (Sprint 6)

O professor alterna entre as abas **Quiz** e **Enquetes e discussões**, sem recarregar a videochamada. Na nova aba pode criar uma enquete de 2 a 4 alternativas, uma pergunta aberta ou um estudo de caso fictício com contexto. As contribuições escritas precisam de aprovação do professor antes de serem mostradas à turma; o nome de quem escreveu **não é exibido aos outros alunos**.

Ao abrir uma atividade, os alunos veem automaticamente o painel correspondente. Os textos são limitados a 600 caracteres e ficam vinculados a uma participação temporária. Não inclua dados clínicos ou outras informações sensíveis.

[Guia e testes do Sprint 6](../../docs/SPRINT-6.md).
