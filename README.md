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

2. **Gere o cliente Prisma** (obrigatório na primeira vez ou após alterar `prisma/schema.prisma`):

   ```bash
   npm run prisma:generate
   ```

3. **Configure o `.env`** na raiz do projeto (há um exemplo comentado; você pode copiar e ajustar):

   ```env
   DB_STORAGE_TYPE=memory
   DATABASE_URL_MEMORY=
   DATABASE_URL=file:./dev.db
   PORT=3000
   CSV_FILE_PATH=./Movielist.csv
   ```

   - **`DB_STORAGE_TYPE`**: `memory` (padrão recomendado para alinhar ao requisito de banco em memória) ou `file` (SQLite em arquivo no disco, útil para inspecionar o `.db` manualmente).
   - **`DATABASE_URL`**: usada no modo `file` e pelos comandos Prisma (`prisma db push`, `prisma generate`). No modo `memory`, a aplicação usa `DATABASE_URL_MEMORY` ou um padrão interno (tmpdir + SQLite em memória).
   - **`DATABASE_URL_MEMORY`**: opcional; se vazio, o adapter monta uma URL em memória automaticamente.

4. **Aplique o schema no banco** — necessário **apenas no modo `file`** (para criar/atualizar o arquivo SQLite referenciado em `DATABASE_URL`):

   ```bash
   npm run prisma:push
   ```

   No modo `memory`, não é preciso rodar `prisma:push` para a API subir: o schema em memória é criado na inicialização da aplicação.

5. **Inicie a aplicação:**

   ```bash
   npm run dev
   ```

   Ou em produção (compila e executa):

   ```bash
   npm run build
   npm run start
   ```

A API estará em `http://localhost:3000` (ou na porta definida em `PORT`). O arquivo `Movielist.csv` deve existir no caminho configurado em `CSV_FILE_PATH` (por padrão, na raiz do projeto).

### Opção 2: Via Docker

1. **Suba o container:**

   ```bash
   docker-compose up --build
   ```

2. A API estará em `http://localhost:3000`.

O container usa **`DB_STORAGE_TYPE=file`** e **`DATABASE_URL`** apontando para SQLite em arquivo. O `entrypoint` executa `prisma db push` antes de subir o Node, e o CSV é copiado para `/data/Movielist.csv` conforme `CSV_FILE_PATH` no ambiente.

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
| `DB_STORAGE_TYPE` | `memory` — SQLite em memória (sem `prisma db push` obrigatório para subir a API). `file` — SQLite em arquivo; use `DATABASE_URL` e rode `prisma db push` antes (local). | `memory` (se ausente ou inválido, trata como memória) |
| `DATABASE_URL` | URL SQLite no modo **file**; também usada pelo Prisma CLI (`prisma generate` / `db push`). | `file:./dev.db` |
| `DATABASE_URL_MEMORY` | URL SQLite em memória no modo **memory**; omita ou deixe vazio para usar o padrão (tmpdir). | *(vazio)* |
| `PORT` | Porta HTTP | `3000` |
| `CSV_FILE_PATH` | Caminho absoluto ou relativo ao diretório de trabalho do processo para `Movielist.csv` | `./Movielist.csv` |
