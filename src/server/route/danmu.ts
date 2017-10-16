import * as express from "express";
import * as cluster from "cluster";

import { syncTransfer } from '../worker/syncTransfer';
import { Actions } from '../worker/actions';
import { roomParser } from "../lobby/roomParser";
import { log, error } from "../../utils/log";
import { checkout, restore } from "../db/pool";
import { default as sensitive } from "../db/sensitive";
import { Collection } from "../db/collection";
import { cache, get } from "../../utils/caches";

const router = express.Router();

interface IEmoj {
    /** 标识*/
    tag: string;
    /** 表情连接*/
    url: string;
}
/** 缓存数据的标识 */
let syEmoj: Symbol;

router.use((req, res, next) => {
    //utf8编码
    res.setHeader('Content-Type', 'text/html;charset=utf-8');
    //禁止跨域调用
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
})
router.route('/').all((req, res, next) => {
    res.end('请求链接不存在');
})

router.route('/:rid').all((req, res, next) => {
    //房间验证
    roomParser(req.url).then(pathname => {
        log(`Http 房间地址 ${pathname}`);
        next();
    },reason => {
        error(reason);
        responseFailure(res, reason)
    }).catch(reason => {
        error(reason);
        responseFailure(res, reason);
    })
}).get((req, res, next) => {
    //渲染发送页面
    if(!syEmoj) {
        checkout(db => {
            db.collection(Collection.EMOTION).find({active:true}).sort({key:1}).toArray().then(data => {
                if(data){
                    syEmoj = cache(data)
                    res.render('danmu', {title:'弹幕墙HTTP发送端', emojMap: get<IEmoj[]>(syEmoj)});
                }else{
                    responseFailure(res, '没有表情数据')
                }
            }, reason => {
                responseFailure(res, reason);
            })
        }, reason => {
            responseFailure(res, reason);
        })
    }else{
        res.render('danmu', {title:'弹幕墙HTTP发送端', emojMap: get<IEmoj[]>(syEmoj)});
    }   
}).post((req, res, next) => {
    //弹幕数据处理
    roomParser(req.url).then(pathname => {
        //加工敏感词
        req.body.message = sensitive.filter(req.body.message);
        //回复用户
        res.json({ok: true, message: req.body.message});
        //同步线程消息
        syncTransfer({action: Actions.POST,data: req.body.message, pathname:`${req.params.rid}`});
    },reason => {
        responseFailure(res, reason)
    }).catch(reason => {
        responseFailure(res, reason)
    });
})
/**
 * 接口调用错误反馈
 * @param res 
 * @param reason 错误原因
 */
function responseFailure(res:IRespond, reason: string): void {
    error(reason);
    res.json({ok:false, reason});
}

export default router;