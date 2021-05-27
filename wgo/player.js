(function (WGo) {

    "use strict";

    var FileError = function (path, code) {
        this.name = "FileError";

        if (code == 1) this.message = "File '" + path + "' is empty.";
        else if (code == 2) this.message = "Network error. It is not possible to read '" + path + "'.";
        else this.message = "File '" + path + "' hasn't been found on server.";
    }

    FileError.prototype = new Error();
    FileError.prototype.constructor = FileError;

    WGo.FileError = FileError;

// ajax function for loading of files
    var loadFromUrl = WGo.loadFromUrl = function (url, callback) {

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4) {
                if (xmlhttp.status == 200) {
                    if (xmlhttp.responseText.length == 0) {
                        throw new FileError(url, 1);
                    } else {
                        callback(xmlhttp.responseText);
                    }
                } else {
                    throw new FileError(url);
                }
            }
        }

        try {
            //	xmlhttp.setDefaultEncoding("utf-8")
            xmlhttp.open("GET", url, true);
            xmlhttp.overrideMimeType("text/html;charset=utf-8");
            xmlhttp.send();
        } catch (err) {
            throw new FileError(url, 2);
        }

    }

// basic updating function - handles board changes



    var update_board = function (e) {
        // update board's position
        if (e.change) this.board.update(e.change);

        // remove old markers from the board
        if (this.temp_marks) this.board.removeObject(this.temp_marks);

        // init array for new objects
        var add = [];

        this.notification();
        WGo.curNode = e.node;
if(WGo.badLastMark)
    WGo.curBoard.removeObject(WGo.badLastMark);
        if(WGo.badLastMark2)
            WGo.curBoard.removeObject(WGo.badLastMark2);
        // add variation letters
        if (e.node.children.length > 1 && this.config.displayVariations) {
            for (var i = 0; i < e.node.children.length; i++) {
                if (e.node.children[i].move && !e.node.children[i].move.pass)
                    add.push({
                    type: "LB2",
                    text: String.fromCharCode(65 + i),
                    x: e.node.children[i].move.x,
                    y: e.node.children[i].move.y,
                    c: this.board.theme.variationColor || "rgba(0,32,128,0.8)"
                });
            }
        }

        // add other markup
        if (e.node.markup) {
            for (var i in e.node.markup) {
                for (var j = 0; j < add.length; j++) {
                    if (e.node.markup[i].x == add[j].x && e.node.markup[i].y == add[j].y) {
                        add.splice(j, 1);
                        j--;
                    }
                }
            }
            add = add.concat(e.node.markup);
        }

        // add new markers on the board


        //add bestmoves
        if (WGo._last_mark) {
            this.board.removeAllObjectsVR();
        }
        this.board.removeAllObjectsBM();

        this.temp_marks = add;
        this.board.addObject(add);
        if(WGo.curNode.children[0])
        { var move=WGo.curNode.children[0].move;
            var badLastMark = new Object();
            badLastMark.c = WGo.mainGame.turn;
            badLastMark.x = move.x;
            badLastMark.y = move.y;
            badLastMark.type = "CRS";
            this.board.addObject(badLastMark);
            WGo.badLastMark2=badLastMark;
        }
        if (e.node.bestMoves) {
            if(e.node.engine)
            {
                if(WGo.isWideMode)
                    if(e.node.enginemin)
                        WGo.commentTitle.innerHTML=WGo.t("engine")+e.node.enginemin;
                        else
                WGo.commentTitle.innerHTML=WGo.t("engine")+e.node.engine;
                else
                {    if(e.node.enginemin)
                    WGo.engineElement.innerHTML=e.node.enginemin;
                    else
                    WGo.engineElement.innerHTML=e.node.engine;
                }
            }
            for (var i = 0; i < e.node.bestMoves.length; i++) {
                var bestMove = e.node.bestMoves[i];
                if (bestMove.coordinate) {
                    var bestMoveInfo = new Object();
                    bestMoveInfo.x = bestMove.x;
                    bestMoveInfo.y = bestMove.y;
                    bestMoveInfo.winrate = bestMove.winrate;
                    bestMoveInfo.scoreMean = bestMove.scoreMean;
                    bestMoveInfo.playouts = bestMove.playouts;
                    bestMoveInfo.percentplayouts = bestMove.percentplayouts;
                    bestMoveInfo.type = "BM";
                    this.board.addObject(bestMoveInfo);
                }
            }
        }
        // add current move marker
        if (e.node.move && this.config.markLastMove) {
            if (e.node.move.pass) this.notification(WGo.t((e.node.move.c == WGo.B ? "b" : "w") + "pass"));
            else {
                var type;
                if (WGo.editMode) {
                    type = "CR2";
                } else {
                    type = "TRS";
                }
                // if(!WGo.isShowingMoveNum)
                {  var lastMark = new Object();
                    lastMark.type=type;
                    lastMark.x= e.node.move.x;
                    lastMark.y=e.node.move.y;
                    WGo.curBoard.addObject(lastMark);
                }
                // add.push({
                //     type: type,
                //     x: e.node.move.x,
                //     y: e.node.move.y
                // });
            }
        }
        WGo.drawWinrate2();
    }

// preparing board
    var prepare_board = function (e) {
        // set board size
        this.board.setSize(e.kifu.size);

        // remove old objects
        this.board.removeAllObjects();

        // activate wheel
        if (this.config.enableWheel) this.setWheel(true);
        this.setOpenKey();
    }

// detecting scrolling of element - e.g. when we are scrolling text in comment box, we want to be aware.
    var detect_scrolling = function (node, bp) {
        if (node == bp.element || node == bp.element) return false;
        else if (node._wgo_scrollable || (node.scrollHeight > node.offsetHeight && window.getComputedStyle(node).overflow == "auto")) return true;
        else return detect_scrolling(node.parentNode, bp);
    }

// mouse wheel event callback, for replaying a game
    var wheel_lis = function (e) {
        var delta = e.wheelDelta || e.detail * (-1);

        // if there is scrolling in progress within an element, don't change position
        if (detect_scrolling(e.target, this)) return true;

        if (delta < 0) {
            this.next();
            if (this.config.lockScroll && e.preventDefault) e.preventDefault();
            return !this.config.lockScroll;
        } else if (delta > 0) {
            this.previous();
            if (this.config.lockScroll && e.preventDefault) e.preventDefault();
            return !this.config.lockScroll;
        }
        return true;
    };

