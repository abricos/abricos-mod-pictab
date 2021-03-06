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
        SYS = Brick.mod.sys,
        UID = Brick.env.user.id | 0;

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
                        userid: image.get('userid'),
                        date: image.get('date'),
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
                id = tbvWidget.size() + 1,
                isHand = !image;

            image = Y.merge({
                id: 0,
                title: 'Image ' + id,
                userid: UID,
                date: new Date(),
                data: {}
            }, image || {});

            // to older version
            image.title = image.tl ? image.tl : image.title;
            image.data = image.d ? image.d : image.data;

            var tab = tbvWidget.addTab({
                dbId: image.id,
                title: image.title,
                userid: image.userid,
                date: image.date,
                data: image.data,
                editMode: this.get('editMode'),
                userActivity: this.get('userActivity'),
                TabViewPage: NS.PicTabPageWidget
            });
            if (isHand){
                tbvWidget.selectTab(tab.get('index'));
            }
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
            editMode: {value: false},
            userActivity: {value: {}}
        },
        CLICKS: {
            addTab: {
                event: function(){
                    this.addTab();
                }
            },
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
                userid = this.get('userid') | 0,
                date = this.get('date'),
                data = this.get('data'),
                instance = this,
                editMode = this.get('editMode'),
                userActivity = this.get('userActivity');


            if (userid !== UID){
                editMode = false;
            } else if (userActivity.userid > 0 && userActivity.date.getTime() > date.getTime()){
                editMode = false;
            }

            tp.toggleView(editMode, 'toolsPanel');

            tp.toggleView(!!Brick.mod.filemanager.roles.isWrite, 'uploadButtons');

            this.canvasWidget = new NS.CanvasWidget({
                srcNode: tp.one('canvas'),
                userid: userid,
                date: date,
                data: data,
                userActivity: userActivity,
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
            var src = '/filemanager/i/' + fid + '/' + NS.IMG_THUMB + '/' + fname;
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
                userid: this.get('userid'),
                date: this.get('date'),
                title: this.get('title'),
                data: this.canvasWidget.toJSON()
            };
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'tab'},
            dbId: {value: 0},
            userid: {value: UID},
            date: {value: new Date()},
            data: {value: {}},
            editMode: {value: false},
            userActivity: {value: {}},
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