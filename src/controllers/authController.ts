// Les types de la requête et de la réponse.
import { Request, Response } from 'express';
// bcrypt compare le mot de passe saisi avec l'empreinte enregistrée.
import bcrypt from 'bcryptjs';
// Le modèle des comptes.
import { Utilisateur } from '../models/Utilisateur';
// L'erreur envoyée quand une règle n'est pas respectée.
import { ErreurMetier } from '../utils/ErreurMetier';

// Cette fonction cherche le compte et vérifie le mot de passe.
async function verifierIdentifiants(emailSaisi: unknown, motDePasseSaisi: unknown) {
  // String() transforme la saisie en texte : cela bloque les injections dans la recherche.
  const email = String(emailSaisi ?? '').toLowerCase().trim();
  // select('+motDePasse') demande ce champ, caché par défaut.
  const utilisateur = await Utilisateur.findOne({ email }).select('+motDePasse');
  // Sans compte, on s'arrête. Le message reste vague pour ne pas révéler les emails existants.
  if (!utilisateur) return null;
  // compare calcule l'empreinte du mot de passe saisi et compare les deux.
  const motDePasseCorrect = await bcrypt.compare(String(motDePasseSaisi ?? ''), utilisateur.motDePasse);
  // On renvoie le compte seulement si le mot de passe est bon.
  return motDePasseCorrect ? utilisateur : null;
}

// Cette fonction démarre la session d'un utilisateur connecté.
function ouvrirSession(req: Request, utilisateurId: string) {
  // On transforme la fonction à rappel en promesse pour pouvoir utiliser await.
  return new Promise<void>((resolve, reject) => {
    // regenerate change l'identifiant de session : un voleur d'ancien cookie n'obtient rien.
    req.session.regenerate((erreur) => {
      // En cas de problème, on transmet l'erreur.
      if (erreur) return reject(erreur);
      // On note qui est connecté.
      req.session.utilisateurId = utilisateurId;
      // On signale que c'est terminé.
      resolve();
    });
  });
}

// Affiche la page de connexion.
export function afficherConnexion(req: Request, res: Response) {
  // render transforme le fichier EJS en page HTML.
  res.render('public/connexion', { titre: 'Connexion' });
}

// Traite le formulaire de connexion.
export async function connexion(req: Request, res: Response) {
  // On vérifie l'email et le mot de passe.
  const utilisateur = await verifierIdentifiants(req.body.email, req.body.motDePasse);
  // S'ils sont mauvais, on revient au formulaire avec un message.
  if (!utilisateur) {
    // Ce message s'affichera sur la page suivante.
    req.session.message = 'Email ou mot de passe incorrect.';
    // return évite d'exécuter la suite.
    return res.redirect('/connexion');
  }
  // On ouvre la session.
  await ouvrirSession(req, utilisateur.id);
  // On renvoie vers l'accueil.
  res.redirect('/');
}

// Affiche la page de création de compte.
export function afficherInscription(req: Request, res: Response) {
  // On affiche le formulaire.
  res.render('public/inscription', { titre: 'Créer un compte' });
}

// Traite le formulaire de création de compte.
export async function inscription(req: Request, res: Response) {
  // On choisit les champs un par un : personne ne peut se donner le rôle admin.
  const utilisateur = await Utilisateur.create({
    // Le prénom saisi.
    prenom: req.body.prenom,
    // Le nom saisi.
    nom: req.body.nom,
    // L'email saisi.
    email: req.body.email,
    // Le mot de passe, transformé en empreinte par le modèle.
    motDePasse: req.body.motDePasse,
  });
  // On connecte directement le nouvel étudiant.
  await ouvrirSession(req, utilisateur.id);
  // On lui souhaite la bienvenue.
  req.session.message = 'Bienvenue, ton compte est créé !';
  // On l'envoie vers les événements.
  res.redirect('/evenements');
}

// Déconnecte l'utilisateur.
export function deconnexion(req: Request, res: Response) {
  // destroy supprime la session côté serveur.
  req.session.destroy(() => {
    // On supprime aussi le cookie dans le navigateur.
    res.clearCookie('connect.sid');
    // On revient à l'accueil.
    res.redirect('/');
  });
}

// Version API de la connexion : elle répond en JSON au lieu d'afficher une page.
export async function connexionApi(req: Request, res: Response) {
  // On vérifie les identifiants.
  const utilisateur = await verifierIdentifiants(req.body.email, req.body.motDePasse);
  // Le code 401 signifie "non authentifié".
  if (!utilisateur) throw new ErreurMetier('Email ou mot de passe incorrect.', 401);
  // On ouvre la session.
  await ouvrirSession(req, utilisateur.id);
  // On renvoie seulement des informations sans danger.
  res.json({ id: utilisateur.id, email: utilisateur.email, role: utilisateur.role });
}

// Version API de la déconnexion.
export function deconnexionApi(req: Request, res: Response) {
  // On supprime la session.
  req.session.destroy(() => {
    // On supprime le cookie.
    res.clearCookie('connect.sid');
    // Le code 204 signifie "réussi, rien à renvoyer".
    res.status(204).end();
  });
}
