-- Migrações idempotentes para PostgreSQL (não destrutivas)
-- Execute com server/utils/dbSetup.js (padrão)

-- Criar tipos enum se não existirem
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

-- Função updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Tabelas (CREATE TABLE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username        VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password        VARCHAR(255) NOT NULL,
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url      TEXT NULL,
  avatar_blob     BYTEA NULL,
  avatar_mime     TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_username') THEN
        ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username);
    END IF;
END $$;

-- Adiciona colunas de avatar blob/mime se não existirem (para bases já criadas)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_blob'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_blob BYTEA NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_mime'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_mime TEXT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sessions (
  id          VARCHAR(255) PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires     TIMESTAMPTZ NOT NULL,
  data        TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boards (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  description TEXT NULL,
  color       VARCHAR(20) NULL,
  position    INTEGER NOT NULL DEFAULT 1,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_boards_name_user') THEN
        ALTER TABLE boards ADD CONSTRAINT uq_boards_name_user UNIQUE (name, user_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS board_members (
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role     role_type NOT NULL DEFAULT 'editor',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS board_invites (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  board_id         INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  invited_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  invited_by       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status           invite_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_invite_unique') THEN
        ALTER TABLE board_invites ADD CONSTRAINT uq_invite_unique UNIQUE (board_id, invited_user_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  description TEXT NULL,
  color       VARCHAR(20) NULL,
  board_id    INTEGER NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  position    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_board_position ON categories(board_id, position);

CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT NULL,
  category_id INTEGER NULL REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  position    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_category_position ON tasks(category_id, position);

CREATE TABLE IF NOT EXISTS tags (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT NULL,
  color       VARCHAR(20) NULL,
  board_id    INTEGER NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tags_name_board') THEN
        ALTER TABLE tags ADD CONSTRAINT uq_tags_name_board UNIQUE (board_id, name);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tags_board ON tags(board_id);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (task_id, tag_id)
);

-- Garante coluna position em task_tags para bases antigas
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_tags' AND column_name = 'position'
  ) THEN
    ALTER TABLE task_tags ADD COLUMN position INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Templates de tarefa
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
    CREATE TABLE templates (
      id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      board_id    INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
      name        VARCHAR(150) NOT NULL,
      content     JSONB NOT NULL,
      is_default  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_templates_board ON templates(board_id);
    CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS subtasks (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  title      VARCHAR(255) NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  position   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_position ON subtasks(task_id, position);
-- Índice único para evitar duplicidade de títulos de subtarefas por tarefa
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'uq_subtasks_title_per_task') THEN
        CREATE UNIQUE INDEX uq_subtasks_title_per_task ON subtasks (task_id, lower(title));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- Anexos de tarefas (imagens)
CREATE TABLE IF NOT EXISTS task_attachments (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  filename   VARCHAR(255) NOT NULL,
  mime       VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type      notification_type NOT NULL,
  message   VARCHAR(255) NOT NULL,
  board_id  INTEGER NULL REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  task_id   INTEGER NULL REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers de updated_at (cria apenas se não existir)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_boards_updated_at') THEN
        CREATE TRIGGER trg_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_board_invites_updated_at') THEN
        CREATE TRIGGER trg_board_invites_updated_at BEFORE UPDATE ON board_invites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_categories_updated_at') THEN
        CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tasks_updated_at') THEN
        CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tags_updated_at') THEN
        CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_subtasks_updated_at') THEN
        CREATE TRIGGER trg_subtasks_updated_at BEFORE UPDATE ON subtasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- Trigger de criação automática do quadro padrão para usuários não-admin (criação idempotente)
CREATE OR REPLACE FUNCTION create_default_board_for_user()
RETURNS trigger AS $$
DECLARE
  new_board_id INTEGER;
BEGIN
  IF NEW.is_admin THEN
    RETURN NEW;
  END IF;

  -- Se o usuário já tem pelo menos um board, não cria novamente
  IF EXISTS (SELECT 1 FROM boards WHERE user_id = NEW.id) THEN
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
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_default_board') THEN
        CREATE TRIGGER trg_users_default_board AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION create_default_board_for_user();
    END IF;
END $$;
