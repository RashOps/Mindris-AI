<div align="center">

# 🧠 Mindris AI

**AI-Powered Job Intelligence Platform**

[![Python 3.12](https://img.shields.io/badge/python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![uv](https://img.shields.io/badge/uv-workspace-DE5FE9?style=for-the-badge&logo=uv&logoColor=white)](https://docs.astral.sh/uv/)
[![Ruff](https://img.shields.io/badge/ruff-passing-30173D?style=for-the-badge&logo=ruff&logoColor=white)](https://docs.astral.sh/ruff/)
[![CrewAI](https://img.shields.io/badge/CrewAI-agents-FF6B35?style=for-the-badge)](https://www.crewai.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Gemma4-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com/)
[![Playwright](https://img.shields.io/badge/Playwright-stealth-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License](https://img.shields.io/github/license/RashOps/Mindris-AI?style=for-the-badge)](LICENSE)

*Scrape job offers from the web, extract structured intelligence with local AI — 100% offline, 100% private.*

---

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Usage](#-usage) · [Configuration](#%EF%B8%8F-configuration) · [ADRs](#-architecture-decision-records) · [Roadmap](#-roadmap)

</div>

---

## ✨ Features

- 🕵️ **Stealth Web Scraping** — Playwright with anti-Cloudflare bypass (Chrome 125 UA, human simulation, two-pass challenge detection)
- 🧠 **AI-Powered Extraction** — CrewAI agents powered by local Ollama models (Gemma 4) extract structured data from raw HTML
- 📊 **Structured Output** — Type-safe Pydantic models with `AliasChoices` to tolerate LLM key-name drift
- 🔒 **100% Private** — All AI inference runs locally on your GPU — no data leaves your machine
- 📦 **Modular Monorepo** — `uv` workspace with independent services and shared packages
- ✅ **Code Quality** — Full `ruff` ruleset (0 errors), Google-style English docstrings, Python 3.12 native types
- ⚙️ **Centralised Config** — Single `pydantic-settings` source of truth for all runtime configuration

---

## 🏗️ Architecture

```text
mindris-ai/
├── apps/                       # Frontend applications (Next.js)
├── docs/                       # Documentation, ADRs, Roadmap
│   └── adr/                    # Architecture Decision Records
├── packages/                   # Shared libraries (workspace packages)
│   ├── database/               # Pydantic models, JSON schemas
│   └── utils/                  # Logger, centralised config (pydantic-settings)
├── services/                   # Backend services (Modular Monolith)
│   ├── api-gateway/            # API entrypoint & routing (FastAPI)
│   ├── intelligence/           # AI orchestration (CrewAI, LangGraph)
│   ├── renderer/               # PDF rendering engine (Bun/Puppeteer)
│   └── scraper/                # Stealth web scraper (Playwright)
├── storage/                    # Local persistence, browser profiles
├── gemma4-32k.modelfile        # Ollama Modelfile for 32k context
├── run_pipeline.py             # End-to-end pipeline entrypoint
├── pyproject.toml              # Workspace root (uv + ruff config)
└── docker-compose.yml          # Local infrastructure orchestration
```

### Data Flow

```mermaid
graph LR
    URL[🌐 Job URL] --> S[Scraper<br/>Playwright + Stealth]
    S --> MD[📄 Markdown<br/>Clean text]
    MD --> AI[🧠 Intelligence<br/>CrewAI + Ollama]
    AI --> JO[📊 JobOffer<br/>Pydantic model]
    JO --> DB[(💾 Storage)]

    style S fill:#2EAD33,color:#fff,stroke:none
    style AI fill:#FF6B35,color:#fff,stroke:none
    style JO fill:#3776AB,color:#fff,stroke:none
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| [Python](https://www.python.org/) | ≥ 3.12 | Runtime |
| [uv](https://docs.astral.sh/uv/) | latest | Package manager & workspace |
| [Ollama](https://ollama.com/) | ≥ 0.20 | Local LLM inference |
| [Playwright](https://playwright.dev/) | ≥ 1.58 | Browser automation |

### Installation

```bash
# 1. Clone the repository
git clone git@github.com:RashOps/Mindris-AI.git
cd Mindris-AI

# 2. Install all dependencies (workspace-wide)
uv sync --all-packages

# 3. Install Playwright browsers
uv run playwright install chromium

# 4. Pull the base model
ollama pull gemma4:latest

# 5. Create the 32k context variant (run from the project root)
ollama create gemma4:32k -f gemma4-32k.modelfile
```

### Environment

Create a `.env` file at the project root:

```env
# LLM
OPENAI_API_BASE="http://127.0.0.1:11434"
OPENAI_MODEL_NAME="gemma4:32k"
OPENAI_API_KEY="ollama"
LLM_TYPE="ollama"

# Scraper
SCRAPER_HEADLESS=false
```

> [!NOTE]
> If running Ollama on a separate machine (e.g. Windows host from WSL), replace
> `127.0.0.1` with the host's IP address.

---

## 💡 Usage

### Run the full pipeline

```bash
uv run python run_pipeline.py
```

This will:
1. **Scrape** the target URL with stealth Playwright
2. **Convert** the page to clean Markdown
3. **Analyse** with CrewAI (local Ollama model)
4. **Output** a structured `JobOffer` object with extracted skills

### Example output

```python
{
    'url': 'https://recrutement.axa.fr/nos-offres-emploi/...',
    'title': 'Data Analyst (F/H) en alternance',
    'company': 'JURIDICA',
    'location': 'MARLY LE ROI CEDEX, Yvelines',
    'hard_skills': ['Power Bi', 'Excel', 'SAS', 'SQL', 'R', 'Python'],
    'soft_skills': ['Dynamique', 'Curieux', 'Autonome', "Esprit d'analyse"],
    'experience_level': 'Student',
    'remote_policy': 'On-site',
    'salary_range': None,
}
```

### Scraper standalone

```python
import asyncio
from scraper.core import BaseScraper

async def main():
    async with BaseScraper(headless=False) as s:
        md = await s.get_cleaned_content("https://example.com/job", selector="main")
        print(md)

asyncio.run(main())
```

---

## ⚙️ Configuration

All settings are centralised in `packages/utils/config.py` and read from `.env`:

| Variable | Default | Description |
|---|---|---|
| `LLM_TYPE` | `ollama` | LLM provider (`ollama`, `openai`) |
| `OPENAI_API_BASE` | `http://127.0.0.1:11434` | Ollama server URL |
| `OPENAI_MODEL_NAME` | `gemma4:latest` | Model identifier |
| `OPENAI_API_KEY` | `ollama` | API key (dummy for Ollama) |
| `LLM_NUM_CTX` | `32768` | Context window size |
| `SCRAPER_HEADLESS` | `true` | Run browser without UI |
| `SCRAPER_TIMEOUT_MS` | `60000` | Page load timeout (ms) |

```python
from utils.config import settings

settings.openai_api_base   # → "http://127.0.0.1:11434"
settings.llm_num_ctx       # → 32768
settings.scraper_headless  # → True
```

---

## 🔍 Code Quality

```bash
# Lint (0 errors expected)
uv run ruff check services/ packages/ run_pipeline.py

# Format
uv run ruff format services/ packages/ run_pipeline.py
```

**Active ruff rules:** `E` `F` `I` `N` `W` `B` `UP` `D` `ANN` `T20` `SIM` `C4`  
**Docstring convention:** Google  
**Target version:** Python 3.12  

---

## 📚 Architecture Decision Records

All major technical decisions are documented in [`docs/adr/`](docs/adr/):

| ADR | Title |
|---|---|
| [001](docs/adr/001-core-architecture.md) | Core Architecture |
| [002](docs/adr/002-paradigme-de-programmation-hybride.md) | Hybrid Programming Paradigm |
| [003](docs/adr/003-workspace-restructuring-best-practices.md) | Workspace Restructuring Best Practices |
| [004](docs/adr/004-ai-scraping-pipeline-decisions.md) | AI Scraping Pipeline — 12 Technical Decisions |

---

## 🗺️ Roadmap

- [x] Stealth web scraper with Cloudflare bypass
- [x] CrewAI pipeline with local Ollama inference
- [x] Structured Pydantic output with alias tolerance
- [x] Centralised config and logger
- [x] Full ruff compliance (227 → 0 errors)
- [ ] FastAPI gateway for HTTP endpoint
- [ ] Supabase/PGVector persistence
- [ ] CV parsing and matching engine
- [ ] PDF resume renderer (Bun/Puppeteer)
- [ ] Frontend dashboard (Next.js)
- [ ] Docker Compose production deployment
- [ ] CI/CD pipeline (GitHub Actions)

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center"><b>Category</b></td>
<td align="center"><b>Technology</b></td>
</tr>
<tr>
<td>Language</td>
<td>Python 3.12</td>
</tr>
<tr>
<td>Package Manager</td>
<td>uv (workspace mode)</td>
</tr>
<tr>
<td>AI Framework</td>
<td>CrewAI + LangGraph</td>
</tr>
<tr>
<td>LLM Runtime</td>
<td>Ollama (Gemma 4, 5B params, Q4_K_M)</td>
</tr>
<tr>
<td>Web Scraping</td>
<td>Playwright + playwright-stealth</td>
</tr>
<tr>
<td>Data Validation</td>
<td>Pydantic v2 + pydantic-settings</td>
</tr>
<tr>
<td>Linter/Formatter</td>
<td>Ruff</td>
</tr>
<tr>
<td>API (planned)</td>
<td>FastAPI</td>
</tr>
<tr>
<td>Database (planned)</td>
<td>Supabase / PGVector</td>
</tr>
<tr>
<td>Frontend (planned)</td>
<td>Next.js</td>
</tr>
</table>

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE).

---

<div align="center">
<sub>Built with 🧠 by <a href="https://github.com/RashOps">RashOps</a></sub>
</div>
