import * as url from 'url';
import { checkout, restore } from "../db/pool";
import { log, error } from "../../utils/log";
/**
* 返回 ts Promise<any>
* @param path 用户连接的ws路径
*/
export function roomParser(path: string|undefined): Promise<string>{
        return new Promise((res,rej) => {
            if(typeof path === 'undefined' || path === '/undefined'|| typeof path === 'string' && path.replace(/\//,'') === '') {
                setImmediate(rej,'please check your path');
                return;
            }
            let { roomid } = parserId(path);
            log('链接路径',path, roomid);
            if(roomid) {
                //检查路径
                checkout(db => {
                    db.collection('activity').findOne({ rid:roomid }).then(data => {
                        //log(JSON.stringify(data));
                        if(data) {
                            log('有房间号',roomid)
                            setImmediate(res,roomid)
                        }else{
                            rej(`不存在的活动id: ${roomid}`);
                        }
                    }, reason => {
                        rej(`读取活动 ${roomid} 错误 ${reason}`);
                    }).then(() => {
                        restore(db)
                    })
                },reason => {
                    rej(`无法链接数据库 ${reason}`)
                })
            }else{
                setImmediate(rej,'illegal path!!!')
            }
        }
    )
}

export function parserId(path: string): {roomid?: string} {
    let paths = url.parse(path);
    return {roomid: paths.pathname ? paths.pathname.slice(1) : undefined}
}