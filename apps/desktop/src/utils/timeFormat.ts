/**
 * Format timestamp to human-readable time label
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string
 */
export function formatTimeLabel(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);

  // 刚刚 (just now) - within 1 minute
  if (minutes < 1) {
    return '刚刚';
  }

  // X分钟前 (X minutes ago) - within 1 hour
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }

  // 今天 (today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (timestamp >= todayStart.getTime()) {
    return '今天';
  }

  // 昨天 (yesterday)
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  if (timestamp >= yesterdayStart.getTime()) {
    return '昨天';
  }

  // 本周 (this week)
  const thisWeekStart = new Date(todayStart);
  const dayOfWeek = thisWeekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  thisWeekStart.setDate(thisWeekStart.getDate() - daysToMonday);
  if (timestamp >= thisWeekStart.getTime()) {
    return '本周';
  }

  // 上周 (last week)
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  if (timestamp >= lastWeekStart.getTime()) {
    return '上周';
  }

  // 上个月 (last month)
  const lastMonthStart = new Date(todayStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  lastMonthStart.setDate(1);
  if (timestamp >= lastMonthStart.getTime()) {
    return '上个月';
  }

  // 具体年月日 (specific date)
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}年${month}月${day}日`;
}
