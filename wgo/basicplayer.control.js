(function (WGo, undefined) {

    "use strict";

    var compare_widgets = function (a, b) {
        if (a.weight < b.weight) return -1;
        else if (a.weight > b.weight) return 1;
        else return 0;
    }

    var prepare_dom = function (player) {

        this.iconBar = document.createElement("div");
        this.iconBar.className = "wgo-control-wrapper";
        this.element.appendChild(this.iconBar);

        var widget;

        for (var w in Control.widgets) {
            widget = new Control.widgets[w].constructor(player, Control.widgets[w].args);
            widget.appendTo(this.iconBar);
            this.widgets.push(widget);
        }
    }

    var Control = WGo.extendClass(WGo.BasicPlayer.component.Component, function (player) {
        this.super(player);

        this.widgets = [];
        this.element.className = "wgo-player-control";

        prepare_dom.call(this, player);
    });

    function IsPC() {
        var userAgentInfo = navigator.userAgent;
        var Agents = ["Android", "iPhone",
            "SymbianOS", "Windows Phone",
            "iPad", "iPod"];
        var flag = true;
        for (var v = 0; v < Agents.length; v++) {
            if (userAgentInfo.indexOf(Agents[v]) > 0) {
                flag = false;
                break;
            }
        }
        return flag;
    }


    Control.prototype.updateDimensions = function () {

        var ispc = IsPC(); //true为PC端，false为手机端
        if (ispc) {
            this.element.className = "wgo-player-control";
            //	this.element.className =  "wgo-player-control";
        } else {
            this.element.className = "wgo-player-control wgo-440";
        }
        // if(this.element.clientWidth < 340) this.element.className = "wgo-player-control wgo-340";
        // else if(this.element.clientWidth < 440) this.element.className = "wgo-player-control wgo-440";
        // else this.element.className = "wgo-player-control";
    }

    var control = WGo.BasicPlayer.control = {};

    var butupd_first = function (e) {
        // if (!e.node.parent && !this.disabled) this.disable();
        // else
            if (e.node.parent && this.disabled) this.enable();
    }

    var butupd_last = function (e) {
        // if (!e.node.children.length && !this.disabled) this.disable();
        // else
            if (e.node.children.length && this.disabled) this.enable();
    }

    var but_frozen = function (e) {
        this._disabled = this.disabled;
        if (!this.disabled) this.disable();
    }

    var but_unfrozen = function (e) {
        if (!this._disabled) this.enable();
        delete this._disabled;
    }

    /**
     * Control.Widget base class. It is used for implementing buttons and other widgets.
     * First parameter is BasicPlayer object, second can be configuratioon object.
     *
     * args = {
     *   name: String, // required - it is used for class name
     *	 init: Function, // other initialization code can be here
     *	 disabled: BOOLEAN, // default false
     * }
     */

    control.Widget = function (player, args) {
        this.element = this.element || document.createElement(args.type || "div");
        this.element.className = "wgo-widget-" + args.name;
        this.init(player, args);
    }

    control.Widget.prototype = {
        constructor: control.Widget,

        /**
         * Initialization function.
         */

        init: function (player, args) {
            if (!args) return;
            if (args.disabled) this.disable();
            if (args.init) args.init.call(this, player);
        },

        /**
         * Append to element.
         */

        appendTo: function (target) {
            target.appendChild(this.element);
        },

        /**
         * Make button disabled - eventual click listener mustn't be working.
         */

        disable: function () {
            this.disabled = true;
            if (this.element.className.search("wgo-disabled") == -1) {
                this.element.className += " wgo-disabled";
            }
        },

        /**
         * Make button working
         */

        enable: function () {
            this.disabled = false;
            this.element.className = this.element.className.replace(" wgo-disabled", "");
            this.element.disabled = "";
        },

    }

    /**
     * Group of widgets
     */

    control.Group = WGo.extendClass(control.Widget, function (player, args) {
        this.element = document.createElement("div");
        this.element.className = "wgo-ctrlgroup wgo-ctrlgroup-" + args.name;

        var widget;
        for (var w in args.widgets) {
            widget = new args.widgets[w].constructor(player, args.widgets[w].args);
            widget.appendTo(this.element);
        }
    });

    /**
     * Clickable widget - for example button. It has click action.
     *
     * args = {
     *   title: String, // required
     *	 init: Function, // other initialization code can be here
     *	 click: Function, // required *** onclick event
     *   togglable: BOOLEAN, // default false
     *	 selected: BOOLEAN, // default false
     *	 disabled: BOOLEAN, // default false
     *	 multiple: BOOLEAN
     * }
     */

    control.Clickable = WGo.extendClass(control.Widget, function (player, args) {
        this.super(player, args);
    });

    control.Clickable.prototype.init = function (player, args) {
        var fn, _this = this;

        if (args.togglable) {
            fn = function () {
                if (_this.disabled) return;
                if (WGo.editClicked)
                    return;
                if (args.click.call(_this, player)) _this.select();
                else _this.unselect();
            };
        } else {
            fn = function () {
                if (_this.disabled) return;
                args.click.call(_this, player);
            };
        }

        this.element.addEventListener("click", fn);
        this.element.addEventListener("touchstart", function (e) {
            e.preventDefault();
            fn();
            if (args.multiple) {
                _this._touch_i = 0;
                _this._touch_int = window.setInterval(function () {
                    if (_this._touch_i > 500) {
                        fn();
                    }
                    _this._touch_i += 100;
                }, 100);
            }
            return false;
        });

        if (args.multiple) {
            this.element.addEventListener("touchend", function (e) {
                window.clearInterval(_this._touch_int);
            });
        }

        if (args.disabled) this.disable();
        if (args.init) args.init.call(this, player);
    };

    control.Clickable.prototype.select = function () {
        this.selected = true;
        if (this.element.className.search("wgo-selected") == -1) this.element.className += " wgo-selected";
    };

    control.Clickable.prototype.unselect = function () {
        this.selected = false;
        this.element.className = this.element.className.replace(" wgo-selected", "");
    };

    /**
     * Widget of button with image icon.
     */

    control.Button = WGo.extendClass(control.Clickable, function (player, args) {
        var elem = this.element = document.createElement("button");
        elem.className = "wgo-button wgo-button-" + args.name;
        if(args.name==="multiprev")
            elem.id="multiprev";
            if(args.name==="multinext")
                elem.id="multinext";
        elem.title = WGo.t(args.name);
        this.init(player, args);
    });

    control.Button2 = WGo.extendClass(control.Clickable, function (player, args) {
        var elem = this.element = document.createElement("button");
        elem.className = "wgo-button2 wgo-button2-" + args.name;
        if(args.name==="menu2")
            elem.title = WGo.t("score-po");
        else
        elem.title = WGo.t(args.name);
        this.init(player, args);
    });
    control.Button3 = WGo.extendClass(control.Clickable, function (player, args) {
        var elem = this.element = document.createElement("button");
        elem.className = "wgo-button3 wgo-button3-" + args.name;
        if(args.name==="menu")
            elem.id="bottommenu";
        elem.title = WGo.t(args.name);
        this.init(player, args);
    });

    control.Button.prototype.disable = function () {
        control.Button.prototype.super.prototype.disable.call(this);
        this.element.disabled = "disabled";
    }

    control.Button.prototype.enable = function () {
        control.Button.prototype.super.prototype.enable.call(this);
        this.element.disabled = "";
    }

    /**
     * Widget used in menu
     */

    control.MenuItem = WGo.extendClass(control.Clickable, function (player, args) {

        var elem = this.element = document.createElement("div");
        elem.className = "wgo-menu-item wgo-menu-item-" + args.name;
        elem.title = WGo.t(args.name);
        elem.innerHTML = elem.title;
        if(args.badid==1)
            if(!WGo.badMoveListB)
                elem.style.display ="none";
        if(args.badid==2)
            if(!WGo.badMoveListBS)
                elem.style.display ="none";
        if(args.badid==3)
            if(!WGo.badMoveListW)
                elem.style.display ="none";
        if(args.badid==4)
            if(!WGo.badMoveListWS)
                elem.style.display ="none";
        this.init(player, args);
    });


    control.MenuFile = WGo.extendClass(control.Clickable, function (player, args) {
        var elem = this.element = document.createElement("div");
        elem.className = "wgo-menu-item wgo-menu-item-" + args.name;
        // if(!WGo.isPC)
        //     elem.style.display="none";
        elem.title = WGo.t(args.name);
        elem.innerHTML = elem.title;
        this.init(player, args);
    });



    /**
     * Widget for move counter.
     */

    control.MoveNumber = WGo.extendClass(control.Widget, function (player) {
        this.element = document.createElement("form");
        this.element.className = "wgo-player-mn-wrapper";

        var move = this.move = document.createElement("input");
        move.type = "text";
        move.value = "0";
        if (!WGo.isPC && !WGo.isWideMode)
            move.onfocus = function () {
                move.blur();
                if(WGo.lastNext)
                    player.next();
                    else if(WGo.lastPrev)
                    player.previous();

            };
        move.maxlength = 3;
        move.className = "wgo-player-mn-value";
        this.element.appendChild(move);
        this.element.onsubmit = move.onchange = function (player) {
            player.goTo(this.getValue());
            return false;
        }.bind(this, player);
        player.addEventListener("update", function (e) {
            this.setValue(e.path.m);
        }.bind(this));

        player.addEventListener("kifuLoaded", this.enable.bind(this));
        player.addEventListener("frozen", this.disable.bind(this));
        player.addEventListener("unfrozen", this.enable.bind(this));
        //init: this.onfocus="this.blur();";
    });

    control.MoveNumber.prototype.disable = function () {
        control.MoveNumber.prototype.super.prototype.disable.call(this);
        this.move.disabled = "disabled";
    };

    control.MoveNumber.prototype.enable = function () {
        control.MoveNumber.prototype.super.prototype.enable.call(this);
        this.move.disabled = "";
    };

    control.MoveNumber.prototype.setValue = function (n) {
        this.move.value = n;
    };

    control.MoveNumber.prototype.getValue = function () {
        return parseInt(this.move.value);
    };

// display menu
    var player_menu = function (player) {
        if (player._menu_tmp) {
            delete player._menu_tmp;
            return;
        }
        if (!player.menu) {
            player.menu = document.createElement("div");
            player.menu.className = "wgo-player-menu";
            player.menu.style.position = "absolute";
            player.menu.style.display = "none";

            this.element.parentElement.appendChild(player.menu);

            var widget;
            for (var i in Control.menu) {
                widget = new Control.menu[i].constructor(player, Control.menu[i].args, true);
                widget.appendTo(player.menu);
            }
        }

        if (player.menu.style.display != "none") {
            player.menu.style.display = "none";
            if(WGo.isPC)
            document.removeEventListener("click", player._menu_ev);
            else
            document.removeEventListener("touchstart", player._menu_ev);
            delete player._menu_ev;

            this.unselect();
            return false;
        } else {
            player.menu.style.display = "block";

            var top = this.element.offsetTop;
            var left = this.element.offsetLeft;

            // kinda dirty syntax, but working well
            if (this.element.parentElement.parentElement.parentElement.parentElement == player.regions.bottom.wrapper) {
                player.menu.style.left = left + "px";
                player.menu.style.top = (top - player.menu.offsetHeight + 1) + "px";
            } else {
                player.menu.style.left = left + "px";
                player.menu.style.top = (top + this.element.offsetHeight) + "px";
            }

            player._menu_ev = player_menu.bind(this, player)
            player._menu_tmp = true;
            if(WGo.isPC)
            document.addEventListener("click", player._menu_ev);
      else
            document.addEventListener("touchstart", player._menu_ev);

            return true;
        }
    }

    /**
     * List of widgets (probably MenuItem objects) to be displayed in drop-down menu.
     */




    Control.menu = [
        {   constructor: control.MenuItem,
            args: {
                name: "about",
                togglable: false,
                click: function (player) {
                    player.showMessage(WGo.t("about-text"));
                }
            }
        },
        {   constructor: control.MenuFile,
            args: {
                name: "localSgf",
                togglable: false,
                click: function () {
                    // setTimeout(function(){  }, 100);
                    document.getElementById('up').click();
                }
            }
        },
        {   constructor: control.MenuItem,
            args: {
                name: "findBlackWinrateBlunder",
                badid:1,
                //togglable: true,
                click: function () {
                    WGo.showBadBlack=!WGo.showBadBlack;
                    if(WGo.showBadWhite)
                    {
                        WGo.showBadWhite=false;
                        WGo.showBadelemetW.unselect();
                    }
                    if(WGo.showBadWhiteS)
                    {
                        WGo.showBadWhiteS=false;
                        WGo.showBadelemetWS.unselect();
                    }
                    if(WGo.showBadBlackS)
                    {
                        WGo.showBadBlackS=false;
                        WGo.showBadelemetBS.unselect();
                    }
                    if(WGo.showBadBlack)
                    {
                        this.select();
                        WGo.setBadMove(true,true);
                    }
                    else
                    {
                        this.unselect();
                        WGo.isShowingBadMoves=false;
                        WGo.setCommentsMove(WGo.curCommentUpdate);
                    }


                },
                init: function () {
                    WGo.showBadelemetB=this;
                }
            }
        },
        {   constructor: control.MenuItem,
            args: {
                name: "findBlackScoreBlunder",
                badid:2,
                //togglable: true,
                click: function () {
                    WGo.showBadBlackS=!WGo.showBadBlackS;
                    if(WGo.showBadWhite)
                    {
                        WGo.showBadWhite=false;
                        WGo.showBadelemetW.unselect();
                    }
                    if(WGo.showBadWhiteS)
                    {
                        WGo.showBadWhiteS=false;
                        WGo.showBadelemetWS.unselect();
                    }
                    if(WGo.showBadBlack)
                    {
                        WGo.showBadBlack=false;
                        WGo.showBadelemetB.unselect();
                    }
                    if(WGo.showBadBlackS)
                    {
                        this.select();
                        WGo.setBadMove(true,false);
                    }
                    else
                    {
                        this.unselect();
                        WGo.isShowingBadMoves=false;
                        WGo.setCommentsMove(WGo.curCommentUpdate);
                    }


                },
                init: function () {
                    WGo.showBadelemetBS=this;
                }
            }
        },
        {   constructor: control.MenuItem,
            args: {
                name: "findWhiteWinrateBlunder",
                badid:3,
               // togglable: true,
                click: function () {
                    WGo.showBadWhite=!WGo.showBadWhite;
                    if(WGo.showBadBlack)
                    {
                        WGo.showBadBlack=false;
                        WGo.showBadelemetB.unselect();
                    }
                    if(WGo.showBadWhiteS)
                    {
                        WGo.showBadWhiteS=false;
                        WGo.showBadelemetWS.unselect();
                    }
                    if(WGo.showBadBlackS)
                    {
                        WGo.showBadBlackS=false;
                        WGo.showBadelemetBS.unselect();
                    }
                    if(WGo.showBadWhite)
                    {    this.select();
                    WGo.setBadMove(false,true);
                }
                else
                    {  this.unselect();
                    WGo.isShowingBadMoves=false;
                        WGo.setCommentsMove(WGo.curCommentUpdate);
                    }

                },
                init: function () {
                    WGo.showBadelemetW=this;
                }
            }
        },
        {   constructor: control.MenuItem,
            args: {
                name: "findWhiteScoreBlunder",
                badid:4,
                // togglable: true,
                click: function () {
                    WGo.showBadWhiteS=!WGo.showBadWhiteS;
                    if(WGo.showBadBlack)
                    {
                        WGo.showBadBlack=false;
                        WGo.showBadelemetB.unselect();
                    }
                    if(WGo.showBadWhite)
                    {
                        WGo.showBadWhite=false;
                        WGo.showBadelemetW.unselect();
                    }
                    if(WGo.showBadBlackS)
                    {
                        WGo.showBadBlackS=false;
                        WGo.showBadelemetBS.unselect();
                    }
                    if(WGo.showBadWhiteS)
                    {    this.select();
                        WGo.setBadMove(false,false);
                    }
                    else
                    {  this.unselect();
                        WGo.isShowingBadMoves=false;
                        WGo.setCommentsMove(WGo.curCommentUpdate);
                    }

                },
                init: function () {
                    WGo.showBadelemetWS=this;
                }
            }
        },
        {   constructor: control.MenuItem,
            args: {
                name: "winrateGraph",
                badid:5,
                // togglable: true,
                click: function () {
                    WGo.showFitRat=!WGo.showFitRat;
                    if(WGo.showFitRat)
                    {this.unselect();
                        WGo.showFitRatPane.select();
                    }
                    else
                    {this.select();
                        WGo.showFitRatPane.unselect();
                    }
                    WGo.drawWinrate();
                    WGo.drawWinrate2();
                },
                init: function () {
                    this.select();
                    WGo.showWinratePane=this;
                }
            }
        },
        {   constructor: control.MenuItem,
            args: {
                name: "accuracyLine",
                badid:6,
                // togglable: true,
                click: function () {
                    WGo.showFitRat=!WGo.showFitRat;
                    if(WGo.showFitRat)
                    { this.select();
                        WGo.showWinratePane.unselect();
                    }
                    else
                    {this.unselect();
                        WGo.showWinratePane.select();
                    }
                    WGo.drawWinrate();
                    WGo.drawWinrate2();
                },
                init: function () {
                    WGo.showFitRatPane=this;
                }
            }
        },
        {
        constructor: control.MenuItem,
        args: {
            name: "switch-coo",
            togglable: true,
            click: function (player) {
                player.setCoordinates(!player.coordinates);
                return player.coordinates;
            },
            init: function (player) {
                if (player.coordinates) this.select();
            }
        }
    }
    ];

    /**
     * List of widgets (probably Button objects) to be displayed.
     *
     * widget = {
     *	 constructor: Function, // construct a instance of widget
     *	 args: Object,
     * }
     */
    // var clickedMC = false;
    var interval;
    var togglePoScoreMean=function(){
        if(!WGo.isKataData)
            return;
      //  clickedMC = !clickedMC;
        if (WGo.kataShowMean) {
            WGo.menuPoScoreMean.element.innerText =  WGo.t("score");
            WGo.kataShowMean = false;
        } else {
            WGo.menuPoScoreMean.element.innerText =  WGo.t("playouts");
            WGo.kataShowMean = true;
        }
        WGo.curBoard.redrawBM();
    };
    WGo.togglePoScoreMean=togglePoScoreMean;
    var toggleTryPlay=function(player){
            WGo.clickedMC = !WGo.clickedMC;
            if (WGo.clickedMC)
                WGo.tryPlay.element.innerText =WGo.t("back");
            else
                WGo.tryPlay.element.innerText = WGo.t("tryplay");
            if (WGo.editClicked)
                return;
        WGo.tryPlay._editable =  WGo.tryPlay._editable || new WGo.Player.Editable(player, player.board);
        WGo.tryPlay._editable.set(! WGo.tryPlay._editable.editMode);
            if (! WGo.tryPlay._editable.editMode) {
                WGo.curBoard.removeAllObjectsMoveNum();
                WGo.curBoard.removeAllObjectsOutLine();
                var node=WGo.curNode;
                var lastMark = new Object();
                lastMark.type="TRS";
                lastMark.x= node.move.x;
                lastMark.y=node.move.y;
                WGo.curBoard.addObject(lastMark);
                WGo.editMode = false;
                WGo.editMoveNumStart = 1;
                WGo.firsEditPlayed = false;
                //		WGo.editMoveNum=1;
                if (!WGo.isShowingMoveNum)
                    WGo.tryPlay._marker._unbindEvent();
                else {
                    if (WGo.moveMaker)
                        WGo.moveMaker._bindEvent();
                }
            } else {
                WGo.curBoard.removeAllObjectsMoveNum();
                WGo.editMode = true;
                WGo.editMoveNumStart = player.kifuReader.path.m;
                //if(!WGo.Player.Marker)
                if ( WGo.tryPlay._marker && WGo.editUnbind) {
                    WGo.tryPlay._marker._bindEvent();
                    WGo.editUnbind = false;
                } else
                    WGo.tryPlay._marker = new WGo.Player.Marker(player, player.board);

                //	WGo.editMoveNum=1;
                if (WGo.isMouseOnBestMove) {
                    WGo.editClicked = true;
                    setTimeout(function () {
                        WGo.editClicked = false;
                    }, 500);
                    var bestMove = WGo.mouseBestMove;
                    var variations = bestMove.variation;
                    for (var s = 0; s < variations.length&&s<WGo.display_var_length; s++) {
                        var data = variations[s].split("_");
                        WGo.curPlayer.kifuReader.node.appendChild(new WGo.KNode({
                            move: {
                                x: parseInt(data[0]),
                                y: parseInt(data[1]),
                                c: WGo.curPlayer.kifuReader.game.turn,
                                //movenum: WGo.editMoveNum
                            },
                            _edited: true
                        }));
                        WGo.curPlayer.next_edit(WGo.curPlayer.kifuReader.node.children.length - 1);
                        //	WGo.editMoveNum++;
                    }
                    //	WGo.isEditPlaying=false;
                    WGo.isMouseOnBestMove = false;
                }
            }
    };
    WGo.toggleTryPlay=toggleTryPlay;
    var toggleAutoPlay=function(){
        if (interval) {
            clearInterval(interval);
            WGo.autoPlay.element.innerText = WGo.t("auto");
            interval = null;
            WGo.isAutoMode = false;
        } else {
            WGo.autoPlay.element.innerText =WGo.t("stop");
            WGo.isAutoMode = true;
            interval = setInterval(function autoMode() {
                if (WGo.isMouseOnBestMove) {
                    if (WGo.display_var_length)
                        if (WGo.display_var_length < 0) {
                            WGo.display_var_length = 1;
                            WGo.curBoard.redraw();
                        } else if (WGo.display_var_length < WGo.var_length) {
                            WGo.display_var_length++;
                            WGo.curBoard.redraw();
                        }
                }
            }, 700);
        }
    };
    WGo.toggleAutoPlay=toggleAutoPlay;
    Control.widgets = [
        {
            constructor: control.Group,
            args: {
                name: "left",
                widgets: [{
                    constructor: control.Button3,
                    args: {
                        name: "menu",
                        togglable: true,
                        click: player_menu,
                    }
                },
                ]
            }
        },
        {

            constructor: control.Group,

            args: {
                name: "control",
                widgets: [


                    {
                        constructor: control.Button2,
                        args: {
                            name: "menu2",
                            // togglable: true,
                            click:
                                function () {
                                    togglePoScoreMean();
                                },
                            init:
                                function () {

                                    WGo.menuPoScoreMean=this;
                                    this.element.innerText = WGo.t("playouts");
                                    this.element.style.fontSize = 12 + 'px';
                                    WGo.meanPo = this.element;
                                    this.element.style.display = "none";
                                }
                        }
                    },
                    {
                        constructor: control.Button2,
                        args: {
                            name: "tryplay",
                            // togglable: true,
                            click:  function (player) {
                                toggleTryPlay(player);
                            },
                            init:
                                function () {
                                    WGo.tryPlay=this;
                                    this.element.innerText = WGo.t("tryplay");
                                    this.element.style.fontSize = 15 + 'px';
                                },
                        }
                    },
                    {
                        constructor: control.Button2,
                        args: {
                            name: "autoplay",
                            // togglable: true,
                            click:
                                function () {
                                    toggleAutoPlay();
                                },
                            init:
                                function () {
                                WGo.autoPlay=this;
                                    this.element.innerText = WGo.t("auto");
                                    this.element.style.fontSize = 15 + 'px';
                                },
                        }
                    }
                    ,
                    {
                        constructor: control.Button3,
                        args: {
                            name: "first",
                            disabled: true,
                            init: function (player) {
                                player.addEventListener("update", butupd_first.bind(this));
                                player.addEventListener("frozen", but_frozen.bind(this));
                                player.addEventListener("unfrozen", but_unfrozen.bind(this));
                            },
                            click: function (player) {
                                player.first();
                            },
                        }
                    }, {
                        constructor: control.Button3,
                        args: {
                            name: "last",
                            disabled: true,
                            init: function (player) {
                                player.addEventListener("update", butupd_last.bind(this));
                                player.addEventListener("frozen", but_frozen.bind(this));
                                player.addEventListener("unfrozen", but_unfrozen.bind(this));
                            },
                            click: function (player) {
                                player.last()
                            },
                        }
                    },
                    {
                        constructor: control.Button,
                        args: {
                            name: "multiprev",
                            disabled: false,
                            multiple: true,
                            init: function (player) {
                                player.addEventListener("update", butupd_first.bind(this));
                                player.addEventListener("frozen", but_frozen.bind(this));
                                player.addEventListener("unfrozen", but_unfrozen.bind(this));
                            },
                            click: function (player) {
                                if (WGo.isMouseOnBestMove) {
                                    WGo.display_var_length = 1;
                                    WGo.curBoard.redrawVar();
                                } else {
                                    var p = WGo.clone(player.kifuReader.path);
                                    p.m -= 10;
                                    player.goTo(p);
                                }
                            },
                        }
                    }, {
                        constructor: control.Button,
                        args: {
                            name: "previous",
                            disabled: false,
                            multiple: true,
                            init: function (player) {
                                player.addEventListener("update", butupd_first.bind(this));
                                player.addEventListener("frozen", but_frozen.bind(this));
                                player.addEventListener("unfrozen", but_unfrozen.bind(this));
                            },
                            click: function (player) {
                                player.previous();
                            },
                        }
                    }, {
                        constructor: control.MoveNumber,
                    }, {
                        constructor: control.Button,
                        args: {
                            name: "next",
                            disabled: true,
                            multiple: true,
                            init: function (player) {
                                player.addEventListener("update", butupd_last.bind(this));
                                player.addEventListener("frozen", but_frozen.bind(this));
                                player.addEventListener("unfrozen", but_unfrozen.bind(this));
                            },
                            click: function (player) {
                                player.next();
                            },
                        }
                    }, {
                        constructor: control.Button,
                        args: {
                            name: "multinext",
                            disabled: true,
                            multiple: true,
                            init: function (player) {
                                player.addEventListener("update", butupd_last.bind(this));
                                player.addEventListener("frozen", but_frozen.bind(this));
                                player.addEventListener("unfrozen", but_unfrozen.bind(this));
                            },
                            click: function (player) {
                                if (WGo.isMouseOnBestMove) {
                                    if (WGo.var_length)
                                        WGo.display_var_length = WGo.var_length;
                                    else
                                        WGo.display_var_length = 1;
                                    WGo.curBoard.redrawVar();
                                } else {
                                    var p = WGo.clone(player.kifuReader.path);
                                    p.m += 10;
                                    player.goTo(p);
                                }
                            },
                        },
                    },
                    // {
                    //     constructor: control.Group,
                    //     args: {
                    //         name: "right",
                    //         widgets: [{
                    //             constructor: control.Button,
                    //             args: {
                    //                 name: "about",
                    //                 click: function (player) {
                    //                     player.showMessage(WGo.t("about-text"));
                    //                 },
                    //             }
                    //         }]
                    //     }
                    // },
                ]
            }
        }];

    var bp_layouts = WGo.BasicPlayer.layouts;
    bp_layouts["right_top"].bottom.push("Control");
    bp_layouts["right"].right.push("Control");
    bp_layouts["one_column"].bottom.push("Control");
    bp_layouts["no_comment"].bottom.push("Control");
    bp_layouts["minimal"].bottom.push("Control");

    var player_terms = {
        "about": "About",
        "first": "First",
        "multiprev": "10 moves back",
        "previous": "Previous",
        "next": "Next",
        "multinext": "10 moves forward",
        "last": "Last",
        "switch-coo": "Display coordinates",
        "menu": "Menu",
        "localSgf": "LocalSGF",
        "findBlackScoreBlunder": "BlunderList(Black)(Score)",
        "findBlackWinrateBlunder":"BlunderList(Black)(Winrate)",
    };

    for (var key in player_terms) WGo.i18n.en[key] = player_terms[key];

    WGo.BasicPlayer.component.Control = Control;

})(WGo);
