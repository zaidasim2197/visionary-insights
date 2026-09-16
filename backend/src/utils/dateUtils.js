/**
 * Date & Timezone utilities for Sales & Operations Dashboard
 * Default timezone: Asia/Karachi (PKT, UTC+5)
 * All timestamps stored in MongoDB as UTC native Dates.
 */

const PKT_OFFSET_HOURS = 5;

/**
 * Converts a date string (YYYY-MM-DD) in PKT to UTC Start of Day Date object
 */
export const pktStartOfDayToUtc = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  // Midnight PKT (00:00:00 PKT) is 19:00:00 UTC previous day
  return new Date(Date.UTC(year, month - 1, day, 0 - PKT_OFFSET_HOURS, 0, 0, 0));
};

/**
 * Converts a date string (YYYY-MM-DD) in PKT to UTC End of Day Date object
 */
export const pktEndOfDayToUtc = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  // End of day PKT (23:59:59.999 PKT) is 18:59:59.999 UTC
  return new Date(Date.UTC(year, month - 1, day, 23 - PKT_OFFSET_HOURS, 59, 59, 999));
};

/**
 * Returns current date/time in PKT as a plain object
 */
export const getNowPkt = () => {
  const nowUtc = new Date();
  const pktMs = nowUtc.getTime() + PKT_OFFSET_HOURS * 3600 * 1000;
  return new Date(pktMs);
};

/**
 * Resolves date range preset into inclusive UTC { fromDate, toDate }
 * Presets: 'today', 'week', 'month' (default), 'quarter', 'year', 'custom'
 */
export const resolveDateRange = ({ preset = 'month', from = null, to = null } = {}) => {
  const nowPkt = getNowPkt();
  const currentYear = nowPkt.getUTCFullYear();
  const currentMonth = nowPkt.getUTCMonth(); // 0-indexed
  const currentDate = nowPkt.getUTCDate();
  const currentDay = nowPkt.getUTCDay(); // 0 is Sunday, 1 is Monday

  let fromDate = null;
  let toDate = null;

  if (from && to) {
    fromDate = typeof from === 'string' && from.includes('T') ? new Date(from) : pktStartOfDayToUtc(from);
    toDate = typeof to === 'string' && to.includes('T') ? new Date(to) : pktEndOfDayToUtc(to);
    return { fromDate, toDate, preset: 'custom' };
  }

  const p = preset?.toLowerCase() || 'month';

  switch (p) {
    case 'today': {
      const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
      fromDate = pktStartOfDayToUtc(todayStr);
      toDate = pktEndOfDayToUtc(todayStr);
      break;
    }
    case 'week': {
      // Monday to Sunday in PKT
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const mondayPkt = new Date(Date.UTC(currentYear, currentMonth, currentDate + diffToMonday));
      const sundayPkt = new Date(Date.UTC(mondayPkt.getUTCFullYear(), mondayPkt.getUTCMonth(), mondayPkt.getUTCDate() + 6));
      
      const monStr = `${mondayPkt.getUTCFullYear()}-${String(mondayPkt.getUTCMonth() + 1).padStart(2, '0')}-${String(mondayPkt.getUTCDate()).padStart(2, '0')}`;
      const sunStr = `${sundayPkt.getUTCFullYear()}-${String(sundayPkt.getUTCMonth() + 1).padStart(2, '0')}-${String(sundayPkt.getUTCDate()).padStart(2, '0')}`;
      fromDate = pktStartOfDayToUtc(monStr);
      toDate = pktEndOfDayToUtc(sunStr);
      break;
    }
    case 'month': {
      // Start of current month to end of current month
      const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
      const endStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      fromDate = pktStartOfDayToUtc(startStr);
      toDate = pktEndOfDayToUtc(endStr);
      break;
    }
    case 'quarter': {
      const qStartMonth = Math.floor(currentMonth / 3) * 3;
      const startStr = `${currentYear}-${String(qStartMonth + 1).padStart(2, '0')}-01`;
      const qEndMonth = qStartMonth + 2;
      const lastDayOfQ = new Date(Date.UTC(currentYear, qEndMonth + 1, 0)).getUTCDate();
      const endStr = `${currentYear}-${String(qEndMonth + 1).padStart(2, '0')}-${String(lastDayOfQ).padStart(2, '0')}`;
      fromDate = pktStartOfDayToUtc(startStr);
      toDate = pktEndOfDayToUtc(endStr);
      break;
    }
    case 'year': {
      const startStr = `${currentYear}-01-01`;
      const endStr = `${currentYear}-12-31`;
      fromDate = pktStartOfDayToUtc(startStr);
      toDate = pktEndOfDayToUtc(endStr);
      break;
    }
    default: {
      // Default to current month
      const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
      const endStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      fromDate = pktStartOfDayToUtc(startStr);
      toDate = pktEndOfDayToUtc(endStr);
      break;
    }
  }

  return { fromDate, toDate, preset: p };
};

/**
 * Calculates previous period of equal length for period-over-period growth comparison
 */
export const getPreviousPeriod = (fromDate, toDate) => {
  const durationMs = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime() - 1);
  const prevFromDate = new Date(prevToDate.getTime() - durationMs);
  return { prevFromDate, prevToDate };
};

/**
 * MongoDB $match stage fragment for date range on a specified field
 */
export const dateRangeFilter = (field, fromDate, toDate) => {
  if (!fromDate && !toDate) return {};
  const range = {};
  if (fromDate) range.$gte = fromDate;
  if (toDate) range.$lte = toDate;
  return { [field]: range };
};

/**
 * Common order cancellation exclusion filters
 */
export const excludeCancelled = { status: { $ne: 'Cancelled' } };
export const excludeCancelledAndReturned = { status: { $nin: ['Cancelled', 'Returned'] } };
