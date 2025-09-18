# SGMI Backend - Sistema de Gestão de Produção Industrial

Backend completo para gerenciamento de produção industrial com módulos separados para Diretores e operadores de Produção.

## 🚀 Como Executar

Escolha uma das duas opções abaixo para executar o backend:

### Opção 1: Docker (Recomendado - Fácil configuração)

#### Pré-requisitos
- Docker
- Docker Compose

#### Instalação e Configuração

1. **Configurar variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # As configurações de banco padrão do Docker já funcionam
   ```

2. **Iniciar com Docker Compose:**
   ```bash
   # Construir e iniciar todos os serviços (backend + PostgreSQL)
   docker-compose up --build
   
   # Para rodar em background:
   docker-compose up --build -d
   ```

3. **Executar migrações e seed (primeira vez):**
   ```bash
   # Aguardar os containers iniciarem, então executar:
   docker-compose exec api npm run db:migrate
   docker-compose exec api npm run db:seed
   ```
   Servidor iniciará em: http://localhost:4000
   - Health check: GET /health
   - WebSocket: ws://localhost:4000/ws
   - PostgreSQL: localhost:5432 (acessível do host)

**Comandos úteis Docker:**
   ```bash
   # Parar os serviços
   docker-compose down
   
   # Ver logs
   docker-compose logs api
   
   # Resetar banco de dados
   docker-compose exec api npm run db:reset
   
   # Acessar container do backend
   docker-compose exec api bash
   ```

### Opção 2: Instalação Local (Para desenvolvimento avançado)

#### Pré-requisitos
- Node.js 18+ (recomendado: versão LTS mais recente)
- PostgreSQL 14+ (rodando na porta 5432 por padrão)
- npm (incluído com Node.js)

#### Instalando PostgreSQL

**macOS:**
```bash
# Usando Homebrew
brew install postgresql@14
brew services start postgresql@14

# Adicionar PostgreSQL ao PATH (adicionar ao seu ~/.zshrc ou ~/.bash_profile)
echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
```bash
# Baixar e instalar do site oficial: https://www.postgresql.org/download/windows/
# Ou usar Chocolatey:
choco install postgresql
```

#### Instalação e Configuração

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Editar .env com suas configurações de banco de dados e JWT secrets
   # IMPORTANTE: Se você criou um usuário diferente ou senha diferente no PostgreSQL,
   # atualize a linha DATABASE_URL no arquivo .env para corresponder às suas configurações
   # Por exemplo: DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/sgmi?schema=public"
   ```

3. **Configurar banco de dados:**
   ```bash
   # Primeiro, configurar usuário PostgreSQL (apenas primeira vez)
   # No macOS/Linux:
   sudo -u postgres createuser -s $USER
   # Ou criar usuário 'postgres' se necessário:
   sudo -u postgres psql -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'password';"
   
   # Criar banco de dados PostgreSQL
   createdb sgmi
   # Ou se o comando acima falhar:
   sudo -u postgres createdb sgmi
   
   # Executar migrações
   npm run db:migrate
   
   # Popular com dados iniciais (usuários e produtos de exemplo)
   npm run db:seed
   ```

4. **Iniciar servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   
   Servidor iniciará em: http://localhost:4000
   - Health check: GET /health
   - WebSocket: ws://localhost:4000/ws

#### Solução de Problemas - Instalação Local

**Erro: "Can't reach database server at localhost:5432"**
- Verifique se o PostgreSQL está rodando: `brew services list | grep postgresql` (macOS) ou `sudo systemctl status postgresql` (Linux)
- Inicie o PostgreSQL: `brew services start postgresql@14` (macOS) ou `sudo systemctl start postgresql` (Linux)

**Erro: "command not found: psql" ou "command not found: createdb"**
- PostgreSQL não está instalado ou não está no PATH
- Siga as instruções de instalação do PostgreSQL acima
- No macOS, adicione ao PATH: `export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"`

**Erro: "database 'sgmi' does not exist"**
- Execute: `createdb sgmi` ou `sudo -u postgres createdb sgmi`

