# Vie associative ISEN

Application web de gestion des associations et des événements de l'école.
Projet fil-rouge du cours de développement web : TypeScript, Node.js, Express, MongoDB et Mongoose.

## Lancer le projet

Il faut avoir installé Node.js.

```bash
npm install
```

```bash
copy .env.example .env
```

```bash
npm run dev
```

Le site s'ouvre sur http://localhost:3000.

Si `MONGODB_URI` est vide dans `.env`, le projet démarre une base temporaire en mémoire, remplie avec des exemples.
Ses données disparaissent à l'arrêt du serveur. Pour les garder, installe MongoDB, renseigne `MONGODB_URI` puis lance `npm run seed`.

## Comptes de démonstration

Le mot de passe est `Demo1234!` pour tous ces comptes, réservés aux tests en local.

| Rôle | Email | Ce qu'il peut faire |
| --- | --- | --- |
| Administrateur | admin@exemple.test | Tout gérer |
| Responsable du BDE | bde@exemple.test | Gérer uniquement le BDE et ses événements |
| Étudiant | etudiant@exemple.test | S'inscrire aux événements |

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Démarre le site et le relance à chaque modification |
| `npm test` | Lance les tests automatiques |
| `npm run build` | Transforme le TypeScript en JavaScript dans `dist` |
| `npm start` | Démarre la version construite |
| `npm run seed` | Ajoute les exemples dans une base vide |

## Organisation du code (MVC)

| Dossier | Rôle |
| --- | --- |
| `src/models` | Les schémas Mongoose : Utilisateur, Association, Evenement, Inscription |
| `views/public`, `views/admin` | Les pages EJS du site public et du back-office |
| `src/controllers` | La logique de chaque page et de l'API |
| `src/routes` | La liste des adresses du site |
| `src/services` | Les règles d'inscription, partagées par le site et l'API |
| `src/middlewares` | Les protections exécutées avant les contrôleurs |
| `public` | Le CSS et les images |
| `tests` | Les tests automatiques |

## Relations entre les données

- Une **Inscription** relie un **Utilisateur** à un **Événement**.
- Un **Événement** appartient à une **Association**.
- Un **Utilisateur** de rôle responsable est rattaché à une **Association**.

## Règles métier

- **Double inscription :** un index unique de MongoDB bloque le doublon, même avec deux clics simultanés.
- **Capacité :** la place est réservée en une seule opération, donc deux étudiants ne peuvent pas prendre la dernière ensemble.
- **Droits :** un administrateur gère tout, un responsable uniquement son association.

## Sécurité

- Mots de passe enregistrés sous forme d'empreinte avec bcrypt.
- Sessions stockées dans MongoDB, dans un cookie `httpOnly` et `sameSite`.
- Jeton CSRF sur tous les formulaires.
- Nombre d'essais de connexion limité.
- En-têtes de sécurité ajoutés par Helmet.

## API

Les réponses sont en JSON. La connexion se fait avec `POST /api/connexion`, en envoyant `email` et `motDePasse`.

| Ressource | Lire | Créer | Modifier | Supprimer |
| --- | --- | --- | --- | --- |
| `/api/utilisateurs` | Admin | Admin | Admin | Admin |
| `/api/associations` | Public | Admin | Admin ou son responsable | Admin |
| `/api/evenements` | Public | Admin ou responsable | Admin ou son responsable | Admin ou son responsable |
| `/api/inscriptions` | Connecté | Connecté | Propriétaire ou gestionnaire | Propriétaire ou gestionnaire |

## Images

Le logo et les photos de `public/images` proviennent du site de l'ISEN Méditerranée, qui en garde les droits.
Ils servent uniquement à ce projet scolaire. Il faut demander l'accord de l'école avant toute mise en ligne publique.
