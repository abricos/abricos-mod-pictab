var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['raphael.js', 'colorpicker.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = Y.Lang;

    var UP = Brick.mod.uprofile;

    var buildTemplate = this.buildTemplate;

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
            if (!L.isNull(this.layer.canvas)){
                this.layer.canvas.fireChangedEvent('addfeature', feature);
            }
        },
        foreach: function(f){
            if (!L.isFunction(f)){
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
            if (!L.isNull(this.layer.canvas)){
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
        toSave: function(){
            return {'tp': this.type};
        },
        remove: function(){
            if (L.isNull(this.layer)){
                return;
            }
            this.layer.features.remove(this);
        }
    };
    NS.Feature = Feature;

    // Кривая на графике
    var PathFeature = function(color, path, cfg){
        cfg = Y.merge({
            'color': color,
            'path': path,
            'width': 2
        }, cfg || {});

        PathFeature.superclass.constructor.call(this, 'path', cfg);
    };
    YAHOO.extend(PathFeature, Feature, {
        init: function(cfg){
            PathFeature.superclass.init.call(this, cfg);

            this.color = cfg['color'];
            this.path = cfg['path'];
            this.width = cfg['width'];
            this._fobj = null;
        },
        destroy: function(){
            this._fobj.remove();
            this._fobj = null;
            this.path = null;
        },
        draw: function(g){
            if (!L.isNull(this._fobj)){
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

            gline.attr({'path': this.path.join(",")});
            this._fobj = gline;
            var __self = this;
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
        toSave: function(){
            return {
                'tp': this.type,
                'clr': this.color,
                'w': this.width,
                'd': this.path
            };
        }
    });
    NS.PathFeature = PathFeature;


    // Фигура "комментарии", где:
    // path - массив четырех элементов - [x1, y1, x2, y2]
    var CommentFeature = function(color, path, text, contentid, userid, udate, cfg){
        text = text || '';
        contentid = contentid || 0;
        cfg = Y.merge({
            'color': color,
            'path': path,
            'text': text,
            'contentid': contentid,
            'width': 2,
            'userid': userid,
            'date': new Date(udate * 1000)
        }, cfg || {});
        CommentFeature.superclass.constructor.call(this, 'cmt', cfg);
    };
    YAHOO.extend(CommentFeature, Feature, {
        init: function(cfg){
            CommentFeature.superclass.init.call(this, cfg);

            this.userid = cfg['userid'];
            this.date = cfg['date'];
            this.color = cfg['color'];
            this.path = cfg['path'];
            this.text = cfg['text'];
            this.contentid = cfg['contentid'];
            this.width = cfg['width'];
            this._fobj = null;
            this._isEditMode = false;
        },
        destroy: function(){
            this._fobj.remove();
            this._fobj = null;
            this.path = null;

            var el = this._TM.getEl('fcomt.id');
            el.parentNode.removeChild(el);
        },
        draw: function(g, canvas, layer){
            if (!L.isNull(this._fobj)){
                return;
            }
            this.canvas = canvas;
            this.layer = layer;

            var glines = g.set(), gline;
            glines.push(gline = g.path().attr({
                'stroke': this.color,
                'stroke-width': this.width
            }));

            var p = this.path;

            gline.attr({'path': ["M", p[0], p[1], "L", p[2], p[3]].join(",")});
            this._fobj = gline;

            buildTemplate(this, 'fcomt');
            var div = document.createElement('div'),
                TM = this._TM;

            var info = "",
                user = UP.viewer.users.get(this.userid);

            if (!L.isNull(user)){
                info = Brick.dateExt.convert(this.date) + ", " + user.getUserName();
            }
            div.innerHTML = TM.replace('fcomt', {
                'info': info,
                'bclr': this.color,
                'left': p[2] - 150, 'top': p[3]
            });
            var el = div.childNodes[0];
            div.removeChild(el);
            canvas._container.appendChild(el);

            var __self = this;
            E.on(TM.getEl('fcomt.id'), 'click', function(e){
                var el = E.getTarget(e);
                if (__self.onClick(el)){
                    E.preventDefault(e);
                }
            });

            TM.getEl('fcomt.text').innerHTML = this.text;
        },
        onClick: function(el){
            var tp = this._TId['fcomt'];
            switch (el.id) {
                case tp['bclose']:
                    this.remove();
                    return true;
                case tp['text']:
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
            this._isEditMode = true;

            var TM = this._TM,
                elText = TM.getEl('fcomt.text'),
                elInput = TM.getEl('fcomt.input');

            var str = elText.innerHTML;
            this._oldText = str;
            str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
            str = str.replace(/<br \/>/gi, '\n');
            str = str.replace(/<br\/>/gi, '\n');
            str = str.replace(/<br>/gi, '\n');

            var rg = Dom.getRegion(elText);

            var w = Math.max(rg.width, 190),
                h = Math.max(rg.height, 30);

            elInput.value = str;

            Dom.setStyle(elText, 'display', 'none');
            Dom.setStyle(elInput, 'display', '');
            Dom.setStyle(elInput, 'width', w + 'px');
            Dom.setStyle(elInput, 'height', h + 'px');

            try {
                elInput.focus();
            }
            catch (e) {
            }

            E.addListener(elInput, "blur", this.setViewMode, this, true);
        },
        setViewMode: function(){
            if (!this._isEditMode){
                return;
            }
            this._isEditMode = false;

            var TM = this._TM,
                elText = TM.getEl('fcomt.text'),
                elInput = TM.getEl('fcomt.input');

            var str = elInput.value;
            str = str.replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
            str = str.replace(/\n/gi, '<br />');

            elText.innerHTML = str;

            if (this._oldText != str){
                this.canvas.fireChangedEvent('changefeature', this);
            }

            Dom.setStyle(elText, 'display', '');
            Dom.setStyle(elInput, 'display', 'none');

            E.removeListener(elInput, "blur", this.setViewMode);
        },
        toSave: function(){
            this.setViewMode();

            return {
                'u': this.userid,
                'dl': this.date.getTime() / 1000,
                'tp': this.type,
                'clr': this.color,
                'w': this.width,
                'd': this.path,
                't': this._TM.getEl('fcomt.text').innerHTML
            };
        }
    });
    NS.CommentFeature = CommentFeature;

    // Изображение
    var ImageFeature = function(src, cfg){
        cfg = Y.merge({
            'src': src,
            'x': 0, 'y': 0, 'width': 1, 'height': 1
        }, cfg || []);
        ImageFeature.superclass.constructor.call(this, 'image', cfg);
    };
    YAHOO.extend(ImageFeature, Feature, {
        init: function(cfg){
            ImageFeature.superclass.init.call(this, cfg);

            this._imgobj = null;

            this.src = cfg['src'];
            this.setRegion(cfg['x'], cfg['y'], cfg['width'], cfg['height']);
        },
        setRegion: function(x, y, width, height){
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        },
        draw: function(g){
            if (L.isNull(this._imgobj)){
                this._imgobj = g.image(this.src, this.x, this.y, this.width, this.height);
                this._imgobj.node.setAttribute('preserveAspectRatio', 'xMinYMin');
            }
            var node = this._imgobj.node;
            node.setAttribute('href', this.src);
            node.setAttribute('x', this.x);
            node.setAttribute('y', this.y);
            node.setAttribute('width', this.width);
            node.setAttribute('height', this.height);
        },
        setSrc: function(src){
            this.src = src;
            /*
             var image = new Image();
             var __self = this;
             image.onload = function(){
             __self.image = __self.graphicsbg.image('/modules/bodraw/worker/001.jpg', 0, 0, 1022, 500);
             __self.image.toBack();
             };
             image.src = '/modules/bodraw/worker/001.jpg';
             /**/
        },
        toSave: function(){
            return {
                'tp': this.type,
                'src': this.src,
                'rg': [this.x, this.y, this.width, this.height]
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
            if (L.isNull(this._curFeature)){
                return;
            }
            this._curLayer.features.remove(this._curFeature);
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
            var __self = this;
            // был выбран этот инструмент
            this.manager.canvas.layers.foreach(function(layer){
                layer.features.foreach(function(feature){

                    var fmOver = function(){
                        __self._featureMouseOver(layer, feature);
                    };
                    var fmOut = function(){
                        __self._featureMouseOut(layer, feature);
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
            if (!L.isNull(this.gline)){
                this.stopDraw(e);
            }

            var layer = e.layer, g = layer.graphics, glines = g.set(), gline;

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
            if (L.isNull(this.gline)){
                return;
            }

            this.path = this.path.concat(["L", e.x, e.y]);
            this.gline.attr({path: this.path.join(",")});
        },
        stopDraw: function(e){
            if (L.isNull(this.gline)){
                return;
            }
            this.gline.remove();
            this.gline = null;

            var feature = new PathFeature('#' + e.tools.selectedColor, this.path);
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
            if (!L.isNull(this.gline)){
                this.stopDraw(e);
            }

            var layer = e.layer, g = layer.graphics, glines = g.set(), gline;

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
            if (L.isNull(this.gline)){
                return;
            }

            var p = this.path;
            p[2] = e.x;
            p[3] = e.y;

            this.gline.attr({path: ["M", p[0], p[1], "L", p[2], p[3]].join(",")});
            this._ismove = true;
        },
        stopDraw: function(e){
            if (L.isNull(this.gline)){
                return;
            }
            this.gline.remove();
            this.gline = null;

            if (!this._ismove){
                return;
            }
            this._ismove = false;

            var feature = new CommentFeature('#' + e.tools.selectedColor, this.path, '', 0,
                Brick.env.user.id, (new Date()).getTime() / 1000);
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
            if (!L.isFunction(f)){
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
            if (L.isNull(tool)){
                return;
            }

            if (this.selected == tool){
                return;
            }

            if (!L.isNull(this.selected)){
                this.selected.onUnSelect();
            }

            this.selected = tool;
            this.selected.onSelect();
            this.selectEvent.fire(tool);
        },

        _getXY: function(evt){
            var xy = YAHOO.util.Event.getXY(evt);
            var xy1 = Dom.getXY(this.canvas._container);

            return [Math.max(xy[0] - xy1[0], 0), Math.max(xy[1] - xy1[1], 0)];
        },
        mouseEvent: function(evt){
            var layer = this.canvas.layers.getLast();
            if (L.isNull(layer)){
                return;
            }
            var xy = this._getXY(evt),
                x = xy[0], y = xy[1];
            var tool = this.selected;
            if (!L.isFunction(tool[EFN[evt.type]])){
                return;
            }

            tool[EFN[evt.type]]({
                'event': evt,
                'tools': this,
                'layer': layer,
                'x': x, 'y': y
            });
        },
        showSelectColorPanel: function(callback){
            var __self = this;

            new NS.ColorPickerPanel(this.selectedColor, function(color){
                __self.selectedColor = color;
                if (L.isFunction(callback)){
                    callback(color);
                }
            });
        }
    };
    NS.DrawToolManager = DrawToolManager;

    var __canvasid = 0;

    var Layer = function(cfg){

        cfg = Y.merge({
            'features': []
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
            Dom.addClass(div, 'canvas');
            this.graphics = Raphael(div);
            this.canvas = canvas;
        },
        refresh: function(){
            var g = this.graphics, canvas = this.canvas, layer = this;
            this.features.foreach(function(feature){
                feature.canvas = canvas;
                feature.layer = layer;
                feature.draw(g, canvas, layer);
            });
        },
        toSave: function(){
            var ret = {
                'tp': 'Layer',
                'fs': []
            };

            var rfs = ret['fs'];
            this.features.foreach(function(feature){
                rfs[rfs.length] = feature.toSave();
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
            if (!L.isFunction(f)){
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

    // Полотно для рисования.
    // callback будет вызван после инициализации полотна
    // (для инициализации создается "отдельный" поток - решение в лоб TODO: продумать более позитивное решение)
    var Canvas = function(container, config){
        config = Y.merge({
            'width': 400,
            'height': 300,
            'layers': [],
            'callback': null
        }, config || {});
        this.init(container, config);
    };
    Canvas.prototype = {
        init: function(container, config){
            var __self = this;

            this.changedEvent = new YAHOO.util.CustomEvent('changedEvent');

            setTimeout(function(){
                __self._initCanvas(container, config);
            }, 100);
        },
        _initCanvas: function(container, config){
            this._container = container;
            this.width = config['width'];
            this.height = config['height'];

            this.layers = new LayerList(this);

            for (var i = 0; i < config['layers'].length; i++){
                this.addLayer(config['layers'][i]);
            }

            this.drawToolManager = new DrawToolManager(this);

            var el = container, __self = this;
            E.on(el, 'mousedown', function(evt){
                __self._mouseEvent(evt);
            });
            E.on(el, 'mouseup', function(evt){
                __self._mouseEvent(evt);
            });
            E.on(el, 'mousemove', function(evt){
                __self._mouseEvent(evt);
            });
            E.on(el, 'mouseover', function(evt){
                __self._mouseEvent(evt);
            });
            E.on(el, 'mouseout', function(evt){
                __self._mouseEvent(evt);
            });
            E.on(el, 'click', function(evt){
                __self._mouseEvent(evt);
            });

            if (L.isFunction(config['callback'])){
                config['callback'](this);
            }
        },
        fireChangedEvent: function(action, object){
            this.changedEvent.fire({
                'action': action,
                'object': object
            });
        },
        addLayer: function(layer){
            layer.setCanvas(this);
            this.layers.add(layer);
            layer.refresh();
        },
        setSize: function(width, height){
            this.width = width;
            this.height = height;
            // так же нужно установить на все слои. а лучше вызвать событие, чтобы все подписчики у себя поменяли эти размеры
        },
        _mouseEvent: function(evt){
            this.drawToolManager.mouseEvent(evt);
        },
        toSave: function(){

            var ret = {
                'ls': [],
                'w': this.width,
                'h': this.height,
                'color': this.drawToolManager.selectedColor
            };
            var rls = ret['ls'];
            this.layers.foreach(function(layer){
                rls[rls.length] = layer.toSave();
            });
            return ret;
        }
    };
    NS.Canvas = Canvas;
};