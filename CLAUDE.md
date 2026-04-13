# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Account Vending Machine — a full-stack TypeScript application that lets authenticated users request temporary AWS accounts from a pre-provisioned pool. Built with AWS CDK (TypeScript) for the backend and React + Vite for the frontend. Uses AppSync GraphQL, Step Functions (with JSONata), DynamoDB, Cognito (SSO via SAML), EventBridge, and aws-nuke (ECS Fargate) for automated account cleanup.

## Setup

npm install

## Common Commands

# Backend CDK commands (run from repo root)
cd packages/backend && npx cdk synth
cd packages/backend && npx cdk diff --all
cd packages/backend && npx cdk deploy --all --require-approval never

# Frontend dev server
npm run dev -w frontend

# Frontend build
npm run build -w frontend

# Frontend lint
npm run lint -w frontend

# Run tests
npx jest

# Backend tests only
npm test -w backend

## Directory Structure

.
├── packages/
│   ├── backend/
│   │   ├── cdk.json                          # CDK app entry point
│   │   └── stack/
│   │       ├── bin/aws-account-vending-machine.ts   # CDK app config (account IDs, SSO ARNs)
│   │       ├── lib/
│   │       │   ├── aws-account-vending-machine.ts   # Top-level construct wiring all stacks
│   │       │   ├── identity-stack.ts                # Cognito user pool + SAML IdP
│   │       │   ├── dynamodb-stack.ts                # Accounts table
│   │       │   ├── event-bus-stack.ts               # EventBridge bus
│   │       │   ├── api-stack/                       # AppSync GraphQL API
│   │       │   │   ├── graphql/schema.graphql
│   │       │   │   └── graphql/resolvers/           # JS resolvers (request/list/destroy)
│   │       │   ├── orchestration/                   # Step Functions state machines
│   │       │   │   └── constructs/
│   │       │   │       ├── assign-account.ts        # Assign + lock + SSO permission + schedule destroy
│   │       │   │       └── release-account.ts       # aws-nuke via ECS + release back to pool
│   │       │   └── frontend/frontend-stack.ts       # S3 + CloudFront hosting
│   │       ├── aws-nuke/                            # Dockerfile + config for account cleanup
│   │       └── test/
│   └── frontend/
│       └── src/
│           ├── App.tsx                # Amplify auth + routing
│           ├── Home.tsx               # Account list view
│           ├── queries.ts             # GraphQL queries/mutations
│           ├── modals/                # Request account modal
│           └── providers/graphql.ts   # GraphQL client context

## Architecture

**Authentication flow**: Cognito user pool with SAML federation to AWS SSO. Frontend uses Amplify Auth with redirect-based sign-in. AppSync API authorizes via Cognito user pool tokens.

**Account assignment** (Step Functions):
1. Query DynamoDB `statusIndex` for a FREE account
2. Conditionally lock it (DynamoDB conditional update to USED)
3. Create SSO account assignment via cross-account role in the management account
4. Schedule automatic cleanup via EventBridge Scheduler
5. Emit success/failure event to EventBridge -> AppSync subscription notifies frontend

**Account release** (Step Functions):
1. Run aws-nuke in ECS Fargate to clean all resources in the account
2. Remove SSO assignment
3. Reset DynamoDB status back to FREE

**Cross-account**: The deployment account assumes a `VendingMachine` role in the management account for SSO admin operations. aws-nuke assumes an `AWSNukeRole` in each sandbox account.

## Configuration

All configuration lives in `packages/backend/stack/bin/aws-account-vending-machine.ts`:

| Property | Purpose |
|---|---|
| `managementAccount.accountId` | AWS Organizations management account |
| `managementAccount.instanceArn` | SSO instance ARN |
| `managementAccount.permissionSetArn` | SSO permission set to assign to users |
| `deploymentAccount.accountId` | Account where CDK deploys the vending machine |
| `application.metadataUrl` | SAML metadata URL from AWS SSO |
| `identity.callbackUrls` | OAuth callback URLs (localhost for dev) |
| `identity.domainPrefix` | Cognito hosted UI domain prefix |
| `awsNuke.blockList` | Account IDs that aws-nuke must never touch |
| `awsNuke.regions` | Regions to nuke (defaults to all) |

## Testing

Tests use Jest with ts-jest. Test files in `packages/backend/stack/test/`.

npx jest
npx jest --watch

## Code Style

Prettier configured: 2-space indent, single quotes, trailing commas. See `.prettierrc`.
Frontend uses ESLint with React hooks and React Refresh plugins.
