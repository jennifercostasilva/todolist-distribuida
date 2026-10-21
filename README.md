# TODO List Distribuída

Aplicação de gerenciamento de tarefas desenvolvida com uma arquitetura distribuída, separando a interface e três serviços de backend: tarefas, logs e estatísticas.

## Objetivo

Permitir que usuários se cadastrem, façam login e gerenciem suas próprias tarefas. As ações importantes são registradas no serviço de logs, enquanto o serviço de estatísticas mantém os dados necessários para calcular o total de tarefas, as concluídas e as pendentes por usuário.

## Arquitetura

| Componente | Tecnologia principal | Porta local | Responsabilidade |
|---|---|---:|---|
| Frontend | HTML, CSS e JavaScript | Live Server ou servidor estático | Interface de login, cadastro e tarefas |
| Serviço de tarefas | Node.js, Express e Prisma | `3001` | Autenticação, autorização e CRUD de tarefas |
| Serviço de logs | Laravel e Eloquent | `8000` | Receber e persistir eventos de auditoria |
| Serviço de estatísticas | Python, FastAPI e SQLAlchemy | `8001` | Sincronizar tarefas e fornecer estatísticas por usuário |

Os serviços usam bancos SQLite locais para desenvolvimento. O serviço de tarefas usa JWT para autenticação e senhas armazenadas com hash. As rotas de tarefas são protegidas e cada usuário pode acessar somente suas próprias tarefas. A comunicação interna entre os serviços usa segredos configurados em variáveis de ambiente.

## Estrutura do projeto

```text
todolist-distribuida/
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/
├── servico-tarefas/
│   ├── prisma/
│   └── src/
├── servico-logs/
│   ├── app/
│   ├── database/
│   └── routes/
├── servico-estatisticas/
│   ├── main.py
│   └── requirements.txt
└── README.md
```

## Pré-requisitos

Instale as ferramentas necessárias para os serviços que deseja executar:

- Node.js e npm;
- PHP e Composer;
- Python;
- navegador web.

## Configuração inicial

1. Abra o projeto na pasta `todolist-distribuida`.
2. Configure as variáveis de ambiente em cada serviço, usando o respectivo arquivo `.env.example` como referência quando ele estiver disponível.
3. Mantenha os arquivos `.env` locais fora do Git. Não coloque senhas, tokens ou segredos reais neste README.
4. Confirme que as portas `3001`, `8000` e `8001` estão livres.

### 1. Serviço de tarefas — Node.js, Express e Prisma

No PowerShell, a partir da raiz do projeto:

```powershell
cd servico-tarefas
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Configure o `.env` deste serviço com, no mínimo, os valores apropriados para o ambiente local:

- `PORT=3001`;
- `DATABASE_URL` com o caminho do banco SQLite usado pelo Prisma;
- `JWT_SECRET` com uma chave local forte;
- `LOG_SERVICE_URL=http://localhost:8000/api/logs`;
- `LOG_SERVICE_SECRET` igual ao segredo configurado no serviço de logs;
- `STATS_SERVICE_URL=http://127.0.0.1:8001/api/internal/tasks/sync`;
- `STATS_SERVICE_SECRET` igual ao segredo configurado no serviço de estatísticas.

O valor de `JWT_SECRET` também deve ser o mesmo usado pelo serviço de estatísticas para validar os tokens. Não compartilhe os valores secretos.

### 2. Serviço de logs — Laravel e Eloquent

Abra um segundo terminal PowerShell:

```powershell
cd servico-logs
composer install
php artisan migrate
php artisan serve --port=8000
```

Configure no `.env` do Laravel o banco SQLite e `LOG_SERVICE_SECRET`. O segredo deve coincidir com `LOG_SERVICE_SECRET` do serviço de tarefas. A rota de recebimento de logs valida esse segredo antes de persistir os eventos.

Se a instalação exigir a chave da aplicação Laravel e ela ainda não estiver configurada, gere-a com:

```powershell
php artisan key:generate
```

### 3. Serviço de estatísticas — FastAPI e SQLAlchemy

Abra um terceiro terminal PowerShell:

```powershell
cd servico-estatisticas
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Configure o `.env` do serviço com:

- `DATABASE_URL=sqlite:///./estatisticas.db`;
- `JWT_SECRET` igual ao do serviço de tarefas;
- `STATS_SERVICE_SECRET` igual ao do serviço de tarefas.

