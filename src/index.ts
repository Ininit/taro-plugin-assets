import { IPluginContext } from '@tarojs/service'
import COS from 'cos-nodejs-sdk-v5'
import fs from 'fs-extra'
import path from 'path'

export interface AssetsPluginOpts {
  assetsPath: string
  COS: {
    Bucket: string
    Region: string
    SecretId: string
    SecretKey: string
  }
}

export default (ctx: IPluginContext, pluginOpts: AssetsPluginOpts) => {
  ctx.registerMethod(
    'onAssetsUpload',
    ({ fileList, assets }: { fileList: string[], assets: any }) => {
      const cos = new COS({
        SecretId: pluginOpts.COS.SecretId,
        SecretKey: pluginOpts.COS.SecretKey,
      })
      function uploadFile(key: string) {
        return new Promise<string>((resolve, reject) => {
          cos.putObject(
            {
              Bucket: pluginOpts.COS.Bucket,
              Region: pluginOpts.COS.Region,
              Key: key,
              ACL: 'public-read',
              Body: assets[key]._value,
              ContentLength: assets[key]._value.length
            },
            function (err, data) {
              if (!err) {
                console.log(`上传完成: ${key}`)
                resolve(key)
              } else {
                reject(err)
              }
            },
          )
        })
      }

      const basePath = path.resolve(process.cwd(), 'src')
      const manifestPath = path.join(basePath, '.assetsCache')
      let needUploadAssets: string[] = []
      let tmp_assets: string[] = []
      if (fs.existsSync(manifestPath)) {
        const manifest: {
          assets: string[]
        } = fs.readJsonSync(manifestPath)
        tmp_assets = manifest.assets
        needUploadAssets = fileList.filter((file) => !tmp_assets.includes(file))
      } else {
        needUploadAssets = fileList
      }

      const uploadQueen = needUploadAssets.map((file) => uploadFile(file))
      Promise.allSettled(uploadQueen)
        .then((results) => {
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              tmp_assets.push(result.value)
            }
          })
        })
        .then(() => {
          fs.writeJSONSync(manifestPath, {
            assets: tmp_assets,
          })
        })
    },
  )
  ctx.modifyBuildAssets(({ assets }) => {
    const fileList = Object.keys(assets).filter(
      (e) => e.indexOf(pluginOpts.assetsPath) !== -1,
    )
    ctx.onAssetsUpload({ fileList, assets })
  })
}
