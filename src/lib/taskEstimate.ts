export function taskEstimateTotal(savedSeconds: number, activeSeconds = 0) {
  return Math.max(0, savedSeconds) + Math.max(0, activeSeconds);
}
export function exceedsEstimate(seconds: number, minutes: number | null) {
  return !!minutes && minutes > 0 && seconds > minutes * 60;
}