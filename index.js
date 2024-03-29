'use strict';

var hexo = hexo || {};
var config = hexo.config;
var util = require('./lib/util.js');

hexo.extend.filter.register('before_post_render', async function (data) {
    if (!config.translate_title || !config.url) {
        console.log('config.translate_title==>', config.translate_title);
        console.log('config.url==>', config.url);
        return data;
    }
    let translate_way = config.translate_title.translate_way;
    if (translate_way == 'google') {
        let is_need_proxy = config.translate_title.is_need_proxy;
        let proxy_url = config.translate_title.proxy_url;
        let return_data = await util.google_translation(data, 'zh-CN', 'en', is_need_proxy, proxy_url);
    }
    else if (translate_way == 'baidu') {
        let return_data = await util.baidu_translation(data, 'zh', 'en', config.translate_title.baidu_appid, config.translate_title.baidu_appkey);
    }
    else if (translate_way == 'tencent') {
        let return_data = await util.tencent_translation(data, 'zh', 'en',config.translate_title.secretid,config.translate_title.secretkey);
    }else if (translate_way == 'deepl') {
        let return_data = await util.deepl_translation(data, 'zh', 'en',config.translate_title.authkey);
    }
}, 5);
