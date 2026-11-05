// On a besoin des événements pour vérifier et modifier le nombre de places.
import { Evenement } from '../models/Evenement';
// On a besoin des inscriptions pour les créer et les annuler.
import { Inscription } from '../models/Inscription';
// On vérifie aussi que l'association organisatrice est active.
import { Association } from '../models/Association';
// On lance cette erreur quand une règle n'est pas respectée.
import { ErreurMetier } from '../utils/ErreurMetier';

// Cette fonction inscrit un utilisateur. Le site et l'API l'utilisent tous les deux.
export async function inscrireUtilisateur(utilisateurId: string, evenementId: string) {
  // On cherche si l'étudiant a déjà une inscription confirmée à cet événement.
  const dejaInscrit = await Inscription.findOne({ utilisateur: utilisateurId, evenement: evenementId, statut: 'confirmee' });
  // Si oui, on arrête avec un message clair.
  if (dejaInscrit) throw new ErreurMetier('Tu es déjà inscrit à cet événement.', 409);

  // On lit l'événement pour vérifier son existence.
  const evenement = await Evenement.findById(evenementId);
  // S'il n'existe pas ou n'est pas publié, l'étudiant ne doit pas pouvoir s'inscrire.
  if (!evenement || !evenement.publie) throw new ErreurMetier('Cet événement n\'est pas disponible.', 404);
  // On refuse les inscriptions à un événement déjà passé.
  if (evenement.date <= new Date()) throw new ErreurMetier('Cet événement est déjà passé.');

  // On cherche l'association organisatrice.
  const association = await Association.findById(evenement.association);
  // Une association désactivée ne prend plus d'inscriptions.
  if (!association || association.statut !== 'active') throw new ErreurMetier('Cet événement n\'est pas disponible.', 404);

  // On réserve une place en une seule opération : la base vérifie et ajoute 1 en même temps.
  // Ainsi, deux étudiants ne peuvent pas prendre ensemble la dernière place.
  const placeReservee = await Evenement.findOneAndUpdate(
    // La condition $expr compare deux champs : il faut moins d'inscrits que de places.
    { _id: evenementId, $expr: { $lt: ['$nbInscrits', '$capacite'] } },
    // $inc ajoute 1 au compteur.
    { $inc: { nbInscrits: 1 } },
  );
  // Si rien n'a été modifié, c'est qu'il n'y avait plus de place.
  if (!placeReservee) throw new ErreurMetier('Cet événement est complet.', 409);

  // try permet de réagir si la création échoue.
  try {
    // On crée l'inscription et on la renvoie.
    return await Inscription.create({ utilisateur: utilisateurId, evenement: evenementId });
  } catch (erreur) {
    // La création a échoué, donc on rend la place réservée juste avant.
    await Evenement.updateOne({ _id: evenementId }, { $inc: { nbInscrits: -1 } });
    // Le code 11000 de MongoDB signifie que l'index unique a bloqué un doublon.
    if ((erreur as { code?: number }).code === 11000) throw new ErreurMetier('Tu es déjà inscrit à cet événement.', 409);
    // Pour toute autre erreur, on la laisse remonter.
    throw erreur;
  }
}

// Cette fonction annule une inscription et libère la place.
export async function annulerInscription(inscriptionId: string) {
  // On passe en "annulee" uniquement si l'inscription était confirmée.
  // Cela évite de libérer deux fois la place en cas de double clic.
  const inscription = await Inscription.findOneAndUpdate(
    // La condition de recherche.
    { _id: inscriptionId, statut: 'confirmee' },
    // La modification à appliquer.
    { statut: 'annulee' },
  );
  // Si rien n'a été trouvé, il n'y a rien à annuler.
  if (!inscription) throw new ErreurMetier('Cette inscription n\'est pas active.', 404);
  // On enlève 1 au compteur pour rendre la place disponible.
  await Evenement.updateOne({ _id: inscription.evenement }, { $inc: { nbInscrits: -1 } });
}
