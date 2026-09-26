export function decideExit({ vault, currentPrice }) {
  if (vault.position !== 1) return { action: "HOLD", reason: "Vault has no long position" };
  if (vault.entryPrice > 0n && BigInt(currentPrice) >= vault.entryPrice) return { action: "CLOSE", reason: "Exit price condition is met" };
  return { action: "HOLD", reason: "Position remains below exit threshold" };
}
