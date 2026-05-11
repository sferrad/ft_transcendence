// =============================================================================
// FICHIER: config.hcl (Vault server config)
//
// Objectif:
// - Dire à Vault où stocker ses données (storage)
// - Sur quelle adresse/port écouter (listener)
// - Quelques options "container-friendly" (mlock)
//
// Important:
// - Cette config est pensée pour un réseau de conteneurs (pas Internet).
// - Ici le listener est SANS TLS (`tls_disable=1`). C'est acceptable uniquement
//   si Vault n'est pas exposé à l'hôte et si ton réseau interne est contrôlé.
// =============================================================================

storage "file" {
    // Backend de stockage "file": Vault écrit sur disque.
    // Dans docker-compose, `/vault/data` est normalement un volume persistant.
    path = "/vault/data"
}

listener "tcp" {
    // 0.0.0.0 = écouter sur toutes les interfaces du conteneur.
    // Port par défaut Vault: 8200.
    address = "0.0.0.0:8200"

    // Enable TLS for Vault service
    tls_disable = 0
    tls_cert_file = "/certs/internal.crt"
    tls_key_file = "/certs/internal.key"
}

// Active l'UI web de Vault (utile pour debug).
//
// IMPORTANT: "quelle URL utiliser ?" dépend d'où tu te connectes.
// - Depuis un AUTRE conteneur sur les mêmes networks docker-compose:
//     http://vault:8200/ui
//   (ici "vault" = nom de service docker-compose = DNS interne)
//
// - Depuis TA MACHINE (navigateur):
//   Par défaut dans ce projet, Vault n'a pas de `ports:` dans docker-compose,
//   donc il n'est PAS accessible depuis l'hôte.
//   Pour y accéder, il faut publier le port 8200 (ex: 8200:8200) puis ouvrir:
//     http://localhost:8200/ui
ui = true

// Adresse que Vault annonce dans certaines réponses (redirections, etc.).
// IMPORTANT: `0.0.0.0` est une adresse de bind-all, pas une adresse joignable.
// Si tu la mets ici, l'UI/CLI peut générer des URLs/redirects invalides.
// En docker-compose, préfère le DNS interne du service.
api_addr = "https://vault:8200"

// `mlock` empêche le swap des secrets en RAM vers disque.
// En conteneur, c'est souvent non autorisé -> on désactive pour éviter un crash.
disable_mlock = true

log_level = "info"