# MyWxAppUnpacker

![版本 0.3](https://img.shields.io/badge/版本-0.3-red.svg) ![支持的微信版本 >20180111](https://img.shields.io/badge/%E5%BE%AE%E4%BF%A1%E7%89%88%E6%9C%AC-%3E=20180111-brightgreen.svg)

> Wechat App(微信小程序, .wxapkg)解包及相关文件(.wxss, .json, .wxs, .wxml)还原工具

## update 
本人也是开源工具获益者，在使用工具其中发现的一些问题做了顺手修复

主要修复如下问题
1. upexpected end of input 「这个问题修正后会出现问题2」
2. 修复抛出异常bridge.from异常。
3. 有些包在解包时候报错 纠正wxml和 wxss时候报错。可能是由于包被加密了 需要先用解密工具解密一下。「解密工具可见首页另一个项目」

![Alt text](image.png)
![Alt text](image-1.png)
## 1. 说明

- 本文是基于 [wxappUnpacker](https://github.com/qwerty472123/wxappUnpacker "wxappUnpacker") 创作的。
> - [x] 修复 “ReferenceError: $gwx is not defined” 和 extract wxss 等问题
> - [x] 支持分包
> - [x] 支持一键解包
> - [x] 支持一键安装各种依赖

一键匹配、统计文本中的内容，请下载 [calcwords](https://github.com/larack8/calcwords "calcwords") 。

### 2. wxapkg 包的获取

Android 手机最近使用过的微信小程序所对应的 wxapkg 包文件都存储在特定文件夹下，可通过以下命令查看：

    adb pull /data/data/com.tencent.mm/MicroMsg/{User}/appbrand/pkg ./

其中`{User}` 为当前用户的用户名，类似于 `2bc**************b65`。

## 3. 用法

用法分 mac 和 windows，请根据系统来操作

### 1. for Mac OS (Mac操作系统)

- 安装npm和node

```bash
./install.sh -npm
```

- 安装依赖

```bash
./install.sh
```

- 解包某个小程序

```bash
./de_miniapp.sh  -d 小程序包路径(.wxapkg格式)
```

- 一键解文件夹下所有小程序

```bash
./de_miniapp.sh  小程序包所在文件夹
```

- 一键解当前文件夹下所有小程序

```bash
./de_miniapp.sh
```

** 举例

Mac OS
```bash
./de_miniapp.sh -d ./testpkg/_-751579163_42.wxapkg
```

![解包后的目录文件](testpkg/testdir.png)

### 2. for 通用操作系统（Windows 和 Mac）

- 解包某个小程序

```bash
node wuWxapkg.js 小程序包路径(.wxapkg格式)
```

** 举例

```bash
node wuWxapkg.js testpkg\_-751579163_42.wxapkg
```

- 分包功能

当检测到 wxapkg 为子包时, 添加-s 参数指定主包源码路径即可自动将子包的 wxss,wxml,js 解析到主包的对应位置下. 完整流程大致如下: 
1. 获取主包和若干子包
2. 解包主包 `./bingo.sh testpkg/master-xxx.wxapkg`
3. 解包子包 `./bingo.sh testpkg/sub-1-xxx.wxapkg -s=../master-xxx`

TIP
> -s 参数可为相对路径或绝对路径, 推荐使用绝对路径, 因为相对路径的起点不是当前目录 而是子包解包后的目录

```
├── testpkg
│   ├── sub-1-xxx.wxapkg #被解析子包
│   └── sub-1-xxx               #相对路径的起点
│       ├── app-service.js
│   ├── master-xxx.wxapkg
│   └── master-xxx             # ../master-xxx 就是这个目录
│       ├── app.json
```

### 4. 提取统计WXSS或者其他样式

`详情参照` [calcwords](https://github.com/larack8/calcwords "calcwords")

1. 下载calcwords源码

```bash
git clone https://github.com/larack8/calcwords
```

2. 设置统计的.wxapkg路径和输入结果路径，调用 calcWxssStyle

```bash
	public static void testCalcWords() throws IOException {
		String fromFilePath = "/Users/Shared/my_git/java/CalcWords/testletters/";
		String resultFilePath = "/Users/Shared/my_git/java/CalcWords/result.txt";

		calcWxssStyle(fromFilePath, resultFilePath);// 统计微信小程序源码WWXSS样式
//		calcWxssProperty(fromFilePath, resultFilePath);// 统计微信小程序源码WXSS属性
	}
```

3. 打开输出结果文件

如下图样式

![输出结果文件](testpkg/cc.png)
