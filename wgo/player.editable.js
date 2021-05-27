(function (WGo) {

// board mousemove callback for edit move - adds highlighting
    var edit_board_mouse_move = function (x, y) {
        if (this.player.frozen || (this._lastX == x && this._lastY == y)) return;

        this._lastX = x;
        this._lastY = y;

        if (this._last_mark) {
            this.board.removeObject(this._last_mark);
        }

        if (x != -1 && y != -1 && this.player.kifuReader.game.isValid(x, y)) {
            this._last_mark = {
                type: "outline",
                x: x,
                y: y,
                c: this.player.kifuReader.game.turn
            };
            this.board.addObject(this._last_mark);
        } else {
            delete this._last_mark;
        }
    }

// board mouseout callback for edit move	
    var edit_board_mouse_out = function () {
        if (this._last_mark) {
            this.board.removeObject(this._last_mark);
            delete this._last_mark;
            delete this._lastX;
            delete this._lastY;
        }
    }

// get differences of two positions as a change object (TODO create a better solution, without need of this function)
    var pos_diff = function (old_p, new_p) {
        var size = old_p.size, add = [], remove = [];

        for (var i = 0; i < size * size; i++) {
            if (old_p.schema[i] && !new_p.schema[i]) remove.push({x: Math.floor(i / size), y: i % size});
            else if (old_p.schema[i] != new_p.schema[i]) add.push({
                x: Math.floor(i / size),
                y: i % size,
                c: new_p.schema[i]
            });
        }

        return {
            add: add,
            remove: remove
        }
    }

    WGo.Player.Editable = {};

    /**
     * Toggle edit mode.
     */

    WGo.Player.Editable = function (player, board) {
        this.player = player;
        WGo.curPlayer = player;
        this.board = board;
        this.editMode = false;
    }

    WGo.Player.Editable.prototype.set = function (set) {
        if (!this.editMode && set) {
            // save original kifu reader
            this.originalReader = this.player.kifuReader;

            // create new reader with cloned kifu
            this.player.kifuReader = new WGo.KifuReader(this.player.kifu.clone(), this.originalReader.rememberPath, this.originalReader.allow_illegal, true);

            // go to current position
            this.player.kifuReader.goTo(this.originalReader.path);

            // register edit listeners
            this._ev_click = this._ev_click || this.play.bind(this);
            this._ev_move = this._ev_move || edit_board_mouse_move.bind(this);
            this._ev_out = this._ev_out || edit_board_mouse_out.bind(this);

            this.board.addEventListener("click", this._ev_click);
            if (WGo.isPC) {
                this.board.addEventListener("mousemove", this._ev_move);
                this.board.addEventListener("mouseout", this._ev_out);
            }
            this.editMode = true;
        } else if (this.editMode && !set) {
            // go to the last original position
            this.originalReader.goTo(this.player.kifuReader.path);

            // change object isn't actual - update it, not elegant solution, but simple
            this.originalReader.change = pos_diff(this.player.kifuReader.getPosition(), this.originalReader.getPosition());

            // update kifu reader
            this.player.kifuReader = this.originalReader;
            this.player.update(true);

            // remove edit listeners
            this.board.removeEventListener("click", this._ev_click);
            if (WGo.isPC) {
                this.board.removeEventListener("mousemove", this._ev_move);
                this.board.removeEventListener("mouseout", this._ev_out);
            }
            this.editMode = false;
        }
    }

    WGo.Player.Editable.prototype.play = function (x, y) {
        if (!WGo.firsEditPlayed) {
            WGo.firsEditPlayed = true;
            WGo.editMoveNumStart = WGo.curPlayer.kifuReader.path.m;
        }
        if (WGo.isMouseOnBestMove&&WGo.display_var_length>0) {
            //WGo.isEditPlaying=true;
            var bestMove = WGo.mouseBestMove;
            var variations = bestMove.variation;
            for (var s = 0; s < variations.length&&s<WGo.display_var_length; s++) {
                var data = variations[s].split("_");
                this.player.kifuReader.node.appendChild(new WGo.KNode({
                    move: {
                        x: parseInt(data[0]),
                        y: parseInt(data[1]),
                        c: this.player.kifuReader.game.turn
                        // ,
                        // movenum: WGo.editMoveNum
                    },
                    _edited: true
                }));
                this.player.next_edit(this.player.kifuReader.node.children.length - 1);
                //	WGo.editMoveNum++;
            }
            //	WGo.isEditPlaying=false;
            WGo.isMouseOnBestMove = false;
        } else
            {
            if (this.player.frozen || !this.player.kifuReader.game.isValid(x, y)) return;
            this.player.kifuReader.node.appendChild(new WGo.KNode({
                move: {
                    x: x,
                    y: y,
                    c: this.player.kifuReader.game.turn,
                    //	movenum: WGo.editMoveNum
                },
                _edited: true
            }));
            // var p = WGo.clone(this.player.kifuReader.path);
            // p.m += 1;
            // this.player.goTo(p);
            this.player.next_edit(this.player.kifuReader.node.children.length - 1);
            //	WGo.editMoveNum++;
        }
    }

    if (WGo.BasicPlayer && WGo.BasicPlayer.component.Control) {
        return;
        WGo.BasicPlayer.component.Control.menu.push({
            constructor: WGo.BasicPlayer.control.MenuItem,
            args: {
                name: "editmode",
                togglable: true,
                click: function (player) {
                    if (WGo.editClicked)
                        return;
                    this._editable = this._editable || new WGo.Player.Editable(player, player.board);
                    this._editable.set(!this._editable.editMode);
                    if (!this._editable.editMode) {
                        WGo.curBoard.removeAllObjectsOutLine();
                        WGo.editMode = false;
                        WGo.editMoveNum = 1;
                    } else {
                        WGo.editMoveNum = 1;
                        WGo.editMode = true;
                        if (WGo.isMouseOnBestMove) {
                            WGo.editClicked = true;
                            setTimeout(function () {
                                WGo.editClicked = false;
                            }, 500);
                            var bestMove = WGo.mouseBestMove;
                            var variations = bestMove.variation;
                            for (var s = 0; s < variations.length; s++) {
                                var data = variations[s].split("_");
                                WGo.curPlayer.kifuReader.node.appendChild(new WGo.KNode({
                                    move: {
                                        x: parseInt(data[0]),
                                        y: parseInt(data[1]),
                                        c: WGo.curPlayer.kifuReader.game.turn,
                                        movenum: WGo.editMoveNum
                                    },
                                    _edited: true
                                }));
                                WGo.curPlayer.next_edit(WGo.curPlayer.kifuReader.node.children.length - 1);
                            }
                            //	WGo.isEditPlaying=false;
                            WGo.isMouseOnBestMove = false;
                        }
                    }
                    return this._editable.editMode;
                    WGo.editMoveNum++;
                },
                init: function (player) {
                    var _this = this;
                    player.addEventListener("frozen", function (e) {
                        _this._disabled = _this.disabled;
                        if (!_this.disabled) _this.disable();
                    });

                    player.addEventListener("unfrozen", function (e) {
                        if (!_this._disabled) _this.enable();
                        delete _this._disabled;
                    });
                },
            }
        });
    }

    WGo.i18n.en["editmode"] = "Edit mode";

})(WGo);
