# CLAUDE.md - AI Assistant Guide

This document provides essential context for AI assistants working with the AWS Account Vending Machine codebase.

## Project Overview

This is an **AWS Account Vending Machine** - a serverless proof-of-concept that automates provisioning and lifecycle management of ephemeral AWS sandbox accounts. Users can request temporary sandbox accounts via a web interface, with automatic cleanup via aws-nuke when accounts expire.

**Blog Reference**: https://benoitboure.com/i-built-a-serverless-ephemeral-aws-account-vending-machine

## Quick Reference Commands

```bash
# Install dependencies (from root)
npm install

# Backend commands (CDK infrastructure)
npm run build -w backend      # Compile TypeScript
npm run test -w backend       # Run Jest tests
npm run deploy -w backend     # Deploy all CDK stacks
npm run cdk -w backend -- <cmd>  # Run CDK CLI commands

# Frontend commands (React app)
npm run dev -w frontend       # Start Vite dev server with HMR
npm run build -w frontend     # Build production bundle
npm run lint -w frontend      # Run ESLint
npm run preview -w frontend   # Preview production build
```

## Project Structure

```
aws-account-vending-machine-demo/
├── packages/
│   ├── backend/                    # AWS CDK infrastructure (TypeScript)
│   │   ├── stack/
│   │   │   ├── bin/
│   │   │   │   └── aws-account-vending-machine.ts  # CDK app entry point
│   │   │   ├── lib/
│   │   │   │   ├── aws-account-vending-machine.ts  # Main stack orchestrator
│   │   │   │   ├── dynamodb-stack.ts               # DynamoDB accounts table
│   │   │   │   ├── identity-stack.ts               # Cognito + SSO auth
│   │   │   │   ├── event-bus-stack.ts              # EventBridge setup
│   │   │   │   ├── api-stack/                      # AppSync GraphQL API
│   │   │   │   │   ├── api-stack.ts                # API definition
│   │   │   │   │   └── resolvers/                  # GraphQL resolvers
│   │   │   │   ├── orchestration/                  # Step Functions workflows
│   │   │   │   │   └── constructs/
│   │   │   │   │       ├── assign-account.ts       # Account assignment workflow
│   │   │   │   │       └── release-account.ts      # Account cleanup workflow
│   │   │   │   └── frontend/
│   │   │   │       └── frontend-stack.ts           # S3 + CloudFront deployment
│   │   │   └── test/                               # Jest tests
│   │   ├── cdk.json
│   │   └── package.json
│   │
│   └── frontend/                   # React + TypeScript + Vite
│       ├── src/
│       │   ├── App.tsx             # Main app with auth flow
│       │   ├── Home.tsx            # Account list and management UI
│       │   ├── main.tsx            # Entry point
│       │   ├── queries.ts          # GraphQL hooks (React Query)
│       │   ├── modals/
│       │   │   └── RequestAccountModal.tsx  # New account request form
│       │   └── providers/
│       │       └── graphql.ts      # GraphQL client context
│       ├── vite.config.ts
│       └── package.json
│
├── package.json                    # Root monorepo config (npm workspaces)
├── jest.config.js
└── README.md                       # Setup instructions
```

## Technology Stack

### Backend (Infrastructure as Code)
- **AWS CDK 2.173.2** - Infrastructure definitions
- **TypeScript 5.6.3** - Primary language
- **AWS Services**:
  - DynamoDB - Account state storage
  - AppSync - GraphQL API with Cognito auth
  - Cognito - User authentication via SAML/SSO
  - Step Functions - Workflow orchestration (JSONata)
  - EventBridge - Async notifications and scheduling
  - ECS Fargate - aws-nuke container execution
  - S3 + CloudFront - Frontend hosting

### Frontend
- **React 18.3.1** with TypeScript
- **Vite 6.0.5** - Build tooling
- **AWS Amplify 6.11.0** - AWS SDK and auth
- **Ant Design 5.22.7** - Component library
- **TanStack React Query 5.62.11** - Server state management
- **React Router 7.1.1** - Navigation
- **Luxon 3.5.0** - Date/time handling

## Architecture

