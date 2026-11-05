// Router permet de regrouper des adresses dans un fichier.
import { Router } from 'express';
// Les fonctions du back-office.
import * as admin from '../controllers/adminController';
// Les protections.
import { exigerAdmin, exigerConnexion, exigerGestionnaire, protegerFormulaires } from '../middlewares/auth';

// On crée le groupe d'adresses du back-office.
const router = Router();

// Le jeton passe en premier : même la page d'erreur 403 en a besoin pour sa déconnexion.
// Ensuite, on vérifie la connexion, puis le rôle.
router.use(protegerFormulaires, exigerConnexion, exigerGestionnaire);

// Le tableau de bord.
router.get('/', admin.tableauDeBord);

// La liste des associations.
router.get('/associations', admin.associations);
// Le formulaire de création, réservé aux administrateurs.
router.get('/associations/nouvelle', exigerAdmin, admin.formulaireNouvelleAssociation);
// L'envoi de ce formulaire, réservé aux administrateurs.
router.post('/associations/nouvelle', exigerAdmin, admin.creerAssociation);
// Le formulaire de modification.
router.get('/associations/:id/modifier', admin.formulaireModifierAssociation);
// L'envoi de ce formulaire.
router.post('/associations/:id/modifier', admin.modifierAssociation);
// L'activation et la désactivation, réservées aux administrateurs.
router.post('/associations/:id/statut', exigerAdmin, admin.basculerAssociation);

// La liste des événements.
router.get('/evenements', admin.evenements);
// Le formulaire de création.
router.get('/evenements/nouveau', admin.formulaireNouvelEvenement);
// L'envoi de ce formulaire.
router.post('/evenements/nouveau', admin.creerEvenement);
// Le formulaire de modification.
router.get('/evenements/:id/modifier', admin.formulaireModifierEvenement);
// L'envoi de ce formulaire.
router.post('/evenements/:id/modifier', admin.modifierEvenement);
// La publication et la dépublication.
router.post('/evenements/:id/publication', admin.basculerPublication);
// La suppression.
router.post('/evenements/:id/supprimer', admin.supprimerEvenement);
// La liste des inscrits.
router.get('/evenements/:id/inscrits', admin.inscrits);

// La liste des comptes, réservée aux administrateurs.
router.get('/utilisateurs', exigerAdmin, admin.utilisateurs);
// Le formulaire des droits d'un compte.
router.get('/utilisateurs/:id/modifier', exigerAdmin, admin.formulaireUtilisateur);
// L'envoi de ce formulaire.
router.post('/utilisateurs/:id/modifier', exigerAdmin, admin.modifierUtilisateur);

// On exporte le groupe d'adresses.
export default router;
