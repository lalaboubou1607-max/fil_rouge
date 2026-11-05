// On importe les outils de Mongoose.
import { Schema, model, Types } from 'mongoose';

// L'interface décrit une inscription pour TypeScript.
export interface IInscription {
  // La relation vers l'étudiant inscrit.
  utilisateur: Types.ObjectId;
  // La relation vers l'événement choisi.
  evenement: Types.ObjectId;
  // Le moment de l'inscription.
  dateInscription: Date;
  // Une inscription annulée est gardée pour l'historique.
  statut: 'confirmee' | 'annulee';
}

// Le schéma contient les règles de validation.
const schemaInscription = new Schema<IInscription>({
  // ref relie l'inscription à un utilisateur.
  utilisateur: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  // ref relie l'inscription à un événement.
  evenement: { type: Schema.Types.ObjectId, ref: 'Evenement', required: true },
  // Date.now donne automatiquement la date du moment.
  dateInscription: { type: Date, default: Date.now },
  // Une nouvelle inscription est confirmée.
  statut: { type: String, enum: ['confirmee', 'annulee'], default: 'confirmee' },
});

// Cet index interdit deux inscriptions confirmées pour le même étudiant et le même événement.
// La base refuse le doublon, même si deux clics arrivent en même temps.
schemaInscription.index(
  // Les deux champs qui forment le couple à surveiller.
  { utilisateur: 1, evenement: 1 },
  // Le filtre laisse se réinscrire un étudiant qui avait annulé.
  { unique: true, partialFilterExpression: { statut: 'confirmee' } },
);

// On exporte le modèle.
export const Inscription = model<IInscription>('Inscription', schemaInscription);
