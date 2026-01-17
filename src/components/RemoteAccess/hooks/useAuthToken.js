/**
 * useAuthToken Hook
 * Manages authentication token generation and validation
 */

import { useState, useCallback } from 'react';
import { requestWorker } from '../../../services/bridge';
import PermissionService from '../../../services/permission_service';

export const useAuthToken = (status, loadStatus, language) => {
  const [currentToken, setCurrentToken] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenType, setTokenType] = useState('auto');
  const [customToken, setCustomToken] = useState('');
  const [customTokenStrength, setCustomTokenStrength] = useState(null);
  const [validatingCustomToken, setValidatingCustomToken] = useState(false);

  const ensureRemoteAccessPermission = useCallback(async (actionLabel) => {
    const hasPermission = await PermissionService.hasPermission('RemoteAccess');
    if (hasPermission) {
      return true;
    }
    const result = await PermissionService.requestPermission(
      'RemoteAccess',
      actionLabel,
      language === 'fr' ? 'Acces distant' : 'Remote access'
    );
    return result === true;
  }, [language]);


  const generateToken = useCallback(async () => {
    setGeneratingToken(true);

    try {
      const allowed = await ensureRemoteAccessPermission(
        language === 'fr' ? "Generer un token d'acces" : 'Generate access token'
      );
      if (!allowed) {
        throw new Error(language === 'fr' ? 'Permission RemoteAccess requise' : 'RemoteAccess permission required');
      }
      const result = await requestWorker("tunnel_generate_token", { expires_hours: 24 });
      if (result?.token) {
        setCurrentToken(result);
        setShowToken(true);
        await loadStatus();
      }
    } catch (err) {
      throw new Error(language === 'fr' ? 'Erreur lors de la génération du token' : 'Error generating token');
    } finally {
      setGeneratingToken(false);
    }
  }, [ensureRemoteAccessPermission, loadStatus, language]);

  // Simplified token workflow - validate and apply in one step
  const validateAndApplyCustomToken = useCallback(async () => {
    if (!String(customToken || '').trim()) {
      throw new Error(language === 'fr' ? 'Veuillez entrer un token personnalisé' : 'Please enter a custom token');
    }

    if (customToken.length < 8) {
      throw new Error(language === 'fr' ? 'Le token doit faire au moins 8 caractères' : 'Token must be at least 8 characters');
    }

    try {
      const allowed = await ensureRemoteAccessPermission(
        language === 'fr' ? 'Appliquer un token personnalise' : 'Apply custom token'
      );
      if (!allowed) {
        throw new Error(language === 'fr' ? 'Permission RemoteAccess requise' : 'RemoteAccess permission required');
      }
      setValidatingCustomToken(true);
      setCustomTokenStrength(null);

      // Validate token first
      const validationResult = await requestWorker("tunnel_validate_custom_token", {
        token: customToken
      });

      if (!validationResult?.valid) {
        setCustomTokenStrength('invalid');
        throw new Error(validationResult?.error ||
          (language === 'fr' ? 'Token invalide. Utilisez des caractères alphanumériques et des symboles' : 'Invalid token. Use alphanumeric characters and symbols'));
      }

      // Token is valid, now apply it
      setCustomTokenStrength(validationResult.strength);

      const applyResult = await requestWorker("tunnel_set_custom_token", {
        token: customToken
      });

      if (!applyResult?.success) {
        throw new Error(applyResult?.error || (language === 'fr' ? 'Erreur lors de l\'application du token' : 'Error applying token'));
      }

      // Success - set the token
      setCurrentToken({
        token: customToken,
        expires_hours: 24
      });
      setShowToken(true);
      setTokenType('auto');
      setCustomToken('');
      setCustomTokenStrength(null);
      await loadStatus();

      return { success: true, message: language === 'fr' ? 'Token personnalisé appliqué avec succès !' : 'Custom token applied successfully!' };
    } catch (err) {
      setCustomTokenStrength('invalid');
      throw err;
    } finally {
      setValidatingCustomToken(false);
    }
  }, [customToken, ensureRemoteAccessPermission, loadStatus, language]);

  return {
    currentToken,
    showToken,
    generatingToken,
    tokenType,
    customToken,
    customTokenStrength,
    validatingCustomToken,
    setShowToken,
    setTokenType,
    setCustomToken,
    generateToken,
    validateAndApplyCustomToken
  };
};
