var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['lib.js', 'raphael.js', 'colorpicker.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys,
        UID = Brick.env.user.id | 0;

    var FeatureList = function(layer){
        this.init(layer);
    };
    FeatureList.prototype = {
        init: function(layer){
            this._list = [];
            this.layer = layer;
        },
        count: function(){
            return this._list.length;
        },
        add: function(feature){
            this._list[this._list.length] = feature;
            if (this.layer.canvas){
                this.layer.canvas.fireChangedEvent('addfeature', feature);
            }
        },
        foreach: function(f){
            if (!Y.Lang.isFunction(f)){
                return;
            }
            var lst = this._list;
            for (var i = 0; i < lst.length; i++){
                if (f(lst[i], i)){
                    return;
                }
            }
        },
        remove: function(feature){
            var lst = [], find = false;
            this.foreach(function(ft){
                if (ft !== feature){
                    lst[lst.length] = ft;
                } else {
                    find = true;
                }
            });
            this._list = lst;
            if (!find){
                return false;
            }
            feature.destroy();
            if (this.layer.canvas){
                this.layer.canvas.fireChangedEvent('removefeature', feature);
            }
            return true;
        },
        getByIndex: function(index){
            if (index >= this.count()){
                return null;
            }
            return this._list[index];
        }
    };
    NS.FeatureList = FeatureList;

    // Фигура-объект на графике. Абстрактный.
    var Feature = function(type, cfg){
        this.type = type;
        this.init(cfg);
    };
    Feature.prototype = {
        init: function(cfg){
            this.canvas = null;
            this.layer = null;
        },
        serialize: function(){
            return {'t': this.type};
        },
        draw: function(g, canvas){
        },
        destroy: function(){
        },
        eventSubscribe: function(ename, f){
        },
        eventUnSubscribe: function(ename, f){
        },

        // выделить фигуру (вызывает при наведение мыши, не путать с режимом редактирования)
        select: function(){
        },
        unSelect: function(){
        },
        toJSON: function(){
            return {tp: this.type};
        },
        remove: function(){
            if (!this.layer){
                return;
            }
            this.layer.features.remove(this);
        }
    };
    NS.Feature = Feature;

    // Кривая на графике
    var PathFeature = function(color, path, userid, date, cfg){
        date = date | 0;
        cfg = Y.merge({
            color: color,
            path: path,
            width: 2,
            userid: userid,
            date: new Date(date * 1000)
        }, cfg || {});

        PathFeature.superclass.constructor.call(this, 'path', cfg);
    };
    YAHOO.extend(PathFeature, Feature, {
        init: function(cfg){
            PathFeature.superclass.init.call(this, cfg);

            this.userid = cfg.userid;
            this.date = cfg.date;
            this.color = cfg.color;
            this.path = cfg.path;
            this.width = cfg.width;
            this._fobj = null;
        },
        destroy: function(){
            this._fobj.remove();
            this._fobj = null;
            this.path = null;
        },
        draw: function(g){
            if (this._fobj){
                return;
            }

            var glines = g.set(), gline;
            glines.push(gline = g.path().attr({
                'stroke': this.color,
                'stroke-width': this.width,
                'stroke-linejoin': 'round',
                'stroke-linecap': 'round',
                'stroke-dasharray': ''
            }));

            gline.attr({path: this.path.join(",")});
            this._fobj = gline;
        },
        eventSubscribe: function(ename, f){
            this._fobj[ename](f);
        },
        eventUnSubscribe: function(ename, f){
            this._fobj['un' + ename](f);
        },
        select: function(){
            this._fobj.attr({'opacity': .3});
        },
        unSelect: function(){
            this._fobj.attr({'opacity': 1});
        },
        toJSON: function(){
            return {
                u: this.userid,
                dl: this.date.getTime() / 1000,
                tp: this.type,
                clr: this.color,
                w: this.width,
                d: this.path
            };
        }
    });
    NS.PathFeature = PathFeature;


    // Фигура "комментарии", где:
    // path - массив четырех элементов - [x1, y1, x2, y2]
    var CommentFeature = function(color, path, text, userid, date, cfg){
        text = text || '';
        cfg = Y.merge({
            color: color,
            path: path,
            text: text,
            width: 2,
            userid: userid,
            date: new Date(date * 1000)
        }, cfg || {});
        CommentFeature.superclass.constructor.call(this, 'cmt', cfg);
    };
    YAHOO.extend(CommentFeature, Feature, {
        init: function(cfg){
            CommentFeature.superclass.init.call(this, cfg);

            this.userid = cfg.userid;
            this.date = cfg.date;
            this.color = cfg.color;
            this.path = cfg.path;
            this.text = cfg.text;
            this.width = cfg.width;
            this._fobj = null;
            this._isEditMode = false;
        },
        destroy: function(){
            this._fobj.remove();
            this._fobj = null;
            this.path = null;

            var node = this.template.one('id');
            node.detachAll();
            node.remove();
        },
        draw: function(g, canvas, layer){
            if (this._fobj){
                return;
            }
            this.canvas = canvas;
            this.layer = layer;

            var p = this.path,
                glines = g.set(),
                gline = g.path().attr({
                    'stroke': this.color,
                    'stroke-width': this.width
                });

            glines.push(gline);
            gline.attr({path: ["M", p[0], p[1], "L", p[2], p[3]].join(",")});

            this._fobj = gline;

            var uprofile = NS.appInstance.getApp('uprofile'),
                user = uprofile.get('userList').getById(this.userid),
                tp = this.template =
                    new SYS.TemplateManagerExt(COMPONENT.key, 'comment'),
                html = tp.replace('comment', {
                    'info': !user ? "" : Brick.dateExt.convert(this.date) + ", " + user.get('viewName'),
                    'bclr': this.color,
                    'left': p[2] - 150, 'top': p[3],
                    closeHide: this.userid > 0 && this.userid !== UID ? 'hide' : ''
                });

            canvas._container.append(html);
            tp.setHTML('text', this.text);

            tp.one('id').on('click', this.onClick, this);
        },
        onClick: function(e){
            switch (e.target.getData('click')) {
                case 'close':
                    this.remove();
                    return true;
                case 'text':
                    this.setEditMode();
                    return true;
            }

            this.setEditMode();
        },
        eventSubscribe: function(ename, f){
            this._fobj[ename](f);
        },
        eventUnSubscribe: function(ename, f){
            this._fobj['un' + ename](f);
        },
        select: function(){
            this._fobj.attr({'opacity': .3});
        },
        unSelect: function(){
            this._fobj.attr({'opacity': 1});
        },
        setEditMode: function(){ // установить режим редактирования
            if (this._isEditMode){
                return;
            }
            if (this.userid > 0 && this.userid !== UID){
                return;
            }

            this._isEditMode = true;

            var tp = this.template,
                str = tp.getHTML('text'),
                inputNode = tp.one('input');

            this._oldText = str;
            str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
            str = str.replace(/<br \/>/gi, '\n');
            str = str.replace(/<br\/>/gi, '\n');
            str = str.replace(/<br>/gi, '\n');

            var rg = tp.one('text').get('region'),
                w = Math.max(rg.width, 190),
                h = Math.max(rg.height, 30);

            tp.setValue('input', str);
            tp.toggleView(true, 'input', 'text');

            inputNode.setStyle('width', w + 'px');
            inputNode.setStyle('height', h + 'px');

            try {
                inputNode.focus();
            } catch (e) {
            }
            inputNode.on("blur", this.setViewMode, this);
        },
        setViewMode: function(){
            if (!this._isEditMode){
                return;
            }
            this._isEditMode = false;

            var tp = this.template,
                str = tp.getValue('input');

            str = str.replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
            str = str.replace(/\n/gi, '<br />');

            tp.setHTML('text', str);

            if (this._oldText != str){
                this.canvas.fireChangedEvent('changefeature', this);
            }

            tp.toggleView(true, 'text', 'input');
            tp.one('input').detach('blur', this.setViewMode, this);
        },
        toJSON: function(){
            this.setViewMode();

            return {
                u: this.userid,
                dl: this.date.getTime() / 1000,
                tp: this.type,
                clr: this.color,
                w: this.width,
                d: this.path,
                t: this.template.getHTML('text')
            };
        }
    });
    NS.CommentFeature = CommentFeature;

    // Изображение
    var ImageFeature = function(src, region, userid, date, cfg){
        var r = Y.merge({
            src: src,
            x: 0, y: 0, width: 1, height: 1
        }, region || []);

        date = date | 0;

        cfg = Y.merge({
            userid: userid,
            date: new Date(date * 1000),
            src: r.src,
            x: r.x, y: r.y, width: r.width, height: r.height
        }, cfg || []);

        ImageFeature.superclass.constructor.call(this, 'image', cfg);
    };
    YAHOO.extend(ImageFeature, Feature, {
        init: function(cfg){
            ImageFeature.superclass.init.call(this, cfg);

            this._imgobj = null;

            this.src = cfg.src;
            this.userid = cfg.userid;
            this.date = cfg.date;
            this.setRegion(cfg.x, cfg.y, cfg.width, cfg.height);
        },
        setRegion: function(x, y, width, height){
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        },
        draw: function(g){
            var src = this.src || "";

            //<editor-fold desc="Temporal hack: image thumbnail">
            var a = src.split('/').reverse();

            if (a[2] === 'i' && a[3] === 'filemanager'){
                src = '/filemanager/i/' + a[1] + '/' + NS.IMG_THUMB + '/' + a[0];
            }

            //</editor-fold>

            if (!this._imgobj){
                this._imgobj = g.image(src, this.x, this.y, this.width, this.height);
                this._imgobj.node.setAttribute('preserveAspectRatio', 'xMinYMin');
            }
            var node = this._imgobj.node;
            node.setAttribute('href', src);
            node.setAttribute('x', this.x);
            node.setAttribute('y', this.y);
            node.setAttribute('width', this.width);
            node.setAttribute('height', this.height);
        },
        setSrc: function(src){
            this.src = src;
        },
        toJSON: function(){
            return {
                u: this.userid,
                dl: this.date.getTime() / 1000,
                tp: this.type,
                src: this.src,
                rg: [this.x, this.y, this.width, this.height]
            };
        }
    });
    NS.ImageFeature = ImageFeature;

    // Инструмент рисования фигуры. Абстрактный.
    var DrawTool = function(name, manager){
        this.name = name;
        this.manager = manager;
        this.init();
    };
    DrawTool.prototype = {
        init: function(){
            // статус рисования инструмента
            this.isDraw = false;
        },
        onMouseDown: function(evt){
        },
        onMouseUp: function(evt){
        },
        onMouseMove: function(evt){
        },
        onClick: function(evt){
        },

        // инструмент был активирован
        onSelect: function(){
        },

        // инструмент был деакивирован
        onUnSelect: function(){
        }
    };
    NS.DrawTool = DrawTool;

    // Рука
    var HandTool = function(manager){
        HandTool.superclass.constructor.call(this, 'hand', manager);
    };
    YAHOO.extend(HandTool, DrawTool, {
        init: function(){
            HandTool.superclass.init.call(this);
        }
    });
    NS.HandTool = HandTool;

    // Ластик
    var EraseTool = function(manager){
        EraseTool.superclass.constructor.call(this, 'erase', manager);
    };
    YAHOO.extend(EraseTool, DrawTool, {
        init: function(){
            EraseTool.superclass.init.call(this);

            this._curLayer = null;
            this._curFeature = null;
        },
        onClick: function(e){
            var feature = this._curFeature;

            if (!feature){
                return;
            }
            if (feature.userid > 0 && feature.userid !== UID){
                return;
            }
            this._curLayer.features.remove(feature);
        },
        _featureMouseOver: function(layer, feature){
            this._curLayer = layer;
            this._curFeature = feature;

            feature.select();
        },
        _featureMouseOut: function(layer, feature){
            this._curFeature = null;
            feature.unSelect();
        },
        _featureEventMethod: function(subscribe){
            var instance = this;
            // был выбран этот инструмент
            this.manager.canvas.layers.foreach(function(layer){
                layer.features.foreach(function(feature){

                    var fmOver = function(){
                        instance._featureMouseOver(layer, feature);
                    };
                    var fmOut = function(){
                        instance._featureMouseOut(layer, feature);
                    };

                    if (subscribe){
                        feature.eventSubscribe('mouseover', fmOver);
                        feature.eventSubscribe('mouseout', fmOut);
                    } else {
                        feature.eventUnSubscribe('mouseover', fmOver);
                        feature.eventUnSubscribe('mouseout', fmOut);
                    }
                });
            });
        },

        onSelect: function(){
            this._featureEventMethod(true);
        },

        onUnSelect: function(){
            this._featureEventMethod(false);
        }

    });
    NS.EraseTool = EraseTool;

    // Карандаш
    var PathTool = function(manager){
        PathTool.superclass.constructor.call(this, 'path', manager);
    };
    YAHOO.extend(PathTool, DrawTool, {
        init: function(){
            PathTool.superclass.init.call(this);

            this.gline = null;
        },
        startDraw: function(e){
            if (this.gline){
                this.stopDraw(e);
            }

            var layer = e.layer,
                g = layer.graphics,
                glines = g.set(),
                gline;

            glines.push(gline = g.path().attr({
                'stroke': '#' + e.tools.selectedColor,
                'stroke-width': 2,
                'stroke-linejoin': 'round',
                'stroke-linecap': 'round',
                'stroke-dasharray': ''
            }));
            this.gline = gline;
            this.path = ["M", e.x, e.y];
        },
        moveDraw: function(e){
            if (!this.gline){
                return;
            }

            this.path = this.path.concat(["L", e.x, e.y]);
            this.gline.attr({path: this.path.join(",")});
        },
        stopDraw: function(e){
            if (!this.gline){
                return;
            }
            this.gline.remove();
            this.gline = null;

            var feature = new NS.PathFeature('#' + e.tools.selectedColor, this.path,
                UID, (new Date()).getTime() / 1000);

            e.layer.features.add(feature);
            e.layer.refresh();
        },
        onMouseDown: function(evt){
            this.startDraw(evt);
        },
        onMouseUp: function(evt){
            this.stopDraw(evt);
        },
        onMouseMove: function(evt){
            this.moveDraw(evt);
        }
    });
    NS.PathTool = PathTool;

    // Комментарии
    var CommentTool = function(manager){
        CommentTool.superclass.constructor.call(this, 'cmt', manager);
    };
    YAHOO.extend(CommentTool, DrawTool, {
        init: function(){
            CommentTool.superclass.init.call(this);

            this.gline = null;
            this.path = [0, 0, 0, 0];
            this._ismove = false;
        },
        startDraw: function(e){
            if (this.gline){
                this.stopDraw(e);
            }

            var layer = e.layer,
                g = layer.graphics,
                glines = g.set(),
                gline;

            glines.push(gline = g.path().attr({
                'stroke': '#' + e.tools.selectedColor,
                'stroke-width': 2
            }));
            this.gline = gline;
            var p = this.path = [0, 0, 0, 0];
            p[0] = e.x;
            p[1] = e.y;
        },
        moveDraw: function(e){
            if (!this.gline){
                return;
            }

            var p = this.path;
            p[2] = e.x;
            p[3] = e.y;

            this.gline.attr({path: ["M", p[0], p[1], "L", p[2], p[3]].join(",")});
            this._ismove = true;
        },
        stopDraw: function(e){
            if (!this.gline){
                return;
            }
            this.gline.remove();
            this.gline = null;

            if (!this._ismove){
                return;
            }
            this._ismove = false;

            var feature = new NS.CommentFeature('#' + e.tools.selectedColor, this.path, '',
                UID, (new Date()).getTime() / 1000);

            e.layer.features.add(feature);
            e.layer.refresh();

            e.tools.select('hand');

            feature.setEditMode();
        },
        onMouseDown: function(evt){
            this.startDraw(evt);
        },
        onMouseUp: function(evt){
            this.stopDraw(evt);
        },
        onMouseMove: function(evt){
            this.moveDraw(evt);
        }
    });
    NS.CommentTool = CommentTool;


    // Коллекция инструментов для рисования
    var DrawToolList = function(){
        this.init();
    };
    DrawToolList.prototype = {
        init: function(){
            this._list = [];
        },
        add: function(drawTool){
            var lst = this._list;
            lst[lst.length] = drawTool;
        },
        count: function(){
            return this._list.length;
        },
        foreach: function(f){
            if (!Y.Lang.isFunction(f)){
                return;
            }
            var lst = this._list;
            for (var i = 0; i < lst.length; i++){
                if (f(lst[i], i)){
                    return;
                }
            }
        },
        get: function(name){
            var find = null;
            this.foreach(function(dt){
                if (dt.name != name){
                    return;
                }
                find = dt;
                return true;
            });
            return find;
        },
        getByIndex: function(index){
            return this._list[index];
        }
    };

    var EFN = {
        'click': 'onClick',
        'mousedown': 'onMouseDown',
        'mouseup': 'onMouseUp',
        'mousemove': 'onMouseMove',
        'mouseover': 'onMouseOver',
        'mouseout': 'onMouseOut'
    };

    // Панель инструментов
    var DrawToolManager = function(canvas){
        this.init(canvas);
    };
    DrawToolManager.prototype = {
        init: function(canvas){
            this.canvas = canvas;
            this.selected = null;

            this.selectedColor = '0000FF';

            this.selectEvent = new YAHOO.util.CustomEvent("onSelectEvent");

            this.tools = new DrawToolList();

            this.tools.add(new HandTool(this));
            this.tools.add(new PathTool(this));
            this.tools.add(new EraseTool(this));
            this.tools.add(new CommentTool(this));

            this.selectByName('hand');
        },

        select: function(tlname){
            this.selectByName(tlname);
        },
        selectByName: function(tlname){
            var tool = this.tools.get(tlname);
            if (!tool || this.selected === tool){
                return;
            }

            if (this.selected){
                this.selected.onUnSelect();
            }

            this.selected = tool;
            this.selected.onSelect();
            this.selectEvent.fire(tool);
        },
        _getXY: function(e){
            var node = this.canvas._container,
                nXY = node.getXY(),
                x = Math.round(Math.max(e.pageX - nXY[0], 0)),
                y = Math.round(Math.max(e.pageY - nXY[1], 0));

            return [x, y];
        },
        mouseEvent: function(evt){
            var layer = this.canvas.layers.getLast();
            if (!layer){
                return;
            }

            var tool = this.selected,
                toolFn = tool[EFN[evt.type]],
                xy = this._getXY(evt),
                x = xy[0], y = xy[1];

            if (!Y.Lang.isFunction(toolFn)){
                return;
            }

            tool[EFN[evt.type]]({
                event: evt,
                tools: this,
                layer: layer,
                x: x, y: y
            });
        },
        showSelectColorPanel: function(callback){
            var instance = this;

            new NS.ColorPickerPanel(this.selectedColor, function(color){
                instance.selectedColor = color;
                if (Y.Lang.isFunction(callback)){
                    callback(color);
                }
            });
        }
    };
    NS.DrawToolManager = DrawToolManager;

    var __canvasid = 0;

    var Layer = function(cfg){

        cfg = Y.merge({
            features: []
        }, cfg || {});

        this.init(cfg);
    };
    Layer.prototype = {
        init: function(cfg){
            this.canvas = null;
            this.graphics = null;

            this.features = new FeatureList(this);

            var fs = cfg['features'] || [];
            for (var i = 0; i < fs.length; i++){
                this.features.add(fs[i]);
            }
        },
        setCanvas: function(canvas){
            var div = document.createElement('div');
            div.id = 'awbodraw' + (__canvasid++);
            canvas._container.appendChild(div);
            Y.Node.one(div).addClass('canvas');
            var g = this.graphics = Raphael(div);
            g.setSize('100%', 500);

            this.canvas = canvas;
        },
        refresh: function(){
            var g = this.graphics,
                canvas = this.canvas,
                layer = this;

            this.features.foreach(function(feature){
                feature.canvas = canvas;
                feature.layer = layer;
                feature.draw(g, canvas, layer);
            });
        },
        toJSON: function(){
            var ret = {
                tp: 'Layer',
                'fs': []
            };

            var rfs = ret['fs'];
            this.features.foreach(function(feature){
                rfs[rfs.length] = feature.toJSON();
            });

            return ret;
        }
    };
    NS.Layer = Layer;

    var LayerList = function(canvas){
        this.init(canvas);
    };
    LayerList.prototype = {
        init: function(canvas){
            this.canvas = canvas;
            this._list = [];
        },
        count: function(){
            return this._list.length;
        },
        add: function(layer){
            this._list[this._list.length] = layer;
            this.canvas.fireChangedEvent('addlayer', layer);
        },
        getByIndex: function(index){
            return this._list[index];
        },
        getLast: function(){
            var cnt = this.count();
            return cnt == 0 ? null : this.getByIndex(cnt - 1);
        },
        foreach: function(f){
            if (!Y.Lang.isFunction(f)){
                return;
            }
            var lst = this._list;
            for (var i = 0; i < lst.length; i++){
                if (f(lst[i], i)){
                    return;
                }
            }
        }
    };
    NS.LayerList = LayerList;
};