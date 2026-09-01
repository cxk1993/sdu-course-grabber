/**
 * @author 汐瑶 (适配自 Grapedge/SDU-AddCourse)
 * @description 山东大学统一认证登录（新版 pass.sdu.edu.cn CAS）
 *
 * 新版登录流程（2026-09-01 实测验证通过）：
 *   1. GET https://pass.sdu.edu.cn/cas/login?service=... 拿 lt/execution + cookie
 *   2. POST /cas/device 带设备指纹 + DES加密账号密码 → 服务端校验
 *      - 返回 bind   → 新设备需短信二次验证（m=3 提交验证码）
 *      - 返回 binded → 设备已信任，直接放行（本机已验证绑定）
 *      - 返回 pass   → 直接放行
 *      - 返回 validErr/notFound → 账号密码错误
 *   3. 校验通过后 POST 登录表单（rsa/ul/pl/lt/execution/_eventId）→ 拿 ticket
 *   4. 跟随跳转进入业务系统
 *
 * 注意：des.js 加密算法与老系统完全一致（strEnc(data,'1','2','3')）
 * 注意：设备指纹从 config.local.js 读取（.gitignore 排除，不入库）
 */
const fetch = require('./api/fetch');
const desEnc = require('./api/des');
const local = require('../config.local.js');

const CAS_BASE = 'https://pass.sdu.edu.cn/cas';
// service 目标：智慧教学平台（选课系统入口）
const SERVICE_URL = 'http://bkzhjx.wh.sdu.edu.cn/';
const SERVICE_ENC = encodeURIComponent(SERVICE_URL);
const LOGIN_URL = `${CAS_BASE}/login?service=${SERVICE_ENC}`;
const DEVICE_URL = `${CAS_BASE}/device`;

// 设备指纹参数 —— 从本地配置读取（首次登录绑定设备时生成，勿与他人共用）
const FINGERPRINT = {
  d: local.fingerprint.d,
  d_s: local.fingerprint.d_s,
  d_md5: local.fingerprint.d_md5,
  d_browser_md5: local.fingerprint.d_browser_md5,
  i: local.fingerprint.i
};

const getLoginData = async url => {
  const res = await fetch(url, {
    method: 'get',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'zh-CN,zh;q=0.9'
    }
  });
  const html = await res.text();
  const lt = /name="lt" value="(.*)"/.exec(html);
  const execution = /name="execution" value="(.*)"/.exec(html);
  const _eventId = /name="_eventId" value="(.*)"/.exec(html);
  if (!lt || !execution || !_eventId) {
    throw new Error('无法解析 CAS 登录页表单字段');
  }
  return { lt: lt[1], execution: execution[1], _eventId: _eventId[1] };
};

// 第一步：设备校验（m=1）
const deviceCheck = async (username, password, lt) => {
  const body = new URLSearchParams({
    d: FINGERPRINT.d,
    d_s: FINGERPRINT.d_s,
    d_md5: desEnc(FINGERPRINT.d_md5, '1', '2', '3'),
    d_browser_md5: desEnc(FINGERPRINT.d_browser_md5, '1', '2', '3'),
    i: desEnc(FINGERPRINT.i, '1', '2', '3'),
    m: '1',
    u: desEnc(username, '1', '2', '3'),
    p: desEnc(password, '1', '2', '3')
  }).toString();
  const res = await fetch(DEVICE_URL, {
    method: 'post',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const ret = JSON.parse(await res.text());
  return ret;
};

// 第二步：提交短信验证码绑定设备（m=3）—— 仅新设备首次登录需要
const deviceBind = async (username, code) => {
  const body = new URLSearchParams({
    d: FINGERPRINT.d_s,
    i: FINGERPRINT.i,
    m: '3',
    u: username,
    c: code,
    s: '1'
  }).toString();
  const res = await fetch(DEVICE_URL, {
    method: 'post',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const ret = JSON.parse(await res.text());
  return ret;
};

const login = async (username, password, from) => {
  const url = `${CAS_BASE}/login?service=${encodeURIComponent(from)}`;
  const { lt, execution, _eventId } = await getLoginData(url);

  // 设备校验
  const check = await deviceCheck(username, password, lt);
  if (check.info === 'validErr' || check.info === 'notFound') {
    return [false, '用户名或密码错误'];
  }
  if (check.info === 'mobileErr') {
    return [false, '账号尚未绑定手机'];
  }
  if (check.info === 'bind') {
    // 需要短信验证码绑定设备 —— 返回特殊标记，由调用方提示用户
    return [false, `NEED_BIND:${check.m || ''}`];
  }
  if (check.info !== 'binded' && check.info !== 'pass') {
    return [false, `设备校验异常: ${check.info}`];
  }

  // 提交登录表单
  const rsa = desEnc(username + password + lt, '1', '2', '3');
  const body = [
    `rsa=${encodeURIComponent(rsa)}`,
    `ul=${username.length}`,
    `pl=${password.length}`,
    `lt=${encodeURIComponent(lt)}`,
    `execution=${encodeURIComponent(execution)}`,
    `_eventId=${encodeURIComponent(_eventId)}`
  ].join('&');
  const res = await fetch(url, {
    method: 'post',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual'
  });
  const text = await res.text();
  const errorReg = /id="errormsg".*?>(.*?)<\//;
  const error = errorReg.exec(text);
  if (error != null) {
    return [false, error[1]];
  }
  const location = res.headers.raw()['location'];
  if (!location || !location[0]) {
    return [false, '登录响应异常，未获得跳转'];
  }
  // 跟随跳转（可能多级 302），返回最终可达的业务系统页面
  let cur = location[0];
  for (let i = 0; i < 6; i++) {
    const r = await fetch(cur, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' } });
    const next = r.headers.raw()['location'];
    if (!next || !next[0]) {
      const finalText = await r.text();
      const title = /<title>([^<]*)</.exec(finalText)?.[1] || '';
      if (r.status === 500) {
        return [false, `业务系统兑换 ticket 失败(HTTP 500)，可能是非选课时段或系统限制`];
      }
      return [true, { finalUrl: cur, title, status: r.status }];
    }
    cur = next[0];
  }
  return [false, '跳转链过长'];
};

module.exports = (username, password) => login(username, password, SERVICE_URL);
module.exports.deviceBind = deviceBind;
module.exports.CAS_BASE = CAS_BASE;
module.exports.SERVICE_URL = SERVICE_URL;
