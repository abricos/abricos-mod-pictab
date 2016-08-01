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

    NS.PicTabWidget = Y.Base.create('PicTabWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            this.publish('canvasChanged');

            var tp = this.template,
                imageList = this.get('imageList'),
                editMode = this.get('editMode');

            tp.toggleView(editMode, 'heading');

            this.tabViewWidget = new SYS.TabViewWidget({
                srcNode: tp.one('tabView')
            });

            if (imageList && imageList.size() > 0){
                imageList.each(function(image){
                    this.addTab({
                        id: image.get('id'),
                        title: image.get('title'),
                        data: image.get('data')
                    });
                }, this);
            } else {
                // this.addTab();
                this.disable();
            }
        },
        destructor: function(){
        },
        addTab: function(image){
            var tbvWidget = this.tabViewWidget,
                id = tbvWidget.size() + 1;

            image = Y.merge({
                id: id,
                title: 'Image ' + id,
                data: {}
            }, image || {});

            // to older version
            image.title = image.tl ? image.tl : image.title;
            image.data = image.d ? image.d : image.data;

            var tab = tbvWidget.addTab({
                dbId: image.id,
                title: image.title,
                data: image.data,
                editMode: this.get('editMode'),
                TabViewPage: NS.PicTabPageWidget
            });
            tab.on('canvasChanged', function(){
                this.fire('canvasChanged');
            }, this);
        },
        _setUseMode: function(flag){
            var tp = this.template;
            tp.toggleView(flag, 'body,buttonDisable,buttonAddTab', 'buttonEnable');
        },
        enable: function(){
            if (this.tabViewWidget.size() === 0){
                this.addTab();
            }

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
            imageList: {},
            editMode: {value: false}
        },
        CLICKS: {
            addTab: 'addTab',
            enable: 'enable',
            disable: 'disable'
        },
    });

    //<editor-fold desc="PicTabPageWidget">
    NS.PicTabPageWidget = Y.Base.create('PicTabPageWidget', SYS.AppWidget, [
        SYS.TabViewPageBase
    ], {
        onInitAppWidget: function(err, appInstance){
            this.publish('canvasChanged');

            var tp = this.template,
                data = this.get('data'),
                instance = this,
                editMode = this.get('editMode');

            tp.toggleView(editMode, 'toolsPanel');

            this.canvasWidget = new NS.CanvasWidget({
                srcNode: tp.one('canvas'),
                data: data,
                callback: function(drawWidget){
                    drawWidget.canvas.changedEvent.subscribe(instance.onCanvasChanged, instance, true);
                }
            });
        },
        onCanvasChanged: function(type, args){
            this.fire('canvasChanged');
        },
        //<editor-fold desc="Upload Image">
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
            src += '/filemanager/i/' + fid + '/w_1140-cm_1/' + fname;
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
        //</editor-fold>

        //<editor-fold desc="Title Editor">
        _titleEditorVisible: function(visible){
            this.template.toggleView(visible, 'editTitlePanel', 'buttonsPanel');
        },
        showTitleEditor: function(){
            this.template.setValue('titleEditor', this.get('title'));
            this._titleEditorVisible(true);
        },
        saveTitle: function(){
            this.set('title', this.template.getValue('titleEditor'));
            this._titleEditorVisible(false);
        },
        hideTitleEditor: function(){
            this._titleEditorVisible(false);
        },
        //</editor-fold>

        //<editor-fold desc="Remove Tab">
        _removeTabVisible: function(visible){
            this.template.toggleView(visible, 'removePanel', 'buttonsPanel');
        },
        showRemoveTab: function(){
            this._removeTabVisible(true);
        },
        hideRemoveTab: function(){
            this._removeTabVisible(false);
        },
        removeTab: function(){
            this.get('owner').removeTab(this.get('index'));
        },
        //</editor-fold>

        toJSON: function(){
            return {
                id: this.get('dbId'),
                title: this.get('title'),
                data: this.canvasWidget.toJSON()
            };
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'tab'},
            dbId: {value: 0},
            data: {value: {}},
            editMode: {value: false}
        },
        CLICKS: {
            uploadImage: 'uploadImage',
            showFileManager: 'showFileManager',

            showTitleEditor: 'showTitleEditor',
            hideTitleEditor: 'hideTitleEditor',
            saveTitle: 'saveTitle',

            showRemoveTab: 'showRemoveTab',
            hideRemoveTab: 'hideRemoveTab',
            removeTab: 'removeTab'
        },
    });
    //</editor-fold>
};