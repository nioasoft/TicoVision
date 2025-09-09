# TicoVision CRM - Agent Configuration

## Available Agents for Your Project

### 1. 🏗️ backend-architect
**Purpose**: Design APIs, Supabase functions, and service architecture
**Key Tasks**:
- Design RESTful APIs for fee calculations and client management
- Plan Supabase Edge Functions for letter generation
- Architect webhook handlers for payment processing
- Design multi-tenant data isolation strategies

**Usage Example**:
```
@backend-architect Design API endpoints for the fee calculation module with:
- Multi-tenant support using tenant_id
- Israeli tax compliance (9-digit tax IDs)
- Batch processing for multiple clients
- Audit logging for all changes
```

### 2. 🔒 security-auditor
**Purpose**: Review and strengthen security, RLS policies, authentication
**Key Tasks**:
- Audit Row Level Security policies for tenant isolation
- Review JWT handling and role-based access (admin, accountant, bookkeeper, client)
- Validate data encryption for sensitive information
- Ensure compliance with Israeli privacy laws

**Usage Example**:
```
@security-auditor Review our RLS policies for:
- Complete tenant isolation in clients table
- Role-based access to fee_calculations
- Secure storage of Israeli tax IDs
- Audit trail protection
```

### 3. 🚀 database-optimizer
**Purpose**: Optimize Supabase/PostgreSQL performance
**Key Tasks**:
- Design indexes for fee_calculations and client searches
- Optimize queries for dashboard aggregations
- Plan partitioning for audit_logs table
- Implement caching strategies for templates

**Usage Example**:
```
@database-optimizer Optimize queries for:
- Fetching clients with pending fees (expecting 10,000+ records)
- Dashboard metrics calculation
- Letter template rendering with variable substitution
- Audit log queries by date range
```

### 4. 💻 frontend-developer
**Purpose**: Build React components with shadcn/ui and Zustand
**Key Tasks**:
- Create reusable form components for client data
- Build responsive dashboard with charts
- Implement RTL support for Hebrew interface
- Integrate Zustand for state management

**Usage Example**:
```
@frontend-developer Create a FeeCalculationForm component with:
- shadcn/ui form components
- Hebrew/English bilingual support
- Zustand state management
- Real-time validation for Israeli tax IDs
- Auto-save functionality
```

### 5. 🧪 test-automator
**Purpose**: Set up comprehensive testing infrastructure
**Key Tasks**:
- Unit tests for fee calculation business logic
- Integration tests for Supabase RLS policies
- E2E tests for critical user workflows
- CI/CD pipeline with GitHub Actions

**Usage Example**:
```
@test-automator Create tests for:
- Fee calculation formulas with edge cases
- Multi-tenant data isolation
- Letter generation with variable substitution
- User role permissions
```

## Quick Commands

### API Design
```
@backend-architect Review and improve our API structure in /api folder
```

### Security Audit
```
@security-auditor Audit all RLS policies in our Supabase migrations
```

### Performance Check
```
@database-optimizer Analyze slow queries in our Supabase logs
```

### Component Creation
```
@frontend-developer Create a new [ComponentName] using shadcn/ui
```

### Test Coverage
```
@test-automator Add tests for [feature/component]
```

## Project Context for Agents

When invoking agents, they should know:
- **Stack**: Next.js + Supabase + shadcn/ui + Zustand
- **Multi-tenancy**: Every query needs tenant_id isolation
- **Localization**: Hebrew (RTL) and English support required
- **Scale**: Must support 10-10,000+ clients per tenant
- **Compliance**: Israeli tax laws, 9-digit tax IDs
- **White-label**: Support for customizable branding per tenant

## Best Practices

1. Always provide specific context about your current task
2. Include relevant file paths when asking for reviews
3. Specify performance requirements (e.g., "must load in <2s")
4. Mention any Israeli regulatory requirements
5. Indicate if white-label customization is needed

## Integration with CLAUDE.md

These agents work alongside your project's CLAUDE.md file. Use agents for specialized tasks while following the general guidelines in CLAUDE.md for project conventions.