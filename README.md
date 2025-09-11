# 📋 Kanban de Tarefas

Sistema Kanban completo com interface moderna e funcionalidades avançadas. Desenvolvido com Node.js, Express, PostgreSQL e frontend vanilla JavaScript.

## ✨ Funcionalidades Principais

### 🔐 Sistema de Autenticação
- **Registro e Login** com criptografia bcrypt
- **Sistema de sessões** com middleware de autenticação
- **Perfis de usuário** com upload de avatar
- **Compartilhamento de quadros** entre usuários

### 📋 Gestão de Quadros e Tarefas
- **Múltiplos quadros** por usuário com controle de acesso
- **Colunas personalizáveis** com cores e descrições
- **Tarefas** com sistema completo de CRUD
- **Sistema de tags** com cores e gerenciamento
- **Subtarefas** com checklist e progresso visual
- **Anexos** com upload de imagens e arquivos

### ⏰ Sistema de Prazos
- **Prazos com data e hora** para tarefas
- **Indicadores visuais** de status:
  - 🟢 **Verde**: No prazo
  - 🟡 **Amarelo**: Próximo do vencimento (60% do tempo decorrido)
  - 🔴 **Vermelho**: Atrasado
- **Templates com prazos automáticos** (dias + horas/minutos)

### 📝 Campo de Descrição
- **Campo de texto simples** para descrições de tarefas
- **Interface limpa** e focada na funcionalidade
- **Edição direta** sem formatação complexa

### 🎨 Interface e UX
- **Drag & Drop** para reordenação de colunas e tarefas
- **Design responsivo** e moderno
- **Atalhos de teclado** (Alt+N, Alt+C, Alt+T, etc.)
- **Modais empilháveis** com navegação intuitiva
- **Indicadores de progresso** em subtarefas
- **Sistema de notificações** e convites

### 🗂️ Templates
- **Templates de tarefas** para agilizar criação
- **Subtarefas automáticas** a partir de templates
- **Prazos calculados automaticamente** baseados em dias e horas
- **Reutilização** de estruturas de tarefas comuns

## 🚀 Tecnologias

- **Backend**: Node.js, Express.js
- **Banco de Dados**: PostgreSQL com migrações automáticas
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Autenticação**: bcrypt, express-session
- **Upload**: Multer para arquivos e avatares
- **Comunicação**: RESTful API

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 13+

### Configuração Rápida

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/PedroLuizZampar/to-do-kanban.git
   cd to-do-kanban
   ```

2. **Instale dependências**:
   ```bash
   npm install
   ```

3. **Configure o banco** (opcional - crie `.env`):
   ```env
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=sua_senha
   DB_NAME=kanban
   DB_PORT=5432
   PORT=3000
   ```

4. **Execute setup automático**:
   ```bash
   npm run db:setup
   ```

5. **Inicie a aplicação**:
   ```bash
   npm start
   ```

6. **Acesse**: http://localhost:3000

### Instalação Automática (Windows)
```powershell
./scripts/install.ps1          # Produção
./scripts/install.ps1 -Dev     # Desenvolvimento
```

## 🎯 Como Usar

### Primeiros Passos
1. **Crie uma conta** ou faça login
2. **Crie seu primeiro quadro** 
3. **Adicione colunas** (A Fazer, Em Progresso, Concluído)
4. **Crie tarefas** com descrições ricas e prazos
5. **Arraste e solte** para organizar

### Prazos e Templates
- **Defina prazos** com data e hora específicas
- **Crie templates** com prazos automáticos (ex: +3 dias, +2 horas)
- **Acompanhe status** pelos indicadores coloridos nos cartões

## 🔧 Estrutura do Projeto

```
to-do-kanban/
├── server/
│   ├── controllers/     # Lógica de negócio
│   ├── models/         # Acesso ao banco
│   ├── routes/         # Rotas da API
│   ├── middleware/     # Autenticação
│   └── utils/          # Utilitários
├── client/
│   ├── js/            # JavaScript frontend
│   ├── css/           # Estilos
│   └── *.html         # Páginas
├── database/
│   ├── schema.postgres.sql    # Schema do banco
│   └── migrations.postgres.sql # Migrações
└── scripts/           # Scripts de instalação
```
---

**Desenvolvido por [Pedro Luiz Zampar](http://github.com/PedroLuizZampar)**