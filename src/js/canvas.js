var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['features.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.CanvasWidget = Y.Base.create('CanvasWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                svdata = this.get('data'),
                callback = this.get('callback');

            this.selectedBackground = null;

            var layers = [];
            if (svdata && svdata['v'] == '0.1' && svdata['canvas']){

                var jls = svdata['canvas']['ls'] || [];
                for (var i = 0; i < jls.length; i++){

                    var clName = jls[i]['tp'];
                    if (NS[clName]){

                        // TODO: решение в лоб. на перспективу необходимо сделать универсальный менеджер по сохранению и загрузки объектов
                        var fs = [], jfs = jls[i]['fs'] || [];
                        for (var ii = 0; ii < jfs.length; ii++){
                            var jf = jfs[ii];
                            switch (jf['tp']) {
                                case 'path':
                                    fs[fs.length] = new NS.PathFeature(jf['clr'], jf['d']);
                                    break;
                                case 'cmt':
                                    jf['u'] = jf['u'] || 0;
                                    jf['dl'] = jf['dl'] || 0;
                                    fs[fs.length] = new NS.CommentFeature(jf['clr'], jf['d'], jf['t'],
                                        0, jf['u'], jf['dl']);
                                    break;
                                case 'image':
                                    this.setHrefOnZoomInButton(jf['src']);
                                    fs[fs.length] = new NS.ImageFeature(jf['src'], {
                                        'x': jf['rg'][0],
                                        'y': jf['rg'][1],
                                        'width': jf['rg'][2],
                                        'height': jf['rg'][3]
                                    });
                                    break;
                            }
                        }

                        layers[layers.length] = new NS[clName]({
                            'features': fs
                        });
                    }
                }

            } else {
                layers = [
                    new NS.Layer(),
                    new NS.Layer()
                ];
            }

            this.backgroundLayer = layers[0];

            var instance = this;
            this.canvas = new NS.Canvas(tp.gel('pane'), {
                'width': 1022,
                'height': 500,
                'layers': layers,
                'callback': function(canvas){
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
                    'x': 1, 'y': 1, 'width': 1022, 'height': 500
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
            this.template.gel('openOriginImage').href = !src ? "#" : src;
        },
        imageZoomIn: function(){
            return this.template.gel('openOriginImage').href == "#";
        },
        selectTool: function(tlname){
            var dwt = this.canvas.drawToolManager;
            dwt.selectByName(tlname);
        },
        renderTool: function(){
            var tp = this.template,
                dwt = this.canvas.drawToolManager,
                tool = dwt.selected;

            dwt.tools.foreach(function(tl){
                var el = tp.gel('tl' + tl.name);
                if (Y.Lang.isNull(el)){
                    return;
                }
                var cs = 'tl-' + tl.name;
                Dom.replaceClass(el, cs + '-sel', cs);
                if (tl.name == tool.name){
                    Dom.replaceClass(el, cs, cs + '-sel');
                }
            });
        },
        toJSON: function(){
            return {
                'v': '0.1',
                'canvas': this.canvas.toSave()
            };
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            data: {value: {}},
            callback: {}
        },
        CLICKS: {},
    });


};