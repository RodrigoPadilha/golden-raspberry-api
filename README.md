# Golden Raspberry Awards API

API para consulta de filmes indicados e vencedores do **Golden Raspberry Awards** (Framboesa de Ouro). Permite consultar filmes, produtores e obter os produtores com maior e menor intervalo entre prêmios consecutivos.

A aplicação utiliza **Arquitetura Hexagonal** com ingestão de dados via CSV.

## Tecnologias

- **Node.js** + **TypeScript**
- **Express** — servidor HTTP
- **Prisma** — ORM com SQLite
- **Swagger/OpenAPI** — documentação da API
- **Jest** — testes unitários e de integração

## Pré-requisitos

- Node.js 20+
- npm ou yarn
- (Opcional) Docker e Docker Compose — para rodar via container

---

## Como executar o projeto

### Opção 1: Via npm (desenvolvimento local)

1. **Instale as dependências:**

   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente** (opcional; já existe `.env` com valores padrão):

   ```env
   DATABASE_URL="file:./dev.db"
   PORT=3000
   CSV_FILE_PATH="./Movielist.csv"
   ```

3. **Gere o cliente Prisma e aplique o schema no banco:**

   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

4. **Inicie a aplicação em modo desenvolvimento:**

   ```bash
   npm run dev
   ```

   Ou, após o build, em modo produção:

   ```bash
   npm run build
   npm run start
   ```

A API estará disponível em `http://localhost:3000` (ou na porta definida em `PORT`).

### Opção 2: Via Docker

1. **Suba o container:**

   ```bash
   docker-compose up --build
   ```

2. A API estará disponível em `http://localhost:3000`.

O Dockerfile faz build da aplicação, executa as migrations do Prisma e carrega os dados do arquivo `Movielist.csv` automaticamente.

---

## Testes

### Todos os testes (unitários + integração)

```bash
npm test
```

### Testes com cobertura

```bash
npm run test:coverage
```

### Apenas testes de integração

```bash
npm run test:integration
```

Os testes de integração sobem a aplicação com banco SQLite em memória, carregam o CSV `Movielist.csv` e validam os endpoints da API (health, movies, producers, awards-interval, etc.).

---

## Documentação da API (Swagger)

A API é documentada com **OpenAPI 3.0** e Swagger UI.

### Como acessar

Com a aplicação em execução, acesse:

- **Swagger UI:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

No Swagger UI você pode:

- Ver todos os endpoints disponíveis
- Consultar os schemas de requisição e resposta
- Testar as rotas diretamente pelo navegador

### Endpoints documentados

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/movies` | Lista todos os filmes |
| GET | `/api/movies/:id` | Busca filme por ID |
| GET | `/api/producers` | Lista produtores com contagem de prêmios |
| GET | `/api/producers/awards-interval` | Produtores com maior e menor intervalo entre prêmios |
| GET | `/api/producers/:name/movies` | Filmes de um produtor |
| GET | `/health` | Health check da API |

A especificação OpenAPI está em `src/adapters/inbound/http/docs/swagger.json`.

---

## Estrutura do projeto

```
src/
├── adapters/
│   ├── inbound/http/          # Express, rotas, Swagger
│   ├── outbound/              # Prisma, repositórios, CSV loader
│   └── ports/                 # Interfaces (inbound/outbound)
├── domain/                    # Entidades e serviços
├── factories/                 # Montagem de controllers
├── infra/                     # Router, bootstrap
├── app.ts                     # Configuração da aplicação
└── main.ts                    # Ponto de entrada
tests/
├── unit/                      # Testes unitários
└── integration/               # Testes de integração da API
```

---

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia em modo desenvolvimento (ts-node) |
| `npm run build` | Compila TypeScript para JavaScript |
| `npm run start` | Inicia a aplicação (após build) |
| `npm test` | Executa todos os testes |
| `npm run test:coverage` | Executa testes com cobertura |
| `npm run test:integration` | Executa apenas testes de integração |
| `npm run prisma:generate` | Gera o cliente Prisma |
| `npm run prisma:push` | Aplica o schema no banco (SQLite) |

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL de conexão do banco (SQLite) | `file:./dev.db` |
| `PORT` | Porta do servidor HTTP | `3000` |
| `CSV_FILE_PATH` | Caminho do arquivo CSV de filmes | `./Movielist.csv` |
