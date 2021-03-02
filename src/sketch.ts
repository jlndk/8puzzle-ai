import { AStarAI } from './ai/AStarAI';
import p5 from 'p5';
import EightPuzzle from './game/EightPuzzle';
import { AI } from './ai/AI';

export const solvers: { [key: string]: () => AI } = {
    'a*': () => new AStarAI(),
};

export function makeGame(p: p5) {
    let game: EightPuzzle;
    p.setup = () => {
        game = new EightPuzzle(p, 3, 'a*');
        // Enable this if needed for debugging
        // game.putAIOnMainThread();
        game.init();
    };
    p.draw = () => {
        game?.draw();
    };
}
