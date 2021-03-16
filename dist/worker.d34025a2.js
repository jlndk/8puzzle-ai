// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"node_modules/comlink/dist/esm/comlink.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.expose = expose;
exports.proxy = proxy;
exports.transfer = transfer;
exports.windowEndpoint = windowEndpoint;
exports.wrap = wrap;
exports.transferHandlers = exports.releaseProxy = exports.proxyMarker = exports.createEndpoint = void 0;

/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const proxyMarker = Symbol("Comlink.proxy");
exports.proxyMarker = proxyMarker;
const createEndpoint = Symbol("Comlink.endpoint");
exports.createEndpoint = createEndpoint;
const releaseProxy = Symbol("Comlink.releaseProxy");
exports.releaseProxy = releaseProxy;
const throwMarker = Symbol("Comlink.thrown");

const isObject = val => typeof val === "object" && val !== null || typeof val === "function";
/**
 * Internal transfer handle to handle objects marked to proxy.
 */


const proxyTransferHandler = {
  canHandle: val => isObject(val) && val[proxyMarker],

  serialize(obj) {
    const {
      port1,
      port2
    } = new MessageChannel();
    expose(obj, port1);
    return [port2, [port2]];
  },

  deserialize(port) {
    port.start();
    return wrap(port);
  }

};
/**
 * Internal transfer handler to handle thrown exceptions.
 */

const throwTransferHandler = {
  canHandle: value => isObject(value) && throwMarker in value,

  serialize({
    value
  }) {
    let serialized;

    if (value instanceof Error) {
      serialized = {
        isError: true,
        value: {
          message: value.message,
          name: value.name,
          stack: value.stack
        }
      };
    } else {
      serialized = {
        isError: false,
        value
      };
    }

    return [serialized, []];
  },

  deserialize(serialized) {
    if (serialized.isError) {
      throw Object.assign(new Error(serialized.value.message), serialized.value);
    }

    throw serialized.value;
  }

};
/**
 * Allows customizing the serialization of certain values.
 */

const transferHandlers = new Map([["proxy", proxyTransferHandler], ["throw", throwTransferHandler]]);
exports.transferHandlers = transferHandlers;

function expose(obj, ep = self) {
  ep.addEventListener("message", function callback(ev) {
    if (!ev || !ev.data) {
      return;
    }

    const {
      id,
      type,
      path
    } = Object.assign({
      path: []
    }, ev.data);
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;

    try {
      const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
      const rawValue = path.reduce((obj, prop) => obj[prop], obj);

      switch (type) {
        case 0
        /* GET */
        :
          {
            returnValue = rawValue;
          }
          break;

        case 1
        /* SET */
        :
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;

        case 2
        /* APPLY */
        :
          {
            returnValue = rawValue.apply(parent, argumentList);
          }
          break;

        case 3
        /* CONSTRUCT */
        :
          {
            const value = new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;

        case 4
        /* ENDPOINT */
        :
          {
            const {
              port1,
              port2
            } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
          }
          break;

        case 5
        /* RELEASE */
        :
          {
            returnValue = undefined;
          }
          break;
      }
    } catch (value) {
      returnValue = {
        value,
        [throwMarker]: 0
      };
    }

    Promise.resolve(returnValue).catch(value => {
      return {
        value,
        [throwMarker]: 0
      };
    }).then(returnValue => {
      const [wireValue, transferables] = toWireValue(returnValue);
      ep.postMessage(Object.assign(Object.assign({}, wireValue), {
        id
      }), transferables);

      if (type === 5
      /* RELEASE */
      ) {
          // detach and deactive after sending release response above.
          ep.removeEventListener("message", callback);
          closeEndPoint(ep);
        }
    });
  });

  if (ep.start) {
    ep.start();
  }
}

function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}

function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint)) endpoint.close();
}

function wrap(ep, target) {
  return createProxy(ep, [], target);
}

function throwIfProxyReleased(isReleased) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}

