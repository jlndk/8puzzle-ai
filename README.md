# 8-Puzzle AI
> An implementation of the 8-puzzle game and an AI for solving it.

Demo: [link](https://jlndk.github.io/8puzzle-ai)

## Setup on your local machine
### Requirements
* Node.JS
* Yarn 1.x

### Installation
1. Clone the repo
2. Open a terminal in the cloned folder and run `yarn`
3. Start the application by running `yarn dev`.
4. The application can now be accessed on `http://localhost:1234`

## Adding your own AI
Each AI solver must implement the `AI` interface (`src/ai/AI.ts`).

To test the AI, add it to the object in `src/sketch.ts`, with an appropiate name.
```ts
export const solvers: { [key: string]: () => AI } = {
    'a*': () => new AStarAI(),
    'yourOwnAI': => () => new YourOwnAI(),
};
```
Afterward, select the AI which should be used for solving in the constructor of the `EightPuzzle`
```ts
...
p.setup = () => {
        game = new EightPuzzle(p, 3, 'yourOwnAI');
...
```
It is also possible to change the size of the board if you feel like a 3x3 grid is too easy.
