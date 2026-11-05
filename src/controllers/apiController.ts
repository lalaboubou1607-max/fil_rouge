// Les types de la requête et de la réponse.
import { Request, Response } from 'express';
// Le type d'un document lu depuis la base.
import { HydratedDocument } from 'mongoose';
// Le modèle des comptes.
import { Utilisateur, IUtilisateur } from '../models/Utilisateur';
// Le modèle des associations.
import { Association } from '../models/Association';
// Le modèle des événements.
import { Evenement } from '../models/Evenement';
// Le modèle des inscriptions.
import { Inscription } from '../models/Inscription';
// Les règles d'inscription et d'annulation.
import { inscrireUtilisateur, annulerInscription } from '../services/inscriptionService';
// La vérification des droits.
import { peutGererAssociation, verifierDroit } from '../middlewares/auth';
// L'erreur envoyée quand une règle n'est pas respectée.
import { ErreurMetier } from '../utils/ErreurMetier';
// Les outils qui filtrent les champs reçus.
import { garderChamps, CHAMPS_ASSOCIATION, CHAMPS_EVENEMENT } from '../utils/champs';

// Les champs d'un compte qu'un administrateur peut envoyer à l'API.
const CHAMPS_UTILISATEUR = ['prenom', 'nom', 'email', 'motDePasse', 'role', 'association'];

// Cette fonction prépare un compte pour la réponse, sans son mot de passe.
function compteSansSecret(compte: HydratedDocument<IUtilisateur>) {
  // On enlève motDePasse et on garde le reste dans "visible".
  const { motDePasse, ...visible } = compte.toObject();
  // On renvoie la version sans le mot de passe.
  return visible;
}

// --- UTILISATEURS (administrateurs seulement, voir les routes) ---

// Renvoie tous les comptes.
export async function listerUtilisateurs(req: Request, res: Response) {
  // Le mot de passe est déjà caché par "select: false" dans le modèle.
  res.json(await Utilisateur.find());
}

// Renvoie un compte.
export async function lireUtilisateur(req: Request, res: Response) {
  // On cherche le compte.
  const compte = await Utilisateur.findById(String(req.params.id));
  // S'il n'existe pas, on répond 404.
  if (!compte) throw new ErreurMetier('Utilisateur introuvable.', 404);
  // On le renvoie.
  res.json(compte);
}

// Crée un compte.
export async function creerUtilisateur(req: Request, res: Response) {
  // On crée le compte avec les champs autorisés.
  const compte = await Utilisateur.create(garderChamps(req.body, CHAMPS_UTILISATEUR));
  // Le code 201 signifie "créé".
  res.status(201).json(compteSansSecret(compte));
}

// Modifie un compte.
export async function modifierUtilisateur(req: Request, res: Response) {
  // On cherche le compte.
  const compte = await Utilisateur.findById(String(req.params.id));
  // S'il n'existe pas, on répond 404.
  if (!compte) throw new ErreurMetier('Utilisateur introuvable.', 404);
  // On applique les changements.
  compte.set(garderChamps(req.body, CHAMPS_UTILISATEUR));
  // save déclenche la création de l'empreinte si le mot de passe change.
  await compte.save();
  // On renvoie le compte à jour.
  res.json(compteSansSecret(compte));
}

// Supprime un compte et libère ses places.
export async function supprimerUtilisateur(req: Request, res: Response) {
  // On cherche ses inscriptions actives.
  const inscriptions = await Inscription.find({ utilisateur: String(req.params.id), statut: 'confirmee' });
  // On les annule une par une pour rendre chaque place.
  for (const inscription of inscriptions) await annulerInscription(inscription.id);
  // On supprime tout son historique d'inscriptions.
  await Inscription.deleteMany({ utilisateur: String(req.params.id) });
  // On supprime le compte.
  const compte = await Utilisateur.findByIdAndDelete(String(req.params.id));
  // S'il n'existait pas, on répond 404.
  if (!compte) throw new ErreurMetier('Utilisateur introuvable.', 404);
  // Le code 204 signifie "réussi, rien à renvoyer".
  res.status(204).end();
}

// --- ASSOCIATIONS ---

