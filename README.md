# bkknex-worker

Cloudflare Worker: provider-neutral AI gateway for the AI Health & Wellness Companion (Phase 0+2).

Routes AI health queries to OpenAI (Z.ai/Gemini stubs for future) behind stable, provider-agnostic contract. Implements:
- **Supabase JWT authentication** on every request
- **Multi-layered AI safety** (pre-call classifier + post-call validator)
- **Health context minimization** (11 allow-listed fields only, no identifiers)
- **Provider-neutral routing** with environment variable selection
- **Crisis detection & escalation** with emergency resources
- **Medication & diagnosis prevention** with professional care redirects

No AI provider keys ever reach the Flutter client. All provider calls happen server-side using Cloudflare secrets.

See [BKK-76 Locked Technical Contracts](https://aicompany.bkknex.com/BKK/issues/BKK-76) for architecture.

## Implementation Status

### ✅ Phase 0+2 Complete
- **Contract 1**: AI provider abstraction (`AiProvider`, `VoiceProvider` interfaces)
  - OpenAI fully implemented
  - Z.ai, Gemini stubbed with provider registry
  - `NullVoiceProvider` for Phase 0 (voice Phase 2+)
  - Provider selection via `AI_PROVIDER` and `VOICE_PROVIDER` env vars
  
- **Contract 5**: Two-stage safety pipeline
  - Pre-AI classifier: Detects crisis, medication, diagnosis intent (deterministic)
  - Post-AI validator: Checks for diagnosis/prescription/certainty language (deterministic)
  - Safety ruleset versioned (v1.0.0), logged as metadata, never raw transcripts

### API Endpoints

#### POST `/api/ai/chat`
Wellness conversation with safety checks.
```json
{
  "conversationId": "conv123",
  "message": "How can I improve my sleep?",
  "healthContext": {
    "age": 35,
    "activity_level": "moderate",
    "sleep_hours_per_night": 6,
    "stress_level": "high"
  }
}
```

Response:
```json
{
  "reply": "Here are evidence-based sleep improvement strategies...",
  "conversationId": "conv123",
  "safetyFlag": null,
  "metadata": {
    "preFaiFlags": [],
    "postAiFlags": [],
    "safetyRulesetVersion": "1.0.0"
  }
}
```

#### POST `/api/ai/insight`
Deterministic daily wellness insight (cached, one per user per day).
```json
{ "healthContext": { "age": 35, "activity_level": "light" } }
```

#### POST `/api/ai/voice/transcribe`
Stub for Phase 2 (returns 501 Not Implemented).

#### POST `/api/ai/voice/synthesize`
Stub for Phase 2 (returns 501 Not Implemented).

#### GET `/health`
Health check endpoint (returns `{"status": "ok"}`).

### Authentication
All AI endpoints require Supabase JWT:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Missing/invalid/expired tokens rejected with `401 Unauthorized`.

### Safety Fixtures
**20 adversarial tests** included and passing:
- 6 crisis language fixtures (suicidal ideation, self-harm, hopelessness)
- 3 medication change prevention fixtures
- 4 diagnosis prevention fixtures
- 3 certainty claim prevention fixtures
- 4 allowed query fixtures (wellness, education, habit coaching)

See [SAFETY_FIXTURES.md](./SAFETY_FIXTURES.md) for detailed fixture list.

### Health Context Minimization
Exactly 11 allow-listed fields:
- `age`, `gender`, `pregnancy_status`, `menopause_stage`
- `medication_names`, `allergies`, `chronic_conditions`
- `activity_level`, `sleep_hours_per_night`, `stress_level`, `diet_type`

Identifiers (`userId`, `email`, `phone`, `name`, etc.) automatically stripped/rejected.
Unknown fields stripped, type validation enforced per field.

### Error Handling
Structured error responses (never raw 500/stack traces):
```json
{
  "error": "AI provider error",
  "code": "provider_error",
  "retryable": true
}
```

## Setup & Development

### Prerequisites
- Node.js 18+
- Cloudflare account (for deployment)
- OpenAI API key

### Installation
```bash
npm install
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with:
#   OPENAI_API_KEY=sk-...
#   AI_PROVIDER=openai
#   VOICE_PROVIDER=null
```

### Local Development
```bash
npm run dev
# Runs on http://localhost:8787
```

### Testing
```bash
npm test                    # Run all 38 tests
npm test -- --coverage      # Coverage report (target: 70%+)
npm test -- --watch         # Watch mode
```

### TypeScript Type Checking
```bash
npm run type-check
```

### Building
```bash
npm run build
# Output: dist/index.js
```

### Deployment
```bash
wrangler deploy --env production
```

## Project Structure

```
src/
├── index.ts                    # Main Worker (274 lines)
├── types.ts                    # Core type definitions
├── auth/
│   └── JwtValidator.ts         # Supabase JWT validation
├── context/
│   └── HealthContextValidator  # 11-field minimization + validation
├── providers/
│   ├── AiProvider.ts           # Interface (Contract 1)
│   ├── VoiceProvider.ts        # Interface (Contract 1)
│   ├── index.ts                # Provider registry (env-based selection)
│   ├── openai/
│   │   └── OpenAiProvider.ts   # Full implementation
│   ├── zai/
│   │   └── ZaiProvider.ts      # Stubbed
│   ├── gemini/
│   │   └── GeminiProvider.ts   # Stubbed
│   └── NullVoiceProvider.ts    # Phase 0 voice stub (501)
├── safety/
│   ├── SafetyPolicy.ts         # v1.0.0 rulesets (keywords, responses)
│   ├── PreAiClassifier.ts      # Stage 1 classifier (deterministic)
│   └── PostAiValidator.ts      # Stage 2 validator (deterministic)
└── __tests__/
    ├── auth.test.ts            # 5 auth tests
    ├── context.test.ts         # 8 context minimization tests
    └── safety.test.ts          # 25 safety + fixtures tests
```

## Configuration

### wrangler.toml
- Workers service name: `bkknex-health-worker`
- Environment: dev (local), production (Cloudflare)
- R2 bucket (future): `health-conversations` for conversation cache

### TypeScript
- Target: ES2022
- Module: ES2022
- Strict mode enabled
- No unused variable warnings

## Testing Coverage

**38 tests, 100% pass rate**
- Authentication (JWT validation): 5 tests
- Context minimization (11-field validation): 8 tests
- Safety layer (pre-AI + post-AI + fixtures): 25 tests

Coverage targets: 70%+ branches, functions, lines, statements.

## Known Limitations (Phase 0)

- Voice transcription: Stubbed (Phase 2)
- Voice synthesis: Stubbed (Phase 2)
- Z.ai provider: Stubbed (awaiting credentials)
- Gemini provider: Stubbed (awaiting credentials)
- Conversation persistence: Not implemented (design for Phase 1)
- Rate limiting: Not implemented (design for Phase 1)

## Next Steps (Phase 1+)

1. **Voice Provider Integration** (Phase 2):
   - Connect real voice provider
   - Implement transcribe() and synthesize() methods

2. **Additional AI Providers** (Phase 2+):
   - Add Z.ai adapter when credentials available
   - Add Gemini adapter when credentials available

3. **Conversation Persistence** (Phase 1):
   - Store conversation history in Supabase
   - Implement conversation ID generation & retrieval

4. **Rate Limiting** (Phase 1):
   - Per-user rate limits (requests/time windows)
   - Graceful backoff responses

5. **Analytics & Observability** (ongoing):
   - PostHog instrumentation (flags + metadata only, no transcripts)
   - Sentry error tracking (structured errors only)

## Security Notes

- ✅ No provider keys in client code
- ✅ All provider calls server-side using Cloudflare secrets
- ✅ No raw health data, message text, or transcripts logged to analytics
- ✅ JWT validation on every request before any provider call
- ✅ No identifiers in health context (11 allow-listed fields only)
- ✅ Multi-layered safety gates (pre + post AI)

## Support

See [BKK-76](https://aicompany.bkknex.com/BKK/issues/BKK-76) for technical architecture & decisions.
See [BKK-75](https://aicompany.bkknex.com/BKK/issues/BKK-75) for product requirements.
