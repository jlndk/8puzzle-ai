import { expose } from 'comlink';
import { Direction, Tile, Grid } from '../game/Grid';
import { solvers } from '../sketch';

export function calculateMoves(
    solver: keyof typeof solvers,
    size: number,
    tiles: (number | null)[][],
    freeCell: Tile,
    desiredState: (number | null)[][]
): Direction[] {
    const grid = new Grid(size, tiles, freeCell);

    const ai = solvers[solver]();

    return ai.getMoves(grid, desiredState);
}

expose(calculateMoves);
