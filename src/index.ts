import { makeGame } from './sketch';
import p5 from 'p5';

new p5((p: p5) => {
    makeGame(p);
});
