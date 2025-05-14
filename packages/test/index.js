const { v2: webdav } = require("webdav-server");
const path = require("path");
const getRawBody = require("raw-body");

// 创建用户管理器和添加用户
const userManager = new webdav.SimpleUserManager();
const user = userManager.addUser("admin", "123456", false);

// 权限管理器
const privilegeManager = new webdav.SimplePathPrivilegeManager();
privilegeManager.setRights(user, "/", ["all"]);

// 中间件：限制请求体大小
const bodyMiddleware = async (ctx, next) => {
  try {
    ctx.request.body = await getRawBody(ctx.req, {
      limit: "20mb", // 最大 20 MB
      encoding: null, // 二进制数据
    });
    await next();
  } catch (err) {
    console.error(`❌ Request body too large:`, err);
    ctx.setResponseCode(413); // 请求实体过大
    ctx.end();
  }
};

// 创建 WebDAV 服务器
const server = new webdav.WebDAVServer({
  port: 1900,
  hostname: "0.0.0.0",
  rootFileSystem: new webdav.PhysicalFileSystem(path.join(__dirname, "music")),
  httpAuthentication: new webdav.HTTPBasicAuthentication(userManager),
  privilegeManager,
  httpServerOptions: {
    maxHeadersSize: 16384, // 16 KB 头部
    onRequest: (req, res) => {
      req.setTimeout(60000); // 60 秒超时
      res.setHeader("Accept-Ranges", "bytes"); // 支持范围请求
      console.log(`📡 Request: ${req.method} ${req.url}`);
    },
  },
  beforeRequest: [bodyMiddleware],
});

// 启动服务器
server.start((httpServer) => {
  console.log("✅ WebDAV 启动，用户 admin，密码 123456，端口 1900");
  httpServer.setTimeout(60000);
  httpServer.maxConnections = 100;
});
