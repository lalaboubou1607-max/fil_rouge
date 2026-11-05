// Ces types décrivent la requête, la réponse et la fonction "suivant" d'Express.
import { Request, Response, NextFunction } from 'express';
// randomBytes fabrique des valeurs aléatoires impossibles à deviner.
import { randomBytes } from 'crypto';
// HydratedDocument est le type d'un document lu depuis la base.
import { HydratedDocument, Types } from 'mongoose';
// On lit l'utilisateur connecté depuis la base.
import { Utilisateur, IUtilisateur } from '../models/Utilisateur';
// On utilise cette erreur pour refuser un accès.
import { ErreurMetier } from '../utils/ErreurMetier';

// On ajoute nos propres champs à la session pour que TypeScript les connaisse.
declare module 'express-session' {
  interface SessionData {
    // L'identifiant de l'utilisateur connecté.
    utilisateurId?: string;
    // Le jeton qui protège les formulaires.
    jetonCsrf?: string;
    // Un message à afficher une seule fois sur la page suivante.
    message?: string;
  }
}

// On ajoute "utilisateur" à l'objet requête d'Express.
declare global {
  namespace Express {
    interface Request {
      // L'utilisateur connecté, s'il y en a un.
      utilisateur?: HydratedDocument<IUtilisateur>;
    }
  }
}

// Ce middleware s'exécute à chaque requête pour savoir qui visite le site.
export async function chargerUtilisateur(req: Request, res: Response, next: NextFunction) {
  // Si la session contient un identifiant, le visiteur est connecté.
  if (req.session.utilisateurId) {
    // On lit son compte en base.
    const utilisateur = await Utilisateur.findById(req.session.utilisateurId);
    // On le garde dans la requête pour les contrôleurs.
    if (utilisateur) req.utilisateur = utilisateur;
  }
  // res.locals rend l'utilisateur disponible dans toutes les vues EJS.
  res.locals.utilisateur = req.utilisateur ?? null;
  // On passe à l'étape suivante.
  next();
}

// Ce middleware prépare le message d'une page à l'autre.
export function preparerMessage(req: Request, res: Response, next: NextFunction) {
  // On donne le message à la vue.
  res.locals.message = req.session.message ?? null;
  // On le supprime pour qu'il ne s'affiche qu'une seule fois.
  delete req.session.message;
  // On continue.
  next();
}

// Ce middleware protège les formulaires contre les attaques CSRF :
// un autre site ne peut pas envoyer un formulaire à la place de l'utilisateur.
export function protegerFormulaires(req: Request, res: Response, next: NextFunction) {
  // On crée un jeton une seule fois par session.
  if (!req.session.jetonCsrf) req.session.jetonCsrf = randomBytes(32).toString('hex');
  // On donne le jeton aux vues pour le placer dans un champ caché.
  res.locals.jetonCsrf = req.session.jetonCsrf;
  // Un formulaire envoyé en POST doit contenir le bon jeton.
  if (req.method === 'POST' && req.body?._csrf !== req.session.jetonCsrf) {
    // Sinon on refuse et on s'arrête ici.
    throw new ErreurMetier('Formulaire expiré, recharge la page et réessaie.', 403);
  }
  // Tout est bon, on continue.
  next();
}

// Ce middleware bloque les visiteurs non connectés.
export function exigerConnexion(req: Request, res: Response, next: NextFunction) {
  // Si l'utilisateur est connecté, on laisse passer.
  if (req.utilisateur) return next();
  // Les routes d'API répondent en JSON, sans redirection.
  if (req.originalUrl.startsWith('/api')) throw new ErreurMetier('Connexion requise.', 401);
  // Pour les pages du site, on envoie vers la connexion.
  res.redirect('/connexion');
}

// Ce middleware réserve une route aux administrateurs et aux responsables.
export function exigerGestionnaire(req: Request, res: Response, next: NextFunction) {
  // On lit le rôle de l'utilisateur.
  const role = req.utilisateur?.role;
  // Ces deux rôles ont accès au back-office.
  if (role === 'admin' || role === 'responsable') return next();
  // Les autres sont refusés avec le code 403 (interdit).
  throw new ErreurMetier('Accès réservé aux responsables.', 403);
}

// Ce middleware réserve une route aux administrateurs.
export function exigerAdmin(req: Request, res: Response, next: NextFunction) {
  // Seul le rôle admin passe.
  if (req.utilisateur?.role === 'admin') return next();
  // Les autres sont refusés.
  throw new ErreurMetier('Accès réservé aux administrateurs.', 403);
}

// Cette fonction dit si un utilisateur peut gérer une association donnée.
export function peutGererAssociation(utilisateur: HydratedDocument<IUtilisateur>, associationId: Types.ObjectId | string) {
  // Un administrateur peut tout gérer.
  if (utilisateur.role === 'admin') return true;
  // Un responsable ne gère que son association : on compare les identifiants en texte.
  return utilisateur.role === 'responsable' && String(utilisateur.association) === String(associationId);
}

// Cette fonction lance une erreur si l'utilisateur n'a pas le droit.
export function verifierDroit(utilisateur: HydratedDocument<IUtilisateur>, associationId: Types.ObjectId | string) {
  // On réutilise le test ci-dessus.
  if (!peutGererAssociation(utilisateur, associationId)) {
    // Le code 403 signifie "interdit".
    throw new ErreurMetier('Tu ne peux gérer que les données de ton association.', 403);
  }
}
