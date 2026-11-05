// Router permet de regrouper des adresses dans un fichier.
import { Router } from 'express';
// Les fonctions de l'API.
import * as api from '../controllers/apiController';
// La connexion par l'API.
import { connexionApi, deconnexionApi } from '../controllers/authController';
// Les protections.
import { exigerAdmin, exigerConnexion, exigerGestionnaire } from '../middlewares/auth';
// La limite contre les essais répétés de mots de passe.
import { limiteConnexion } from '../middlewares/limites';

// On crée le groupe d'adresses de l'API.
const router = Router();

// Se connecter.
router.post('/connexion', limiteConnexion, connexionApi);
// Se déconnecter.
router.post('/deconnexion', exigerConnexion, deconnexionApi);

// Lister les comptes.
router.get('/utilisateurs', exigerConnexion, exigerAdmin, api.listerUtilisateurs);
// Lire un compte.
router.get('/utilisateurs/:id', exigerConnexion, exigerAdmin, api.lireUtilisateur);
// Créer un compte.
router.post('/utilisateurs', exigerConnexion, exigerAdmin, api.creerUtilisateur);
// Modifier un compte.
router.put('/utilisateurs/:id', exigerConnexion, exigerAdmin, api.modifierUtilisateur);
// Supprimer un compte.
router.delete('/utilisateurs/:id', exigerConnexion, exigerAdmin, api.supprimerUtilisateur);

// Lister les associations (public).
router.get('/associations', api.listerAssociations);
// Lire une association (public).
router.get('/associations/:id', api.lireAssociation);
// Créer une association.
router.post('/associations', exigerConnexion, exigerAdmin, api.creerAssociation);
// Modifier une association : le contrôleur vérifie que c'est bien la sienne.
router.put('/associations/:id', exigerConnexion, exigerGestionnaire, api.modifierAssociation);
// Supprimer une association.
router.delete('/associations/:id', exigerConnexion, exigerAdmin, api.supprimerAssociation);

// Lister les événements publiés (public).
router.get('/evenements', api.listerEvenements);
// Lire un événement (public).
router.get('/evenements/:id', api.lireEvenement);
// Créer un événement.
router.post('/evenements', exigerConnexion, exigerGestionnaire, api.creerEvenement);
// Modifier un événement.
router.put('/evenements/:id', exigerConnexion, exigerGestionnaire, api.modifierEvenement);
// Supprimer un événement.
router.delete('/evenements/:id', exigerConnexion, exigerGestionnaire, api.supprimerEvenement);

// Lister ses inscriptions.
router.get('/inscriptions', exigerConnexion, api.listerInscriptions);
// Lire une inscription.
router.get('/inscriptions/:id', exigerConnexion, api.lireInscription);
// S'inscrire à un événement.
router.post('/inscriptions', exigerConnexion, api.creerInscription);
// Annuler une inscription.
router.put('/inscriptions/:id', exigerConnexion, api.modifierInscription);
// Supprimer une inscription.
router.delete('/inscriptions/:id', exigerConnexion, api.supprimerInscription);

// On exporte le groupe d'adresses.
export default router;
