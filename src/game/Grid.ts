import p5 from 'p5';
import { findIndex2D, range, shuffleArray, to2D, deepCopy } from '../lib/util';

export type Tile = {
    x: number;
    y: number;
};

export enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
}

export class Grid {
    size: number;
    tiles: (number | null)[][];
    freeTile: Tile;

    constructor(size: number, tiles: (number | null)[][], freeTile?: Tile) {
        this.size = size;
        this.tiles = tiles;
        this.freeTile = freeTile ?? this.computeFreeTile();
    }

    copy(): Grid {
        return new Grid(this.size, deepCopy(this.tiles), deepCopy(this.freeTile));
    }

    private swap(c1: Tile, c2: Tile) {
        const tmp = this.tiles[c2.y][c2.x];
        this.tiles[c2.y][c2.x] = this.tiles[c1.y][c1.x];
        this.tiles[c1.y][c1.x] = tmp;
    }

    move(direction: Direction) {
        const vecs: { [key in Direction]: Tile } = {
            [Direction.LEFT]: { x: -1, y: 0 },
            [Direction.RIGHT]: { x: 1, y: 0 },
            [Direction.UP]: { x: 0, y: -1 },
            [Direction.DOWN]: { x: 0, y: 1 },
        };

        const { x, y } = vecs[direction];

        const newFree = { x: this.freeTile.x + x, y: this.freeTile.y + y };

        if (newFree.x < 0 || newFree.x >= this.size || newFree.y < 0 || newFree.y >= this.size) {
            throw new Error('Out of bounds');
        }

        this.swap(this.freeTile, newFree);
        this.freeTile = newFree;
    }

    render(p: p5) {
        p.rectMode(p.CORNER);
        p.textSize(60);
        p.textAlign(p.CENTER, p.CENTER);

        const s = p.width / this.size;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const x = j * s;
                const y = i * s;

                p.fill(0);
                p.stroke(255);
                p.strokeWeight(1);
                p.rect(x, y, s, s);

                p.fill(255);

                p.text(this.tiles[i][j] ?? '', x + s / 2, y + s / 2);
            }
        }
    }

    getValidMoves(): Direction[] {
        const moves = [];
        const end = this.size - 1;

        if (this.freeTile.x !== 0) {
            moves.push(Direction.LEFT);
        }
        if (this.freeTile.x !== end) {
            moves.push(Direction.RIGHT);
        }
        if (this.freeTile.y !== 0) {
            moves.push(Direction.UP);
        }
        if (this.freeTile.y !== end) {
            moves.push(Direction.DOWN);
        }
        return moves;
    }

    static generate(size: number): { grid: Grid; desiredState: (number | null)[][] } {
        if (size < 2) {
            throw new Error('Grid size cannot be smaller than 2');
        }

        // Generate array from 0 to size*size (exclusive)
        const numbers: (number | null)[] = range(size * size);
        // Set last tile as empty
        numbers[numbers.length - 1] = null;

        // Make a shuffled copy!
        const shuffled = shuffleArray(numbers);

        // Convert 1D array into 2D
        const tiles = to2D(shuffled, size);
        const desiredState = to2D(numbers, size);

        return {
            grid: new Grid(size, tiles),
            desiredState,
        };
    }

    private computeFreeTile(): Tile {
        const freeCell = findIndex2D(this.tiles, null);

        if (!freeCell) {
            throw new Error('No free cell was computed');
        }

        const [x, y] = freeCell;

        return { x, y };
    }
}
