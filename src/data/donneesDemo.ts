// Le modèle des comptes.
import { Utilisateur } from '../models/Utilisateur';
// Le modèle des associations.
import { Association } from '../models/Association';
// Le modèle des événements.
import { Evenement } from '../models/Evenement';

// Mot de passe commun aux comptes de démonstration, uniquement pour tester en local.
const MOT_DE_PASSE_DEMO = 'Demo1234!';

// Cette fonction donne une date située dans un certain nombre de jours.
function dansJours(jours: number) {
  // On part de maintenant.
  const date = new Date();
  // On avance du nombre de jours voulu.
  date.setDate(date.getDate() + jours);
  // On fixe l'heure à 18h00.
  date.setHours(18, 0, 0, 0);
  // On renvoie la date.
  return date;
}

// Cette fonction remplit une base vide avec des exemples.
export async function remplirSiVide() {
  // S'il y a déjà des comptes, on ne touche à rien pour ne pas abîmer les données.
  if ((await Utilisateur.countDocuments()) > 0) return;

  // On crée quatre associations d'exemple.
  const [bde, bds, robotique, cyber] = await Association.create([
    // Le bureau des étudiants.
    { nom: 'BDE', description: 'Le bureau des étudiants organise les soirées, le week-end d\'intégration et les grands moments de l\'année.', contact: 'bde@exemple.test' },
    // Le bureau des sports.
    { nom: 'BDS', description: 'Le bureau des sports propose des entraînements et des tournois toute l\'année.', contact: 'bds@exemple.test' },
    // Un club technique.
    { nom: 'Club Robotique', description: 'Construire, programmer et faire courir des robots entre passionnés.', contact: 'robotique@exemple.test' },
    // Un autre club technique.
    { nom: 'Club Cybersécurité', description: 'Ateliers et compétitions de sécurité informatique, ouverts aux débutants.', contact: 'cyber@exemple.test' },
  ]);

  // On crée un compte pour chaque rôle. create déclenche le calcul de l'empreinte.
  await Utilisateur.create([
    // Un administrateur.
    { prenom: 'Alex', nom: 'Admin', email: 'admin@exemple.test', motDePasse: MOT_DE_PASSE_DEMO, role: 'admin' },
    // Un responsable rattaché au BDE.
    { prenom: 'Sam', nom: 'Responsable', email: 'bde@exemple.test', motDePasse: MOT_DE_PASSE_DEMO, role: 'responsable', association: bde._id },
    // Un étudiant.
    { prenom: 'Camille', nom: 'Etudiant', email: 'etudiant@exemple.test', motDePasse: MOT_DE_PASSE_DEMO },
  ]);

  // On crée quelques événements d'exemple.
  await Evenement.create([
    // Un événement publié du BDE.
    { titre: 'Soirée de rentrée', description: 'Une soirée pour rencontrer les étudiants de toutes les promotions.', date: dansJours(10), lieu: 'Campus de Toulon', capacite: 120, categorie: 'Soirée', association: bde._id, publie: true },
    // Un événement publié du BDS.
    { titre: 'Tournoi de football', description: 'Tournoi inter-promotions à 5 contre 5. Viens avec ton équipe ou seul.', date: dansJours(17), lieu: 'Stade municipal', capacite: 40, categorie: 'Sport', association: bds._id, publie: true },
    // Un petit événement, pratique pour tester la capacité maximale.
    { titre: 'Atelier soudure', description: 'Apprends à souder ta première carte électronique.', date: dansJours(24), lieu: 'Fablab', capacite: 2, categorie: 'Technologie', association: robotique._id, publie: true },
    // Un événement publié du club cybersécurité.
    { titre: 'Initiation à la cybersécurité', description: 'Résous tes premiers défis de sécurité, sans prérequis.', date: dansJours(31), lieu: 'Campus de Marseille', capacite: 30, categorie: 'Technologie', association: cyber._id, publie: true },
    // Un brouillon, invisible sur le site public.
    { titre: 'Gala de fin d\'année', description: 'Événement en préparation.', date: dansJours(60), lieu: 'À confirmer', capacite: 200, categorie: 'Soirée', association: bde._id },
  ]);

  // On confirme dans le terminal.
  console.log('Données de démonstration ajoutées.');
}