// keyboard click callback, for replaying a game
    var key_lis = function (e) {
        // disable game replay, when there is focus on some form text field
        var focusedElements = document.querySelector("input:focus, textarea:focus");
        if (focusedElements) return true;

        switch (e.keyCode) {
            case 39:
                this.next();
                break;
            case 37:
                this.previous();
                break;
            //case 40: this.selectAlternativeVariation(); break;
            default:
                return true;
        }
        if (this.config.lockScroll && e.preventDefault) e.preventDefault()
        return !this.config.lockScroll;
    };

// function handling board clicks in normal mode
    var board_click_default = function (x, y) {
        if (!this.kifuReader || !this.kifuReader.node) return false;
        for (var i in this.kifuReader.node.children) {
            if (this.kifuReader.node.children[i].move && this.kifuReader.node.children[i].move.x == x && this.kifuReader.node.children[i].move.y == y) {
                this.next(i);
                return;
            }
        }
    }

// coordinates drawing handler - adds coordinates on the board
    /*var coordinates = {
        grid: {
            draw: function(args, board) {
                var ch, t, xright, xleft, ytop, ybottom;

                this.fillStyle = "rgba(0,0,0,0.7)";
                this.textBaseline="middle";
                this.textAlign="center";
                this.font = board.stoneRadius+"px "+(board.font || "");

                xright = board.getX(-0.75);
                xleft = board.getX(board.size-0.25);
                ytop = board.getY(-0.75);
                ybottom = board.getY(board.size-0.25);

                for(var i = 0; i < board.size; i++) {
                    ch = i+"A".charCodeAt(0);
                    if(ch >= "I".charCodeAt(0)) ch++;

                    t = board.getY(i);
                    this.fillText(board.size-i, xright, t);
                    this.fillText(board.size-i, xleft, t);

                    t = board.getX(i);
                    this.fillText(String.fromCharCode(ch), t, ytop);
                    this.fillText(String.fromCharCode(ch), t, ybottom);
                }

                this.fillStyle = "black";
            }
        }
    }*/

    /**
     * We can say this class is abstract, stand alone it doesn't do anything.
     * However it is useful skelet for building actual player's GUI. Extend this class to create custom player template.
     * It controls board and inputs from mouse and keyboard, but everything can be overriden.
     *
     * Possible configurations:
     *  - sgf: sgf string (default: undefined)
     *  - json: kifu stored in json/jgo (default: undefined)
     *  - sgfFile: sgf file path (default: undefined)
     *  - board: configuration object of board (default: {})
     *  - enableWheel: allow player to be controlled by mouse wheel (default: true)
     *  - lockScroll: disable window scrolling while hovering player (default: true),
     *  - enableKeys: allow player to be controlled by arrow keys (default: true),
     *  - markLastMove: marks the last move with a circle (default: true),
     *
     * @param {object} config object if form: {key1: value1, key2: value2, ...}
     */

    var Player = function (config) {
        this.config = config;

        // add default configuration
        for (var key in Player.default) if (this.config[key] === undefined && Player.default[key] !== undefined) this.config[key] = Player.default[key];

        this.element = document.createElement("div");
        this.board = new WGo.Board(this.element, this.config.board);

        this.init();
        this.initGame();
    }
    var   interval;

    var mouse_move_bestmoves = function (x, y) {
        if(WGo.commentVarClicked)
            return;
        if (WGo.lastX == x && WGo.lastY == y) return;
        WGo.lastX = x;
        WGo.lastY = y;
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        if (WGo._last_mark) {
            this.board.removeAllObjectsVR();
        }

        if (x != -1 && y != -1) {
            var hasBestMoves = false;
            if(!WGo.curNode.bestMoves)
                return;
            var bestMoves = WGo.curNode.bestMoves;
            var bestmove;
            for (var i = 0; i < bestMoves.length; i++) {
                bestmove = bestMoves[i];
                if (bestmove.x == x && bestmove.y == y) {
                    hasBestMoves = true;
                    break;
                }
            }
            if (hasBestMoves) {
                WGo.isMouseOnBestMove = true;
                WGo.mouseBestMove = bestmove;
                this.board.removeAllObjectsBM(bestmove.x, bestmove.y);
                if(WGo.badLastMark)
                    this.board.removeObject(WGo.badLastMark);
                if(WGo.badLastMark2)
                    this.board.removeObject(WGo.badLastMark2);
                {
                    var bestMoveInfo = new Object();
                    bestMoveInfo.c = WGo.mainGame.turn;
                    bestMoveInfo.x = bestmove.x;
                    bestMoveInfo.y = bestmove.y;
                    bestMoveInfo.winrate = bestmove.winrate;
                    bestMoveInfo.scoreMean = bestmove.scoreMean;
                    bestMoveInfo.playouts = bestmove.playouts;
                    bestMoveInfo.percentplayouts = bestmove.percentplayouts;
                    bestMoveInfo.type = "BM";
                    this.board.addObject(bestMoveInfo);
                }
                WGo._last_mark = true;
                var variations = bestmove.variation;
                WGo.var_length = variations.length;
                if (WGo.isAutoMode)
                    WGo.display_var_length = 1;
                else
                    WGo.display_var_length = -1;
                for (var i = 1; i < variations.length; i++) {
                    var data = variations[i].split("_");

                    var mark = {
                        type: "variation",
                        x: data[0],
                        y: data[1],
                        c: WGo.mainGame.turn,
                        num: i + 1
                    };
                    this.board.addObject(mark);
                }

                // var_length = variations.length;
            } else {
                WGo.isMouseOnBestMove = false;
                if(WGo.curNode.children[0])
                { var move=WGo.curNode.children[0].move;
                    var badLastMark = new Object();
                    badLastMark.c = WGo.mainGame.turn;
                    badLastMark.x = move.x;
                    badLastMark.y = move.y;
                    badLastMark.type = "CRS";
                    this.board.addObject(badLastMark);
                    WGo.badLastMark2=badLastMark;
                }
                if (WGo._last_mark) {
                    var node = WGo.curNode;
                    if (node.bestMoves)
                        for (var i = 0; i < node.bestMoves.length; i++) {
                            var bestMove = node.bestMoves[i];
                            if (bestMove.coordinate) {
                                var bestMoveInfo = new Object();
                                bestMoveInfo.x = bestMove.x;
                                bestMoveInfo.y = bestMove.y;
                                bestMoveInfo.scoreMean = bestMove.scoreMean;
                                bestMoveInfo.winrate = bestMove.winrate;
                                bestMoveInfo.playouts = bestMove.playouts;
                                bestMoveInfo.percentplayouts = bestMove.percentplayouts;
                                bestMoveInfo.type = "BM";
                                this.board.addObject(bestMoveInfo);
                            }
                        }
                    if(!WGo.editMode)
                    {  var lastMark = new Object();
                    lastMark.type="TRS";
                        lastMark.x= node.move.x;
                        lastMark.y=node.move.y;
                    this.board.addObject(lastMark);
                    }
                  //  this.board.redraw();
                    WGo._last_mark = false;
                }
            }
        } else {
            WGo.isMouseOnBestMove = false;
            if(WGo.curNode.children[0])
            { var move=WGo.curNode.children[0].move;
                var badLastMark = new Object();
                badLastMark.c = WGo.mainGame.turn;
                badLastMark.x = move.x;
                badLastMark.y = move.y;
                badLastMark.type = "CRS";
                this.board.addObject(badLastMark);
                WGo.badLastMark2=badLastMark;
            }
            if (WGo._last_mark) {
                var node = WGo.curNode;
                if (node.bestMoves)
                    for (var i = 0; i < node.bestMoves.length; i++) {
                        var bestMove = node.bestMoves[i];
                        if (bestMove.coordinate) {
                            var bestMoveInfo = new Object();
                            bestMoveInfo.x = bestMove.x;
                            bestMoveInfo.scoreMean = bestMove.scoreMean;
                            bestMoveInfo.y = bestMove.y;
                            bestMoveInfo.winrate = bestMove.winrate;
                            bestMoveInfo.playouts = bestMove.playouts;
                            bestMoveInfo.percentplayouts = bestMove.percentplayouts;
                            bestMoveInfo.type = "BM";
                            this.board.addObject(bestMoveInfo);
                        }
                    }
               // this.board.redraw();
                WGo._last_mark = false;
            }
        }
    }

    var mouse_click_pc = function () {
        if(WGo.editMode)
            return;
        if(WGo.commentVarClicked)
        {
            WGo.commentVarClicked=false;
            WGo.lastX = -1;
            WGo.lastY = -1;
            WGo.clickedComment=false
            WGo.isMouseOnBestMove = false;
            WGo.curBoard.removeAllObjectsVR();
            var node = WGo.curNode;
            if (node.bestMoves)
                for (var i = 0; i < node.bestMoves.length; i++) {
                    var bestMove = node.bestMoves[i];
                    if (bestMove.coordinate) {
                        var bestMoveInfo = new Object();
                        bestMoveInfo.x = bestMove.x;
                        bestMoveInfo.y = bestMove.y;
                        bestMoveInfo.scoreMean = bestMove.scoreMean;
                        bestMoveInfo.winrate = bestMove.winrate;
                        bestMoveInfo.playouts = bestMove.playouts;
                        bestMoveInfo.percentplayouts = bestMove.percentplayouts;
                        bestMoveInfo.type = "BM";
                        WGo.curBoard.addObject(bestMoveInfo);
                    }
                }
            // if(!WGo.isShowingMoveNum)
            {  var lastMark = new Object();
                lastMark.type="TRS";
                lastMark.x= node.move.x;
                lastMark.y=node.move.y;
                this.board.addObject(lastMark);
            }
            WGo.curBoard.redraw();
        }
        else if (WGo.isMouseOnBestMove) {
            if (WGo.display_var_length)
                WGo.display_var_length = 2;
            WGo.curBoard.redrawVar();
            interval = setInterval(function () {
                if (WGo.display_var_length < 0) {
                    WGo.display_var_length = 1;
                }
                if (WGo.display_var_length < WGo.var_length)
                    WGo.display_var_length++;
                WGo.curBoard.redrawVar();
            }, 700);
        }
    }


    var mouse_click_bestmoves = function (x, y) {
        if (WGo.lastX == x && WGo.lastY == y && WGo.isMouseOnBestMove) {
            this.board.removeAllObjectsVR();
            WGo.isMouseOnBestMove = false;
            if(WGo.curNode.children[0])
            { var move=WGo.curNode.children[0].move;
                var badLastMark = new Object();
                badLastMark.c = WGo.mainGame.turn;
                badLastMark.x = move.x;
                badLastMark.y = move.y;
                badLastMark.type = "CRS";
                this.board.addObject(badLastMark);
                WGo.badLastMark2=badLastMark;
            }
            if (WGo._last_mark) {
                var node = WGo.curNode;
                if (node.bestMoves)
                    for (var i = 0; i < node.bestMoves.length; i++) {
                        var bestMove = node.bestMoves[i];
                        if (bestMove.coordinate) {
                            var bestMoveInfo = new Object();
                            bestMoveInfo.x = bestMove.x;
                            bestMoveInfo.y = bestMove.y;
                            bestMoveInfo.scoreMean = bestMove.scoreMean;
                            bestMoveInfo.winrate = bestMove.winrate;
                            bestMoveInfo.playouts = bestMove.playouts;
                            bestMoveInfo.percentplayouts = bestMove.percentplayouts;
                            bestMoveInfo.type = "BM";
                            this.board.addObject(bestMoveInfo);
                        }
                    }
               // this.board.redraw();
                WGo._last_mark = false;
            }
            WGo.lastX = -1;
            WGo.lastY = -1;
            return;
        }
        WGo.lastX = x;
        WGo.lastY = y;

        if (WGo._last_mark) {
            this.board.removeAllObjectsVR();
        }

        if (x != -1 && y != -1) {
            var hasBestMoves = false;
            var bestMoves = WGo.curNode.bestMoves;
            var bestmove;
            for (var i = 0; i < bestMoves.length; i++) {
                bestmove = bestMoves[i];
                if (bestmove.x == x && bestmove.y == y) {
                    hasBestMoves = true;
                    break;
                }
            }
            if (!hasBestMoves) {
                for (var i = 0; i < bestMoves.length; i++) {
                    bestmove = bestMoves[i];
                    if ((bestmove.x === x + 1 || bestmove.x === x || bestmove.x === x - 1) && (bestmove.y === y || bestmove.y === y + 1 || bestmove.y === y - 1)) {
                        var mgr = bestmove.x - x + bestmove.y - y;
                        if (mgr === 2 || mgr === 0 || mgr === -2) {
                        } else {
                            hasBestMoves = true;
                            break;
                        }
                    }
                }
            }
            if (!hasBestMoves) {
                for (var i = 0; i < bestMoves.length; i++) {
                    bestmove = bestMoves[i];
                    if ((bestmove.x === x + 1 || bestmove.x === x || bestmove.x === x - 1) && (bestmove.y === y || bestmove.y === y + 1 || bestmove.y === y - 1)) {
                        hasBestMoves = true;
                        break;
                    }
                }
            }
            if (hasBestMoves) {
                if (WGo.mouseBestMove == bestmove && WGo.isMouseOnBestMove) {
                    WGo.isMouseOnBestMove = false;
                    if(WGo.curNode.children[0])
                    { var move=WGo.curNode.children[0].move;
                        var badLastMark = new Object();
                        badLastMark.c = WGo.mainGame.turn;
                        badLastMark.x = move.x;
                        badLastMark.y = move.y;
                        badLastMark.type = "CRS";
                        this.board.addObject(badLastMark);
                        WGo.badLastMark2=badLastMark;
                    }
                    if (WGo._last_mark) {
                        var node = WGo.curNode;
                        if (node.bestMoves)
                            for (var i = 0; i < node.bestMoves.length; i++) {
                                var bestMove = node.bestMoves[i];
                                if (bestMove.coordinate) {
                                    var bestMoveInfo = new Object();
                                    bestMoveInfo.x = bestMove.x;
                                    bestMoveInfo.y = bestMove.y;
                                    bestMoveInfo.scoreMean = bestMove.scoreMean;
                                    bestMoveInfo.winrate = bestMove.winrate;
                                    bestMoveInfo.playouts = bestMove.playouts;
                                    bestMoveInfo.percentplayouts = bestMove.percentplayouts;
                                    bestMoveInfo.type = "BM";
                                    this.board.addObject(bestMoveInfo);
                                }
                            }
                     //   this.board.redraw();
                        WGo._last_mark = false;
                    }
                    WGo.lastX = -1;
                    WGo.lastY = -1;
                    return;
                }
                WGo.isMouseOnBestMove = true;
                WGo.mouseBestMove = bestmove;
                this.board.removeAllObjectsBM(bestmove.x, bestmove.y);
                if(WGo.badLastMark)
                    this.board.removeObject(WGo.badLastMark);
                if(WGo.badLastMark2)
                    this.board.removeObject(WGo.badLastMark2);
                {
                    var bestMoveInfo = new Object();
                    bestMoveInfo.c = WGo.mainGame.turn;
                    bestMoveInfo.x = bestmove.x;
                    bestMoveInfo.y = bestmove.y;
                    bestMoveInfo.winrate = bestmove.winrate;
                    bestMoveInfo.scoreMean = bestmove.scoreMean;
                    bestMoveInfo.playouts = bestmove.playouts;
                    bestMoveInfo.percentplayouts = bestmove.percentplayouts;
                    bestMoveInfo.type = "BM";
                    this.board.addObject(bestMoveInfo);
                }
                WGo._last_mark = true;
                var variations = bestmove.variation;
                WGo.var_length = variations.length;
                if (WGo.isAutoMode)
                    WGo.display_var_length = 1;
                else
                    WGo.display_var_length = -1;
                for (var i = 1; i < variations.length; i++) {
                    var data = variations[i].split("_");

                    var mark = {
                        type: "variation",
                        x: data[0],
                        y: data[1],
                        c: WGo.mainGame.turn,
                        num: i + 1
                    };
                    this.board.addObject(mark);
                }
                //  var_length = variations.length;

            } else {
                WGo.isMouseOnBestMove = false;
                if(WGo.curNode.children[0])
                { var move=WGo.curNode.children[0].move;
                    var badLastMark = new Object();
                    badLastMark.c = WGo.mainGame.turn;
                    badLastMark.x = move.x;
                    badLastMark.y = move.y;
                    badLastMark.type = "CRS";
                    this.board.addObject(badLastMark);
                    WGo.badLastMark2=badLastMark;
                }
                if (WGo._last_mark) {
                    var node = WGo.curNode;
                    if (node.bestMoves)
                        for (var i = 0; i < node.bestMoves.length; i++) {
                            var bestMove = node.bestMoves[i];
                            if (bestMove.coordinate) {
                                var bestMoveInfo = new Object();
                                bestMoveInfo.x = bestMove.x;
                                bestMoveInfo.y = bestMove.y;
                                bestMoveInfo.scoreMean = bestMove.scoreMean;
                                bestMoveInfo.winrate = bestMove.winrate;
                                bestMoveInfo.playouts = bestMove.playouts;
                                bestMoveInfo.percentplayouts = bestMove.percentplayouts;
                                bestMoveInfo.type = "BM";
                                this.board.addObject(bestMoveInfo);
                            }
                        }
                    if(!WGo.editMode)
                    {  var lastMark = new Object();
                        lastMark.type="TRS";
                        lastMark.x= node.move.x;
                        lastMark.y=node.move.y;
                        this.board.addObject(lastMark);
                    }
                  //  this.board.redraw();
                    WGo._last_mark = false;
                }
            }
        } else {
            WGo.isMouseOnBestMove = false;
            if(WGo.curNode.children[0])
            { var move=WGo.curNode.children[0].move;
                var badLastMark = new Object();
                badLastMark.c = WGo.mainGame.turn;
                badLastMark.x = move.x;
                badLastMark.y = move.y;
                badLastMark.type = "CRS";
                this.board.addObject(badLastMark);
                WGo.badLastMark2=badLastMark;
            }
            if (WGo._last_mark) {
                var node = WGo.curNode;
                if (node.bestMoves)
                    for (var i = 0; i < node.bestMoves.length; i++) {
                        var bestMove = node.bestMoves[i];
                        if (bestMove.coordinate) {
                            var bestMoveInfo = new Object();
                            bestMoveInfo.x = bestMove.x;
                            bestMoveInfo.scoreMean = bestMove.scoreMean;
                            bestMoveInfo.y = bestMove.y;
                            bestMoveInfo.winrate = bestMove.winrate;
                            bestMoveInfo.playouts = bestMove.playouts;
                            bestMoveInfo.percentplayouts = bestMove.percentplayouts;
                            bestMoveInfo.type = "BM";
                            this.board.addObject(bestMoveInfo);
                        }
                    }
              //  this.board.redraw();
                WGo._last_mark = false;
            }
        }
    }

    var updatePosition=function(){
        var o = document.getElementById("main");
        // if(o.clientWidth*0.7<o.clientHeight)
        // {WGo.positionPercent=false;
        // return;
        // }
        WGo.mainWidth= o.offsetWidth;
        WGo.mainHeight= o.offsetHeight;

        // var devicewidth = document.documentElement.clientWidth;
        // var deviceheight = document.documentElement.clientHeight;
        if (WGo.isWideMode) {
            var o3=document.getElementById("main");
            o3.style.margin="0px 0px 0px 20px";
            o3.style.top="0px";
            var o = document.getElementById("commenttitile");
                o.style.display="";
            if (WGo.mainWidth * 0.7 > WGo.mainHeight)
            {
                var percent = Math.round(WGo.mainHeight * 100 / WGo.mainWidth);
                WGo.positionPercent = percent;
                var o1 = document.getElementsByClassName("wgo-player-center");
                for (var i = 0; i < o1.length; i++) {
                    o1[i].style.width = percent + "%";
                }
                var o2 = document.getElementsByClassName("wgo-player-right");
                for (var i = 0; i < o2.length; i++) {
                    o2[i].style.width = (100 - percent) + "%";
                    o2[i].style.display="";
                }
                var o3 = document.getElementsByClassName("wgo-ctrlgroup-left");
                for (var i = 0; i < o1.length; i++) {
                    o3[i].style.paddingLeft = 1 + "%";
                }
                var o4 = document.getElementById("last");
                o4.style.padding="0px 0px 0px 32px";
               // }
            }
            else {
                WGo.positionPercent = false;
                var o1 = document.getElementsByClassName("wgo-player-center");
                for (var i = 0; i < o1.length; i++) {
                    o1[i].style.width = 70 + "%";
                }
                var o2 = document.getElementsByClassName("wgo-player-right");
                for (var i = 0; i < o2.length; i++) {
                    o2[i].style.width = 30 + "%";
                    o2[i].style.display="";
                }
                // var o3 = document.getElementsByClassName("wgo-ctrlgroup-left");
                // for (var i = 0; i < o1.length; i++) {
                //     o3[i].style.paddingLeft = 0 + "px";
                // }
                //
                var o4 = document.getElementById("last");
                o4.style.padding="0px 0px 0px 23px";
            }
        }
        else{
            WGo.positionPercent = false;
            var o = document.getElementById("commenttitile");
            o.style.display="none";

            var o1 = document.getElementsByClassName("wgo-player-center");
            for (var i = 0; i < o1.length; i++) {
                o1[i].style.width = "";
            }
            // var o2 = document.getElementsByClassName("wgo-player-right");
            // for (var i = 0; i < o2.length; i++) {
            //     o2[i].style.width = 0 + "%";
            //     o2[i].style.display="none";
            // }
            var o3 = document.getElementsByClassName("wgo-ctrlgroup-left");
            for (var i = 0; i < o1.length; i++) {
                o3[i].style.paddingLeft = 0 + "px";
            }
        if(WGo.isPC)
        {
                var o = document.getElementsByTagName("button");
                for (var i = 0; i < o.length; i++) {
                    if (o[i].className.startsWith("wgo-button3")) {
                        o[i].style.width = Math.min(WGo.mainWidth / 17,40) + "px";
                        // if(o[i].offsetWidth>0)
                        // alert("bt3 "+o[i].offsetWidth+"_"+o[i].offsetHeight);
                    } else if (o[i].className.startsWith("wgo-button2")) {

                        o[i].style.width = (Math.min(WGo.mainWidth / 13,55)) + "px";
                        o[i].style.fontSize = (Math.min(WGo.mainWidth / 18.5,60))/4+ 'px';
                    } else if (o[i].className.startsWith("wgo-button")) {
                        o[i].style.width = (Math.min(WGo.mainWidth / 13,65)) + "px";
                    }
                }
               var o3=document.getElementById("main");
            o3.style.margin="0px 0px 0px 0px";
            o3.style.top="-8px";
                var o4 = document.getElementById("last");
                o4.style.padding="0px 0px 0px 0px";
              // alert(1)
            }
        }
            if(WGo.isWideMode)
        {
            var o = document.getElementsByTagName("button");
            var width=Math.min(WGo.mainWidth*0.7,WGo.mainHeight);
            for (var i = 0; i < o.length; i++) {
                if (o[i].className.startsWith("wgo-button3")) {
                    o[i].style.width = Math.min(width / 18,40) + "px";
                    // if(o[i].offsetWidth>0)
                    // alert("bt3 "+o[i].offsetWidth+"_"+o[i].offsetHeight);
                } else if (o[i].className.startsWith("wgo-button2")) {
                    o[i].style.width = (Math.min(width / 13,55)) + "px";
                    o[i].style.fontSize = (Math.min(width / 15,55))/4+ 'px';
                } else if (o[i].className.startsWith("wgo-button")) {
                    o[i].style.width = (Math.min(width / 13,60)) + "px";
                }
            }
        }
       else if(WGo.isPC)
        {
            var o = document.getElementsByTagName("button");
            for (var i = 0; i < o.length; i++) {
                if (o[i].className.startsWith("wgo-button3")) {
                    o[i].style.width = Math.min(WGo.mainWidth / 17,40) + "px";
                    // if(o[i].offsetWidth>0)
                    // alert("bt3 "+o[i].offsetWidth+"_"+o[i].offsetHeight);
                } else if (o[i].className.startsWith("wgo-button2")) {

                    o[i].style.width = (Math.min(WGo.mainWidth / 13,55)) + "px";
                    o[i].style.fontSize = (Math.min(WGo.mainWidth / 18.5,60))/4+ 'px';
                } else if (o[i].className.startsWith("wgo-button")) {
                    o[i].style.width = (Math.min(WGo.mainWidth / 13,65)) + "px";
                }
            }
        }
        if (!WGo.isPC&&! WGo.isWideMode)
        {
            //alert(WGo.mainHeight+"_"+WGo.mainWidth);
            var o = document.getElementsByTagName("button");
            for (var i = 0; i < o.length; i++) {
                if (o[i].className.startsWith("wgo-button3")) {
                    o[i].style.width = Math.min((WGo.mainWidth-81)  /11,60) + "px";
                    // if(o[i].offsetWidth>0)
                    // alert("bt3 "+o[i].offsetWidth+"_"+o[i].offsetHeight);
                } else if (o[i].className.startsWith("wgo-button2")) {
                    o[i].style.width = (Math.min((WGo.mainWidth-81)/11,60)) + "px";
                } else if (o[i].className.startsWith("wgo-button")) {
                    o[i].style.width = (Math.min((WGo.mainWidth-81) /7,70)) + "px";
                }
            }
            var s = document.getElementById("multiprev");
            s.style.width = (Math.min((WGo.mainWidth-81)/9,60)) + "px";
            var s1 = document.getElementById("multinext");
            s1.style.width = (Math.min((WGo.mainWidth-81)/9,60)) + "px";
            var s2 = document.getElementById("bottommenu");
            s2.style.width = (Math.min((WGo.mainWidth-81)/13.5,60)) + "px";

        }

    }
    WGo.updatePosition=updatePosition;
    var loadBadMove=function(){
        var node=WGo.mianKifu.root;
        var move=1;
        while(node.children&&node.children[0]) {
            if (node.bestMoves&&node.bestMoves[0]&&node.children[0].bestMoves&&node.children[0].bestMoves[0]) {
                var winrateDiff = (100 - node.children[0].bestMoves[0].winrate)-node.bestMoves[0].winrate;
                var badmove = new Object();
                var badmoveS = new Object();
                if(WGo.isKataData)
                if(node.bestMoves[0].scoreMean&&node.children[0].bestMoves[0].scoreMean)
                    var scoreDiff=-node.children[0].bestMoves[0].scoreMean-node.bestMoves[0].scoreMean;
                if (node.move.c == WGo.W) {
                    if (!WGo.badMoveListB)
                        WGo.badMoveListB = new Array();
                    if (WGo.badMoveListB.length < 20)
                    {
                        badmove.moveNum=move;
                        badmove.winrateDiff=winrateDiff;
                        WGo.badMoveListB.push(badmove);
                    }
                    else{
                            WGo.badMoveListB=  WGo.badMoveListB.sort(function(a,b){
                            return a.winrateDiff - b.winrateDiff
                        })

                            if(winrateDiff<WGo.badMoveListB[19].winrateDiff)
                            {
                                WGo.badMoveListB[19].winrateDiff=winrateDiff;
                                WGo.badMoveListB[19].moveNum=move;
                            }

                    }
                    if(scoreDiff)
                    {
                        if (!WGo.badMoveListBS)
                        WGo.badMoveListBS = new Array();
                        if (WGo.badMoveListBS.length < 20)
                        {
                            badmoveS.moveNum=move;
                            badmoveS.scoreDiff=scoreDiff;
                            WGo.badMoveListBS.push(badmoveS);
                        }
                        else{
                            WGo.badMoveListBS=  WGo.badMoveListBS.sort(function(a,b){
                                return a.scoreDiff - b.scoreDiff
                            })
                            if(scoreDiff<WGo.badMoveListBS[19].scoreDiff)
                            {
                                WGo.badMoveListBS[19].scoreDiff=scoreDiff;
                                WGo.badMoveListBS[19].moveNum=move;
                            }
                        }
                    }
                } else//W
                {
                    if (!WGo.badMoveListW)
                        WGo.badMoveListW = new Array();
                    if (WGo.badMoveListW.length < 20)
                    {
                        badmove.moveNum=move;
                        badmove.winrateDiff=winrateDiff;
                        WGo.badMoveListW.push(badmove);
                    }
                    else{
                        WGo.badMoveListW=  WGo.badMoveListW.sort(function(a,b){
                            return a.winrateDiff - b.winrateDiff
                        })

                        if(winrateDiff<WGo.badMoveListW[19].winrateDiff)
                        {
                            WGo.badMoveListW[19].winrateDiff=winrateDiff;
                            WGo.badMoveListW[19].moveNum=move;
                        }
                    }
                    if(scoreDiff)
                    {
                        if (!WGo.badMoveListWS)
                            WGo.badMoveListWS = new Array();
                        if (WGo.badMoveListWS.length < 20)
                        {
                            badmoveS.moveNum=move;
                            badmoveS.scoreDiff=scoreDiff;
                            WGo.badMoveListWS.push(badmoveS);
                        }
                        else{
                            WGo.badMoveListWS=  WGo.badMoveListWS.sort(function(a,b){
                                return a.scoreDiff - b.scoreDiff
                            })

                            if(scoreDiff<WGo.badMoveListWS[19].scoreDiff)
                            {
                                WGo.badMoveListWS[19].scoreDiff=scoreDiff;
                                WGo.badMoveListWS[19].moveNum=move;
                            }
                        }
                    }
                }
            }
            move++;
            node=node.children[0];
        }
        if(WGo.badMoveListB)
        WGo.badMoveListB=  WGo.badMoveListB.sort(function(a,b){
            return a.winrateDiff - b.winrateDiff
        })
        if(WGo.badMoveListW)
        WGo.badMoveListW=  WGo.badMoveListW.sort(function(a,b){
            return a.winrateDiff - b.winrateDiff
        })
        if(WGo.badMoveListBS)
        WGo.badMoveListBS=  WGo.badMoveListBS.sort(function(a,b){
            return a.scoreDiff - b.scoreDiff
        })
        if(WGo.badMoveListWS)
        WGo.badMoveListWS=  WGo.badMoveListWS.sort(function(a,b){
            return a.scoreDiff - b.scoreDiff
        })
    }

    Player.prototype = {
        constructor: Player,

        /**
         * Init player. If you want to call this method PlayerView object must have these properties:
         *  - player - WGo.Player object
         *  - board - WGo.Board object (or other board renderer)
         *  - element - main DOMElement of player
         */

        init: function () {
            // declare kifu
            this.kifu = null;

            // creating listeners
            this.listeners = {
                kifuLoaded: [prepare_board.bind(this)],
                update: [update_board.bind(this)],
                frozen: [],
                unfrozen: [],
            };

            if (this.config.kifuLoaded) this.addEventListener("kifuLoaded", this.config.kifuLoaded);
            if (this.config.update) this.addEventListener("update", this.config.update);
            if (this.config.frozen) this.addEventListener("frozen", this.config.frozen);
            if (this.config.unfrozen) this.addEventListener("unfrozen", this.config.unfrozen);

            if(WGo.isPC)
            	this.board.addEventListener("click", board_click_default.bind(this));


            //	var	setLis = function() {
            //this._ev_move = this._ev_move || edit_board_mouse_move.bind(this);
            if (WGo.isPC) {
                this.board.addEventListener("mousemove", mouse_move_bestmoves.bind(this));
                this.board.addEventListener("click", mouse_click_pc.bind(this));
            } else
                this.board.addEventListener("click", mouse_click_bestmoves.bind(this));
            WGo.curBoard = this.board;
            //};


            this.element.addEventListener("click", this.focus.bind(this));

            this.focus();
        },

        initGame: function () {
            // try to load game passed in configuration
            if (this.config.sgf) {
                this.loadSgf(this.config.sgf, this.config.move);
            } else if (this.config.json) {
                this.loadJSON(this.config.json, this.config.move);
            } else if (this.config.sgfFile) {
                this.loadSgfFromFile(this.config.sgfFile, this.config.move);
            }
            updatePosition();

        },

        /**
         * Create update event and dispatch it. It is called after position's changed.
         *
         * @param {string} op an operation that produced update (e.g. next, previous...)
         */

        update: function (op) {
            if (!this.kifuReader || !this.kifuReader.change) return;

            var ev = {
                type: "update",
                op: op,
                target: this,
                node: this.kifuReader.node,
                position: this.kifuReader.getPosition(),
                path: this.kifuReader.path,
                change: this.kifuReader.change,
            }

            //if(!this.kifuReader.node.parent) ev.msg = this.getGameInfo();

            this.dispatchEvent(ev);
        },

        /**
         * Prepare kifu for replaying. Event 'kifuLoaded' is triggered.
         *
         * @param {WGo.Kifu} kifu object
         * @param {Array} path array
         */

        loadKifu: function (kifu, path) {
            this.kifu = kifu;

            // kifu is replayed by KifuReader, it manipulates a Kifu object and gets all changes
            this.kifuReader = new WGo.KifuReader(this.kifu, this.config.rememberPath, this.config.allowIllegalMoves);

            // fire kifu loaded event
            this.dispatchEvent({
                type: "kifuLoaded",
                target: this,
                kifu: this.kifu,
            });

            // handle permalink
            /*if(this.config.permalinks) {
                if(!permalinks.active) init_permalinks();
                if(permalinks.query.length && permalinks.query[0] == this.view.element.id) {
                    handle_hash(this);
                }
            }*/

            // update player - initial position in kifu doesn't have to be an empty board
            this.update("init");

            if (path) {
                this.goTo(path);
            }

            /*if(this.kifu.nodeCount === 0) this.error("");
            else if(this.kifu.propertyCount === 0)*/

        },

        /**
         * Load go kifu from sgf string.
         *
         * @param {string} sgf
         */

        loadSgf: function (sgf, path) {
            try {
                this.loadKifu(WGo.Kifu.fromSgf(sgf), path);
                loadBadMove();
            } catch (err) {
                this.error(err);
            }
        },

        /**
         * Load go kifu from JSON object.
         */

        loadJSON: function (json, path) {
            try {
                this.loadKifu(WGo.Kifu.fromJGO(json), path);
            } catch (err) {
                this.error(err);
            }
        },

        /**
         * Load kifu from sgf file specified with path. AJAX is used to load sgf content.
         */

        loadSgfFromFile: function (file_path, game_path) {
            var _this = this;
            try {
                loadFromUrl(file_path, function (sgf) {
                    _this.loadSgf(sgf, game_path);
                });
            } catch (err) {
                this.error(err);
            }
        },

        /**
         * Implementation of EventTarget interface, though it's a little bit simplified.
         * You need to save listener if you would like to remove it later.
         *
         * @param {string} type of listeners
         * @param {Function} listener callback function
         */

        addEventListener: function (type, listener) {
            this.listeners[type] = this.listeners[type] || [];
            this.listeners[type].push(listener);
        },

        /**
         * Remove event listener previously added with addEventListener.
         *
         * @param {string} type of listeners
         * @param {Function} listener function
         */

        removeEventListener: function (type, listener) {
            if (!this.listeners[type]) return;
            var i = this.listeners[type].indexOf(listener);
            if (i != -1) this.listeners[type].splice(i, 1);
        },

        /**
         * Dispatch an event. In default there are two events: "kifuLoaded" and "update"
         *
         * @param {string} evt event
         */

        dispatchEvent: function (evt) {
            if (!this.listeners[evt.type]) return;
            for (var l in this.listeners[evt.type]) this.listeners[evt.type][l](evt);
        },

        /**
         * Output function for notifications.
         */

        notification: function (text) {
            if (console && text) {
                console.log(text);
            }
        },

        /**
         * Output function for helps.
         */

        help: function (text) {
            if (console) console.log(text);
        },

        /**
         * Output function for errors. TODO: reporting of errors - by cross domain AJAX
         */

        error: function (err) {
            if (!WGo.ERROR_REPORT) throw err;

            if (console) console.log(err);

        },

        /**
         * Play next move.
         *
         * @param {number} i if there is more option, you can specify it by index
         */

        next_edit: function (s) {
            //if(this.frozen || !this.kifu) return;
            WGo.lastX = -1;
            WGo.lastY = -1;
            WGo.isMouseOnBestMove = false;
            if (WGo.editMode)
                WGo.curBoard.removeAllObjectsOutLine();
            try {
                this.kifuReader.next(s);
                this.update();
            } catch (err) {
                this.error(err);
            }
        },

        next: function (i) {
            WGo.lastNext=true;
            WGo.lastPrev=false;
            if (this.frozen || !this.kifu) return;
            if (WGo.editMode)
                WGo.curBoard.removeAllObjectsOutLine();
            if (WGo._last_mark && WGo.isMouseOnBestMove) {
                if (WGo.display_var_length)
                    if (WGo.display_var_length < 0) {
                        if (!WGo.commentVarClicked)
                            WGo.display_var_length = 2;
                        else
                            WGo.display_var_length = 1;
                    } else if (WGo.display_var_length < WGo.var_length)
                    {  WGo.display_var_length++;
              }
                this.board.redrawVar();
                    return;
            } else {
                WGo.lastX = -1;
                WGo.lastY = -1;
                try {
                    this.kifuReader.next(i);
                    this.update();
                } catch (err) {
                    this.error(err);
                }
            }
        },

        /**
         * Get previous position.
         */

        previous: function () {
            WGo.lastNext=false;
            WGo.lastPrev=true;
            if (this.frozen || !this.kifu) return;
            if (WGo.editMode)
                WGo.curBoard.removeAllObjectsOutLine();
            //if(WGo.editMoveNum>1)
            //WGo.editMoveNum--;
            if (WGo._last_mark && WGo.isMouseOnBestMove) {
                if (WGo.display_var_length)
                    if (WGo.display_var_length < 0)
                        WGo.display_var_length = WGo.var_length - 1;
                    else if (WGo.display_var_length > 1)
                     WGo.display_var_length--;
                this.board.redrawVar();
                return;
            } else {
                WGo.lastX = -1;
                WGo.lastY = -1;
                try {
                    this.kifuReader.previous();
                    this.update();
                } catch (err) {
                    this.error(err);
                }
            }
        },

        /**
         * Play all moves and get last position.
         */

        last: function () {
            if (this.frozen || !this.kifu) return;

            try {
                this.kifuReader.last();
                this.update();
            } catch (err) {
                this.error(err);
            }
        },

        /**
         * Get a first position.
         */

        first: function () {
            if (this.frozen || !this.kifu) return;

            try {
                this.kifuReader.first();
                this.update();
            } catch (err) {
                this.error(err);
            }
        },

        /**
         * Go to a specified move.
         *
         * @param {number|Array} move number of move, or path array
         */

        goTo: function (move) {
            if (this.frozen || !this.kifu) return;
            if (WGo.editMode)
                WGo.curBoard.removeAllObjectsOutLine();
            var path;
            if (typeof move == "function") move = move.call(this);

            if (typeof move == "number") {
                path = WGo.clone(this.kifuReader.path);
                path.m = move || 0;
            } else path = move;

            try {
                this.kifuReader.goTo(path);
                this.update();
            } catch (err) {
                this.error(err);
            }
        },

        goToForBads: function (move) {
            if (this.frozen || !this.kifu) return;
            if (WGo.editMode)
                WGo.curBoard.removeAllObjectsOutLine();
            var path;
          //  if (typeof move == "function") move = move.call(this);

            if (typeof move == "number") {
                move--
                path = WGo.clone(this.kifuReader.path);
                path.m = move || 0;
            } else path = move;

            try {
                this.kifuReader.goTo(path);
                this.update();
            } catch (err) {
                this.error(err);
            }
            //alert(WGo.curNode.move.x+"_"+WGo.curNode.move.y);
var move=WGo.curNode.children[0].move;
            var badLastMark = new Object();
            badLastMark.c = WGo.mainGame.turn;
            badLastMark.x = move.x;
            badLastMark.y = move.y;
            badLastMark.type = "CR";
            this.board.addObject(badLastMark);
            WGo.badLastMark=badLastMark;
            //  if(move)
            // alert( WGo.curPlayer.kifuReader.path.m);
        },

        /**
         * Get information about actual game(kifu)
         *
         * @return {Object} game info
         */

        getGameInfo: function () {
            if (!this.kifu) return null;
            var info = {};
            for (var key in this.kifu.info) {
                if (WGo.Kifu.infoList.indexOf(key) == -1) continue;
                if (WGo.Kifu.infoFormatters[key]) {
                    info[WGo.t(key)] = WGo.Kifu.infoFormatters[key](this.kifu.info[key]);
                } else info[WGo.t(key)] = WGo.filterHTML(this.kifu.info[key]);
            }
            return info;
        },

        /**
         * Freeze or onfreeze player. In frozen state methods: next, previous etc. don't work.
         */

        setFrozen: function (frozen) {
            this.frozen = frozen;
            this.dispatchEvent({
                type: this.frozen ? "frozen" : "unfrozen",
                target: this,
            });
        },

        /**
         * Append player to given element.
         */

        appendTo: function (elem) {
            elem.appendChild(this.element);
        },

        /**
         * Get focus on the player
         */

        focus: function () {
            if (this.config.enableKeys) this.setKeys(true);
        },

        /**
         * Set controlling of player by arrow keys.
         */

        setKeys: function (b) {
            if (b) {
                document.onkeydown = key_lis.bind(this);
            } else {
                document.onkeydown = null;
            }
        },

        /**
         * Set controlling of player by mouse wheel.
         */

        setWheel: function (b) {
            if (!this._wheel_listener && b) {
                this._wheel_listener = wheel_lis.bind(this);
                var type = (document.onmousewheel !== undefined) ? "mousewheel" : "DOMMouseScroll";
                this.element.addEventListener(type, this._wheel_listener);
            } else if (this._wheel_listener && !b) {
                var type = (document.onmousewheel !== undefined) ? "mousewheel" : "DOMMouseScroll";
                this.element.removeEventListener(type, this._wheel_listener);
                delete this._wheel_listener;
            }

        },

        setOpenKey: function () {
            document.addEventListener("keyup", keypress,true);
        },

        /**
         * Toggle coordinates around the board.
         */

        setCoordinates: function (b) {
            if (!this.coordinates && b) {
                this.board.setSection(-0.5, -0.5, -0.5, -0.5);
                this.board.addCustomObject(WGo.Board.coordinates);
            } else if (this.coordinates && !b) {
                this.board.setSection(0, 0, 0, 0);
                this.board.removeCustomObject(WGo.Board.coordinates);
            }
            this.coordinates = b;
        },

    }


    Player.default = {
        sgf: undefined,
        json: undefined,
        sgfFile: undefined,
        move: undefined,
        board: {},
        enableWheel: true,
        lockScroll: true,
        enableKeys: true,
        rememberPath: true,
        kifuLoaded: undefined,
        update: undefined,
        frozen: undefined,
        unfrozen: undefined,
        allowIllegalMoves: false,
        markLastMove: true,
        displayVariations: true
    }

    WGo.Player = Player;

