# Fellowship MCP Chatbot

Este repositorio contem a solucao final para o desafio do Fellowship, que consiste em um ecossistema de Agente de IA capaz de intermediar intencoes e realizacoes de compras utilizando a especificacao Model Context Protocol (MCP).

## Divisão de Tarefas

O projeto foi dividido e executado pela equipe da seguinte forma:
- **Dimitri Freitas**: Responsavel pelo Épico 1 (Construção do Servidor MCP de pagamentos, ferramentas de catálogo e controle de estado em memória).
- **João Matheus**: Responsavel pelo Épico 2 (Backend Orquestrador Node.js + LLM) e Épico 3 (Interface Frontend React e Integração Final).

## Requisitos para Uso

Para rodar este projeto em sua máquina, certifique-se de possuir:

1. Node.js (versão 18 ou superior recomendada).
2. Uma chave de API valida do Google AI Studio (Gemini).
3. Gerenciador de pacotes npm.

## Instruções de Configuração e Uso

### 1. Configuração das Variáveis de Ambiente

Na pasta `orquestrador`, crie ou edite o arquivo `.env` com as seguintes chaves:

```env
GEMINI_API_KEY=sua_chave_do_google_aqui
GEMINI_MODEL=gemini-3.1-flash-lite
MCP_SERVER_CMD=tsx
MCP_SERVER_ARGS=../mcp-server/src/mcpServer.ts
```

### 2. Instalação de Dependências

Abra terminais independentes e instale as dependências em cada um dos módulos do projeto:

Para o Servidor MCP:
```bash
cd mcp-server
npm install
```

Para o Orquestrador (Backend):
```bash
cd orquestrador
npm install
```

Para o Frontend:
```bash
cd frontend
npm install
```

### 3. Executando o Projeto

O projeto precisa ser executado em duas frentes simultâneas (o Orquestrador já sobe o Servidor MCP automaticamente via stdio).

Iniciando o Backend (Orquestrador + MCP):
```bash
cd orquestrador
npm run dev
```

Iniciando o Frontend:
```bash
cd frontend
npm run dev
```

Apos isso, abra o navegador e acesse a interface gráfica do frontend (padrao em `http://localhost:5173`).

### Fluxo de Uso

1. Na interface do Frontend, realize o Login fornecendo um identificador de usuário cadastrado na base compartilhada (ex: `Carlos Silva`). O sistema validará a existência da conta na fonte única de dados (`shared/db.ts`) e gerará um token JWT assinado contendo o `user_id` oficial (`user_carlos silva`).
2. Na tela de Chat, converse com o Assistente Financeiro.
3. Você pode pedir para consultar o catálogo de produtos disponíveis.
4. Para realizar uma compra, solicite ao assistente indicando qual produto quer comprar. Ele irá consultar o catálogo e acionar a ferramenta `registrar_intencao`.
5. Em seguida, informe a forma de pagamento ('pix' ou 'cartao') e confirme a operação. O assistente usará a ferramenta `realizar_compra` para finalizar.

## Requisitos Extras Concluídos

O projeto conta com a implementação dos requisitos extras de segurança e observabilidade:

- Prevenção de Jailbreak e Manipulação de ID: A lógica de execução no `chatController.ts` impede que o LLM escolha o ID do cliente. O `user_id` é extraído diretamente do Token JWT e injetado compulsoriamente (override) nos argumentos antes de chamar o servidor MCP, evitando que um usuário mal intencionado compre no nome de outra pessoa.
- Logs Auditáveis: O Orquestrador salva um registro detalhado de cada interação do LLM com o servidor MCP. Todas as ferramentas acionadas tem quem (user_id), quando (timestamp), quais argumentos enviados (o que e quanto) e qual foi o resultado (retorno do MCP) salvos no arquivo `audit.log` na pasta do orquestrador.

## Screenshots de Execução

### 1. Compra Bem-sucedida (Cartão e Pix)
![imagem 1](/docs/print_1.JPG)

### 2. Tentativa Bloqueada (Limite de Crédito Excedido)
![imagem 2](/docs/print_2.JPG)

### 3. Tentativa Recusada (Intenção Inválida ou Expirada)
![imagem 3](/docs/print_3.JPG)