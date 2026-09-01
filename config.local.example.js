/**
 * 配置模板 —— 复制为 config.local.js 并填入真实信息
 *
 * ⚠️ config.local.js 已被 .gitignore 排除，不会提交到仓库。
 * 真实学号/密码/设备指纹只允许放在 config.local.js 中。
 */
module.exports = {
  // 学号
  username: '你的学号',
  // 统一认证密码
  password: '你的密码',
  // 设备指纹（首次登录绑定设备时生成，勿与他人共用）
  fingerprint: {
    d: '你的设备指纹d',
    d_s: '你的设备指纹d_s',
    d_md5: '你的设备指纹d_md5',
    d_browser_md5: '你的设备指纹d_browser_md5',
    i: '你的设备指纹i'
  }
};
