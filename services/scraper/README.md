# Mindris Scraper

Package Python responsable de l’extraction d’offres d’emploi en Markdown propre.

Il est appelé par `services/api-gateway` et `services/intelligence` dans les
pipelines d’optimisation, d’ATS et de Workflow. Il n’expose pas d’API HTTP.

## Responsabilités

- Ouvrir des pages d’offres avec Playwright et stealth mode.
- Réutiliser un profil navigateur local pour conserver cookies/session.
- Détecter les challenges Cloudflare et éviter d’envoyer du bruit à l’IA.
- Nettoyer le HTML en Markdown LLM-ready.
- Basculer vers des providers proxy quand la stratégie le permet.

## Modules principaux

- `core.py` : `BaseScraper`, Playwright persistant, nettoyage HTML/Markdown.
- `smart_scraper.py` : orchestration des stratégies et fallback providers.
- `proxy_scraper.py` : providers Scrape.do et ScrapingBee.

## Stratégies de scraping

La stratégie est contrôlée par `SCRAPER_STRATEGY` :

| Valeur | Comportement |
| --- | --- |
| `auto` | Playwright puis Scrape.do puis ScrapingBee |
| `playwright_only` | Playwright local uniquement |
| `proxy_first` | Scrape.do puis ScrapingBee, sans navigateur local |

Le fallback cloud peut être désactivé avec :

```env
SCRAPER_PROXY_FALLBACK=false
```

## Développement local

Depuis la racine du repo :

```bash
uv sync --all-packages
```

Installer le navigateur Playwright si nécessaire :

```bash
uv run playwright install chromium
```

Avec dépendances système Playwright :

```bash
uv run playwright install --with-deps chromium
```

Le scraper est normalement exercé via le gateway :

```bash
./scripts/dev_local.sh
```

Puis utiliser une route qui accepte une URL d’offre, par exemple CV Builder,
ATS Score ou Workflow.

## Configuration utile

- `SCRAPER_HEADLESS` : `true` par défaut en local automatisé.
- `SCRAPER_TIMEOUT_MS` : timeout de navigation Playwright.
- `SCRAPER_STRATEGY` : `auto`, `playwright_only`, `proxy_first`.
- `SCRAPER_PROXY_FALLBACK` : autorise ou non les providers cloud.
- `SCRAPE_DO_API` : clé Scrape.do.
- `SCRAPINGBEE_API` : clé ScrapingBee.
- `STORAGE_DIR` : contient le profil navigateur persistant
  `browser_profile/`.

## Vérifications

Tests ciblés selon les changements :

```bash
uv run pytest tests/test_company_api.py tests/test_workflow_events.py -q
```

Lint ciblé :

```bash
uv run ruff check services/scraper
```

Smoke indirect :

```bash
./scripts/smoke_local.sh
```

## Notes opérateur

- En mode WSL/CI sans interface graphique, utiliser `SCRAPER_HEADLESS=true`.
- Pour résoudre manuellement un challenge Cloudflare, lancer temporairement avec
  `SCRAPER_HEADLESS=false` depuis un environnement avec GUI.
- Le profil navigateur est stocké sous `STORAGE_DIR/browser_profile`.
- Ne jamais committer cookies, profils navigateur, logs ou caches.