**Erro de autenticação PostgreSQL**
- Configure a senha do usuário postgres: `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"`
- Ou atualize o DATABASE_URL no .env com suas credenciais corretas   

### Scripts Essenciais

- `npm run dev` - Iniciar servidor de desenvolvimento com auto-reload
- `npm run build` - Gerar cliente Prisma (desenvolvimento usa tsx)
- `npm start` - Iniciar servidor de produção
- `npm run db:migrate` - Executar migrações do banco
- `npm run db:reset` - Resetar banco (rollback, migrate, seed)
- `npm run db:seed` - Popular banco com dados iniciais
- `npm run db:studio` - Abrir Prisma Studio (interface web do banco)

### Como Executar o Sistema Completo

Para rodar o sistema SGMI completo, escolha uma das opções para o backend:

#### Com Docker (Recomendado):

1. **Iniciar o backend com Docker:**
   ```bash
   # No diretório sgmi-backend/
   cp .env.example .env
   # Atualize o .env com a sua OPENAI_API_KEY e coloque CHAT_MOCK_WHEN_NO_KEY como false

   docker-compose up --build -d
   docker-compose exec api npm run db:migrate
   docker-compose exec api npm run db:seed
   ```

2. **Iniciar os frontends normalmente:**
   ```bash
   # Frontend principal
   cd ../SGMI/
   npm install && npm run dev
   
   # Frontend padaria (opcional)
   cd ../SGMI-PADARIA/
   npm install && npm run dev
   ```

#### Com Instalação Local:

1. **Iniciar o backend (esta aplicação):**
   ```bash
   # No diretório sgmi-backend/
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

2. **Iniciar o frontend principal:**
   ```bash
   # No diretório ../SGMI/
   npm install
   npm run dev
   ```

3. **Iniciar o módulo padaria (opcional):**
   ```bash
   # No diretório ../SGMI-PADARIA/
   npm install
   npm run dev
   ```

### Portas Padrão
- Backend API: http://localhost:4000
- Frontend Principal: http://localhost:3000
- Frontend Padaria: http://localhost:3001 (se executado)
- Prisma Studio: http://localhost:5555 (npm run db:studio)

### Usuários Padrão (após seed)
- **Diretor**: director@sgmi.com / 123456
- **Gerente**: manager@sgmi.com / 123456
- **Operador**: operator@sgmi.com / 123456

---

## Features

### 🏢 Director Module
- **Production Planning**: Create and manage production plans with batch planning
- **Production Reports**: Comprehensive reports with filtering by date, product, and shift
- **Production Analytics**: Daily trends, shift performance, and efficiency metrics
- **Total Production Tracking**: Monitor planned vs estimated production

### 🏭 Production Module  
- **Production Entry**: Register production entries by product and shift
- **Batch Management**: Real-time batch tracking with start/pause/resume/complete actions
- **WebSocket Integration**: Real-time updates for batch status changes
- **Production Totals**: Aggregate production data with filtering

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (Director, Manager, Operator)
- User management with role updates

### 📦 Product Management
- CRUD operations for products
- Product usage statistics and tracking
- Active/inactive status management

## Architecture

```
src/
├── modules/                 # Business modules
│   ├── director/           # Director-specific functionality
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # Route definitions
│   │   └── types/          # Module-specific types
│   └── production/         # Production-specific functionality
│       ├── controllers/
│       ├── services/
│       ├── routes/
│       └── types/
├── shared/                 # Shared utilities and services
│   ├── database/          # Database models and connection
│   ├── middleware/        # Express middleware
│   ├── types/            # Common type definitions
│   ├── utils/            # Utility functions
│   ├── validation/       # Zod schemas
│   ├── websocket/        # WebSocket manager
│   └── modules/          # Shared modules (auth, products)
├── config/               # Configuration files
└── app.ts               # Application setup
```

## Database Schema

### Core Tables
- `users` - User accounts with roles
- `products` - Product catalog with units
- `production_plans` - Director-created production plans
- `batches` - Individual production batches with real-time tracking
- `production_entries` - Production entries (legacy/simple tracking)

### Key Relationships
- Production plans contain multiple batches
- Batches track detailed production metrics
- Real-time status updates via WebSocket

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /register` - Register new user
- `POST /refresh` - Refresh access token
- `GET /profile` - Get user profile
- `GET /users` - List all users (managers/directors)

