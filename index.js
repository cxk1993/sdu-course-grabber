/**
 * @author 汐瑶 (适配自 Grapedge/SDU-AddCourse)
 * @description 山东大学选课/抢课辅助脚本（适配新版统一认证）
 *
 * ⚠️ 使用前必读：
 *   1. 本脚本当前已验证「登录链路」完整可用（2026-09-01 实测通过）
 *   2. 选课接口（查容量/提交选课）需要在实际选课季才能验证——智慧教学平台
 *      在非选课季对 ticket 兑换返回 500，属平台侧限制，非脚本问题
 *   3. 首次使用请先执行：cp config.local.example.js config.local.js
 *      并填入学号/密码（config.local.js 已被 .gitignore 排除，不会提交）
 *
 * 配置方法：
 *   username: 学号（在 config.local.js 中配置）
 *   password: 统一认证密码（在 config.local.js 中配置）
 *   course: [{ kch: 课程号, kxh: 课序号 }, ...]
 */
const app = require('./src/app');
const auth = require('./src/auth');
const local = require('./config.local.js');

const config = {
  username: local.username,
  password: local.password,
  course: [
    // { kch: '课程号', kxh: '课序号' }
    // 示例：{ kch: 'sd00130080', kxh: '0' }
  ]
};

// 导出登录模块供调试
module.exports = { config, auth };

// 如果配置了课程才自动开抢；否则只提示配置
if (config.course.length === 0) {
  console.log('【提示】course 列表为空，未启动抢课。');
  console.log('【提示】请先在 index.js 的 config.course 中填入要抢的课程号(kch)和课序号(kxh)');
  console.log('【提示】登录测试：node test-login.js');
} else {
  app(config);
}
