# Visão do projeto Aulas

## Problema

Videochamadas tradicionais permitem conversa, mas atividades pedagógicas frequentemente exigem que a turma deixe a chamada, abra outra página ou que o professor consolide respostas manualmente.

## Proposta

Uma sala de aula web em que todas as pessoas podem participar por câmera e microfone e em que o professor conduz interações no mesmo ambiente: quizzes, enquetes e, depois, atividades abertas e estudos de caso.

O Aulas é **produto independente**; sua integração com o Atelier é uma etapa futura. Deve servir a professores de diferentes disciplinas, não ser limitado a um único curso ou área de conhecimento.

## Pessoas e jornadas

### Professor (sem conta, primeira versão)

1. Acessa a página e informa um nome de exibição.
2. Cria uma sala e recebe um link de controle privado e um link de participação.
3. Envia o link de participação à turma.
4. Entra com câmera e microfone, conduz a aula e, quando desejar, libera um quiz.
5. Visualiza o andamento das respostas, encerra o quiz e opcionalmente revela o gabarito.
6. Reabre a sala com a credencial privada, se necessário.

### Aluno (sem conta)

1. Abre o convite, informa um nome e testa os dispositivos.
2. Entra na sala com vídeo e áudio, com controles de silenciamento.
3. Quando o professor libera uma atividade, responde sem sair da chamada.
4. Vê o resultado somente quando o professor liberar sua exibição.

### Administrador da plataforma

Não haverá painel de administrador na primeira versão. Monitoramento técnico e gestão operacional são responsabilidades de manutenção, sem acesso arbitrário aos resultados das aulas.

## Princípios

- **Baixa fricção:** não exigir cadastro para testar ou participar.
- **Professor controla o ritmo:** atividades acionadas manualmente.
- **Câmeras presentes:** vídeo e áudio continuam durante o quiz.
- **Acessibilidade:** interface em português, teclado, contraste e textos legíveis.
- **Privacidade por padrão:** mínimo de dados necessários; não gravar mídia automaticamente.
- **Separação de responsabilidades:** VDO.Ninja transporta mídia; Aulas conduz atividades e permissões.
- **Expansível:** aulas/atividades descritas em formato versionado para futura integração com o Atelier.

## Restrições conhecidas

- A experiência com seis câmeras depende de dispositivos, navegador, rede e topologia escolhida pelo VDO.Ninja; será medida na prática.
- Permissões de câmera/microfone e reprodução automática podem variar entre desktop, iOS e Android.
- Integração de controles da chamada por iframe precisa de protótipo e validação, sem assumir que toda ação será exposta pela API.
- Link secreto sem login não oferece a mesma segurança nem a mesma recuperação de conta que um sistema com autenticação.

## Indicadores de sucesso do primeiro protótipo

- Professor cria uma sala e recebe links separados.
- Seis pessoas conseguem entrar no teste combinado.
- Todas podem se comunicar por áudio/vídeo em condições de teste documentadas.
- Uma pergunta aparece na tela de participantes conectados.
- Respostas chegam ao professor com contagem correta.
- Recarregar a página não deve duplicar votos.
- Usuário com convite de aluno não consegue acionar ações administrativas.
