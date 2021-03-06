/*
 * @Author: iDzeir 
 * @Date: 2017-11-08 10:28:22 
 * @Last Modified by:   iDzeir 
 * @Last Modified time: 2017-11-08 10:28:22 
 */

/**
 * mongodb 表
 */
export enum Collection {
    /**
     * 用户表
     */
    USER = 'user',
    /**
     * 弹幕表
     */
    COMMENT = 'comment',
    /**
     * 活动（房间）表
     */
    ACTIVITY = 'activity',
    /**
     * 页面导航配置
     */
    PAGES = 'pages',
    /**
     * 弹幕敏感词
     */
    SENSITIVE = 'sensitive',
    /**
     * 弹幕表情配置
     */
    EMOTION = 'emotion',
    /**
     * 管理员表
     */
    ADMIN = 'admin',
    /**
     * 系统级自动增长id表
     */
    INDEXES = 'indexes'
}