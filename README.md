# SecureVault — Docker Compose + SQLite

## Dépendance unique : Docker Desktop
Téléchargez et installez Docker Desktop :
https://www.docker.com/products/docker-desktop

## Lancement (une seule commande)

    docker compose up --build

Puis ouvrez http://localhost:3000

## Arrêt

    docker compose down

## Données persistantes
- Base de données SQLite : ./data/securevault.db
- Fichiers chiffrés      : ./uploads/

Ces dossiers sont créés automatiquement au premier lancement.

## Sécurité
- Chiffrement AES-256-GCM côté client (Web Crypto API)
- La clé de déchiffrement voyage uniquement via le fragment URL (#)
  et n'est JAMAIS transmise au serveur
- Zero-knowledge : le serveur ne voit que des données chiffrées
