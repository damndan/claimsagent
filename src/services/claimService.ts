import { Claim } from '../types/claim';

const CLAIMS_STORAGE_KEY = 'claims';

export const claimService = {
  getAllClaims: (): Claim[] => {
    const claimsJson = localStorage.getItem(CLAIMS_STORAGE_KEY);
    return claimsJson ? JSON.parse(claimsJson) : [];
  },

  saveClaim: (claim: Claim): void => {
    const claims = claimService.getAllClaims();
    const existingIndex = claims.findIndex(c => c.id === claim.id);
    
    if (existingIndex >= 0) {
      claims[existingIndex] = claim;
    } else {
      claims.push(claim);
    }
    
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims));
  },

  deleteClaim: (id: string): void => {
    const claims = claimService.getAllClaims();
    const filteredClaims = claims.filter(claim => claim.id !== id);
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(filteredClaims));
  },

  getClaimById: (id: string): Claim | undefined => {
    const claims = claimService.getAllClaims();
    return claims.find(claim => claim.id === id);
  }
}; 