//--- i18n support ------------------------------------------------------------------------------------------

    /**
     * For another language support, extend this object with similiar object.
     */
    var keypress =function (event) {//O
        if (event.which == 79) {
            document.getElementById('up').click();
            // console.log("key1：" + keyCode+",isCtrl："+isCtrl);
        }
        if (event.which == 67) {//C
            WGo.curPlayer.setCoordinates(! WGo.curPlayer.coordinates);
        }
        if (event.which == 77) {//M
            WGo.toggleShowMoveNum( WGo.curPlayer);
        }
        if (event.which == 88) {//X切换计算量/目差
            WGo.togglePoScoreMean();
        }
        if (event.which == 86) {//V
            WGo.toggleTryPlay(WGo.curPlayer);
        }
        if (event.which == 65) {//A
            WGo.toggleAutoPlay();
        }
    }
    var player_terms = {
        "about-text": "<h1>WGo.js Player 2.0</h1>"
            + "<p>WGo.js Player is extension of WGo.js, HTML5 library for purposes of game of go. It allows to replay go game records and it has many features like score counting. It is also designed to be easily extendable.</p>"
            + "<p>WGo.js is open source licensed under <a href='http://en.wikipedia.org/wiki/MIT_License' target='_blank'>MIT license</a>. You can use and modify any code from this project.</p>"
            + "<p>You can find more information at <a href='http://wgo.waltheri.net/player' target='_blank'>wgo.waltheri.net/player</a></p>"
            + "<p>Copyright &copy; 2013 Jan Prokop</p>",
        "black": "Black",
        "white": "White",
        "DT": "Date",
        "KM": "Komi",
        "HA": "Handicap",
        "AN": "Annotations",
        "CP": "Copyright",
        "GC": "Game comments",
        "GN": "Game name",
        "ON": "Fuseki",
        "OT": "Overtime",
        "TM": "Basic time",
        "RE": "Result",
        "RO": "Round",
        "RU": "Rules",
        "US": "Recorder",
        "PC": "Place",
        "EV": "Event",
        "SO": "Source",
        "none": "none",
        "bpass": "Black passed.",
        "wpass": "White passed.",
    };

    for (var key in player_terms) WGo.i18n.en[key] = player_terms[key];

})(WGo);
