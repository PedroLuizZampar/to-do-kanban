-- Schema PostgreSQL para o projeto Kanban
-- Gera todas as tabelas necessárias e triggers auxiliares
-- Executar com server/utils/dbSetup.js

SET client_encoding = 'UTF8';
SET TIME ZONE 'UTC';

-- Ordem de remoção (reversa das dependências)
DROP TRIGGER IF EXISTS trg_users_default_board ON users;
DROP FUNCTION IF EXISTS create_default_board_for_user();
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS task_assignees CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS board_invites CASCADE;
DROP TABLE IF EXISTS board_members CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Tipos ENUM
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        CREATE TYPE role_type AS ENUM ('owner', 'editor');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
        CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('assignment');
    END IF;
END $$;

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela de usuários
CREATE TABLE users (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username        VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password        VARCHAR(255) NOT NULL,
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url      TEXT NULL,
  avatar_blob     BYTEA NULL,
  avatar_mime     TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_username UNIQUE (username)
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tabela de sessões
CREATE TABLE sessions (
  id          VARCHAR(255) PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires     TIMESTAMPTZ NOT NULL,
  data        TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Boards
CREATE TABLE boards (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  description TEXT NULL,
  color       VARCHAR(20) NULL,
  position    INTEGER NOT NULL DEFAULT 1,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_boards_name_user UNIQUE (name, user_id)
);

CREATE TRIGGER trg_boards_updated_at
BEFORE UPDATE ON boards
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Membros do quadro
CREATE TABLE board_members (
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role     role_type NOT NULL DEFAULT 'editor',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, user_id)
);

-- Convites do quadro
CREATE TABLE board_invites (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  board_id         INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  invited_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  invited_by       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status           invite_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_invite_unique UNIQUE (board_id, invited_user_id)
);

CREATE TRIGGER trg_board_invites_updated_at
BEFORE UPDATE ON board_invites
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Categorias (colunas do quadro)
CREATE TABLE categories (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  description TEXT NULL,
  color       VARCHAR(20) NULL,
  board_id    INTEGER NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  position    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_board_position ON categories(board_id, position);

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tarefas
CREATE TABLE tasks (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT NULL,
  category_id INTEGER NULL REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  due_at      TIMESTAMPTZ NULL,
  position    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_category_position ON tasks(category_id, position);

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tags
CREATE TABLE tags (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT NULL,
  color       VARCHAR(20) NULL,
  board_id    INTEGER NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  position    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tags_name_board UNIQUE (board_id, name)
);

CREATE INDEX idx_tags_board ON tags(board_id);

CREATE TRIGGER trg_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Relação task <-> tag
CREATE TABLE task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (task_id, tag_id)
);

-- Subtarefas
CREATE TABLE subtasks (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title      VARCHAR(255) NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  position   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subtasks_task_position ON subtasks(task_id, position);

-- Evita títulos duplicados (case-insensitive) por tarefa
CREATE UNIQUE INDEX uq_subtasks_title_per_task ON subtasks (task_id, lower(title));

CREATE TRIGGER trg_subtasks_updated_at
BEFORE UPDATE ON subtasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Atribuições de usuários em tarefas
CREATE TABLE task_assignees (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- Anexos de tarefas (imagens)
CREATE TABLE task_attachments (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  filename   VARCHAR(255) NOT NULL,
  mime       VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notificações por usuário
CREATE TABLE user_notifications (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type      notification_type NOT NULL,
  message   VARCHAR(255) NOT NULL,
  board_id  INTEGER NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  task_id   INTEGER NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates de tarefa por quadro
CREATE TABLE templates (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  board_id    INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name        VARCHAR(150) NOT NULL,
  content     JSONB NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  position    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_board ON templates(board_id);

CREATE TRIGGER trg_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: cria automaticamente um quadro padrão e 3 colunas para cada novo usuário
CREATE OR REPLACE FUNCTION create_default_board_for_user()
RETURNS trigger AS $$
DECLARE
  new_board_id INTEGER;
BEGIN
  -- Não criar quadro padrão para usuários administradores
  IF NEW.is_admin THEN
    RETURN NEW;
  END IF;

  INSERT INTO boards (name, description, color, position, user_id)
  VALUES ('Meu Quadro', 'Quadro para gestão de tarefas pessoais', '#3B82F6', 1, NEW.id)
  RETURNING id INTO new_board_id;

  INSERT INTO categories (name, description, color, board_id, position)
  VALUES
    ('À Fazer', 'Tarefas a iniciar', '#FD5D5D', new_board_id, 1),
    ('Fazendo', 'Tarefas em progresso', '#F59E0B', new_board_id, 2),
    ('Concluído', 'Tarefas finalizadas', '#6BB96A', new_board_id, 3);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_default_board
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION create_default_board_for_user();