function createProxy(ep, path = [], target = function () {}) {
  let isProxyReleased = false;
  const proxy = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);

      if (prop === releaseProxy) {
        return () => {
          return requestResponseMessage(ep, {
            type: 5
            /* RELEASE */
            ,
            path: path.map(p => p.toString())
          }).then(() => {
            closeEndPoint(ep);
            isProxyReleased = true;
          });
        };
      }

      if (prop === "then") {
        if (path.length === 0) {
          return {
            then: () => proxy
          };
        }

        const r = requestResponseMessage(ep, {
          type: 0
          /* GET */
          ,
          path: path.map(p => p.toString())
        }).then(fromWireValue);
        return r.then.bind(r);
      }

      return createProxy(ep, [...path, prop]);
    },

    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased); // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
      // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯

      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(ep, {
        type: 1
        /* SET */
        ,
        path: [...path, prop].map(p => p.toString()),
        value
      }, transferables).then(fromWireValue);
    },

    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last = path[path.length - 1];

      if (last === createEndpoint) {
        return requestResponseMessage(ep, {
          type: 4
          /* ENDPOINT */

        }).then(fromWireValue);
      } // We just pretend that `bind()` didn’t happen.


      if (last === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }

      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: 2
        /* APPLY */
        ,
        path: path.map(p => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    },

    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: 3
        /* CONSTRUCT */
        ,
        path: path.map(p => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    }

  });
  return proxy;
}

function myFlat(arr) {
  return Array.prototype.concat.apply([], arr);
}

function processArguments(argumentList) {
  const processed = argumentList.map(toWireValue);
  return [processed.map(v => v[0]), myFlat(processed.map(v => v[1]))];
}

const transferCache = new WeakMap();

function transfer(obj, transfers) {
  transferCache.set(obj, transfers);
  return obj;
}

function proxy(obj) {
  return Object.assign(obj, {
    [proxyMarker]: true
  });
}

function windowEndpoint(w, context = self, targetOrigin = "*") {
  return {
    postMessage: (msg, transferables) => w.postMessage(msg, targetOrigin, transferables),
    addEventListener: context.addEventListener.bind(context),
    removeEventListener: context.removeEventListener.bind(context)
  };
}

function toWireValue(value) {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [{
        type: 3
        /* HANDLER */
        ,
        name,
        value: serializedValue
      }, transferables];
    }
  }

  return [{
    type: 0
    /* RAW */
    ,
    value
  }, transferCache.get(value) || []];
}

function fromWireValue(value) {
  switch (value.type) {
    case 3
    /* HANDLER */
    :
      return transferHandlers.get(value.name).deserialize(value.value);

    case 0
    /* RAW */
    :
      return value.value;
  }
}

function requestResponseMessage(ep, msg, transfers) {
  return new Promise(resolve => {
    const id = generateUUID();
    ep.addEventListener("message", function l(ev) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }

      ep.removeEventListener("message", l);
      resolve(ev.data);
    });

    if (ep.start) {
      ep.start();
    }

    ep.postMessage(Object.assign({
      id
    }, msg), transfers);
  });
}

function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
},{}],"src/lib/util.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deepCopy = exports.isRunningAsWorker = exports.sizeOf = exports.toMb = exports.formatNumber = exports.factorial = exports.sum2D = exports.sum = exports.range = exports.to2D = exports.findIndex2D = exports.shuffleArray = void 0;

function shuffleArray(array) {
  const buf = [...array];

  for (let i = buf.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [buf[i], buf[j]] = [buf[j], buf[i]];
  }

  return buf;
}

exports.shuffleArray = shuffleArray;

function findIndex2D(arr, val) {
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

exports.findIndex2D = findIndex2D;

function to2D(src, size) {
  const dst = [];

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

exports.to2D = to2D;

function range(size) {
  const numbers = [];

  for (let i = 0; i < size; i++) {
    numbers.push(i + 1);
  }

  return numbers;
}

exports.range = range;

function sum(arr, map) {
  return arr.reduce((sum, val, i) => sum + map(val, i), 0);
}

exports.sum = sum;

function sum2D(outer, map) {
  return sum(outer, (inner, i) => {
    return sum(inner, (cell, j) => map(cell, i, j));
  });
}

exports.sum2D = sum2D;

function factorial(n) {
  return n < 2 ? 1 : n * factorial(n - 1);
}

exports.factorial = factorial;

function formatNumber(number) {
  const formatter = new Intl.NumberFormat('da', {
    maximumSignificantDigits: 3
  });
  return formatter.format(number);
}

exports.formatNumber = formatNumber;

exports.toMb = n => (n / (1024 * 1024)).toFixed(2) + 'MB';

function sizeOf(obj) {
  const typeSizes = {
    undefined: () => 0,
    boolean: () => 4,
    number: () => 8,
    string: item => 2 * item.length,
    object: item => {
      if (!item) return 0;
      return sum(Object.keys(item), key => size(key) + size(item[key]));
    }
  };

  const size = value => typeSizes[typeof value](value);

  return size(obj);
}

exports.sizeOf = sizeOf;

function isRunningAsWorker() {
  // https://stackoverflow.com/a/18002694/2534355
  return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
}

exports.isRunningAsWorker = isRunningAsWorker;

function deepCopy(item) {
  return JSON.parse(JSON.stringify(item));
}

exports.deepCopy = deepCopy;
},{}],"src/game/Grid.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Grid = exports.Direction = void 0;

