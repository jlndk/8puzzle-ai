export function shuffleArray<T>(array: T[]): T[] {
    const buf = [...array];
    for (let i = buf.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [buf[i], buf[j]] = [buf[j], buf[i]];
    }
    return buf;
}

export function findIndex2D<T>(arr: T[][], val: T): [number, number] | undefined {
    for (let y = 0; y < arr.length; y++) {
        const row = arr[y];
        for (let x = 0; x < row.length; x++) {
            const item = row[x];
            if (item === val) {
                return [x, y];
            }
        }
    }
}

export function to2D<T>(src: T[], size: number): T[][] {
    const dst: T[][] = [];
    for (let i = 0; i < size; i++) {
        dst[i] = [];
        for (let j = 0; j < size; j++) {
            const n = src.shift();
            if (n === undefined) {
                throw new Error(`Not enough numbers in src to convert into 2d array with size ${size}`);
            }
            dst[i][j] = n;
        }
    }

    return dst;
}

export function range(size: number): number[] {
    const numbers = [];
    for (let i = 0; i < size; i++) {
        numbers.push(i + 1);
    }
    return numbers;
}

export function sum<T>(arr: T[], map: (item: T, i: number) => number): number {
    return arr.reduce<number>((sum, val, i) => sum + map(val, i), 0);
}

export function sum2D<T>(outer: T[][], map: (item: T, i: number, j: number) => number): number {
    return sum(outer, (inner, i) => {
        return sum(inner, (cell, j) => map(cell, i, j));
    });
}

export function factorial(n: number): number {
    return n < 2 ? 1 : n * factorial(n - 1);
}

export function formatNumber(number: number): string {
    const formatter = new Intl.NumberFormat('da', { maximumSignificantDigits: 3 });
    return formatter.format(number);
}

export const toMb = (n: number) => (n / (1024 * 1024)).toFixed(2) + 'MB';

export function sizeOf(obj: any): number {
    const typeSizes: { [key: string]: (item: any) => number } = {
        undefined: () => 0,
        boolean: () => 4,
        number: () => 8,
        string: (item: string) => 2 * item.length,
        object: (item: object) => {
            if (!item) return 0;
            return sum<string>(Object.keys(item), (key) => size(key) + size(item[key as keyof typeof item]));
        },
    };

    const size = (value: any): any => typeSizes[typeof value](value);
    return size(obj);
}

export function isRunningAsWorker(): boolean {
    // https://stackoverflow.com/a/18002694/2534355
    return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
}

export function deepCopy<T>(item: T): T {
    return JSON.parse(JSON.stringify(item));
}