// Renvoie les associations actives.
export async function listerAssociations(req: Request, res: Response) {
  // Les associations inactives restent invisibles pour le public.
  res.json(await Association.find({ statut: 'active' }));
}

// Renvoie une association.
export async function lireAssociation(req: Request, res: Response) {
  // On cherche l'association.
  const association = await Association.findById(String(req.params.id));
  // Inexistante ou inactive, elle n'est visible que pour ceux qui la gèrent.
  const gere = association && req.utilisateur && peutGererAssociation(req.utilisateur, association._id);
  // On répond 404 si le visiteur ne doit pas la voir.
  if (!association || (association.statut !== 'active' && !gere)) throw new ErreurMetier('Association introuvable.', 404);
  // On la renvoie.
  res.json(association);
}

// Crée une association.
export async function creerAssociation(req: Request, res: Response) {
  // On crée l'association avec les champs autorisés.
  const association = await Association.create(garderChamps(req.body, CHAMPS_ASSOCIATION));
  // Le code 201 signifie "créé".
  res.status(201).json(association);
}

// Modifie une association.
export async function modifierAssociation(req: Request, res: Response) {
  // On cherche l'association.
  const association = await Association.findById(String(req.params.id));
  // Si elle n'existe pas, on répond 404.
  if (!association) throw new ErreurMetier('Association introuvable.', 404);
  // On vérifie le droit de la modifier.
  verifierDroit(req.utilisateur!, association._id);
  // Seul un administrateur peut changer le statut.
  const champs = req.utilisateur!.role === 'admin' ? [...CHAMPS_ASSOCIATION, 'statut'] : CHAMPS_ASSOCIATION;
  // On applique les changements.
  association.set(garderChamps(req.body, champs));
  // On enregistre.
  await association.save();
  // On renvoie l'association à jour.
  res.json(association);
}

// Supprime une association.
export async function supprimerAssociation(req: Request, res: Response) {
  // On compte ses événements.
  const nbEvenements = await Evenement.countDocuments({ association: String(req.params.id) });
  // On refuse pour ne pas laisser d'événements sans organisateur.
  if (nbEvenements > 0) throw new ErreurMetier('Supprime d\'abord les événements de cette association.', 409);
  // On supprime l'association.
  const association = await Association.findByIdAndDelete(String(req.params.id));
  // Si elle n'existait pas, on répond 404.
  if (!association) throw new ErreurMetier('Association introuvable.', 404);
  // Le code 204 signifie "réussi, rien à renvoyer".
  res.status(204).end();
}

// --- ÉVÉNEMENTS ---

// Renvoie les événements publiés.
export async function listerEvenements(req: Request, res: Response) {
  // Les brouillons ne doivent pas sortir de l'API publique.
  res.json(await Evenement.find({ publie: true }).populate('association').sort({ date: 1 }));
}

// Renvoie un événement.
export async function lireEvenement(req: Request, res: Response) {
  // On cherche l'événement.
  const evenement = await Evenement.findById(String(req.params.id));
  // Un brouillon n'est visible que pour ceux qui gèrent son association.
  const gere = evenement && req.utilisateur && peutGererAssociation(req.utilisateur, evenement.association);
  // On répond 404 si le visiteur ne doit pas le voir.
  if (!evenement || (!evenement.publie && !gere)) throw new ErreurMetier('Événement introuvable.', 404);
  // On le renvoie.
  res.json(evenement);
}

// Crée un événement.
export async function creerEvenement(req: Request, res: Response) {
  // On garde seulement les champs autorisés.
  const champs = garderChamps(req.body, [...CHAMPS_EVENEMENT, 'publie']);
  // On vérifie le droit sur l'association choisie.
  verifierDroit(req.utilisateur!, String(champs.association));
  // On crée l'événement.
  const evenement = await Evenement.create(champs);
  // Le code 201 signifie "créé".
  res.status(201).json(evenement);
}

