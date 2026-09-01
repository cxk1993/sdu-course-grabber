/**
 * 登录测试脚本 —— 只验证登录链路，不触碰任何选课操作
 * 用法：node test-login.js
 */
const auth = require('./src/auth');
const { config } = require('./index');

(async () => {
  console.log('=== 山东大学统一认证登录测试 ===');
  console.log('目标: ' + auth.SERVICE_URL);
  console.log('学号: ' + config.username);
  const t0 = Date.now();
  const result = await auth(config.username, config.password);
  const cost = ((Date.now() - t0) / 1000).toFixed(1);

  if (result[0]) {
    console.log(`\n🎉 登录成功 (${cost}s)`);
    console.log('最终页面: ' + result[1].finalUrl);
    console.log('页面标题: ' + result[1].title);
    console.log('HTTP状态: ' + result[1].status);
    console.log('\n✅ 登录链路正常。若要抢课，请在 index.js 的 course 列表填课号。');
  } else {
    const msg = result[1];
    if (typeof msg === 'string' && msg.startsWith('NEED_BIND:')) {
      console.log(`\n⚠️ 新设备需要短信验证码绑定 (${cost}s)`);
      console.log('绑定手机: ' + msg.split(':')[1]);
      console.log('请调用 deviceBind 提交短信验证码完成设备绑定，之后即可免短信登录。');
    } else {
      console.log(`\n❌ 登录失败 (${cost}s): ${msg}`);
    }
  }
  process.exit(0);
})().catch(e => {
  console.log('💥 异常: ' + e.message);
  process.exit(1);
});
