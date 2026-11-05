// Les types de la requête et de la réponse.
import { Request, Response } from 'express';
// Le modèle des associations.
import { Association } from '../models/Association';
// Le modèle des événements et la liste des catégories.
import { Evenement, CATEGORIES } from '../models/Evenement';
// Le modèle des inscriptions.
import { Inscription } from '../models/Inscription';
// Le modèle des comptes et la liste des rôles.
import { Utilisateur, ROLES } from '../models/Utilisateur';
// La vérification des droits sur une association.
import { verifierDroit } from '../middlewares/auth';
// L'erreur envoyée quand une règle n'est pas respectée.
import { ErreurMetier } from '../utils/ErreurMetier';
// Les outils qui filtrent les champs des formulaires.
import { garderChamps, CHAMPS_ASSOCIATION, CHAMPS_EVENEMENT } from '../utils/champs';

// Cette fonction prépare le filtre des associations que l'utilisateur peut voir.
function filtreAssociations(req: Request) {
  // Un administrateur voit tout, donc le filtre est vide.
  if (req.utilisateur!.role === 'admin') return {};
  // Un responsable voit seulement la sienne.
  return { _id: req.utilisateur!.association };
}

// Cette fonction prépare le filtre des événements que l'utilisateur peut voir.
function filtreEvenements(req: Request) {
  // Un administrateur voit tout.
  if (req.utilisateur!.role === 'admin') return {};
  // Un responsable voit ceux de son association.
  return { association: req.utilisateur!.association };
}

// Cette fonction cherche un événement et vérifie le droit de le gérer.
async function chargerEvenement(req: Request) {
  // On lit l'événement demandé.
  const evenement = await Evenement.findById(String(req.params.id));
  // S'il n'existe pas, on répond 404.
  if (!evenement) throw new ErreurMetier('Événement introuvable.', 404);
  // On refuse si l'utilisateur ne gère pas cette association.
  verifierDroit(req.utilisateur!, evenement.association);
  // On renvoie l'événement.
  return evenement;
}

// Affiche le tableau de bord.
export async function tableauDeBord(req: Request, res: Response) {
  // On compte les associations visibles.
  const nbAssociations = await Association.countDocuments(filtreAssociations(req));
  // On compte les événements visibles.
  const nbEvenements = await Evenement.countDocuments(filtreEvenements(req));
  // On compte ceux qui ne sont pas encore publiés.
  const nbBrouillons = await Evenement.countDocuments({ ...filtreEvenements(req), publie: false });
  // On affiche les trois nombres.
  res.render('admin/tableau-de-bord', { titre: 'Tableau de bord', nbAssociations, nbEvenements, nbBrouillons });
}

// Affiche la liste des associations.
export async function associations(req: Request, res: Response) {
  // On lit celles que l'utilisateur peut gérer.
  const liste = await Association.find(filtreAssociations(req)).sort({ nom: 1 });
  // On affiche le tableau.
  res.render('admin/associations', { titre: 'Associations', associations: liste });
}

// Affiche le formulaire de création d'une association.
export function formulaireNouvelleAssociation(req: Request, res: Response) {
  // null indique qu'il n'y a pas encore d'association à modifier.
  res.render('admin/association-form', { titre: 'Nouvelle association', association: null });
}

// Crée une association.
export async function creerAssociation(req: Request, res: Response) {
  // On garde seulement les champs autorisés, puis on enregistre.
  await Association.create(garderChamps(req.body, CHAMPS_ASSOCIATION));
  // On confirme l'action.
  req.session.message = 'Association créée.';
  // On revient à la liste.
  res.redirect('/admin/associations');
}

// Affiche le formulaire de modification d'une association.
export async function formulaireModifierAssociation(req: Request, res: Response) {
  // On lit l'association.
  const association = await Association.findById(String(req.params.id));
  // Si elle n'existe pas, on répond 404.
  if (!association) throw new ErreurMetier('Association introuvable.', 404);
  // On vérifie le droit de la modifier.
  verifierDroit(req.utilisateur!, association._id);
  // On affiche le formulaire prérempli.
  res.render('admin/association-form', { titre: 'Modifier l\'association', association });
}

