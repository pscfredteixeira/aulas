# Aulas · Frontend — Sprint 2

Protótipo web de videoaula em React, TypeScript e Vite. Usa VDO.Ninja em iframe para conversas em grupo; não implementa quizzes ou autorização de professor.

## Usar como professor ou aluno\n\nNão é necessário instalar nada: depois da publicação pelo GitHub Pages, basta abrir o link HTTPS da plataforma, criar ou entrar na sala, informar um nome e autorizar câmera/microfone. O Node.js fica exclusivamente no build do GitHub ou em servidores internos.\n\nConsulte [Sprint 2 — publicação](../../docs/SPRINT-2.md#publicação-online-sem-instalação).\n\n## Executar localmente (opcional, para desenvolvedores)

```bash
npm install
npm run dev
```

Abra `http://localhost:5173` no computador. Para uso em outro aparelho, hospede em HTTPS. O VDO.Ninja usa infraestrutura externa para estabelecer as chamadas.

## Verificar

```bash
npm run test
npm run build
```

**Atenção:** esses comandos não comprovam que áudio e vídeo funcionam em múltiplos dispositivos. Consulte [o roteiro de teste](../../docs/SPRINT-2.md).

## Privacidade

- Nenhuma mídia é transmitida para o backend do Aulas, pois ainda não há backend.
- O vídeo/áudio é operado pelo VDO.Ninja; leia a política e documentação do serviço antes de usar com turmas reais.
- Códigos de sala **não** são senhas; não há moderação ou autenticação nesta versão.
- Esta versão não é indicada para discussões confidenciais ou coleta de dados sensíveis.