const util_1 = require("../lib/util");

var Direction;

(function (Direction) {
  Direction["UP"] = "UP";
  Direction["DOWN"] = "DOWN";
  Direction["LEFT"] = "LEFT";
  Direction["RIGHT"] = "RIGHT";
})(Direction = exports.Direction || (exports.Direction = {}));

class Grid {
  constructor(size, tiles, freeTile) {
    this.size = size;
    this.tiles = tiles;
    this.freeTile = freeTile ?? this.computeFreeTile();
  }

  copy() {
    return new Grid(this.size, util_1.deepCopy(this.tiles), util_1.deepCopy(this.freeTile));
  }

  swap(c1, c2) {
    const tmp = this.tiles[c2.y][c2.x];
    this.tiles[c2.y][c2.x] = this.tiles[c1.y][c1.x];
    this.tiles[c1.y][c1.x] = tmp;
  }

  move(direction) {
    const vecs = {
      [Direction.LEFT]: {
        x: -1,
        y: 0
      },
      [Direction.RIGHT]: {
        x: 1,
        y: 0
      },
      [Direction.UP]: {
        x: 0,
        y: -1
      },
      [Direction.DOWN]: {
        x: 0,
        y: 1
      }
    };
    const {
      x,
      y
    } = vecs[direction];
    const newFree = {
      x: this.freeTile.x + x,
      y: this.freeTile.y + y
    };

    if (newFree.x < 0 || newFree.x >= this.size || newFree.y < 0 || newFree.y >= this.size) {
      throw new Error('Out of bounds');
    }

    this.swap(this.freeTile, newFree);
    this.freeTile = newFree;
  }

