# CoreAxis (BAS) — Industry-Grade Roadmap

## Where the project stands today

CoreAxis is a working, multi-tenant Business Automation System covering the four modules defined in the project scope (Finance, HR, Inventory, Sales/CRM), each backed by real database-driven logic rather than mockups:

- **Finance** — linear-regression expense forecasting and z-score anomaly detection, computed live from real `Expense`/`Invoice` records.
- **HR** — CV screening via a local pretrained sentence-embedding model (semantic similarity, not keyword matching), plus attendance anomaly detection using the same statistical technique as Finance.
- **Inventory** — per-product demand forecasting (regression over weekly stock-out history) driving AI-generated reorder recommendations.
- **Sales/CRM** — full lead/deal/contact/organization pipeline with a rule-based automation engine (`AutomationRule`).
- **AI Assistant** — an LLM-backed (Gemini) chatbot answering natural-language questions grounded in the live workspace data snapshot.

This roadmap describes the next phase: what would take CoreAxis from "a real, working FYP system" to "a system a real SME would actually adopt." None of it is required for the current evaluation — it's presented as a deliberate, scoped Phase 2, consistent with the Agile/phased structure and the "Scope expansion" risk already identified in the project's own risk register.

---

## Phase 2 Enhancements

### 1. Agentic AI Assistant (tool-calling, not just Q&A)
**Today:** the assistant reads a data snapshot and answers questions in natural language — it cannot change anything.
**Next:** give it a constrained set of callable tools (`createInvoice`, `logExpense`, `reorderStock`, `scoreCandidate`) so a manager can say *"log a $450 marketing expense for today"* and have it actually execute, with a confirmation step before any write. This is the single highest-leverage upgrade — it moves the assistant from "reporting" to "automation," which is literally the product's tagline.

### 2. Persisted, periodically-retrained forecasting models
**Today:** forecasts (Finance, Inventory) are refit from scratch via OLS regression on every page load — fast and honest, but not a "trained model" in the deployable sense.
**Next:** move to a proper time-series approach (ARIMA or Prophet for interpretability, or a small LSTM if more data volume justifies it), trained on a schedule (e.g., nightly), with model artifacts versioned and stored — enabling model comparison, rollback, and accuracy tracking over time.

### 3. Explainable AI audit trail
**Today:** AI outputs (scores, forecasts, flags) are shown but not logged with their reasoning.
**Next:** every AI-generated recommendation gets an audit record — inputs used, method, confidence, timestamp — surfaced in a dedicated "AI Decisions" log. This directly satisfies the project's own non-functional requirement that *"AI-based decision-making must be transparent and include explanations,"* and matters a great deal to real SMEs adopting automated financial/HR decisions.

### 4. Event-driven real-time architecture
**Today:** the `AutomationRule` engine and webhook integrations (WhatsApp, Meta, Stripe, Square) already exist but operate independently.
**Next:** unify them behind a proper event bus (e.g., low stock → auto-generate purchase order → notify manager → auto-create a Finance expense on confirmation), turning today's separate automations into genuine cross-module workflows — the actual meaning of "Business Automation."

### 5. Mobile app completion
**Today:** a Capacitor Android scaffold already exists in the repo but isn't finished or shipped.
**Next:** complete the native shell with push notifications for low-stock/anomaly/candidate alerts — giving managers a reason to act on AI output outside the browser.

### 6. Multi-tenant SaaS scaling
**Today:** the `Workspace` model already supports multiple tenants and subscription tiers.
**Next:** formalize this into a real go-to-market: usage-based billing tied to AI feature usage (forecast runs, chatbot queries), tenant-level resource isolation, and a proper onboarding flow — the natural path from "student project" to "sellable product."

---

## Why this is presented as a roadmap, not tonight's build list

Every item above is technically real and buildable, but each also touches core, currently-working code paths (auth, billing, the forecasting engine, the automation engine). Attempting several of these hours before an evaluation risks destabilizing a system that currently works end-to-end. The stronger evaluation story is: *"here is a real, working system, and here is a credible, scoped plan for what real-world adoption would require next"* — which is what this document is for.
