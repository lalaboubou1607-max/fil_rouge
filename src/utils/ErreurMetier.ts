// Une erreur "métier" est une règle non respectée, comme un événement complet.
// On hérite de Error pour pouvoir la lancer avec "throw".
export class ErreurMetier extends Error {
  // codeHttp est le code renvoyé au navigateur (400 = demande refusée).
  codeHttp: number;

  // Le constructeur reçoit le message à afficher et le code HTTP.
  constructor(message: string, codeHttp = 400) {
    // super transmet le message à la classe Error.
    super(message);
    // On garde le code pour le gestionnaire d'erreurs de l'application.
    this.codeHttp = codeHttp;
  }
}
