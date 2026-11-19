# Roadmap de desenvolvimento — Aulas

Planejamento incremental. Um sprint termina apenas quando seus critérios de aceite forem verificados. Número de sprint **não representa duração fixa**.

## Sprint 1 — Fundação e planejamento

**Objetivo:** transformar a ideia em plano verificável.

Entregas:
- README do projeto.
- Visão e perfis de professor/aluno.
- Requisitos com prioridades e limites do MVP.
- Arquitetura proposta, fluxos, privacidade e segurança sem login.
- Roadmap e cenários de teste.
- Exemplo de aula JSON para evolução futura.

**Critério de aceite:** documentos versionados no GitHub, com links navegáveis, sem afirmar que protótipo já existe. **Estado: concluído em documentação; nenhuma funcionalidade de aplicação implementada.**

## Sprint 2 — Prova de conceito audiovisual

**Objetivo:** confirmar que o VDO.Ninja funciona dentro de uma página própria.

- Iniciar frontend React/TypeScript/Vite.
- Tela inicial simples para entrar com nome e testar dispositivos.
- Integrar sala de vídeo com professor e participantes.
- Configurar publicação automática do site pelo GitHub Pages usando GitHub Actions; verificar resultado do deploy e configurar a origem Pages se necessário.
- Investigar controles e limites do iframe.
- Documentar o que funciona no desktop, Safari iOS e Chrome Android.
- Teste com **duas pessoas** primeiro, depois até **seis**, sem exigir que a integração de quiz esteja pronta.

**Pronto quando:** frontend publicado via HTTPS e comunicação de vídeo e áudio comprovada em teste real em dois dispositivos, com limitações registradas; seis pessoas são **meta do teste ampliado**, não promessa de suporte. A publicação do código, sozinha, não valida a chamada.

## Sprint 3 — Sala e papéis sem cadastro

**Objetivo:** transformar a prova audiovisual em sala gerenciável.

- Criar sala com identificador seguro.
- Link de aluno separado do segredo do professor.
- Autorização administrativa no backend.
- Entrada/saída, identificação efêmera, encerramento, revogação.
- Aviso de privacidade e testes básicos de acesso indevido.

**Pronto quando:** URL de aluno não consegue exercer controle de professor, mesmo manipulando requisições. **Código e testes de servidor implementados**; falta hospedar a API em HTTPS e testar com pessoas reais. O GitHub Pages, sem backend configurado, fica no modo audiovisual de teste. Ver [Sprint 3](SPRINT-3.md).

## Sprint 4 — Construção e exibição de quiz

**Objetivo:** criar primeiro tipo de atividade.

- Pergunta com quatro alternativas e uma resposta correta.
- Professor cria/seleciona quiz e inicia/encerra.
- Estado de atividade no servidor.
- Interface legível ao lado de vídeo, inclusive no celular.

**Pronto quando:** professor inicia pergunta e aluno consegue visualizar durante a chamada.

## Sprint 5 — Resposta em tempo real

**Objetivo:** fechar o ciclo de interação.

- Socket.IO para publicar pergunta, receber respostas e atualizar totais.
- Autorização por papel, anti-duplicação e reconexão.
- Professor decide quando revelar resultados.
- Testar inconsistências, simultaneidade e perda de conexão.

**Pronto quando:** professor vê quantos responderam e os resultados são consistentes após recarregar páginas.

**Marco MVP:** ao fim do Sprint 5, haverá uma primeira versão testável de uma aula com vídeo e quiz. A meta de seis participantes depende de validação de desempenho e estabilidade.

## Sprint 6 — Atividades pedagógicas adicionais

- Enquete sem gabarito.
- Pergunta aberta com moderação do professor.
- Estudo de caso e discussão orientada.
- Não exigir que professor interrompa a chamada para alternar modalidades.

## Sprint 7 — Biblioteca de aulas e atividades

- Salvar e reutilizar questões.
- Estrutura versionada de conteúdo, importação/exportação JSON.
- Escolher onde guardar conteúdo sem exigir login; considerar risco de perda e acesso por link.

## Sprint 8 — Preparação para o Atelier

- Definir contrato de importação/exportação de planos e atividades.
- Validar versões antigas do JSON.
- **Não** implementar integração direta até existir API/interface estável do Atelier.
- Não compartilhar respostas individuais por padrão.

## Sprint 9 — Testes externos e preparação de produção

- Piloto com professores de áreas diferentes.
- Auditoria de fluxos de acesso por link, privacidade e retenção.
- Testes de compatibilidade, redes lentas e comportamento com múltiplas câmeras.
- Consolidar infraestrutura de produção (frontend já publicado desde o Sprint 2, backend WebSocket persistente e monitoramento).
- Documentação de uso e solução de problemas.

## Decisões para cada entrega

Ao encerrar um sprint, registrar:
1. O que efetivamente foi implementado.
2. Como testar e o resultado observado.
3. Restrições, riscos e pendências.
4. Próximo passo e regressões a revalidar.

## Ordem de priorização

**Essencial:** áudio/vídeo, sala sem cadastro com controle seguro, quiz e respostas sincronizadas.  
**Depois:** mais tipos de atividades e biblioteca.  
**Por último:** integração Atelier, recursos avançados e escala.

## Regra permanente de distribuição

Professores e alunos não instalam Node.js, aplicativos ou extensões: acessam o Aulas pelo navegador em HTTPS e autorizam câmera/microfone. O Node.js é usado somente na automação de build e, futuramente, no servidor de quizzes; nunca é requisito para participantes.
