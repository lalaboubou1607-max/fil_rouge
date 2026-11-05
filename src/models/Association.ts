// On importe les outils de Mongoose.
import { Schema, model } from 'mongoose';

// L'interface décrit une association pour TypeScript.
export interface IAssociation {
  // Le nom de l'association.
  nom: string;
  // Le texte de présentation.
  description: string;
  // L'email ou le moyen de contact.
  contact: string;
  // Le chemin ou l'adresse de l'image du logo.
  logo?: string;
  // Une association inactive n'apparaît plus sur le site public.
  statut: 'active' | 'inactive';
}

// Le schéma contient les règles vérifiées à chaque enregistrement.
const schemaAssociation = new Schema<IAssociation>(
  {
    // unique empêche deux associations de porter le même nom.
    nom: { type: String, required: [true, 'Le nom est obligatoire'], unique: true, trim: true },
    // La description est obligatoire pour que la fiche soit utile.
    description: { type: String, required: [true, 'La description est obligatoire'], trim: true },
    // Le contact est obligatoire pour que les étudiants puissent écrire à l'association.
    contact: { type: String, required: [true, 'Le contact est obligatoire'], trim: true },
    // Le logo est facultatif, donc il n'a pas de required.
    logo: { type: String, trim: true },
    // Une nouvelle association est active par défaut.
    statut: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  // On garde les dates de création et de modification.
  { timestamps: true },
);

// On exporte le modèle.
export const Association = model<IAssociation>('Association', schemaAssociation);