Caso o PowerShell bloqueie a ativação do ambiente virtual, execute o comando de inicialização com o interpretador diretamente:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

### 4. Frontend

Com os serviços em execução, abra a pasta `frontend` no VS Code e inicie o arquivo `index.html` com a extensão Live Server, ou use o servidor estático adotado no ambiente. Verifique se a URL-base da API no JavaScript aponta para `http://localhost:3001`.

## Endpoints principais

### Serviço de tarefas — `http://localhost:3001`

| Método | Endpoint | Acesso | Finalidade |
|---|---|---|---|
| `GET` | `/api/health` | Público | Verificar o estado da API e conexão com o banco |
| `POST` | `/api/auth/register` | Público | Criar uma conta |
| `POST` | `/api/auth/login` | Público | Autenticar e receber token JWT |
| `GET` | `/api/auth/me` | Token JWT | Consultar o usuário autenticado |
| `GET` | `/api/todos` | Token JWT | Listar as tarefas do usuário autenticado |
| `POST` | `/api/todos` | Token JWT | Criar uma tarefa para o usuário autenticado |
| `PUT` / `PATCH` | `/api/todos/:id` | Token JWT | Atualizar uma tarefa pertencente ao usuário |
| `DELETE` | `/api/todos/:id` | Token JWT | Excluir uma tarefa pertencente ao usuário |

Envie o token recebido no login no cabeçalho `Authorization: Bearer <token>` para as rotas protegidas. A atualização pode usar o método efetivamente registrado em `servico-tarefas/src/routes/todoRoutes.js`.

### Serviço de logs — `http://localhost:8000`

| Método | Endpoint | Finalidade |
|---|---|---|
| `POST` | `/api/logs` | Receber eventos de auditoria do serviço de tarefas |

Os eventos previstos incluem criação, atualização, exclusão, tentativas de acesso não autorizado e erros. A rota interna exige o cabeçalho `X-Service-Secret`.

### Serviço de estatísticas — `http://127.0.0.1:8001`

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET` | `/api/health` | Verificar o serviço |
| `POST` | `/api/internal/tasks/sync` | Sincronizar uma tarefa recebida internamente |
| `GET` | `/api/stats` | Obter total, concluídas e pendentes do usuário autenticado |

A sincronização interna exige o segredo de serviço. O endpoint de estatísticas usa o token JWT do usuário para retornar somente os dados associados a ele.

## Sincronização inicial das tarefas

Quando houver tarefas criadas antes de a integração com o serviço de estatísticas ser ativada, execute o script de sincronização com o serviço de estatísticas ligado. Em outro terminal:

```powershell
cd servico-tarefas
node .\src\scripts\syncExistingTasks.js
```

O script envia as tarefas existentes para que as estatísticas possam ser calculadas. Para um banco novo, essa etapa pode não ser necessária.

## Fluxo básico de teste

1. Inicie os três serviços e abra o frontend.
2. Cadastre um usuário e faça login.
3. Crie, edite, conclua e exclua tarefas.
4. Confirme se o serviço de logs recebe os eventos e se as estatísticas são atualizadas.
5. Crie ou utilize uma segunda conta e confirme que ela não consegue consultar ou modificar as tarefas da primeira conta.
6. Faça uma requisição protegida sem token e confirme que o acesso é negado.

## Segurança e boas práticas

- Senhas devem ser armazenadas como hash, nunca em texto puro.
- Tokens JWT e segredos entre serviços devem ficar em arquivos `.env` locais.
- Não envie arquivos `.env`, bancos locais, `node_modules`, `vendor` ou `.venv` para o repositório.
- Não remova os controles de autorização que limitam as consultas e alterações ao usuário autenticado.
- Este projeto está configurado para desenvolvimento local. Um ambiente de produção exige configuração adicional de HTTPS, gestão segura de segredos, monitoramento e implantação.

## Tecnologias utilizadas

- **Frontend:** HTML, CSS e JavaScript
- **Serviço de tarefas:** Node.js, Express, Prisma, SQLite, JWT e bcrypt
- **Serviço de logs:** PHP, Laravel, Eloquent e SQLite
- **Serviço de estatísticas:** Python, FastAPI, SQLAlchemy e SQLite
- **Controle de versão:** Git
