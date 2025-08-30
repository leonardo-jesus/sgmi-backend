# SGMI Backend - Sistema de Gestão de Produção Industrial

A comprehensive backend system for managing industrial production with separate modules for Directors and Production operators.

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
npm run migrate

# Seed initial data
npm run seed
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
npm run migrate
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
# Create new migration
npx knex migrate:make migration_name

# Run migrations
npm run migrate

# Rollback migration
npx knex migrate:rollback
```

## Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Run database seeds
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
