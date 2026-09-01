/**
 * 登录测试脚本 —— 只验证登录链路，不触碰任何选课操作
 * 用法：node test-login.js
 *
 * 首次使用（新设备）会自动引导短信验证码绑定，之后免短信登录。
 */
const readline = require('readline');
const auth = require('./src/auth');
const { config } = require('./index');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = q => new Promise(resolve => rl.question(q, resolve));

(async () => {
  console.log('=== 山东大学统一认证登录测试 ===');
  console.log('目标: ' + auth.SERVICE_URL);
  console.log('学号: ' + config.username);
  const t0 = Date.now();
  let result = await auth(config.username, config.password);
  let cost = ((Date.now() - t0) / 1000).toFixed(1);

  // 首次使用：设备未绑定，需要短信验证码
  if (!result[0] && typeof result[1] === 'string' && result[1].startsWith('NEED_BIND:')) {
    const phone = result[1].split(':')[1] || '未知';
    console.log(`\n⚠️ 新设备首次登录，需要短信验证码绑定（${cost}s）`);
    console.log('绑定手机: ' + phone);
    console.log('请查看手机短信，输入 6 位验证码：');
    const code = await ask('> ');
    rl.close();
    if (!code.trim()) {
      console.log('❌ 未输入验证码，退出。');
      process.exit(1);
    }
    console.log('正在绑定设备...');
    const bindRes = await auth.deviceBind(config.username, code.trim());
    if (bindRes.info === 'ok' || bindRes.info === 'most') {
      console.log('🎉 设备绑定成功！重新登录...');
      const t1 = Date.now();
      result = await auth(config.username, config.password);
      cost = ((Date.now() - t1) / 1000).toFixed(1);
    } else {
      console.log('❌ 绑定失败: ' + bindRes.info + (bindRes.msg ? ' ' + bindRes.msg : ''));
      console.log('提示：验证码5分钟内有效，错误多次需重新获取。');
      process.exit(1);
    }
  }

  if (result[0]) {
    console.log(`\n🎉 登录成功 (${cost}s)`);
    console.log('最终页面: ' + result[1].finalUrl);
    console.log('页面标题: ' + result[1].title);
    console.log('HTTP状态: ' + result[1].status);
    console.log('\n✅ 登录链路正常。若要抢课，请在 index.js 的 course 列表填课号。');
  } else {
    console.log(`\n❌ 登录失败 (${cost}s): ${result[1]}`);
  }
  process.exit(0);
})().catch(e => {
  console.log('💥 异常: ' + e.message);
  process.exit(1);
});
