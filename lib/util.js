"use strict";

const front = require("hexo-front-matter");
const fs = require("hexo-fs");
const rp = require("request-promise");
const qs = require("querystring");
const url = require("url");
const cheerio = require("cheerio");
const http = require("http");
const tencentcloud = require("tencentcloud-sdk-nodejs");
const deepl = require("deepl-node");
//辅助函数：固定值获取TKK  ---1
let TKK = (function () {
  var a = 561666268;
  var b = 1526272306;
  return 406398 + "." + (a + b);
})();
//辅助函数：根据获取的TKK获取tk  ---2
let b = function (a, b) {
  for (var d = 0; d < b.length - 2; d += 3) {
    var c = b.charAt(d + 2),
      c = "a" <= c ? c.charCodeAt(0) - 87 : Number(c),
      c = "+" == b.charAt(d + 1) ? a >>> c : a << c;
    a = "+" == b.charAt(d) ? (a + c) & 4294967295 : a ^ c;
  }
  return a;
};
//辅助函数：根据获取的TKK获取tk  ---3
let get_tk = function (a) {
  for (var e = TKK.split("."), h = Number(e[0]) || 0, g = [], d = 0, f = 0; f < a.length; f++) {
    var c = a.charCodeAt(f);
    128 > c
      ? (g[d++] = c)
      : (2048 > c
          ? (g[d++] = (c >> 6) | 192)
          : (55296 == (c & 64512) && f + 1 < a.length && 56320 == (a.charCodeAt(f + 1) & 64512)
              ? ((c = 65536 + ((c & 1023) << 10) + (a.charCodeAt(++f) & 1023)), (g[d++] = (c >> 18) | 240), (g[d++] = ((c >> 12) & 63) | 128))
              : (g[d++] = (c >> 12) | 224),
            (g[d++] = ((c >> 6) & 63) | 128)),
        (g[d++] = (c & 63) | 128));
  }
  a = h;
  for (d = 0; d < g.length; d++) (a += g[d]), (a = b(a, "+-a^+6"));
  a = b(a, "+-3^+b+-f");
  a ^= Number(e[1]) || 0;
  0 > a && (a = (a & 2147483647) + 2147483648);
  a %= 1e6;
  return a.toString() + "." + (a ^ h);
};
//样例 http://translate.google.cn/translate_a/t?client=t&sl=zh-CN&tl=en&hl=zh-CN&v=1.0&source=is&tk=244803.389825&q=%E5%A4%A9%E6%B0%94%E5%BE%88%E5%A5%BD
//Google翻译
let google_translation = async function (data, fromLanguage, toLanguage, is_need_proxy, proxy_url) {
  let tmpPost = front.parse(data.raw);
  let ori_translate_title = data.translate_title; //先保存原来的翻译标题
  data.translate_title = ""; //初始化
  // console.log("原始data:"+postStr);
  let title = data.title;
  let encodedStr = encodeURI(title);
  let googleTransUrl = "https://translate.google.cn/translate_a/t?";
  googleTransUrl += "client=" + "t";
  googleTransUrl += "&sl=" + fromLanguage; // source   language
  googleTransUrl += "&tl=" + toLanguage; // to       language
  googleTransUrl += "&hl=" + fromLanguage;
  googleTransUrl += "$dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&ie=UTF-8&oe=UTF-8&clearbtn=1&otf=1&pc=1&ssel=0&tsel=0&kc=2&v=1.0&source=is";
  googleTransUrl += "&tk=" + get_tk(title);
  googleTransUrl += "&q=" + encodedStr;
  let google_request_option_str = {
    method: "GET",
    uri: googleTransUrl,
  };
  if (is_need_proxy) {
    google_request_option_str = {
      method: "GET",
      uri: googleTransUrl,
      proxy: proxy_url,
    };
  }
  await rp(google_request_option_str)
    .then(function (body) {
      if (body != null) {
        //去除标点符号，空格转换为横线连接
        let title_array = body
          .replace(/[\~|\`|\!|\@|\#|\$|\%|\^|\&|\*|\(|\)|\-|\_|\+|\=|\||\\|\[|\]|\{|\}|\;|\:|\"|\'|\,|\<|\.|\>|\/|\?]/g, "")
          .replace(/\s/g, "-")
          .split("-");
        let tmp_title_array = [];
        let final_title_str = "";
        //去除重复单词和空值，只保留一个
        for (var i = 0; i < title_array.length; i++) {
          let lowercase_title = title_array[i].toLowerCase();
          if (tmp_title_array.indexOf(lowercase_title) == -1 && lowercase_title != "") {
            tmp_title_array.push(lowercase_title);
          }
        }
        final_title_str = tmp_title_array.join("-");
        // console.log(final_title_str);
        let temp_tanslate_title = final_title_str.replace(/\"/g, "").replace(/\"/g, "");
        data.translate_title = temp_tanslate_title;
        tmpPost.translate_title = temp_tanslate_title;
        if (ori_translate_title != temp_tanslate_title) {
          let postStr = front.stringify(tmpPost);
          postStr = "---\n" + postStr;
          fs.writeFileSync(data.full_source, postStr, "utf-8");
          console.log("Google->Generate link %s for post [%s]", temp_tanslate_title, data.title);
        } else {
          data.translate_title = ori_translate_title;
        }
        return data;
      }
    })
    .catch(function (err) {
      console.error(err);
    });
};

//百度翻译-需要appid+appkey版，每月前200w字翻译免费，足够大家写博客使用
let baidu_translation = async function (data, fromLanguage, toLanguage, appid, appkey) {
  let ori_translate_title = data.translate_title; //先保存原来的翻译标题
  if (ori_translate_title) {
    console.log("[%s]已存在翻译标题，不再翻译", data.title);
    return data;
  }
  if(!data.title){
     console.log("文章标题不存在");
     return null;
  }
  const lib_baidu_trans = require("./baidu_trans_md5.js");
  let salt = new Date().getTime();
  let tmpPost = front.parse(data.raw);
  data.translate_title = ""; //初始化
  let query_title = data.title;
  let encodedStr = encodeURI(query_title);
  // 多个query可以用\n连接  如 query='apple\norange\nbanana\npear'
  let str1 = appid + query_title + salt + appkey;
  let sign = lib_baidu_trans.baidu_trans_md5(str1);
  let baiduTransUrl = "http://api.fanyi.baidu.com/api/trans/vip/translate";
  let json_data = {
    q: query_title,
    appid: appid,
    salt: salt,
    from: fromLanguage,
    to: toLanguage,
    sign: sign,
  };
  let baiduTransOption = {
    method: "GET",
    uri: baiduTransUrl,
    qs: json_data,
    json: true,
  };
  await rp(baiduTransOption)
    .then(function (body) {
      if (body) {
        if (body["trans_result"]) {
          let trans_title = body["trans_result"][0]["dst"];
          let trans_title_array = trans_title.toString().toLowerCase().split(" ");
          let final_title_str = trans_title_array.join("-");
          let temp_tanslate_title = final_title_str.replace(/\"/g, "").replace(/\"/g, "");
          data.translate_title = temp_tanslate_title;
          tmpPost.translate_title = temp_tanslate_title;
          if (ori_translate_title != temp_tanslate_title) {
            let postStr = front.stringify(tmpPost);
            postStr = "---\n" + postStr;
            fs.writeFileSync(data.full_source, postStr, "utf-8");
            console.log("Baidu->Generate link %s for post [%s]", temp_tanslate_title, data.title);
          } else {
            data.translate_title = ori_translate_title;
          }
          return data;
        }
        return data;
      }
    })
    .catch(function (err) {
      console.error(err);
    });
};

//腾讯翻译
let tencent_translation = async function (or_data, Source, Target, SecretId, SecretKey) {
  let ori_translate_title = or_data.translate_title; //先保存原来的翻译标题
  if (ori_translate_title) {
    console.log("[%s]已存在翻译标题，不再翻译", or_data.title);
    return or_data;
  }
  if(!or_data.title){
     console.log("文章标题不存在");
     return null;
  }
  let tmpPost = front.parse(or_data.raw);
  const TmtClient = tencentcloud.tmt.v20180321.Client;
  const clientConfig = {
    credential: {
      secretId: SecretId,
      secretKey: SecretKey,
    },
    region: "ap-guangzhou",
    profile: {
      httpProfile: {
        endpoint: "tmt.tencentcloudapi.com",
      },
    },
  };
  const params = {
    SourceText: or_data.title,
    Source: "auto",
    Target: Target,
    ProjectId: 0,
  };
  const client = new TmtClient(clientConfig);
  or_data.translate_title = ""; //初始化
  client.TextTranslate(params).then(
    (data) => {
      if (data != null) {
        if (data.Error) {
          throw data.Error;
        }
        if (data.TargetText) {
          let trans_title = data.TargetText;
          let trans_title_array = trans_title.toString().toLowerCase().split(" ");
          let final_title_str = trans_title_array.join("-");
          let temp_tanslate_title = final_title_str.replace(/\"/g, "").replace(/\"/g, "");
          or_data.translate_title = temp_tanslate_title;
          tmpPost.translate_title = temp_tanslate_title;
          if (ori_translate_title != temp_tanslate_title) {
            let postStr = front.stringify(tmpPost);
            postStr = "---\n" + postStr;
            fs.writeFileSync(or_data.full_source, postStr, "utf-8");
            console.log("Tencent->Generate link %s for post [%s]", temp_tanslate_title, or_data.title);
          } else {
            or_data.translate_title = ori_translate_title;
          }
          return or_data;
        } else {
          throw "Empty TargetText";
        }
      } else {
        throw "Empty data";
      }
    },
    (err) => {
      console.error("Error ", err);
      or_data.translate_title = or_data.title;
      return or_data;
    }
  );
};

//deepl翻译
let deepl_translation = async function (data, fromLanguage, toLanguage, authKey) {
  let ori_translate_title = data.translate_title; //先保存原来的翻译标题
  if (ori_translate_title) {
    console.log("[%s]已存在翻译标题，不再翻译", data.title);
    return data;
  }
  if(!data.title){
     console.log("文章标题不存在");
     return null;
  }
  const translator = new deepl.Translator(authKey);
  let tmpPost = front.parse(data.raw);
  data.translate_title = ""; //初始化
  translator
    .translateText(data.title, fromLanguage, toLanguage)
    .then((result) => {
      if (result.text) {
        let trans_title = result.text;
        let trans_title_array = trans_title.toString().toLowerCase().split(" ");
        let final_title_str = trans_title_array.join("-");
        let temp_tanslate_title = final_title_str.replace(/\"/g, "").replace(/\"/g, "");
        data.translate_title = temp_tanslate_title;
        tmpPost.translate_title = temp_tanslate_title;
        if (ori_translate_title != temp_tanslate_title) {
          let postStr = front.stringify(tmpPost);
          postStr = "---\n" + postStr;
          fs.writeFileSync(data.full_source, postStr, "utf-8");
          console.log("DeepL->Generate link %s for post [%s]", temp_tanslate_title, data.title);
        } else {
          data.translate_title = ori_translate_title;
        }
        return data;
      }
      return data;
    })
    .catch((error) => {
      console.error(error);
      data.translate_title = data.title;
      return data;
    });
};
exports.deepl_translation = deepl_translation;
exports.tencent_translation = tencent_translation;
exports.google_translation = google_translation;
exports.baidu_translation = baidu_translation;
