(function (WGo, undefined) {

    WGo.SGF = {};

    var size = 19;
    var to_num = function (str, i) {
        return str.charCodeAt(i) - 97;
    }

    var sgf_player_info = function (type, black, kifu, node, value, ident) {
        var c = ident == black ? "black" : "white";
        kifu.info[c] = kifu.info[c] || {};
        if(type=="name")
        {  var devicewidth = document.documentElement.clientWidth;
         var deviceheight = document.documentElement.clientHeight;
        if (deviceheight > devicewidth&&getStrLen(value[0])>9)
        {
        kifu.info[c][type] = value[0].substring(0,getFirst6(value[0]));
        }
        else
            kifu.info[c][type] = value[0];
        }
        else
            kifu.info[c][type] = value[0];
    }

    var getStrLen=  function (val) {
        var len = 0;
        for (var i = 0; i < val.length; i++) {
            var a = val.charAt(i);
            if (a.match(/[^\x00-\xff]/ig) != null) {
                len += 2;
            }
            else {
                len += 1;
            }
        }
        return len;
    };

    var getFirst6=  function (val) {
        var len = 0;
        var truelen=0;
        for (var i = 0; i < val.length; i++) {
            var a = val.charAt(i);
            if (a.match(/[^\x00-\xff]/ig) != null) {
                len += 2;
            }
            else {
                len += 1;
            }
            truelen+=1;
            if(len>9)
                return truelen;
        }
        return truelen;
    };

    var getFirst10=  function (val) {
        var len = 0;
        var truelen=0;
        for (var i = 0; i < val.length; i++) {
            var a = val.charAt(i);
            if (a.match(/[^\x00-\xff]/ig) != null) {
                len += 2;
            }
            else {
                len += 1;
            }
            truelen+=1;
            if(len>20)
                return truelen;
        }
        return truelen;
    };
// handling properties specifically
    var properties = WGo.SGF.properties = {}

// Move properties
    properties["B"] = properties["W"] = function (kifu, node, value, ident) {
        if (!value[0] || (kifu.size <= 19 && value[0] == "tt")) node.move = {
            pass: true,
            c: ident == "B" ? WGo.B : WGo.W
        };
        else node.move = {
            x: to_num(value[0], 0),
            y: to_num(value[0], 1),
            c: ident == "B" ? WGo.B : WGo.W
        };
    }

// Setup properties
    properties["AB"] = properties["AW"] = function (kifu, node, value, ident) {
        for (var i in value) {
            node.addSetup({
                x: to_num(value[i], 0),
                y: to_num(value[i], 1),
                c: ident == "AB" ? WGo.B : WGo.W
            });
        }
    }
    properties["AE"] = function (kifu, node, value) {
        for (var i in value) {
            node.addSetup({
                x: to_num(value[i], 0),
                y: to_num(value[i], 1),
            });
        }
    }
    properties["PL"] = function (kifu, node, value) {
        node.turn = (value[0] == "b" || value[0] == "B") ? WGo.B : WGo.W;
    }

// Node annotation properties
    properties["C"] = function (kifu, node, value) {
        if (!node.comment)
            node.comment = value.join();
        else
            node.comment += "\r\n" + value.join();
        var comm = node.comment;
        if (comm)
            node.comment = comm.replace('\n', ' ');
        //substring(0,comm.indexOf('\r\n'))+" "+comm.substring(comm.indexOf('\r\n'));
    }

// LZ properties
    properties["LZ"] = function (kifu, node, value) {
        //node.comment = value.join();
        //var strs= new Array(); //定义一数组
        var strs = value.toString().split("\n"); //字符分割
        if (strs.length >= 2) {
            var staticInfo = strs[0].split(" ");

            if (staticInfo.length == 3) {
                // if (!node.comment)
                node.engine=staticInfo[0];
                if(getStrLen(staticInfo[0])>20)
                    node.enginemin=staticInfo[0].substring(0,getFirst10(staticInfo[0]));
                    node.comment2 ="\n"+WGo.t("winrate")+":" + staticInfo[1] +"　"+WGo.t("totalPlayouts")+":"+ staticInfo[2];
            }
            if (staticInfo.length >= 4) {
                // if (!node.comment)
                node.engine=staticInfo[0];
                if(getStrLen(staticInfo[0])>20)
                    node.enginemin=staticInfo[0].substring(0,getFirst10(staticInfo[0]));
                    node.comment2 = "\n"+WGo.t("winrate")+":" + staticInfo[1] + "　"+WGo.t("score")+":" + staticInfo[3] + "　"+WGo.t("totalPlayouts")+":" + staticInfo[2];
            }
            var moveInfo = strs[1].split(" info ");
            // if(!node.comment)
            // 	node.comment =strs[1];
            // else
            // 	node.comment +="\r\n"+strs[1];
            node.bestMoves = new Array();
            var maxplayouts = 0;
            var totalplayouts = 0;
            for (var i = 0; i < 10 && i < moveInfo.length; i++) {
                var data = moveInfo[i].trim().split(" ");
                for (var j = 0; j < data.length; j++) {
                    var key = data[j];
                    if (key == ("visits")) {
                        var value = data[++j];
                        var playouts = parseInt(value);
                        totalplayouts += playouts;
                        if (playouts > maxplayouts)
                            maxplayouts = playouts;
                    }
                }
            }

            //var s=0;
            for (var i = 0; i < 10 && i < moveInfo.length; i++) {
                var bestMove = new Object();
                //document.write(moveInfo[i]+"<br/>"+moveInfo.length+"<br/>"); //分割后的字符输出
                var data = moveInfo[i].trim().split(" ");
                if (data.length > 2) {
                    for (var j = 0; j < data.length; j++) {
                        var key = data[j];
                        if (key == ("pv")) {
                            // Read variation to the end of line
                            //bestMove.variation = data.slice(j + 1, data.length);
                            var list = data.slice(j + 1, data.length);
                            for (var n = 0; n < list.length; n++) {
                                var coords = list[n];
                                var x = coords.charCodeAt(0) - 'a'.charCodeAt(0);
                                if (x < 0) x += 'a'.charCodeAt(0) - 'A'.charCodeAt(0);
                                if (x > 7) x--;
                                var y = (coords.charCodeAt(1) - '0'.charCodeAt(0));
                                if (coords.length > 2) y = y * 10 + (coords.charCodeAt(2) - '0'.charCodeAt(0));
                                y = size - y;
                                list[n] = x + "_" + y;
                            }
                            bestMove.variation = list;
                            break;
                        } else {
                            var value = data[++j];
                            if (key == "move") {
                                bestMove.coordinate = value.toString();
                                var coords = value.toString();
                                var x = coords.charCodeAt(0) - 'a'.charCodeAt(0);
                                if (x < 0) x += 'a'.charCodeAt(0) - 'A'.charCodeAt(0);
                                if (x > 7) x--;
                                var y = (coords.charCodeAt(1) - '0'.charCodeAt(0));
                                if (coords.length > 2) y = y * 10 + (coords.charCodeAt(2) - '0'.charCodeAt(0));
                                y = size - y;
                                bestMove.x = x;
                                bestMove.y = y;
                            }
                            if (key == "visits") {
                                bestMove.playouts = parseInt(value);
                                bestMove.totalplayouts = totalplayouts;
                                if (node.bestMoves.length == 0) {
                                    bestMove.percentplayouts = 2.5;
                                    bestMove.percentplayouts2 = parseInt(value).toFixed(1) / maxplayouts;
                                } else {
                                    bestMove.percentplayouts = parseInt(value).toFixed(1) / maxplayouts;
                                    bestMove.percentplayouts2 = bestMove.percentplayouts;
                                }
                            }
                            if (key == "winrate") {
                                // support 0.16 0.15
                                bestMove.winrate = parseInt(value) / 100.0;
                            }
                            if (key == "scoreMean") {
                                // support 0.16 0.15
                                bestMove.scoreMean = parseFloat(value);
                                bestMove.isKataData = true;
                                if (!WGo.isKataData) {
                                    WGo.isKataData = true;
                                    WGo.kataShowMean = true;
                                    if (WGo.meanPo) {
                                        WGo.meanPo.style.display = "inline";
                                        if(WGo.DZ)
                                        {
                                            WGo.kataShowMean = false;
                                            WGo.meanPo.innerHTML=WGo.t("score");
                                        }

                                    }
                                }
                            }
                        }
                    }
                    if (bestMove.coordinate) {
                        node.bestMoves.push(bestMove);
                    }
                }
            }
        }
    }

    // FIT properties
    properties["FIT"] = function (kifu, node, value) {
        //node.comment = value.join();
        //var strs= new Array(); //定义一数组
        var fitRat = parseFloat(value);
        node.fitRat=fitRat;
    }

// Markup properties
    properties["LB"] = function (kifu, node, value) {
        for (var i in value) {
            node.addMarkup({
                x: to_num(value[i], 0),
                y: to_num(value[i], 1),
                type: "LB",
                text: value[i].substr(3)
            });
        }
    }
    properties["CR"] = properties["SQ"] = properties["TR"] = properties["SL"] = properties["MA"] = function (kifu, node, value, ident) {
        for (var i in value) {
            node.addMarkup({
                x: to_num(value[i], 0),
                y: to_num(value[i], 1),
                type: ident
            });
        }
    }

// Root properties
    properties["SZ"] = function (kifu, node, value) {
        kifu.size = parseInt(value[0]);
        size = kifu.size;
    }



// Game info properties
    properties["BR"] = properties["WR"] = sgf_player_info.bind(this, "rank", "BR");
        properties["PB"] = properties["PW"] = sgf_player_info.bind(this, "name", "PB");
    properties["BT"] = properties["WT"] = sgf_player_info.bind(this, "team", "BT");
    properties["TM"] = function (kifu, node, value, ident) {
        kifu.info[ident] = value[0];
        node.BL = value[0];
        node.WL = value[0];
    }
    properties["DZ"] = function (kifu, node, value) {
        if (value[0]=="KB")
        {
            WGo.DZ=true;
            WGo.KB=true;
        }
        else if  (value[0]=="KW")
        {
            WGo.DZ=true;
            WGo.KW=true;
        }
        else if  (value[0]=="Y") {
            WGo.DZ=true;
        }
    else
            WGo.DZ=false;
            }


    var reg_seq = /\(|\)|(;(\s*[A-Za-z]+\s*((\[\])|(\[(.|\s)*?(([^\\]|[^\\]\\\\)\])))+)*)/g;
    var reg_node = /[A-Z]+\s*((\[\])|(\[(.|\s)*?(([^\\]|[^\\]\\\\)\])))+/g;
    var reg_ident = /[A-Z]+/;
    var reg_props = /(\[\])|(\[(.|\s)*?(([^\\]|[^\\]\\\\)\]))/g;


    function getNowFormatDate() {
        var date = new Date();
        var month = date.getMonth() + 1;
        var strDate = date.getDate();
        if (month >= 1 && month <= 9) {
            month = "0" + month;
        }
        if (strDate >= 0 && strDate <= 9) {
            strDate = "0" + strDate;
        }
        var currentdate = ""+date.getFullYear() +  month +  strDate
            + date.getHours()   + date.getMinutes()
            + date.getSeconds();
        return currentdate;
    }
// parse SGF string, return WGo.Kifu object
    WGo.SGF.parse = function (str) {

        var stack = [],
            sequence, props, vals, ident,
            kifu = new WGo.Kifu(),
            node = null;

        // make sequence of elements and process it
        sequence = str.match(reg_seq);

        for (var i in sequence) {
            // push stack, if new variant
            if (sequence[i] == "(") stack.push(node);

            // pop stack at the end of variant
            else if (sequence[i] == ")") node = stack.pop();

            // reading node (string starting with ';')
            else {
                // create node or use root
                if (node) kifu.nodeCount++;
                node = node ? node.appendChild(new WGo.KNode()) : kifu.root;

                // make array of properties
                props = sequence[i].match(reg_node) || [];
                kifu.propertyCount += props.length;

                // insert all properties to node
                for (var j in props) {
                    // get property's identificator
                    ident = reg_ident.exec(props[j])[0];

                    // separate property's values
                    vals = props[j].match(reg_props);

                    // remove additional braces [ and ]
                    for (var k in vals) vals[k] = vals[k].substring(1, vals[k].length - 1).replace(/\\(?!\\)/g, "");

                    // call property handler if any

                    if (WGo.SGF.properties[ident]) WGo.SGF.properties[ident](kifu, node, vals, ident);
                    else {
                        // if there is only one property, strip array
                        if (vals.length <= 1) vals = vals[0];

                        // default node property saving
                        if (node.parent) node[ident] = vals;

                        // default root property saving
                        else {
                            kifu.info[ident] = vals;
                        }
                    }
                }
            }
        }
        WGo.mianKifu = kifu;
        var nodes=kifu.root;
        //尚需优化,所有分支首位是pass的问题
        while(nodes.children&&nodes.children[0])
        {
            nodes=nodes.children[0];
            if(nodes.children[1])
                if(nodes.children[1].move.pass)
                {
                    if(nodes.children[1].children)
                        if(nodes.children[1].children[0])
                        {
                            nodes.children[1].children[0].parent=nodes;
                            nodes.children[1]=nodes.children[1].children[0]
                        }
                }
        }
        WGo.drawWinrate();

        var o = document.getElementById("main2");
if(kifu.info.black&&kifu.info.black.name&&kifu.info.white&&kifu.info.white.name)
{  if( WGo.uploader)
        o.setAttribute( "download", WGo.uploader+"_"+kifu.info.black.name+"_vs"+kifu.info.white.name+getNowFormatDate() + ".sgf");
        else
           o.setAttribute( "download", kifu.info.black.name+"_vs_"+kifu.info.white.name+getNowFormatDate() + ".sgf");
}
        //     o.setAttribute("download", kifu.info.black.name+"_vs_"+kifu.info.white.name+"_"+getNowFormatDate()+".sgf");


        function bodyScale() {
            var devicewidth = document.documentElement.clientWidth;
            var deviceheight = document.documentElement.clientHeight;
            var scale = devicewidth / 600;  // 分母——设计稿的尺寸
            //if(deviceheight>devicewidth)
            var scale2 = deviceheight / 895;
            document.body.style.zoom = Math.min(scale, scale2);
            WGo.trueScale = Math.min(scale, scale2);
        }


        // function IsPC() {
        //     var userAgentInfo = navigator.userAgent;
        //     var Agents = ["Android", "iPhone",
        //         "SymbianOS", "Windows Phone",
        //         "iPad", "iPod"];
        //     var flag = true;
        //     for (var v = 0; v < Agents.length; v++) {
        //         if (userAgentInfo.indexOf(Agents[v]) > 0) {
        //             flag = false;
        //             break;
        //         }
        //     }
        //     return flag;
        // }
        //
        // var isPC = IsPC();
        WGo.editMoveNum = 1;

//if(!isPC)
        //bodyScale();


        return kifu;
    }
})(WGo);