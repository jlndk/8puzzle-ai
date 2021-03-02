import PriorityQueue from 'ts-priority-queue';
import { AI } from './AI';
import { Grid, Direction } from '../game/Grid';
import { findIndex2D, sum2D, factorial, sizeOf, formatNumber, isRunningAsWorker } from '../lib/util';
import { Status } from '../game/EightPuzzle';

export class AStarAI implements AI {
    explored = new StateSet();
    pq = new PriorityQueue<SearchNode>({
        comparator: (a, b) => a.cost() - b.cost(),
    });
    searchSpace = 0;
    gridMemSize = 0;

    getMoves(grid: Grid, desiredState: (number | null)[][]): Direction[] {
        // Calculate constants, for use in progress status
        this.calculateProgressConstants(grid);

        // Put initial state on queue
        this.pq.queue(new SearchNode(grid, desiredState));

        // Keep counter to decide when to report status
        let i = 1;

        while (this.pq.length !== 0) {
            const node = this.pq.dequeue();

            // Goal test
            if (node.hasSolution()) {
                console.debug(`Found solution! Explored ${formatNumber(this.explored.size)} nodes.`);
                return node.actions;
            }

            // Report status to user, but only sometimes. Tradeoff between fast status updates and performance
            if (i % 30000 == 0) {
                this.reportProgress();
            }

            this.explored.add(node);

            for (const move of node.moves()) {
                const copy = node.copy();

                copy.move(move);

                if (!this.explored.has(copy)) {
                    this.pq.queue(copy);
                }
            }
            i++;
        }

        const searchedPct = (this.explored.size / this.searchSpace) * 100;
        throw new Error(
            `Could not find a solution.\nExplored ${formatNumber(searchedPct)}% of search space (${formatNumber(
                this.explored.size
            )} of ${formatNumber(this.searchSpace)} permutations)`
        );
    }

    private calculateProgressConstants(grid: Grid): void {
        // The theoretical bound of search space
        this.searchSpace = factorial(grid.size * grid.size) / 2;
        this.gridMemSize = sizeOf(grid);
    }

    private reportProgress() {
        if (!isRunningAsWorker()) {
            return;
        }
        const exploredMemSize = this.gridMemSize * this.explored.size;
        const pqMemSize = this.gridMemSize * this.pq.length;
        const currentExplored = this.explored.size;
        const progress = currentExplored / this.searchSpace;
        const percent = progress * 100;
        const status = `(${formatNumber(currentExplored)} of ${formatNumber(this.searchSpace)} nodes explored)`;
        self.postMessage({
            cmd: 'ai_progress',
            percent,
            memory: exploredMemSize + pqMemSize,
            status,
        } as Status);
    }
}

/**
 * Simple wrapper around set, which handles comparison between search nodes (thus handling reference equality)
 */
class StateSet {
    private set = new Set<string>();

    add(node: SearchNode): void {
        // Stringify state to use value equality instead of reference equality
        this.set.add(JSON.stringify(node.getState()));
    }

    has(node: SearchNode): boolean {
        return this.set.has(JSON.stringify(node.getState()));
    }

    get size(): number {
        return this.set.size;
    }

    get items(): string[] {
        return Array.from(this.set.values());
    }
}

class SearchNode {
    grid: Grid;
    actions: Direction[];
    _manhattanDistanceCache: number | undefined;
    desiredState: (number | null)[][];

    constructor(grid: Grid, desiredState: (number | null)[][], previousActions: Direction[] = []) {
        this.grid = grid;
        this.desiredState = desiredState;
        this.actions = previousActions;
    }

    move(action: Direction) {
        // Invalidate manhattanDistanceCache, since it should update after a move
        this._manhattanDistanceCache = undefined;

        this.grid.move(action);
        this.actions.push(action);
    }

    hasSolution(): boolean {
        return JSON.stringify(this.grid.tiles) == JSON.stringify(this.desiredState);
    }

    cost(): number {
        return this.actions.length + this.heuristic();
    }

    heuristic(): number {
        return this.totalManhattanDistance();
    }

    totalManhattanDistance(): number {
        if (this._manhattanDistanceCache) {
            return this._manhattanDistanceCache;
        }

        const total = sum2D(this.grid.tiles, (cell, i, j) => {
            const res = findIndex2D(this.desiredState, cell);

            if (!res) {
                const errLabel = cell === null ? '_EMPTY_' : cell;
                throw new Error(`Could not find desired state for item ${errLabel}`);
            }

            const [x, y] = res;

            return Math.abs(i - y) + Math.abs(j - x);
        });

        this._manhattanDistanceCache = total;

        return total;
    }

    getState(): (number | null)[][] {
        return this.grid.tiles;
    }

    moves(): Direction[] {
        return this.grid.getValidMoves();
    }

    copy(): SearchNode {
        return new SearchNode(this.grid.copy(), this.desiredState, [...this.actions]);
    }
}