### Products (`/api/products`) 
- `GET /` - List products
- `POST /` - Create product (managers/directors)
- `PUT /:id` - Update product (managers/directors)
- `DELETE /:id` - Delete product (directors only)

### Director Module (`/api/director`)
- `POST /production-plans` - Create production plan
- `GET /production-plans` - List production plans
- `PATCH /production-plans/:id/status` - Update plan status
- `GET /production-totals` - Get production totals
- `GET /reports/production` - Detailed production report
- `GET /reports/summary` - Production summary
- `GET /reports/daily-trend` - Daily production trends
- `GET /reports/shift-performance` - Shift performance metrics

### Production Module (`/api/production`)
- `POST /entries` - Create production entry
- `GET /entries` - List production entries
- `POST /batches` - Create new batch
- `GET /plans/:planId/batches` - Get batches for plan
- `POST /batches/:id/actions` - Perform batch action (start/pause/resume/complete/stop)
- `GET /batches/:id/status` - Get batch status with metrics

## WebSocket Events

### Real-time Updates
- `production_plan_created` - New production plan created
- `batch_created` - New batch added to plan
- `batch_status_updated` - Batch status changed
- `production_plan_completed` - All batches in plan completed
- `production_entry_created` - New production entry recorded

### Connection
- Connect to `ws://localhost:4000/ws?token=<jwt_token>`
- Authentication required via JWT token in query parameter

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository>
cd sgmi-backend-base-diretor
npm install
```

2. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup database**
```bash
# Create database
createdb sgmi

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

4. **Start development server**
```bash
npm run dev
```

The server will start on `http://localhost:4000` with:
- Health check: `GET /health`
- WebSocket: `ws://localhost:4000/ws`

### Production Deployment

1. **Environment Setup**
```bash
NODE_ENV=production
# Set secure JWT secrets
JWT_SECRET=<secure-secret>
JWT_REFRESH_SECRET=<secure-refresh-secret>
```

2. **Database Migration**
```bash
npm run db:migrate
```

3. **Build and Start**
```bash
npm run build
npm start
```

## Development

### Project Structure
- **Modular Architecture**: Separate modules for Director and Production concerns
- **Shared Services**: Common functionality in shared directory
- **Type Safety**: Comprehensive TypeScript types
- **Validation**: Zod schemas for request validation
- **Error Handling**: Centralized error handling with proper HTTP codes

### Adding New Features
1. Create module-specific controllers and services
2. Add validation schemas in `shared/validation`
3. Update routes with proper middleware
4. Add WebSocket events if real-time updates needed
5. Update database models if schema changes required

### Database Migrations
```bash
# Create new migration (after modifying schema.prisma)
npx prisma migrate dev --name migration_name

# Run migrations
npm run db:migrate

# Reset database (rollback, migrate, seed)
npm run db:reset
```

## Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Run database seeds
- `npm run db:reset` - Reset database (rollback, migrate, seed)

## Error Codes

### Authentication (401, 403)
- `missing_token` - Authorization header missing
- `invalid_token` - Token invalid or expired
- `insufficient_permissions` - User role lacks permission

### Validation (400)
- `validation_error` - Request data validation failed

### Business Logic (409, 404)
- `product_not_found` - Product doesn't exist
- `production_plan_conflict` - Plan already exists for date/shift/product
- `batch_number_conflict` - Batch number already exists for plan
- `invalid_batch_action` - Action not valid for current batch status

## Contributing

1. Follow the existing architecture patterns
2. Add proper TypeScript types
3. Include validation schemas
4. Add error handling
5. Update documentation

## License

MIT License
