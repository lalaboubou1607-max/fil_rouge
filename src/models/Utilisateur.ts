// Schema décrit la forme d'un document, model crée l'outil pour lire et écrire en base.
import { Schema, model, Types } from 'mongoose';
// bcryptjs sert à transformer un mot de passe en empreinte illisible.
import bcrypt from 'bcryptjs';

// Liste des rôles possibles. "as const" fixe ces valeurs pour TypeScript.
export const ROLES = ['etudiant', 'responsable', 'admin'] as const;

// L'interface dit à TypeScript quels champs possède un utilisateur.
export interface IUtilisateur {
  // Le prénom est un texte.
  prenom: string;
  // Le nom est un texte.
  nom: string;
  // L'email sert d'identifiant à la connexion.
  email: string;
  // On stocke uniquement l'empreinte du mot de passe, jamais le mot de passe lui-même.
  motDePasse: string;
  // Le rôle prend obligatoirement une des valeurs de ROLES.
  role: (typeof ROLES)[number];
  // Le "?" rend le champ facultatif : seul un responsable a une association.
  association?: Types.ObjectId;
}

// On crée le schéma : c'est la version que Mongoose vérifie au moment d'enregistrer.
const schemaUtilisateur = new Schema<IUtilisateur>(
  {
    // trim enlève les espaces autour du texte saisi.
    prenom: { type: String, required: [true, 'Le prénom est obligatoire'], trim: true },
    // Même règle pour le nom.
    nom: { type: String, required: [true, 'Le nom est obligatoire'], trim: true },
    // unique interdit deux comptes avec le même email, lowercase le met en minuscules.
    email: { type: String, required: [true, 'L\'email est obligatoire'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'L\'email n\'est pas valide'] },
    // select: false évite de renvoyer le mot de passe dans les recherches normales.
    motDePasse: { type: String, required: [true, 'Le mot de passe est obligatoire'], minlength: [8, 'Le mot de passe doit faire au moins 8 caractères'], select: false },
    // enum limite les valeurs, default donne le rôle étudiant aux nouveaux comptes.
    role: { type: String, enum: ROLES, default: 'etudiant' },
    // ref crée la relation avec le modèle Association.
    association: { type: Schema.Types.ObjectId, ref: 'Association' },
  },
  // timestamps ajoute automatiquement les dates de création et de modification.
  { timestamps: true },
);

// Ce code s'exécute juste avant chaque enregistrement d'un utilisateur.
schemaUtilisateur.pre('save', async function () {
  // Si le mot de passe n'a pas changé, on ne le transforme pas une deuxième fois.
  if (!this.isModified('motDePasse')) return;
  // On remplace le mot de passe par son empreinte. Le 10 règle la difficulté du calcul.
  this.motDePasse = await bcrypt.hash(this.motDePasse, 10);
});

// On exporte le modèle pour l'utiliser dans le reste du projet.
export const Utilisateur = model<IUtilisateur>('Utilisateur', schemaUtilisateur);
