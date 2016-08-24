var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['features.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys,
        UID = Brick.env.user.id | 0;

    NS.CanvasWidget = Y.Base.create('CanvasWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                data = this.get('data'),
                callback = this.get('callback'),
                layers = [];

            if (data && data.canvas){
                // TODO: решение в лоб. на перспективу необходимо сделать универсальный менеджер по сохранению и загрузки объектов
                if (data.v === '0.1'){
                    layers = this._fillCanvas_0_1(data);
                }
            } else {
                layers = [
                    new NS.Layer(),
                    new NS.Layer()
                ];
            }

            this.backgroundLayer = layers[0];

            var instance = this;

            this.canvas = new NS.Canvas(tp.one('pane'), {
                layers: layers,
                callback: function(canvas){
                    canvas.drawToolManager.selectEvent.subscribe(function(){
                        instance.renderTool();
                    });
                    if (Y.Lang.isFunction(callback)){
                        callback(instance);
                    }
                    instance.updateColorPickerButton();
                }
            });
        },
        destructor: function(){
        },
        _isFeatureReadOnly: function(d){
            var userActivity = this.get('userActivity');

            if (d.u != UID){
                return true;
            }

            var date = new Date(d.dl * 1000);

            if (userActivity.userid > 0 && d.dl && userActivity.date.getTime() > date.getTime()){
                return true;
            }
            return false;
        },
        _fillCanvas_0_1: function(data){
            var layers = [],
                jls = data.canvas['ls'] || [],
                i, clName, fs, jfs;

            for (i = 0; i < jls.length; i++){
                clName = jls[i]['tp'];
                if (!NS[clName]){
                    continue;
                }

                fs = [];
                jfs = jls[i]['fs'] || [];

                for (var ii = 0; ii < jfs.length; ii++){
                    var jf = jfs[ii];

                    jf.u = jf.u | 0;
                    jf.dl = jf.dl | 0;

                    switch (jf['tp']) {
                        case 'path':
                            fs[fs.length] = new NS.PathFeature(jf.clr, jf.d, jf.u, jf.dl, {
                                readOnly: this._isFeatureReadOnly(jf)
                            });
                            break;
                        case 'cmt':
                            fs[fs.length] =
                                new NS.CommentFeature(jf.clr, jf.d, jf.t, jf.u, jf.dl, {
                                    readOnly: this._isFeatureReadOnly(jf)
                                });
                            break;
                        case 'image':
                            this.setHrefOnZoomInButton(jf.src);
                            fs[fs.length] = new NS.ImageFeature(jf.src, {
                                x: jf.rg[0],
                                y: jf.rg[1],
                                width: jf.rg[2],
                                height: jf.rg[3]
                            }, jf.u, jf.dl, {
                                readOnly: this._isFeatureReadOnly(jf)
                            });
                            break;
                    }
                }

                layers[layers.length] = new NS[clName]({
                    'features': fs
                });
            }
            return layers;
        },
        onClick: function(e){
            switch (e.dataClick) {
                case 'colorPicker':
                    this.showSelectColorPanel();
                    return true;
                case 'toolHand':
                    this.selectTool('hand');
                    return true;
                case 'toolPath':
                    this.selectTool('path');
                    return true;
                case 'toolEraser':
                    this.selectTool('erase');
                    return true;
                case 'toolComment':
                    this.selectTool('cmt');
                    return true;
                case 'openOriginImage':
                    return this.imageZoomIn();
            }
        },
        updateColorPickerButton: function(){
            var tp = this.template,
                color = this.canvas.drawToolManager.selectedColor;
            tp.one('colorPicker').setStyle('background-color', '#' + color);
        },
        showSelectColorPanel: function(){
            var instance = this;
            this.canvas.drawToolManager.showSelectColorPanel(function(){
                instance.updateColorPickerButton();
            });
        },
        getBackground: function(){
            return this.backgroundLayer.features.getByIndex(0);
        },
        setBackground: function(src){
            var layer = this.backgroundLayer,
                img = layer.features.getByIndex(0);

            if (!img){
                img = new NS.ImageFeature(src, {
                    x: 1, y: 1, width: 1022, height: 500
                });
                layer.features.add(img);
                layer.refresh();
            } else {
                img.setSrc(src);
                layer.refresh();
            }
            this.setHrefOnZoomInButton(src);
        },
        setHrefOnZoomInButton: function(src){
            var a = src ? src.split('/') : [];
            if (a[a.length - 5] === 'filemanager'){
                a.splice(a.length - 2, 1);
                src = a.join('/');
            }
            this.template.gel('openOriginImage').href = !src ? "#" : src;
        },
        imageZoomIn: function(){
            return this.template.gel('openOriginImage').href == "#";
        },
        selectTool: function(name){
            var dwt = this.canvas.drawToolManager;
            dwt.selectByName(name);
        },
        renderTool: function(){
            var tp = this.template,
                dwt = this.canvas.drawToolManager,
                tool = dwt.selected;

            tp.one('toolbar').all('.btnTool').each(function(node){
                var name = node.getData('name');
                node.toggleClass('active', tool.name === name);
            }, this);
        },
        toJSON: function(){
            return {
                'v': '0.1',
                'canvas': this.canvas.toJSON()
            };
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            userid: {value: UID},
            date: {value: new Date()},
            data: {value: {}},
            userActivity: {value: {}},
            callback: {}
        },
        CLICKS: {},
    });


    // Полотно для рисования.
    // callback будет вызван после инициализации полотна
    // (для инициализации создается "отдельный" поток - решение в лоб TODO: продумать более позитивное решение)
    var Canvas = function(container, config){
        config = Y.merge({
            layers: [],
            callback: null
        }, config || {});
        this.init(container, config);
    };
    Canvas.prototype = {
        init: function(container, config){
            this.changedEvent = new YAHOO.util.CustomEvent('changedEvent');

            var instance = this;

            setTimeout(function(){
                instance._initCanvas(container, config);
            }, 100);
        },
        _initCanvas: function(el, config){
            this._container = el;

            this.layers = new NS.LayerList(this);

            for (var i = 0; i < config['layers'].length; i++){
                this.addLayer(config['layers'][i]);
            }

            this.drawToolManager = new NS.DrawToolManager(this);

            el.on('mousedown', this._mouseEvent, this);
            el.on('mouseup', this._mouseEvent, this);
            el.on('mousemove', this._mouseEvent, this);
            el.on('mouseover', this._mouseEvent, this);
            el.on('mouseout', this._mouseEvent, this);
            el.on('click', this._mouseEvent, this);

            config.callback(this);
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
        _mouseEvent: function(evt){
            this.drawToolManager.mouseEvent(evt);
        },
        toJSON: function(){
            var ret = {
                ls: [],
                color: this.drawToolManager.selectedColor
            };
            var rls = ret['ls'];
            this.layers.foreach(function(layer){
                rls[rls.length] = layer.toJSON();
            });
            return ret;
        }
    };
    NS.Canvas = Canvas;
};