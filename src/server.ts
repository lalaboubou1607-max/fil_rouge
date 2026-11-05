// dotenv lit le fichier .env. Il doit être chargé avant tout le reste.
import 'dotenv/config';
// La connexion à la base.
import { connecterBaseDeDonnees } from './config/database';
// Le remplissage de la base avec des exemples.
import { remplirSiVide } from './data/donneesDemo';
// La fabrication de l'application.
import { creerApplication } from './app';

// Cette fonction démarre le site, étape par étape.
async function demarrer() {
  // Sans phrase secrète, les cookies ne seraient pas protégés : on refuse de démarrer.
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET manque dans le fichier .env');
  // La base doit être prête avant d'accepter des visiteurs.
  await connecterBaseDeDonnees();
  // Une base temporaire est toujours vide : on la remplit pour pouvoir tester.
  if (!process.env.MONGODB_URI) await remplirSiVide();
  // On fabrique l'application.
  const app = creerApplication();
  // On lit le port, avec 3000 comme valeur de secours.
  const port = process.env.PORT || 3000;
  // Le serveur commence à écouter les visiteurs.
  app.listen(port, () => console.log(`Site disponible sur http://localhost:${port}`));
}

// On lance le démarrage et on affiche clairement une éventuelle erreur.
demarrer().catch((erreur) => {
  // On écrit le problème dans le terminal.
  console.error('Impossible de démarrer :', erreur);
  // Le code 1 indique que le programme s'est arrêté à cause d'une erreur.
  process.exit(1);
});
