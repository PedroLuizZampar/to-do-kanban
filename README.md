## Armazenamento de Avatares (PostgreSQL)

Os avatares de usuário agora são armazenados no banco (colunas `users.avatar_blob` e `users.avatar_mime`).

- Upload: `POST /api/profile/avatar` (autenticado). O arquivo é enviado como `multipart/form-data` com o campo `avatar`.
- Remoção: `DELETE /api/profile/avatar`.
- Exibição: `GET /api/users/:id/avatar` (pública). O cliente usa `user.avatar_url` que aponta para esse endpoint.

As migrações idempotentes adicionam as novas colunas automaticamente sem perder dados existentes.
# Kanban de Tarefas (Node.js + PostgreSQL + HTML/CSS/JS)

Aplicação Kanban com backend em Node.js/Express e banco PostgreSQL, e frontend leve em HTML/CSS/JS (sem framework). Suporta:

- CRUD de Categorias (colunas) com ordenação arrastável e persistida
- CRUD de Tags, com cor e descrição
- CRUD de Tarefas, com título, descrição, coluna e múltiplas tags
- Arrastar cartões entre colunas e reordenar colunas (persistindo no banco)

## Requisitos

- Node.js 18+
- PostgreSQL 13+

## Configuração

1. Instale dependências:

	- Windows PowerShell:
	```powershell
	npm install
	```

2. Configure variáveis de ambiente (opcional). Por padrão:

	- DB_HOST=localhost
	- DB_USER=postgres
	- DB_PASSWORD=(vazio)
	- DB_NAME=kanban
	- DB_PORT=5432
	- DB_SSL=false

	Crie um arquivo `.env` na raiz se quiser sobrescrever:

	```ini
	DB_HOST=localhost
	DB_USER=seu_usuario
	DB_PASSWORD=sua_senha
	DB_NAME=kanban
	DB_PORT=5432
	DB_SSL=false
	PORT=3000
	```

3. Crie o banco e aplique o schema/seed:

	```powershell
	npm run db:setup
	```

4. Inicie a aplicação:

	- Modo normal:
	  ```powershell
	  npm start
	  ```
	- Modo dev (com nodemon):
	  ```powershell
	  npm run dev
	  ```

5. Acesse o frontend:

	- http://localhost:3000/

### Instalação automática (opcional)

No Windows PowerShell, você pode usar o script:

```powershell
./scripts/install.ps1          # instala dependências, aplica schema e inicia
./scripts/install.ps1 -Dev     # inicia em modo dev (nodemon)
```

O script usa `npm ci` (se existir package-lock.json) ou `npm install`, e executa `npm run db:setup`.

## Estrutura

- `server/` Express, rotas, controladores e modelos (acesso PostgreSQL via pg Pool).
- `database/schema.postgres.sql` Schema e seeds iniciais para PostgreSQL.
- `scripts/install.ps1` Script para instalar e subir tudo automaticamente no Windows.
- `requirements-node.txt` Lista textual das dependências (documentação).
- `.gitignore` Ignora node_modules, .env e artefatos locais.

## Funcionamento do site

- Sidebar com Quadros (Boards):
	- Criar/editar/excluir e reordenar quadros por arraste. O ativo usa a cor do quadro na borda/outline.
- Colunas (Categorias) por quadro, com cor e descrição:
	- Ordenação por arraste com persistência. Edição/exclusão por menu da coluna.
- Cartões (Tarefas):
	- Criar/editar/excluir, mover entre colunas por arraste, reordenar dentro da coluna.
	- Tags com cor (UI de “buckets” Disponíveis/Adicionadas).
	- Checklist de subtarefas no modal da tarefa (criar/editar/checkbox; progresso exibido no card como done/total).
- Modais empilháveis: ao fechar um modal filho (ex.: nova tag), o pai retoma e atualiza conteúdo.
- Ajuda/Atalhos: Alt+N (nova tarefa), Alt+C (nova coluna), Alt+T (tags), Alt+Q (novo quadro), Alt+H (ajuda).

## Notas

- Suporte a múltiplos Quadros (Boards). Há um seletor no topo do app para alternar o quadro atual.
- Endpoints aceitam filtro `?boardId=ID` (categories, tags e tasks). O frontend já envia automaticamente com base no quadro selecionado.
- Excluir um Board remove suas categorias, tarefas e tags em cascata.
- Arrastar cartões entre colunas, reordenar colunas e reordenar quadros persiste a posição no banco.
- O banco é acessado via pool de conexões, configurado em `server/config/database.js`.