// Enregistre la modification d'une association.
export async function modifierAssociation(req: Request, res: Response) {
  // On lit l'association.
  const association = await Association.findById(String(req.params.id));
  // Si elle n'existe pas, on répond 404.
  if (!association) throw new ErreurMetier('Association introuvable.', 404);
  // On vérifie le droit de la modifier.
  verifierDroit(req.utilisateur!, association._id);
  // set applique les nouvelles valeurs.
  association.set(garderChamps(req.body, CHAMPS_ASSOCIATION));
  // save vérifie les règles du schéma et enregistre.
  await association.save();
  // On confirme l'action.
  req.session.message = 'Association modifiée.';
  // On revient à la liste.
  res.redirect('/admin/associations');
}

// Active ou désactive une association.
export async function basculerAssociation(req: Request, res: Response) {
  // On lit l'association.
  const association = await Association.findById(String(req.params.id));
  // Si elle n'existe pas, on répond 404.
  if (!association) throw new ErreurMetier('Association introuvable.', 404);
  // On inverse le statut.
  association.statut = association.statut === 'active' ? 'inactive' : 'active';
  // On enregistre.
  await association.save();
  // On revient à la liste.
  res.redirect('/admin/associations');
}

// Affiche la liste des événements.
export async function evenements(req: Request, res: Response) {
  // On lit les événements visibles, du plus proche au plus lointain.
  const liste = await Evenement.find(filtreEvenements(req)).populate('association').sort({ date: 1 });
  // On affiche le tableau.
  res.render('admin/evenements', { titre: 'Événements', evenements: liste });
}

// Affiche le formulaire de création d'un événement.
export async function formulaireNouvelEvenement(req: Request, res: Response) {
  // On propose uniquement les associations que l'utilisateur peut gérer.
  const liste = await Association.find(filtreAssociations(req)).sort({ nom: 1 });
  // On affiche le formulaire vide.
  res.render('admin/evenement-form', { titre: 'Nouvel événement', evenement: null, associations: liste, categories: CATEGORIES });
}

// Crée un événement.
export async function creerEvenement(req: Request, res: Response) {
  // On garde seulement les champs autorisés.
  const champs = garderChamps(req.body, CHAMPS_EVENEMENT);
  // String() transforme la valeur en texte, comparable à l'identifiant de l'association.
  verifierDroit(req.utilisateur!, String(champs.association));
  // On enregistre le nouvel événement, en brouillon par défaut.
  await Evenement.create(champs);
  // On confirme l'action.
  req.session.message = 'Événement créé en brouillon.';
  // On revient à la liste.
  res.redirect('/admin/evenements');
}

// Affiche le formulaire de modification d'un événement.
export async function formulaireModifierEvenement(req: Request, res: Response) {
  // On lit l'événement et on vérifie le droit.
  const evenement = await chargerEvenement(req);
  // On propose les associations que l'utilisateur peut gérer.
  const liste = await Association.find(filtreAssociations(req)).sort({ nom: 1 });
  // On affiche le formulaire prérempli.
  res.render('admin/evenement-form', { titre: 'Modifier l\'événement', evenement, associations: liste, categories: CATEGORIES });
}

// Enregistre la modification d'un événement.
export async function modifierEvenement(req: Request, res: Response) {
  // On lit l'événement et on vérifie le droit.
  const evenement = await chargerEvenement(req);
  // On garde seulement les champs autorisés.
  const champs = garderChamps(req.body, CHAMPS_EVENEMENT);
  // On vérifie aussi le droit sur l'association choisie dans le formulaire.
  verifierDroit(req.utilisateur!, String(champs.association));
  // La capacité ne peut pas passer sous le nombre de personnes déjà inscrites.
  if (Number(champs.capacite) < evenement.nbInscrits) throw new ErreurMetier(`La capacité ne peut pas être inférieure aux ${evenement.nbInscrits} inscrits.`);
  // On applique les nouvelles valeurs.
  evenement.set(champs);
  // On enregistre.
  await evenement.save();
  // On confirme l'action.
  req.session.message = 'Événement modifié.';
  // On revient à la liste.
  res.redirect('/admin/evenements');
}

