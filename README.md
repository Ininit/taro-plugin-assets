## taro-plugin-assets

taro 资源自动上传到腾讯云 COS

## 安装

```bash
# npm
npm install --save-dev taro-plugin-assets

# yarn
yarn add -D taro-plugin-assets
```

## 使用

```javascript
// config/index.js
 plugins: [
    'taro-plugin-assets',
    {
      assetsPath: 'assets',
      COS: {
        Bucket: string,
        Region: string,
        SecretId: string,
        SecretKey: string,
      }
    },
  ],

```
