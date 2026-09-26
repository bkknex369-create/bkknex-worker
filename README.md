# bkknex-worker

Cloudflare Worker: provider-neutral AI gateway for the AI Health & Wellness Companion.

Routes AI requests to Z.ai/Gemini/OpenAI behind a stable, provider-agnostic contract. Owns auth/session validation, rate limiting, safety policy enforcement, and context minimization. No AI provider keys are ever shipped to the Flutter client.

See [BKK-76](https://aicompany.bkknex.com/BKK/issues/BKK-76) for the execution plan.
