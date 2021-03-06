/*
 * @Author: iDzeir 
 * @Date: 2017-11-08 10:30:41 
 * @Last Modified by: iDzeir
 * @Last Modified time: 2017-12-13 15:55:07
 */

import * as expressSession from 'express-session';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from "body-parser";
import * as cluster from 'cluster';
import * as favicon from 'serve-favicon';
import * as path from 'path';
import * as connectMongo from 'connect-mongo';
import * as compression from 'compression';
import * as md5 from 'md5';

import {log} from '../utils/log';
import {secret,ports,DOMAIN} from './config/conf'
import {WorkerEvent} from './worker/events';
import danmuRouter from './route/danmu';
import pageRouter from './route/page';
import apiRouter from './route/api';
import adminApp from './route/admin'

//less文件中间件
import less = require('less-middleware');

const app = express();
const MongoStore = connectMongo(expressSession);

app.disable('x-powered-by');
log('服务器运行环境：' + app.get('env'));

app.use((req, res, next) => {
    res.setHeader('Server','DamaServer')
    next();
})

//静态资源
app.use(favicon(path.resolve('public','favicon.ico')));
app.use('/static',express.static('public'));
app.use('/js',express.static(path.resolve('dist','browser')));

//所有请求压缩
app.use(compression());

//json 化数据 application/json
app.use(bodyParser.json());
// application/x-www-form-url
app.use(bodyParser.urlencoded({extended:true}));
// 获取请求cookie
app.use(cookieParser(secret));
//multipart/form-data
//app.use(multer());

//线上环境使用mongodb 存储session 默认自动删除过期session
app.use(expressSession({
    resave:false,
    saveUninitialized:true,
    secret,
    store:new MongoStore({
        url:`mongodb://${DOMAIN}:${ports.db}/sessions`,
        //session一天有效期
        ttl: 24 * 60 * 60,
    }),
    genid:(req) => {
        let time = Date.now().toString(36) + `_${secret}_` + Math.floor(Math.random() * 1000);
        const user = `${req.connection.remoteAddress}:${req.connection.remotePort}`;
        return Buffer.from(md5(`${time}_${user}`)).toString('base64');
    }
}));

//less 文件编译,服务器重启后并且有请求会生成一次
app.use('/less',less(path.resolve('src','browser','less'),{
    dest:path.resolve('public','less'),
    once:false
}), express.static(path.resolve('public','less')));

//模板路径
app.set('views','./views');
app.set('view engine','pug');
app.set('view cache', false);

//页面导航
app.use(pageRouter);
//http 接受聊天信息路由
app.use('/danmu',danmuRouter);
//接口api
app.use('/api', apiRouter);
//管理员路由
app.use(adminApp);

//flash crossdomain.xml
app.use('/crossdomain.xml', (req, res, next) => {
    res.contentType('xml');
    res.end(`<?xml version="1.0" encoding="UTF-8"?>
            <cross-domain-policy>
                    <allow-access-from domain="*"/>
            </cross-domain-policy>`)
})

app.use((req, res, next) => {
    log('访问未知页面',req.url);
    res.redirect(`/error/?url=${req.url}`);
})

const server = app.listen(ports.web,() => {
    const {address,port} = server.address();
    log(`http服务器启动: http://${address}:${port}`);
})

//线程管理
if(cluster.isMaster){
    // 异步模块调用
    async function workerGo() {
        const [
            { syncTransfer },
            { Actions: actions },
            {increaseOne, reduceOne, reduceAll},
            { cpus },
            {default: sensitive}
        ] = await Promise.all([
            import('./worker/syncTransfer'),
            import('./worker/actions'),
            import('./net/online'),
            import('os'),
            import('./db/danmuCertify')
        ])

        let { setupUnique } = await import('./db/pool');
        log('创建MongoDB索引');
        let indexes = await setupUnique();
        log(`共创建 ${indexes.length} 个索引`);

        //全局敏感词初始化
        log('加载全局通用敏感词')
        let sensitives = await sensitive.setup();
        //log('敏感词：',JSON.stringify(sensitives))

        return {
            syncTransfer, 
            actions, 
            increaseOne, 
            reduceOne, 
            reduceAll, 
            cpuNum: cpus().length, 
            sensitives
        };
    }

    
    workerGo().then(({
        syncTransfer, 
        cpuNum, 
        actions, 
        increaseOne, 
        reduceOne, 
        reduceAll, 
        sensitives}) => {
        //启动弹幕线程
        log(`主线程 PID: ${process.pid}, CPU: ${cpuNum} 个`);

        cluster.setupMaster({
            exec: path.resolve(__dirname,'worker','DanmuWorker.js'),
            args:[ports.ws.toString()],
        });
        let workerSet: Set<cluster.Worker> = new Set();
        for(let i = 0; i < cpuNum; ++i) {
            workerSet.add(cluster.fork());
        }
        cluster.on(WorkerEvent.EXIT,(worker,code,signal) => {
            log(`工作线程意外关闭 code: ${code}, signal: ${signal}`);
            syncTransfer({action: actions.DESTROY, data: reduceAll(worker)}, worker);
            //重启线程
            if(!worker.exitedAfterDisconnect) {
                log('主线程重启工作线程');
                process.nextTick(() => cluster.fork());
            }
        }).on(WorkerEvent.MESSAGE, (worker,message) => {
            let {action,pathname} = message;
            if(action === actions.ENTRY) {
                Object.assign(message,{total:increaseOne(worker, pathname)});
            }else if(action === actions.LEAVE) {
                Object.assign(message,{total:reduceOne(worker, pathname)});
            }
            syncTransfer(message, worker);
        }).on(WorkerEvent.FORK,(worker) => {
            worker.send({action:actions.BANS, data:sensitives})
            if(workerSet.size > 0) {
                workerSet.delete(worker);
                workerSet.size === 0 && log('工作线程启动完成');
            }else{
                log('工作线程重启成功')
            }
        })
    })
}