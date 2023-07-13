#!/usr/bin/env bash

install_dependency()
{
echo "1. install dependency"

sudo npm install esprima -g
sudo npm install css-tree -g
sudo npm install cssbeautify -g
sudo npm install vm2 -g
sudo npm install uglify-es -g
sudo npm install js-beautify -g
sudo npm install escodegen -g

echo "2. npm list"
npm list esprima
npm list css-tree
npm list cssbeautify
npm list vm2
npm list uglify-es
npm list js-beautify
npm list escodegen

# echo "3. npm install"
# npm install
	return 0;
}

install_npm()
{
echo "install node"
brew install node
echo "node versin is"
node -v
echo "npm versin is"
npm -v
echo "install n"
npm i -g n
echo "update to stable"
n stable
npm i npm

# npm i handlebars --reg=https://registry.npmjs.org
	return 0;
}

check_menu()
{
    menu=$1
    args=$2
    param=$3

  if [ "-npm" == "$1" ]
   then  install_npm $args $param
      elif [ "-dpc" == "$1" ]
    then
     install_dependency $args $param
   else
    install_dependency $1 $2
   fi
   	return 0;
}

# 菜单
check_menu $1 $2 $3
