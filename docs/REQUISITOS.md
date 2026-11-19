# Requisitos — Aulas

Identificadores: `RF` funcional, `RNF` não funcional. **MVP** é o primeiro protótipo testável. Não confundir planejado com implementado.

## Funcionais do MVP

| ID | Prioridade | Requisito | Aceitação resumida |
|---|---|---|---|
| RF-01 | MVP | Criar uma sala e gerar ID não previsível | URLs de aluno e professor distintas |
| RF-02 | MVP | Entrar como aluno sem cadastro, com nome de exibição | Entrada pelo navegador, sem email/senha |
| RF-03 | MVP | Entrar como professor usando credencial privada | Comandos administrativos exigem validação no servidor |
| RF-04 | MVP | Exibir vários participantes com vídeo e áudio via VDO.Ninja | Teste documentado com seis pessoas |
| RF-05 | MVP | Controles de câmera/microfone e prévia antes de entrar | Participante entende o estado de seus dispositivos |
| RF-06 | MVP | Professor inicia quiz de única escolha | Pergunta e quatro alternativas visíveis a todos |
| RF-07 | MVP | Cada aluno envia uma resposta para quiz ativo | Recebimento confirmado, sem voto duplicado por reconexão |
| RF-08 | MVP | Professor acompanha total de respostas e encerra quiz | Ações e status refletidos em tempo real |
| RF-09 | MVP | Professor revela resposta correta ou resultados | Alunos veem resultado somente após liberação |
| RF-10 | MVP | Participante reconectado recupera o estado atual da atividade | Não exibe atividade encerrada como aberta |
| RF-11 | MVP | Professor encerra sala | Sala encerra comandos e ingressos conforme regra implementada |
| RF-12 | MVP | Tratar erros de permissões ou falha de mídia | UI avisa e propõe tentar novamente |

## Depois do MVP

| ID | Requisito | Possível etapa |
|---|---|---|
| RF-13 | Perguntas abertas e estudos de caso | Sprint 6 |
| RF-14 | Enquetes sem gabarito | Sprint 6 |
| RF-15 | Biblioteca reutilizável de atividades | Sprint 7 |
| RF-16 | Salvar planos de aula em JSON | Sprints 7–8 |
| RF-17 | Importar/exportar conteúdos com o Atelier | Sprint 8 ou integração posterior |
| RF-18 | Contas de professor e histórico persistente vinculado | Versão posterior, se necessário |
| RF-19 | Moderação avançada e gerenciamento de turmas grandes | Fase posterior |
| RF-20 | Relatórios e exportação de resultados agregados | Fase posterior |

## Não funcionais do MVP

- **RNF-01 Segurança:** HTTPS, credencial de professor forte, autorizações no backend, expiração/revogação, limitações contra tentativas abusivas.
- **RNF-02 Privacidade:** coletar só o necessário, não gravar áudio/vídeo por padrão e definir retenção mínima de resultados; documentar serviço externo de vídeo.
- **RNF-03 Usabilidade:** interface clara em desktop e celular, inclusive quando a tela é estreita e seis vídeos estão conectados.
- **RNF-04 Acessibilidade:** foco por teclado, rótulos de controles, contraste adequado e estados descritos por texto.
- **RNF-05 Consistência:** estados de quiz controlados pelo servidor (rascunho → aberto → encerrado → revelado).
- **RNF-06 Confiabilidade:** reconexão de Socket.IO e sincronização do estado atual; idempotência de envio.
- **RNF-07 Compatibilidade:** validar Chrome/Edge desktop, Safari iOS e Chrome Android; registrar limitações reais.
- **RNF-08 Observabilidade:** logs técnicos sem códigos secretos, respostas individuais desnecessárias ou mídia.
- **RNF-09 Evolução:** contratos versionados para os arquivos de aula; não acoplar estrutura ao Atelier.
- **RNF-10 Desempenho:** meta inicial de teste com seis participantes, sem promessa de escala automática.
- **RNF-11 Acesso sem instalação (obrigatório e permanente):** professores e alunos usam a plataforma no navegador moderno por HTTPS, sem instalar Node.js, extensões, programas ou executar comandos; concedem apenas permissões de câmera e microfone necessárias.
- **RNF-12 Publicação contínua do frontend:** o GitHub Actions compila e publica o site estático no GitHub Pages após atualizações do código, sem intervenção dos usuários finais.

## Decisões pendentes

1. Link de acesso do professor: segredo recuperável apenas por posse do link; projeto precisa de revogação, expiração e tratamento de compartilhamento indevido.
2. Como VDO.Ninja será incorporado para conversa em grupo nos principais navegadores — validar no Sprint 2.
3. Frontend: GitHub Pages com GitHub Actions. Backend de salas implementado no Sprint 3; falta hospedagem remota persistente com HTTPS. O armazenamento em memória é temporário e será substituído por persistência adequada antes de uso real em escala.
4. Retenção de respostas e aviso de privacidade — definir antes de teste externo.
5. Identificar participantes com mesmo nome e reconexões sem criar contas.

## Fora de escopo agora

Sistema de assinatura, cobrança, certificados, edição colaborativa, análise automatizada de alunos, gravação de aulas, IA e LMS completo.