// Modifie un événement.
export async function modifierEvenement(req: Request, res: Response) {
  // On cherche l'événement.
  const evenement = await Evenement.findById(String(req.params.id));
  // S'il n'existe pas, on répond 404.
  if (!evenement) throw new ErreurMetier('Événement introuvable.', 404);
  // On vérifie le droit sur son association actuelle.
  verifierDroit(req.utilisateur!, evenement.association);
  // On garde seulement les champs autorisés.
  const champs = garderChamps(req.body, [...CHAMPS_EVENEMENT, 'publie']);
  // Si l'association change, on vérifie aussi le droit sur la nouvelle.
  if (champs.association !== undefined) verifierDroit(req.utilisateur!, String(champs.association));
  // La capacité ne peut pas passer sous le nombre d'inscrits.
  if (champs.capacite !== undefined && Number(champs.capacite) < evenement.nbInscrits) throw new ErreurMetier('La capacité est inférieure au nombre d\'inscrits.');
  // On applique les changements.
  evenement.set(champs);
  // On enregistre.
  await evenement.save();
  // On renvoie l'événement à jour.
  res.json(evenement);
}

// Supprime un événement.
export async function supprimerEvenement(req: Request, res: Response) {
  // On cherche l'événement.
  const evenement = await Evenement.findById(String(req.params.id));
  // S'il n'existe pas, on répond 404.
  if (!evenement) throw new ErreurMetier('Événement introuvable.', 404);
  // On vérifie le droit.
  verifierDroit(req.utilisateur!, evenement.association);
  // On supprime ses inscriptions.
  await Inscription.deleteMany({ evenement: evenement._id });
  // On supprime l'événement.
  await evenement.deleteOne();
  // Le code 204 signifie "réussi, rien à renvoyer".
  res.status(204).end();
}

// --- INSCRIPTIONS ---

// Cette fonction cherche une inscription et vérifie qu'on a le droit d'y toucher.
async function chargerInscription(req: Request) {
  // On cherche l'inscription.
  const inscription = await Inscription.findById(String(req.params.id));
  // Si elle n'existe pas, on répond 404.
  if (!inscription) throw new ErreurMetier('Inscription introuvable.', 404);
  // Le propriétaire de l'inscription a toujours le droit.
  if (String(inscription.utilisateur) === req.utilisateur!.id) return inscription;
  // Sinon, on regarde l'événement concerné.
  const evenement = await Evenement.findById(inscription.evenement);
  // Il faut gérer l'association de cet événement.
  if (!evenement || !peutGererAssociation(req.utilisateur!, evenement.association)) throw new ErreurMetier('Accès interdit.', 403);
  // Le droit est validé.
  return inscription;
}

// Renvoie les inscriptions.
export async function listerInscriptions(req: Request, res: Response) {
  // Un administrateur voit tout, les autres seulement les leurs.
  const filtre = req.utilisateur!.role === 'admin' ? {} : { utilisateur: req.utilisateur!._id };
  // On ajoute les détails de l'événement.
  res.json(await Inscription.find(filtre).populate('evenement'));
}

// Renvoie une inscription.
export async function lireInscription(req: Request, res: Response) {
  // La fonction vérifie aussi les droits.
  res.json(await chargerInscription(req));
}

// Inscrit l'utilisateur connecté à un événement.
export async function creerInscription(req: Request, res: Response) {
  // Toutes les règles métier sont dans le service.
  const inscription = await inscrireUtilisateur(req.utilisateur!.id, String(req.body.evenement));
  // Le code 201 signifie "créé".
  res.status(201).json(inscription);
}

// Modifie une inscription : la seule modification permise est l'annulation.
export async function modifierInscription(req: Request, res: Response) {
  // On vérifie l'accès.
  const inscription = await chargerInscription(req);
  // On refuse toute autre valeur.
  if (req.body.statut !== 'annulee') throw new ErreurMetier('Seul le statut "annulee" est accepté.');
  // Le service annule et libère la place.
  await annulerInscription(inscription.id);
  // On renvoie la version à jour.
  res.json(await Inscription.findById(inscription._id));
}

// Supprime une inscription.
export async function supprimerInscription(req: Request, res: Response) {
  // On vérifie l'accès.
  const inscription = await chargerInscription(req);
  // Si elle était active, on libère d'abord la place.
  if (inscription.statut === 'confirmee') await annulerInscription(inscription.id);
  // On supprime le document.
  await inscription.deleteOne();
  // Le code 204 signifie "réussi, rien à renvoyer".
  res.status(204).end();
}
