## Project Rules (Non‑Negotiable)

1. **Never hard‑code secrets** – All credentials and API keys must be sourced from environment variables.
2. **LLM output is never executed directly** – Every generated SQL statement must pass validation, safety checks, and impact analysis before any execution.
3. **Only schema metadata is sent to the LLM** – Do **not** send row data, actual record values, or database credentials.
4. **Modular architecture** – Keep modules separate:
   - `groq` – LLM integration.
   - `schema` – Schema retrieval and caching.
   - `validator` – Zod and SQL validation.
   - `impact` – Impact analysis and risk warnings.
   - `optimizer` – Query optimization suggestions.
   - `db` – Database connection and execution layer.
5. **Strict TypeScript with tests** – All backend code must use `strict` mode and include unit tests for each service.
