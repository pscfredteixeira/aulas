# Firebase no Aulas — persistência das salas

**Estado (20/11/2026):** **Cloud Firestore ativo no Render**. O usuário configurou a conta de serviço diretamente nas variáveis privadas, sem compartilhar a chave aqui; o Render confirmou `Firestore ativado para persistência de salas.` e a API passou no teste público de criação, votos e leitura de resultados. Teste externo de reinício durante uma aula real ainda pendente.

## Arquitetura

- **GitHub Pages:** publica a interface do Aulas; não contém credenciais Firebase.
- **VDO.Ninja:** transmite câmera e microfone.
- **Render:** executa a API e verifica links de professor/aluno.
- **Firebase Cloud Firestore:** armazena temporariamente salas, hashes dos tokens dos participantes e perguntas, preservando-os entre reinícios do Render.

**Não é necessário instalar nenhum programa** para professor ou aluno, nem criar conta no Firebase para eles. Somente a API fala com o Firestore. Não colocar o SDK Admin no frontend.

## Como reconfigurar ou migrar no futuro (já realizado)

1. Abra https://console.firebase.google.com/ e escolha **Criar projeto** ou um projeto já seu. Comece pelo plano **Spark (sem custo)**, sem aceitar upgrade de cobrança.
2. No projeto, vá a **Build → Firestore Database → Create database**. Para este projeto, use **Standard edition**. Defina uma localização adequada e **regras fechadas para acesso direto de clientes**. O Admin SDK no servidor utiliza credenciais IAM, não as regras do frontend.
3. No Firebase, entre em **Configurações do projeto → Contas de serviço → Firebase Admin SDK → Gerar nova chave privada**. **Nunca coloque o arquivo JSON no GitHub, no frontend, no chat ou em uma URL pública.** Guarde-o em local seguro.
4. Em [Render → aulas-api](https://dashboard.render.com/web/srv-dbvl8mnlk1mc73e32b50), vá a **Environment** e adicione uma variável *secreta* chamada exatamente `FIREBASE_SERVICE_ACCOUNT_JSON` com o **conteúdo inteiro** do JSON da conta de serviço, incluindo as chaves e aspas. Salve a configuração, o que fará o serviço ser reimplantado. Não adicione essa variável ao GitHub Actions nem ao Vite.
5. Confirme em https://aulas-api-vrdo.onrender.com/api/health que a resposta inclui `"persistent":true`.
6. Crie uma **nova** sala de teste no Aulas e entre pelo link de aluno. Confirme a presença e abra um quiz.
7. Após reiniciar o serviço no Render, tente entrar novamente na mesma sala em outro navegador: a sala e o quiz devem continuar disponíveis até o prazo de expiração de 12 horas, a menos que tenham sido encerrados.

### Segurança

A credencial de conta de serviço possui privilégios elevados. Não copie o arquivo para o repositório, não o envie a outras pessoas, nem inclua seu conteúdo em perguntas de suporte. Idealmente, com a arquitetura madura, substituiríamos a chave estática por identidade federada entre Render e Google Cloud.

O Firestore guarda **hashes SHA-256** dos segredos administrativos e de aluno, nunca os tokens em texto puro. O registro de cada voto usa o ID efêmero da participação, não o nome pessoal do aluno. Os registros são excluídos quando expiram e são acessados; a limpeza também roda periodicamente. Não utilizar para informações clínicas, diagnósticos, prontuários ou aulas com dados pessoais sensíveis. O acesso direto à sala VDO.Ninja não está protegido pelas permissões do Aulas.

### Custos e limites

O Spark tem uma cota de uso sem custo para Firestore Standard — entre outros limites, **50.000 leituras e 20.000 gravações de documentos por dia** conforme a documentação vigente. Nosso frontend consulta a API, não o Firestore diretamente; a API mantém cache em memória entre requisições para economizar leituras. Conferir as cotas atuais e o painel de consumo antes de ampliar a turma.

A API atual usa uma instância Render; gravações são serializadas por sala, mas **ainda não implementamos coordenação distribuída** entre múltiplas instâncias nem migração automática de salas antigas. O armazenamento do Firestore **não impede** que o Render gratuito hiberne — apenas permite recuperar salas quando acordar.

## Sobre o banco PostgreSQL do Render

Um PostgreSQL de teste no plano Free foi criado durante a análise anterior, mas **não foi conectado ao Aulas**. Ele não é necessário para a solução Firestore e expira automaticamente em 19/12/2026 segundo o painel Render. Não promover esse banco para plano pago. O proprietário pode eliminá-lo pelo painel Render se preferir.

## Verificação automatizada

`apps/server/tests/server.test.mjs` testa um armazenamento simulado que preserva a sala, o token de aluno e o quiz depois de recriar o servidor; isso cobre o caminho de recuperação no código, foi complementado por um teste automatizado contra a API pública com Firestore ativo, que criou sala, registrou dois votos, apurou e revelou resultados. **Ainda é necessário verificar uma aula e um reinício real em dois dispositivos.**

## Documentação de referência

- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/firestore/quickstart-server
- https://firebase.google.com/docs/firestore/quotas
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
