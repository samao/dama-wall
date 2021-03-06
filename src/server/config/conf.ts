/*
 * @Author: iDzeir 
 * @Date: 2017-11-08 10:27:48 
 * @Last Modified by: iDzeir
 * @Last Modified time: 2017-11-16 10:31:38
 */

export const DOMAIN = 'localhost'

export const HOST = `http://${DOMAIN}`;

export const secret = "idzeir$";

export const ports:{web:number,ws:number,db:number} = {
    web: 3000,
    ws: 8080,
    db: 27017
}

// 管理员页面显示面板名称
export enum Board {
    WELCOME = 'welcome',
    NAV = 'nav',
    ACTI = 'acti',
    EMOTION = 'emotion',
    USER = 'user',
    FILTER = 'filter'
}

export const adminPage = [
    {title: '欢迎', template: Board.WELCOME},
    {title: '导航配置', template: Board.NAV},
    {title: '活动管理', template: Board.ACTI},
    {title: '弹幕表情', template: Board.EMOTION},
    {title: '用户管理', template: Board.USER},
    {title: '敏感词', template: Board.FILTER}
];