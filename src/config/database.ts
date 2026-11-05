// On importe Mongoose, la bibliothèque qui fait le lien entre TypeScript et MongoDB.
import mongoose from 'mongoose';

// Cette fonction ouvre la connexion. "async" permet d'attendre la réponse de la base.
export async function connecterBaseDeDonnees(): Promise<void> {
  // On lit l'adresse de la base dans le fichier .env.
  let adresse = process.env.MONGODB_URI;

  // Si l'adresse est vide, MongoDB n'est pas installé : on prend une base temporaire.
  if (!adresse) {
    // On charge la bibliothèque ici seulement, car elle ne sert qu'au développement.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    // On démarre un petit serveur MongoDB en mémoire vive.
    const serveur = await MongoMemoryServer.create();
    // On récupère son adresse, avec le nom de notre base à la fin.
    adresse = serveur.getUri('isen-associations');
    // On prévient que les données disparaîtront à l'arrêt du serveur.
    console.log('Base temporaire en mémoire : les données seront perdues à l\'arrêt.');
  }

  // On se connecte. "await" attend que la connexion soit prête avant de continuer.
  await mongoose.connect(adresse);
  // On affiche un message pour confirmer que tout va bien.
  console.log('Connecté à MongoDB');
}
