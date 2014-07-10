/*
@version $Id$
@copyright Copyright (C) 2008 Abricos. All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var RAPHAEL_VERSION = 'r.2.1.0';

var Component = new Brick.Component();
Component.requires = {
	ext: [{
		name: 'raphael',
		fullpath: [
			// '/modules/chart/lib/'+RAPHAEL_VERSION+'/raphael.js', 
			'/modules/pictab/lib/'+RAPHAEL_VERSION+'/raphael-min.js' // -- bag in IE 
		],
		type: 'js'
	}]
};
Component.entryPoint = function(NS){
};
