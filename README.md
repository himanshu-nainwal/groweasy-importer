# GrowEasy Smart Importer — CRM AI Lead Parser

GrowEasy Smart Importer is a full-stack Next.js web application that takes messy lead CSV sheets (e.g. Meta/Facebook Ads exports, Google Ads leads, real estate CRM tables, or manually made sheets) and uses AI to map their headers, clean cell values, deduplicate rows, and parse them into a standardized schema matching the GrowEasy CRM.

---

## 🛠️ Tech Stack & Architecture

This application is built as a single deployable **Next.js App Router Monolith** with TypeScript:
- **Frontend**: Next.js (Client Components), Tailwind CSS, Framer Motion, Three.js, Lucide Icons, and `@tanstack/react-virtual` (for scroll virtualization).
- **Backend Route Handlers**: Next.js API Routes (`src/app/api/import/`) for file ingestion, validation guards, and streaming job status.
- **AI Integration**: Provider-agnostic LLM interface supporting Google Gemini (`gemini-1.5-flash` default) or OpenAI (`gpt-4o-mini`). Includes **direct fetch REST calls** to bypass SDK authentication constraints and natively support new **AQ. Quickstart API Keys**.
- **Serverless Backgrounding**: Uses Vercel's `@vercel/functions` `waitUntil()` call to keep background jobs processing on serverless platform limits without container freezing.
- **Validation**: Zod schema contract parsing.
- **Job Store**: In-memory job repository supporting concurrency caps and real-time polling endpoints.

```
                      +-------------------+
                      |   Messy Lead CSV  |
                      +---------+---------+
                                |
                                v
                      +---------+---------+
                      |   /api/import/    |
                      |      parse        | (Delimiter detection, BOM strip)
                      +---------+---------+
                                |
                                v
                      +---------+---------+
                      |   /api/import/    |
                      |     process       | (Initiates Job ID in Memory)
                      +---------+---------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
   +---------+---------+                 +---------+---------+
   |   Batch Splitter  |                 |  Status Polling   |
   | (25-30 leads/pkg) |                 |    Endpoint       |
   +---------+---------+                 +---------+---------+
             |                                     ^
             v (Max 3 Parallel Batches)            |
   +---------+---------+                           |
   |   AI Mapper Layer |                           |
   | (Gemini / OpenAI) |                           |
   +---------+---------+                           |
             |                                     |
             v                                     |
   +---------+---------+                           |
   |  Zod Validation   |                           |
   | & Deduplication   |                           |
   +---------+---------+                           |
             |                                     |
             v (Logs progress)                     |
   +---------+---------+                           |
   |   Job Store Map   +---------------------------+
   +-------------------+
```

---

## 🎯 Prompt-Engineering Design Notes

### 1. Batch Size Choice (30 Rows)
We chose a default batch size of **30 leads** to:
- Stay well within LLM context limits.
- Keep JSON output tokens small, avoiding truncated responses.
- Speed up processing through parallel concurrency (3 concurrent batches running in parallel).
- Handle model rate limits gracefully with a deterministic backoff retry.

### 2. Ambiguous Column Heuristics
The prompt instructs the model on rules to identify headers:
- **Phone Fields**: Look for 8-15 digit sequences in any column, ignoring formatting (e.g. `Ph. No`, `tel`, `cell`, `contact`).
- **Email Fields**: Use regex-style checks on values containing `@`.
- **Date Fields**: Parse formats (e.g., `DD/MM/YYYY`, `YYYY-MM-DD`, `UTC`) and map to standard ISO timestamp structures.
- **Notes/Comments**: Capture all remaining text fields (e.g. "Remarks", "Message", "Target Area") and consolidate them into the `crm_note` or `description` fields to prevent data loss.

### 3. Zod Guard Validation Layer
After the LLM returns mapped records, the backend runs each record through a deterministic Zod validator:
- Enforces strict enum lists for `crm_status` (`GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`) and `data_source` (`leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`). Any invalid value is set to `""`.
- Requires at least one valid email or mobile number. If both are missing, the lead is moved to the `skipped` bucket with reason `"Missing email and mobile number"`.
- Strips any additional hallucinatory keys from the JSON structure.

---

## 🚀 Setup & Execution Guide

### 1. Environment Variables
Configure your credentials in a `.env` file at the root of the project:
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Optional: OpenAI setup
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-4o-mini
```

> [!NOTE]
> **Gemini API Key support:** Both standard Google Gemini keys (`AIzaSy...`) and Google AI Studio Quickstart keys (`AQ.Ab8RN...`) are fully supported. The backend trims whitespace and bypasses standard SDK prefix checks by making direct query-parameter REST requests to prevent 401 unauthenticated errors.

### 2. Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Launch dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser.
4. Execute unit tests:
   ```bash
   npm run test
   ```

### 3. Testing with sample data
A pre-formatted sample file named `test_leads.csv` is located in the root directory. You can upload it to test the full mapping, validation, duplicate matching, and error tracking:
- **Alice Smith**: Standard valid lead (success).
- **Bob Jones**: Contains email but no phone (success, validating conditional presence).
- **Charlie Brown**: Contains phone but no email (success, validating conditional presence).
- **Alice Smith (Duplicate)**: Duplicate contact details (moves to Skipped Log).
- **David Miller**: Missing both email and phone (fails Zod validation, moves to Skipped Log).
- **Emma Watson**: Messy phone format `(555) 012-3456` (sanitizes to `5550123456` digits).

### 4. Running with Docker
1. Build and run via Docker Compose:
   ```bash
   docker-compose up --build
   ```
2. The importer is exposed on port `3000`: `http://localhost:3000`.

---

## 💡 Key UX & Motion Differentiators
1. **3D Funnel Dropzone**: A responsive canvas particle funnel using Three.js. Particles speed up and contract on file drag-over or active mapping.
2. **Conveyor Belt Animation**: Renders batch tokens sliding along a track. The scanning laser line sweep is anchored directly inside the active card to prevent overlap shifts.
3. **⌘K Command Palette**: Press `Ctrl+K` or `Cmd+K` to open a command overlay to instantly inject mock data templates (Facebook Lead Ads, Messy sheets, Real-estate entries).
4. **TanStack Scroll Virtualization**: Handles up to 10k rows smoothly without lag on the preview or results dashboards.

---

## 📌 Submission Target
- **Position Applied For**: Full-Time Full-Stack Engineer / Senior Developer
- **Submission Target Email**: `varun@groweasy.ai` (as requested by assignment prompt guidelines)
