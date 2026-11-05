// dotenv lit le fichier .env. Il doit être chargé avant tout le reste.
import 'dotenv/config';
// mongoose permet de fermer la connexion à la fin.
import mongoose from 'mongoose';
// La connexion à la base.
import { connecterBaseDeDonnees } from './config/database';
// Le remplissage de la base.
import { remplirSiVide } from './data/donneesDemo';

// Cette fonction regroupe les étapes du script.
async function lancer() {
  // On se connecte.
  await connecterBaseDeDonnees();
  // On ajoute les exemples.
  await remplirSiVide();
  // On ferme la connexion pour que le script se termine.
  await mongoose.disconnect();
}

// On lance le script.
lancer();
