#!/usr/bin/env bash

# npm config set proxy http:web-proxy.tencent.com:8080
# npm config set proxy http://127.0.0.1:12759

npm_set_proxy()
{
    if [ "-s" == "$1" ]
     then
echo "npm config set proxy http://127.0.0.1:12759"
  npm config set proxy http://127.0.0.1:12759
  echo "npm config set https-proxy http://127.0.0.1:12759"
npm config set https-proxy http://127.0.0.1:12759
    elif [ "-d" == "$1" ]
     then
echo "npm config delete proxy"
  npm config delete proxy
  echo "npm config delete https-proxy"
npm config delete https-proxy
    fi
	return 0;
}

git_set_proxy()
{
    if [ "-s" == "$1" ]
     then
echo "npm config set proxy http://127.0.0.1:12759"
  npm config set proxy http://127.0.0.1:12759
  echo "npm config set https-proxy http://127.0.0.1:12759"
npm config set https-proxy http://127.0.0.1:12759
    elif [ "-d" == "$1" ]
     then
echo "npm config delete proxy"
  npm config delete proxy
  echo "npm config delete https-proxy"
npm config delete https-proxy
    fi
	return 0;
}

check_menu()
{
    menu=$1
    args=$2
    param=$3

  if [ "-git" == "$1" ]
   then  git_set_proxy $args $param
       elif [ "-npm" == "$1" ]
     then
     npm_set_proxy $args $param
     else   npm_set_proxy $1 $2
   fi
   	return 0;
}

# 菜单
check_menu $1 $2 $3
