//------------------------------------------------------------------------------
// Initialization
//------------------------------------------------------------------------------

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

// Reused from javascript-tetris
var nx = 10, // Original Tetris grid width, not used but included for similarity
  ny = 20; // Original Tetris grid height, not used but included for similarity

// Reused variables from javascript-tetris
var playing = false,
  dt, // delta time
  current, // current piece (not used in Block Breaker)
  blocks, // block grid (used differently)
  actions = [],
  score = 0,
  vscore = 0,
  rows = 0;

// Reused constants from javascript-tetris
var KEY = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 },
  DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 },
  stats = new Stats(), // FPS counter, included for similarity
  // Original tetris speed variables, included for similarity
  speed = { start: 0.6, decrement: 0.005, min: 0.1 },
  step;

var last = (now = timestamp()); // Reused timestamp initialization
var dx, dy; // Reused from Tetris for block size (not used in Block Breaker)

var keysDown = {}; // Object to keep track of keys currently pressed

//------------------------------------------------------------------------------
// BALL
//------------------------------------------------------------------------------

// Reused Ball object from javascript-pong, with minimal modifications
var Ball = {
  // Reused initialize function
  initialize: function () {
    this.radius = 10;
    this.minX = this.radius;
    this.maxX = canvas.width - this.radius;
    this.minY = this.radius;
    this.maxY = canvas.height - this.radius;

    // Reused speed calculations
    this.speed = (this.maxX - this.minX) / 2; // Adjusted for Block Breaker
    this.dx = this.speed;
    this.dy = -this.speed;
    this.setpos(canvas.width / 2, canvas.height - 30);
  },

  // Reused setpos function
  setpos: function (x, y) {
    this.x = x;
    this.y = y;
    this.left = this.x - this.radius;
    this.top = this.y - this.radius;
    this.right = this.x + this.radius;
    this.bottom = this.y + this.radius;
  },

  // Reused update function with modifications
  update: function (dt) {
    var pos = {
      x: this.x + this.dx * dt,
      y: this.y + this.dy * dt,
      dx: this.dx,
      dy: this.dy,
    };

    // Bounce off left and right walls
    if (pos.x < this.minX) {
      pos.x = this.minX;
      pos.dx = -pos.dx;
    } else if (pos.x > this.maxX) {
      pos.x = this.maxX;
      pos.dx = -pos.dx;
    }

    // Bounce off the top wall
    if (pos.y < this.minY) {
      pos.y = this.minY;
      pos.dy = -pos.dy;
    }

    // Check for falling below bottom
    if (pos.y > this.maxY) {
      // Game Over Condition
      lose(); // Reused lose function from tetris
      return;
    }

    // Ball and paddle collision will be handled separately
    this.setpos(pos.x, pos.y);
    this.dx = pos.dx;
    this.dy = pos.dy;
  },

  // Reused draw function with minimal modifications
  draw: function (ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF"; // Set fill color to white
    ctx.fill();
    ctx.closePath();
  },
};

//------------------------------------------------------------------------------
// PADDLE
//------------------------------------------------------------------------------

// Reused Paddle object concept from javascript-pong
var Paddle = {
  // Initialize function adapted from javascript-pong
  initialize: function () {
    this.width = 75;
    this.height = 10;
    this.x = (canvas.width - this.width) / 2;
    this.y = canvas.height - this.height;
    this.speed = 600; // Adjusted speed
    this.dx = 0;
  },

  // Movement functions adapted from javascript-pong
  move: function (dir) {
    this.dx = dir * this.speed;
  },

  stop: function () {
    this.dx = 0;
  },

  // Reused update function with modifications
  update: function (dt) {
    this.x += this.dx * dt;
    if (this.x < 0) {
      this.x = 0;
    } else if (this.x + this.width > canvas.width) {
      this.x = canvas.width - this.width;
    }
  },

  // Reused draw function with minimal modifications
  draw: function (ctx) {
    ctx.fillStyle = "#FFF";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  },
};

//------------------------------------------------------------------------------
// Blocks (adapted from Tetris board representation)
//------------------------------------------------------------------------------

var nx = 8, // Number of columns (blocks) horizontally
  ny = 5; // Number of rows (blocks) vertically

dx = canvas.width / nx; // Width of a single block
dy = 20; // Height of a block, adjusted for Block Breaker

blocks = []; // Reused blocks array from tetris

// Reused function to clear blocks, adapted for Block Breaker
function clearBlocks() {
  blocks = [];
  for (var x = 0; x < nx; x++) {
    blocks[x] = [];
    for (var y = 0; y < ny; y++) {
      blocks[x][y] = 1; // 1 indicates the block is present
    }
  }
}

// Reused getBlock and setBlock functions from tetris
function getBlock(x, y) {
  return blocks && blocks[x] ? blocks[x][y] : null;
}

function setBlock(x, y, val) {
  blocks[x][y] = val;
}

//------------------------------------------------------------------------------
// Game Functions
//------------------------------------------------------------------------------

// Reused from javascript-tetris
function play() {
  hide("start");
  reset();
  playing = true;
}

function lose() {
  show("start");
  setVisualScore();
  playing = false;
  alert("Game Over");
}

