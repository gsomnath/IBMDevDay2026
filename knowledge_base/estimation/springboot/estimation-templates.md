# SpringBoot Feature Estimation Templates

## Technology: SpringBoot
## Category: Estimation Templates
## Version: 2026

---

## Template 1: New REST API Endpoint

```yaml
feature_name: "[FEATURE NAME]"
description: "[BRIEF DESCRIPTION]"

# Basic Information
endpoint_count: 0
entity_changes: 0
new_entities: 0

# Effort Breakdown
tasks:
  - name: "Entity/DTO creation"
    points: 0
    hours: 0
    
  - name: "Repository layer"
    points: 0
    hours: 0
    
  - name: "Service layer with business logic"
    points: 0
    hours: 0
    
  - name: "Controller endpoints"
    points: 0
    hours: 0
    
  - name: "Validation & error handling"
    points: 0
    hours: 0
    
  - name: "Unit tests"
    points: 0
    hours: 0
    
  - name: "Integration tests"
    points: 0
    hours: 0
    
  - name: "API documentation"
    points: 0
    hours: 0

# Totals
total_story_points: 0
total_hours: 0
buffer_percentage: 20
final_estimate_hours: 0

# Risk Assessment
risks:
  - description: ""
    impact: "low|medium|high"
    multiplier: 1.0

# Dependencies
dependencies:
  - name: ""
    status: "available|in-progress|blocked"
```

---

## Template 2: Authentication Feature

```yaml
feature_name: "User Authentication System"
description: "Complete JWT-based authentication with refresh tokens"

# Implementation Details
auth_type: "JWT"
includes_refresh_token: true
includes_password_reset: true
includes_email_verification: true
includes_2fa: false

# Effort Breakdown
tasks:
  - name: "User entity and repository"
    points: 3
    hours: 6
    
  - name: "JWT service implementation"
    points: 5
    hours: 12
    
  - name: "Authentication filter"
    points: 5
    hours: 10
    
  - name: "Security configuration"
    points: 5
    hours: 10
    
  - name: "Login/Register endpoints"
    points: 3
    hours: 8
    
  - name: "Refresh token mechanism"
    points: 5
    hours: 12
    
  - name: "Password reset flow"
    points: 5
    hours: 12
    
  - name: "Email verification"
    points: 5
    hours: 10
    
  - name: "Unit tests"
    points: 5
    hours: 12
    
  - name: "Integration tests"
    points: 5
    hours: 12
    
  - name: "Security documentation"
    points: 2
    hours: 4

# Totals
total_story_points: 48
total_hours: 108
buffer_percentage: 25
final_estimate_hours: 135

# Timeline
estimated_sprints: 2
recommended_team_size: 2
```

---

## Template 3: External Integration

```yaml
feature_name: "Third-Party API Integration"
description: "Integration with external service using REST API"

# Integration Details
integration_type: "REST API"
requires_authentication: true
auth_method: "OAuth2|API Key|Basic"
has_webhook: false
requires_retry_logic: true
requires_circuit_breaker: true

# Effort Breakdown
tasks:
  - name: "API client configuration"
    points: 3
    hours: 6
    
  - name: "Authentication handling"
    points: 3
    hours: 6
    
  - name: "Request/Response DTOs"
    points: 2
    hours: 4
    
  - name: "Service layer implementation"
    points: 5
    hours: 12
    
  - name: "Retry logic (Resilience4j)"
    points: 3
    hours: 8
    
  - name: "Circuit breaker"
    points: 3
    hours: 6
    
  - name: "Error handling & logging"
    points: 3
    hours: 6
    
  - name: "Unit tests with mocks"
    points: 3
    hours: 8
    
  - name: "Integration tests (WireMock)"
    points: 5
    hours: 12
    
  - name: "Documentation"
    points: 1
    hours: 2

# Totals
total_story_points: 31
total_hours: 70
buffer_percentage: 20
final_estimate_hours: 84

# Risk Factors
risks:
  - description: "API documentation quality"
    impact: "medium"
    multiplier: 1.2
    
  - description: "Rate limiting concerns"
    impact: "low"
    multiplier: 1.1
```

---

## Template 4: Database Migration

```yaml
feature_name: "Database Schema Migration"
description: "Schema changes with data migration"

# Migration Details
migration_type: "schema_change|data_migration|both"
affected_tables: 0
records_to_migrate: 0
requires_downtime: false
rollback_strategy: "automatic|manual"

# Effort Breakdown
tasks:
  - name: "Migration script development"
    points: 0
    hours: 0
    
  - name: "Data transformation logic"
    points: 0
    hours: 0
    
  - name: "Rollback script"
    points: 0
    hours: 0
    
  - name: "Entity/Repository updates"
    points: 0
    hours: 0
    
  - name: "Service layer updates"
    points: 0
    hours: 0
    
  - name: "Testing in dev environment"
    points: 0
    hours: 0
    
  - name: "Testing in staging"
    points: 0
    hours: 0
    
  - name: "Production deployment plan"
    points: 0
    hours: 0

# Risk Assessment
risks:
  - description: "Data integrity"
    impact: "high"
    mitigation: "Extensive testing, backup strategy"
    
  - description: "Performance during migration"
    impact: "medium"
    mitigation: "Batch processing, off-peak deployment"
```

---

## Template 5: Microservice Creation

```yaml
feature_name: "New Microservice"
description: "Complete new SpringBoot microservice"

# Service Details
service_name: ""
purpose: ""
communication_style: "sync|async|both"

# Components
entities: 0
rest_endpoints: 0
message_consumers: 0
message_producers: 0
scheduled_jobs: 0
external_integrations: 0

# Effort Breakdown
tasks:
  - name: "Project setup & configuration"
    points: 3
    hours: 6
    
  - name: "Entity layer"
    points: 0  # entities × 3
    hours: 0
    
  - name: "Repository layer"
    points: 0  # entities × 2
    hours: 0
    
  - name: "Service layer"
    points: 0  # endpoints × 2
    hours: 0
    
  - name: "Controller layer"
    points: 0  # endpoints × 1
    hours: 0
    
  - name: "Security configuration"
    points: 5
    hours: 10
    
  - name: "Message handling"
    points: 0  # (consumers + producers) × 3
    hours: 0
    
  - name: "Scheduled jobs"
    points: 0  # jobs × 3
    hours: 0
    
  - name: "External integrations"
    points: 0  # integrations × 5
    hours: 0
    
  - name: "Unit tests"
    points: 0  # total_code_points × 0.3
    hours: 0
    
  - name: "Integration tests"
    points: 0  # total_code_points × 0.4
    hours: 0
    
  - name: "Dockerfile & CI/CD"
    points: 5
    hours: 12
    
  - name: "Observability (logs, metrics, traces)"
    points: 5
    hours: 10
    
  - name: "API documentation"
    points: 3
    hours: 6

# Calculation Formula
# base_points = (entities × 5) + (endpoints × 3) + (consumers × 3) + 
#               (producers × 3) + (jobs × 3) + (integrations × 5) + 21
# testing_points = base_points × 0.7
# total_points = base_points + testing_points
```

---

## Quick Reference: Story Point Guidelines

| Points | Complexity | Typical Examples |
|--------|------------|------------------|
| 1 | Trivial | Config change, typo fix |
| 2 | Simple | Simple endpoint, minor refactor |
| 3 | Small | CRUD endpoint, simple validation |
| 5 | Medium | Complex query, integration point |
| 8 | Large | New feature, complex logic |
| 13 | Very Large | Major component, high uncertainty |
| 21+ | Epic | Break it down further |
