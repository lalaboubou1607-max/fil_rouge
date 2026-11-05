// On importe les outils de Mongoose.
import { Schema, model, Types } from 'mongoose';

// Liste des catégories, partagée entre le modèle et les formulaires.
export const CATEGORIES = ['Sport', 'Culture', 'Technologie', 'Soirée', 'Solidarité', 'Autre'] as const;

// L'interface décrit un événement pour TypeScript.
export interface IEvenement {
  // Le titre affiché sur le site.
  titre: string;
  // Le détail de l'événement.
  description: string;
  // Le jour et l'heure.
  date: Date;
  // L'endroit où il a lieu.
  lieu: string;
  // Le nombre maximum de participants.
  capacite: number;
  // La catégorie sert au filtrage.
  categorie: (typeof CATEGORIES)[number];
  // La relation vers l'association qui organise.
  association: Types.ObjectId;
  // Un événement non publié reste invisible pour les étudiants.
  publie: boolean;
  // Compteur des inscrits, utile pour vérifier la capacité rapidement.
  nbInscrits: number;
}

// Le schéma contient les règles de validation.
const schemaEvenement = new Schema<IEvenement>(
  {
    // Le titre est obligatoire.
    titre: { type: String, required: [true, 'Le titre est obligatoire'], trim: true },
    // La description est obligatoire.
    description: { type: String, required: [true, 'La description est obligatoire'], trim: true },
    // La date est obligatoire.
    date: { type: Date, required: [true, 'La date est obligatoire'] },
    // Le lieu est obligatoire.
    lieu: { type: String, required: [true, 'Le lieu est obligatoire'], trim: true },
    // min refuse une capacité de zéro ou négative.
    capacite: { type: Number, required: [true, 'La capacité est obligatoire'], min: [1, 'La capacité doit être d\'au moins 1'] },
    // enum limite le choix à la liste des catégories.
    categorie: { type: String, enum: CATEGORIES, required: [true, 'La catégorie est obligatoire'] },
    // ref relie l'événement à une association.
    association: { type: Schema.Types.ObjectId, ref: 'Association', required: [true, 'L\'association est obligatoire'] },
    // Un événement commence en brouillon, il faut le publier ensuite.
    publie: { type: Boolean, default: false },
    // Le compteur commence à zéro.
    nbInscrits: { type: Number, default: 0, min: 0 },
  },
  // On garde les dates de création et de modification.
  { timestamps: true },
);

// On exporte le modèle.
export const Evenement = model<IEvenement>('Evenement', schemaEvenement);
