/**
 * Money formatting & integer subunit helpers
 * Storage: Strictly integers (e.g. paisas or whole PKR cents)
 * Float operations forbidden in storage and aggregation stages.
 */

/**
 * Formats integer amount to currency string with optional symbol
 */
export const formatMoney = (amountInSubunits, currency = 'PKR', divisor = 100) => {
  if (amountInSubunits === null || amountInSubunits === undefined || isNaN(amountInSubunits)) {
    return 'PKR 0.00';
  }
  const units = Number(amountInSubunits) / divisor;
  return `${currency} ${units.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Converts formatted/user unit string or float to safe integer subunit
 */
export const toSubunits = (units, multiplier = 100) => {
  if (units === null || units === undefined) return 0;
  return Math.round(Number(units) * multiplier);
};
