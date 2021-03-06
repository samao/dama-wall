/*
 * @Author: iDzeir 
 * @Date: 2017-11-08 10:30:19 
 * @Last Modified by:   iDzeir 
 * @Last Modified time: 2017-11-08 10:30:19 
 */

import * as http from 'http';
import * as cluster from 'cluster';

import {log,error} from '../../utils/log';

async function go() {
    const port = +process.argv.slice(2);
    let mod = await import('../net/danmuServer');
    let {DanmuServer} = mod;
    log(`线程 ${cluster.worker.id} 业务模块载入 PID ${process.pid}`);
    const wss = new DanmuServer({
        port
    });
}

go().catch((reason) => {
    error('弹幕线程启动异常,请检查端口是否被占用。' + reason)
});