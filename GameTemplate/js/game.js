// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

/*
 * Asset manager.
 * Container for all 'assets' printing to the screen
 */
function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = [];
    this.downloadQueue = [];
}

// downloads the queue
AssetManager.prototype.queueDownload = function (path) {
    console.log(path.toString());
    this.downloadQueue.push(path);
}

// returns truethy if the download is finished.
AssetManager.prototype.isDone = function () {
    return (this.downloadQueue.length == this.successCount + this.errorCount);
}

// downloads all assets.
AssetManager.prototype.downloadAll = function (callback) {
    if (this.downloadQueue.length === 0) window.setTimeout(callback, 100);
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function () {
            console.log("dun: " + this.src.toString());
            that.successCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.addEventListener("error", function () {
            that.errorCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.src = path;
        this.cache[path] = img;
    }
}

// gets the asset from the cache
AssetManager.prototype.getAsset = function(path){
    //console.log(path.toString());
    return this.cache[path];
}

/* 
 * canvas manager
 * 
 * It is where the events are stored,
 * stores the canvas, and initiates
 * displaying to screen.
 *
 */
function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.click = null;
    this.mouse = null;
    this.wheel = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
}

// initializes the canvas manager
GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();

    console.log('game initialized');
}

// Starts the game.
GameEngine.prototype.start = function () {
    console.log("starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
}

// loads all the input listeners.
GameEngine.prototype.startInput = function () {
    console.log('Starting input');

    // returns x and y coordinates of the event.
    var getXandY = function (e) {
        var x = e.clientX - that.ctx.canvas.getBoundingClientRect().left;
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top;

        // x is less than 1024 
        if (x < 1024) {
            x = Math.floor(x / 32);
            y = Math.floor(y / 32);
        }

        return { x: x, y: y };
    }

    var that = this;  // that is this

    // mouse click listener
    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
    }, false);

    // mouse move listener
    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
    }, false);

    // mouse wheel listener
    this.ctx.canvas.addEventListener("mousewheel", function (e) {
        that.wheel = e;
    }, false);

    console.log('Input started');
}

// adds the entity to the Game Eng. (Asset mngr)
GameEngine.prototype.addEntity = function (entity) {
    console.log('added entity');
    this.entities.push(entity);
}

//  draws the entities on the canvas
GameEngine.prototype.draw = function (drawCallback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    if (drawCallback) {
        drawCallback(this);
    }
    this.ctx.restore();
}

// forces updates of the entities.
GameEngine.prototype.update = function () {
    var entitiesCount = this.entities.length;

    for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];

        if (!entity.removeFromWorld) {
            entity.update();
        }
    }

    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

// calls updae and draw,
// sets click and wheel to null
GameEngine.prototype.loop = function () {
    this.update();
    this.draw();
    this.click = null;
    this.wheel = null;
}

// Entity 'Class'
// container for a drawable object
function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

// default updates the entity. 
Entity.prototype.update = function () {
}

// default draw function
Entity.prototype.draw = function (ctx) {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.closePath();
    }
}

// rotates the image and returns a canvas with the newly
// rotated image.  the 'offscreenCanvas' can be treated like any other image.
Entity.prototype.rotateAndCache = function (image, angle) {
    var offscreenCanvas = document.createElement('canvas');
    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    var offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size / 2, size / 2);
    offscreenCtx.rotate(angle);
    offscreenCtx.translate(0, 0);
    offscreenCtx.drawImage(image, -(image.width / 2), -(image.height / 2));
    offscreenCtx.restore();
    //offscreenCtx.strokeStyle = "red";
    //offscreenCtx.strokeRect(0,0,size,size);
    return offscreenCanvas;
}

// GameBoard code below
// this could be the floor, or the background, or
// an actual game board depending on the game.
// it is what the game plays off of .  I.E the 'gameboard'
function GameBoard() {

    Entity.call(this, null, 0, 0);
}

// gameboard is an entity
GameBoard.prototype = new Entity();
GameBoard.prototype.constructor = GameBoard;

// updates the game board
GameBoard.prototype.update = function () {
    Entity.prototype.update.call(this);
}

// draws the game board
GameBoard.prototype.draw = function (ctx) {
}

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');

    var gameEngine = new GameEngine();
    var gameboard = new GameBoard();

    gameEngine.addEntity(gameboard);
 
    gameEngine.init(ctx);
    gameEngine.start();
});
