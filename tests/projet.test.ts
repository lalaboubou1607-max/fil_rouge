// test et before/after organisent les tests, fournis directement par Node.js.
import { test, before, after } from 'node:test';
// assert vérifie que le résultat est celui attendu.
import assert from 'node:assert/strict';
// mongoose permet de fermer la connexion à la fin.
import mongoose from 'mongoose';
// MongoMemoryServer crée une base jetable, propre à chaque lancement.
import { MongoMemoryServer } from 'mongodb-memory-server';
// supertest envoie de vraies requêtes à notre application.
import request from 'supertest';
// La fabrication de l'application.
import { creerApplication } from '../src/app';
// Les données d'exemple.
import { remplirSiVide } from '../src/data/donneesDemo';
// Les modèles utilisés dans les tests.
import { Evenement } from '../src/models/Evenement';
import { Utilisateur } from '../src/models/Utilisateur';
// Le type d'erreur attendu.
import { ErreurMetier } from '../src/utils/ErreurMetier';
// Le service à tester.
import { inscrireUtilisateur, annulerInscription } from '../src/services/inscriptionService';

// Le serveur de base de données des tests.
let serveur: MongoMemoryServer;
// L'application testée.
let app: ReturnType<typeof creerApplication>;

// Avant les tests, on prépare la base et l'application.
before(async () => {
  // Les sessions ont besoin d'une phrase secrète.
  process.env.SESSION_SECRET = 'secret-de-test';
  // On démarre la base jetable.
  serveur = await MongoMemoryServer.create();
  // On s'y connecte.
  await mongoose.connect(serveur.getUri('tests'));
  // On crée les index, dont celui qui bloque les doublons.
  await mongoose.syncIndexes();
  // On ajoute les données d'exemple.
  await remplirSiVide();
  // On crée l'application.
  app = creerApplication();
});

// Après les tests, on ferme tout pour que le programme se termine.
after(async () => {
  // On ferme la connexion.
  await mongoose.disconnect();
  // On arrête le serveur de base de données.
  await serveur.stop();
});

// Cette fonction connecte un compte de démonstration à l'API.
async function connecter(email: string) {
  // agent garde le cookie de session d'une requête à l'autre.
  const agent = request.agent(app);
  // On envoie les identifiants.
  await agent.post('/api/connexion').send({ email, motDePasse: 'Demo1234!' }).expect(200);
  // On renvoie l'agent connecté.
  return agent;
}

test('la page d\'accueil s\'affiche', async () => {
  // Le code 200 signifie que la page a bien répondu.
  await request(app).get('/').expect(200);
});

test('un visiteur ne peut pas ouvrir le back-office', async () => {
  // Le code 302 est une redirection, ici vers la page de connexion.
  await request(app).get('/admin').expect(302).expect('Location', '/connexion');
});

test('un étudiant ne peut pas ouvrir le back-office', async () => {
  // On se connecte comme étudiant.
  const agent = await connecter('etudiant@exemple.test');
  // Le code 403 signifie "interdit".
  await agent.get('/admin').expect(403);
});

test('un formulaire sans jeton est refusé', async () => {
  // Sans jeton CSRF, le serveur doit répondre 403.
  await request(app).post('/connexion').type('form').send({ email: 'a@b.c', motDePasse: 'x' }).expect(403);
});

test('la double inscription est refusée', async () => {
  // On lit l'étudiant.
  const etudiant = await Utilisateur.findOne({ email: 'etudiant@exemple.test' });
  // On lit un événement.
  const evenement = await Evenement.findOne({ titre: 'Soirée de rentrée' });
  // La première inscription réussit.
  await inscrireUtilisateur(etudiant!.id, evenement!.id);
  // La deuxième doit lancer notre erreur.
  await assert.rejects(inscrireUtilisateur(etudiant!.id, evenement!.id), ErreurMetier);
});

test('deux inscriptions simultanées ne créent pas de doublon', async () => {
  // On lit l'étudiant.
  const etudiant = await Utilisateur.findOne({ email: 'etudiant@exemple.test' });
  // On lit un événement où il n'est pas inscrit.
  const evenement = await Evenement.findOne({ titre: 'Tournoi de football' });
  // On lance deux inscriptions exactement en même temps.
  const resultats = await Promise.allSettled([inscrireUtilisateur(etudiant!.id, evenement!.id), inscrireUtilisateur(etudiant!.id, evenement!.id)]);
  // Une seule doit réussir.
  assert.equal(resultats.filter((resultat) => resultat.status === 'fulfilled').length, 1);
  // On relit l'événement.
  const relu = await Evenement.findById(evenement!._id);
  // Le compteur doit indiquer un seul inscrit.
  assert.equal(relu!.nbInscrits, 1);
});

test('la capacité maximale est respectée et une annulation libère la place', async () => {
  // L'atelier soudure n'a que 2 places.
  const evenement = await Evenement.findOne({ titre: 'Atelier soudure' });
  // On crée trois comptes étudiants.
  const comptes = await Utilisateur.create([1, 2, 3].map((numero) => ({ prenom: 'Test', nom: `Numero${numero}`, email: `test${numero}@exemple.test`, motDePasse: 'Demo1234!' })));
  // Le premier prend une place.
  const premiere = await inscrireUtilisateur(comptes[0].id, evenement!.id);
  // Le deuxième prend la dernière.
  await inscrireUtilisateur(comptes[1].id, evenement!.id);
  // Le troisième doit être refusé.
  await assert.rejects(inscrireUtilisateur(comptes[2].id, evenement!.id), /complet/);
  // Le premier annule.
  await annulerInscription(premiere.id);
  // Le troisième peut maintenant s'inscrire.
  await inscrireUtilisateur(comptes[2].id, evenement!.id);
});

test('un responsable ne peut pas modifier l\'événement d\'une autre association', async () => {
  // On se connecte comme responsable du BDE.
  const agent = await connecter('bde@exemple.test');
  // Ce tournoi appartient au BDS.
  const evenement = await Evenement.findOne({ titre: 'Tournoi de football' });
  // La modification doit être interdite.
  await agent.put(`/api/evenements/${evenement!.id}`).send({ titre: 'Piraté' }).expect(403);
  // Son propre événement reste modifiable.
  const sien = await Evenement.findOne({ titre: 'Soirée de rentrée' });
  // Le code 200 confirme la réussite.
  await agent.put(`/api/evenements/${sien!.id}`).send({ lieu: 'Campus de Toulon, salle A' }).expect(200);
});

test('le mot de passe n\'apparaît jamais dans l\'API', async () => {
  // On se connecte comme administrateur.
  const agent = await connecter('admin@exemple.test');
  // On lit tous les comptes.
  const reponse = await agent.get('/api/utilisateurs').expect(200);
  // Le mot motDePasse ne doit pas être présent dans la réponse.
  assert.equal(JSON.stringify(reponse.body).includes('motDePasse'), false);
  // On crée un compte par l'API.
  const creation = await agent.post('/api/utilisateurs').send({ prenom: 'Nouveau', nom: 'Compte', email: 'nouveau@exemple.test', motDePasse: 'Demo1234!' }).expect(201);
  // La réponse de création ne doit pas le contenir non plus.
  assert.equal(creation.body.motDePasse, undefined);
});
