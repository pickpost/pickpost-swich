## Fireworm

### 接入方式

在页面头部引入一下脚本，注意引入位置必须在业务脚本之前。

```
<script>
!function(t){function e(r){if(o[r])return o[r].exports;var n=o[r]={exports:{},id:r,loaded:!1};return t[r].call(n.exports,n,n.exports,e),n.loaded=!0,n.exports}var o={};return e.m=t,e.c=o,e.p="",e(0)}([function(t,e,o){"use strict";function r(){return"http:"===location.protocol||(!!/([a-zA-Z0-9]?\.)?\.net/.test(location.host)||(!!/render-pre/.test(location.host)||!!/[\?&]__fireworm=false/.test(location.href)))}function n(){if(r()){var t=document.createElement("script");t.src=a,"loading"===document.readyState?document.write(t.outerHTML):"complete"===document.readyState&&document.head.appendChild(t)}}var a="";window.local=!1;var a="https://a.test.alipay.net/g/pickpost/pickpost-sdk/0.0.2/main.js";n()}]);;
</script>
```

### 使用说明
开启方式：
现Fireworm默认在使用KOBE的以下情况下显示:

    1. XX.net域名
    2. render-pre开头域名
    3. 查询参数添加__fireworm=true
