# ADR 027 - Racine canonique des logs runtime

Date : 23 juillet 2026

## Statut

Accepté

## Contexte

Les services, les tests et les scripts écrivaient dans plusieurs dossiers
`logs/` dépendants du répertoire courant. Les événements applicatifs, les
sorties stdout et l’état de supervision étaient mélangés. Le diagnostic local,
la collecte CI et la persistance Docker devenaient ambigus.

## Décision

Chaque instance Mindris possède une seule racine de logs :

- `<repo>/.logs/` pour un clone de développement ;
- `~/.mindris-ai/logs/` pour l’installation self-hosted.

Cette racine est structurée ainsi :

```text
services/  événements applicatifs structurés et soumis à rotation
process/   stdout et stderr des processus supervisés
runtime/   état éphémère de la CLI, dont mindris-dev.json
```

Les chemins relatifs sont résolus contre la racine du projet, jamais contre le
répertoire courant. Les tests ordinaires injectent une racine temporaire. Le
renderer Bun respecte `LOGS_DIR` ou `RENDERER_LOG_PATH`. L’API et le renderer
montent la même racine persistante dans Docker.

`mindris logs` est l’interface opérateur canonique et permet de filtrer par
service, période et identifiant de requête.

## Conséquences

- Les anciens dossiers `logs/`, `tests/logs/` et
  `services/api-gateway/logs/` ne doivent plus être créés.
- Les événements de service et les sorties de processus ne partagent pas de
  fichier.
- Les rotations sont bornées à 5 Mo avec cinq sauvegardes par défaut.
- Les secrets continuent d’être masqués par le logger Python.
- La collecte CI et les sauvegardes opérateur n’ont qu’une racine à traiter.

Cette décision remplace uniquement les chemins de logs définis dans la section
2.8 de l’ADR 006.

## Vérification

```bash
uv run pytest tests/test_logger.py tests/test_mindris_cli.py -q
cd services/renderer && bun test src/logger.test.ts
./mindris logs api-gateway --since 30m
```
