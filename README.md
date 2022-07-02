# hexo-translate-title-fixed
对[hexo-translate-title](https://github.com/cometlj/hexo-translate-title)的修改。
将中文标题翻译为英文标题
## 修改
1. 新增腾讯翻译与deepl翻译
2. 删除百度翻译无appid版,修改百度翻译api地址，修改接口名为baidu;删除有道翻译
3. 新增逻辑：当文章中已包含translate_title字段且不为空时，直接使用translate_title中的内容，不进行翻译
## 安装
```
npm i hexo-translate-title-fixed --save
```
## 使用
1.配置hexo根项目下的_config.yml
```
translate_title:
  translate_way: google  # google,baidu,tencent,deepl
  is_need_proxy: false     # true | false 
  proxy_url: http://localhost:50018 # Your proxy_url
  baidu_appid: '' # Your baidu_appid
  baidu_appkey: '' # Your baidu_appkey
  secretid: ''  # Your tencent_secretid
  secretkey: ''  # Your tencent_secretkey
  authkey: ''   # Your deepl_authkey
  rewrite: false # is rewrite true | false 
```
> google翻译未使用过，不清楚还能不能用,如果要使用可以到原作者项目查看
2. 修改hexo根项目下的_config.yml
```
permalink: :translate_title/
```
翻译后的名称会保存在文章里

# License
MIT
