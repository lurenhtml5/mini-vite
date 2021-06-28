const fs = require('fs')

const path = require('path')

const Koa = require('koa')

const compileSfc = require('@vue/compiler-sfc')

const compileDom = require('@vue/compiler-dom')

const app = new Koa()

/**
 * 将导入node_modules中的包，路径进行转化 import Vue from 'vue' ===> import Vue from '@modules/vue'
 * @param {*} content 
 * @returns 
 */
const rewriteImport = content => {
    return content.replace(/from ['|"]([^'"]+)['|"]/g, function (s0, s1) {
        // 排除../、 ./ 这种相对路径
        if (s1[0] !== "." && s1[1] !== "/") {
            return ` from '/@modules/${s1}'`
        }
        return s0
    })
}

app.use(async ctx => {
    const { 
        request: {  url, query }
    } = ctx
    if (url === '/') {
        ctx.type = 'text/html'
        let content = fs.readFileSync('./index.html', 'utf-8')
        content = content.replace(
            "<script",
            `
                <script>
                    window.process = {env:{ NODE_ENV:'dev'}}
                </script>
                <Script
            `
        )
        ctx.body = content
    } else if (url.endsWith('.js')) {
        // 处理js文件导入
        const p = path.resolve(__dirname, url.slice(1))
        ctx.type = "application/javascript"
        const content = fs.readFileSync(p, 'utf-8')
        ctx.body = rewriteImport(content)
    } else if (url.startsWith("/@modules/")) {
        console.log(url, 'url')
        // 处理node_modules的模块导入
        const prefix = path.resolve(
            __dirname,
            "node_modules",
            url.replace("/@modules/", "")
        )
        const module = require(prefix + "/package.json").module;
        const p = path.resolve(prefix, module);
        const ret = fs.readFileSync(p, "utf-8");
        ctx.type = "application/javascript";
        ctx.body = rewriteImport(ret);
    } else if (url.endsWith(".css")) {
        const p = path.resolve(__dirname, url.slice(1))
        const file = fs.readFileSync(p, 'utf-8')
        const content = `
            const css = "${file.replace('/\n/g', "")}"
            const link = document.createElement('style')
            link.setAttribute('type', 'text/css')
            document.head.appendChild(link)
            link.innerHtml = css
            export default css
        `
        ctx.type = 'application/javascript'
        ctx.body = content
    } else if (url.indexOf('.vue') > -1) {
        const p = path.resolve(__dirname, url.split("?")[0].slice(1))
        const { descriptor } = compileSfc.parse(fs.readFileSync(p, 'utf-8'))
        if (!query.type) {
            ctx.type = 'application/javascript'
            ctx.body = `
                ${rewriteImport(
                descriptor.script.content.replace("export default", "const _script = ")
            )}
                import { render as __render } from "${url}?type=template"
                _script.render = __render
                export default __script
            `
        } else if (query.type === "template") {
            const template = descriptor.template
            const render = compileDom.compile(template.content, { module: "module" }).code
            ctx.type = "application/javascript"
            ctx.body = rewriteImport(render)
        }
    }
})

app.listen(3001, () => {
    console.log('start at port 3001')
})

