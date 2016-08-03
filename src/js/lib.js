var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['application.js']},
        {name: '{C#MODNAME}', files: ['model.js']}
    ]
};
Component.entryPoint = function(NS){

    var COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.IMG_THUMB = 'w_1022-h_500-cm_0';

    SYS.Application.build(COMPONENT, {}, {
        initializer: function(){
            this.initCallbackFire();
        }
    }, [], {
        APPS: {
            uprofile: {},
            filemanager: {},
        },
        ATTRS: {
            isLoadAppStructure: {value: false},
        },
        REQS: {},
        URLS: {
            ws: "#app={C#MODNAMEURI}/wspace/ws/",
        }
    });
};