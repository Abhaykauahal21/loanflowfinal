/**
 * Decode JWT token without verification (client-side only)
 * Note: This doesn't verify the signature, only decodes the payload
 */
export function decodeJWT(token) {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token) {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  
  // Add 5 minute buffer to account for clock skew
  return currentTime >= (expirationTime - 5 * 60 * 1000);
}

/**
 * Get user info from JWT token
 */
export function getUserFromToken(token) {
  const decoded = decodeJWT(token);
  if (!decoded) return null;
  
  return {
    id: decoded.id,
    _id: decoded.id,
    role: decoded.role,
    // Note: email and name are not in the token, will be fetched from server
  };
}

