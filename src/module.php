<?php 
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Pictab
 * @copyright Copyright (C) 2011 Brickos Ltd. All rights reserved.
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

class PictabModule extends Ab_Module {
	
	public function __construct(){
		$this->version = "0.1";
		$this->name		= "pictab";
		$this->takelink		= "pictab";
		$this->permission = new PictabPermission($this);
	}
	
	/**
	 * Получить менеджер
	 *
	 * @return PictabManager
	 */
	public function GetManager(){
		if (is_null($this->_manager)){
			require_once 'includes/manager.php';
			$this->_manager = new PictabManager($this);
		}
		return $this->_manager;
	}

	public function GetContentName(){
		$cname = '';
		$adress = $this->registry->adress;
		
		if ($adress->level >= 2 && $adress->dir[1] == 'uploadimg'){
			$cname = $adress->dir[1];
		}
		return $cname;
	}	
	
}

class PictabAction {
	const VIEW	= 10;
	const WRITE	= 30;
	const ADMIN	= 50;
}

class PictabPermission extends Ab_UserPermission {
	
	public function PictabPermission(PictabModule $module){
		
		$defRoles = array(
			new Ab_UserRole(PictabAction::VIEW, Ab_UserGroup::REGISTERED),
			new Ab_UserRole(PictabAction::VIEW, Ab_UserGroup::ADMIN),
			
			new Ab_UserRole(PictabAction::WRITE, Ab_UserGroup::REGISTERED),
			new Ab_UserRole(PictabAction::WRITE, Ab_UserGroup::ADMIN),
			
			new Ab_UserRole(PictabAction::WRITE, Ab_UserGroup::ADMIN),
			new Ab_UserRole(PictabAction::ADMIN, Ab_UserGroup::ADMIN),
		);
		parent::__construct($module, $defRoles);
	}
	
	public function GetRoles(){
		return array(
			PictabAction::VIEW => $this->CheckAction(PictabAction::VIEW),
			PictabAction::WRITE => $this->CheckAction(PictabAction::WRITE),
			PictabAction::ADMIN => $this->CheckAction(PictabAction::ADMIN)
		);
	}
}

Abricos::ModuleRegister(new PictabModule());

?>