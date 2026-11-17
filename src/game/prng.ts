export class SeededRNG {
  private state: number;

  constructor(seedStr: string) {
    let h = 2166136261 >>> 0;
    const str = seedStr.trim() || 'VAELIS-666';
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    this.state = h >>> 0 || 123456789;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  chance(prob: number): boolean {
    return this.next() < prob;
  }

  pick<T>(arr: readonly T[] | T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