  render(p) {
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

  getValidMoves() {
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

  static generate(size) {
    if (size < 2) {
      throw new Error('Grid size cannot be smaller than 2');
    } // Generate array from 0 to size*size (exclusive)


    const numbers = util_1.range(size * size); // Set last tile as empty

    numbers[numbers.length - 1] = null; // Make a shuffled copy!

    const shuffled = util_1.shuffleArray(numbers); // Convert 1D array into 2D

    const tiles = util_1.to2D(shuffled, size);
    const desiredState = util_1.to2D(numbers, size);
    return {
      grid: new Grid(size, tiles),
      desiredState
    };
  }

  computeFreeTile() {
    const freeCell = util_1.findIndex2D(this.tiles, null);

    if (!freeCell) {
      throw new Error('No free cell was computed');
    }

    const [x, y] = freeCell;
    return {
      x,
      y
    };
  }

}

exports.Grid = Grid;
},{"../lib/util":"src/lib/util.ts"}],"node_modules/ts-priority-queue/src/BinaryHeapStrategy.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BinaryHeapStrategy {
    constructor(options) {
        this.comparator = options.comparator;
        this.data = options.initialValues ? options.initialValues.slice(0) : [];
        this._heapify();
    }
    _heapify() {
        if (this.data.length > 0) {
            for (let i = 0; i < this.data.length; i++) {
                this._bubbleUp(i);
            }
        }
    }
    queue(value) {
        this.data.push(value);
        this._bubbleUp(this.data.length - 1);
    }
    dequeue() {
        const ret = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0 && last !== undefined) {
            this.data[0] = last;
            this._bubbleDown(0);
        }
        return ret;
    }
    peek() {
        return this.data[0];
    }
    clear() {
        this.data.length = 0;
    }
    _bubbleUp(pos) {
        while (pos > 0) {
            const parent = (pos - 1) >>> 1;
            if (this.comparator(this.data[pos], this.data[parent]) < 0) {
                const x = this.data[parent];
                this.data[parent] = this.data[pos];
                this.data[pos] = x;
                pos = parent;
            }
            else {
                break;
            }
        }
    }
    _bubbleDown(pos) {
        let last = this.data.length - 1;
        while (true) {
            const left = (pos << 1) + 1;
            const right = left + 1;
            let minIndex = pos;
            if (left <= last && this.comparator(this.data[left], this.data[minIndex]) < 0) {
                minIndex = left;
            }
            if (right <= last && this.comparator(this.data[right], this.data[minIndex]) < 0) {
                minIndex = right;
            }
            if (minIndex !== pos) {
                const x = this.data[minIndex];
                this.data[minIndex] = this.data[pos];
                this.data[pos] = x;
                pos = minIndex;
            }
            else {
                break;
            }
        }
        return void 0;
    }
}
exports.default = BinaryHeapStrategy;

},{}],"node_modules/ts-priority-queue/src/PriorityQueue.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BinaryHeapStrategy_1 = require("./BinaryHeapStrategy");
class PriorityQueue {
    constructor(options) {
        this._length = 0;
        this._length = options.initialValues ? options.initialValues.length : 0;
        this.strategy = new BinaryHeapStrategy_1.default(options);
    }
    get length() { return this._length; }
    queue(value) {
        this._length++;
        this.strategy.queue(value);
    }
    dequeue() {
        if (!this._length)
            throw new Error("Empty queue");
        this._length--;
        return this.strategy.dequeue();
    }
    peek() {
        if (!this._length)
            throw new Error("Empty queue");
        return this.strategy.peek();
    }
    clear() {
        this._length = 0;
        this.strategy.clear();
    }
}
exports.default = PriorityQueue;

},{"./BinaryHeapStrategy":"node_modules/ts-priority-queue/src/BinaryHeapStrategy.js"}],"node_modules/ts-priority-queue/index.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PriorityQueue_1 = require("./src/PriorityQueue");
exports.default = PriorityQueue_1.default;

},{"./src/PriorityQueue":"node_modules/ts-priority-queue/src/PriorityQueue.js"}],"src/ai/AStarAI.ts":[function(require,module,exports) {
"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AStarAI = void 0;

const ts_priority_queue_1 = __importDefault(require("ts-priority-queue"));

const util_1 = require("../lib/util");
/**
 * An implementation of the A* algorithm, which searches for a solution to the 8-Puzzle game
 */


class AStarAI {
  constructor() {
    /**
    The (priority) queue of states which has not been explored yet.
    It is sorted asending by the "cost-value" of each game state.
    **/
    this.pq = new ts_priority_queue_1.default({
      comparator: (a, b) => a.cost() - b.cost()
    });
    /**The set of all states which has been explored in the search*/

    this.explored = new StateSet();
    /** The theoretical size of the search space, based on the size of the game board. */

    this.searchSpace = 0;
    /** The amount of memory, in bytes, a single grid is consuming. Used for memory usage metrics. */

    this.gridMemSize = 0;
  }
  /**
   * Search for a set of moves which transforms the grid into the desired state.
   */


  getMoves(grid, desiredState) {
    // Calculate constants, for use in progress status
    this.calculateProgressConstants(grid); // Put initial state on queue

    this.pq.queue(new SearchNode(grid, desiredState)); // Keep running until the queue is empty
    // Maintain counter to decide when to report status

    for (let i = 1; this.pq.length !== 0; i++) {
      const node = this.pq.dequeue(); // Goal test

      if (node.hasSolution()) {
        console.debug(`Found solution! Explored ${util_1.formatNumber(this.explored.size)} nodes.`);
        return node.actions;
      } // Report status to user, but only sometimes. Tradeoff between fast status updates and performance


      if (i % 30000 == 0) {
        this.reportProgress();
      } // Mark the current node as explored


      this.explored.add(node); // For each of valid moves in the current state

      for (const move of node.moves()) {
        // Make a copy of the current state, in order not to modify it for future iterations
        const copy = node.copy(); // Perform the move

        copy.move(move); // If this new configuration is not in our explored set, add it to the queue

        if (!this.explored.has(copy)) {
          this.pq.queue(copy);
        }
      }
    } // If we reach this code, no solution was found. Therefore throw error


    const searchedPct = this.explored.size / this.searchSpace * 100;
    throw new Error(`Could not find a solution.\nExplored ${util_1.formatNumber(searchedPct)}% of search space (${util_1.formatNumber(this.explored.size)} of ${util_1.formatNumber(this.searchSpace)} permutations)`);
  }
  /**
   * Calculate constants, for use in progress status
   */


  calculateProgressConstants(grid) {
    // The theoretical bound of search space
    this.searchSpace = util_1.factorial(grid.size * grid.size) / 2;
    this.gridMemSize = util_1.sizeOf(grid);
  }
  /**
   * Send progress updates to the main thread, in order to render the progres bar
   */


  reportProgress() {
    if (!util_1.isRunningAsWorker()) {
      return;
    }

    const exploredMemSize = this.gridMemSize * this.explored.size;
    const pqMemSize = this.gridMemSize * this.pq.length;
    const currentExplored = this.explored.size;
    const progress = currentExplored / this.searchSpace;
    const percent = progress * 100;
    const status = `(${util_1.formatNumber(currentExplored)} of ${util_1.formatNumber(this.searchSpace)} nodes explored)`;
    self.postMessage({
      cmd: 'ai_progress',
      percent,
      memory: exploredMemSize + pqMemSize,
      status
    });
  }

}

exports.AStarAI = AStarAI;
/**
 * A Simple wrapper around set, which handles comparison between search nodes (thus handling reference equality)
 */

class StateSet {
  constructor() {
    this.set = new Set();
  }

  add(node) {
    // Stringify state to use value equality instead of reference equality
    this.set.add(JSON.stringify(node.getState()));
  }

  has(node) {
    return this.set.has(JSON.stringify(node.getState()));
  }

  get size() {
    return this.set.size;
  }

  get items() {
    return Array.from(this.set.values());
  }

}
/**
 * Represents, and wraps, a concrete game state, and performs
 * the nessesary calculations (such as heuristics), which is
 * used during the search.
 */


class SearchNode {
  constructor(grid, desiredState, previousActions = []) {
    this.grid = grid;
    this.desiredState = desiredState;
    this.actions = previousActions;
  }

  move(action) {
    // Invalidate manhattanDistanceCache, since it should update after a move
    this._manhattanDistanceCache = undefined;
    this.grid.move(action);
    this.actions.push(action);
  }

  hasSolution() {
    return JSON.stringify(this.grid.tiles) == JSON.stringify(this.desiredState);
  }

  cost() {
    return this.actions.length + this.heuristic();
  }

  heuristic() {
    return this.totalManhattanDistance();
  }
  /**
   * Return the sum of manhattan distance of all cells in the grid.
   */


  totalManhattanDistance() {
    if (this._manhattanDistanceCache) {
      return this._manhattanDistanceCache;
    }

    const total = util_1.sum2D(this.grid.tiles, (cell, i, j) => {
      const res = util_1.findIndex2D(this.desiredState, cell);

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

  getState() {
    return this.grid.tiles;
  }

  moves() {
    return this.grid.getValidMoves();
  }

  copy() {
    return new SearchNode(this.grid.copy(), this.desiredState, [...this.actions]);
  }

}
},{"ts-priority-queue":"node_modules/ts-priority-queue/index.js","../lib/util":"src/lib/util.ts"}],"src/game/EightPuzzle.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

const Grid_1 = require("./Grid");

const comlink_1 = require("comlink");

const util_1 = require("../lib/util");

const sketch_1 = require("../sketch");

class EightPuzzle {
  constructor(p, size, aiType) {
    this.currentMove = 0;
    this.done = false;
    this.aiAsWorker = true;
    this.size = size;
    this.p = p;
    this.aiType = aiType;
    this.p.createCanvas(600, 600);
    this.createResetButton();
    this.p.background(0);
    this.drawStatusCenter('Initializing...');
    const {
      grid,
      desiredState
    } = Grid_1.Grid.generate(this.size);
    this.grid = grid;
    this.desiredState = desiredState;
    this.p.frameRate(5);
  }

  init() {
    this.calculateMoves().catch(err => {
      this.errorMsg = err;
      this.moves = [];
      this.p.noLoop();
      console.error(err);
    });
  }

  reset() {
    this.p.background(0);
    this.drawStatusCenter('Resetting...');
    this.moves = undefined;
    this.currentMove = 0;
    this.done = false;
    this.errorMsg = undefined;
    this.status = undefined;
    const {
      grid,
      desiredState
    } = Grid_1.Grid.generate(this.size);
    this.grid = grid;
    this.desiredState = desiredState;
    this.init();
    this.p.loop();
  }

  putAIOnMainThread() {
    this.aiAsWorker = false;
  }

  async calculateMoves() {
    if (this.aiAsWorker) {
      return this.calculateMovesWithWorker();
    } // Wrap in a promise to match signature of worker


    return new Promise(res => {
      const factory = sketch_1.solvers[this.aiType];
      const ai = factory();
      this.moves = ai.getMoves(this.grid.copy(), this.desiredState);
      res();
    });
  }

  async calculateMovesWithWorker() {
    const worker = new Worker("/worker.d34025a2.js");

    worker.onmessage = ({
      data
    }) => {
      if (data.cmd === 'ai_progress') {
        this.status = data;
      }
    };

    const action = comlink_1.wrap(worker);
    this.moves = await action(this.aiType, this.size, this.grid.tiles, this.grid.freeTile, this.desiredState);
    worker.terminate();
  }

  createResetButton() {
    const button = this.p.createButton('reset');
    button.addClass('canvasButton'); // button.size(50, 30);

    const buttonSize = button.size();
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

  drawStatusSmall(status) {
    this.p.textSize(16);
    this.p.textAlign(this.p.LEFT, this.p.TOP);
    this.p.fill(255);
    this.p.text(status, 10, 10, this.p.width - 20, this.p.height - 20);
  }

  drawStatusCenter(status) {
    this.p.textSize(30);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.fill(255);
    this.p.text(status, this.p.width / 2, this.p.height / 2);
  }

  drawProgress() {
    const titleText = 'Searching for solution...';

    if (this.status === undefined) {
      this.drawStatusCenter(titleText);
      return;
    } // Get metrics and calculate percentage


    const {
      percent,
      memory,
      status
    } = this.status;
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
    this.p.text(`${util_1.formatNumber(percent)}% ${status ?? ''}`, centerX, progY + progHeight + 20);

    if (memory !== undefined) {
      const lbl = `Memory usage: ${util_1.toMb(memory)}`;
      this.p.textAlign(this.p.LEFT, this.p.BOTTOM);
      this.p.text(lbl, 10, this.p.height - 5);
    } // this.drawStatus(msg);

  }

}

exports.default = EightPuzzle;
},{"./Grid":"src/game/Grid.ts","comlink":"node_modules/comlink/dist/esm/comlink.mjs","../lib/util":"src/lib/util.ts","../sketch":"src/sketch.ts","./../ai/worker.ts":[["worker.d34025a2.js","src/ai/worker.ts"],"worker.d34025a2.js.map","src/ai/worker.ts"]}],"src/sketch.ts":[function(require,module,exports) {
"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeGame = exports.solvers = void 0;

const AStarAI_1 = require("./ai/AStarAI");

const EightPuzzle_1 = __importDefault(require("./game/EightPuzzle"));

exports.solvers = {
  'a*': () => new AStarAI_1.AStarAI()
};

function makeGame(p) {
  let game;

  p.setup = () => {
    game = new EightPuzzle_1.default(p, 3, 'a*'); // Enable this if needed for debugging
    // game.putAIOnMainThread();

    game.init();
  };

  p.draw = () => {
    game?.draw();
  };
}

exports.makeGame = makeGame;
},{"./ai/AStarAI":"src/ai/AStarAI.ts","./game/EightPuzzle":"src/game/EightPuzzle.ts"}],"src/ai/worker.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateMoves = void 0;

const comlink_1 = require("comlink");

const Grid_1 = require("../game/Grid");

const sketch_1 = require("../sketch");

function calculateMoves(solver, size, tiles, freeCell, desiredState) {
  const grid = new Grid_1.Grid(size, tiles, freeCell);
  const ai = sketch_1.solvers[solver]();
  return ai.getMoves(grid, desiredState);
}

exports.calculateMoves = calculateMoves;
comlink_1.expose(calculateMoves);
},{"comlink":"node_modules/comlink/dist/esm/comlink.mjs","../game/Grid":"src/game/Grid.ts","../sketch":"src/sketch.ts"}],"node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "45341" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["node_modules/parcel-bundler/src/builtins/hmr-runtime.js","src/ai/worker.ts"], null)
//# sourceMappingURL=/worker.d34025a2.js.map