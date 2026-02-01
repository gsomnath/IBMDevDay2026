# SpringBoot Project Estimation Guide

## Technology: SpringBoot
## Category: Estimation
## Version: 2026

---

## 1. Story Point Reference Matrix

### REST API Endpoints

| Endpoint Type | Complexity | Story Points | Hours (Avg) |
|--------------|------------|--------------|-------------|
| Simple CRUD (single entity) | Low | 2 | 4-6 |
| CRUD with validation | Low-Medium | 3 | 6-8 |
| CRUD with relationships | Medium | 5 | 10-15 |
| Complex query endpoint | Medium | 5 | 10-15 |
| Bulk operations | Medium-High | 8 | 16-24 |
| File upload/download | Medium | 5 | 10-15 |
| Streaming endpoint | High | 13 | 25-40 |
| GraphQL endpoint | High | 8-13 | 20-35 |

### Entity & Database

| Task Type | Complexity | Story Points | Hours (Avg) |
|-----------|------------|--------------|-------------|
| Simple entity (< 5 fields) | Low | 1 | 2-3 |
| Complex entity (5-15 fields) | Medium | 3 | 5-8 |
| Entity with relationships | Medium | 5 | 8-12 |
| Custom repository queries | Low-Medium | 2-3 | 4-6 |
| Specification/dynamic queries | Medium | 5 | 8-12 |
| Database migration (simple) | Low | 1 | 2-3 |
| Database migration (data) | Medium-High | 5-8 | 10-20 |

### Security

| Task Type | Complexity | Story Points | Hours (Avg) |
|-----------|------------|--------------|-------------|
| Basic authentication | Medium | 5 | 10-15 |
| JWT implementation | Medium-High | 8 | 16-24 |
| OAuth2/OIDC integration | High | 13 | 25-40 |
| Role-based access control | Medium | 5 | 10-15 |
| Method-level security | Medium | 5 | 8-12 |
| API key authentication | Low-Medium | 3 | 6-8 |

### Integration

| Task Type | Complexity | Story Points | Hours (Avg) |
|-----------|------------|--------------|-------------|
| REST client (simple) | Low | 2 | 4-6 |
| REST client with retry/circuit breaker | Medium | 5 | 10-15 |
| Message queue producer | Medium | 5 | 8-12 |
| Message queue consumer | Medium | 5 | 10-15 |
| Email service integration | Low-Medium | 3 | 6-8 |
| External API integration | Medium-High | 8 | 15-25 |
| Caching (Redis) | Medium | 5 | 10-15 |

---

## 2. Project Size Estimation

### Microservice Estimation Template

| Component | Small | Medium | Large |
|-----------|-------|--------|-------|
| Entities | 3-5 | 6-12 | 13+ |
| REST Endpoints | 10-20 | 21-50 | 51+ |
| External Integrations | 1-2 | 3-5 | 6+ |
| Background Jobs | 0-2 | 3-5 | 6+ |
| **Total Story Points** | 40-80 | 80-200 | 200+ |
| **Duration (weeks)** | 4-6 | 8-16 | 16+ |
| **Team Size** | 2-3 | 4-6 | 6+ |

### Sprint Velocity Assumptions

| Team Size | Velocity (SP/Sprint) | Notes |
|-----------|---------------------|-------|
| 2 developers | 16-24 | Senior level |
| 3 developers | 24-36 | Mixed experience |
| 4 developers | 32-48 | Mixed experience |
| 5 developers | 40-55 | Senior + Junior mix |

---

## 3. Historical Project Data

### Project: Customer Portal API (2025)

```yaml
project_name: Customer Portal API
technology: SpringBoot 3.2
duration: 12 weeks
team_size: 4 developers
total_story_points: 156

breakdown:
  entities: 8
  rest_endpoints: 35
  security: JWT + OAuth2
  integrations:
    - Stripe payment
    - SendGrid email
    - S3 file storage
  background_jobs: 3

effort_distribution:
  development: 60%
  testing: 25%
  documentation: 5%
  deployment: 10%

velocity_per_sprint: 26 SP
sprints_completed: 6
```

### Project: Inventory Management System (2025)

```yaml
project_name: Inventory Management System
technology: SpringBoot 3.1
duration: 8 weeks
team_size: 3 developers
total_story_points: 89

breakdown:
  entities: 12
  rest_endpoints: 28
  security: JWT
  integrations:
    - PostgreSQL
    - Redis cache
    - RabbitMQ
  background_jobs: 5

effort_distribution:
  development: 55%
  testing: 30%
  documentation: 5%
  deployment: 10%

velocity_per_sprint: 22 SP
sprints_completed: 4
```

### Project: Reporting Dashboard API (2024)

```yaml
project_name: Reporting Dashboard API
technology: SpringBoot 3.0
duration: 6 weeks
team_size: 2 developers
total_story_points: 55

breakdown:
  entities: 5
  rest_endpoints: 15
  security: API Key
  integrations:
    - MongoDB
    - Elasticsearch
  background_jobs: 2
  special_features:
    - Complex aggregations
    - Export to PDF/Excel

effort_distribution:
  development: 65%
  testing: 20%
  documentation: 5%
  deployment: 10%

velocity_per_sprint: 18 SP
sprints_completed: 3
```

---

## 4. Risk Factors & Multipliers

| Risk Factor | Multiplier | Description |
|-------------|------------|-------------|
| New technology | 1.3x | Team learning curve |
| Legacy integration | 1.4x | Undocumented systems |
| Complex business logic | 1.25x | Many edge cases |
| Regulatory compliance | 1.5x | GDPR, HIPAA, etc. |
| High availability requirements | 1.3x | 99.9%+ uptime |
| Performance critical | 1.25x | Sub-100ms response |
| Junior team | 1.4x | More mentoring needed |
| Remote team (multiple TZ) | 1.2x | Communication overhead |
| Unclear requirements | 1.5x | Scope creep risk |

---

## 5. Quick Estimation Formula

```
Total Effort = Base Points × Risk Multiplier × (1 + Buffer%)

Where:
- Base Points = Sum of all component story points
- Risk Multiplier = Product of applicable risk factors
- Buffer% = 15-25% for unknowns
```

### Example Calculation

```
New Customer API:
- 5 entities (5 × 3 = 15 SP)
- 20 endpoints (20 × 3 = 60 SP)
- JWT security (8 SP)
- 2 integrations (2 × 5 = 10 SP)
- Base Points = 93 SP

Risk Factors:
- New technology: 1.3
- Complex business: 1.25
- Risk Multiplier = 1.625

Buffer: 20%

Total = 93 × 1.625 × 1.2 = 181 SP
Duration = 181 / 30 velocity = 6 sprints = 12 weeks
```

---

## 6. Common Underestimation Areas

| Area | Typical Miss | Recommendation |
|------|--------------|----------------|
| Error handling | 20-30% | Add 2-3 SP per complex endpoint |
| Logging & monitoring | 15-20% | Add 5-8 SP per microservice |
| Documentation | 10-15% | Add 1 SP per 5 endpoints |
| Performance testing | 20% | Add 8-13 SP per project |
| Security hardening | 25% | Add 8-13 SP per project |
| CI/CD setup | Often missed | Add 5-8 SP per project |
