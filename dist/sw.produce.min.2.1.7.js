(() => {
  "use strict";
  importScripts(
    './sw/sw-moudules.utils.js', // 工具函数
    './sw/sw-moudules.domain.js', // 域名切换相关
    './sw/sw-moudules.page.js', // 域名切换页面
    './sw/sw-moudules.webpush.js', // 极光相关函数
  );


  self.addEventListener("install", event => {
    event.waitUntil(self.skipWaiting());
  }),

    self.addEventListener("fetch", event => {
      // 避免处理非同源请求
      const url = new URL(event.request.url);
      if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
      if (url.pathname.includes('/api/') || url.pathname.includes('.')) { // 避免处理 api 请求和静态资源请求
        return;
      }
      // 处理c域名
      event.respondWith(
        (async () => {
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              return networkResponse;
            }
            // 如果网络响应不正常，抛出错误进入 catch 块
            throw new Error('network error when fetching request');
          } catch (err) {
            // 记录错误（替换为你自己的错误日志函数）
            console.error('请求失败:', err);
    
            if (!navigator.onLine) {
              // 离线：返回自定义离线页面
              return new Response(
                '<h1>navigator is offLine,Please check the device network</h1>',
                {
                  status: 503,
                  headers: { 'Content-Type': 'text/html' },
                }
              );
            } else {
              // 在线：生成并缓存动态页面
              const htmlContent = createDynamicOnlinePage(buildStringMap());
              // 异步缓存响应
              try {
                const cache = await caches.open('online-page');
                const cacheRequest = new Request(self.location.origin + '/sw-page.html');
                await cache.put(cacheRequest, htmlContent.clone());
              } catch (cacheError) {
                console.error('缓存失败:', cacheError);
              }
    
              // 优先返回新生成的响应，或从缓存中获取
              const cacheRequest = new Request(self.location.origin + '/sw-page.html');
              const cachedResponse = await caches.match(cacheRequest);
              console.log(cachedResponse,'cachedResponse')
              return cachedResponse || htmlContent;
            }
          }
        })()
      );
    }),
    self.addEventListener("message", async function (t) {
      const e = t.data || { code: 0, msg: {} };
      var n;
      9999 === e.code &&
        ((n = e.msg),
          s("https://webpushstat.api.engagelab.cc/v4/web/report", n.data, {
            headers: { Authorization: n.Authorization },
          })),
        6666 === t.data.code &&
        a(
          [{ type: "msg_status", msg_id: e.msg.msg_id, result: 3018 }],
          e.msg
        );
    }),
    self.addEventListener("notificationclick", function (t) {
      const e = t.notification.data;
      if (!e) return;
      // 原生 Web Push: data 是 { url }, 直接打开
      if (!e.engagelab_url && !e.engagelab_uid && !e.engagelab_mesg_type) {
        const url = e.url || '/';
        t.notification.close();
        t.waitUntil(self.clients.openWindow(url));
        return;
      }
      // 极光: 上报点击 + 打开 engagelab_url
      const s = "MTPush" === e.engagelab_mesg_type ? "MTPush" : "W3Push";
      a(
        [{ type: "msg_status", msg_id: t.notification.tag, result: 3002 }],
        e,
        s
      );
      let n = e.engagelab_url;
      if (t.action && e.engagelab_action_urls && e.engagelab_action_urls[t.action]) {
        n = e.engagelab_action_urls[t.action];
      }
      if (n) {
        if (n.includes('redirect=')) {
          n = self.location.origin + n.split('redirect=')[1] + '?timestamp=' + new Date().getTime();
        }
        console.log('跳转页面:', n);
        t.notification.close();
        t.waitUntil(self.clients.openWindow(n));
      }
    }),
    self.addEventListener("push", function (t) {
      if (!t.data) return;
      const e = t.data.json();
      console.log('SW 收到的推送原文:', JSON.stringify(e));

      // 极光(EngageLab)推送带嵌套 data + engagelab_* 字段; 原生 Web Push 是扁平结构
      const isEngageLab = !!(e.data && (e.data.engagelab_url || e.data.engagelab_uid || e.data.engagelab_mesg_type));

      if (isEngageLab) {
        // 上报已送达 + 转发给打开中的页面 (in-app 消息)
        a([{ type: "msg_status", msg_id: e.tag, result: 3001 }], e.data);
        self.clients.matchAll().then((clients) => {
          clients && clients.forEach((client) => { client.postMessage(e); });
        });
      }

      // 兼容两种 payload 的标题/正文
      const content = (e.data && e.data.content) || '';
      const title = e.title || content || '';
      const body = e.body || content || '';
      const s = self.registration.showNotification(title, Object.assign({}, e, {
        body: body,
        tag: e.tag,
        data: isEngageLab ? e.data : { url: (e.data && (e.data.toUrl || e.data.toUrl1 || e.data.toUrl2)) || e.url || '/' },
      }));

      if (isEngageLab) {
        a([{ type: "msg_status", msg_id: e.tag, result: 3018 }], e.data);
      }
      t.waitUntil(s);
    }
    );
  self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
  });
})();

