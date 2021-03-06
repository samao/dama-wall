/*
 * @Author: iDzeir 
 * @Date: 2017-11-08 10:30:02 
 * @Last Modified by: iDzeir
 * @Last Modified time: 2017-11-08 18:07:18
 */

import * as express from 'express';
import * as path from 'path';
import * as md5 from 'md5';
import * as url from 'url';

import { checkout, restore, insert, IUserDB, getAutoKey } from '../db/pool';
import { Collection } from '../db/collection';
import { log, error } from '../../utils/log';
import { call } from '../../utils/ticker';
import { cache, get } from '../../utils/caches';
import { failure, success } from '../../utils/feedback';
import { Error } from '../error/error';
import { secret } from '../config/conf';

const router = express.Router();

enum Level {
    REPORTER = 0,
    MASTER = 99,
    OWNER = 999
}

interface ISessionData {
    expires: number;
    user: string;
    isAdmin?: boolean;
    level?: Level;
}

/** 页面导航数据接口 */
interface IPageConf {
    /**
     * 显示顺序
     */
    id: number;
    /**
     * 连接目标
     */
    ref: string;
    /**
     * 连接内容
     */
    label: string;
    template?: string;
}
//session 缓存
let sySession: Symbol;
/**
 * session 有效期 2 min
 */
const SESSION_LIVE = 2 * 60 * 60 * 1000;
//session 检测间隔
const SESSION_CHECK = 5 * 60 * 1000;

/**
 * 缓存页面导航数据
 */
let syPages: Symbol;

/**
 * 包装页面导航信息
 * @param ref 
 * @param res 
 * @param next
 */
function setupNavigatorInfo(pages: IPageConf[], ref: string, res: IRespond, next: Function): void {
    res.locals.pages = pages;
    let currentPage = pages.filter(e => e.ref === ref);
    if (currentPage.length !== 0) {
        res.locals.currentPage = currentPage[0];
    }
    next();
}

//生成session
router.use((req, res, next) => {
    const sMap = sessions();
    if (!sMap.has(<string>req.sessionID)) {
        //log('欢迎您 未登录')
        res.locals.loginUser = null;
    } else {
        //log('欢迎回来已登录')
        res.locals.loginUser = sMap.get(<string>req.sessionID);
    }
    next();
})

// 包含导航数据路由
router.route([
    '/',
    '/concat',
    '/intro',
    '/download',
    '/login',
    '/register',
    '/error'
]).get((req, res, next) => {
    checkout(db => {
        //查询按id排序1,2,...
        db.collection(Collection.PAGES).find({active:true},{_id:0}).sort({id:1}).toArray().then(data => {
            const pathName = url.parse(req.url).pathname || '';
            if (data.length > 0) {
                setupNavigatorInfo(data, `/${path.parse(pathName).base}`, res, next);
            } else {
                failure(res, Error.NO_DATA);
            }
        }, reason => {
            failure(res, `${Error.DB_READ}: ${reason}`);
        }).then(() => {
            restore(db);
        })
    }, reason => {
        failure(res, `${Error.DB_CONNECT}: ${reason}`);
    })
})

router.route('/').all((req, res, next) => {
    res.render('index', merge(res, { currentPage: res.locals.currentPage }));
})
/**
 * 介绍路由
 */
router.route('/intro').all((req, res, next) => {
    res.render('intro', merge(res, { currentPage: res.locals.currentPage }));
})

/**
 * 联系我们路由
 */
router.route('/concat').all((req, res, next) => {
    res.render('concat', merge(res, { currentPage: res.locals.currentPage }));
})

router.route('/login').get((req, res, next) =>{
    res.render('login', merge(res, { currentPage: res.locals.currentPage}));
}).post((req, res, next) => {
    let {username,pwd} = req.body;
    checkout(db => {
        db.collection(Collection.USER).findOne({name:username,pwd: md5(pwd + secret)}).then(data => {
            if(data) {
                const {name:user,isAdmin = false, level} = data;
                let session:ISessionData = {expires: Date.now() + SESSION_LIVE , user}
                if(isAdmin) {
                    Object.assign(session, {isAdmin, level});
                }
                sessions().set(<string>req.sessionID, session);
                success(res);
            }else{
                failure(res, Error.INCORRECT_USER_PASSWORD)
            }
        }).catch(reason => failure(res, `${Error.DB_READ}: ${reason}`)).then(() => restore(db));
    }, reason => {
        failure(res, `${Error.DB_CONNECT}: ${reason}`);
    })
})

router.route('/logout').post((req, res, next) => {
    sessions().delete(<string>req.sessionID);
    success(res);
})

router.route('/register').get((req, res, next) => {
    res.render('register', merge(res, { currentPage: res.locals.currentPage }));
}).post((req, res, next) => {
    checkout(db => {
        let userTable = db.collection(Collection.USER);
        userTable.findOne({ name: req.body.username }).then(data => {
            if (data) {
                failure(res, Error.REPEATED_USER)
            } else {
                getAutoKey(Collection.USER).then(_id => {
                    log('注册用户密码: ', md5(req.body.pwd));
                    //用户注册数据
                    insert<IUserDB>(userTable,{
                        _id, 
                        name: req.body.username,
                        pwd: md5(req.body.pwd + secret),
                        tel: req.body.tel,
                        mail: req.body.mail,
                        isAdmin: false,
                        level: Level.REPORTER
                    }).then(() => {
                        sessions().set(<string>req.sessionID, { expires: Date.now() + SESSION_LIVE , user: req.body.username});
                        success(res, '注册成功')
                    },reason => {
                        log(reason);
                        failure(res, Error.DB_WRITE);
                    })
                },reason => failure(res, `获取自动增长id失败 ${Collection.USER}`))
            }
        }, reason => {
            failure(res, `${Error.DB_READ}: ${reason}`)
        }).then(() => {
            restore(db);
        })
    }, reason => {
        failure(res, `${Error.DB_CONNECT}: ${reason}`)
    })
})

router.route('/download').get((req, res, next) => {
    res.render('download', merge(res, { link: '/static/download/dama.txt' }))
})

router.route('/setting').get((req, res, next) => {
    log(`用户个人设置 ${req.sessionID}`);
    res.render(path.join('setting','index'),{user:res.locals.loginUser})
})

router.route('/error').get((req, res) => {
    res.status(404);
    res.render('404',{navlist: res.locals.pages,error:'水逆飞船爆炸了(1/1)'});
})

//弹幕二维码生成路由
router.get('/qr/:rid', (req, res, next) => {
    checkout(db => {
        db.collection(Collection.ACTIVITY).findOne({rid:req.params.rid}).then(data => {
            if(data) {
                res.sendFile(path.resolve('public', 'images', 'qr', `${req.params.rid}.png`))
            }else {
                failure(res, Error.NO_DATA)
            }
        }, reason => {
            failure(res, `${Error.DB_READ}: ${reason}`)
        }).then(() => restore(db));
    }, reason => {
        failure(res, `${Error.DB_CONNECT}: ${reason}`)
    })
});

function merge(res: IRespond, data?: any): any {
    return { navlist: res.locals.pages, loginUser: res.locals.loginUser, ...data };
}

/**
 * 获取缓存模块中的 用户 session 数据 
 */
function sessions():Map<string, ISessionData> {
    if(!sySession)
        sySession = cache(new Map())
    return get<Map<string, ISessionData>>(sySession)
}

call(() => {
    const map = sessions();
    for (let [key, { expires }] of map.entries()) {
        if (expires < Date.now()) {
            map.delete(key);
            return;
        }
    }
}, SESSION_CHECK);

export default router