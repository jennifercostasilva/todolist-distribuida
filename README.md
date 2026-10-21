
# Multi API TodoList

Sistema de gerenciamento de tarefas com três serviços independentes, autenticação de usuários e estatísticas por usuário.

## Tecnologias

### Serviço 1 — API de tarefas
- Node.js
- Express
- Prisma ORM
- SQLite
- JWT para autenticação
- bcryptjs para hash de senhas

### Serviço 2 — Gerador de logs
- PHP
- Laravel
- Eloquent ORM
- SQLite

### Serviço 3 — Analisador de tarefas
- Python
- FastAPI
- SQLAlchemy ORM
- SQLite

### Frontend
- HTML
- CSS
- JavaScript

## Estrutura do projeto

- `frontend/`: interface web.
- `servico-tarefas/`: cadastro, login e operações CRUD.
- `servico-logs/`: registro de eventos e erros.
- `servico-estatisticas/`: sincronização e contagem das tarefas por usuário.

## Configuração

Configure os arquivos `.env` de cada serviço a partir dos respectivos `.env.example`.

Os segredos de autenticação JWT devem ser compatíveis entre os serviços que verificam os tokens. Os segredos de comunicação interna devem coincidir entre o serviço emissor e o receptor correspondente.

Não publique os arquivos `.env`.

## Executar o Serviço 1

No terminal:

```powershell
cd servico-tarefas
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

O serviço utiliza a porta 3001.

## Executar o Serviço 2

Em outro terminal:

```powershell
cd servico-logs
composer install
php artisan key:generate
php artisan migrate
php artisan serve --port=8000
```

Antes de iniciar, configure o `.env`, incluindo `LOG_SERVICE_SECRET`, e verifique a configuração do banco de dados.

## Executar o Serviço 3

Em outro terminal:

```powershell
cd servico-estatisticas
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Configure o `.env` com o JWT compartilhado e o segredo de sincronização.

## Frontend

Abra a pasta `frontend` no VS Code e utilize o Live Server para servir o `index.html`.

O frontend depende dos três serviços em execução.

## Endpoints principais

### Serviço de tarefas
- `POST /api/auth/register`: cadastro.
- `POST /api/auth/login`: login.
- `GET /api/auth/me`: usuário autenticado.
- `GET /api/todos`: listar tarefas.
- `POST /api/todos`: criar tarefa.
- `PUT /api/todos/{id}`: alterar conclusão.
- `DELETE /api/todos/{id}`: excluir tarefa.

### Serviço de logs
- `POST /api/logs`: registrar evento autenticado por segredo interno.

### Serviço de estatísticas
- `GET /api/stats`: consultar estatísticas do usuário autenticado.
- `POST /api/internal/tasks/sync`: sincronizar tarefas do serviço principal.

## Segurança

- Senhas armazenadas com hash.
- Rotas de tarefas protegidas por JWT.
- Operações filtradas pelo ID do usuário autenticado.
- Comunicação interna protegida por segredos compartilhados.
- Arquivos `.env`, dependências e bancos locais excluídos do Git.

## Testes realizados

Foram testados cadastro, login, criação, alteração e exclusão de tarefas, separação de dados entre usuários, sincronização com os serviços de logs e estatísticas e bloqueio de requisições sem autenticação.
