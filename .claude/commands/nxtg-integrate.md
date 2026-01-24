# Integrate Command

Set up and manage third-party integrations, API clients, and external service connections with best practices.

## Usage

```bash
/integrate <service> [--configure] [--test] [--scaffold] [--list]
```

## Arguments

- `service`: Service name (stripe, github, slack, aws, openai, etc.)
- `--configure`: Interactive configuration wizard
- `--test`: Test integration connectivity
- `--scaffold`: Generate integration code scaffold
- `--list`: List available integration templates

## Supported Integrations

### Payment Processors
- Stripe - Payment processing
- PayPal - Payment processing
- Square - Payment processing

### Cloud Providers
- AWS - Cloud infrastructure
- GCP - Cloud infrastructure
- Azure - Cloud infrastructure

### Developer Tools
- GitHub - Repository management
- GitLab - Repository management
- Bitbucket - Repository management

### Communication
- Slack - Team communication
- Discord - Team communication
- Twilio - SMS/Voice
- SendGrid - Email

### AI/ML Services
- OpenAI - GPT models
- Anthropic - Claude models
- Google AI - Gemini models

### Monitoring
- Sentry - Error tracking
- DataDog - Monitoring
- New Relic - APM

### Databases
- PostgreSQL - Relational database
- MongoDB - Document database
- Redis - Cache/message broker

## Best Practices

1. Always store secrets in environment variables
2. Implement retry logic for network calls
3. Use circuit breakers for external services
4. Log all integration events
5. Monitor integration health
6. Implement webhook signature verification
7. Handle rate limits gracefully
8. Use connection pooling
9. Implement timeouts
10. Test with mocks

## See Also

- `/feature` - Implement integration features
- `/gap-analysis` - Identify missing integrations
- `/deploy` - Deploy with integrations
