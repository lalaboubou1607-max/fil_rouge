// Cette fonction copie seulement les champs autorisés d'un formulaire.
// Elle empêche un visiteur d'ajouter un champ interdit, comme nbInscrits.
export function garderChamps(corps: Record<string, unknown> | undefined, autorises: string[]) {
  // On prépare un objet vide pour le résultat.
  const resultat: Record<string, unknown> = {};
  // On regarde chaque champ autorisé, un par un.
  for (const champ of autorises) {
    // On le recopie seulement s'il a été envoyé.
    if (corps?.[champ] !== undefined) resultat[champ] = corps[champ];
  }
  // On renvoie l'objet filtré.
  return resultat;
}

// Les champs qu'un utilisateur peut remplir pour une association.
export const CHAMPS_ASSOCIATION = ['nom', 'description', 'contact', 'logo'];
// Les champs qu'un utilisateur peut remplir pour un événement.
export const CHAMPS_EVENEMENT = ['titre', 'description', 'date', 'lieu', 'capacite', 'categorie', 'association'];

// Cette fonction neutralise les caractères spéciaux d'une recherche.
// Sans elle, un texte comme "(" ferait planter l'expression régulière.
export function echapperRecherche(texte: string) {
  // On place un \ devant chaque caractère spécial.
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