// Score functions reused from tetris
function setVisualScore(n) {
  vscore = n || score;
  invalidateScore();
}
function setScore(n) {
  score = n;
  setVisualScore(n);
}
function addScore(n) {
  score = score + n;
}
function clearScore() {
  setScore(0);
}

// Reused reset function with modifications
function reset() {
  dt = 0;
  keysDown = {};
  actions = [];
  clearBlocks();
  clearScore();
  Ball.initialize();
  Paddle.initialize();
}

function update(idt) {
  if (playing) {
    // Handle paddle movement
    if (keysDown[KEY.LEFT]) {
      Paddle.move(-1);
    } else if (keysDown[KEY.RIGHT]) {
      Paddle.move(1);
    } else {
      Paddle.stop();
    }

    Paddle.update(idt);
    Ball.update(idt);
    collisionDetection();
  } else {
    // Game is not playing; stop paddle movement
    Paddle.stop();
  }
}

// Reused handle function with modifications
function handle(action) {
  switch (action) {
    case DIR.LEFT:
      Paddle.move(-1);
      break;
    case DIR.RIGHT:
      Paddle.move(1);
      break;
    default:
      Paddle.stop();
      break;
  }
}

// Reused draw function with modifications
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

  // Draw blocks (adapted from Tetris draw function)
  for (var x = 0; x < nx; x++) {
    for (var y = 0; y < ny; y++) {
      if (getBlock(x, y)) {
        ctx.fillStyle = "#FFF";
        ctx.fillRect(x * dx, y * dy + 30, dx - 1, dy - 1); // Adjusted position
      }
    }
  }

  Ball.draw(ctx);
  Paddle.draw(ctx);

  // Draw score
  ctx.fillStyle = "#FFF";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + score, 8, 20);
}

// Reused collision detection logic with modifications
function collisionDetection() {
  // Collision with blocks
  var rowHeight = dy; // The height of a block row
  var colWidth = dx; // The width of a block column
  var row = Math.floor((Ball.y - 30) / rowHeight);
  var col = Math.floor(Ball.x / colWidth);

  // Check if ball is within the grid
  if (
    Ball.y < ny * rowHeight + 30 &&
    row >= 0 &&
    col >= 0 &&
    row < ny &&
    col < nx &&
    getBlock(col, row)
  ) {
    Ball.dy = -Ball.dy;
    setBlock(col, row, null); // Remove the block
    addScore(10);
    if (isBoardClear()) {
      alert("You Win!");
      reset();
    }
  }

  // Collision with paddle
  if (
    Ball.y + Ball.radius > Paddle.y &&
    Ball.x > Paddle.x &&
    Ball.x < Paddle.x + Paddle.width
  ) {
    Ball.dy = -Ball.dy;
    // Adjust ball's dx based on where it hit the paddle
    var hitPoint = Ball.x - (Paddle.x + Paddle.width / 2);
    Ball.dx = hitPoint * 5; // Adjust the multiplier as needed
  }
}

// Reused function to check if the board is clear
function isBoardClear() {
  for (var x = 0; x < nx; x++) {
    for (var y = 0; y < ny; y++) {
      if (getBlock(x, y)) {
        return false;
      }
    }
  }
  return true;
}

// Reused functions to show/hide elements (from Tetris)
function hide(id) {
  get(id).style.visibility = "hidden";
}
function show(id) {
  get(id).style.visibility = null;
}

// Reused DOM helper functions
function get(id) {
  return document.getElementById(id);
}

// Reused timestamp function (from Tetris)
function timestamp() {
  return new Date().getTime();
}

// Reused functions to invalidate and update score display (for similarity)
function invalidateScore() {
  // No UI element to invalidate; included for similarity
}

// Reused function for the game loop
function run() {
  showStats(); // initialize FPS counter
  addEvents(); // attach keydown and resize events
  resize();
  reset();
  playing = true;
  last = timestamp();
  frame();
}

function showStats() {
  stats.domElement.id = "stats";
  // Append the stats element to an existing element, e.g., the body or a specific div
  document.body.appendChild(stats.domElement);
}

// Reused frame function with modifications
function frame() {
  now = timestamp();
  update(Math.min(1, (now - last) / 1000.0));
  draw();
  stats.update(); // Update the FPS counter
  last = now;
  requestAnimationFrame(frame, canvas);
}

// Reused event handling functions with modifications
function addEvents() {
  document.addEventListener("keydown", keydown, false);
  document.addEventListener("keyup", keyup, false);
  window.addEventListener("resize", resize, false);
}

function keydown(ev) {
  if (playing) {
    keysDown[ev.keyCode] = true;
    ev.preventDefault();
  } else {
    play();
    ev.preventDefault();
  }
}

function keyup(ev) {
  if (playing) {
    delete keysDown[ev.keyCode];
    ev.preventDefault();
  }
}

// Reused resize function (from Tetris)
function resize(event) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  dx = canvas.width / nx;
  dy = 20; // Fixed height for blocks
}

//------------------------------------------------------------------------------
// Start the game
//------------------------------------------------------------------------------

window.onload = function () {
  run();
};
