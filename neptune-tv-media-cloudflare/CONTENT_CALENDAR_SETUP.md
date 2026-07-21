# Calendrier de contenu Neptune Media

## Fonctionnement livré

Lorsqu’un fichier de type `short`, `shorts`, `reel` ou `teaser` est importé depuis le Studio :

1. le fichier est ajouté à la bibliothèque du client ;
2. une date est placée automatiquement dans le prochain créneau libre ;
3. Neptune IA prépare un titre accrocheur mais fidèle, une description qui appelle une réponse et des hashtags ;
4. le client retrouve le short dans la liste horizontale et dans son calendrier ;
5. il peut modifier le texte, les réseaux et la date ;
6. le mode express copie la légende, prépare le fichier et ouvre le canal choisi. Sur les appareils compatibles, le partage natif peut envoyer directement la vidéo au menu de partage.

## Variables Cloudflare facultatives

Aucun secret ne doit être ajouté au dépôt. Configurez-les dans Cloudflare Workers > Settings > Variables and Secrets.

### YouTube — signaux des 7 derniers jours

- `YOUTUBE_DATA_API_KEY` : clé YouTube Data API v3.

La génération analyse les vidéos françaises pertinentes publiées pendant les sept derniers jours. Sans cette clé, Neptune IA utilise le contenu du short et ses règles éditoriales durables.

### TikTok et Instagram — signaux des 7 derniers jours

- `NEPTUNE_TRENDS_API_URL` : endpoint serveur Neptune renvoyant des signaux autorisés pour TikTok et Instagram.
- `NEPTUNE_TRENDS_API_TOKEN` : jeton Bearer facultatif de cet endpoint.

Format attendu :

```json
{
  "tiktok": {
    "samples": ["Exemple de sujet ou d’accroche"],
    "hashtags": ["entrepreneuriat", "business"]
  },
  "instagram": {
    "samples": ["Exemple de sujet ou d’accroche"],
    "hashtags": ["interview", "conseils"]
  }
}
```

Sans cet endpoint, l’interface indique explicitement qu’aucune source sociale temps réel n’est configurée. Aucun hashtag tendance n’est inventé.

## Publication directe par API

Le mode express fonctionne immédiatement sans stocker les mots de passe sociaux du client.

La publication totalement automatique nécessite, pour chaque plateforme :

- une application développeur approuvée ;
- un parcours OAuth permettant au client de connecter son compte ;
- le stockage chiffré et renouvelable des jetons ;
- les autorisations de publication accordées par la plateforme ;
- la gestion des limites, statuts et erreurs de publication.

Ces identifiants ne doivent jamais être placés dans le code source.
