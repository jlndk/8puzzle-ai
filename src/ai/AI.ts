import { Direction, Grid } from '../game/Grid';
export interface AI {
    getMoves(grid: Grid, desiredState: (number | null)[][]): Direction[];
}
