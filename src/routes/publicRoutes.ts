// Router permet de regrouper des adresses dans un fichier.
import { Router } from 'express';
// Les fonctions de connexion et de création de compte.
import * as auth from '../controllers/authController';
// Les fonctions des pages publiques.
import * as pages from '../controllers/publicController';
// Les protections.
import { exigerConnexion, protegerFormulaires } from '../middlewares/auth';
// La limite contre les essais répétés de mots de passe.
import { limiteConnexion } from '../middlewares/limites';

// On crée le groupe d'adresses du site public.
const router = Router();

// Tous les formulaires de ce groupe sont protégés.
router.use(protegerFormulaires);

// La page d'accueil.
router.get('/', pages.accueil);
// La liste des associations.
router.get('/associations', pages.listeAssociations);
// La fiche d'une association. ":id" est une partie variable de l'adresse.
router.get('/associations/:id', pages.ficheAssociation);
// La liste des événements.
router.get('/evenements', pages.listeEvenements);
// La fiche d'un événement.
router.get('/evenements/:id', pages.ficheEvenement);

// S'inscrire à un événement demande d'être connecté.
router.post('/evenements/:id/inscription', exigerConnexion, pages.inscrire);
// Voir ses inscriptions demande d'être connecté.
router.get('/mes-inscriptions', exigerConnexion, pages.mesInscriptions);
// Annuler une inscription demande d'être connecté.
router.post('/mes-inscriptions/:id/annuler', exigerConnexion, pages.annuler);

// Le formulaire de connexion.
router.get('/connexion', auth.afficherConnexion);
// L'envoi du formulaire de connexion, avec la limite d'essais.
router.post('/connexion', limiteConnexion, auth.connexion);
// Le formulaire de création de compte.
router.get('/inscription', auth.afficherInscription);
// L'envoi du formulaire de création de compte.
router.post('/inscription', auth.inscription);
// La déconnexion, en POST pour qu'un simple lien extérieur ne puisse pas la déclencher.
router.post('/deconnexion', exigerConnexion, auth.deconnexion);

// On exporte le groupe d'adresses.
export default router;
