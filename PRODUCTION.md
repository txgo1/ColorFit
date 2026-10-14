# Préparer ColorFit pour la préproduction

Le projet est préparé pour un hébergeur qui accepte les images Docker. Cette configuration ne publie pas encore le site : il faut d'abord choisir un hébergeur, un domaine et ajouter les secrets Stripe dans son coffre de variables.

## Ce qui est configuré

- Image Docker basée sur Node.js 24 LTS.
- Vérification de démarrage : en mode production, le serveur refuse une clé de session absente ou trop courte, une origine sans HTTPS, un chemin SQLite relatif ou une configuration Stripe incomplète/incohérente.
- Endpoint `/health/ready` vérifiant la base, le catalogue et Stripe.
- La base SQLite doit résider sur un disque persistant monté sur `/data`. Garder une seule instance du serveur ; pour plusieurs instances, migrer la base vers PostgreSQL.

## Variables à fournir dans l'hébergeur

Utiliser `.env.production.example` comme liste de noms, pas comme fichier de secrets à publier.

- `NODE_ENV=production`
- `APP_ORIGIN=https://<domaine-public>` (origine seule, sans chemin)
- `SESSION_SECRET` : valeur aléatoire stable de 32 caractères minimum
- `DB_PATH=/data/colorfit.db`
- `PAYMENTS_MODE=test` avec une clé secrète Stripe de test, un secret webhook et un ID de prix de test pour la préproduction
- `PORT` fourni par l'hébergeur, s'il l'impose

Ne jamais committer les clés Stripe ou la vraie clé de session. Garder `PAYMENTS_MODE=test` jusqu'à validation de bout en bout en préproduction. Pour le lancement payant, configurer ensuite ensemble une clé `sk_live_`, le prix live et le secret du webhook live, puis passer `PAYMENTS_MODE=live`.

Configurer le webhook Stripe vers `https://<domaine-public>/api/stripe/webhook` et activer les événements utilisés par le serveur : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` et `customer.subscription.deleted`.

## Points à fermer avant l'ouverture publique en France / UE

1. **Catalogue** : le catalogue actuel est américain et ses prix sont en USD. Trouver un flux européen dont les données, les photos et les liens peuvent être utilisés pour des recommandations commerciales ; sinon, traiter l'actuel comme une démonstration clairement étiquetée.
2. **Comptes** : choisir un fournisseur d'e-mail pour vérifier les adresses, envoyer les reçus/notifications nécessaires et traiter les demandes de réinitialisation de mot de passe. L'application actuelle ne vérifie pas l'accès à la boîte mail et n'a pas de flux de récupération de mot de passe.
3. **Offre payante** : le site affiche 5,99 € / mois, tandis que le montant réellement facturé vient du prix configuré dans Stripe. L'offre d'achat unique à 9,99 € est actuellement un bouton provisoire sans paiement. Aligner l'affichage sur le prix Stripe et retirer ou implémenter l'achat unique avant la vente.
4. **Données et mentions** : remplacer les liens vides de confidentialité et CGU par des pages adaptées à l'entité qui exploite le service ; définir la durée de conservation, la suppression des comptes et les coordonnées de contact. Faire vérifier le traitement du profil couleur et les informations de prix/abonnement avant la vente au public.
5. **Sauvegardes et restauration** : activer les sauvegardes chiffrées du volume `/data` et faire une restauration de vérification avant d'importer des comptes réels.
6. **Préproduction** : avec le domaine HTTPS, le volume persistant et Stripe en mode test, parcourir création de compte, analyse, sélection catalogue, abonnement, webhook, résiliation et redémarrage du serveur.

## Choix du fournisseur

Le choix n'est pas inscrit dans le code. Une fois l'hébergeur choisi, créer le service depuis ce `Dockerfile`, monter le volume persistant sur `/data`, renseigner les variables dans son panneau sécurisé et associer le domaine. Le conteneur n'expose pas lui-même un certificat TLS ; utiliser le HTTPS fourni par la plateforme ou un reverse proxy TLS.