### Data Flow: Account Request
```
1. User submits request (name, expiration days)
2. GraphQL mutation → AppSync resolver
3. AssignAccount Step Function triggered
4. Workflow: Find FREE account → Lock → Assign SSO permissions → Schedule expiration
5. EventBridge publishes accountAssigned event
6. Frontend receives update via GraphQL subscription
```

### Data Flow: Account Release
```
1. User clicks destroy OR scheduler triggers expiration
2. ReleaseAccount Step Function triggered
3. ECS Fargate runs aws-nuke to clean all resources
4. Account status updated to FREE in DynamoDB
```

### DynamoDB Schema
- **Table**: accounts
- **Primary Key**: `accountId` (String)
- **GSI 1** (`statusIndex`): `status` - Query free vs used accounts
- **GSI 2** (`userIndex`): `assignedTo` + `assignedAt` - Query user's accounts

## Code Conventions

### TypeScript
- Strict mode enabled in both packages
- ES2020 target
- Backend: CommonJS modules, Frontend: ESNext modules

### Code Style
- **Prettier**: 2-space indent, single quotes, trailing commas
- **ESLint**: React hooks rules enabled for frontend
- No emojis unless explicitly requested

### File Organization
- Backend stacks in `packages/backend/stack/lib/`
- GraphQL resolvers in `packages/backend/stack/lib/api-stack/resolvers/`
- Step Function constructs in `packages/backend/stack/lib/orchestration/constructs/`
- Frontend components in `packages/frontend/src/`

### Naming Conventions
- CDK constructs: PascalCase (e.g., `AssignAccountWorkflow`)
- TypeScript files: kebab-case (e.g., `assign-account.ts`)
- React components: PascalCase files and exports
- GraphQL operations: camelCase (e.g., `requestAccount`, `listMyAccounts`)

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/stack/bin/aws-account-vending-machine.ts` | CDK app entry, configuration values |
| `backend/stack/lib/aws-account-vending-machine.ts` | Main stack orchestration |
| `backend/stack/lib/api-stack/resolvers/*.ts` | GraphQL resolver implementations |
| `backend/stack/lib/orchestration/constructs/*.ts` | Step Functions workflow definitions |
| `frontend/src/queries.ts` | GraphQL hooks for API calls |
| `frontend/src/Home.tsx` | Main account management UI |

## Testing

```bash
# Run backend tests
npm run test -w backend

# Tests located in packages/backend/test/
# Uses Jest with ts-jest transformer
```

Test files follow pattern: `*.test.ts`

## Configuration

### Backend Configuration (bin/aws-account-vending-machine.ts)
Key configuration sections:
- `managementAccount` - AWS Organization management account details
- `deploymentAccount` - Account where CDK deploys
- `application.metadataUrl` - SAML metadata from IAM Identity Center
- `identity.domainPrefix` - Cognito domain (must be globally unique)
- `awsNuke.blockList` - Account IDs to protect from aws-nuke

### Frontend Configuration
- Runtime config generated during CDK deployment
- `config.json` with GraphQL endpoint and Cognito settings
- Located in S3 bucket, fetched at app startup

## Common Tasks for AI Assistants

### Adding a New GraphQL Operation
1. Define schema in `api-stack.ts`
2. Create resolver in `resolvers/` directory
3. Add hook in `frontend/src/queries.ts`
4. Update UI components as needed

### Modifying Step Functions Workflow
1. Edit constructs in `orchestration/constructs/`
2. Uses JSONata for transformations
3. Test with `cdk synth` before deploy

### Adding UI Components
1. Create component in `frontend/src/`
2. Use Ant Design components for consistency
3. Use React Query hooks for data fetching

### Debugging
- Backend: CloudWatch Logs for Lambda/Step Functions
- Frontend: Browser DevTools, Vite dev server logs
- GraphQL: AppSync console for query testing

## Important Notes

1. **Deployment Order**: Backend must be deployed first; frontend is built during CDK deployment
2. **Multi-Account**: Requires AWS Organizations with management account trust relationships
3. **aws-nuke**: Container cleans sandbox accounts; ensure blockList is configured
4. **Auth Flow**: SSO → Cognito SAML → Custom attributes (userId, username, email)
5. **Real-time Updates**: GraphQL subscriptions via EventBridge → AppSync
