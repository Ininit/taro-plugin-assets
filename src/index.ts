import { IPluginContext } from '@tarojs/service'
import COS from 'cos-nodejs-sdk-v5'
import fs from 'fs-extra'
import path from 'path'
import md5 from 'md5'

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

      type AssetsType = {
        [key: string]: string
      }
      
      const filesMd5: AssetsType = Object.fromEntries(fileList.map(e => [e, md5(assets[e]._value)]))

      const basePath = path.resolve(process.cwd(), 'src')
      const manifestPath = path.join(basePath, '.assetscache')
      let needUploadAssets: string[] = []
      let tmp_assets: AssetsType = {}
      if (fs.existsSync(manifestPath)) {
        const manifest = fs.readJsonSync(manifestPath)
        tmp_assets = manifest
        needUploadAssets = fileList.filter((file) => manifest[file] !== filesMd5[file])
      } else {
        needUploadAssets = fileList
      }

      const uploadQueen = needUploadAssets.map((file) => uploadFile(file))
      Promise.allSettled(uploadQueen)
        .then((results) => {
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              tmp_assets[result.value] = filesMd5[result.value]
            }
          })
        })
        .then(() => {
          fs.writeJSONSync(manifestPath, tmp_assets, { spaces: 2 })
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
