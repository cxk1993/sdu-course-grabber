# 去抢课吧 —— 山东大学选课/抢课辅助脚本（新版适配）

> 适配自 [Grapedge/SDU-AddCourse](https://github.com/Grapedge/SDU-AddCourse)，GPL-3.0 许可。
> 新版统一认证适配：汐瑶（2026-09-01），登录链路实测通过。

## 作者

- **仓库维护：** [cxk1993](https://github.com/cxk1993)
- **新版适配：** 汐瑶（Hermes Agent）
- **原版作者：** [Grapedge](https://github.com/Grapedge)（Grapedge/SDU-AddCourse）

## 背景：老脚本为什么失效

山大在多年前更换了统一身份认证：
- ~~`passt.sdu.edu.cn`~~ → 已废弃（脚本原版用的就是这个，所以直接卡死）
- ~~`bkjwxk.sdu.edu.cn`~~ → 已废弃（原版抢课接口也在这，没了）
- ✅ 现役：`pass.sdu.edu.cn`（新统一认证，https）+ `bkzhjx.wh.sdu.edu.cn`（智慧教学平台）

## 新版登录流程（已破解并适配）

新认证在提交登录表单前多了一道「设备校验」（`/cas/device`）：

1. `GET /cas/login` 拿 `lt`/`execution` + cookie
2. `POST /cas/device` 带设备指纹 + DES 加密账号密码
   - `binded` / `pass` → 放行（本机已验证，免短信）
   - `bind` → 需短信验证码绑定设备（换新机器/新指纹时才出现）
   - `validErr` / `notFound` → 账号密码错误
3. 通过后提交登录表单（`rsa`/`ul`/`pl`/`lt`/`execution`/`_eventId`）→ 拿 ticket
4. 跟随跳转进入智慧教学平台

加密算法 `des.js` 新旧一致（`strEnc(data,'1','2','3')`），无需改动。

## 使用方法

### 1. 安装依赖

```bash
npm install --registry=https://registry.npmjs.org
```

> ⚠️ 原项目的 package-lock.json 锁死了已停用的淘宝镜像（证书过期），
> 已删除改用官方源，如遇安装问题先删 package-lock.json 再装。

### 2. 配置

编辑 `index.js`：

```js
const config = {
  username: '学号',
  password: '密码',
  course: [
    { kch: '课程号', kxh: '课序号' },
    // 示例：{ kch: 'sd00130080', kxh: '0' }
  ]
};
```

### 3. 测试登录（不抢课）

```bash
node test-login.js
```

### 4. 开始抢课

```bash
node index.js
```

## 现状与限制（重要）

| 环节 | 状态 | 说明 |
|---|---|---|
| 统一认证登录 | ✅ 已验证 | 2026-09-01 用真实账号实测通过 |
| 设备绑定 | ✅ 已绑定 | 本机指纹已信任，无需短信 |
| ticket 兑换平台 | ✅ 已验证 | HTTP 200，拿到平台页面 |
| **选课接口** | ⏳ 待选课季验证 | 非选课季平台对 ticket 返回 500，属平台侧限制 |

**选课接口（查容量/提交选课）需要在实际选课季才能验证**，届时：
1. 登录成功后观察平台前端实际调用的接口（DevTools → Network）
2. 对照老版 `src/app.js` 的 `kcsearch`/`add` 逻辑适配成新接口
3. 老版查容量接口：`POST /b/xk/xs/kcsearch`（已废弃，仅参考）

## 安全说明

- 脚本全程本地运行，密码只发往山大官方认证平台（`pass.sdu.edu.cn`）
- 无第三方服务器、无埋点、无数据外传
- 设备指纹为绑定时的固定值，请勿修改（改了会触发重新绑定）
- ⚠️ 抢课脚本属于灰色地带，学校理论上禁止自动抢课，请自行斟酌使用

## 红线

- 未授权不碰选课接口（`test-login.js` 只测登录）
- 不提交任何与教学无关的操作
- 本工具仅用于个人选课便利，不用于商业用途