// Publie ou dépublie un événement.
export async function basculerPublication(req: Request, res: Response) {
  // On lit l'événement et on vérifie le droit.
  const evenement = await chargerEvenement(req);
  // On inverse la valeur vrai/faux.
  evenement.publie = !evenement.publie;
  // On enregistre.
  await evenement.save();
  // On revient à la liste.
  res.redirect('/admin/evenements');
}

// Supprime un événement et ses inscriptions.
export async function supprimerEvenement(req: Request, res: Response) {
  // On lit l'événement et on vérifie le droit.
  const evenement = await chargerEvenement(req);
  // On supprime d'abord ses inscriptions pour ne pas laisser de données orphelines.
  await Inscription.deleteMany({ evenement: evenement._id });
  // On supprime l'événement.
  await evenement.deleteOne();
  // On confirme l'action.
  req.session.message = 'Événement supprimé.';
  // On revient à la liste.
  res.redirect('/admin/evenements');
}

// Affiche les inscrits à un événement.
export async function inscrits(req: Request, res: Response) {
  // On lit l'événement et on vérifie le droit.
  const evenement = await chargerEvenement(req);
  // On lit les inscriptions confirmées avec le nom et l'email des étudiants.
  const inscriptions = await Inscription.find({ evenement: evenement._id, statut: 'confirmee' }).populate('utilisateur', 'prenom nom email').sort({ dateInscription: 1 });
  // On affiche la liste.
  res.render('admin/inscrits', { titre: `Inscrits : ${evenement.titre}`, evenement, inscriptions });
}

// Affiche la liste des comptes (administrateurs seulement).
export async function utilisateurs(req: Request, res: Response) {
  // On lit les comptes avec le nom de leur association.
  const liste = await Utilisateur.find().populate('association', 'nom').sort({ nom: 1 });
  // On affiche le tableau.
  res.render('admin/utilisateurs', { titre: 'Utilisateurs', utilisateurs: liste });
}

// Affiche le formulaire de droits d'un compte.
export async function formulaireUtilisateur(req: Request, res: Response) {
  // On lit le compte.
  const compte = await Utilisateur.findById(String(req.params.id));
  // S'il n'existe pas, on répond 404.
  if (!compte) throw new ErreurMetier('Utilisateur introuvable.', 404);
  // On lit toutes les associations pour le menu déroulant.
  const liste = await Association.find().sort({ nom: 1 });
  // On affiche le formulaire.
  res.render('admin/utilisateur-form', { titre: 'Droits du compte', compte, associations: liste, roles: ROLES });
}

// Enregistre le rôle et l'association d'un compte.
export async function modifierUtilisateur(req: Request, res: Response) {
  // On lit le compte.
  const compte = await Utilisateur.findById(String(req.params.id));
  // S'il n'existe pas, on répond 404.
  if (!compte) throw new ErreurMetier('Utilisateur introuvable.', 404);
  // On lit le rôle choisi.
  const role = String(req.body.role);
  // On lit l'association choisie, qui peut être vide.
  const association = String(req.body.association ?? '');
  // Un administrateur ne doit pas se retirer ses propres droits par erreur.
  if (compte.id === req.utilisateur!.id && role !== 'admin') throw new ErreurMetier('Tu ne peux pas retirer ton propre rôle d\'administrateur.');
  // Un responsable doit être rattaché à une association.
  if (role === 'responsable' && !association) throw new ErreurMetier('Choisis une association pour ce responsable.');
  // On applique le rôle : le schéma refusera une valeur inconnue.
  compte.set('role', role);
  // Seul un responsable garde une association.
  compte.set('association', role === 'responsable' ? association : undefined);
  // On enregistre.
  await compte.save();
  // On confirme l'action.
  req.session.message = 'Droits mis à jour.';
  // On revient à la liste.
  res.redirect('/admin/utilisateurs');
}
