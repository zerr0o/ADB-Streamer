# ADB-Streamer

Une application desktop pour gérer et diffuser l'écran d'appareils Android en utilisant ADB et SCRCPY.

## Fonctionnalités

📱 **Gestion d'appareils Android**
- Connexion à des appareils via USB ou Wi-Fi (TCP/IP)
- Listing automatique des appareils connectés
- Affichage des informations (niveau de batterie, dimensions d'écran)
- Conversion des connexions USB vers TCP/IP pour une utilisation sans fil

🎮 **Streaming d'écran**
- Diffusion en temps réel de l'écran des appareils Android
- Configuration des paramètres de streaming (résolution, bitrate, framerate)
- Contrôle à distance des appareils
- Gestion de plusieurs streams simultanés

📊 **Interface intuitive**
- Interface moderne avec Vue 3 et Vuetify
- Gestion multi-appareils simplifiée
- Sélection multiple d'appareils pour des actions groupées

## Installation

```sh
# Cloner le projet
git clone https://github.com/votre-utilisateur/ADB-Streamer.git

# Accéder au répertoire du projet
cd ADB-Streamer

# Installer les dépendances
npm install

# Démarrer l'application en mode développement
npm run dev

# Créer un build pour production
npm run build
```

## Outils externes requis

### ADB et SCRCPY

Pour fonctionner correctement, cette application utilise deux outils externes :

1. **ADB (Android Debug Bridge)** : Outil de ligne de commande permettant de communiquer avec les appareils Android
2. **SCRCPY (Screen Copy)** : Outil permettant la diffusion et le contrôle à distance des écrans d'appareils Android

Les deux outils doivent être installés dans le répertoire `public/scrcpy/` :

1. Téléchargez ADB depuis [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools)
2. Téléchargez SCRCPY depuis [GitHub](https://github.com/Genymobile/scrcpy/releases)
3. Extrayez les fichiers téléchargés
4. Copiez les fichiers nécessaires dans le dossier `public/scrcpy/` :
   - Windows : `adb.exe`, `scrcpy.exe` et toutes les DLL requises
   - macOS/Linux : `adb`, `scrcpy` et les bibliothèques requises

Alternativement, vous pouvez installer SCRCPY globalement via le gestionnaire de paquets de votre système, l'application le détectera automatiquement.

## Utilisation

### Connexion des appareils

1. Connectez votre appareil Android en USB ou via Wi-Fi
2. L'application détectera automatiquement les appareils connectés
3. Pour une connexion sans fil :
   - Connectez d'abord l'appareil en USB
   - Utilisez la fonction "Convertir en TCP/IP" dans l'interface d'administration
   - Une fois connecté en TCP/IP, vous pouvez débrancher le câble USB

### Streaming d'écran

1. Sélectionnez un ou plusieurs appareils dans la liste
2. Cliquez sur le bouton "Stream" dans la barre supérieure
3. Configurez les options de streaming si nécessaire
4. Le streaming démarre dans des fenêtres dédiées

### Raccourcis clavier

- `Échap` : Arrête tous les streams actifs

## Structure du projet

```
├── electron/               # Code Electron (processus principal)
│   ├── main/               # Point d'entrée du processus principal
│   └── preload/            # Scripts de pré-chargement
├── public/                 # Ressources statiques
│   └── scrcpy/             # Binaires ADB et SCRCPY
├── src/                    # Code source de l'application
│   ├── assets/             # Images et ressources
│   ├── components/         # Composants Vue
│   │   ├── admin/          # Composants d'administration
│   │   ├── device/         # Composants de gestion d'appareils
│   │   └── streaming/      # Composants de streaming
│   ├── services/           # Services d'accès aux fonctionnalités
│   │   ├── AdbService.ts   # Service pour ADB
│   │   └── ScrcpyService.ts # Service pour SCRCPY
│   ├── store/              # Gestion d'état
│   └── types/              # Définitions de types TypeScript
└── ...
```

## Technologies utilisées

- **Electron** : Framework pour applications desktop multi-plateformes
- **Vue.js 3** : Framework JavaScript pour l'interface utilisateur
- **TypeScript** : Pour le typage statique du code
- **Vuetify** : Bibliothèque de composants UI
- **Node.js** : Pour l'interaction avec le système d'exploitation

## Développement

### Prérequis

- Node.js 16+
- npm ou yarn
- Git

### Scripts disponibles

- `npm run dev` : Lance l'application en mode développement
- `npm run build` : Crée un build pour production
- `npm run preview` : Prévisualisation du build

## Licence

MIT