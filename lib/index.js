"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var cos_nodejs_sdk_v5_1 = __importDefault(require("cos-nodejs-sdk-v5"));
var fs_extra_1 = __importDefault(require("fs-extra"));
var path_1 = __importDefault(require("path"));
exports.default = (function (ctx, pluginOpts) {
    ctx.registerMethod('onAssetsUpload', function (_a) {
        var fileList = _a.fileList, assets = _a.assets;
        var cos = new cos_nodejs_sdk_v5_1.default({
            SecretId: pluginOpts.COS.SecretId,
            SecretKey: pluginOpts.COS.SecretKey,
        });
        function uploadFile(key) {
            return new Promise(function (resolve, reject) {
                cos.putObject({
                    Bucket: pluginOpts.COS.Bucket,
                    Region: pluginOpts.COS.Region,
                    Key: key,
                    ACL: 'public-read',
                    Body: assets[key]._value,
                    ContentLength: assets[key]._value.length
                }, function (err, data) {
                    if (!err) {
                        console.log("\u4E0A\u4F20\u5B8C\u6210: " + key);
                        resolve(key);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        }
        var basePath = path_1.default.resolve(process.cwd(), 'src');
        var manifestPath = path_1.default.join(basePath, '.assetsCache');
        var needUploadAssets = [];
        var tmp_assets = [];
        if (fs_extra_1.default.existsSync(manifestPath)) {
            var manifest = fs_extra_1.default.readJsonSync(manifestPath);
            tmp_assets = manifest.assets;
            needUploadAssets = fileList.filter(function (file) { return !tmp_assets.includes(file); });
        }
        else {
            needUploadAssets = fileList;
        }
        var uploadQueen = needUploadAssets.map(function (file) { return uploadFile(file); });
        Promise.allSettled(uploadQueen)
            .then(function (results) {
            results.forEach(function (result) {
                if (result.status === 'fulfilled') {
                    tmp_assets.push(result.value);
                }
            });
        })
            .then(function () {
            fs_extra_1.default.writeJSONSync(manifestPath, {
                assets: tmp_assets,
            });
        });
    });
    ctx.modifyBuildAssets(function (_a) {
        var assets = _a.assets;
        var fileList = Object.keys(assets).filter(function (e) { return e.indexOf(pluginOpts.assetsPath) !== -1; });
        ctx.onAssetsUpload({ fileList: fileList, assets: assets });
    });
});
