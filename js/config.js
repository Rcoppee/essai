// Configuration centrale du site.
import { peerberry } from './parsers/peerberry.js';

// Ordre d'affichage dans la barre latérale.
export const CATEGORIES = [
  { id: 'pea', label: 'PEA' },
  { id: 'per', label: 'PER' },
  { id: 'assurance-vie', label: 'Assurance vie' },
  { id: 'cto', label: 'CTO' },
  { id: 'crypto', label: 'Cryptomonnaies' },
  { id: 'p2p', label: 'P2P' },
];

// Plateformes P2P. Pour en ajouter une : créer js/parsers/<nom>.js
// (même contrat que peerberry.js) puis l'ajouter ici.
export const P2P_PLATFORMS = [{ id: 'peerberry', name: 'Peerberry', parser: peerberry }];
