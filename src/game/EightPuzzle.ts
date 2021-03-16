import p5 from 'p5';
import { Grid, Direction } from './Grid';
import { wrap } from 'comlink';
import { calculateMoves } from '../ai/worker';
import { formatNumber, toMb } from '../lib/util';
import { solvers } from '../sketch';

export type Status = {
    cmd: 'ai_progress';
    percent: number;
    status?: string;
    memory?: number;
};

type Solver = keyof typeof solvers;

export default class EightPuzzle {
    size: number;

    p: p5;
    grid: Grid;
    aiType: Solver;

    desiredState: (number | null)[][];
    moves: Direction[] | undefined;
    currentMove = 0;
    done = false;
    errorMsg: string | undefined;

    status: Status | undefined;

    aiAsWorker = true;

    constructor(p: p5, size: number, aiType: Solver) {
        this.size = size;
        this.p = p;
        this.aiType = aiType;

        this.p.createCanvas(600, 600);

        this.createResetButton();

        this.p.background(0);
        this.drawStatusCenter('Initializing...');

        const { grid, desiredState } = Grid.generate(this.size);

        this.grid = grid;
        this.desiredState = desiredState;

        this.p.frameRate(5);
    }

    init(): void {
        this.calculateMoves().catch((err) => {
            this.errorMsg = err;
            this.moves = [];
            this.p.noLoop();
            console.error(err);
        });
    }

    reset(): void {
        this.p.background(0);
        this.drawStatusCenter('Resetting...');

        this.moves = undefined;
        this.currentMove = 0;
        this.done = false;
        this.errorMsg = undefined;
        this.status = undefined;

        const { grid, desiredState } = Grid.generate(this.size);

        this.grid = grid;
        this.desiredState = desiredState;

        this.init();
        this.p.loop();
    }

    putAIOnMainThread(): void {
        this.aiAsWorker = false;
    }

    private async calculateMoves(): Promise<void> {
        if (this.aiAsWorker) {
            return this.calculateMovesWithWorker();
        }

        // Wrap in a promise to match signature of worker
        return new Promise((res) => {
            const factory = solvers[this.aiType];
            const ai = factory();
            this.moves = ai.getMoves(this.grid.copy(), this.desiredState);
            res();
        });
    }

    private async calculateMovesWithWorker() {
        const worker = new Worker('../ai/worker.ts');
        worker.onmessage = ({ data }) => {
            if (data.cmd === 'ai_progress') {
                this.status = data;
            }
        };
        const action = wrap<typeof calculateMoves>(worker);

        this.moves = await action(this.aiType, this.size, this.grid.tiles, this.grid.freeTile, this.desiredState);

        worker.terminate();
    }

    private createResetButton(): void {
        const button = this.p.createButton('reset');
        button.addClass('canvasButton');
        // button.size(50, 30);

        const buttonSize = button.size() as { width: number; height: number };

        button.position(this.p.width - buttonSize.width - 10, this.p.height - buttonSize.height - 10);
        button.mousePressed(() => this.reset());
    }

    update() {
        if (!this.moves) {
            return;
        }

        if (this.currentMove > this.moves.length - 1) {
            this.done = true;
            return;
        }

        this.grid.move(this.moves[this.currentMove++]);
    }

    draw() {
        this.p.background(0);

        if (this.moves === undefined) {
            this.drawProgress();
            return;
        }

        if (this.errorMsg) {
            this.grid.render(this.p);
            this.drawStatusSmall(this.errorMsg);
            return;
        }

        this.update();
        this.grid.render(this.p);

        if (this.done) {
            this.drawStatusSmall(`Solved in ${this.moves.length} steps! `);
            this.p.noLoop();
        } else {
            this.drawStatusSmall(`Move ${this.currentMove} of ${this.moves.length}`);
        }
    }

    drawStatusSmall(status: string): void {
        this.p.textSize(16);
        this.p.textAlign(this.p.LEFT, this.p.TOP);
        this.p.fill(255);
        this.p.text(status, 10, 10, this.p.width - 20, this.p.height - 20);
    }

    drawStatusCenter(status: string): void {
        this.p.textSize(30);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(255);
        this.p.text(status, this.p.width / 2, this.p.height / 2);
    }

    drawProgress(): void {
        const titleText = 'Searching for solution...';
        if (this.status === undefined) {
            this.drawStatusCenter(titleText);
            return;
        }

        // Get metrics and calculate percentage
        const { percent, memory, status } = this.status;

        const centerX = this.p.width / 2;
        const centerY = this.p.height / 2;

        const titleX = centerX;
        const titleY = centerY - 30;
        this.p.textSize(30);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(255);
        this.p.text(titleText, titleX, titleY);

        const progWidth = this.p.width / 3;
        const progHeight = 20;
        const progX = centerX - progWidth / 2;
        const progY = titleY + 20;

        this.p.fill(0);
        this.p.stroke(255);
        this.p.strokeWeight(1);
        this.p.rect(progX, progY, progWidth, progHeight);

        this.p.fill(255);
        this.p.strokeWeight(0);
        this.p.rect(progX, progY, progWidth * (percent / 100), progHeight);

        this.p.textSize(16);
        this.p.text(`${formatNumber(percent)}% ${status ?? ''}`, centerX, progY + progHeight + 20);

        if (memory !== undefined) {
            const lbl = `Memory usage: ${toMb(memory)}`;

            this.p.textAlign(this.p.LEFT, this.p.BOTTOM);
            this.p.text(lbl, 10, this.p.height - 5);
        }
        // this.drawStatus(msg);
    }
}
