// path construit des chemins de fichiers valables sur tous les systèmes.
import path from 'path';
// Express est le serveur web. Les types décrivent ses objets.
import express, { Request, Response, NextFunction } from 'express';
// session garde le visiteur connecté d'une page à l'autre.
import session from 'express-session';
// MongoStore enregistre les sessions dans MongoDB.
import MongoStore from 'connect-mongo';
// helmet ajoute des en-têtes de sécurité à chaque réponse.
import helmet from 'helmet';
// mongoose donne accès à la connexion déjà ouverte.
import mongoose from 'mongoose';
// Le middleware qui identifie le visiteur et celui des messages.
import { chargerUtilisateur, preparerMessage } from './middlewares/auth';
// Les adresses du site public.
import publicRoutes from './routes/publicRoutes';
// Les adresses du back-office.
import adminRoutes from './routes/adminRoutes';
// Les adresses de l'API.
import apiRoutes from './routes/apiRoutes';
// Notre type d'erreur.
import { ErreurMetier } from './utils/ErreurMetier';

// Cette fonction fabrique l'application. Les tests peuvent ainsi la créer aussi.
export function creerApplication() {
  // On crée l'application Express.
  const app = express();

  // Les pages HTML seront produites par EJS.
  app.set('view engine', 'ejs');
  // On indique le dossier qui contient les vues.
  app.set('views', path.join(process.cwd(), 'views'));

  // Cette fonction écrit une date en français pour l'affichage.
  app.locals.formaterDate = (date: Date) => new Date(date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
  // Cette fonction écrit une date au format attendu par un champ datetime-local.
  // On retire le décalage horaire pour afficher l'heure locale et non l'heure UTC.
  app.locals.dateFormulaire = (date: Date) => new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  // On active helmet avec une liste des sources autorisées pour le navigateur.
  app.use(helmet({
    // contentSecurityPolicy limite ce que la page a le droit de charger.
    contentSecurityPolicy: {
      directives: {
        // Les styles viennent de notre site et de Google Fonts pour la police.
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        // Les fichiers de police viennent de Google Fonts.
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        // Les logos d'associations peuvent être des adresses https externes.
        imgSrc: ["'self'", 'data:', 'https:'],
        // En local il n'y a pas de https, donc on désactive cette option de helmet.
        upgradeInsecureRequests: null,
      },
    },
  }));

  // Les fichiers du dossier public (CSS, images) sont envoyés tels quels.
  app.use(express.static(path.join(process.cwd(), 'public')));
  // On lit les données des formulaires. false refuse les objets imbriqués, plus sûr.
  app.use(express.urlencoded({ extended: false }));
  // On lit le JSON envoyé à l'API.
  app.use(express.json());

  // On active les sessions.
  app.use(session({
    // Cette phrase signe le cookie pour qu'il ne puisse pas être falsifié.
    secret: process.env.SESSION_SECRET as string,
    // On n'enregistre pas une session qui n'a pas changé.
    resave: false,
    // On ne crée pas de session pour un visiteur qui n'en a pas besoin.
    saveUninitialized: false,
    // Les sessions sont stockées dans MongoDB et survivent à un redémarrage.
    store: MongoStore.create({ client: mongoose.connection.getClient() as never }),
    // Les réglages du cookie.
    cookie: {
      // httpOnly empêche JavaScript de lire le cookie, ce qui limite les vols.
      httpOnly: true,
      // lax empêche l'envoi du cookie depuis les formulaires d'autres sites.
      sameSite: 'lax',
      // En production, le cookie ne circule qu'en https.
      secure: process.env.NODE_ENV === 'production',
      // La session dure 7 jours, écrits en millisecondes.
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  // On identifie le visiteur à chaque requête.
  app.use(chargerUtilisateur);
  // On prépare le message à afficher.
  app.use(preparerMessage);

  // Les adresses qui commencent par /api vont vers l'API.
  app.use('/api', apiRoutes);
  // Les adresses qui commencent par /admin vont vers le back-office.
  app.use('/admin', adminRoutes);
  // Toutes les autres vont vers le site public.
  app.use('/', publicRoutes);

  // Si aucune route n'a répondu, l'adresse n'existe pas.
  app.use(() => {
    // On lance une erreur 404, attrapée juste en dessous.
    throw new ErreurMetier('Page introuvable.', 404);
  });

  // Ce gestionnaire reçoit toutes les erreurs. Express le reconnaît à ses 4 paramètres.
  app.use((erreur: any, req: Request, res: Response, next: NextFunction) => {
    // Par défaut, c'est une erreur du serveur : code 500.
    let code = 500;
    // Ce message ne donne aucun détail technique au visiteur.
    let message = 'Une erreur est survenue. Réessaie plus tard.';

    // Nos erreurs métier contiennent déjà le bon code et le bon message.
    if (erreur instanceof ErreurMetier) {
      // On reprend le code.
      code = erreur.codeHttp;
      // On reprend le message.
      message = erreur.message;
    } else if (erreur.name === 'ValidationError') {
      // Un champ ne respecte pas le schéma : code 400.
      code = 400;
      // On prend le premier message de validation.
      message = (Object.values(erreur.errors)[0] as Error).message;
    } else if (erreur.name === 'CastError') {
      // Un identifiant mal formé correspond à une page qui n'existe pas.
      code = 404;
      // On le dit simplement.
      message = 'Page introuvable.';
    } else if (erreur.code === 11000) {
      // L'index unique a bloqué un doublon : code 409 (conflit).
      code = 409;
      // Le message convient pour un email ou un nom déjà pris.
      message = 'Cette valeur est déjà utilisée.';
    } else {
      // Erreur imprévue : on l'écrit dans le terminal pour pouvoir la corriger.
      console.error(erreur);
    }

    // L'API répond toujours en JSON.
    if (req.originalUrl.startsWith('/api')) return res.status(code).json({ erreur: message });

    // Un formulaire refusé revient sur la même adresse avec le message.
    if (req.method === 'POST' && (code === 400 || code === 409)) {
      // On garde le message pour la page suivante.
      req.session.message = message;
      // originalUrl vient de notre propre site : la redirection reste sûre.
      return res.redirect(req.originalUrl);
    }

    // Dans les autres cas, on affiche la page d'erreur.
    res.status(code).render('public/erreur', { titre: 'Erreur', code, texteErreur: message });
  });

  // On renvoie l'application prête à l'emploi.
  return app;
}
