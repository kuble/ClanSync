/**
 * 09-BalanceMaker: 득표수를 가중치로 하여 맵 1개 무작위 확정. 무표는 1:1:1.
 */
export function weightedPickMapIndex(voteCounts: [number, number, number]): number {
  let w0 = voteCounts[0];
  let w1 = voteCounts[1];
  let w2 = voteCounts[2];
  if (w0 + w1 + w2 === 0) {
    w0 = 1;
    w1 = 1;
    w2 = 1;
  }
  const sum = w0 + w1 + w2;
  const r = secureRandomBelow(sum);
  if (r < w0) return 0;
  if (r < w0 + w1) return 1;
  return 2;
}

function secureRandomBelow(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % maxExclusive;
}

export function tallyMapVotes(
  votes: readonly { choice_idx: number }[],
): [number, number, number] {
  const tallies: [number, number, number] = [0, 0, 0];
  for (const v of votes) {
    const i = v.choice_idx;
    if (i === 0) tallies[0] += 1;
    else if (i === 1) tallies[1] += 1;
    else if (i === 2) tallies[2] += 1;
  }
  return tallies;
}
