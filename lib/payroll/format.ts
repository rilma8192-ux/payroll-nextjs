export function won(x: number): string {
  return `${Math.round(x).toLocaleString("ko-KR")}원`;
}

export function pct(x: number | null): string {
  if (x === null) return "N/A";
  return `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`;
}
