<?php
/**
 * @package Abricos
 * @subpackage Pictab
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */


/**
 * Class PictabModule
 */
class PictabModule extends Ab_Module {

    public function __construct(){
        $this->version = "0.1.1";
        $this->name = "pictab";
        $this->takelink = "pictab";
        $this->permission = new PictabPermission($this);
    }

    public function GetContentName(){
        $cname = '';
        $adress = Abricos::$adress;

        if ($adress->level >= 2 && $adress->dir[1] == 'uploadimg'){
            $cname = $adress->dir[1];
        }
        return $cname;
    }

}

class PictabAction {
    const VIEW = 10;
    const WRITE = 30;
    const ADMIN = 50;
}

class PictabPermission extends Ab_UserPermission {

    public function __construct(PictabModule $module){

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
