# Sauvegarde et restauration

Mindris fournit un format d’archive portable pour les données détenues par
l’utilisateur. La CLI sauvegarde SQLite, la base vectorielle, le profil
navigateur et les artefacts présents dans `storage/`.

Les secrets ne sont jamais inclus par défaut : `runtime-secrets.json` et les
fichiers `.env` sont exclus.

## Créer une sauvegarde

Arrêter la stack évite de capturer une transaction SQLite en cours :

```bash
./mindris stop
./mindris backup create ./backups/mindris-$(date +%F).zip
```

Sous PowerShell :

```powershell
.\mindris.ps1 stop
.\mindris.ps1 backup create .\backups\mindris.zip
```

L’archive contient un manifeste `mindris-backup.json`, une version de format,
la date de création et le nombre de fichiers.

## Inspecter sans restaurer

```bash
./mindris backup inspect ./backups/mindris.zip
```

La commande refuse les archives sans manifeste, les versions incompatibles,
les chemins sortant de l’archive et les fichiers secrets.

## Restaurer

```bash
./mindris stop
./mindris backup restore ./backups/mindris.zip
```

La restauration est préparée dans un dossier temporaire. L’ancien `storage/`
est conservé comme rollback jusqu’à ce que le remplacement soit terminé. En
cas d’échec du remplacement, la CLI remet l’ancien dossier en place.

Après restauration :

```bash
./mindris dev
./mindris status
```

Les clés de providers doivent être reconfigurées séparément, puisqu’elles ne
sont pas présentes dans l’archive.

## Installation self-hosted

Dans une installation Docker, la donnée persistante se trouve par défaut dans
`~/.mindris-ai/storage`. Depuis un clone contenant la CLI, cibler ce dossier :

```bash
STORAGE_DIR="$HOME/.mindris-ai/storage" ./mindris backup create mindris.zip
STORAGE_DIR="$HOME/.mindris-ai/storage" ./mindris backup restore mindris.zip
```

Arrêter les conteneurs avant la création et la restauration :

```bash
cd ~/.mindris-ai
docker compose down
```

