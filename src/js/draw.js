var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['tabView.js']},
        {name: '{C#MODNAME}', files: ['canvas.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.PicTabPageWidget = Y.Base.create('PicTabPageWidget', SYS.AppWidget, [
        SYS.TabViewPageBase
    ], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                data = this.get('data'),
                instance = this;

            this.canvasWidget = new NS.CanvasWidget({
                srcNode: tp.one('canvas'),
                data: data,
                callback: function(drawWidget){
                    drawWidget.canvas.changedEvent.subscribe(instance.onCanvasChanged, instance, true);
                }
            });
        },
        destructor: function(){
        },
        onCanvasChanged: function(type, args){
            this.owner.changedEvent.fire();
        },
        showFileManager: function(){
            var instance = this;
            Brick.Component.API.fire('filemanager', 'api', 'showFileBrowserPanel', function(result){
                instance.setImage(result['src']);
            });
        },
        uploadImage: function(){
            if (this.uploadWindow && !this.uploadWindow.closed){
                this.uploadWindow.focus();
                return;
            }
            var url = '/pictab/uploadimg/';
            this.uploadWindow = window.open(
                url, 'pictabUploadImage',
                'statusbar=no,menubar=no,toolbar=no,scrollbars=yes,resizable=yes,width=550,height=500'
            );
            NS.activeTabPageWidget = this;
        },
        setImageByFID: function(fid, fname){
            var loc = window.location,
                src = loc.protocol + '//' + loc.hostname;
            if (loc.port * 1 != 80 && loc.port * 1 > 0){
                src += ":" + loc.port;
            }
            src += '/filemanager/i/' + fid + '/' + fname;
            this.setImage(src);
        },
        setImage: function(url){
            if (Y.Lang.isString(url) && url.length > 0){
                var arr = url.split('/'),
                    fname = arr[arr.length - 1];

                this.set('title', fname);
            }
            this.canvasWidget.setBackground(url);
        },
        toJSON: function(){

        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'tab'},
            data: {value: {}}
        },
        CLICKS: {
            uploadImage: 'uploadImage',
            showFileManager: 'showFileManager'
        },
    });

    NS.PicTabWidget = Y.Base.create('PicTabWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template;

            this.tabViewWidget = new SYS.TabViewWidget({
                srcNode: tp.one('tabView')
            });

            this.addTab();
        },
        destructor: function(){
        },
        addTab: function(imageData){
            var tp = this.template,
                tbvWidget = this.tabViewWidget,
                id = tbvWidget.size() + 1;

            imageData = Y.merge({
                id: id,
                title: 'Image ' + id,
                data: {}
            }, imageData || {});

            // to older version
            imageData.title = imageData.tl ? imageData.tl : imageData.title;
            imageData.data = imageData.d ? imageData.d : imageData.data;

            tbvWidget.addTab({
                title: imageData.title,
                data: imageData.data,
                TabViewPage: NS.PicTabPageWidget
            });
        },
        _setUseMode: function(flag){
            var tp = this.template;
            tp.toggleView(flag, 'body,buttonDisable,buttonAddTab', 'buttonEnable');
        },
        enable: function(){
            this._setUseMode(true);
        },
        disable: function(){
            this._setUseMode(false);
        },
        toJSON: function(){
            var ret = [];

            this.tabViewWidget.each(function(tab){
                ret[ret.length] = tab.toJSON();
            }, this);

            return ret;
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
        },
        CLICKS: {
            addTab: 'addTab',
            enable: 'enable',
            disable: 'disable'
        },
    });

};