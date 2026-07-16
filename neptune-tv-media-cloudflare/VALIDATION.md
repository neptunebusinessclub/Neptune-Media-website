# Validation

- Aucun appel ou SDK Supabase.
- Authentification administrateur avec mot de passe haché et cookie signé HttpOnly/Secure/SameSite=Strict.
- Premier administrateur protégé par un jeton d'amorçage secret et utilisable une seule fois.
- Catalogue, campagnes, statistiques et audit stockés dans un Durable Object.
- Tracking borné à quatre événements agrégés : vue, watch time, partage, clic réservation.
- Groq appelé côté Worker ; la clé n'est jamais envoyée au navigateur.
- Toute action proposée par l'IA exige une confirmation humaine.
- Cinq vidéos optimisées sous la limite de 25 Mio par asset.
- Le tunnel de réservation existant n'est pas modifié.
