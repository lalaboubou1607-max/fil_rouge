// Les types de la requête et de la réponse.
import { Request, Response } from 'express';
// Le modèle des associations.
import { Association } from '../models/Association';
// Le modèle des événements et la liste des catégories.
import { Evenement, CATEGORIES } from '../models/Evenement';
// Le modèle des inscriptions.
import { Inscription } from '../models/Inscription';
// Les règles d'inscription et d'annulation.
import { inscrireUtilisateur, annulerInscription } from '../services/inscriptionService';
// L'erreur envoyée quand une règle n'est pas respectée.
import { ErreurMetier } from '../utils/ErreurMetier';
// La fonction qui sécurise le texte recherché.
import { echapperRecherche } from '../utils/champs';

// Cette fonction prépare le filtre commun : publié et organisé par une association active.
async function filtreEvenementsVisibles(): Promise<Record<string, unknown>> {
  // distinct récupère seulement les identifiants des associations actives.
  const associationsActives = await Association.distinct('_id', { statut: 'active' });
  // $in signifie "fait partie de cette liste".
  return { publie: true, association: { $in: associationsActives } };
}

// Affiche la page d'accueil.
export async function accueil(req: Request, res: Response) {
  // On prépare le filtre des événements visibles.
  const visibles = await filtreEvenementsVisibles();
  // On prend les 3 prochains événements. $gte veut dire "supérieur ou égal".
  const evenements = await Evenement.find({ ...visibles, date: { $gte: new Date() } }).populate('association').sort({ date: 1 }).limit(3);
  // On prend 4 associations actives.
  const associations = await Association.find({ statut: 'active' }).sort({ nom: 1 }).limit(4);
  // On envoie les données à la vue.
  res.render('public/accueil', { titre: 'Accueil', evenements, associations });
}

// Affiche toutes les associations actives.
export async function listeAssociations(req: Request, res: Response) {
  // On les trie par nom.
  const associations = await Association.find({ statut: 'active' }).sort({ nom: 1 });
  // On affiche la liste.
  res.render('public/associations', { titre: 'Associations', associations });
}

// Affiche la fiche d'une association avec ses événements.
export async function ficheAssociation(req: Request, res: Response) {
  // On cherche une association active avec l'identifiant de l'adresse.
  const association = await Association.findOne({ _id: String(req.params.id), statut: 'active' });
  // Si elle n'existe pas, on affiche une page 404.
  if (!association) throw new ErreurMetier('Association introuvable.', 404);
  // On cherche ses événements publiés à venir.
  const evenements = await Evenement.find({ association: association._id, publie: true, date: { $gte: new Date() } }).sort({ date: 1 });
  // On affiche la fiche.
  res.render('public/association', { titre: association.nom, association, evenements });
}

// Affiche les événements avec la recherche et le filtre par catégorie.
export async function listeEvenements(req: Request, res: Response) {
  // On récupère le texte recherché dans l'adresse (?q=...).
  const recherche = String(req.query.q ?? '').trim();
  // On récupère la catégorie choisie (?categorie=...).
  const categorie = String(req.query.categorie ?? '');
  // On commence avec le filtre de base : visibles et à venir.
  const filtre: Record<string, unknown> = { ...(await filtreEvenementsVisibles()), date: { $gte: new Date() } };
  // On ajoute la recherche seulement si quelque chose a été saisi.
  if (recherche) {
    // Le "i" ignore la différence entre majuscules et minuscules.
    const motif = new RegExp(echapperRecherche(recherche), 'i');
    // $or : le texte peut être dans le titre ou dans la description.
    filtre.$or = [{ titre: motif }, { description: motif }];
  }
  // On filtre par catégorie seulement si elle fait partie de la liste connue.
  if ((CATEGORIES as readonly string[]).includes(categorie)) filtre.categorie = categorie;
  // populate remplace l'identifiant de l'association par ses informations.
  const evenements = await Evenement.find(filtre).populate('association').sort({ date: 1 });
  // On affiche la liste et on garde les choix dans le formulaire.
  res.render('public/evenements', { titre: 'Événements', evenements, categories: CATEGORIES, recherche, categorie });
}

// Affiche la fiche d'un événement.
export async function ficheEvenement(req: Request, res: Response) {
  // On cherche l'événement parmi ceux qui sont visibles.
  const evenement = await Evenement.findOne({ ...(await filtreEvenementsVisibles()), _id: String(req.params.id) }).populate('association');
  // S'il n'existe pas, on affiche une page 404.
  if (!evenement) throw new ErreurMetier('Événement introuvable.', 404);
  // Par défaut, on suppose que le visiteur n'est pas inscrit.
  let inscription = null;
  // Si le visiteur est connecté, on cherche son inscription.
  if (req.utilisateur) inscription = await Inscription.findOne({ utilisateur: req.utilisateur._id, evenement: evenement._id, statut: 'confirmee' });
  // On calcule les places restantes pour l'affichage.
  const placesRestantes = evenement.capacite - evenement.nbInscrits;
  // On affiche la fiche.
  res.render('public/evenement', { titre: evenement.titre, evenement, inscription, placesRestantes });
}

// Inscrit l'étudiant connecté à un événement.
export async function inscrire(req: Request, res: Response) {
  // On lit l'identifiant de l'événement dans l'adresse.
  const evenementId = String(req.params.id);
  // try permet d'afficher le message de la règle sur la fiche de l'événement.
  try {
    // exigerConnexion garantit qu'un utilisateur est présent, d'où le "!".
    await inscrireUtilisateur(req.utilisateur!.id, evenementId);
    // On confirme l'inscription.
    req.session.message = 'Ton inscription est confirmée.';
  } catch (erreur) {
    // Une autre erreur que notre règle remonte au gestionnaire général.
    if (!(erreur instanceof ErreurMetier)) throw erreur;
    // On affiche la raison du refus.
    req.session.message = erreur.message;
  }
  // On revient sur la fiche.
  res.redirect(`/evenements/${evenementId}`);
}

// Annule une inscription de l'étudiant connecté.
export async function annuler(req: Request, res: Response) {
  // Le filtre sur utilisateur empêche d'annuler l'inscription de quelqu'un d'autre.
  const inscription = await Inscription.findOne({ _id: String(req.params.id), utilisateur: req.utilisateur!._id });
  // Si elle n'existe pas pour lui, on répond 404.
  if (!inscription) throw new ErreurMetier('Inscription introuvable.', 404);
  // try permet d'afficher un message clair si elle était déjà annulée.
  try {
    // On annule et on libère la place.
    await annulerInscription(inscription.id);
    // On confirme l'annulation.
    req.session.message = 'Ton inscription est annulée.';
  } catch (erreur) {
    // Une autre erreur que notre règle remonte au gestionnaire général.
    if (!(erreur instanceof ErreurMetier)) throw erreur;
    // On affiche la raison.
    req.session.message = erreur.message;
  }
  // On revient à la liste des inscriptions.
  res.redirect('/mes-inscriptions');
}

// Affiche les inscriptions de l'étudiant connecté.
export async function mesInscriptions(req: Request, res: Response) {
  // On cherche ses inscriptions confirmées, avec les détails de l'événement.
  const inscriptions = await Inscription.find({ utilisateur: req.utilisateur!._id, statut: 'confirmee' }).populate('evenement').sort({ dateInscription: -1 });
  // On affiche la liste.
  res.render('public/mes-inscriptions', { titre: 'Mes inscriptions', inscriptions });
}
