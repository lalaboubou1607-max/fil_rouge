// express-rate-limit compte le nombre de demandes de chaque visiteur.
import { rateLimit } from 'express-rate-limit';

// Cette limite freine ceux qui essaient beaucoup de mots de passe.
export const limiteConnexion = rateLimit({
  // La fenêtre de comptage dure 15 minutes, écrites ici en millisecondes.
  windowMs: 15 * 60 * 1000,
  // Après 10 échecs, le visiteur doit attendre.
  limit: 10,
  // Les connexions réussies ne comptent pas.
  skipSuccessfulRequests: true,
  // Le message affiché quand la limite est atteinte.
  message: 'Trop de tentatives. Réessaie dans 15 minutes.',
});
