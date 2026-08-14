# wxappUnpacker

[![CI](https://github.com/threecha/wxappUnpacker/actions/workflows/ci.yml/badge.svg)](https://github.com/threecha/wxappUnpacker/actions/workflows/ci.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/Node.js-%3E%3D22-339933.svg)](https://nodejs.org/)

基于 Node.js 的微信小程序 `.wxapkg` 解包与资源还原工具。项目可以提取包内文件，并尝试还原 JavaScript、JSON、WXML、WXSS 和 WXS；支持主包、分包和批量处理。

> 本项目只用于学习、调试、兼容性研究以及分析你自己拥有或已获明确授权的小程序。请遵守软件许可、平台规则和适用法律，不要提取、传播或使用未经授权的代码、数据、密钥及个人信息。

## 项目状态

微信小程序编译产物会随微信版本变化，因此资源“还原”不是无损反编译，部分新格式可能无法处理。遇到错误时，请先用 `-o` 验证原始文件能否安全解包，再判断问题属于包加密、包格式还是后续资源还原。

本维护版本主要包含：

- 严格校验 wxapkg 包头、文件表、数据偏移和输出路径。
- 修复部分 `$gwx`、WXSS、分包配置和 VM 执行错误。
- 支持单包、多包、批量目录及主包/分包合并。
- 使用本地 npm 依赖，并在 Node.js 22、24 上持续测试。

## 环境要求

- Node.js 22 或更高版本；推荐当前 LTS 版本。
- npm（随 Node.js 提供）。
- `bingo.sh`、`de_miniapp.sh` 和 `install.sh` 需要 Bash；Windows 用户可直接运行 Node.js 命令。

## 安装

```bash
git clone https://github.com/threecha/wxappUnpacker.git
cd wxappUnpacker
npm ci
```

macOS 或 Linux 也可以运行：

```bash
./install.sh
```

安装脚本只执行项目本地的 `npm ci`，不会使用 `sudo`，也不会全局安装依赖。

## 使用方法

### 解包并还原资源

macOS、Linux：

```bash
node wuWxapkg.js ./path/to/app.wxapkg
```

Windows PowerShell：

```powershell
node .\wuWxapkg.js C:\path\to\app.wxapkg
```

也可以通过 npm 运行：

```bash
npm run unpack -- ./path/to/app.wxapkg
```

默认在包文件旁创建同名目录。例如 `demo.wxapkg` 的输出目录为 `demo/`。

### 只提取原始文件

`-o` 或 `--output-only` 跳过 JavaScript/WXML/WXSS 执行和还原步骤，适合先验证包格式：

```bash
node wuWxapkg.js -o ./path/to/app.wxapkg
```

### 同时处理多个包

```bash
node wuWxapkg.js -o ./first.wxapkg ./second.wxapkg
```

添加 `-f` 或 `--fast` 可并行处理多个输入；并行模式会增加 CPU 和内存占用。

### 主包与分包

先解包主包，再通过 `-s=<主包输出目录>` 解包分包：

```bash
node wuWxapkg.js ./packages/main.wxapkg
node wuWxapkg.js -s=./packages/main ./packages/subpackage.wxapkg
```

等价的长参数为：

```bash
node wuWxapkg.js --main-dir=./packages/main ./packages/subpackage.wxapkg
```

主包目录可以是绝对路径或相对于当前终端目录的路径。

### Bash 辅助脚本

处理单个包：

```bash
./de_miniapp.sh -d ./path/to/app.wxapkg
```

递归处理目录中的所有 `.wxapkg`：

```bash
./de_miniapp.sh ./packages
```

兼容旧用法：

```bash
./bingo.sh ./packages/main.wxapkg
./bingo.sh ./packages/subpackage.wxapkg -s=./packages/main
```

### 参数列表

| 参数 | 作用 |
| --- | --- |
| `-o`, `--output-only` | 只解包，不执行后续资源还原 |
| `-d`, `--keep-intermediate` | 保留还原过程中通常会删除的中间文件 |
| `-f`, `--fast` | 并行处理多个输入包 |
| `-s=<目录>`, `--main-dir=<目录>` | 将输入视为分包并写入指定主包目录 |
| `-h`, `--help` | 显示帮助 |
| `-v`, `--version` | 显示版本 |

## wxapkg 的获取与加密

Android 设备在满足授权和系统访问条件时，可以从微信应用数据目录取得小程序包。不同系统、微信版本及设备权限下的目录和访问方式可能不同。

PC 微信产生的 `__APP__.wxapkg` 经常是加密容器。出现下面的错误通常意味着包仍被加密、文件损坏，或使用了暂不支持的新格式：

```text
Invalid wxapkg magic number. The package may be encrypted, damaged, or use an unsupported format.
```

本仓库不附带来源不明的解密程序，也不提供绕过访问控制的功能。请只使用你有权使用且来源可信的方式取得可分析文件。

## 安全说明

资源还原过程需要执行包内生成的 JavaScript。项目使用 `vm2` 并默认启用以下限制：

- 单次 VM 执行超时：10 秒。
- 禁止异步任务。
- 单次 Buffer 分配上限：32 MiB。

可在特殊情况下调整：

```bash
WXAPP_VM_TIMEOUT_MS=20000 WXAPP_VM_BUFFER_LIMIT_MB=64 node wuWxapkg.js app.wxapkg
```

允许范围分别是 100–60000 毫秒和 1–256 MiB。`vm2` 是同一 Node.js 进程内的隔离层，不应作为唯一安全边界。处理未知或不可信包时，请在没有公司凭据、私钥和敏感文件的容器或一次性虚拟机中运行。参见 [vm2 安全说明](https://github.com/patriksimek/vm2#important-security-disclaimer)。

## 常见问题

### `Magic number` 错误

先确认文件是否为完整、已解密且受支持的 wxapkg。该校验不能也不应该通过删除判断来绕过。

### `subPackage.pages is not iterable`

当前版本会保留分包的其他元数据，将异常的 `pages` 值按空数组处理并输出警告。如果仍缺少页面，请在 Issue 中提供脱敏后的 `app-config.json` 结构。

### 没有生成 `app.json` 或部分 WXML/WXSS

先运行 `node wuWxapkg.js -o <包>`。若原始解包成功而还原失败，请保留完整错误日志和 Node.js 版本；不要上传第三方完整小程序包。

### 提交错误报告

请使用仓库的 [Issue 模板](https://github.com/threecha/wxappUnpacker/issues/new/choose)，提供系统、Node.js 版本、提交 SHA、执行命令和脱敏日志。

## 技术资料与致谢

- 本项目基于 [qwerty472123/wxappUnpacker](https://github.com/qwerty472123/wxappUnpacker) 的工作继续维护。
- 更早的实现细节和格式分析见 [DETAILS.md](DETAILS.md)。
- 感谢所有上游作者、问题报告者和贡献者。

## 许可证

本项目按 [GNU General Public License v3.0 or later](LICENSE) 发布。仓库许可证不改变输入小程序及其资源各自的版权和许可状态。
