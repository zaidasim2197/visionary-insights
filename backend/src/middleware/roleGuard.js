import { ApiError } from './errorHandler.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', `You do not have permission to perform this action. Required role: ${allowedRoles.join(' or ')}.`));
    }

    next();
  };
};

/**
 * Section 6: Viewer Redaction Interceptor
 * Server-side projection sanitization: When role is Viewer, strip customer names, emails and unit costs.
 */
export const redactViewerData = (data, role) => {
  if (role !== 'Viewer' || !data) return data;

  const redactObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(redactObject);

    const copy = { ...obj };

    // Strip sensitive fields
    if ('customerName' in copy) copy.customerName = '[REDACTED]';
    if ('customerEmail' in copy) copy.customerEmail = '[REDACTED]';
    if ('name' in copy && ('customerCode' in copy || 'customerType' in copy)) copy.name = '[REDACTED]';
    if ('email' in copy && ('customerCode' in copy || 'customerType' in copy)) copy.email = '[REDACTED]';
    if ('unitCost' in copy) delete copy.unitCost;
    if ('unitCostAtSale' in copy) delete copy.unitCostAtSale;

    // Recursively redact nested objects
    Object.keys(copy).forEach((key) => {
      if (typeof copy[key] === 'object' && copy[key] !== null) {
        copy[key] = redactObject(copy[key]);
      }
    });

    return copy;
  };

  return redactObject(data);
};
