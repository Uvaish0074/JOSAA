export const OPEN_MAP: Record<number, number> = {
  1: 332, 18: 310, 101: 278, 201: 262, 301: 249, 401: 241, 501: 234, 
  601: 228, 701: 222, 801: 217, 901: 212, 1001: 208, 1101: 205, 1201: 201, 
  1301: 199, 1401: 196, 1501: 193, 1601: 191, 1701: 188, 1801: 186, 
  1901: 184, 2001: 181, 2501: 172, 3001: 165, 3501: 159, 4001: 154, 
  4501: 149, 5001: 145, 5501: 142, 6001: 138, 6501: 136, 7001: 133, 
  7501: 130, 8001: 128, 8501: 126, 9001: 124, 9501: 122, 10001: 120, 
  10501: 118, 11001: 116, 11501: 114, 12001: 113, 12501: 111, 13001: 110, 
  13501: 108, 14001: 107, 14501: 106, 15001: 104, 15501: 103, 16001: 102, 
  16501: 101, 17001: 100, 17501: 99, 18001: 98, 18501: 97, 19001: 96, 
  19501: 95, 20001: 94, 20501: 93, 21001: 92, 21501: 91, 22001: 90, 
  22501: 89, 23001: 89, 23501: 88, 24001: 87, 24501: 86, 25001: 85, 
  25501: 85, 26001: 84, 26501: 83, 27001: 82, 27501: 82, 28001: 81, 
  28501: 80, 29001: 80, 29501: 79, 30001: 78, 30801: 77, 31000: 76
};

export const OBC_MAP: Record<number, number> = {
  1: 310, 101: 225, 201: 201, 301: 188, 401: 176, 501: 169, 601: 162, 701: 156,
  801: 152, 901: 148, 1001: 144, 1101: 141, 1201: 139, 1301: 137, 1401: 134,
  1501: 132, 1601: 130, 1701: 128, 1801: 127, 1901: 125, 2001: 124, 2101: 122,
  2201: 121, 2301: 119, 2401: 118, 2501: 117, 2601: 116, 2701: 114, 2801: 113,
  2901: 112, 3001: 111, 3101: 110, 3201: 109, 3301: 108, 3401: 107, 3501: 106,
  4001: 102, 5001: 96, 6001: 90, 7001: 85, 8001: 80, 9001: 77, 10001: 73,
  11001: 70, 12001: 67, 12635: 66
};

export const EWS_MAP: Record<number, number> = {
  1: 309, 101: 199, 201: 178, 301: 163, 401: 154, 501: 147,
  601: 141, 701: 137, 801: 132, 901: 129, 1001: 126, 1101: 123,
  1201: 120, 1301: 118, 1401: 116, 1501: 113, 1601: 112, 1701: 110,
  1801: 108, 1901: 106, 2001: 104, 2101: 103, 2201: 101, 2301: 100,
  2401: 99, 2501: 97, 2601: 96, 2701: 95, 2801: 94, 2901: 92,
  3001: 91, 3501: 87, 4001: 82, 4501: 78, 5001: 75, 5501: 71, 
  6001: 68, 6430: 66
};

export function getMapping(category: string): Record<number, number> {
  if (category === "OBC-NCL") return OBC_MAP;
  if (category === "EWS") return EWS_MAP;
  return OPEN_MAP;
}

export function estimateMarks(rank: number, category: string): number {
  const mapping = getMapping(category);
  const ranks = Object.keys(mapping).map(Number).sort((a, b) => a - b);
  
  if (rank <= ranks[0]) return mapping[ranks[0]];
  if (rank >= ranks[ranks.length - 1]) return mapping[ranks[ranks.length - 1]];
  
  for (let i = 0; i < ranks.length - 1; i++) {
    if (ranks[i] <= rank && rank <= ranks[i + 1]) {
      const r1 = ranks[i];
      const r2 = ranks[i + 1];
      const m1 = mapping[r1];
      const m2 = mapping[r2];
      const marks = m1 + (m2 - m1) * ((rank - r1) / (r2 - r1));
      return Math.round(marks);
    }
  }
  return 0;
}

export function estimateRank(marks: number, category: string): number {
  const mapping = getMapping(category);
  const ranks = Object.keys(mapping).map(Number).sort((a, b) => a - b);
  
  if (marks >= mapping[ranks[0]]) return ranks[0];
  if (marks <= mapping[ranks[ranks.length - 1]]) return ranks[ranks.length - 1];
  
  for (let i = 0; i < ranks.length - 1; i++) {
    const r1 = ranks[i];
    const r2 = ranks[i + 1];
    const m1 = mapping[r1];
    const m2 = mapping[r2];
    
    // Marks decrease as rank increases
    if (m1 >= marks && marks >= m2) {
      if (m1 === m2) return r1;
      const rank = r1 + (r2 - r1) * ((m1 - marks) / (m1 - m2));
      return Math.round(rank);
    }
  }
  return ranks[ranks.length - 1];
}
