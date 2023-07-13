#!/usr/bin/env bash

# MyWxappUnpacker 项目路径
WXAPPUNPACKER_PATH=`pwd`

FILE_FORMAT=wxapkg

wxappUnpacker_pkg()
{
fname=$1
echo "node ${WXAPPUNPACKER_PATH}/wuWxapkg.js ${fname}"
node ${WXAPPUNPACKER_PATH}/wuWxapkg.js ${fname}
return 0;
}

wxappUnpacker()
{
de_dir=$1
    if [ -z "$1" ]
    then
 de_dir=`pwd`
    fi
echo "${de_dir}"
echo "for wxapkg in `find ${de_dir} -name "*.${FILE_FORMAT}"`"
for fname in `find ${de_dir} -name "*.${FILE_FORMAT}"`
do
wxappUnpacker_pkg ${fname}
done
return 0;
}

de_miniapp()
{
if [ "-d" == "$1" ]
     then
wxappUnpacker_pkg $2 $3
  else
  wxappUnpacker $1 $2
    fi
return 0;
}

de_miniapp $1 $2 $3


