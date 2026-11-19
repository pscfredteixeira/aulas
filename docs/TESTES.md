# Critérios de aceite e plano de testes

## Sprint 1 — Documentação

- [x] Repositório identificado e README atualizado.
- [x] Visão do produto independente do Atelier.
- [x] Escopo MVP e itens fora de escopo.
- [x] Requisitos RF/RNF documentados.
- [x] Arquitetura proposta, incluindo separação entre mídia e quizzes.
- [x] Sem cadastro, com distinção professor/aluno e cuidados de segurança.
- [x] Roadmap incremental e roteiro inicial de testes.
- [x] Exemplo JSON de aula versionada.
- [ ] Código da plataforma: **não é objetivo do Sprint 1**.

## Testes de aceitação do protótipo futuro

### T01 — Entrada simples
**Dado** um convite de aluno, **quando** abrir pelo navegador e informar um nome, **então** conseguir entrar sem conta e ver instruções de câmera/microfone.

### T02 — Teste audiovisual real
**Dado** duas pessoas em computadores diferentes, **quando** entrarem na sala, **então** as duas conseguirão se ver e conversar. Registrar navegadores, rede, atrasos e erros.

### T03 — Turma com seis pessoas
**Dado** seis dispositivos/navegadores reais, **quando** entrarem simultaneamente, **então** medir quantas câmeras/áudios funcionam e registrar consumo/perdas. **Critério exploratório:** não anunciar suporte definitivo antes de confirmar.

### T04 — Acesso do aluno não administra
**Dado** um link de aluno, **quando** tentar emitir `quiz:open`, `quiz:close` ou `room:end`, **então** servidor nega, independentemente de alteração do frontend.

### T05 — Quiz durante chamada
**Dado** vídeo/áudio funcionando, **quando** professor abrir um quiz, **então** participantes visualizam pergunta sem sair da sala nem perder mídia.

### T06 — Votação
**Dado** quiz aberto, **quando** aluno votar, **então** servidor confirma uma resposta e atualiza totais do professor. Segundo envio do mesmo participante no mesmo quiz segue a regra explícita sem duplicar contagem.

### T07 — Encerra e revela
**Dado** um quiz aberto, **quando** professor encerrar, **então** votos posteriores são rejeitados; quando revelar, a turma vê o resultado liberado.

### T08 — Reconexão
**Dado** quiz em andamento, **quando** um aluno recarregar a página, **então** recebe estado atual e não duplica resposta existente.

### T09 — Falha de mídia
**Dado** câmera negada ou microfone indisponível, **quando** entrar, **então** interface explica o problema, permite tentar novamente e não quebra atividades.

### T10 — Dispositivo móvel
**Dado** Safari iOS e Chrome Android em aparelhos reais, **quando** entrar e responder, **então** interface permanece utilizável sem sobreposições críticas. Registrar qualquer limitação da integração de mídia.

### T11 — Revogação
**Dado** segredo administrativo revogado/expirado, **quando** alguém tentar administrá-la com ele, **então** backend nega.

### T12 — Privacidade
**Dado** uma aula padrão, **quando** encerrar, **então** sistema não criou gravações de áudio/vídeo e não exibiu credenciais em logs.

## Modelo para relatórios dos testes futuros

```text
Data:
Versão/commit:
Teste:
Ambiente (SO, navegador, dispositivo):
Quantidade de participantes:
Resultado: passou / falhou / parcial
Evidências:
Problemas observados:
Próxima ação:
```

Nenhum dos testes de execução T01–T12 foi realizado neste Sprint 1.

### T13 — Acesso sem instalações
**Dado** um computador ou celular com navegador moderno e conexão à internet, **quando** professor ou aluno abrir o endereço HTTPS do Aulas, **então** deve acessar a interface sem instalar Node.js, executar comandos ou baixar extensões/aplicativos, precisando apenas conceder acesso a câmera/microfone para usar vídeo. Testar em computador sem ambiente de desenvolvimento instalado.

### T14 — Publicação automática
**Dado** código atualizado em `apps/web`, **quando** o workflow de GitHub Pages executar, **então** os testes e o build devem passar, a publicação deve concluir, e a página deve carregar com recursos estáticos no caminho `/aulas/`. Validar link no navegador: workflow verde não substitui inspeção do site.
