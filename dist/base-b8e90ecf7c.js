/*==================================================
 Copyright (c) 2013-2015 司徒正美 and other contributors
 http://www.cnblogs.com/rubylouvre/
 https://github.com/RubyLouvre
 http://weibo.com/jslouvre/
 
 Released under the MIT license
 avalon.modern.shim.js(无加载器版本) 1.46 built in 2015.9.11
 support IE10+ and other browsers
 ==================================================*/
(function(global, factory) {

    if (typeof module === "object" && typeof module.exports === "object") {
        // For CommonJS and CommonJS-like environments where a proper `window`
        // is present, execute the factory and get avalon.
        // For environments that do not have a `window` with a `document`
        // (such as Node.js), expose a factory as module.exports.
        // This accentuates the need for the creation of a real `window`.
        // e.g. var avalon = require("avalon")(window);
        module.exports = global.document ? factory(global, true) : function(w) {
            if (!w.document) {
                throw new Error("Avalon requires a window with a document")
            }
            return factory(w)
        }
    } else {
        factory(global)
    }

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function(window, noGlobal){

/*********************************************************************
 *                    全局变量及方法                                  *
 **********************************************************************/
var expose = Date.now()
//http://stackoverflow.com/questions/7290086/javascript-use-strict-and-nicks-find-global-function
var DOC = window.document
var head = DOC.head //HEAD元素
head.insertAdjacentHTML("afterBegin", '<avalon ms-skip class="avalonHide"><style id="avalonStyle">.avalonHide{ display: none!important }</style></avalon>')
var ifGroup = head.firstChild

function log() {
    if (avalon.config.debug) {
// http://stackoverflow.com/questions/8785624/how-to-safely-wrap-console-log
        console.log.apply(console, arguments)
    }
}
/**
 * Creates a new object without a prototype. This object is useful for lookup without having to
 * guard against prototypically inherited properties via hasOwnProperty.
 *
 * Related micro-benchmarks:
 * - http://jsperf.com/object-create2
 * - http://jsperf.com/proto-map-lookup/2
 * - http://jsperf.com/for-in-vs-object-keys2
 */
function createMap() {
  return Object.create(null)
}

var subscribers = "$" + expose
var otherRequire = window.require
var otherDefine = window.define
var innerRequire
var stopRepeatAssign = false
var rword = /[^, ]+/g //切割字符串为一个个小块，以空格或豆号分开它们，结合replace实现字符串的forEach
var rcomplexType = /^(?:object|array)$/
var rsvg = /^\[object SVG\w*Element\]$/
var rwindow = /^\[object (?:Window|DOMWindow|global)\]$/
var oproto = Object.prototype
var ohasOwn = oproto.hasOwnProperty
var serialize = oproto.toString
var ap = Array.prototype
var aslice = ap.slice
var Registry = {} //将函数曝光到此对象上，方便访问器收集依赖
var W3C = window.dispatchEvent
var root = DOC.documentElement
var avalonFragment = DOC.createDocumentFragment()
var cinerator = DOC.createElement("div")
var class2type = {}
"Boolean Number String Function Array Date RegExp Object Error".replace(rword, function (name) {
    class2type["[object " + name + "]"] = name.toLowerCase()
})


function noop() {
}


function oneObject(array, val) {
    if (typeof array === "string") {
        array = array.match(rword) || []
    }
    var result = {},
            value = val !== void 0 ? val : 1
    for (var i = 0, n = array.length; i < n; i++) {
        result[array[i]] = value
    }
    return result
}

//生成UUID http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
var generateID = function (prefix) {
    prefix = prefix || "avalon"
    return String(Math.random() + Math.random()).replace(/\d\.\d{4}/, prefix)
}
function IE() {
    if (window.VBArray) {
        var mode = document.documentMode
        return mode ? mode : window.XMLHttpRequest ? 7 : 6
    } else {
        return NaN
    }
}
var IEVersion = IE()

avalon = function (el) { //创建jQuery式的无new 实例化结构
    return new avalon.init(el)
}

avalon.profile = function () {
    if (window.console && avalon.config.profile) {
        Function.apply.call(console.log, console, arguments)
    }
}

/*视浏览器情况采用最快的异步回调*/
avalon.nextTick = new function () {// jshint ignore:line
    var tickImmediate = window.setImmediate
    var tickObserver = window.MutationObserver
    if (tickImmediate) {//IE10 \11 edage
        return tickImmediate.bind(window)
    }

    var queue = []
    function callback() {
        var n = queue.length
        for (var i = 0; i < n; i++) {
            queue[i]()
        }
        queue = queue.slice(n)
    }

    if (tickObserver) {// 支持MutationObserver
        var node = document.createTextNode("avalon")
        new tickObserver(callback).observe(node, {characterData: true})// jshint ignore:line
        return function (fn) {
            queue.push(fn)
            node.data = Math.random()
        }
    }

    if (window.VBArray) {
        return function (fn) {
            queue.push(fn)
            var node = DOC.createElement("script")
            node.onreadystatechange = function () {
                callback() //在interactive阶段就触发
                node.onreadystatechange = null
                head.removeChild(node)
                node = null
            }
            head.appendChild(node)
        }
    }


    return function (fn) {
        setTimeout(fn, 4)
    }
}// jshint ignore:line
/*********************************************************************
 *                 avalon的静态方法定义区                              *
 **********************************************************************/
avalon.init = function(el) {
    this[0] = this.element = el
}
avalon.fn = avalon.prototype = avalon.init.prototype

avalon.type = function(obj) { //取得目标的类型
    if (obj == null) {
        return String(obj)
    }
    // 早期的webkit内核浏览器实现了已废弃的ecma262v4标准，可以将正则字面量当作函数使用，因此typeof在判定正则时会返回function
    return typeof obj === "object" || typeof obj === "function" ?
            class2type[serialize.call(obj)] || "object" :
            typeof obj
}

var isFunction = function(fn) {
    return serialize.call(fn) === "[object Function]"
}

avalon.isFunction = isFunction

avalon.isWindow = function(obj) {
    return rwindow.test(serialize.call(obj))
}

/*判定是否是一个朴素的javascript对象（Object），不是DOM对象，不是BOM对象，不是自定义类的实例*/

avalon.isPlainObject = function(obj) {
    // 简单的 typeof obj === "object"检测，会致使用isPlainObject(window)在opera下通不过
    return serialize.call(obj) === "[object Object]" && Object.getPrototypeOf(obj) === oproto
}

//与jQuery.extend方法，可用于浅拷贝，深拷贝
avalon.mix = avalon.fn.mix = function() {
    var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false

    // 如果第一个参数为布尔,判定是否深拷贝
    if (typeof target === "boolean") {
        deep = target
        target = arguments[1] || {}
        i++
    }

    //确保接受方为一个复杂的数据类型
    if (typeof target !== "object" && !isFunction(target)) {
        target = {}
    }

    //如果只有一个参数，那么新成员添加于mix所在的对象上
    if (i === length) {
        target = this
        i--
    }

    for (; i < length; i++) {
        //只处理非空参数
        if ((options = arguments[i]) != null) {
            for (name in options) {
                src = target[name]
                copy = options[name]
                // 防止环引用
                if (target === copy) {
                    continue
                }
                if (deep && copy && (avalon.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {

                    if (copyIsArray) {
                        copyIsArray = false
                        clone = src && Array.isArray(src) ? src : []

                    } else {
                        clone = src && avalon.isPlainObject(src) ? src : {}
                    }

                    target[name] = avalon.mix(deep, clone, copy)
                } else if (copy !== void 0) {
                    target[name] = copy
                }
            }
        }
    }
    return target
}

function _number(a, len) { //用于模拟slice, splice的效果
    a = Math.floor(a) || 0
    return a < 0 ? Math.max(len + a, 0) : Math.min(a, len);
}
avalon.mix({
    rword: rword,
    subscribers: subscribers,
    version: 1.46,
    ui: {},
    log: log,
    slice: function(nodes, start, end) {
        return aslice.call(nodes, start, end)
    },
    noop: noop,
    /*如果不用Error对象封装一下，str在控制台下可能会乱码*/
    error: function(str, e) {
        throw new (e || Error)(str)// jshint ignore:line
    },
    /*将一个以空格或逗号隔开的字符串或数组,转换成一个键值都为1的对象*/
    oneObject: oneObject,
    /* avalon.range(10)
     => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
     avalon.range(1, 11)
     => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     avalon.range(0, 30, 5)
     => [0, 5, 10, 15, 20, 25]
     avalon.range(0, -10, -1)
     => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
     avalon.range(0)
     => []*/
    range: function(start, end, step) { // 用于生成整数数组
        step || (step = 1)
        if (end == null) {
            end = start || 0
            start = 0
        }
        var index = -1,
                length = Math.max(0, Math.ceil((end - start) / step)),
                result = new Array(length)
        while (++index < length) {
            result[index] = start
            start += step
        }
        return result
    },
    eventHooks: {},
    /*绑定事件*/
    bind: function(el, type, fn, phase) {
        var hooks = avalon.eventHooks
        var hook = hooks[type]
        if (typeof hook === "object") {
            type = hook.type
            if (hook.deel) {
                fn = hook.deel(el, type, fn, phase)
            }
        }
        if (!fn.unbind)
            el.addEventListener(type, fn, !!phase)
        return fn
    },
    /*卸载事件*/
    unbind: function(el, type, fn, phase) {
        var hooks = avalon.eventHooks
        var hook = hooks[type]
        var callback = fn || noop
        if (typeof hook === "object") {
            type = hook.type
            if (hook.deel) {
                fn = hook.deel(el, type, fn, false)
            }
        }
        el.removeEventListener(type, callback, !!phase)
    },
    /*读写删除元素节点的样式*/
    css: function(node, name, value) {
        if (node instanceof avalon) {
            node = node[0]
        }
        var prop = /[_-]/.test(name) ? camelize(name) : name, fn
        name = avalon.cssName(prop) || prop
        if (value === void 0 || typeof value === "boolean") { //获取样式
            fn = cssHooks[prop + ":get"] || cssHooks["@:get"]
            if (name === "background") {
                name = "backgroundColor"
            }
            var val = fn(node, name)
            return value === true ? parseFloat(val) || 0 : val
        } else if (value === "") { //请除样式
            node.style[name] = ""
        } else { //设置样式
            if (value == null || value !== value) {
                return
            }
            if (isFinite(value) && !avalon.cssNumber[prop]) {
                value += "px"
            }
            fn = cssHooks[prop + ":set"] || cssHooks["@:set"]
            fn(node, name, value)
        }
    },
    /*遍历数组与对象,回调的第一个参数为索引或键名,第二个或元素或键值*/
    each: function(obj, fn) {
        if (obj) { //排除null, undefined
            var i = 0
            if (isArrayLike(obj)) {
                for (var n = obj.length; i < n; i++) {
                    if (fn(i, obj[i]) === false)
                        break
                }
            } else {
                for (i in obj) {
                    if (obj.hasOwnProperty(i) && fn(i, obj[i]) === false) {
                        break
                    }
                }
            }
        }
    },
    //收集元素的data-{{prefix}}-*属性，并转换为对象
    getWidgetData: function(elem, prefix) {
        var raw = avalon(elem).data()
        var result = {}
        for (var i in raw) {
            if (i.indexOf(prefix) === 0) {
                result[i.replace(prefix, "").replace(/\w/, function(a) {
                    return a.toLowerCase()
                })] = raw[i]
            }
        }
        return result
    },
    Array: {
        /*只有当前数组不存在此元素时只添加它*/
        ensure: function(target, item) {
            if (target.indexOf(item) === -1) {
                return target.push(item)
            }
        },
        /*移除数组中指定位置的元素，返回布尔表示成功与否*/
        removeAt: function(target, index) {
            return !!target.splice(index, 1).length
        },
        /*移除数组中第一个匹配传参的那个元素，返回布尔表示成功与否*/
        remove: function(target, item) {
            var index = target.indexOf(item)
            if (~index)
                return avalon.Array.removeAt(target, index)
            return false
        }
    }
})

var bindingHandlers = avalon.bindingHandlers = {}
var bindingExecutors = avalon.bindingExecutors = {}

/*判定是否类数组，如节点集合，纯数组，arguments与拥有非负整数的length属性的纯JS对象*/
function isArrayLike(obj) {
    if (obj && typeof obj === "object") {
        var n = obj.length,
                str = serialize.call(obj)
        if (/(Array|List|Collection|Map|Arguments)\]$/.test(str)) {
            return true
        } else if (str === "[object Object]" && n === (n >>> 0)) {
            return true //由于ecma262v5能修改对象属性的enumerable，因此不能用propertyIsEnumerable来判定了
        }
    }
    return false
}


// https://github.com/rsms/js-lru
var Cache = new function() {// jshint ignore:line
    function LRU(maxLength) {
        this.size = 0
        this.limit = maxLength
        this.head = this.tail = void 0
        this._keymap = {}
    }

    var p = LRU.prototype

    p.put = function(key, value) {
        var entry = {
            key: key,
            value: value
        }
        this._keymap[key] = entry
        if (this.tail) {
            this.tail.newer = entry
            entry.older = this.tail
        } else {
            this.head = entry
        }
        this.tail = entry
        if (this.size === this.limit) {
            this.shift()
        } else {
            this.size++
        }
        return value
    }

    p.shift = function() {
        var entry = this.head
        if (entry) {
            this.head = this.head.newer
            this.head.older =
                    entry.newer =
                    entry.older =
                    this._keymap[entry.key] = void 0
            delete this._keymap[entry.key] //#1029
        }
    }
    p.get = function(key) {
        var entry = this._keymap[key]
        if (entry === void 0)
            return
        if (entry === this.tail) {
            return  entry.value
        }
        // HEAD--------------TAIL
        //   <.older   .newer>
        //  <--- add direction --
        //   A  B  C  <D>  E
        if (entry.newer) {
            if (entry === this.head) {
                this.head = entry.newer
            }
            entry.newer.older = entry.older // C <-- E.
        }
        if (entry.older) {
            entry.older.newer = entry.newer // C. --> E
        }
        entry.newer = void 0 // D --x
        entry.older = this.tail // D. --> E
        if (this.tail) {
            this.tail.newer = entry // E. <-- D
        }
        this.tail = entry
        return entry.value
    }
    return LRU
}// jshint ignore:line

/*********************************************************************
 *                           DOM 底层补丁                             *
 **********************************************************************/
//safari5+是把contains方法放在Element.prototype上而不是Node.prototype
if (!DOC.contains) {
    Node.prototype.contains = function (arg) {
        return !!(this.compareDocumentPosition(arg) & 16)
    }
}
avalon.contains = function (root, el) {
    try {
        while ((el = el.parentNode))
            if (el === root)
                return true
        return false
    } catch (e) {
        return false
    }
}

if (window.SVGElement) {
    var svgns = "http://www.w3.org/2000/svg"
    var svg = DOC.createElementNS(svgns, "svg")
    svg.innerHTML = '<circle cx="50" cy="50" r="40" fill="red" />'
    if (!rsvg.test(svg.firstChild)) {// #409
        /* jshint ignore:start */
        function enumerateNode(node, targetNode) {
            if (node && node.childNodes) {
                var nodes = node.childNodes
                for (var i = 0, el; el = nodes[i++]; ) {
                    if (el.tagName) {
                        var svg = DOC.createElementNS(svgns,
                                el.tagName.toLowerCase())
                        // copy attrs
                        ap.forEach.call(el.attributes, function (attr) {
                            svg.setAttribute(attr.name, attr.value)
                        })
                        // 递归处理子节点
                        enumerateNode(el, svg)
                        targetNode.appendChild(svg)
                    }
                }
            }
        }
        /* jshint ignore:end */
        Object.defineProperties(SVGElement.prototype, {
            "outerHTML": {//IE9-11,firefox不支持SVG元素的innerHTML,outerHTML属性
                enumerable: true,
                configurable: true,
                get: function () {
                    return new XMLSerializer().serializeToString(this)
                },
                set: function (html) {
                    var tagName = this.tagName.toLowerCase(),
                            par = this.parentNode,
                            frag = avalon.parseHTML(html)
                    // 操作的svg，直接插入
                    if (tagName === "svg") {
                        par.insertBefore(frag, this)
                        // svg节点的子节点类似
                    } else {
                        var newFrag = DOC.createDocumentFragment()
                        enumerateNode(frag, newFrag)
                        par.insertBefore(newFrag, this)
                    }
                    par.removeChild(this)
                }
            },
            "innerHTML": {
                enumerable: true,
                configurable: true,
                get: function () {
                    var s = this.outerHTML
                    var ropen = new RegExp("<" + this.nodeName + '\\b(?:(["\'])[^"]*?(\\1)|[^>])*>', "i")
                    var rclose = new RegExp("<\/" + this.nodeName + ">$", "i")
                    return  s.replace(ropen, "").replace(rclose, "")
                },
                set: function (html) {
                    if (avalon.clearHTML) {
                        avalon.clearHTML(this)
                        var frag = avalon.parseHTML(html)
                        enumerateNode(frag, this)
                    }
                }
            }
        })
    }
}
//========================= event binding ====================
var eventHooks = avalon.eventHooks
//针对firefox, chrome修正mouseenter, mouseleave(chrome30+)
if (!("onmouseenter" in root)) {
    avalon.each({
        mouseenter: "mouseover",
        mouseleave: "mouseout"
    }, function (origType, fixType) {
        eventHooks[origType] = {
            type: fixType,
            deel: function (elem, _, fn) {
                return function (e) {
                    var t = e.relatedTarget
                    if (!t || (t !== elem && !(elem.compareDocumentPosition(t) & 16))) {
                        delete e.type
                        e.type = origType
                        return fn.call(elem, e)
                    }
                }
            }
        }
    })
}
//针对IE9+, w3c修正animationend
avalon.each({
    AnimationEvent: "animationend",
    WebKitAnimationEvent: "webkitAnimationEnd"
}, function (construct, fixType) {
    if (window[construct] && !eventHooks.animationend) {
        eventHooks.animationend = {
            type: fixType
        }
    }
})

if (DOC.onmousewheel === void 0) {
    /* IE6-11 chrome mousewheel wheelDetla 下 -120 上 120
     firefox DOMMouseScroll detail 下3 上-3
     firefox wheel detlaY 下3 上-3
     IE9-11 wheel deltaY 下40 上-40
     chrome wheel deltaY 下100 上-100 */
    eventHooks.mousewheel = {
        type: "wheel",
        deel: function (elem, _, fn) {
            return function (e) {
                e.wheelDeltaY = e.wheelDelta = e.deltaY > 0 ? -120 : 120
                e.wheelDeltaX = 0
                Object.defineProperty(e, "type", {
                    value: "mousewheel"
                })
                fn.call(elem, e)
            }
        }
    }
}
/*********************************************************************
 *                           配置系统                                 *
 **********************************************************************/

function kernel(settings) {
    for (var p in settings) {
        if (!ohasOwn.call(settings, p))
            continue
        var val = settings[p]
        if (typeof kernel.plugins[p] === "function") {
            kernel.plugins[p](val)
        } else if (typeof kernel[p] === "object") {
            avalon.mix(kernel[p], val)
        } else {
            kernel[p] = val
        }
    }
    return this
}
var openTag, closeTag, rexpr, rexprg, rbind, rregexp = /[-.*+?^${}()|[\]\/\\]/g

function escapeRegExp(target) {
    //http://stevenlevithan.com/regex/xregexp/
    //将字符串安全格式化为正则表达式的源码
    return (target + "").replace(rregexp, "\\$&")
}

var plugins = {
    loader: function (builtin) {
        var flag = innerRequire && builtin
        window.require = flag ? innerRequire : otherRequire
        window.define = flag ? innerRequire.define : otherDefine
    },
    interpolate: function (array) {
        openTag = array[0]
        closeTag = array[1]
        if (openTag === closeTag) {
            throw new SyntaxError("openTag===closeTag")
        } else {
            var test = openTag + "test" + closeTag
            cinerator.innerHTML = test
            if (cinerator.innerHTML !== test && cinerator.innerHTML.indexOf("&lt;") > -1) {
                throw new SyntaxError("此定界符不合法")
            }
            kernel.openTag = openTag
            kernel.closeTag = closeTag
            cinerator.innerHTML = ""
        }
        var o = escapeRegExp(openTag),
                c = escapeRegExp(closeTag)
        rexpr = new RegExp(o + "(.*?)" + c)
        rexprg = new RegExp(o + "(.*?)" + c, "g")
        rbind = new RegExp(o + ".*?" + c + "|\\sms-")
    }
}

kernel.debug = true
kernel.plugins = plugins
kernel.plugins['interpolate'](["{{", "}}"])
kernel.paths = {}
kernel.shim = {}
kernel.maxRepeatSize = 100
avalon.config = kernel
var ravalon = /(\w+)\[(avalonctrl)="(\S+)"\]/
var findNodes = function(str) {
    return DOC.querySelectorAll(str)
} 
/*********************************************************************
 *                            事件总线                               *
 **********************************************************************/
var EventBus = {
    $watch: function (type, callback) {
        if (typeof callback === "function") {
            var callbacks = this.$events[type]
            if (callbacks) {
                callbacks.push(callback)
            } else {
                this.$events[type] = [callback]
            }
        } else { //重新开始监听此VM的第一重简单属性的变动
            this.$events = this.$watch.backup
        }
        return this
    },
    $unwatch: function (type, callback) {
        var n = arguments.length
        if (n === 0) { //让此VM的所有$watch回调无效化
            this.$watch.backup = this.$events
            this.$events = {}
        } else if (n === 1) {
            this.$events[type] = []
        } else {
            var callbacks = this.$events[type] || []
            var i = callbacks.length
            while (~--i < 0) {
                if (callbacks[i] === callback) {
                    return callbacks.splice(i, 1)
                }
            }
        }
        return this
    },
    $fire: function (type) {
        var special, i, v, callback
        if (/^(\w+)!(\S+)$/.test(type)) {
            special = RegExp.$1
            type = RegExp.$2
        }
        var events = this.$events
        if (!events)
            return
        var args = aslice.call(arguments, 1)
        var detail = [type].concat(args)
        if (special === "all") {
            for (i in avalon.vmodels) {
                v = avalon.vmodels[i]
                if (v !== this) {
                    v.$fire.apply(v, detail)
                }
            }
        } else if (special === "up" || special === "down") {
            var elements = events.expr ? findNodes(events.expr) : []
            if (elements.length === 0)
                return
            for (i in avalon.vmodels) {
                v = avalon.vmodels[i]
                if (v !== this) {
                    if (v.$events.expr) {
                        var eventNodes = findNodes(v.$events.expr)
                        if (eventNodes.length === 0) {
                            continue
                        }
                        //循环两个vmodel中的节点，查找匹配（向上匹配或者向下匹配）的节点并设置标识
                        /* jshint ignore:start */
                        ap.forEach.call(eventNodes, function (node) {
                            ap.forEach.call(elements, function (element) {
                                var ok = special === "down" ? element.contains(node) : //向下捕获
                                        node.contains(element) //向上冒泡
                                if (ok) {
                                    node._avalon = v //符合条件的加一个标识
                                }
                            });
                        })
                        /* jshint ignore:end */
                    }
                }
            }
            var nodes = DOC.getElementsByTagName("*") //实现节点排序
            var alls = []
            ap.forEach.call(nodes, function (el) {
                if (el._avalon) {
                    alls.push(el._avalon)
                    el._avalon = ""
                    el.removeAttribute("_avalon")
                }
            })
            if (special === "up") {
                alls.reverse()
            }
            for (i = 0; callback = alls[i++]; ) {
                if (callback.$fire.apply(callback, detail) === false) {
                    break
                }
            }
        } else {
            var callbacks = events[type] || []
            var all = events.$all || []
            for (i = 0; callback = callbacks[i++]; ) {
                if (isFunction(callback))
                    callback.apply(this, args)
            }
            for (i = 0; callback = all[i++]; ) {
                if (isFunction(callback))
                    callback.apply(this, arguments)
            }
        }
    }
}
/*********************************************************************
 *                           modelFactory                             *
 **********************************************************************/
//avalon最核心的方法的两个方法之一（另一个是avalon.scan），返回一个ViewModel(VM)
var VMODELS = avalon.vmodels = {} //所有vmodel都储存在这里
avalon.define = function (id, factory) {
    var $id = id.$id || id
    if (!$id) {
        log("warning: vm必须指定$id")
    }
    if (VMODELS[$id]) {
        log("warning: " + $id + " 已经存在于avalon.vmodels中")
    }
    if (typeof id === "object") {
        var model = modelFactory(id)
    } else {
        var scope = {
            $watch: noop
        }
        factory(scope) //得到所有定义
        model = modelFactory(scope) //偷天换日，将scope换为model
        stopRepeatAssign = true
        factory(model)
        stopRepeatAssign = false
    }
    model.$id = $id
    return VMODELS[$id] = model
}

//一些不需要被监听的属性
var $$skipArray = String("$id,$watch,$unwatch,$fire,$events,$model,$skipArray,$reinitialize").match(rword)

function modelFactory(source, $special, $model) {
    if (Array.isArray(source)) {
        var arr = source.concat()
        source.length = 0
        var collection = arrayFactory(source)// jshint ignore:line
        collection.pushArray(arr)
        return collection
    }
    //0 null undefined || Node || VModel(fix IE6-8 createWithProxy $val: val引发的BUG)
    if (!source || source.nodeType > 0 || (source.$id && source.$events)) {
        return source
    }
    var $skipArray = Array.isArray(source.$skipArray) ? source.$skipArray : []
    $skipArray.$special = $special || createMap() //强制要监听的属性
    var $vmodel = {} //要返回的对象, 它在IE6-8下可能被偷龙转凤
    $model = $model || {} //vmodels.$model属性
    var $events = createMap() //vmodel.$events属性
    var accessors = createMap() //监控属性
    var computed = []
    $$skipArray.forEach(function (name) {
        delete source[name]
    })

    var names = Object.keys(source)
    /* jshint ignore:start */
    names.forEach(function (name, accessor) {
        var val = source[name]
        $model[name] = val
        if (isObservable(name, val, $skipArray)) {
            //总共产生三种accessor
            $events[name] = []
            var valueType = avalon.type(val)
            //总共产生三种accessor
            if (valueType === "object" && isFunction(val.get) && Object.keys(val).length <= 2) {
                accessor = makeComputedAccessor(name, val)
                computed.push(accessor)
            } else if (rcomplexType.test(valueType)) {
                // issue #940 解决$model层次依赖丢失 https://github.com/RubyLouvre/avalon/issues/940
                accessor = makeComplexAccessor(name, val, valueType, $events[name], $model)
            } else {
                accessor = makeSimpleAccessor(name, val)
            }
            accessors[name] = accessor
        }
    })
    /* jshint ignore:end */
    $vmodel = Object.defineProperties($vmodel, descriptorFactory(accessors)) //生成一个空的ViewModel
    for (var i = 0; i < names.length; i++) {
        var name = names[i]
        if (!accessors[name]) {
            $vmodel[name] = source[name]
        }
    }
    //添加$id, $model, $events, $watch, $unwatch, $fire
    hideProperty($vmodel, "$id", generateID())
    hideProperty($vmodel, "$model", $model)
    hideProperty($vmodel, "$events", $events)
    /* jshint ignore:start */
    hideProperty($vmodel, "hasOwnProperty", function (name) {
        return name in this.$model
    })
    /* jshint ignore:end */
    for (var i in EventBus) {
        hideProperty($vmodel, i, EventBus[i])
    }

    $vmodel.$reinitialize = function () {
        computed.forEach(function (accessor) {
            delete accessor._value
            delete accessor.oldArgs
            accessor.digest = function () {
                accessor.call($vmodel)
            }
            dependencyDetection.begin({
                callback: function (vm, dependency) {//dependency为一个accessor
                    var name = dependency._name
                    if (dependency !== accessor) {
                        var list = vm.$events[name]
                        accessor.vm = $vmodel
                        injectDependency(list, accessor.digest)
                    }
                }
            })
            try {
                accessor.get.call($vmodel)
            } finally {
                dependencyDetection.end()
            }
        })
    }
    $vmodel.$reinitialize()
    return $vmodel
}

function hideProperty(host, name, value) {
    Object.defineProperty(host, name, {
        value: value,
        writable: true,
        enumerable: false,
        configurable: true
    })
}

function keysVM(obj) {
    var arr = Object.keys(obj)
    for (var i = 0; i < $$skipArray.length; i++) {
        var index = arr.indexOf($$skipArray[i])
        if (index !== -1) {
            arr.splice(index, 1)
        }
    }
    return arr
}
//创建一个简单访问器
function makeSimpleAccessor(name, value) {
    function accessor(value) {
        var oldValue = accessor._value
        if (arguments.length > 0) {
            if (!stopRepeatAssign && !isEqual(value, oldValue)) {
                accessor.updateValue(this, value)
                accessor.notify(this, value, oldValue)
            }
            return this
        } else {
            dependencyDetection.collectDependency(this, accessor)
            return oldValue
        }
    }
    accessorFactory(accessor, name)
    accessor._value = value
    return accessor;
}

///创建一个计算访问器
function makeComputedAccessor(name, options) {
    function accessor(value) {//计算属性
        var oldValue = accessor._value
        var init = ("_value" in accessor)
        if (arguments.length > 0) {
            if (stopRepeatAssign) {
                return this
            }
            if (typeof accessor.set === "function") {
                if (accessor.oldArgs !== value) {
                    accessor.oldArgs = value
                    var $events = this.$events
                    var lock = $events[name]
                    $events[name] = [] //清空回调，防止内部冒泡而触发多次$fire
                    accessor.set.call(this, value)
                    $events[name] = lock
                    value = accessor.get.call(this)
                    if (value !== oldValue) {
                        accessor.updateValue(this, value)
                        accessor.notify(this, value, oldValue) //触发$watch回调
                    }
                }
            }
            return this
        } else {
            //将依赖于自己的高层访问器或视图刷新函数（以绑定对象形式）放到自己的订阅数组中
            //将自己注入到低层访问器的订阅数组中
            value = accessor.get.call(this)
            accessor.updateValue(this, value)
            if (init && oldValue !== value) {
                accessor.notify(this, value, oldValue) //触发$watch回调
            }
            return value
        }
    }
    accessor.set = options.set
    accessor.get = options.get
    accessorFactory(accessor, name)
    return accessor
}


//创建一个复杂访问器
function makeComplexAccessor(name, initValue, valueType, list, parentModel) {
    function accessor(value) {
        var oldValue = accessor._value
        var son = accessor._vmodel
        if (arguments.length > 0) {
            if (stopRepeatAssign) {
                return this
            }
            if (valueType === "array") {
                var a = son, b = value,
                        an = a.length,
                        bn = b.length
                a.$lock = true
                if (an > bn) {
                    a.splice(bn, an - bn)
                } else if (bn > an) {
                    a.push.apply(a, b.slice(an))
                }
                var n = Math.min(an, bn)
                for (var i = 0; i < n; i++) {
                    a.set(i, b[i])
                }
                delete a.$lock
                a._fire("set")
            } else if (valueType === "object") {
                var observes = this.$events[name] || []
                var newObject = avalon.mix(true, {}, value)
                for (i in son) {
                    if (son.hasOwnProperty(i) && ohasOwn.call(newObject, i)) {
                        son[i] = newObject[i]
                    }
                }
                son = accessor._vmodel = modelFactory(value)
                son.$events[subscribers] = observes
                if (observes.length) {
                    observes.forEach(function (data) {
                        if(!data.type) {
                           return //防止模板先加载报错
                        }
                        if (data.rollback) {
                            data.rollback() //还原 ms-with ms-on
                        }
                        bindingHandlers[data.type](data, data.vmodels)
                    })
                }
            }
            accessor.updateValue(this, son.$model)
            accessor.notify(this, this._value, oldValue)
            return this
        } else {
            dependencyDetection.collectDependency(this, accessor)
            return son
        }
    }
    accessorFactory(accessor, name)
    if (Array.isArray(initValue)) {
        parentModel[name] = initValue
    } else {
        parentModel[name] = parentModel[name] || {}
    }
    var son = accessor._vmodel = modelFactory(initValue, 0, parentModel[name])
    son.$events[subscribers] = list
    return accessor
}

function globalUpdateValue(vmodel, value) {
    vmodel.$model[this._name] = this._value = value
}
function globalUpdateModelValue(vmodel, value) {
    vmodel.$model[this._name] = value
}
function globalNotify(vmodel, value, oldValue) {
    var name = this._name
    var array = vmodel.$events[name] //刷新值
    if (array) {
        fireDependencies(array) //同步视图
        EventBus.$fire.call(vmodel, name, value, oldValue) //触发$watch回调
    }
}

function accessorFactory(accessor, name) {
    accessor._name = name
    //同时更新_value与model
    accessor.updateValue = globalUpdateValue
    accessor.notify = globalNotify
}
//比较两个值是否相等
var isEqual = Object.is || function (v1, v2) {
    if (v1 === 0 && v2 === 0) {
        return 1 / v1 === 1 / v2
    } else if (v1 !== v1) {
        return v2 !== v2
    } else {
        return v1 === v2
    }
}

function isObservable(name, value, $skipArray) {
    if (isFunction(value) || value && value.nodeType) {
        return false
    }
    if ($skipArray.indexOf(name) !== -1) {
        return false
    }
    var $special = $skipArray.$special
    if (name && name.charAt(0) === "$" && !$special[name]) {
        return false
    }
    return true
}

var descriptorFactory = function (obj) {
    var descriptors = {}
    for (var i in obj) {
        descriptors[i] = {
            get: obj[i],
            set: obj[i],
            enumerable: true,
            configurable: true
        }
    }
    return descriptors
}


/*********************************************************************
 *          监控数组（与ms-each, ms-repeat配合使用）                     *
 **********************************************************************/

function arrayFactory(model) {
    var array = []
    array.$id = generateID()
    array.$model = model //数据模型
    array.$events = {}
    array.$events[subscribers] = []
    array._ = modelFactory({
        length: model.length
    })
    array._.$watch("length", function (a, b) {
        array.$fire("length", a, b)
    })
    for (var i in EventBus) {
        array[i] = EventBus[i]
    }
    avalon.mix(array, arrayPrototype)
    return array
}

function mutateArray(method, pos, n, index, method2, pos2, n2) {
    var oldLen = this.length, loop = 2
    while (--loop) {
        switch (method) {
      case "add":
                /* jshint ignore:start */
                var array = this.$model.slice(pos, pos + n).map(function (el) {
                    if (rcomplexType.test(avalon.type(el))) {
                        return el.$id ? el : modelFactory(el, 0, el)
                    } else {
                        return el
                    }
                })
                /* jshint ignore:end */
                _splice.apply(this, [pos, 0].concat(array))
                this._fire("add", pos, n)
                break
            case "del":
                var ret = this._splice(pos, n)
                this._fire("del", pos, n)
                break
        }
        if (method2) {
            method = method2
            pos = pos2
            n = n2
            loop = 2
            method2 = 0
        }
    }
    this._fire("index", index)
    if (this.length !== oldLen) {
        this._.length = this.length
    }
    return ret
}

var _splice = ap.splice
var arrayPrototype = {
    _splice: _splice,
    _fire: function (method, a, b) {
        fireDependencies(this.$events[subscribers], method, a, b)
    },
    size: function () { //取得数组长度，这个函数可以同步视图，length不能
        return this._.length
    },
    pushArray: function (array) {
        var m = array.length, n = this.length
        if (m) {
            ap.push.apply(this.$model, array)
            mutateArray.call(this, "add", n, m, Math.max(0, n - 1))
        }
        return  m + n
    },
    push: function () {
        //http://jsperf.com/closure-with-arguments
        var array = []
        var i, n = arguments.length
        for (i = 0; i < n; i++) {
            array[i] = arguments[i]
        }
        return this.pushArray(array)
    },
    unshift: function () {
        var m = arguments.length, n = this.length
        if (m) {
            ap.unshift.apply(this.$model, arguments)
            mutateArray.call(this, "add", 0, m, 0)
        }
        return  m + n //IE67的unshift不会返回长度
    },
    shift: function () {
        if (this.length) {
            var el = this.$model.shift()
            mutateArray.call(this, "del", 0, 1, 0)
            return el //返回被移除的元素
        }
    },
    pop: function () {
        var n = this.length
        if (n) {
            var el = this.$model.pop()
            mutateArray.call(this, "del", n - 1, 1, Math.max(0, n - 2))
            return el //返回被移除的元素
        }
    },
    splice: function (start) {
        var m = arguments.length, args = [], change
        var removed = _splice.apply(this.$model, arguments)
        if (removed.length) { //如果用户删掉了元素
            args.push("del", start, removed.length, 0)
            change = true
        }
        if (m > 2) {  //如果用户添加了元素
            if (change) {
                args.splice(3, 1, 0, "add", start, m - 2)
            } else {
                args.push("add", start, m - 2, 0)
            }
            change = true
        }
        if (change) { //返回被移除的元素
            return mutateArray.apply(this, args)
        } else {
            return []
        }
    },
    contains: function (el) { //判定是否包含
        return this.indexOf(el) !== -1
    },
    remove: function (el) { //移除第一个等于给定值的元素
        return this.removeAt(this.indexOf(el))
    },
    removeAt: function (index) { //移除指定索引上的元素
        if (index >= 0) {
            this.$model.splice(index, 1)
            return mutateArray.call(this, "del", index, 1, 0)
        }
        return  []
    },
    clear: function () {
        this.$model.length = this.length = this._.length = 0 //清空数组
        this._fire("clear", 0)
        return this
    },
    removeAll: function (all) { //移除N个元素
        if (Array.isArray(all)) {
            for (var i = this.length - 1; i >= 0; i--) {
                if (all.indexOf(this[i]) !== -1) {
                    this.removeAt(i)
                }
            }
        } else if (typeof all === "function") {
            for ( i = this.length - 1; i >= 0; i--) {
                var el = this[i]
                if (all(el, i)) {
                    this.removeAt(i)
                }
            }
        } else {
            this.clear()
        }
    },
    ensure: function (el) {
        if (!this.contains(el)) { //只有不存在才push
            this.push(el)
        }
        return this
    },
    set: function (index, val) {
        if (index < this.length && index > -1) {
            var valueType = avalon.type(val)
            if (val && val.$model) {
                val = val.$model
            }
            var target = this[index]
            if (valueType === "object") {
                for (var i in val) {
                    if (target.hasOwnProperty(i)) {
                        target[i] = val[i]
                    }
                }
            } else if (valueType === "array") {
                target.clear().push.apply(target, val)
            } else if (target !== val) {
                this[index] = val
                this.$model[index] = val
                this._fire("set", index, val)
            }
        }
        return this
    }
}
//相当于原来bindingExecutors.repeat 的index分支
function resetIndex(array, pos) {
    var last = array.length - 1
    for (var el; el = array[pos]; pos++) {
        el.$index = pos
        el.$first = pos === 0
        el.$last = pos === last
    }
}

function sortByIndex(array, indexes) {
    var map = {};
    for (var i = 0, n = indexes.length; i < n; i++) {
        map[i] = array[i] // preserve
        var j = indexes[i]
        if (j in map) {
            array[i] = map[j]
            delete map[j]
        } else {
            array[i] = array[j]
        }
    }
}

"sort,reverse".replace(rword, function (method) {
    arrayPrototype[method] = function () {
        var newArray = this.$model//这是要排序的新数组
        var oldArray = newArray.concat() //保持原来状态的旧数组
        var mask = Math.random()
        var indexes = []
        var hasSort
        ap[method].apply(newArray, arguments) //排序
        for (var i = 0, n = oldArray.length; i < n; i++) {
            var neo = newArray[i]
            var old = oldArray[i]
            if (isEqual(neo, old)) {
                indexes.push(i)
            } else {
                var index = oldArray.indexOf(neo)
                indexes.push(index)//得到新数组的每个元素在旧数组对应的位置
                oldArray[index] = mask    //屏蔽已经找过的元素
                hasSort = true
            }
        }
        if (hasSort) {
            sortByIndex(this, indexes)
            // sortByIndex(this.$proxy, indexes)
            this._fire("move", indexes)
              this._fire("index", 0)
        }
        return this
    }
})


/*********************************************************************
 *                           依赖调度系统                             *
 **********************************************************************/
//检测两个对象间的依赖关系
var dependencyDetection = (function () {
    var outerFrames = []
    var currentFrame
    return {
        begin: function (accessorObject) {
            //accessorObject为一个拥有callback的对象
            outerFrames.push(currentFrame)
            currentFrame = accessorObject
        },
        end: function () {
            currentFrame = outerFrames.pop()
        },
        collectDependency: function (vmodel, accessor) {
            if (currentFrame) {
                //被dependencyDetection.begin调用
                currentFrame.callback(vmodel, accessor);
            }
        }
    };
})()
//将绑定对象注入到其依赖项的订阅数组中
var ronduplex = /^(duplex|on)$/
avalon.injectBinding = function (data) {
    var valueFn = data.evaluator
    if (valueFn) { //如果是求值函数
        dependencyDetection.begin({
            callback: function (vmodel, dependency) {
                injectDependency(vmodel.$events[dependency._name], data)
            }
        })
        try {
            var value = ronduplex.test(data.type) ? data : valueFn.apply(0, data.args)
            if(value === void 0){
                delete data.evaluator
            }
            data.handler(value, data.element, data)
        } catch (e) {
            log("warning:exception throwed in [avalon.injectBinding] " , e)
            delete data.evaluator
            var node = data.element
            if (node.nodeType === 3) {
                var parent = node.parentNode
                if (kernel.commentInterpolate) {
                    parent.replaceChild(DOC.createComment(data.value), node)
                } else {
                    node.data = openTag + (data.oneTime ? "::" : "") + data.value + closeTag
                }
            }
        } finally {
            dependencyDetection.end()
        }
    }
}

//将依赖项(比它高层的访问器或构建视图刷新函数的绑定对象)注入到订阅者数组 
function injectDependency(list, data) {
    if (data.oneTime)
        return
    if (list && avalon.Array.ensure(list, data) && data.element) {
        injectDisposeQueue(data, list)
        if (new Date() - beginTime > 444 ) {
            rejectDisposeQueue()
        }
    }
}

//通知依赖于这个访问器的订阅者更新自身
function fireDependencies(list) {
    if (list && list.length) {
        if (new Date() - beginTime > 444 && typeof list[0] === "object") {
            rejectDisposeQueue()
        }
        var args = aslice.call(arguments, 1)
        for (var i = list.length, fn; fn = list[--i]; ) {
            var el = fn.element
            if (el && el.parentNode) {
                try {
                    var valueFn = fn.evaluator
                    if (fn.$repeat) {
                        fn.handler.apply(fn, args) //处理监控数组的方法
                    }else if("$repeat" in fn || !valueFn ){//如果没有eval,先eval
                        bindingHandlers[fn.type](fn, fn.vmodels)
                    } else if (fn.type !== "on") { //事件绑定只能由用户触发,不能由程序触发
                       var value = valueFn.apply(0, fn.args || [])
                       fn.handler(value, el, fn)
                    }
                } catch (e) { 
                    console.log(e)
                }
            }
        }
    }
}
/*********************************************************************
 *                          定时GC回收机制                             *
 **********************************************************************/
var disposeCount = 0
var disposeQueue = avalon.$$subscribers = []
var beginTime = new Date()
var oldInfo = {}
//var uuid2Node = {}
function getUid(elem, makeID) { //IE9+,标准浏览器
    if (!elem.uuid && !makeID) {
        elem.uuid = ++disposeCount
    }
    return elem.uuid
}

//添加到回收列队中
function injectDisposeQueue(data, list) {
    var elem = data.element
    if (!data.uuid) {
        if (elem.nodeType !== 1) {
            data.uuid = data.type + (data.pos || 0) + "-" + getUid(elem.parentNode)
        } else {
            data.uuid = data.name + "-" + getUid(elem)
        }
    }
    var lists = data.lists || (data.lists = [])
    avalon.Array.ensure(lists, list)
    list.$uuid = list.$uuid || generateID()
    if (!disposeQueue[data.uuid]) {
        disposeQueue[data.uuid] = 1
        disposeQueue.push(data)
    }
}

function rejectDisposeQueue(data) {
    if (avalon.optimize)
        return
    var i = disposeQueue.length
    var n = i
    var allTypes = []
    var iffishTypes = {}
    var newInfo = {}
    //对页面上所有绑定对象进行分门别类, 只检测个数发生变化的类型
    while (data = disposeQueue[--i]) {
        var type = data.type
        if (newInfo[type]) {
            newInfo[type]++
        } else {
            newInfo[type] = 1
            allTypes.push(type)
        }
    }
    var diff = false
    allTypes.forEach(function (type) {
        if (oldInfo[type] !== newInfo[type]) {
            iffishTypes[type] = 1
            diff = true
        }
    })
    i = n
    if (diff) {
        while (data = disposeQueue[--i]) {
            if (data.element === null) {
                disposeQueue.splice(i, 1)
                continue
            }
            if (iffishTypes[data.type] && shouldDispose(data.element)) { //如果它没有在DOM树
                disposeQueue.splice(i, 1)
                delete disposeQueue[data.uuid]
                //delete uuid2Node[data.element.uuid]
                var lists = data.lists
                for (var k = 0, list; list = lists[k++]; ) {
                    avalon.Array.remove(lists, list)
                    avalon.Array.remove(list, data)
                }
                disposeData(data)
            }
        }
    }
    oldInfo = newInfo
    beginTime = new Date()
}

function disposeData(data) {
    delete disposeQueue[data.uuid] // 先清除，不然无法回收了
    data.element = null
    data.rollback && data.rollback()
    for (var key in data) {
        data[key] = null
    }
}

function shouldDispose(el) {
    try {//IE下，如果文本节点脱离DOM树，访问parentNode会报错
        var fireError = el.parentNode.nodeType
    } catch (e) {
        return true
    }
    if (el.ifRemove) {
        // 如果节点被放到ifGroup，才移除
        if (!root.contains(el.ifRemove) && (ifGroup === el.parentNode)) {
            el.parentNode && el.parentNode.removeChild(el)
            return true
        }
    }
    return el.msRetain ? 0 : (el.nodeType === 1 ? !root.contains(el) : !avalon.contains(root, el))
}

/************************************************************************
 *              HTML处理(parseHTML, innerHTML, clearHTML)                 *
 **************************************************************************/
//parseHTML的辅助变量
var tagHooks = new function() {// jshint ignore:line
    avalon.mix(this, {
        option: DOC.createElement("select"),
        thead: DOC.createElement("table"),
        td: DOC.createElement("tr"),
        area: DOC.createElement("map"),
        tr: DOC.createElement("tbody"),
        col: DOC.createElement("colgroup"),
        legend: DOC.createElement("fieldset"),
        _default: DOC.createElement("div"),
        "g": DOC.createElementNS("http://www.w3.org/2000/svg", "svg")
    })
    this.optgroup = this.option
    this.tbody = this.tfoot = this.colgroup = this.caption = this.thead
    this.th = this.td
}// jshint ignore:line

String("circle,defs,ellipse,image,line,path,polygon,polyline,rect,symbol,text,use").replace(rword, function(tag) {
    tagHooks[tag] = tagHooks.g //处理SVG
})
var rtagName = /<([\w:]+)/
var rxhtml = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig
var scriptTypes = oneObject(["", "text/javascript", "text/ecmascript", "application/ecmascript", "application/javascript"])
var script = DOC.createElement("script")
var rhtml = /<|&#?\w+;/
avalon.parseHTML = function(html) {
    var fragment = avalonFragment.cloneNode(false)
    if (typeof html !== "string" ) {
        return fragment
    }
    if (!rhtml.test(html)) {
        fragment.appendChild(DOC.createTextNode(html))
        return fragment
    }
    html = html.replace(rxhtml, "<$1></$2>").trim()
    var tag = (rtagName.exec(html) || ["", ""])[1].toLowerCase(),
            //取得其标签名
            wrapper = tagHooks[tag] || tagHooks._default,
            firstChild
    wrapper.innerHTML = html
    var els = wrapper.getElementsByTagName("script")
    if (els.length) { //使用innerHTML生成的script节点不会发出请求与执行text属性
        for (var i = 0, el; el = els[i++]; ) {
            if (scriptTypes[el.type]) {
                var neo = script.cloneNode(false) //FF不能省略参数
                ap.forEach.call(el.attributes, function(attr) {
                    neo.setAttribute(attr.name, attr.value)
                })// jshint ignore:line
                neo.text = el.text
                el.parentNode.replaceChild(neo, el)
            }
        }
    }

    while (firstChild = wrapper.firstChild) { // 将wrapper上的节点转移到文档碎片上！
        fragment.appendChild(firstChild)
    }
    return fragment
}

avalon.innerHTML = function(node, html) {
    var a = this.parseHTML(html)
    this.clearHTML(node).appendChild(a)
}

avalon.clearHTML = function(node) {
    node.textContent = ""
    while (node.firstChild) {
        node.removeChild(node.firstChild)
    }
    return node
}

/*********************************************************************
 *                        avalon的原型方法定义区                        *
 **********************************************************************/

function hyphen(target) {
    //转换为连字符线风格
    return target.replace(/([a-z\d])([A-Z]+)/g, "$1-$2").toLowerCase()
}

function camelize(target) {
    //转换为驼峰风格
    if (target.indexOf("-") < 0 && target.indexOf("_") < 0) {
        return target //提前判断，提高getStyle等的效率
    }
    return target.replace(/[-_][^-_]/g, function(match) {
        return match.charAt(1).toUpperCase()
    })
}

"add,remove".replace(rword, function(method) {
    avalon.fn[method + "Class"] = function(cls) {
        var el = this[0]
        //https://developer.mozilla.org/zh-CN/docs/Mozilla/Firefox/Releases/26
        if (cls && typeof cls === "string" && el && el.nodeType === 1) {
            cls.replace(/\S+/g, function(c) {
                el.classList[method](c)
            })
        }
        return this
    }
})

avalon.fn.mix({
    hasClass: function(cls) {
        var el = this[0] || {} //IE10+, chrome8+, firefox3.6+, safari5.1+,opera11.5+支持classList,chrome24+,firefox26+支持classList2.0
        return el.nodeType === 1 && el.classList.contains(cls)
    },
    toggleClass: function(value, stateVal) {
        var className, i = 0
        var classNames = String(value).split(/\s+/)
        var isBool = typeof stateVal === "boolean"
        while ((className = classNames[i++])) {
            var state = isBool ? stateVal : !this.hasClass(className)
            this[state ? "addClass" : "removeClass"](className)
        }
        return this
    },
    attr: function(name, value) {
        if (arguments.length === 2) {
            this[0].setAttribute(name, value)
            return this
        } else {
            return this[0].getAttribute(name)
        }
    },
    data: function(name, value) {
        name = "data-" + hyphen(name || "")
        switch (arguments.length) {
            case 2:
                this.attr(name, value)
                return this
            case 1:
                var val = this.attr(name)
                return parseData(val)
            case 0:
                var ret = {}
                ap.forEach.call(this[0].attributes, function(attr) {
                    if (attr) {
                        name = attr.name
                        if (!name.indexOf("data-")) {
                            name = camelize(name.slice(5))
                            ret[name] = parseData(attr.value)
                        }
                    }
                })
                return ret
        }
    },
    removeData: function(name) {
        name = "data-" + hyphen(name)
        this[0].removeAttribute(name)
        return this
    },
    css: function(name, value) {
        if (avalon.isPlainObject(name)) {
            for (var i in name) {
                avalon.css(this, i, name[i])
            }
        } else {
            var ret = avalon.css(this, name, value)
        }
        return ret !== void 0 ? ret : this
    },
    position: function() {
        var offsetParent, offset,
            elem = this[0],
            parentOffset = {
                top: 0,
                left: 0
            };
        if (!elem) {
            return
        }
        if (this.css("position") === "fixed") {
            offset = elem.getBoundingClientRect()
        } else {
            offsetParent = this.offsetParent() //得到真正的offsetParent
            offset = this.offset() // 得到正确的offsetParent
            if (offsetParent[0].tagName !== "HTML") {
                parentOffset = offsetParent.offset()
            }
            parentOffset.top += avalon.css(offsetParent[0], "borderTopWidth", true)
            parentOffset.left += avalon.css(offsetParent[0], "borderLeftWidth", true)
            // Subtract offsetParent scroll positions
            parentOffset.top -= offsetParent.scrollTop()
            parentOffset.left -= offsetParent.scrollLeft()
        }
        return {
            top: offset.top - parentOffset.top - avalon.css(elem, "marginTop", true),
            left: offset.left - parentOffset.left - avalon.css(elem, "marginLeft", true)
        }
    },
    offsetParent: function() {
        var offsetParent = this[0].offsetParent
        while (offsetParent && avalon.css(offsetParent, "position") === "static") {
            offsetParent = offsetParent.offsetParent;
        }
        return avalon(offsetParent || root)
    },
    bind: function(type, fn, phase) {
        if (this[0]) { //此方法不会链
            return avalon.bind(this[0], type, fn, phase)
        }
    },
    unbind: function(type, fn, phase) {
        if (this[0]) {
            avalon.unbind(this[0], type, fn, phase)
        }
        return this
    },
    val: function(value) {
        var node = this[0]
        if (node && node.nodeType === 1) {
            var get = arguments.length === 0
            var access = get ? ":get" : ":set"
            var fn = valHooks[getValType(node) + access]
            if (fn) {
                var val = fn(node, value)
            } else if (get) {
                return (node.value || "").replace(/\r/g, "")
            } else {
                node.value = value
            }
        }
        return get ? val : this
    }
})

if (root.dataset) {
    avalon.fn.data = function(name, val) {
        name = name && camelize(name)
        var dataset = this[0].dataset
        switch (arguments.length) {
            case 2:
                dataset[name] = val
                return this
            case 1:
                val = dataset[name]
                return parseData(val)
            case 0:
                var ret = createMap()
                for (name in dataset) {
                    ret[name] = parseData(dataset[name])
                }
                return ret
        }
    }
}
var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/
avalon.parseJSON = JSON.parse

function parseData(data) {
    try {
        if (typeof data === "object")
            return data
        data = data === "true" ? true :
            data === "false" ? false :
            data === "null" ? null : +data + "" === data ? +data : rbrace.test(data) ? JSON.parse(data) : data
    } catch (e) {}
    return data
}
avalon.each({
    scrollLeft: "pageXOffset",
    scrollTop: "pageYOffset"
}, function(method, prop) {
    avalon.fn[method] = function(val) {
        var node = this[0] || {}, win = getWindow(node),
            top = method === "scrollTop"
        if (!arguments.length) {
            return win ? win[prop] : node[method]
        } else {
            if (win) {
                win.scrollTo(!top ? val : win[prop], top ? val : win[prop])
            } else {
                node[method] = val
            }
        }
    }
})

function getWindow(node) {
    return node.window && node.document ? node : node.nodeType === 9 ? node.defaultView : false
}

//=============================css相关==================================
var cssHooks = avalon.cssHooks = createMap()
var prefixes = ["", "-webkit-", "-moz-", "-ms-"] //去掉opera-15的支持
var cssMap = {
    "float": "cssFloat"
}
avalon.cssNumber = oneObject("animationIterationCount,columnCount,order,flex,flexGrow,flexShrink,fillOpacity,fontWeight,lineHeight,opacity,orphans,widows,zIndex,zoom")

avalon.cssName = function(name, host, camelCase) {
    if (cssMap[name]) {
        return cssMap[name]
    }
    host = host || root.style
    for (var i = 0, n = prefixes.length; i < n; i++) {
        camelCase = camelize(prefixes[i] + name)
        if (camelCase in host) {
            return (cssMap[name] = camelCase)
        }
    }
    return null
}
cssHooks["@:set"] = function(node, name, value) {
    node.style[name] = value
}

cssHooks["@:get"] = function(node, name) {
    if (!node || !node.style) {
        throw new Error("getComputedStyle要求传入一个节点 " + node)
    }
    var ret, computed = getComputedStyle(node)
        if (computed) {
            ret = name === "filter" ? computed.getPropertyValue(name) : computed[name]
            if (ret === "") {
                ret = node.style[name] //其他浏览器需要我们手动取内联样式
            }
        }
    return ret
}
cssHooks["opacity:get"] = function(node) {
    var ret = cssHooks["@:get"](node, "opacity")
    return ret === "" ? "1" : ret
}

"top,left".replace(rword, function(name) {
    cssHooks[name + ":get"] = function(node) {
        var computed = cssHooks["@:get"](node, name)
        return /px$/.test(computed) ? computed :
            avalon(node).position()[name] + "px"
    }
})
var cssShow = {
    position: "absolute",
    visibility: "hidden",
    display: "block"
}
var rdisplayswap = /^(none|table(?!-c[ea]).+)/

    function showHidden(node, array) {
        //http://www.cnblogs.com/rubylouvre/archive/2012/10/27/2742529.html
        if (node.offsetWidth <= 0) { //opera.offsetWidth可能小于0
            var styles = getComputedStyle(node, null)
            if (rdisplayswap.test(styles["display"])) {
                var obj = {
                    node: node
                }
                for (var name in cssShow) {
                    obj[name] = styles[name]
                    node.style[name] = cssShow[name]
                }
                array.push(obj)
            }
            var parent = node.parentNode
            if (parent && parent.nodeType === 1) {
                showHidden(parent, array)
            }
        }
    }

    "Width,Height".replace(rword, function(name) { //fix 481
        var method = name.toLowerCase(),
            clientProp = "client" + name,
            scrollProp = "scroll" + name,
            offsetProp = "offset" + name
            cssHooks[method + ":get"] = function(node, which, override) {
                var boxSizing = -4
                if (typeof override === "number") {
                    boxSizing = override
                }
                which = name === "Width" ? ["Left", "Right"] : ["Top", "Bottom"]
                var ret = node[offsetProp] // border-box 0
                if (boxSizing === 2) { // margin-box 2
                    return ret + avalon.css(node, "margin" + which[0], true) + avalon.css(node, "margin" + which[1], true)
                }
                if (boxSizing < 0) { // padding-box  -2
                    ret = ret - avalon.css(node, "border" + which[0] + "Width", true) - avalon.css(node, "border" + which[1] + "Width", true)
                }
                if (boxSizing === -4) { // content-box -4
                    ret = ret - avalon.css(node, "padding" + which[0], true) - avalon.css(node, "padding" + which[1], true)
                }
                return ret
            }
        cssHooks[method + "&get"] = function(node) {
            var hidden = [];
            showHidden(node, hidden);
            var val = cssHooks[method + ":get"](node)
            for (var i = 0, obj; obj = hidden[i++];) {
                node = obj.node
                for (var n in obj) {
                    if (typeof obj[n] === "string") {
                        node.style[n] = obj[n]
                    }
                }
            }
            return val;
        }
        avalon.fn[method] = function(value) { //会忽视其display
            var node = this[0]
            if (arguments.length === 0) {
                if (node.setTimeout) { //取得窗口尺寸,IE9后可以用node.innerWidth /innerHeight代替
                    return node["inner" + name]
                }
                if (node.nodeType === 9) { //取得页面尺寸
                    var doc = node.documentElement
                    //FF chrome    html.scrollHeight< body.scrollHeight
                    //IE 标准模式 : html.scrollHeight> body.scrollHeight
                    //IE 怪异模式 : html.scrollHeight 最大等于可视窗口多一点？
                    return Math.max(node.body[scrollProp], doc[scrollProp], node.body[offsetProp], doc[offsetProp], doc[clientProp])
                }
                return cssHooks[method + "&get"](node)
            } else {
                return this.css(method, value)
            }
        }
        avalon.fn["inner" + name] = function() {
            return cssHooks[method + ":get"](this[0], void 0, -2)
        }
        avalon.fn["outer" + name] = function(includeMargin) {
            return cssHooks[method + ":get"](this[0], void 0, includeMargin === true ? 2 : 0)
        }
    })
    avalon.fn.offset = function() { //取得距离页面左右角的坐标
        var node = this[0]
        try {
            var rect = node.getBoundingClientRect()
            // Make sure element is not hidden (display: none) or disconnected
            // https://github.com/jquery/jquery/pull/2043/files#r23981494
            if (rect.width || rect.height || node.getClientRects().length) {
                var doc = node.ownerDocument
                var root = doc.documentElement
                var win = doc.defaultView
                return {
                    top: rect.top + win.pageYOffset - root.clientTop,
                    left: rect.left + win.pageXOffset - root.clientLeft
                }
            }
        } catch (e) {
            return {
                left: 0,
                top: 0
            }
        }
    }
    //=============================val相关=======================

    function getValType(elem) {
        var ret = elem.tagName.toLowerCase()
        return ret === "input" && /checkbox|radio/.test(elem.type) ? "checked" : ret
    }
var valHooks = {
    "select:get": function(node, value) {
        var option, options = node.options,
            index = node.selectedIndex,
            one = node.type === "select-one" || index < 0,
            values = one ? null : [],
            max = one ? index + 1 : options.length,
            i = index < 0 ? max : one ? index : 0
        for (; i < max; i++) {
            option = options[i]
            //旧式IE在reset后不会改变selected，需要改用i === index判定
            //我们过滤所有disabled的option元素，但在safari5下，如果设置select为disable，那么其所有孩子都disable
            //因此当一个元素为disable，需要检测其是否显式设置了disable及其父节点的disable情况
            if ((option.selected || i === index) && !option.disabled) {
                value = option.value
                if (one) {
                    return value
                }
                //收集所有selected值组成数组返回
                values.push(value)
            }
        }
        return values
    },
    "select:set": function(node, values, optionSet) {
        values = [].concat(values) //强制转换为数组
        for (var i = 0, el; el = node.options[i++];) {
            if ((el.selected = values.indexOf(el.value) > -1)) {
                optionSet = true
            }
        }
        if (!optionSet) {
            node.selectedIndex = -1
        }
    }
}
/*********************************************************************
 *                          编译系统                                  *
 **********************************************************************/
var quote = JSON.stringify

var keywords = [
    "break,case,catch,continue,debugger,default,delete,do,else,false",
    "finally,for,function,if,in,instanceof,new,null,return,switch,this",
    "throw,true,try,typeof,var,void,while,with", /* 关键字*/
    "abstract,boolean,byte,char,class,const,double,enum,export,extends",
    "final,float,goto,implements,import,int,interface,long,native",
    "package,private,protected,public,short,static,super,synchronized",
    "throws,transient,volatile", /*保留字*/
    "arguments,let,yield,undefined" /* ECMA 5 - use strict*/].join(",")
var rrexpstr = /\/\*[\w\W]*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|"(?:[^"\\]|\\[\w\W])*"|'(?:[^'\\]|\\[\w\W])*'|[\s\t\n]*\.[\s\t\n]*[$\w\.]+/g
var rsplit = /[^\w$]+/g
var rkeywords = new RegExp(["\\b" + keywords.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g')
var rnumber = /\b\d[^,]*/g
var rcomma = /^,+|,+$/g
var variablePool = new Cache(512)
var getVariables = function (code) {
    var key = "," + code.trim()
    var ret = variablePool.get(key)
    if (ret) {
        return ret
    }
    var match = code
            .replace(rrexpstr, "")
            .replace(rsplit, ",")
            .replace(rkeywords, "")
            .replace(rnumber, "")
            .replace(rcomma, "")
            .split(/^$|,+/)
    return variablePool.put(key, uniqSet(match))
}
/*添加赋值语句*/

function addAssign(vars, scope, name, data) {
    var ret = [],
            prefix = " = " + name + "."
    for (var i = vars.length, prop; prop = vars[--i]; ) {
        if (scope.hasOwnProperty(prop)) {
            ret.push(prop + prefix + prop)
            data.vars.push(prop)
            if (data.type === "duplex") {
                vars.get = name + "." + prop
            }
            vars.splice(i, 1)
        }
    }
    return ret
}

function uniqSet(array) {
    var ret = [],
            unique = {}
    for (var i = 0; i < array.length; i++) {
        var el = array[i]
        var id = el && typeof el.$id === "string" ? el.$id : el
        if (!unique[id]) {
            unique[id] = ret.push(el)
        }
    }
    return ret
}
//缓存求值函数，以便多次利用
var evaluatorPool = new Cache(128)
//取得求值函数及其传参
var rduplex = /\w\[.*\]|\w\.\w/
var rproxy = /(\$proxy\$[a-z]+)\d+$/
var rthimRightParentheses = /\)\s*$/
var rthimOtherParentheses = /\)\s*\|/g
var rquoteFilterName = /\|\s*([$\w]+)/g
var rpatchBracket = /"\s*\["/g
var rthimLeftParentheses = /"\s*\(/g
function parseFilter(val, filters) {
    filters = filters
            .replace(rthimRightParentheses, "")//处理最后的小括号
            .replace(rthimOtherParentheses, function () {//处理其他小括号
                return "],|"
            })
            .replace(rquoteFilterName, function (a, b) { //处理|及它后面的过滤器的名字
                return "[" + quote(b)
            })
            .replace(rpatchBracket, function () {
                return '"],["'
            })
            .replace(rthimLeftParentheses, function () {
                return '",'
            }) + "]"
    return  "return this.filters.$filter(" + val + ", " + filters + ")"
}

function parseExpr(code, scopes, data) {
    var dataType = data.type
    var filters = data.filters || ""
    var exprId = scopes.map(function (el) {
        return String(el.$id).replace(rproxy, "$1")
    }) + code + dataType + filters
    var vars = getVariables(code).concat(),
            assigns = [],
            names = [],
            args = [],
            prefix = ""
    //args 是一个对象数组， names 是将要生成的求值函数的参数
    scopes = uniqSet(scopes)
    data.vars = []
    for (var i = 0, sn = scopes.length; i < sn; i++) {
        if (vars.length) {
            var name = "vm" + expose + "_" + i
            names.push(name)
            args.push(scopes[i])
            assigns.push.apply(assigns, addAssign(vars, scopes[i], name, data))
        }
    }
    if (!assigns.length && dataType === "duplex") {
        return
    }
    if (dataType !== "duplex" && (code.indexOf("||") > -1 || code.indexOf("&&") > -1)) {
        //https://github.com/RubyLouvre/avalon/issues/583
        data.vars.forEach(function (v) {
            var reg = new RegExp("\\b" + v + "(?:\\.\\w+|\\[\\w+\\])+", "ig")
            code = code.replace(reg, function (_, cap) {
                var c = _.charAt(v.length)
                //var r = IEVersion ? code.slice(arguments[1] + _.length) : RegExp.rightContext
                //https://github.com/RubyLouvre/avalon/issues/966
                var r = code.slice(cap + _.length)
                var method = /^\s*\(/.test(r)
                if (c === "." || c === "[" || method) {//比如v为aa,我们只匹配aa.bb,aa[cc],不匹配aaa.xxx
                    var name = "var" + String(Math.random()).replace(/^0\./, "")
                    if (method) {//array.size()
                        var array = _.split(".")
                        if (array.length > 2) {
                            var last = array.pop()
                            assigns.push(name + " = " + array.join("."))
                            return name + "." + last
                        } else {
                            return _
                        }
                    }
                    assigns.push(name + " = " + _)
                    return name
                } else {
                    return _
                }
            })
        })
    }
    //---------------args----------------
    data.args = args
    //---------------cache----------------
    delete data.vars
    var fn = evaluatorPool.get(exprId) //直接从缓存，免得重复生成
    if (fn) {
        data.evaluator = fn
        return
    }
    prefix = assigns.join(", ")
    if (prefix) {
        prefix = "var " + prefix
    }
    if (/\S/.test(filters)) { //文本绑定，双工绑定才有过滤器
        if (!/text|html/.test(data.type)) {
            throw Error("ms-" + data.type + "不支持过滤器")
        }
        code = "\nvar ret" + expose + " = " + code + ";\r\n"
        code += parseFilter("ret" + expose, filters)
        try {
            fn = Function.apply(noop, names.concat("'use strict';\n" + prefix + code))
            data.evaluator = evaluatorPool.put(exprId, function() {
                return fn.apply(avalon, arguments)//确保可以在编译代码中使用this获取avalon对象
            })
        } catch (e) {
            log("debug: parse error," + e.message)
        }
        vars = assigns = names = null //释放内存
        return
    } else if (dataType === "duplex") { //双工绑定
        var _body = "'use strict';\nreturn function(vvv){\n\t" +
                prefix +
                ";\n\tif(!arguments.length){\n\t\treturn " +
                code +
                "\n\t}\n\t" + (!rduplex.test(code) ? vars.get : code) +
                "= vvv;\n} "
        try {
            fn = Function.apply(noop, names.concat(_body))
            data.evaluator = evaluatorPool.put(exprId, fn)
        } catch (e) {
            log("debug: parse error," + e.message)
        }
        vars = assigns = names = null //释放内存
        return
    } else if (dataType === "on") { //事件绑定
        if (code.indexOf("(") === -1) {
            code += ".call(this, $event)"
        } else {
            code = code.replace("(", ".call(this,")
        }
        names.push("$event")
        code = "\nreturn " + code + ";" //IE全家 Function("return ")出错，需要Function("return ;")
        var lastIndex = code.lastIndexOf("\nreturn")
        var header = code.slice(0, lastIndex)
        var footer = code.slice(lastIndex)
        code = header + "\n" + footer
    } else { //其他绑定
        code = "\nreturn " + code + ";" //IE全家 Function("return ")出错，需要Function("return ;")
    }
    try {
        fn = Function.apply(noop, names.concat("'use strict';\n" + prefix + code))
        data.evaluator = evaluatorPool.put(exprId, fn)
    } catch (e) {
        log("debug: parse error," + e.message)
    }
    vars = assigns = names = null //释放内存
}
function stringifyExpr(code) {
    var hasExpr = rexpr.test(code) //比如ms-class="width{{w}}"的情况
    if (hasExpr) {
        var array = scanExpr(code)
        if (array.length === 1) {
            return array[0].value
        }
        return array.map(function (el) {
            return el.expr ? "(" + el.value + ")" : quote(el.value)
        }).join(" + ")
    } else {
        return code
    }
}
//parseExpr的智能引用代理

function parseExprProxy(code, scopes, data, noRegister) {
    code = code || "" //code 可能未定义
    parseExpr(code, scopes, data)
    if (data.evaluator && !noRegister) {
        data.handler = bindingExecutors[data.handlerName || data.type]
        //方便调试
        //这里非常重要,我们通过判定视图刷新函数的element是否在DOM树决定
        //将它移出订阅者列表
        avalon.injectBinding(data)
    }
}
avalon.parseExprProxy = parseExprProxy
/*********************************************************************
 *                           扫描系统                                 *
 **********************************************************************/

avalon.scan = function(elem, vmodel) {
    elem = elem || root
    var vmodels = vmodel ? [].concat(vmodel) : []
    scanTag(elem, vmodels)
}

//http://www.w3.org/TR/html5/syntax.html#void-elements
var stopScan = oneObject("area,base,basefont,br,col,command,embed,hr,img,input,link,meta,param,source,track,wbr,noscript,script,style,textarea".toUpperCase())

function checkScan(elem, callback, innerHTML) {
    var id = setTimeout(function() {
        var currHTML = elem.innerHTML
        clearTimeout(id)
        if (currHTML === innerHTML) {
            callback()
        } else {
            checkScan(elem, callback, currHTML)
        }
    })
}


function createSignalTower(elem, vmodel) {
    var id = elem.getAttribute("avalonctrl") || vmodel.$id
    elem.setAttribute("avalonctrl", id)
    vmodel.$events.expr = elem.tagName + '[avalonctrl="' + id + '"]'
}

var getBindingCallback = function(elem, name, vmodels) {
    var callback = elem.getAttribute(name)
    if (callback) {
        for (var i = 0, vm; vm = vmodels[i++]; ) {
            if (vm.hasOwnProperty(callback) && typeof vm[callback] === "function") {
                return vm[callback]
            }
        }
    }
}

function executeBindings(bindings, vmodels) {
    for (var i = 0, data; data = bindings[i++]; ) {
        data.vmodels = vmodels
        bindingHandlers[data.type](data, vmodels)
        if (data.evaluator && data.element && data.element.nodeType === 1) { //移除数据绑定，防止被二次解析
            //chrome使用removeAttributeNode移除不存在的特性节点时会报错 https://github.com/RubyLouvre/avalon/issues/99
            data.element.removeAttribute(data.name)
        }
    }
    bindings.length = 0
}

//https://github.com/RubyLouvre/avalon/issues/636
var mergeTextNodes = IEVersion && window.MutationObserver ? function (elem) {
    var node = elem.firstChild, text
    while (node) {
        var aaa = node.nextSibling
        if (node.nodeType === 3) {
            if (text) {
                text.nodeValue += node.nodeValue
                elem.removeChild(node)
            } else {
                text = node
            }
        } else {
            text = null
        }
        node = aaa
    }
} : 0
var roneTime = /^\s*::/
var rmsAttr = /ms-(\w+)-?(.*)/
var priorityMap = {
    "if": 10,
    "repeat": 90,
    "data": 100,
    "widget": 110,
    "each": 1400,
    "with": 1500,
    "duplex": 2000,
    "on": 3000
}

var events = oneObject("animationend,blur,change,input,click,dblclick,focus,keydown,keypress,keyup,mousedown,mouseenter,mouseleave,mousemove,mouseout,mouseover,mouseup,scan,scroll,submit")
var obsoleteAttrs = oneObject("value,title,alt,checked,selected,disabled,readonly,enabled")
function bindingSorter(a, b) {
    return a.priority - b.priority
}

function scanAttr(elem, vmodels, match) {
    var scanNode = true
    if (vmodels.length) {
        var attributes = elem.attributes
        var bindings = []
        var fixAttrs = []
        var uniq = {}
        var msData = createMap()
        for (var i = 0, attr; attr = attributes[i++]; ) {
            if (attr.specified) {
                if (match = attr.name.match(rmsAttr)) {
                    //如果是以指定前缀命名的
                    var type = match[1]
                    var param = match[2] || ""
                    var value = attr.value
                    var name = attr.name
                    if (uniq[name]) {//IE8下ms-repeat,ms-with BUG
                        continue
                    }
                    uniq[name] = 1
                    if (events[type]) {
                        param = type
                        type = "on"
                    } else if (obsoleteAttrs[type]) {
                        if (type === "enabled") {//吃掉ms-enabled绑定,用ms-disabled代替
                            log("warning!ms-enabled或ms-attr-enabled已经被废弃")
                            type = "disabled"
                            value = "!(" + value + ")"
                        }
                        param = type
                        type = "attr"
                        name = "ms-" + type + "-" + param
                        fixAttrs.push([attr.name, name, value])
                    }
                    msData[name] = value
                    if (typeof bindingHandlers[type] === "function") {
                        var newValue = value.replace(roneTime, "")
                        var oneTime = value !== newValue
                        var binding = {
                            type: type,
                            param: param,
                            element: elem,
                            name: name,
                            value: newValue,
                            oneTime: oneTime,
                            priority: (priorityMap[type] || type.charCodeAt(0) * 10) + (Number(param.replace(/\D/g, "")) || 0)
                        }
                        if (type === "html" || type === "text") {
                            var token = getToken(value)
                            avalon.mix(binding, token)
                            binding.filters = binding.filters.replace(rhasHtml, function () {
                                binding.type = "html"
                                binding.group = 1
                                return ""
                            })// jshint ignore:line
                        } else if (type === "duplex") {
                            var hasDuplex = name
                        } else if (name === "ms-if-loop") {
                            binding.priority += 100
                        }
                        bindings.push(binding)
                        if (type === "widget") {
                            elem.msData = elem.msData || msData
                        }
                    }
                }
            }
        }
        if (bindings.length) {
            bindings.sort(bindingSorter)
            fixAttrs.forEach(function (arr) {
                log("warning!请改用" + arr[1] + "代替" + arr[0] + "!")
                elem.removeAttribute(arr[0])
                elem.setAttribute(arr[1], arr[2])
            })
            var control = elem.type
            if (control && hasDuplex) {
                if (msData["ms-attr-value"] && elem.type === "text") {
                    log("warning!" + control + "控件不能同时定义ms-attr-value与" + hasDuplex)
                }
            }

            for (i = 0; binding = bindings[i]; i++) {
                type = binding.type
                if (rnoscanAttrBinding.test(type)) {
                    return executeBindings(bindings.slice(0, i + 1), vmodels)
                } else if (scanNode) {
                    scanNode = !rnoscanNodeBinding.test(type)
                }
            }
            executeBindings(bindings, vmodels)
        }
    }
    if (scanNode && !stopScan[elem.tagName] && rbind.test(elem.innerHTML + elem.textContent)) {
        mergeTextNodes && mergeTextNodes(elem)
        scanNodeList(elem, vmodels) //扫描子孙元素
    }
}

var rnoscanAttrBinding = /^if|widget|repeat$/
var rnoscanNodeBinding = /^each|with|html|include$/
function scanNodeList(parent, vmodels) {
    var nodes = avalon.slice(parent.childNodes)
    scanNodeArray(nodes, vmodels)
}

function scanNodeArray(nodes, vmodels) {
    for (var i = 0, node; node = nodes[i++];) {
        switch (node.nodeType) {
            case 1:
                scanTag(node, vmodels) //扫描元素节点
                if (node.msCallback) {
                    node.msCallback()
                    node.msCallback = void 0
                }
                break
            case 3:
               if(rexpr.test(node.nodeValue)){
                    scanText(node, vmodels, i) //扫描文本节点
               }
               break
        }
    }
}


function scanTag(elem, vmodels, node) {
    //扫描顺序  ms-skip(0) --> ms-important(1) --> ms-controller(2) --> ms-if(10) --> ms-repeat(100) 
    //--> ms-if-loop(110) --> ms-attr(970) ...--> ms-each(1400)-->ms-with(1500)--〉ms-duplex(2000)垫后        
    var a = elem.getAttribute("ms-skip")
    var b = elem.getAttributeNode("ms-important")
    var c = elem.getAttributeNode("ms-controller")
    if (typeof a === "string") {
        return
    } else if (node = b || c) {
        var newVmodel = avalon.vmodels[node.value]
        if (!newVmodel) {
            return
        }
        //ms-important不包含父VM，ms-controller相反
        vmodels = node === b ? [newVmodel] : [newVmodel].concat(vmodels)
        elem.removeAttribute(node.name) //removeAttributeNode不会刷新[ms-controller]样式规则
        elem.classList.remove(node.name)
        createSignalTower(elem, newVmodel)
    }
    scanAttr(elem, vmodels) //扫描特性节点
}
var rhasHtml = /\|\s*html(?:\b|$)/,
        r11a = /\|\|/g,
        rlt = /&lt;/g,
        rgt = /&gt;/g,
        rstringLiteral = /(['"])(\\\1|.)+?\1/g
function getToken(value) {
    if (value.indexOf("|") > 0) {
        var scapegoat = value.replace(rstringLiteral, function (_) {
            return Array(_.length + 1).join("1")// jshint ignore:line
        })
        var index = scapegoat.replace(r11a, "\u1122\u3344").indexOf("|") //干掉所有短路或
        if (index > -1) {
            return {
                filters: value.slice(index),
                value: value.slice(0, index),
                expr: true
            }
        }
    }
    return {
        value: value,
        filters: "",
        expr: true
    }
}

function scanExpr(str) {
    var tokens = [],
            value, start = 0,
            stop
    do {
        stop = str.indexOf(openTag, start)
        if (stop === -1) {
            break
        }
        value = str.slice(start, stop)
        if (value) { // {{ 左边的文本
            tokens.push({
                value: value,
                filters: "",
                expr: false
            })
        }
        start = stop + openTag.length
        stop = str.indexOf(closeTag, start)
        if (stop === -1) {
            break
        }
        value = str.slice(start, stop)
        if (value) { //处理{{ }}插值表达式
            tokens.push(getToken(value, start))
        }
        start = stop + closeTag.length
    } while (1)
    value = str.slice(start)
    if (value) { //}} 右边的文本
        tokens.push({
            value: value,
            expr: false,
            filters: ""
        })
    }
    return tokens
}

function scanText(textNode, vmodels, index) {
    var bindings = []
    tokens = scanExpr(textNode.data)
    if (tokens.length) {
        for (var i = 0; token = tokens[i++]; ) {
            var node = DOC.createTextNode(token.value) //将文本转换为文本节点，并替换原来的文本节点
            if (token.expr) {
                token.value = token.value.replace(roneTime, function () {
                    token.oneTime = true
                    return ""
                })// jshint ignore:line
                token.type = "text"
                token.element = node
                token.filters = token.filters.replace(rhasHtml, function (a, b,c) {
                    token.type = "html"
                    return ""
                })// jshint ignore:line
                token.pos = index * 1000 + i
                bindings.push(token) //收集带有插值表达式的文本
            }
            avalonFragment.appendChild(node)
        }
        textNode.parentNode.replaceChild(avalonFragment, textNode)
        if (bindings.length)
            executeBindings(bindings, vmodels)
    }
}

var bools = ["autofocus,autoplay,async,allowTransparency,checked,controls",
    "declare,disabled,defer,defaultChecked,defaultSelected",
    "contentEditable,isMap,loop,multiple,noHref,noResize,noShade",
    "open,readOnly,selected"
].join(",")
var boolMap = {}
bools.replace(rword, function (name) {
    boolMap[name.toLowerCase()] = name
})

var propMap = {//属性名映射
    "accept-charset": "acceptCharset",
    "char": "ch",
    "charoff": "chOff",
    "class": "className",
    "for": "htmlFor",
    "http-equiv": "httpEquiv"
}

var anomaly = ["accessKey,bgColor,cellPadding,cellSpacing,codeBase,codeType,colSpan",
    "dateTime,defaultValue,frameBorder,longDesc,maxLength,marginWidth,marginHeight",
    "rowSpan,tabIndex,useMap,vSpace,valueType,vAlign"
].join(",")
anomaly.replace(rword, function (name) {
    propMap[name.toLowerCase()] = name
})

var rnoscripts = /<noscript.*?>(?:[\s\S]+?)<\/noscript>/img
var rnoscriptText = /<noscript.*?>([\s\S]+?)<\/noscript>/im

var getXHR = function () {
    return new (window.XMLHttpRequest || ActiveXObject)("Microsoft.XMLHTTP") // jshint ignore:line
}

var templatePool = avalon.templateCache = {}

bindingHandlers.attr = function (data, vmodels) {
    var value = stringifyExpr(data.value.trim())
    if (data.type === "include") {
        var elem = data.element
        data.includeRendered = getBindingCallback(elem, "data-include-rendered", vmodels)
        data.includeLoaded = getBindingCallback(elem, "data-include-loaded", vmodels)
        var outer = data.includeReplace = !!avalon(elem).data("includeReplace")
        if (avalon(elem).data("includeCache")) {
            data.templateCache = {}
        }
        data.startInclude = DOC.createComment("ms-include")
        data.endInclude = DOC.createComment("ms-include-end")
        if (outer) {
            data.element = data.startInclude
            elem.parentNode.insertBefore(data.startInclude, elem)
            elem.parentNode.insertBefore(data.endInclude, elem.nextSibling)
        } else {
            elem.insertBefore(data.startInclude, elem.firstChild)
            elem.appendChild(data.endInclude)
        }
    }
    data.handlerName = "attr" //handleName用于处理多种绑定共用同一种bindingExecutor的情况
    parseExprProxy(value, vmodels, data)
}

bindingExecutors.attr = function (val, elem, data) {
    var method = data.type,
            attrName = data.param
    if (method === "css") {
        avalon(elem).css(attrName, val)
    } else if (method === "attr") {

        // ms-attr-class="xxx" vm.xxx="aaa bbb ccc"将元素的className设置为aaa bbb ccc
        // ms-attr-class="xxx" vm.xxx=false  清空元素的所有类名
        // ms-attr-name="yyy"  vm.yyy="ooo" 为元素设置name属性
        var toRemove = (val === false) || (val === null) || (val === void 0)

        if (!W3C && propMap[attrName]) { //旧式IE下需要进行名字映射
            attrName = propMap[attrName]
        }
        var bool = boolMap[attrName]
        if (typeof elem[bool] === "boolean") {
            elem[bool] = !!val //布尔属性必须使用el.xxx = true|false方式设值
            if (!val) { //如果为false, IE全系列下相当于setAttribute(xxx,''),会影响到样式,需要进一步处理
                toRemove = true
            }
        }
        if (toRemove) {
            return elem.removeAttribute(attrName)
        }
        //SVG只能使用setAttribute(xxx, yyy), VML只能使用elem.xxx = yyy ,HTML的固有属性必须elem.xxx = yyy
        var isInnate = rsvg.test(elem) ? false : (DOC.namespaces && isVML(elem)) ? true : attrName in elem.cloneNode(false)
        if (isInnate) {
            elem[attrName] = val + ""
        } else {
            elem.setAttribute(attrName, val)
        }
    } else if (method === "include" && val) {
        var vmodels = data.vmodels
        var rendered = data.includeRendered
        var loaded = data.includeLoaded
        var replace = data.includeReplace
        var target = replace ? elem.parentNode : elem
        var scanTemplate = function (text) {
            if (loaded) {
                var newText = loaded.apply(target, [text].concat(vmodels))
                if (typeof newText === "string")
                    text = newText
            }
            if (rendered) {
                checkScan(target, function () {
                    rendered.call(target)
                }, NaN)
            }
            var lastID = data.includeLastID
            if (data.templateCache && lastID && lastID !== val) {
                var lastTemplate = data.templateCache[lastID]
                if (!lastTemplate) {
                    lastTemplate = data.templateCache[lastID] = DOC.createElement("div")
                    ifGroup.appendChild(lastTemplate)
                }
            }
            data.includeLastID = val
            while (true) {
                var node = data.startInclude.nextSibling
                if (node && node !== data.endInclude) {
                    target.removeChild(node)
                    if (lastTemplate)
                        lastTemplate.appendChild(node)
                } else {
                    break
                }
            }
            var dom = getTemplateNodes(data, val, text)
            var nodes = avalon.slice(dom.childNodes)
            target.insertBefore(dom, data.endInclude)
            scanNodeArray(nodes, vmodels)
        }

        if (data.param === "src") {
            if (typeof templatePool[val] === "string") {
                avalon.nextTick(function () {
                    scanTemplate(templatePool[val])
                })
            } else if (Array.isArray(templatePool[val])) { //#805 防止在循环绑定中发出许多相同的请求
                templatePool[val].push(scanTemplate)
            } else {
                var xhr = getXHR()
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        var s = xhr.status
                        if (s >= 200 && s < 300 || s === 304 || s === 1223) {
                            var text = xhr.responseText
                            for (var f = 0, fn; fn = templatePool[val][f++]; ) {
                                fn(text)
                            }
                            templatePool[val] = text
                        }
                    }
                }
                templatePool[val] = [scanTemplate]
                xhr.open("GET", val, true)
                if ("withCredentials" in xhr) {
                    xhr.withCredentials = true
                }
                xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")
                xhr.send(null)
            }
        } else {
            //IE系列与够新的标准浏览器支持通过ID取得元素（firefox14+）
            //http://tjvantoll.com/2012/07/19/dom-element-references-as-global-variables/
            var el = val && val.nodeType === 1 ? val : DOC.getElementById(val)
            if (el) {
                if (el.tagName === "NOSCRIPT" && !(el.innerHTML || el.fixIE78)) { //IE7-8 innerText,innerHTML都无法取得其内容，IE6能取得其innerHTML
                    xhr = getXHR() //IE9-11与chrome的innerHTML会得到转义的内容，它们的innerText可以
                    xhr.open("GET", location, false) //谢谢Nodejs 乱炖群 深圳-纯属虚构
                    xhr.send(null)
                    //http://bbs.csdn.net/topics/390349046?page=1#post-393492653
                    var noscripts = DOC.getElementsByTagName("noscript")
                    var array = (xhr.responseText || "").match(rnoscripts) || []
                    var n = array.length
                    for (var i = 0; i < n; i++) {
                        var tag = noscripts[i]
                        if (tag) { //IE6-8中noscript标签的innerHTML,innerText是只读的
                            tag.style.display = "none" //http://haslayout.net/css/noscript-Ghost-Bug
                            tag.fixIE78 = (array[i].match(rnoscriptText) || ["", "&nbsp;"])[1]
                        }
                    }
                }
                avalon.nextTick(function () {
                    scanTemplate(el.fixIE78 || el.value || el.innerText || el.innerHTML)
                })
            }
        }
    } else {
        if (!root.hasAttribute && typeof val === "string" && (method === "src" || method === "href")) {
            val = val.replace(/&amp;/g, "&") //处理IE67自动转义的问题
        }
        elem[method] = val
        if (window.chrome && elem.tagName === "EMBED") {
            var parent = elem.parentNode //#525  chrome1-37下embed标签动态设置src不能发生请求
            var comment = document.createComment("ms-src")
            parent.replaceChild(comment, elem)
            parent.replaceChild(elem, comment)
        }
    }
}

function getTemplateNodes(data, id, text) {
    var div = data.templateCache && data.templateCache[id]
    if (div) {
        var dom = DOC.createDocumentFragment(),
                firstChild
        while (firstChild = div.firstChild) {
            dom.appendChild(firstChild)
        }
        return dom
    }
    return avalon.parseHTML(text)
}

//这几个指令都可以使用插值表达式，如ms-src="aaa/{{b}}/{{c}}.html"
"title,alt,src,value,css,include,href".replace(rword, function (name) {
    bindingHandlers[name] = bindingHandlers.attr
})
//根据VM的属性值或表达式的值切换类名，ms-class="xxx yyy zzz:flag" 
//http://www.cnblogs.com/rubylouvre/archive/2012/12/17/2818540.html
bindingHandlers["class"] = function (binding, vmodels) {
    var oldStyle = binding.param,
            text = binding.value,
            rightExpr
    binding.handlerName = "class"
    if (!oldStyle || isFinite(oldStyle)) {
        binding.param = "" //去掉数字
        var colonIndex = text.replace(rexprg, function (a) {
            return a.replace(/./g, "0")
        }).indexOf(":") //取得第一个冒号的位置
        if (colonIndex === -1) { // 比如 ms-class="aaa bbb ccc" 的情况
            var className = text
            rightExpr = true
        } else { // 比如 ms-class-1="ui-state-active:checked" 的情况
            className = text.slice(0, colonIndex)
            rightExpr = text.slice(colonIndex + 1)
        }
        if (!rexpr.test(text)) {
            className = quote(className)
        } else {
            className = stringifyExpr(className)
        }
        binding.expr = "[" + className + "," + rightExpr + "]"
    } else {
        binding.expr = '[' + quote(oldStyle) + "," + text + "]"
        binding.oldStyle = oldStyle
    }
    var method = binding.type
    if (method === "hover" || method === "active") { //确保只绑定一次
        if (!binding.hasBindEvent) {
            var elem = binding.element
            var $elem = avalon(elem)
            var activate = "mouseenter" //在移出移入时切换类名
            var abandon = "mouseleave"
            if (method === "active") { //在聚焦失焦中切换类名
                elem.tabIndex = elem.tabIndex || -1
                activate = "mousedown"
                abandon = "mouseup"
                var fn0 = $elem.bind("mouseleave", function () {
                    binding.toggleClass && $elem.removeClass(binding.newClass)
                })
            }
        }

        var fn1 = $elem.bind(activate, function () {
            binding.toggleClass && $elem.addClass(binding.newClass)
        })
        var fn2 = $elem.bind(abandon, function () {
            binding.toggleClass && $elem.removeClass(binding.newClass)
        })
        binding.rollback = function () {
            $elem.unbind("mouseleave", fn0)
            $elem.unbind(activate, fn1)
            $elem.unbind(abandon, fn2)
        }
        binding.hasBindEvent = true
    }
    parseExprProxy(binding.expr, vmodels, binding)
}

bindingExecutors["class"] = function (arr, elem, binding) {
    var $elem = avalon(elem)
    binding.newClass = arr[0]
    binding.toggleClass = !!arr[1]
    if (binding.oldClass && binding.newClass !== binding.oldClass) {
        $elem.removeClass(binding.oldClass)
    }
    binding.oldClass = binding.newClass
    if (binding.type === "class") {
        if (binding.oldStyle) {
            $elem.toggleClass(binding.oldStyle, !!arr[1])
        } else {
            $elem.toggleClass(binding.newClass, binding.toggleClass)
        }
    }

}

"hover,active".replace(rword, function (method) {
    bindingHandlers[method] = bindingHandlers["class"]
})
//ms-controller绑定已经在scanTag 方法中实现
//ms-css绑定已由ms-attr绑定实现


// bindingHandlers.data 定义在if.js
bindingExecutors.data = function(val, elem, data) {
	var key = "data-" + data.param
	if (val && typeof val === "object") {
		elem[key] = val
	} else {
		elem.setAttribute(key, String(val))
	}
}
//双工绑定
var duplexBinding = bindingHandlers.duplex = function(data, vmodels) {
    var elem = data.element,
        hasCast
        parseExprProxy(data.value, vmodels, data, 1)

        data.changed = getBindingCallback(elem, "data-duplex-changed", vmodels) || noop
    if (data.evaluator && data.args) {
        var params = []
        var casting = oneObject("string,number,boolean,checked")
        if (elem.type === "radio" && data.param === "") {
            data.param = "checked"
        }
        if (elem.msData) {
            elem.msData["ms-duplex"] = data.value
        }
        data.param.replace(/\w+/g, function(name) {
            if (/^(checkbox|radio)$/.test(elem.type) && /^(radio|checked)$/.test(name)) {
                if (name === "radio")
                    log("ms-duplex-radio已经更名为ms-duplex-checked")
                name = "checked"
                data.isChecked = true
            }
            if (name === "bool") {
                name = "boolean"
                log("ms-duplex-bool已经更名为ms-duplex-boolean")
            } else if (name === "text") {
                name = "string"
                log("ms-duplex-text已经更名为ms-duplex-string")
            }
            if (casting[name]) {
                hasCast = true
            }
            avalon.Array.ensure(params, name)
        })
        if (!hasCast) {
            params.push("string")
        }
        data.param = params.join("-")
        data.bound = function(type, callback) {
            if (elem.addEventListener) {
                elem.addEventListener(type, callback, false)
            } else {
                elem.attachEvent("on" + type, callback)
            }
            var old = data.rollback
            data.rollback = function() {
                elem.avalonSetter = null
                avalon.unbind(elem, type, callback)
                old && old()
            }
        }
        for (var i in avalon.vmodels) {
            var v = avalon.vmodels[i]
            v.$fire("avalon-ms-duplex-init", data)
        }
        var cpipe = data.pipe || (data.pipe = pipe)
        cpipe(null, data, "init")
        var tagName = elem.tagName
        duplexBinding[tagName] && duplexBinding[tagName](elem, data.evaluator.apply(null, data.args), data)
    }
}
//不存在 bindingExecutors.duplex

    function fixNull(val) {
        return val == null ? "" : val
    }
avalon.duplexHooks = {
    checked: {
        get: function(val, data) {
            return !data.element.oldValue
        }
    },
    string: {
        get: function(val) { //同步到VM
            return val
        },
        set: fixNull
    },
    "boolean": {
        get: function(val) {
            return val === "true"
        },
        set: fixNull
    },
    number: {
        get: function(val, data) {
            var number = parseFloat(val)
            if (-val === -number) {
                return number
            }
            var arr = /strong|medium|weak/.exec(data.element.getAttribute("data-duplex-number")) || ["medium"]
            switch (arr[0]) {
                case "strong":
                    return 0
                case "medium":
                    return val === "" ? "" : 0
                case "weak":
                    return val
            }
        },
        set: fixNull
    }
}

function pipe(val, data, action, e) {
    data.param.replace(/\w+/g, function(name) {
        var hook = avalon.duplexHooks[name]
        if (hook && typeof hook[action] === "function") {
            val = hook[action](val, data)
        }
    })
    return val
}

var TimerID, ribbon = []

    avalon.tick = function(fn) {
        if (ribbon.push(fn) === 1) {
            TimerID = setInterval(ticker, 60)
        }
    }

    function ticker() {
        for (var n = ribbon.length - 1; n >= 0; n--) {
            var el = ribbon[n]
            if (el() === false) {
                ribbon.splice(n, 1)
            }
        }
        if (!ribbon.length) {
            clearInterval(TimerID)
        }
    }

var watchValueInTimer = noop
var rmsinput = /text|password|hidden/
new function() { // jshint ignore:line
    try { //#272 IE9-IE11, firefox
        var setters = {}
        var aproto = HTMLInputElement.prototype
        var bproto = HTMLTextAreaElement.prototype
        function newSetter(value) { // jshint ignore:line
                setters[this.tagName].call(this, value)
                if (rmsinput.test(this.type) && !this.msFocus && this.avalonSetter) {
                    this.avalonSetter()
                }
        }
        var inputProto = HTMLInputElement.prototype
        Object.getOwnPropertyNames(inputProto) //故意引发IE6-8等浏览器报错
        setters["INPUT"] = Object.getOwnPropertyDescriptor(aproto, "value").set
    
        Object.defineProperty(aproto, "value", {
            set: newSetter
        })
        setters["TEXTAREA"] = Object.getOwnPropertyDescriptor(bproto, "value").set
        Object.defineProperty(bproto, "value", {
            set: newSetter
        })
    } catch (e) {
        //在chrome 43中 ms-duplex终于不需要使用定时器实现双向绑定了
        // http://updates.html5rocks.com/2015/04/DOM-attributes-now-on-the-prototype
        // https://docs.google.com/document/d/1jwA8mtClwxI-QJuHT7872Z0pxpZz8PBkf2bGAbsUtqs/edit?pli=1
        watchValueInTimer = avalon.tick
    }
} // jshint ignore:line
//处理radio, checkbox, text, textarea, password
duplexBinding.INPUT = function(element, evaluator, data) {
    var $type = element.type,
        bound = data.bound,
        $elem = avalon(element),
        composing = false

        function callback(value) {
            data.changed.call(this, value, data)
        }

        function compositionStart() {
            composing = true
        }

        function compositionEnd() {
            composing = false
        }
        //当value变化时改变model的值

    var updateVModel = function() {
        var val = element.value //防止递归调用形成死循环
        if (composing || val === element.oldValue) //处理中文输入法在minlengh下引发的BUG
            return
        var lastValue = data.pipe(val, data, "get")
        if ($elem.data("duplexObserve") !== false) {
            evaluator(lastValue)
            callback.call(element, lastValue)
        }
    }
    //当model变化时,它就会改变value的值
    data.handler = function() {
        var val = data.pipe(evaluator(), data, "set") + ""
        if (val !== element.oldValue) {
            element.value = element.oldValue = val
        }
    }
    if (data.isChecked || $type === "radio") {
        updateVModel = function() {
            if ($elem.data("duplexObserve") !== false) {
                var lastValue = data.pipe(element.value, data, "get")
                evaluator(lastValue)
                callback.call(element, lastValue)
            }
        }
        data.handler = function() {
            var val = evaluator()
            var checked = data.isChecked ? !! val : val + "" === element.value
            element.checked = element.oldValue = checked
        }
        bound("click", updateVModel)
    } else if ($type === "checkbox") {
        updateVModel = function() {
            if ($elem.data("duplexObserve") !== false) {
                var method = element.checked ? "ensure" : "remove"
                var array = evaluator()
                if (!Array.isArray(array)) {
                    log("ms-duplex应用于checkbox上要对应一个数组")
                    array = [array]
                }
                avalon.Array[method](array, data.pipe(element.value, data, "get"))
                callback.call(element, array)
            }
        }
        data.handler = function() {
            var array = [].concat(evaluator()) //强制转换为数组
            element.checked = array.indexOf(data.pipe(element.value, data, "get")) > -1
        }
        bound("change", updateVModel)
    } else {
        var events = element.getAttribute("data-duplex-event") || "input"
        if (element.attributes["data-event"]) {
            log("data-event指令已经废弃，请改用data-duplex-event")
        }
        events.replace(rword, function(name) {
            switch (name) {
                case "input":
                    bound("input", updateVModel)
                    bound("DOMAutoComplete", updateVModel)
                    if (!IEVersion) {
                        bound("compositionstart", compositionStart)
                        bound("compositionend", compositionEnd)
                    }
                    break
                default:
                    bound(name, updateVModel)
                    break
            }
        })
        bound("focus", function() {
            element.msFocus = true
        })
        bound("blur", function() {
            element.msFocus = false
        })
        if (rmsinput.test($type)) {
            watchValueInTimer(function() {
                if (root.contains(element)) {
                    if (!element.msFocus && element.oldValue !== element.value) {
                        updateVModel()
                    }
                } else if (!element.msRetain) {
                    return false
                }
            })
        }

        element.avalonSetter = updateVModel
    }

    element.oldValue = element.value
    avalon.injectBinding(data)
    callback.call(element, element.value)
}
duplexBinding.TEXTAREA = duplexBinding.INPUT
duplexBinding.SELECT = function(element, evaluator, data) {
    var $elem = avalon(element)

        function updateVModel() {
            if ($elem.data("duplexObserve") !== false) {
                var val = $elem.val() //字符串或字符串数组
                if (Array.isArray(val)) {
                    val = val.map(function(v) {
                        return data.pipe(v, data, "get")
                    })
                } else {
                    val = data.pipe(val, data, "get")
                }
                if (val + "" !== element.oldValue) {
                    evaluator(val)
                }
                data.changed.call(element, val, data)
            }
        }
    data.handler = function() {
        var val = evaluator()
        val = val && val.$model || val
        if (Array.isArray(val)) {
            if (!element.multiple) {
                log("ms-duplex在<select multiple=true>上要求对应一个数组")
            }
        } else {
            if (element.multiple) {
                log("ms-duplex在<select multiple=false>不能对应一个数组")
            }
        }
        //必须变成字符串后才能比较
        val = Array.isArray(val) ? val.map(String) : val + ""
        if (val + "" !== element.oldValue) {
            $elem.val(val)
            element.oldValue = val + ""
        }
    }
    data.bound("change", updateVModel)
    element.msCallback = function() {
        avalon.injectBinding(data)
        data.changed.call(element, evaluator(), data)
    }
}
// bindingHandlers.html 定义在if.js
bindingExecutors.html = function (val, elem, data) {
    var isHtmlFilter = elem.nodeType !== 1
    var parent = isHtmlFilter ? elem.parentNode : elem
    if (!parent)
        return
    val = val == null ? "" : val
    if (data.oldText !== val) {
        data.oldText = val
    } else {
        return
    }
    if (elem.nodeType === 3) {
        var signature = generateID("html")
        parent.insertBefore(DOC.createComment(signature), elem)
        data.element = DOC.createComment(signature + ":end")
        parent.replaceChild(data.element, elem)
        elem = data.element
    }
    if (typeof val !== "object") {//string, number, boolean
        var fragment = avalon.parseHTML(String(val))
    } else if (val.nodeType === 11) { //将val转换为文档碎片
        fragment = val
    } else if (val.nodeType === 1 || val.item) {
        var nodes = val.nodeType === 1 ? val.childNodes : val.item
        fragment = avalonFragment.cloneNode(true)
        while (nodes[0]) {
            fragment.appendChild(nodes[0])
        }
    }

    nodes = avalon.slice(fragment.childNodes)
    //插入占位符, 如果是过滤器,需要有节制地移除指定的数量,如果是html指令,直接清空
    if (isHtmlFilter) {
        var endValue = elem.nodeValue.slice(0, -4)
        while (true) {
            var node = elem.previousSibling
            if (!node || node.nodeType === 8 && node.nodeValue === endValue) {
                break
            } else {
                parent.removeChild(node)
            }
        }
        parent.insertBefore(fragment, elem)
    } else {
        avalon.clearHTML(elem).appendChild(fragment)
    }
    scanNodeArray(nodes, data.vmodels)
}
bindingHandlers["if"] =
    bindingHandlers.data =
    bindingHandlers.text =
    bindingHandlers.html =
    function(data, vmodels) {
        parseExprProxy(data.value, vmodels, data)
}

bindingExecutors["if"] = function(val, elem, data) {
     try {
         if(!elem.parentNode) return
     } catch(e) {return}
    if (val) { //插回DOM树
        if (elem.nodeType === 8) {
            elem.parentNode.replaceChild(data.template, elem)
            elem.ifRemove = null
         //   animate.enter(data.template, elem.parentNode)
            elem = data.element = data.template //这时可能为null
        }
        if (elem.getAttribute(data.name)) {
            elem.removeAttribute(data.name)
            scanAttr(elem, data.vmodels)
        }
        data.rollback = null
    } else { //移出DOM树，并用注释节点占据原位置
        if (elem.nodeType === 1) {
            var node = data.element = DOC.createComment("ms-if")
            elem.parentNode.replaceChild(node, elem)
            elem.ifRemove = node
       //     animate.leave(elem, node.parentNode, node)
            data.template = elem //元素节点
            ifGroup.appendChild(elem)
            data.rollback = function() {
                if (elem.parentNode === ifGroup) {
                    ifGroup.removeChild(elem)
                }
            }
        }
    }
}
//ms-important绑定已经在scanTag 方法中实现
//ms-include绑定已由ms-attr绑定实现

var rdash = /\(([^)]*)\)/
bindingHandlers.on = function(data, vmodels) {
    var value = data.value
    data.type = "on"
    var eventType = data.param.replace(/-\d+$/, "") // ms-on-mousemove-10
    if (typeof bindingHandlers.on[eventType + "Hook"] === "function") {
        bindingHandlers.on[eventType + "Hook"](data)
    }
    if (value.indexOf("(") > 0 && value.indexOf(")") > -1) {
        var matched = (value.match(rdash) || ["", ""])[1].trim()
        if (matched === "" || matched === "$event") { // aaa() aaa($event)当成aaa处理
            value = value.replace(rdash, "")
        }
    }
    parseExprProxy(value, vmodels, data)
}

bindingExecutors.on = function(callback, elem, data) {
    callback = function(e) {
        var fn = data.evaluator || noop
        return fn.apply(this, data.args.concat(e))
    }
    var eventType = data.param.replace(/-\d+$/, "") // ms-on-mousemove-10
    if (eventType === "scan") {
        callback.call(elem, {
            type: eventType
        })
    } else if (typeof data.specialBind === "function") {
        data.specialBind(elem, callback)
    } else {
        var removeFn = avalon.bind(elem, eventType, callback)
    }
    data.rollback = function() {
        if (typeof data.specialUnbind === "function") {
            data.specialUnbind()
        } else {
            avalon.unbind(elem, eventType, removeFn)
        }
    }
}
bindingHandlers.repeat = function (data, vmodels) {
    var type = data.type
    parseExprProxy(data.value, vmodels, data, 1)
    data.proxies = []
    var freturn = false
    try {
        var $repeat = data.$repeat = data.evaluator.apply(0, data.args || [])
        var xtype = avalon.type($repeat)
        if (xtype !== "object" && xtype !== "array") {
            freturn = true
            avalon.log("warning:" + data.value + "只能是对象或数组")
        } else {
            data.xtype = xtype
        }
    } catch (e) {
        freturn = true
    }
    var arr = data.value.split(".") || []
    if (arr.length > 1) {
        arr.pop()
        var n = arr[0]
        for (var i = 0, v; v = vmodels[i++]; ) {
            if (v && v.hasOwnProperty(n)) {
                var events = v[n].$events || {}
                events[subscribers] = events[subscribers] || []
                events[subscribers].push(data)
                break
            }
        }
    }

    var elem = data.element
    if (elem.nodeType === 1) {
        elem.removeAttribute(data.name)
        data.sortedCallback = getBindingCallback(elem, "data-with-sorted", vmodels)
        data.renderedCallback = getBindingCallback(elem, "data-" + type + "-rendered", vmodels)
        var signature = generateID(type)
        var start = DOC.createComment(signature)
        var end = DOC.createComment(signature + ":end")
        data.signature = signature
        data.template = avalonFragment.cloneNode(false)
        if (type === "repeat") {
            var parent = elem.parentNode
            parent.replaceChild(end, elem)
            parent.insertBefore(start, end)
            data.template.appendChild(elem)
        } else {
            while (elem.firstChild) {
                data.template.appendChild(elem.firstChild)
            }
            elem.appendChild(start)
            elem.appendChild(end)
        }
        data.element = end
        data.handler = bindingExecutors.repeat
        data.rollback = function () {
            var elem = data.element
            if (!elem)
                return
            data.handler("clear")
        }
    }

    if (freturn) {
        return
    }

    data.$outer = {}
    var check0 = "$key"
    var check1 = "$val"
    if (Array.isArray($repeat)) {
        check0 = "$first"
        check1 = "$last"
    }

    for (i = 0; v = vmodels[i++]; ) {
        if (v.hasOwnProperty(check0) && v.hasOwnProperty(check1)) {
            data.$outer = v
            break
        }
    }
    var $events = $repeat.$events
    var $list = ($events || {})[subscribers]
    injectDependency($list, data)
    if (xtype === "object") {
        data.handler("append")
    } else if ($repeat.length) {
        data.handler("add", 0, $repeat.length)
    }
}

bindingExecutors.repeat = function (method, pos, el) {
    var data = this
    if (!method && data.xtype) {
        var old = data.$repeat
        var neo = data.evaluator.apply(0, data.args || [])

        if (data.xtype === "array") {
            if (old.length === neo.length) {
                return
            }
            method = "add"
            pos = 0
            data.$repeat = neo
            el = neo.length
        } else {
            if (keysVM(old).join(";;") === keysVM(neo).join(";;")) {
                return
            }
            method = "append"
            data.$repeat = neo
        }
    }
    if (method) {
        var start, fragment
        var end = data.element
        var comments = getComments(data)
        var parent = end.parentNode
        var proxies = data.proxies
        var transation = avalonFragment.cloneNode(false)
        switch (method) {
            case "add": //在pos位置后添加el数组（pos为插入位置,el为要插入的个数）
                var n = pos + el
                var fragments = []
                for (var i = pos; i < n; i++) {
                    var proxy = eachProxyAgent(i, data)
                    proxies.splice(i, 0, proxy)
                    shimController(data, transation, proxy, fragments)
                }
                parent.insertBefore(transation, comments[pos] || end)
                for (i = 0; fragment = fragments[i++]; ) {
                    scanNodeArray(fragment.nodes, fragment.vmodels)
                    fragment.nodes = fragment.vmodels = null
                }

                break
            case "del": //将pos后的el个元素删掉(pos, el都是数字)
                sweepNodes(comments[pos], comments[pos + el] || end)
                var removed = proxies.splice(pos, el)
                recycleProxies(removed, "each")
                break
            case "clear":
                start = comments[0]
                if (start) {
                    sweepNodes(start, end)
                    if (data.xtype === "object") {
                        parent.insertBefore(start, end)
                    }else{
                        recycleProxies(proxies, "each")
                    }
                }
                break
            case "move":
                start = comments[0]
                if (start) {
                    var signature = start.nodeValue
                    var rooms = []
                    var room = [],
                            node
                    sweepNodes(start, end, function () {
                        room.unshift(this)
                        if (this.nodeValue === signature) {
                            rooms.unshift(room)
                            room = []
                        }
                    })
                    sortByIndex(rooms, pos)
                    sortByIndex(proxies, pos)
                    while (room = rooms.shift()) {
                        while (node = room.shift()) {
                            transation.appendChild(node)
                        }
                    }
                    parent.insertBefore(transation, end)
                }
                break
            case "index": //将proxies中的第pos个起的所有元素重新索引
                var last = proxies.length - 1
                for (; el = proxies[pos]; pos++) {
                    el.$index = pos
                    el.$first = pos === 0
                    el.$last = pos === last
                }
                return
            case "set": //将proxies中的第pos个元素的VM设置为el（pos为数字，el任意）
                proxy = proxies[pos]
                if (proxy) {
                    fireDependencies(proxy.$events[data.param || "el"])
                }
                break
            case "append":
                var object = data.$repeat //原来第2参数， 被循环对象
                var pool = Array.isArray(proxies) ||!proxies ?  {}: proxies   //代理对象组成的hash
                data.proxies = pool
                var keys = []
                fragments = []
                for (var key in pool) {
                    if (!object.hasOwnProperty(key)) {
                        proxyRecycler(pool[key], withProxyPool) //去掉之前的代理VM
                        delete(pool[key])
                    }
                }
                for (key in object) { //得到所有键名
                    if (object.hasOwnProperty(key) && key !== "hasOwnProperty") {
                        keys.push(key)
                    }
                }
                if (data.sortedCallback) { //如果有回调，则让它们排序
                    var keys2 = data.sortedCallback.call(parent, keys)
                    if (keys2 && Array.isArray(keys2) && keys2.length) {
                        keys = keys2
                    }
                }
                for (i = 0; key = keys[i++]; ) {
                    if (key !== "hasOwnProperty") {
                        pool[key] = withProxyAgent(pool[key], key, data)
                        shimController(data, transation, pool[key], fragments)
                    }
                }

                parent.insertBefore(transation, end)
                for (i = 0; fragment = fragments[i++]; ) {
                    scanNodeArray(fragment.nodes, fragment.vmodels)
                    fragment.nodes = fragment.vmodels = null
                }
                break
        }
        if (!data.$repeat || data.$repeat.hasOwnProperty("$lock")) //IE6-8 VBScript对象会报错, 有时候data.$repeat不存在
            return
        if (method === "clear")
            method = "del"
        var callback = data.renderedCallback || noop,
                args = arguments
        if (parent.oldValue && parent.tagName === "SELECT") { //fix #503
            avalon(parent).val(parent.oldValue.split(","))
        }
        callback.apply(parent, args)
    }
}
"with,each".replace(rword, function (name) {
    bindingHandlers[name] = bindingHandlers.repeat
})

function shimController(data, transation, proxy, fragments) {
    var content = data.template.cloneNode(true)
    var nodes = avalon.slice(content.childNodes)
    content.insertBefore(DOC.createComment(data.signature), content.firstChild)
    transation.appendChild(content)
    var nv = [proxy].concat(data.vmodels)
    var fragment = {
        nodes: nodes,
        vmodels: nv
    }
    fragments.push(fragment)
}

function getComments(data) {
    var ret = []
    var nodes = data.element.parentNode.childNodes
    for (var i = 0, node; node = nodes[i++]; ) {
        if (node.nodeValue === data.signature) {
            ret.push(node)
        } else if (node.nodeValue === data.signature + ":end") {
            break
        }
    }
    return ret
}


//移除掉start与end之间的节点(保留end)
function sweepNodes(start, end, callback) {
    while (true) {
        var node = end.previousSibling
        if (!node)
            break
        node.parentNode.removeChild(node)
        callback && callback.call(node)
        if (node === start) {
            break
        }
    }
}

// 为ms-each,ms-with, ms-repeat会创建一个代理VM，
// 通过它们保持一个下上文，让用户能调用$index,$first,$last,$remove,$key,$val,$outer等属性与方法
// 所有代理VM的产生,消费,收集,存放通过xxxProxyFactory,xxxProxyAgent, recycleProxies,xxxProxyPool实现
var withProxyPool = []
function withProxyFactory() {
    var proxy = modelFactory({
        $key: "",
        $outer: {},
        $host: {},
        $val: {
            get: function () {
                return this.$host[this.$key]
            },
            set: function (val) {
                this.$host[this.$key] = val
            }
        }
    }, {
        $val: 1
    })
    proxy.$id = generateID("$proxy$with")
    return proxy
}

function withProxyAgent(proxy, key, data) {
    proxy = proxy || withProxyPool.pop()
    if (!proxy) {
        proxy = withProxyFactory()
    } else {
        proxy.$reinitialize()
    }
    var host = data.$repeat
    proxy.$key = key

    proxy.$host = host
    proxy.$outer = data.$outer
    if (host.$events) {
        proxy.$events.$val = host.$events[key]
    } else {
        proxy.$events = {}
    }
    return proxy
}


function  recycleProxies(proxies) {
    eachProxyRecycler(proxies)
}
function eachProxyRecycler(proxies) {
    proxies.forEach(function (proxy) {
        proxyRecycler(proxy, eachProxyPool)
    })
    proxies.length = 0
}


var eachProxyPool = []
function eachProxyFactory(name) {
    var source = {
        $host: [],
        $outer: {},
        $index: 0,
        $first: false,
        $last: false,
        $remove: avalon.noop
    }
    source[name] = {
        get: function () {
            var e = this.$events
            var array = e.$index
            e.$index = e[name] //#817 通过$index为el收集依赖
            try {
                return this.$host[this.$index]
            } finally {
                e.$index = array
            }
        },
        set: function (val) {
            try {
                var e = this.$events
                var array = e.$index
                e.$index = []
                this.$host.set(this.$index, val)
            } finally {
                e.$index = array
            }
        }
    }
    var second = {
        $last: 1,
        $first: 1,
        $index: 1
    }
    var proxy = modelFactory(source, second)
    proxy.$id = generateID("$proxy$each")
    return proxy
}

function eachProxyAgent(index, data) {
    var param = data.param || "el",
            proxy
    for (var i = 0, n = eachProxyPool.length; i < n; i++) {
        var candidate = eachProxyPool[i]
        if (candidate && candidate.hasOwnProperty(param)) {
            proxy = candidate
            eachProxyPool.splice(i, 1)
        }
    }
    if (!proxy) {
        proxy = eachProxyFactory(param)
    }
    var host = data.$repeat
    var last = host.length - 1
    proxy.$index = index
    proxy.$first = index === 0
    proxy.$last = index === last
    proxy.$host = host
    proxy.$outer = data.$outer
    proxy.$remove = function () {
        return host.removeAt(proxy.$index)
    }
    return proxy
}


function proxyRecycler(proxy, proxyPool) {
    for (var i in proxy.$events) {
        var arr = proxy.$events[i]
        if (Array.isArray(arr)) {
            arr.forEach(function (data) {
                if (typeof data === "object")
                    disposeData(data)
            })// jshint ignore:line
            arr.length = 0
        }
    }
    proxy.$host = proxy.$outer = {}
    if (proxyPool.unshift(proxy) > kernel.maxRepeatSize) {
        proxyPool.pop()
    }
}

/*********************************************************************
 *                         各种指令                                  *
 **********************************************************************/
//ms-skip绑定已经在scanTag 方法中实现
// bindingHandlers.text 定义在if.js
bindingExecutors.text = function(val, elem) {
	val = val == null ? "" : val //不在页面上显示undefined null
	if (elem.nodeType === 3) { //绑定在文本节点上
		try { //IE对游离于DOM树外的节点赋值会报错
			elem.data = val
		} catch (e) {}
	} else { //绑定在特性节点上
		elem.textContent = val
	}
}
function parseDisplay(nodeName, val) {
    //用于取得此类标签的默认display值
    var key = "_" + nodeName
    if (!parseDisplay[key]) {
        var node = DOC.createElement(nodeName)
        root.appendChild(node)
        if (W3C) {
            val = getComputedStyle(node, null).display
        } else {
            val = node.currentStyle.display
        }
        root.removeChild(node)
        parseDisplay[key] = val
    }
    return parseDisplay[key]
}

avalon.parseDisplay = parseDisplay

bindingHandlers.visible = function (data, vmodels) {
    parseExprProxy(data.value, vmodels, data)
}

bindingExecutors.visible = function (val, elem, binding) {
    if (val) {
        elem.style.display = binding.display || ""
        if (avalon(elem).css("display") === "none") {
            elem.style.display = binding.display = parseDisplay(elem.nodeName)
        }
    } else {
        elem.style.display = "none"
    }
}
bindingHandlers.widget = function(data, vmodels) {
    var args = data.value.match(rword)
    var elem = data.element
    var widget = args[0]
    var id = args[1]
    if (!id || id === "$") { //没有定义或为$时，取组件名+随机数
        id = generateID(widget)
    }
    var optName = args[2] || widget //没有定义，取组件名
    var constructor = avalon.ui[widget]
    if (typeof constructor === "function") { //ms-widget="tabs,tabsAAA,optname"
        vmodels = elem.vmodels || vmodels
        for (var i = 0, v; v = vmodels[i++];) {
            if (v.hasOwnProperty(optName) && typeof v[optName] === "object") {
                var vmOptions = v[optName]
                vmOptions = vmOptions.$model || vmOptions
                break
            }
        }
        if (vmOptions) {
            var wid = vmOptions[widget + "Id"]
            if (typeof wid === "string") {
                log("warning!不再支持" + widget + "Id")
                id = wid
            }
        }
        //抽取data-tooltip-text、data-tooltip-attr属性，组成一个配置对象
        var widgetData = avalon.getWidgetData(elem, widget)
        data.value = [widget, id, optName].join(",")
        data[widget + "Id"] = id
        data.evaluator = noop
        elem.msData["ms-widget-id"] = id
        var options = data[widget + "Options"] = avalon.mix({}, constructor.defaults, vmOptions || {}, widgetData)
        elem.removeAttribute("ms-widget")
        var vmodel = constructor(elem, data, vmodels) || {} //防止组件不返回VM
        if (vmodel.$id) {
            avalon.vmodels[id] = vmodel
            createSignalTower(elem, vmodel)
            try {
                vmodel.$init(function() {
                    avalon.scan(elem, [vmodel].concat(vmodels))
                    if (typeof options.onInit === "function") {
                        options.onInit.call(elem, vmodel, options, vmodels)
                    }
                })
            } catch (e) {}
            data.rollback = function() {
                try {
                    vmodel.$remove()
                    vmodel.widgetElement = null // 放到$remove后边
                } catch (e) {}
                elem.msData = {}
                delete avalon.vmodels[vmodel.$id]
            }
            injectDisposeQueue(data, widgetList)
            if (window.chrome) {
                elem.addEventListener("DOMNodeRemovedFromDocument", function() {
                    setTimeout(rejectDisposeQueue)
                })
            }
        } else {
            avalon.scan(elem, vmodels)
        }
    } else if (vmodels.length) { //如果该组件还没有加载，那么保存当前的vmodels
        elem.vmodels = vmodels
    }
}
var widgetList = []
//不存在 bindingExecutors.widget
/*********************************************************************
 *                             自带过滤器                            *
 **********************************************************************/
var rscripts = /<script[^>]*>([\S\s]*?)<\/script\s*>/gim
var ron = /\s+(on[^=\s]+)(?:=("[^"]*"|'[^']*'|[^\s>]+))?/g
var ropen = /<\w+\b(?:(["'])[^"]*?(\1)|[^>])*>/ig
var rsanitize = {
    a: /\b(href)\=("javascript[^"]*"|'javascript[^']*')/ig,
    img: /\b(src)\=("javascript[^"]*"|'javascript[^']*')/ig,
    form: /\b(action)\=("javascript[^"]*"|'javascript[^']*')/ig
}
var rsurrogate = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g
var rnoalphanumeric = /([^\#-~| |!])/g;

function numberFormat(number, decimals, point, thousands) {
    //form http://phpjs.org/functions/number_format/
    //number	必需，要格式化的数字
    //decimals	可选，规定多少个小数位。
    //point	可选，规定用作小数点的字符串（默认为 . ）。
    //thousands	可选，规定用作千位分隔符的字符串（默认为 , ），如果设置了该参数，那么所有其他参数都是必需的。
    number = (number + '')
            .replace(/[^0-9+\-Ee.]/g, '')
    var n = !isFinite(+number) ? 0 : +number,
            prec = !isFinite(+decimals) ? 3 : Math.abs(decimals),
            sep = thousands || ",",
            dec = point || ".",
            s = '',
            toFixedFix = function(n, prec) {
                var k = Math.pow(10, prec)
                return '' + (Math.round(n * k) / k)
                        .toFixed(prec)
            }
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n))
            .split('.')
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep)
    }
    if ((s[1] || '')
            .length < prec) {
        s[1] = s[1] || ''
        s[1] += new Array(prec - s[1].length + 1)
                .join('0')
    }
    return s.join(dec)
}


var filters = avalon.filters = {
    uppercase: function(str) {
        return str.toUpperCase()
    },
    lowercase: function(str) {
        return str.toLowerCase()
    },
    truncate: function(str, length, truncation) {
        //length，新字符串长度，truncation，新字符串的结尾的字段,返回新字符串
        length = length || 30
        truncation = typeof truncation === "string" ?  truncation : "..." 
        return str.length > length ? str.slice(0, length - truncation.length) + truncation : String(str)
    },
    $filter: function(val) {
        for (var i = 1, n = arguments.length; i < n; i++) {
            var array = arguments[i]
            var fn = avalon.filters[array.shift()]
            if (typeof fn === "function") {
                var arr = [val].concat(array)
                val = fn.apply(null, arr)
            }
        }
        return val
    },
    camelize: camelize,
    //https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    //    <a href="javasc&NewLine;ript&colon;alert('XSS')">chrome</a> 
    //    <a href="data:text/html;base64, PGltZyBzcmM9eCBvbmVycm9yPWFsZXJ0KDEpPg==">chrome</a>
    //    <a href="jav	ascript:alert('XSS');">IE67chrome</a>
    //    <a href="jav&#x09;ascript:alert('XSS');">IE67chrome</a>
    //    <a href="jav&#x0A;ascript:alert('XSS');">IE67chrome</a>
    sanitize: function(str) {
        return str.replace(rscripts, "").replace(ropen, function(a, b) {
            var match = a.toLowerCase().match(/<(\w+)\s/)
            if (match) { //处理a标签的href属性，img标签的src属性，form标签的action属性
                var reg = rsanitize[match[1]]
                if (reg) {
                    a = a.replace(reg, function(s, name, value) {
                        var quote = value.charAt(0)
                        return name + "=" + quote + "javascript:void(0)" + quote// jshint ignore:line
                    })
                }
            }
            return a.replace(ron, " ").replace(/\s+/g, " ") //移除onXXX事件
        })
    },
    escape: function(str) {
        //将字符串经过 str 转义得到适合在页面中显示的内容, 例如替换 < 为 &lt 
        return String(str).
                replace(/&/g, '&amp;').
                replace(rsurrogate, function(value) {
                    var hi = value.charCodeAt(0)
                    var low = value.charCodeAt(1)
                    return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';'
                }).
                replace(rnoalphanumeric, function(value) {
                    return '&#' + value.charCodeAt(0) + ';'
                }).
                replace(/</g, '&lt;').
                replace(/>/g, '&gt;')
    },
    currency: function(amount, symbol, fractionSize) {
        return (symbol || "\uFFE5") + numberFormat(amount, isFinite(fractionSize) ? fractionSize : 2)
    },
    number: numberFormat
}
/*
 'yyyy': 4 digit representation of year (e.g. AD 1 => 0001, AD 2010 => 2010)
 'yy': 2 digit representation of year, padded (00-99). (e.g. AD 2001 => 01, AD 2010 => 10)
 'y': 1 digit representation of year, e.g. (AD 1 => 1, AD 199 => 199)
 'MMMM': Month in year (January-December)
 'MMM': Month in year (Jan-Dec)
 'MM': Month in year, padded (01-12)
 'M': Month in year (1-12)
 'dd': Day in month, padded (01-31)
 'd': Day in month (1-31)
 'EEEE': Day in Week,(Sunday-Saturday)
 'EEE': Day in Week, (Sun-Sat)
 'HH': Hour in day, padded (00-23)
 'H': Hour in day (0-23)
 'hh': Hour in am/pm, padded (01-12)
 'h': Hour in am/pm, (1-12)
 'mm': Minute in hour, padded (00-59)
 'm': Minute in hour (0-59)
 'ss': Second in minute, padded (00-59)
 's': Second in minute (0-59)
 'a': am/pm marker
 'Z': 4 digit (+sign) representation of the timezone offset (-1200-+1200)
 format string can also be one of the following predefined localizable formats:
 
 'medium': equivalent to 'MMM d, y h:mm:ss a' for en_US locale (e.g. Sep 3, 2010 12:05:08 pm)
 'short': equivalent to 'M/d/yy h:mm a' for en_US locale (e.g. 9/3/10 12:05 pm)
 'fullDate': equivalent to 'EEEE, MMMM d,y' for en_US locale (e.g. Friday, September 3, 2010)
 'longDate': equivalent to 'MMMM d, y' for en_US locale (e.g. September 3, 2010
 'mediumDate': equivalent to 'MMM d, y' for en_US locale (e.g. Sep 3, 2010)
 'shortDate': equivalent to 'M/d/yy' for en_US locale (e.g. 9/3/10)
 'mediumTime': equivalent to 'h:mm:ss a' for en_US locale (e.g. 12:05:08 pm)
 'shortTime': equivalent to 'h:mm a' for en_US locale (e.g. 12:05 pm)
 */
new function() {// jshint ignore:line
    function toInt(str) {
        return parseInt(str, 10) || 0
    }

    function padNumber(num, digits, trim) {
        var neg = ""
        if (num < 0) {
            neg = '-'
            num = -num
        }
        num = "" + num
        while (num.length < digits)
            num = "0" + num
        if (trim)
            num = num.substr(num.length - digits)
        return neg + num
    }

    function dateGetter(name, size, offset, trim) {
        return function(date) {
            var value = date["get" + name]()
            if (offset > 0 || value > -offset)
                value += offset
            if (value === 0 && offset === -12) {
                value = 12
            }
            return padNumber(value, size, trim)
        }
    }

    function dateStrGetter(name, shortForm) {
        return function(date, formats) {
            var value = date["get" + name]()
            var get = (shortForm ? ("SHORT" + name) : name).toUpperCase()
            return formats[get][value]
        }
    }

    function timeZoneGetter(date) {
        var zone = -1 * date.getTimezoneOffset()
        var paddedZone = (zone >= 0) ? "+" : ""
        paddedZone += padNumber(Math[zone > 0 ? "floor" : "ceil"](zone / 60), 2) + padNumber(Math.abs(zone % 60), 2)
        return paddedZone
    }
    //取得上午下午

    function ampmGetter(date, formats) {
        return date.getHours() < 12 ? formats.AMPMS[0] : formats.AMPMS[1]
    }
    var DATE_FORMATS = {
        yyyy: dateGetter("FullYear", 4),
        yy: dateGetter("FullYear", 2, 0, true),
        y: dateGetter("FullYear", 1),
        MMMM: dateStrGetter("Month"),
        MMM: dateStrGetter("Month", true),
        MM: dateGetter("Month", 2, 1),
        M: dateGetter("Month", 1, 1),
        dd: dateGetter("Date", 2),
        d: dateGetter("Date", 1),
        HH: dateGetter("Hours", 2),
        H: dateGetter("Hours", 1),
        hh: dateGetter("Hours", 2, -12),
        h: dateGetter("Hours", 1, -12),
        mm: dateGetter("Minutes", 2),
        m: dateGetter("Minutes", 1),
        ss: dateGetter("Seconds", 2),
        s: dateGetter("Seconds", 1),
        sss: dateGetter("Milliseconds", 3),
        EEEE: dateStrGetter("Day"),
        EEE: dateStrGetter("Day", true),
        a: ampmGetter,
        Z: timeZoneGetter
    }
    var rdateFormat = /((?:[^yMdHhmsaZE']+)|(?:'(?:[^']|'')*')|(?:E+|y+|M+|d+|H+|h+|m+|s+|a|Z))(.*)/
    var raspnetjson = /^\/Date\((\d+)\)\/$/
    filters.date = function(date, format) {
        var locate = filters.date.locate,
                text = "",
                parts = [],
                fn, match
        format = format || "mediumDate"
        format = locate[format] || format
        if (typeof date === "string") {
            if (/^\d+$/.test(date)) {
                date = toInt(date)
            } else if (raspnetjson.test(date)) {
                date = +RegExp.$1
            } else {
                var trimDate = date.trim()
                var dateArray = [0, 0, 0, 0, 0, 0, 0]
                var oDate = new Date(0)
                //取得年月日
                trimDate = trimDate.replace(/^(\d+)\D(\d+)\D(\d+)/, function(_, a, b, c) {
                    var array = c.length === 4 ? [c, a, b] : [a, b, c]
                    dateArray[0] = toInt(array[0])     //年
                    dateArray[1] = toInt(array[1]) - 1 //月
                    dateArray[2] = toInt(array[2])     //日
                    return ""
                })
                var dateSetter = oDate.setFullYear
                var timeSetter = oDate.setHours
                trimDate = trimDate.replace(/[T\s](\d+):(\d+):?(\d+)?\.?(\d)?/, function(_, a, b, c, d) {
                    dateArray[3] = toInt(a) //小时
                    dateArray[4] = toInt(b) //分钟
                    dateArray[5] = toInt(c) //秒
                    if (d) {                //毫秒
                        dateArray[6] = Math.round(parseFloat("0." + d) * 1000)
                    }
                    return ""
                })
                var tzHour = 0
                var tzMin = 0
                trimDate = trimDate.replace(/Z|([+-])(\d\d):?(\d\d)/, function(z, symbol, c, d) {
                    dateSetter = oDate.setUTCFullYear
                    timeSetter = oDate.setUTCHours
                    if (symbol) {
                        tzHour = toInt(symbol + c)
                        tzMin = toInt(symbol + d)
                    }
                    return ""
                })

                dateArray[3] -= tzHour
                dateArray[4] -= tzMin
                dateSetter.apply(oDate, dateArray.slice(0, 3))
                timeSetter.apply(oDate, dateArray.slice(3))
                date = oDate
            }
        }
        if (typeof date === "number") {
            date = new Date(date)
        }
        if (avalon.type(date) !== "date") {
            return
        }
        while (format) {
            match = rdateFormat.exec(format)
            if (match) {
                parts = parts.concat(match.slice(1))
                format = parts.pop()
            } else {
                parts.push(format)
                format = null
            }
        }
        parts.forEach(function(value) {
            fn = DATE_FORMATS[value]
            text += fn ? fn(date, locate) : value.replace(/(^'|'$)/g, "").replace(/''/g, "'")
        })
        return text
    }
    var locate = {
        AMPMS: {
            0: "上午",
            1: "下午"
        },
        DAY: {
            0: "星期日",
            1: "星期一",
            2: "星期二",
            3: "星期三",
            4: "星期四",
            5: "星期五",
            6: "星期六"
        },
        MONTH: {
            0: "1月",
            1: "2月",
            2: "3月",
            3: "4月",
            4: "5月",
            5: "6月",
            6: "7月",
            7: "8月",
            8: "9月",
            9: "10月",
            10: "11月",
            11: "12月"
        },
        SHORTDAY: {
            "0": "周日",
            "1": "周一",
            "2": "周二",
            "3": "周三",
            "4": "周四",
            "5": "周五",
            "6": "周六"
        },
        fullDate: "y年M月d日EEEE",
        longDate: "y年M月d日",
        medium: "yyyy-M-d H:mm:ss",
        mediumDate: "yyyy-M-d",
        mediumTime: "H:mm:ss",
        "short": "yy-M-d ah:mm",
        shortDate: "yy-M-d",
        shortTime: "ah:mm"
    }
    locate.SHORTMONTH = locate.MONTH
    filters.date.locate = locate
}// jshint ignore:line
/*********************************************************************
 *                     END                                  *
 **********************************************************************/
new function () {
    avalon.config({
        loader: false
    })
    var fns = [], loaded = DOC.readyState === "complete", fn
    function flush(f) {
        loaded = 1
        while (f = fns.shift())
            f()
    }

    avalon.bind(DOC, "DOMContentLoaded", fn = function () {
        avalon.unbind(DOC, "DOMContentLoaded", fn)
        flush()
    })

    var id = setInterval(function () {
        if (document.readyState === "complete" && document.body) {
            clearInterval(id)
            flush()
        }
    }, 50)

    avalon.ready = function (fn) {
        loaded ? fn(avalon) : fns.push(fn)
    }
    avalon.ready(function () {
        avalon.scan(DOC.body)
    })
}


// Register as a named AMD module, since avalon can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase avalon is used because AMD module names are
// derived from file names, and Avalon is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of avalon, it will work.

// Note that for maximum portability, libraries that are not avalon should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. avalon is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon
    if (typeof define === "function" && define.amd) {
        define("avalon", [], function() {
            return avalon
        })
    }
// Map over avalon in case of overwrite
    var _avalon = window.avalon
    avalon.noConflict = function(deep) {
        if (deep && window.avalon === avalon) {
            window.avalon = _avalon
        }
        return avalon
    }
// Expose avalon identifiers, even in AMD
// and CommonJS for browser emulators
    if (noGlobal === void 0) {
        window.avalon = avalon
    }
    
    return avalon

}));
/**
 * Framework7 1.2.0
 * Full Featured Mobile HTML Framework For Building iOS & Android Apps
 * 
 * http://www.idangero.us/framework7
 * 
 * Copyright 2015, Vladimir Kharlampidi
 * The iDangero.us
 * http://www.idangero.us/
 * 
 * Licensed under MIT
 * 
 * Released on: July 18, 2015
 */
!function(){"use strict";window.Framework7=function(a){function t(e){var a=e.replace(/^./,function(e){return e.toUpperCase()});i["onPage"+a]=function(a,t){return i.onPage(e,a,t)}}function n(){var e,a=o(this),t=a[0].scrollTop,n=a[0].scrollHeight,r=a[0].offsetHeight,i=a[0].getAttribute("data-distance"),s=a.find(".virtual-list"),l=a.hasClass("infinite-scroll-top");if(i||(i=50),"string"==typeof i&&i.indexOf("%")>=0&&(i=parseInt(i,10)/100*r),i>r&&(i=r),l)i>t&&a.trigger("infinite");else if(t+r>=n-i){if(s.length>0&&(e=s[0].f7VirtualList,e&&!e.reachEnd))return;a.trigger("infinite")}}function r(){i.device.ipad&&(document.body.scrollLeft=0,setTimeout(function(){document.body.scrollLeft=0},0))}var i=this;i.version="1.2.0",i.params={cache:!0,cacheIgnore:[],cacheIgnoreGetParameters:!1,cacheDuration:6e5,preloadPreviousPage:!0,uniqueHistory:!1,uniqueHistoryIgnoreGetParameters:!1,dynamicPageUrl:"content-{{index}}",allowDuplicateUrls:!1,router:!0,pushState:!1,pushStateRoot:void 0,pushStateNoAnimation:!1,pushStateSeparator:"#!/",pushStatePreventOnLoad:!0,fastClicks:!0,fastClicksDistanceThreshold:10,fastClicksDelayBetweenClicks:50,tapHold:!1,tapHoldDelay:750,tapHoldPreventClicks:!0,activeState:!0,activeStateElements:"a, button, label, span",animateNavBackIcon:!1,swipeBackPage:!0,swipeBackPageThreshold:0,swipeBackPageActiveArea:30,swipeBackPageAnimateShadow:!0,swipeBackPageAnimateOpacity:!0,ajaxLinks:void 0,externalLinks:".external",sortable:!0,hideNavbarOnPageScroll:!1,hideToolbarOnPageScroll:!1,hideTabbarOnPageScroll:!1,showBarsOnPageScrollEnd:!0,showBarsOnPageScrollTop:!0,swipeout:!0,swipeoutActionsNoFold:!1,swipeoutNoFollow:!1,smartSelectBackText:"Back",smartSelectInPopup:!1,smartSelectPopupCloseText:"Close",smartSelectSearchbar:!1,smartSelectBackOnSelect:!1,scrollTopOnNavbarClick:!1,scrollTopOnStatusbarClick:!1,swipePanel:!1,swipePanelActiveArea:0,swipePanelCloseOpposite:!0,swipePanelOnlyClose:!1,swipePanelNoFollow:!1,swipePanelThreshold:0,panelsCloseByOutside:!0,modalButtonOk:"OK",modalButtonCancel:"Cancel",modalUsernamePlaceholder:"Username",modalPasswordPlaceholder:"Password",modalTitle:"Framework7",modalCloseByOutside:!1,actionsCloseByOutside:!0,popupCloseByOutside:!0,modalPreloaderTitle:"Loading... ",modalStack:!0,imagesLazyLoadThreshold:0,imagesLazyLoadSequential:!0,viewClass:"view",viewMainClass:"view-main",viewsClass:"views",notificationCloseOnClick:!1,notificationCloseIcon:!0,notificationCloseButtonText:"Close",animatePages:!0,templates:{},template7Data:{},template7Pages:!1,precompileTemplates:!1,material:!1,materialPageLoadDelay:0,materialPreloaderSvg:'<svg xmlns="http://www.w3.org/2000/svg" height="75" width="75" viewbox="0 0 75 75"><circle cx="37.5" cy="37.5" r="33.5" stroke-width="8"/></svg>',materialRipple:!0,materialRippleElements:".ripple, a.link, a.item-link, .button, .modal-button, .tab-link, .label-radio, .label-checkbox, .actions-modal-button, a.searchbar-clear, .floating-button",init:!0};for(var s in a)i.params[s]=a[s];var o=e,l=Template7;i._compiledTemplates={},i.touchEvents={start:i.support.touch?"touchstart":"mousedown",move:i.support.touch?"touchmove":"mousemove",end:i.support.touch?"touchend":"mouseup"},i.ls=window.localStorage,i.rtl="rtl"===o("body").css("direction"),i.rtl&&o("html").attr("dir","rtl"),"undefined"!=typeof i.params.statusbarOverlay&&(i.params.statusbarOverlay?o("html").addClass("with-statusbar-overlay"):o("html").removeClass("with-statusbar-overlay")),i.views=[];var p=function(e,a){var t,n={dynamicNavbar:!1,domCache:!1,linksView:void 0,reloadPages:!1,uniqueHistory:i.params.uniqueHistory,uniqueHistoryIgnoreGetParameters:i.params.uniqueHistoryIgnoreGetParameters,allowDuplicateUrls:i.params.allowDuplicateUrls,swipeBackPage:i.params.swipeBackPage,swipeBackPageAnimateShadow:i.params.swipeBackPageAnimateShadow,swipeBackPageAnimateOpacity:i.params.swipeBackPageAnimateOpacity,swipeBackPageActiveArea:i.params.swipeBackPageActiveArea,swipeBackPageThreshold:i.params.swipeBackPageThreshold,animatePages:i.params.animatePages,preloadPreviousPage:i.params.preloadPreviousPage};a=a||{};for(var r in n)"undefined"==typeof a[r]&&(a[r]=n[r]);var s=this;s.params=a,s.selector=e;var l=o(e);if(s.container=l[0],"string"!=typeof e&&(e=(l.attr("id")?"#"+l.attr("id"):"")+(l.attr("class")?"."+l.attr("class").replace(/ /g,".").replace(".active",""):""),s.selector=e),s.main=l.hasClass(i.params.viewMainClass),s.contentCache={},s.pagesCache={},l[0].f7View=s,s.pagesContainer=l.find(".pages")[0],s.initialPages=[],s.initialNavbars=[],s.params.domCache){var p=l.find(".page");for(t=0;t<p.length;t++)s.initialPages.push(p[t]);if(s.params.dynamicNavbar){var d=l.find(".navbar-inner");for(t=0;t<d.length;t++)s.initialNavbars.push(d[t])}}s.allowPageChange=!0;var c=document.location.href;s.history=[];var u=c,m=i.params.pushStateSeparator,f=i.params.pushStateRoot;i.params.pushState&&s.main&&(f?u=f:u.indexOf(m)>=0&&u.indexOf(m+"#")<0&&(u=u.split(m)[0]));var h,g;s.activePage||(h=o(s.pagesContainer).find(".page-on-center"),0===h.length&&(h=o(s.pagesContainer).find(".page:not(.cached)"),h=h.eq(h.length-1)),h.length>0&&(g=h[0].f7PageData)),s.params.domCache&&h?(s.url=l.attr("data-url")||s.params.url||"#"+h.attr("data-page"),s.pagesCache[s.url]=h.attr("data-page")):s.url=l.attr("data-url")||s.params.url||u,g&&(g.view=s,g.url=s.url,s.activePage=g,h[0].f7PageData=g),s.url&&s.history.push(s.url);var v,b,w,C,y,x,T,k,S,P,M,I=!1,O=!1,E={},L=[],D=[],B=!0,N=[],z=[];if(s.handleTouchStart=function(e){B&&s.params.swipeBackPage&&!I&&!i.swipeoutOpenedEl&&s.allowPageChange&&(O=!1,I=!0,v=void 0,E.x="touchstart"===e.type?e.targetTouches[0].pageX:e.pageX,E.y="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY,C=(new Date).getTime(),S=s.params.dynamicNavbar&&l.find(".navbar-inner").length>1)},s.handleTouchMove=function(e){if(I){var a="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,t="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY;if("undefined"==typeof v&&(v=!!(v||Math.abs(t-E.y)>Math.abs(a-E.x))),v||e.f7PreventSwipeBack||i.preventSwipeBack)return void(I=!1);if(!O){var n=!1;b=l.width();var r=o(e.target),p=r.hasClass("swipeout")?r:r.parents(".swipeout");p.length>0&&(!i.rtl&&p.find(".swipeout-actions-left").length>0&&(n=!0),i.rtl&&p.find(".swipeout-actions-right").length>0&&(n=!0)),L=r.is(".page")?r:r.parents(".page"),L.hasClass("no-swipeback")&&(n=!0),D=l.find(".page-on-left:not(.cached)");var d=E.x-l.offset().left>s.params.swipeBackPageActiveArea;if(d=i.rtl?E.x<l.offset().left-l[0].scrollLeft+b-s.params.swipeBackPageActiveArea:E.x-l.offset().left>s.params.swipeBackPageActiveArea,d&&(n=!0),(0===D.length||0===L.length)&&(n=!0),n)return void(I=!1);s.params.swipeBackPageAnimateShadow&&!i.device.android&&(P=L.find(".swipeback-page-shadow"),0===P.length&&(P=o('<div class="swipeback-page-shadow"></div>'),L.append(P))),S&&(N=l.find(".navbar-on-center:not(.cached)"),z=l.find(".navbar-on-left:not(.cached)"),y=N.find(".left, .center, .right, .subnavbar, .fading"),x=z.find(".left, .center, .right, .subnavbar, .fading"),i.params.animateNavBackIcon&&(T=N.find(".left.sliding .back .icon"),k=z.find(".left.sliding .back .icon"))),o(".picker-modal.modal-in").length>0&&i.closeModal(o(".picker-modal.modal-in"))}e.f7PreventPanelSwipe=!0,O=!0,e.preventDefault();var c=i.rtl?-1:1;w=(a-E.x-s.params.swipeBackPageThreshold)*c,0>w&&(w=0);var u=w/b,m={percentage:u,activePage:L[0],previousPage:D[0],activeNavbar:N[0],previousNavbar:z[0]};s.params.onSwipeBackMove&&s.params.onSwipeBackMove(m),l.trigger("swipeBackMove",m);var f=w*c,h=(w/5-b/5)*c;if(1===i.device.pixelRatio&&(f=Math.round(f),h=Math.round(h)),L.transform("translate3d("+f+"px,0,0)"),s.params.swipeBackPageAnimateShadow&&!i.device.android&&(P[0].style.opacity=1-1*u),D.transform("translate3d("+h+"px,0,0)"),s.params.swipeBackPageAnimateOpacity&&(D[0].style.opacity=.9+.1*u),S){var g;for(g=0;g<y.length;g++)if(M=o(y[g]),M.is(".subnavbar.sliding")||(M[0].style.opacity=1-1.3*u),M[0].className.indexOf("sliding")>=0){var C=u*M[0].f7NavbarRightOffset;1===i.device.pixelRatio&&(C=Math.round(C)),M.transform("translate3d("+C+"px,0,0)"),i.params.animateNavBackIcon&&M[0].className.indexOf("left")>=0&&T.length>0&&T.transform("translate3d("+-C+"px,0,0)")}for(g=0;g<x.length;g++)if(M=o(x[g]),M.is(".subnavbar.sliding")||(M[0].style.opacity=1.3*u-.3),M[0].className.indexOf("sliding")>=0){var B=M[0].f7NavbarLeftOffset*(1-u);1===i.device.pixelRatio&&(B=Math.round(B)),M.transform("translate3d("+B+"px,0,0)"),i.params.animateNavBackIcon&&M[0].className.indexOf("left")>=0&&k.length>0&&k.transform("translate3d("+-B+"px,0,0)")}}}},s.handleTouchEnd=function(e){if(!I||!O)return I=!1,void(O=!1);if(I=!1,O=!1,0===w)return o([L[0],D[0]]).transform("").css({opacity:"",boxShadow:""}),void(S&&(y.transform("").css({opacity:""}),x.transform("").css({opacity:""}),T&&T.length>0&&T.transform(""),k&&T.length>0&&k.transform("")));var a=(new Date).getTime()-C,t=!1;(300>a&&w>10||a>=300&&w>b/2)&&(L.removeClass("page-on-center").addClass("page-on-right"),D.removeClass("page-on-left").addClass("page-on-center"),S&&(N.removeClass("navbar-on-center").addClass("navbar-on-right"),z.removeClass("navbar-on-left").addClass("navbar-on-center")),t=!0),o([L[0],D[0]]).transform("").css({opacity:"",boxShadow:""}).addClass("page-transitioning"),S&&(y.css({opacity:""}).each(function(){var e=t?this.f7NavbarRightOffset:0,a=o(this);a.transform("translate3d("+e+"px,0,0)"),i.params.animateNavBackIcon&&a.hasClass("left")&&T.length>0&&T.addClass("page-transitioning").transform("translate3d("+-e+"px,0,0)")}).addClass("page-transitioning"),x.transform("").css({opacity:""}).each(function(){var e=t?0:this.f7NavbarLeftOffset,a=o(this);a.transform("translate3d("+e+"px,0,0)"),i.params.animateNavBackIcon&&a.hasClass("left")&&k.length>0&&k.addClass("page-transitioning").transform("translate3d("+-e+"px,0,0)")}).addClass("page-transitioning")),B=!1,s.allowPageChange=!1;var n={activePage:L[0],previousPage:D[0],activeNavbar:N[0],previousNavbar:z[0]};if(t){var r=s.history[s.history.length-2];s.url=r,i.pageBackCallback("before",s,{pageContainer:L[0],url:r,position:"center",newPage:D,oldPage:L,swipeBack:!0}),i.pageAnimCallback("before",s,{pageContainer:D[0],url:r,position:"left",newPage:D,oldPage:L,swipeBack:!0}),s.params.onSwipeBackBeforeChange&&s.params.onSwipeBackBeforeChange(n),l.trigger("swipeBackBeforeChange",n)}else s.params.onSwipeBackBeforeReset&&s.params.onSwipeBackBeforeReset(n),l.trigger("swipeBackBeforeReset",n);L.transitionEnd(function(){o([L[0],D[0]]).removeClass("page-transitioning"),S&&(y.removeClass("page-transitioning").css({opacity:""}),x.removeClass("page-transitioning").css({opacity:""}),T&&T.length>0&&T.removeClass("page-transitioning"),k&&k.length>0&&k.removeClass("page-transitioning")),B=!0,s.allowPageChange=!0,t?(i.params.pushState&&s.main&&history.back(),i.pageBackCallback("after",s,{pageContainer:L[0],url:r,position:"center",newPage:D,oldPage:L,swipeBack:!0}),i.pageAnimCallback("after",s,{pageContainer:D[0],url:r,position:"left",newPage:D,oldPage:L,swipeBack:!0}),i.router.afterBack(s,L,D),s.params.onSwipeBackAfterChange&&s.params.onSwipeBackAfterChange(n),l.trigger("swipeBackAfterChange",n)):(s.params.onSwipeBackAfterReset&&s.params.onSwipeBackAfterReset(n),l.trigger("swipeBackAfterReset",n)),P&&P.length>0&&P.remove()})},s.attachEvents=function(e){var a=e?"off":"on";l[a](i.touchEvents.start,s.handleTouchStart),l[a](i.touchEvents.move,s.handleTouchMove),l[a](i.touchEvents.end,s.handleTouchEnd)},s.detachEvents=function(){s.attachEvents(!0)},s.params.swipeBackPage&&!i.params.material&&s.attachEvents(),i.views.push(s),s.main&&(i.mainView=s),s.router={load:function(e){return i.router.load(s,e)},back:function(e){return i.router.back(s,e)},loadPage:function(e){if(e=e||{},"string"==typeof e){var a=e;e={},a&&0===a.indexOf("#")&&s.params.domCache?e.pageName=a.split("#")[1]:e.url=a}return i.router.load(s,e)},loadContent:function(e){return i.router.load(s,{content:e})},reloadPage:function(e){return i.router.load(s,{url:e,reload:!0})},reloadContent:function(e){return i.router.load(s,{content:e,reload:!0})},reloadPreviousPage:function(e){return i.router.load(s,{url:e,reloadPrevious:!0,reload:!0})},reloadPreviousContent:function(e){return i.router.load(s,{content:e,reloadPrevious:!0,reload:!0})},refreshPage:function(){var e={url:s.url,reload:!0,ignoreCache:!0};return e.url&&0===e.url.indexOf("#")&&(s.params.domCache&&s.pagesCache[e.url]?(e.pageName=s.pagesCache[e.url],e.url=void 0,delete e.url):s.contentCache[e.url]&&(e.content=s.contentCache[e.url],e.url=void 0,delete e.url)),i.router.load(s,e)},refreshPreviousPage:function(){var e={url:s.history[s.history.length-2],reload:!0,reloadPrevious:!0,ignoreCache:!0};return e.url&&0===e.url.indexOf("#")&&s.params.domCache&&s.pagesCache[e.url]&&(e.pageName=s.pagesCache[e.url],e.url=void 0,delete e.url),i.router.load(s,e)}},s.loadPage=s.router.loadPage,s.loadContent=s.router.loadContent,s.reloadPage=s.router.reloadPage,s.reloadContent=s.router.reloadContent,s.reloadPreviousPage=s.router.reloadPreviousPage,s.reloadPreviousContent=s.router.reloadPreviousContent,s.refreshPage=s.router.refreshPage,s.refreshPreviousPage=s.router.refreshPreviousPage,s.back=s.router.back,s.hideNavbar=function(){return i.hideNavbar(l.find(".navbar"))},s.showNavbar=function(){return i.showNavbar(l.find(".navbar"))},s.hideToolbar=function(){return i.hideToolbar(l.find(".toolbar"))},s.showToolbar=function(){return i.showToolbar(l.find(".toolbar"))},i.params.pushState&&s.main){var A;f?A=c.split(i.params.pushStateRoot+m)[1]:c.indexOf(m)>=0&&c.indexOf(m+"#")<0&&(A=c.split(m)[1]);var H=i.params.pushStateNoAnimation?!1:void 0;if(A)i.router.load(s,{url:A,animatePages:H,pushState:!1});else if(c.indexOf(m+"#")>=0){var R=history.state;R.pageName&&"viewIndex"in R&&i.router.load(s,{pageName:R.pageName,pushState:!1})}}return s.destroy=function(){s.detachEvents(),s=void 0},i.pluginHook("addView",s),s};i.addView=function(e,a){return new p(e,a)},i.getCurrentView=function(e){var a=o(".popover.modal-in .view"),t=o(".popup.modal-in .view"),n=o(".panel.active .view"),r=o(".views"),i=r.children(".view");if(i.length>1&&i.hasClass("tab")&&(i=r.children(".view.active")),a.length>0&&a[0].f7View)return a[0].f7View;if(t.length>0&&t[0].f7View)return t[0].f7View;if(n.length>0&&n[0].f7View)return n[0].f7View;if(i.length>0){if(1===i.length&&i[0].f7View)return i[0].f7View;if(i.length>1){for(var s=[],l=0;l<i.length;l++)i[l].f7View&&s.push(i[l].f7View);return s.length>0&&"undefined"!=typeof e?s[e]:s.length>1?s:1===s.length?s[0]:void 0}}return void 0},i.navbarInitCallback=function(e,a,t,n){if(!t&&n&&(t=o(n).parent(".navbar")[0]),!n.f7NavbarInitialized||!e||e.params.domCache){var r={container:t,innerContainer:n},s=a&&a.f7PageData,l={page:s,navbar:r};if(n.f7NavbarInitialized&&(e&&e.params.domCache||!e&&o(t).parents(".popup, .popover, .login-screen, .modal, .actions-modal, .picker-modal").length>0))return i.reinitNavbar(t,n),i.pluginHook("navbarReinit",l),void o(n).trigger("navbarReinit",l);n.f7NavbarInitialized=!0,i.pluginHook("navbarBeforeInit",r,s),o(n).trigger("navbarBeforeInit",l),i.initNavbar(t,n),i.pluginHook("navbarInit",r,s),o(n).trigger("navbarInit",l)}},i.navbarRemoveCallback=function(e,a,t,n){!t&&n&&(t=o(n).parent(".navbar")[0]);var r={container:t,innerContainer:n},s=a.f7PageData,l={page:s,navbar:r};i.pluginHook("navbarBeforeRemove",r,s),o(n).trigger("navbarBeforeRemove",l)},i.initNavbar=function(e,a){i.initSearchbar&&i.initSearchbar(a)},i.reinitNavbar=function(e,a){},i.initNavbarWithCallback=function(e){e=o(e);var a,t=e.parents("."+i.params.viewClass);0!==t.length&&(0!==e.parents(".navbar-through").length||0!==t.find(".navbar-through").length)&&(a=t[0].f7View||void 0,e.find(".navbar-inner").each(function(){var n,r=this;if(o(r).attr("data-page")&&(n=t.find('.page[data-page="'+o(r).attr("data-page")+'"]')[0]),!n){var s=t.find(".page");1===s.length?n=s[0]:t.find(".page").each(function(){this.f7PageData&&this.f7PageData.navbarInnerContainer===r&&(n=this)})}i.navbarInitCallback(a,n,e[0],r)}))},i.sizeNavbars=function(e){if(!i.params.material){var a=e?o(e).find(".navbar .navbar-inner:not(.cached)"):o(".navbar .navbar-inner:not(.cached)");a.each(function(){var e=o(this);if(!e.hasClass("cached")){var a,t,n=e.find(i.rtl?".right":".left"),r=e.find(i.rtl?".left":".right"),s=e.find(".center"),l=e.find(".subnavbar"),p=0===n.length,d=0===r.length,c=p?0:n.outerWidth(!0),u=d?0:r.outerWidth(!0),m=s.outerWidth(!0),f=e.styles(),h=e[0].offsetWidth-parseInt(f.paddingLeft,10)-parseInt(f.paddingRight,10),g=e.hasClass("navbar-on-left");d&&(a=h-m),p&&(a=0),p||d||(a=(h-u-m+c)/2);var v=(h-m)/2;h-c-u>m?(c>v&&(v=c),v+m>h-u&&(v=h-u-m),t=v-a):t=0;var b=i.rtl?-1:1;s.hasClass("sliding")&&(s[0].f7NavbarLeftOffset=-(a+t)*b,s[0].f7NavbarRightOffset=(h-a-t-m)*b,g&&s.transform("translate3d("+s[0].f7NavbarLeftOffset+"px, 0, 0)")),!p&&n.hasClass("sliding")&&(i.rtl?(n[0].f7NavbarLeftOffset=-(h-n[0].offsetWidth)/2*b,n[0].f7NavbarRightOffset=c*b):(n[0].f7NavbarLeftOffset=-c,n[0].f7NavbarRightOffset=(h-n[0].offsetWidth)/2),g&&n.transform("translate3d("+n[0].f7NavbarLeftOffset+"px, 0, 0)")),!d&&r.hasClass("sliding")&&(i.rtl?(r[0].f7NavbarLeftOffset=-u*b,r[0].f7NavbarRightOffset=(h-r[0].offsetWidth)/2*b):(r[0].f7NavbarLeftOffset=-(h-r[0].offsetWidth)/2,r[0].f7NavbarRightOffset=u),g&&r.transform("translate3d("+r[0].f7NavbarLeftOffset+"px, 0, 0)")),l.length&&l.hasClass("sliding")&&(l[0].f7NavbarLeftOffset=i.rtl?l[0].offsetWidth:-l[0].offsetWidth,l[0].f7NavbarRightOffset=-l[0].f7NavbarLeftOffset);var w=t;i.rtl&&p&&d&&s.length>0&&(w=-w),s.css({left:w+"px"})}})}},i.hideNavbar=function(e){return o(e).addClass("navbar-hidden"),!0},i.showNavbar=function(e){var a=o(e);return a.addClass("navbar-hiding").removeClass("navbar-hidden").transitionEnd(function(){a.removeClass("navbar-hiding")}),!0},i.hideToolbar=function(e){return o(e).addClass("toolbar-hidden"),!0},i.showToolbar=function(e){var a=o(e);a.addClass("toolbar-hiding").removeClass("toolbar-hidden").transitionEnd(function(){a.removeClass("toolbar-hiding")})};var d=function(e,a){function t(e){return e.replace(/[^\u0000-\u007E]/g,function(e){return c[e]||e})}function n(e){e.preventDefault()}var r={input:null,clearButton:null,cancelButton:null,searchList:null,searchIn:".item-title",searchBy:"",found:null,notFound:null,overlay:null,ignore:".searchbar-ignore",customSearch:!1,removeDiacritics:!1,hideDividers:!0,hideGroups:!0};a=a||{};for(var s in r)("undefined"==typeof a[s]||null===a[s])&&(a[s]=r[s]);var l=this;l.material=i.params.material,l.params=a,e=o(e),l.container=e,l.active=!1,l.input=l.params.input?o(l.params.input):l.container.find('input[type="search"]'),l.clearButton=l.params.clearButton?o(l.params.clearButton):l.container.find(".searchbar-clear"),l.cancelButton=l.params.cancelButton?o(l.params.cancelButton):l.container.find(".searchbar-cancel"),l.searchList=o(l.params.searchList),l.isVirtualList=l.searchList.hasClass("virtual-list"),l.pageContainer=l.container.parents(".page").eq(0),l.overlay=l.params.overlay?o(l.params.overlay):l.pageContainer.length>0?l.pageContainer.find(".searchbar-overlay"):o(".searchbar-overlay"),l.found=l.params.found?o(l.params.found):l.pageContainer.length>0?l.pageContainer.find(".searchbar-found"):o(".searchbar-found"),l.notFound=l.params.notFound?o(l.params.notFound):l.pageContainer.length>0?l.pageContainer.find(".searchbar-not-found"):o(".searchbar-not-found");var p=i.rtl?"margin-left":"margin-right";l.cancelButton.length>0&&!l.material&&(l.cancelButton.transition(0).show(),l.cancelButton.css(p,-l.cancelButton[0].offsetWidth+"px"),setTimeout(function(){l.cancelButton.transition("")},0));for(var d=[{base:"A",letters:"AⒶＡÀÁÂẦẤẪẨÃĀĂẰẮẴẲȦǠÄǞẢÅǺǍȀȂẠẬẶḀĄȺⱯ"},{base:"AA",letters:"Ꜳ"},{base:"AE",letters:"ÆǼǢ"},{base:"AO",letters:"Ꜵ"},{base:"AU",letters:"Ꜷ"},{base:"AV",letters:"ꜸꜺ"},{base:"AY",letters:"Ꜽ"},{base:"B",letters:"BⒷＢḂḄḆɃƂƁ"},{base:"C",letters:"CⒸＣĆĈĊČÇḈƇȻꜾ"},{base:"D",letters:"DⒹＤḊĎḌḐḒḎĐƋƊƉꝹ"},{base:"DZ",letters:"ǱǄ"},{base:"Dz",letters:"ǲǅ"},{base:"E",letters:"EⒺＥÈÉÊỀẾỄỂẼĒḔḖĔĖËẺĚȄȆẸỆȨḜĘḘḚƐƎ"},{base:"F",letters:"FⒻＦḞƑꝻ"},{base:"G",letters:"GⒼＧǴĜḠĞĠǦĢǤƓꞠꝽꝾ"},{base:"H",letters:"HⒽＨĤḢḦȞḤḨḪĦⱧⱵꞍ"},{base:"I",letters:"IⒾＩÌÍÎĨĪĬİÏḮỈǏȈȊỊĮḬƗ"},{base:"J",letters:"JⒿＪĴɈ"},{base:"K",letters:"KⓀＫḰǨḲĶḴƘⱩꝀꝂꝄꞢ"},{base:"L",letters:"LⓁＬĿĹĽḶḸĻḼḺŁȽⱢⱠꝈꝆꞀ"},{base:"LJ",letters:"Ǉ"},{base:"Lj",letters:"ǈ"},{base:"M",letters:"MⓂＭḾṀṂⱮƜ"},{base:"N",letters:"NⓃＮǸŃÑṄŇṆŅṊṈȠƝꞐꞤ"},{base:"NJ",letters:"Ǌ"},{base:"Nj",letters:"ǋ"},{base:"O",letters:"OⓄＯÒÓÔỒỐỖỔÕṌȬṎŌṐṒŎȮȰÖȪỎŐǑȌȎƠỜỚỠỞỢỌỘǪǬØǾƆƟꝊꝌ"},{base:"OI",letters:"Ƣ"},{base:"OO",letters:"Ꝏ"},{base:"OU",letters:"Ȣ"},{base:"OE",letters:"Œ"},{base:"oe",letters:"œ"},{base:"P",letters:"PⓅＰṔṖƤⱣꝐꝒꝔ"},{base:"Q",letters:"QⓆＱꝖꝘɊ"},{base:"R",letters:"RⓇＲŔṘŘȐȒṚṜŖṞɌⱤꝚꞦꞂ"},{base:"S",letters:"SⓈＳẞŚṤŜṠŠṦṢṨȘŞⱾꞨꞄ"},{base:"T",letters:"TⓉＴṪŤṬȚŢṰṮŦƬƮȾꞆ"},{base:"TZ",letters:"Ꜩ"},{base:"U",letters:"UⓊＵÙÚÛŨṸŪṺŬÜǛǗǕǙỦŮŰǓȔȖƯỪỨỮỬỰỤṲŲṶṴɄ"},{base:"V",letters:"VⓋＶṼṾƲꝞɅ"},{base:"VY",letters:"Ꝡ"},{base:"W",letters:"WⓌＷẀẂŴẆẄẈⱲ"},{base:"X",letters:"XⓍＸẊẌ"},{base:"Y",letters:"YⓎＹỲÝŶỸȲẎŸỶỴƳɎỾ"},{base:"Z",letters:"ZⓏＺŹẐŻŽẒẔƵȤⱿⱫꝢ"},{base:"a",letters:"aⓐａẚàáâầấẫẩãāăằắẵẳȧǡäǟảåǻǎȁȃạậặḁąⱥɐ"},{base:"aa",letters:"ꜳ"},{base:"ae",letters:"æǽǣ"},{base:"ao",letters:"ꜵ"},{base:"au",letters:"ꜷ"},{base:"av",letters:"ꜹꜻ"},{base:"ay",letters:"ꜽ"},{base:"b",letters:"bⓑｂḃḅḇƀƃɓ"},{base:"c",letters:"cⓒｃćĉċčçḉƈȼꜿↄ"},{base:"d",letters:"dⓓｄḋďḍḑḓḏđƌɖɗꝺ"},{base:"dz",letters:"ǳǆ"},{base:"e",letters:"eⓔｅèéêềếễểẽēḕḗĕėëẻěȅȇẹệȩḝęḙḛɇɛǝ"},{base:"f",letters:"fⓕｆḟƒꝼ"},{base:"g",letters:"gⓖｇǵĝḡğġǧģǥɠꞡᵹꝿ"},{base:"h",letters:"hⓗｈĥḣḧȟḥḩḫẖħⱨⱶɥ"},{base:"hv",letters:"ƕ"},{base:"i",letters:"iⓘｉìíîĩīĭïḯỉǐȉȋịįḭɨı"},{base:"j",letters:"jⓙｊĵǰɉ"},{base:"k",letters:"kⓚｋḱǩḳķḵƙⱪꝁꝃꝅꞣ"},{base:"l",letters:"lⓛｌŀĺľḷḹļḽḻſłƚɫⱡꝉꞁꝇ"},{base:"lj",letters:"ǉ"},{base:"m",letters:"mⓜｍḿṁṃɱɯ"},{base:"n",letters:"nⓝｎǹńñṅňṇņṋṉƞɲŉꞑꞥ"},{base:"nj",letters:"ǌ"},{base:"o",letters:"oⓞｏòóôồốỗổõṍȭṏōṑṓŏȯȱöȫỏőǒȍȏơờớỡởợọộǫǭøǿɔꝋꝍɵ"},{base:"oi",letters:"ƣ"},{base:"ou",letters:"ȣ"},{base:"oo",letters:"ꝏ"},{base:"p",letters:"pⓟｐṕṗƥᵽꝑꝓꝕ"},{base:"q",letters:"qⓠｑɋꝗꝙ"},{base:"r",letters:"rⓡｒŕṙřȑȓṛṝŗṟɍɽꝛꞧꞃ"},{base:"s",letters:"sⓢｓßśṥŝṡšṧṣṩșşȿꞩꞅẛ"},{base:"t",letters:"tⓣｔṫẗťṭțţṱṯŧƭʈⱦꞇ"},{base:"tz",letters:"ꜩ"},{base:"u",letters:"uⓤｕùúûũṹūṻŭüǜǘǖǚủůűǔȕȗưừứữửựụṳųṷṵʉ"},{base:"v",letters:"vⓥｖṽṿʋꝟʌ"},{base:"vy",letters:"ꝡ"},{base:"w",letters:"wⓦｗẁẃŵẇẅẘẉⱳ"},{base:"x",letters:"xⓧｘẋẍ"},{base:"y",letters:"yⓨｙỳýŷỹȳẏÿỷẙỵƴɏỿ"},{base:"z",letters:"zⓩｚźẑżžẓẕƶȥɀⱬꝣ"}],c={},u=0;u<d.length;u++)for(var m=d[u].letters,f=0;f<m.length;f++)c[m[f]]=d[u].base;l.triggerEvent=function(e,a,t){l.container.trigger(e,t),l.searchList.length>0&&l.searchList.trigger(e,t),a&&l.params[a]&&l.params[a](l,t)},l.enable=function(){function e(){!l.searchList.length&&!l.params.customSearch||l.container.hasClass("searchbar-active")||l.overlay.addClass("searchbar-overlay-active"),l.container.addClass("searchbar-active"),l.cancelButton.length>0&&!l.material&&l.cancelButton.css(p,"0px"),l.triggerEvent("enableSearch","onEnable"),l.active=!0}i.device.ios?setTimeout(function(){e()},400):e()},l.disable=function(){function e(){l.input.blur(),l.triggerEvent("disableSearch","onDisable"),l.active=!1}l.input.val("").trigger("change"),l.container.removeClass("searchbar-active searchbar-not-empty"),l.cancelButton.length>0&&!l.material&&l.cancelButton.css(p,-l.cancelButton[0].offsetWidth+"px"),(l.searchList.length||l.params.customSearch)&&l.overlay.removeClass("searchbar-overlay-active"),i.device.ios?setTimeout(function(){e()},400):e()},l.clear=function(e){return!l.query&&e&&o(e.target).hasClass("searchbar-clear")?void l.disable():(l.input.val("").trigger("change").focus(),void l.triggerEvent("clearSearch","onClear"))},l.handleInput=function(){setTimeout(function(){var e=l.input.val().trim();(l.searchList.length>0||l.params.customSearch)&&(l.params.searchIn||l.isVirtualList)&&l.search(e,!0)},0)};var h,g="";return l.search=function(e,a){if(e.trim()!==g){if(g=e.trim(),a||(l.active||l.enable(),a||l.input.val(e)),l.query=l.value=e,0===e.length?(l.container.removeClass("searchbar-not-empty"),l.searchList.length&&l.container.hasClass("searchbar-active")&&l.overlay.addClass("searchbar-overlay-active")):(l.container.addClass("searchbar-not-empty"),l.searchList.length&&l.container.hasClass("searchbar-active")&&l.overlay.removeClass("searchbar-overlay-active")),l.params.customSearch)return void l.triggerEvent("search","onSearch",{query:e});var n=[];if(l.isVirtualList){if(h=l.searchList[0].f7VirtualList,""===e.trim())return h.resetFilter(),l.notFound.hide(),void l.found.show();if(h.params.searchAll)n=h.params.searchAll(e,h.items)||[];else if(h.params.searchByItem)for(var r=0;r<h.items.length;r++)h.params.searchByItem(e,r,h.params.items[r])&&n.push(r)}else{var i;i=l.params.removeDiacritics?t(e.trim().toLowerCase()).split(" "):e.trim().toLowerCase().split(" "),l.searchList.find("li").removeClass("hidden-by-searchbar").each(function(e,a){a=o(a);var r=[];a.find(l.params.searchIn).each(function(){var e=o(this).text().trim().toLowerCase();l.params.removeDiacritics&&(e=t(e)),r.push(e)}),r=r.join(" ");for(var s=0,p=0;p<i.length;p++)r.indexOf(i[p])>=0&&s++;s===i.length||l.params.ignore&&a.is(l.params.ignore)?n.push(a[0]):a.addClass("hidden-by-searchbar")}),l.params.hideDividers&&l.searchList.find(".item-divider, .list-group-title").each(function(){for(var e=o(this),a=e.nextAll("li"),t=!0,n=0;n<a.length;n++){var r=o(a[n]);if(r.hasClass("list-group-title")||r.hasClass("item-divider"))break;r.hasClass("hidden-by-searchbar")||(t=!1)}var i=l.params.ignore&&e.is(l.params.ignore);t&&!i?e.addClass("hidden-by-searchbar"):e.removeClass("hidden-by-searchbar")}),l.params.hideGroups&&l.searchList.find(".list-group").each(function(){var e=o(this),a=l.params.ignore&&e.is(l.params.ignore),t=e.find("li:not(.hidden-by-searchbar)");0!==t.length||a?e.removeClass("hidden-by-searchbar"):e.addClass("hidden-by-searchbar")})}l.triggerEvent("search","onSearch",{query:e,foundItems:n}),0===n.length?(l.notFound.show(),l.found.hide()):(l.notFound.hide(),l.found.show()),l.isVirtualList&&h.filterItems(n)}},l.attachEvents=function(e){var a=e?"off":"on";l.container[a]("submit",n),l.material||l.cancelButton[a]("click",l.disable),l.overlay[a]("click",l.disable),l.input[a]("focus",l.enable),l.input[a]("change keydown keypress keyup",l.handleInput),l.clearButton[a]("click",l.clear)},l.detachEvents=function(){l.attachEvents(!0)},l.init=function(){l.attachEvents()},l.destroy=function(){l&&(l.detachEvents(),l=null)},l.init(),l.container[0].f7Searchbar=l,l};i.searchbar=function(e,a){return new d(e,a)},i.initSearchbar=function(e){function a(){n&&n.destroy()}e=o(e);var t=e.hasClass("searchbar")?e:e.find(".searchbar");if(0!==t.length&&t.hasClass("searchbar-init")){var n=i.searchbar(t,t.dataset());e.hasClass("page")?e.once("pageBeforeRemove",a):e.hasClass("navbar-inner")&&e.once("navbarBeforeRemove",a)}};var c=function(e,a){function t(e){e.preventDefault()}var n={textarea:null,maxHeight:null};a=a||{};for(var r in n)("undefined"==typeof a[r]||null===a[r])&&(a[r]=n[r]);var i=this;return i.params=a,i.container=o(e),0!==i.container.length?(i.textarea=i.params.textarea?o(i.params.textarea):i.container.find("textarea"),i.pageContainer=i.container.parents(".page").eq(0),i.pageContent=i.pageContainer.find(".page-content"),i.pageContentPadding=parseInt(i.pageContent.css("padding-bottom")),i.initialBarHeight=i.container[0].offsetHeight,i.initialAreaHeight=i.textarea[0].offsetHeight,i.sizeTextarea=function(){i.textarea.css({height:""});var e=i.textarea[0].offsetHeight,a=e-i.textarea[0].clientHeight,t=i.textarea[0].scrollHeight;if(t+a>e){var n=t+a,r=i.initialBarHeight+(n-i.initialAreaHeight),s=i.params.maxHeight||i.container.parents(".view")[0].offsetHeight-88;r>s&&(r=parseInt(s,10),n=r-i.initialBarHeight+i.initialAreaHeight),i.textarea.css("height",n+"px"),i.container.css("height",r+"px"),i.pageContent.length>0&&(i.pageContent.css("padding-bottom",r+"px"),0===i.pageContent.find(".messages-new-first").length&&i.pageContent.scrollTop(i.pageContent[0].scrollHeight-i.pageContent[0].offsetHeight))}else i.pageContent.length>0&&(i.container.css({height:"",bottom:""}),i.pageContent.css({"padding-bottom":""}))},i.clear=function(){i.textarea.val("").trigger("change")},i.value=function(e){return"undefined"==typeof e?i.textarea.val():void i.textarea.val(e).trigger("change")},i.textareaTimeout=void 0,i.handleTextarea=function(e){clearTimeout(i.textareaTimeout),i.textareaTimeout=setTimeout(function(){i.sizeTextarea()},0)},i.attachEvents=function(e){var a=e?"off":"on";i.container[a]("submit",t),i.textarea[a]("change keydown keypress keyup paste cut",i.handleTextarea)},i.detachEvents=function(){i.attachEvents(!0)},i.init=function(){i.attachEvents()},i.destroy=function(){i.detachEvents(),i=null},i.init(),i.container[0].f7Messagebar=i,i):void 0};i.messagebar=function(e,a){return new c(e,a)},i.initPageMessagebar=function(e){function a(){n.destroy(),e.off("pageBeforeRemove",a)}e=o(e);var t=e.hasClass("messagebar")?e:e.find(".messagebar");if(0!==t.length&&t.hasClass("messagebar-init")){var n=i.messagebar(t,t.dataset());e.hasClass("page")&&e.on("pageBeforeRemove",a)}},i.cache=[],i.removeFromCache=function(e){for(var a=!1,t=0;t<i.cache.length;t++)i.cache[t].url===e&&(a=t);a!==!1&&i.cache.splice(a,1)},i.xhr=!1,i.get=function(e,a,t,n){var r=e;if(i.params.cacheIgnoreGetParameters&&e.indexOf("?")>=0&&(r=e.split("?")[0]),i.params.cache&&!t&&e.indexOf("nocache")<0&&i.params.cacheIgnore.indexOf(r)<0)for(var s=0;s<i.cache.length;s++)if(i.cache[s].url===r&&(new Date).getTime()-i.cache[s].time<i.params.cacheDuration)return n(i.cache[s].content),!1;return i.xhr=o.ajax({url:e,method:"GET",beforeSend:i.params.onAjaxStart,complete:function(e){e.status>=200&&e.status<300||0===e.status?(i.params.cache&&!t&&(i.removeFromCache(r),i.cache.push({url:r,time:(new Date).getTime(),content:e.responseText})),n(e.responseText,!1)):n(e.responseText,!0),i.params.onAjaxComplete&&i.params.onAjaxComplete(e)},error:function(e){n(e.responseText,!0),i.params.onAjaxError&&i.params.onAjaxError(e)}}),a&&(a.xhr=i.xhr),i.xhr},i.pageCallbacks={},i.onPage=function(e,a,t){if(a&&a.split(" ").length>1){for(var n=a.split(" "),r=[],s=0;s<n.length;s++)r.push(i.onPage(e,n[s],t));return r.remove=function(){for(var e=0;e<r.length;e++)r[e].remove()},r.trigger=function(){for(var e=0;e<r.length;e++)r[e].trigger()},r}var o=i.pageCallbacks[e][a];return o||(o=i.pageCallbacks[e][a]=[]),i.pageCallbacks[e][a].push(t),{remove:function(){for(var e,a=0;a<o.length;a++)o[a].toString()===t.toString()&&(e=a);"undefined"!=typeof e&&o.splice(e,1)},trigger:t}};for(var u="beforeInit init reinit beforeAnimation afterAnimation back afterBack beforeRemove".split(" "),m=0;m<u.length;m++)i.pageCallbacks[u[m]]={},t(u[m]);i.triggerPageCallbacks=function(e,a,t){var n=i.pageCallbacks[e]["*"];if(n)for(var r=0;r<n.length;r++)n[r](t);var s=i.pageCallbacks[e][a];if(s&&0!==s.length)for(var o=0;o<s.length;o++)s[o](t)},i.pageInitCallback=function(e,a){var t=a.pageContainer;if(!t.f7PageInitialized||!e||e.params.domCache){var n={container:t,url:a.url,query:a.query||o.parseUrlQuery(a.url||""),name:o(t).attr("data-page"),view:e,from:a.position,context:a.context,navbarInnerContainer:a.navbarInnerContainer,fromPage:a.fromPage};if(a.fromPage&&!a.fromPage.navbarInnerContainer&&a.oldNavbarInnerContainer&&(a.fromPage.navbarInnerContainer=a.oldNavbarInnerContainer),t.f7PageInitialized&&(e&&e.params.domCache||!e&&o(t).parents(".popup, .popover, .login-screen, .modal, .actions-modal, .picker-modal").length>0))return i.reinitPage(t),i.pluginHook("pageReinit",n),i.params.onPageReinit&&i.params.onPageBeforeInit(i,n),i.triggerPageCallbacks("reinit",n.name,n),void o(n.container).trigger("pageReinit",{page:n});t.f7PageInitialized=!0,t.f7PageData=n,!e||a.preloadOnly||a.reloadPrevious||(o(e.container).attr("data-page",n.name),e.activePage=n),i.pluginHook("pageBeforeInit",n),i.params.onPageBeforeInit&&i.params.onPageBeforeInit(i,n),i.triggerPageCallbacks("beforeInit",n.name,n),o(n.container).trigger("pageBeforeInit",{
page:n}),i.initPage(t),i.pluginHook("pageInit",n),i.params.onPageInit&&i.params.onPageInit(i,n),i.triggerPageCallbacks("init",n.name,n),o(n.container).trigger("pageInit",{page:n})}},i.pageRemoveCallback=function(e,a,t){var n;a.f7PageData&&(n=a.f7PageData.context);var r={container:a,name:o(a).attr("data-page"),view:e,url:a.f7PageData&&a.f7PageData.url,query:a.f7PageData&&a.f7PageData.query,navbarInnerContainer:a.f7PageData&&a.f7PageData.navbarInnerContainer,from:t,context:n};i.pluginHook("pageBeforeRemove",r),i.params.onPageBeforeRemove&&i.params.onPageBeforeRemove(i,r),i.triggerPageCallbacks("beforeRemove",r.name,r),o(r.container).trigger("pageBeforeRemove",{page:r})},i.pageBackCallback=function(e,a,t){var n,r=t.pageContainer;r.f7PageData&&(n=r.f7PageData.context);var s={container:r,name:o(r).attr("data-page"),url:r.f7PageData&&r.f7PageData.url,query:r.f7PageData&&r.f7PageData.query,view:a,from:t.position,context:n,navbarInnerContainer:r.f7PageData&&r.f7PageData.navbarInnerContainer,swipeBack:t.swipeBack};"after"===e&&(i.pluginHook("pageAfterBack",s),i.params.onPageAfterBack&&i.params.onPageAfterBack(i,s),i.triggerPageCallbacks("afterBack",s.name,s),o(r).trigger("pageAfterBack",{page:s})),"before"===e&&(i.pluginHook("pageBack",s),i.params.onPageBack&&i.params.onPageBack(i,s),i.triggerPageCallbacks("back",s.name,s),o(s.container).trigger("pageBack",{page:s}))},i.pageAnimCallback=function(e,a,t){var n,r=t.pageContainer;r.f7PageData&&(n=r.f7PageData.context);var s={container:r,url:t.url,query:t.query||o.parseUrlQuery(t.url||""),name:o(r).attr("data-page"),view:a,from:t.position,context:n,swipeBack:t.swipeBack,navbarInnerContainer:r.f7PageData&&r.f7PageData.navbarInnerContainer,fromPage:t.fromPage},l=t.oldPage,p=t.newPage;if(r.f7PageData=s,"after"===e&&(i.pluginHook("pageAfterAnimation",s),i.params.onPageAfterAnimation&&i.params.onPageAfterAnimation(i,s),i.triggerPageCallbacks("afterAnimation",s.name,s),o(s.container).trigger("pageAfterAnimation",{page:s})),"before"===e){o(a.container).attr("data-page",s.name),a&&(a.activePage=s),p.hasClass("no-navbar")&&!l.hasClass("no-navbar")&&a.hideNavbar(),p.hasClass("no-navbar")||!l.hasClass("no-navbar")&&!l.hasClass("no-navbar-by-scroll")||a.showNavbar(),p.hasClass("no-toolbar")&&!l.hasClass("no-toolbar")&&a.hideToolbar(),p.hasClass("no-toolbar")||!l.hasClass("no-toolbar")&&!l.hasClass("no-toolbar-by-scroll")||a.showToolbar();var d;p.hasClass("no-tabbar")&&!l.hasClass("no-tabbar")&&(d=o(a.container).find(".tabbar"),0===d.length&&(d=o(a.container).parents("."+i.params.viewsClass).find(".tabbar")),i.hideToolbar(d)),p.hasClass("no-tabbar")||!l.hasClass("no-tabbar")&&!l.hasClass("no-tabbar-by-scroll")||(d=o(a.container).find(".tabbar"),0===d.length&&(d=o(a.container).parents("."+i.params.viewsClass).find(".tabbar")),i.showToolbar(d)),l.removeClass("no-navbar-by-scroll no-toolbar-by-scroll"),i.pluginHook("pageBeforeAnimation",s),i.params.onPageBeforeAnimation&&i.params.onPageBeforeAnimation(i,s),i.triggerPageCallbacks("beforeAnimation",s.name,s),o(s.container).trigger("pageBeforeAnimation",{page:s})}},i.initPage=function(e){e=o(e),0!==e.length&&(i.sizeNavbars&&i.sizeNavbars(e.parents("."+i.params.viewClass)[0]),i.initPageMessages&&i.initPageMessages(e),i.initFormsStorage&&i.initFormsStorage(e),i.initSmartSelects&&i.initSmartSelects(e),i.initPageSwiper&&i.initPageSwiper(e),i.initPullToRefresh&&i.initPullToRefresh(e),i.initInfiniteScroll&&i.initInfiniteScroll(e),i.initSearchbar&&i.initSearchbar(e),i.initPageMessagebar&&i.initPageMessagebar(e),i.initScrollToolbars&&i.initScrollToolbars(e),i.initImagesLazyLoad&&i.initImagesLazyLoad(e),i.initPageResizableTextareas&&i.initPageResizableTextareas(e),i.params.material&&i.initPageMaterialPreloader&&i.initPageMaterialPreloader(e),i.params.material&&i.initPageMaterialInputs&&i.initPageMaterialInputs(e),i.params.material&&i.initPageMaterialTabbar&&i.initPageMaterialTabbar(e))},i.reinitPage=function(e){e=o(e),0!==e.length&&(i.sizeNavbars&&i.sizeNavbars(e.parents("."+i.params.viewClass)[0]),i.reinitPageSwiper&&i.reinitPageSwiper(e),i.reinitLazyLoad&&i.reinitLazyLoad(e))},i.initPageWithCallback=function(e){e=o(e);var a=e.parents("."+i.params.viewClass);if(0!==a.length){var t=a[0].f7View||void 0,n=t&&t.url?t.url:void 0;a&&e.attr("data-page")&&a.attr("data-page",e.attr("data-page")),i.pageInitCallback(t,{pageContainer:e[0],url:n,position:"center"})}},i.router={temporaryDom:document.createElement("div"),findElement:function(e,a,t,n){a=o(a),n&&(e+=":not(.cached)");var r=a.find(e);return r.length>1&&("string"==typeof t.selector&&(r=a.find(t.selector+" "+e)),r.length>1&&(r=a.find("."+i.params.viewMainClass+" "+e))),1===r.length?r:(n||(r=i.router.findElement(e,a,t,!0)),r&&1===r.length?r:void 0)},animatePages:function(e,a,t,n){var r="page-on-center page-on-right page-on-left";"to-left"===t&&(e.removeClass(r).addClass("page-from-center-to-left"),a.removeClass(r).addClass("page-from-right-to-center")),"to-right"===t&&(e.removeClass(r).addClass("page-from-left-to-center"),a.removeClass(r).addClass("page-from-center-to-right"))},prepareNavbar:function(e,a,t){o(e).find(".sliding").each(function(){var e=o(this),n="right"===t?this.f7NavbarRightOffset:this.f7NavbarLeftOffset;i.params.animateNavBackIcon&&(e.hasClass("left")&&e.find(".back .icon").length>0&&e.find(".back .icon").transform("translate3d("+-n+"px,0,0)"),"left"===t&&e.hasClass("center")&&o(a).find(".left .back .icon ~ span").length>0&&(n+=o(a).find(".left .back span")[0].offsetLeft)),e.transform("translate3d("+n+"px,0,0)")})},animateNavbars:function(e,a,t,n){var r="navbar-on-right navbar-on-center navbar-on-left";"to-left"===t&&(a.removeClass(r).addClass("navbar-from-right-to-center"),a.find(".sliding").each(function(){var e=o(this);e.transform("translate3d(0px,0,0)"),i.params.animateNavBackIcon&&e.hasClass("left")&&e.find(".back .icon").length>0&&e.find(".back .icon").transform("translate3d(0px,0,0)")}),e.removeClass(r).addClass("navbar-from-center-to-left"),e.find(".sliding").each(function(){var e,t=o(this);i.params.animateNavBackIcon&&(t.hasClass("center")&&a.find(".sliding.left .back .icon").length>0&&(e=a.find(".sliding.left .back span"),e.length>0&&(this.f7NavbarLeftOffset+=e[0].offsetLeft)),t.hasClass("left")&&t.find(".back .icon").length>0&&t.find(".back .icon").transform("translate3d("+-this.f7NavbarLeftOffset+"px,0,0)")),t.transform("translate3d("+this.f7NavbarLeftOffset+"px,0,0)")})),"to-right"===t&&(e.removeClass(r).addClass("navbar-from-left-to-center"),e.find(".sliding").each(function(){var e=o(this);e.transform("translate3d(0px,0,0)"),i.params.animateNavBackIcon&&e.hasClass("left")&&e.find(".back .icon").length>0&&e.find(".back .icon").transform("translate3d(0px,0,0)")}),a.removeClass(r).addClass("navbar-from-center-to-right"),a.find(".sliding").each(function(){var e=o(this);i.params.animateNavBackIcon&&e.hasClass("left")&&e.find(".back .icon").length>0&&e.find(".back .icon").transform("translate3d("+-this.f7NavbarRightOffset+"px,0,0)"),e.transform("translate3d("+this.f7NavbarRightOffset+"px,0,0)")}))},preprocess:function(e,a,t,n){i.pluginHook("routerPreprocess",e,a,t,n),a=i.pluginProcess("preprocess",a),e&&e.params&&e.params.preprocess?(a=e.params.preprocess(a,t,n),"undefined"!=typeof a&&n(a)):i.params.preprocess?(a=i.params.preprocess(a,t,n),"undefined"!=typeof a&&n(a)):n(a)},preroute:function(e,a){return i.pluginHook("routerPreroute",e,a),i.params.preroute&&i.params.preroute(e,a)===!1||e&&e.params.preroute&&e.params.preroute(e,a)===!1?!0:!1},template7Render:function(e,a){{var t,n,r=a.url,s=a.content,p=a.content,d=a.context,c=a.contextName,u=a.template;a.pageName}if("string"==typeof s?r?i.template7Cache[r]?n=l.cache[r]:(n=l.compile(s),l.cache[r]=n):n=l.compile(s):u&&(n=u),d)t=d;else{if(c)if(c.indexOf(".")>=0){for(var m=c.split("."),f=l.data[m[0]],h=1;h<m.length;h++)m[h]&&(f=f[m[h]]);t=f}else t=l.data[c];if(!t&&r&&(t=l.data["url:"+r]),!t&&"string"==typeof s&&!u){var g=s.match(/(data-page=["'][^"^']*["'])/);if(g){var v=g[0].split("data-page=")[1].replace(/['"]/g,"");v&&(t=l.data["page:"+v])}}if(!t&&u&&l.templates)for(var b in l.templates)l.templates[b]===u&&(t=l.data[b]);t||(t={})}if(n&&t){if("function"==typeof t&&(t=t()),r){var w=o.parseUrlQuery(r);t.url_query={};for(var C in w)t.url_query[C]=w[C]}p=n(t)}return{content:p,context:t}}},i.router._load=function(e,a){function t(){e.allowPageChange=!0,n.removeClass("page-from-right-to-center page-on-right page-on-left").addClass("page-on-center"),r.removeClass("page-from-center-to-left page-on-center page-on-right").addClass("page-on-left"),u&&(d.removeClass("navbar-from-right-to-center navbar-on-left navbar-on-right").addClass("navbar-on-center"),p.removeClass("navbar-from-center-to-left navbar-on-center navbar-on-right").addClass("navbar-on-left")),i.pageAnimCallback("after",e,{pageContainer:n[0],url:f,position:"right",oldPage:r,newPage:n,query:a.query,fromPage:r&&r.length&&r[0].f7PageData}),i.params.pushState&&e.main&&i.pushStateClearQueue(),e.params.swipeBackPage||e.params.preloadPreviousPage||(e.params.domCache?(r.addClass("cached"),p.addClass("cached")):(0!==f.indexOf("#")||0!==n.attr("data-page").indexOf("smart-select-"))&&(i.pageRemoveCallback(e,r[0],"left"),u&&i.navbarRemoveCallback(e,r[0],c[0],p[0]),r.remove(),u&&p.remove())),e.params.uniqueHistory&&O&&e.refreshPreviousPage()}a=a||{};var n,r,s,l,p,d,c,u,m,f=a.url,h=a.content,g={content:a.content},v=a.template,b=a.pageName,w=o(e.container),C=o(e.pagesContainer),y=a.animatePages,x="undefined"==typeof f&&h||v,T=a.pushState;if("undefined"==typeof y&&(y=e.params.animatePages),i.pluginHook("routerLoad",e,a),(i.params.template7Pages&&"string"==typeof h||v)&&(g=i.router.template7Render(e,a),g.content&&!h&&(h=g.content)),i.router.temporaryDom.innerHTML="",!b)if(f||"string"==typeof h)i.router.temporaryDom.innerHTML=g.content;else if("length"in h&&h.length>1)for(var k=0;k<h.length;k++)o(i.router.temporaryDom).append(h[k]);else o(i.router.temporaryDom).append(h);if(m=a.reload&&(a.reloadPrevious?"left":"center"),n=b?C.find('.page[data-page="'+b+'"]'):i.router.findElement(".page",i.router.temporaryDom,e),!n||0===n.length||b&&e.activePage&&e.activePage.name===b)return void(e.allowPageChange=!0);if(n.addClass(a.reload?"page-on-"+m:"page-on-right"),s=C.children(".page:not(.cached)"),a.reload&&a.reloadPrevious&&1===s.length)return void(e.allowPageChange=!0);if(a.reload)r=s.eq(s.length-1);else{if(s.length>1){for(l=0;l<s.length-2;l++)e.params.domCache?o(s[l]).addClass("cached"):(i.pageRemoveCallback(e,s[l],"left"),o(s[l]).remove());e.params.domCache?o(s[l]).addClass("cached"):(i.pageRemoveCallback(e,s[l],"left"),o(s[l]).remove())}r=C.children(".page:not(.cached)")}if(e.params.domCache&&n.removeClass("cached"),e.params.dynamicNavbar)if(u=!0,d=b?w.find('.navbar-inner[data-page="'+b+'"]'):i.router.findElement(".navbar-inner",i.router.temporaryDom,e),d&&0!==d.length||(u=!1),c=w.find(".navbar"),a.reload)p=c.find(".navbar-inner:not(.cached):last-child");else if(p=c.find(".navbar-inner:not(.cached)"),p.length>0){for(l=0;l<p.length-1;l++)e.params.domCache?o(p[l]).addClass("cached"):(i.navbarRemoveCallback(e,s[l],c[0],p[l]),o(p[l]).remove());d||1!==p.length||(e.params.domCache?o(p[0]).addClass("cached"):(i.navbarRemoveCallback(e,s[0],c[0],p[0]),o(p[0]).remove())),p=c.find(".navbar-inner:not(.cached)")}if(u&&(d.addClass(a.reload?"navbar-on-"+m:"navbar-on-right"),e.params.domCache&&d.removeClass("cached"),n[0].f7RelatedNavbar=d[0],d[0].f7RelatedPage=n[0]),!f){var S=b||n.attr("data-page");f=x?"#"+i.params.dynamicPageUrl.replace(/{{name}}/g,S).replace(/{{index}}/g,e.history.length-(a.reload?1:0)):"#"+S,e.params.domCache||(e.contentCache[f]=h),e.params.domCache&&b&&(e.pagesCache[f]=b)}if(i.params.pushState&&!a.reloadPrevious&&e.main){"undefined"==typeof T&&(T=!0);var P=i.params.pushStateRoot||"",M=a.reload?"replaceState":"pushState";T&&(x||b?x&&h?history[M]({content:h,url:f,viewIndex:i.views.indexOf(e)},"",P+i.params.pushStateSeparator+f):b&&history[M]({pageName:b,url:f,viewIndex:i.views.indexOf(e)},"",P+i.params.pushStateSeparator+f):history[M]({url:f,viewIndex:i.views.indexOf(e)},"",P+i.params.pushStateSeparator+f))}if(e.url=f,a.reload){var I=e.history[e.history.length-(a.reloadPrevious?2:1)];I&&0===I.indexOf("#")&&I in e.contentCache&&I!==f&&(e.contentCache[I]=null,delete e.contentCache[I]),e.history[e.history.length-(a.reloadPrevious?2:1)]=f}else e.history.push(f);var O=!1;if(e.params.uniqueHistory){var E=e.history,L=f;if(e.params.uniqueHistoryIgnoreGetParameters)for(E=[],L=f.split("?")[0],l=0;l<e.history.length;l++)E.push(e.history[l].split("?")[0]);E.indexOf(L)!==E.lastIndexOf(L)&&(e.history=e.history.slice(0,E.indexOf(L)),e.history.push(f),O=!0)}if(a.reloadPrevious?(r=r.prev(".page"),n.insertBefore(r),u&&(p=p.prev(".navbar-inner"),d.insertAfter(p))):(C.append(n[0]),u&&c.append(d[0])),a.reload&&(e.params.domCache&&e.initialPages.indexOf(r[0])>=0?(r.addClass("cached"),u&&p.addClass("cached")):(i.pageRemoveCallback(e,r[0],m),u&&i.navbarRemoveCallback(e,r[0],c[0],p[0]),r.remove(),u&&p.remove())),i.pageInitCallback(e,{pageContainer:n[0],url:f,position:a.reload?m:"right",navbarInnerContainer:u?d&&d[0]:void 0,oldNavbarInnerContainer:u?p&&p[0]:void 0,context:g.context,query:a.query,fromPage:r&&r.length&&r[0].f7PageData,reload:a.reload,reloadPrevious:a.reloadPrevious}),u&&i.navbarInitCallback(e,n[0],c[0],d[0],f,a.reload?m:"right"),a.reload)return e.allowPageChange=!0,void(O&&e.refreshPreviousPage());u&&y&&i.router.prepareNavbar(d,p,"right");n[0].clientLeft;i.pageAnimCallback("before",e,{pageContainer:n[0],url:f,position:"right",oldPage:r,newPage:n,query:a.query,fromPage:r&&r.length&&r[0].f7PageData}),y?(i.params.material&&i.params.materialPageLoadDelay?setTimeout(function(){i.router.animatePages(r,n,"to-left",e)},i.params.materialPageLoadDelay):i.router.animatePages(r,n,"to-left",e),u&&setTimeout(function(){i.router.animateNavbars(p,d,"to-left",e)},0),n.animationEnd(function(e){t()})):(u&&d.find(".sliding, .sliding .back .icon").transform(""),t())},i.router.load=function(e,a){function t(t){i.router.preprocess(e,t,n,function(t){a.content=t,i.router._load(e,a)})}if(i.router.preroute(e,a))return!1;a=a||{};var n=a.url,r=a.content,s=a.pageName;s&&s.indexOf("?")>0&&(a.query=o.parseUrlQuery(s),a.pageName=s=s.split("?")[0]);var l=a.template;return e.params.reloadPages===!0&&(a.reload=!0),e.allowPageChange&&(!n||e.url!==n||a.reload||e.params.allowDuplicateUrls)?(e.allowPageChange=!1,i.xhr&&e.xhr&&e.xhr===i.xhr&&(i.xhr.abort(),i.xhr=!1),r||s?void t(r):l?void i.router._load(e,a):a.url&&"#"!==a.url?void i.get(a.url,e,a.ignoreCache,function(a,n){return n?void(e.allowPageChange=!0):void t(a)}):void(e.allowPageChange=!0)):!1},i.router._back=function(e,a){function t(){i.pageBackCallback("after",e,{pageContainer:l[0],url:h,position:"center",oldPage:l,newPage:p}),i.pageAnimCallback("after",e,{pageContainer:p[0],url:h,position:"left",oldPage:l,newPage:p,query:a.query,fromPage:l&&l.length&&l[0].f7PageData}),i.router.afterBack(e,l[0],p[0])}function n(){i.pageBackCallback("before",e,{pageContainer:l[0],url:h,position:"center",oldPage:l,newPage:p}),i.pageAnimCallback("before",e,{pageContainer:p[0],url:h,position:"left",oldPage:l,newPage:p,query:a.query,fromPage:l&&l.length&&l[0].f7PageData}),w?(i.router.animatePages(p,l,"to-right",e),f&&setTimeout(function(){i.router.animateNavbars(c,d,"to-right",e)},0),p.animationEnd(function(){t()})):(f&&c.find(".sliding, .sliding .back .icon").transform(""),t())}function r(){if(i.router.temporaryDom.innerHTML="",h||"string"==typeof g)i.router.temporaryDom.innerHTML=v.content;else if("length"in g&&g.length>1)for(var a=0;a<g.length;a++)o(i.router.temporaryDom).append(g[a]);else o(i.router.temporaryDom).append(g);p=i.router.findElement(".page",i.router.temporaryDom,e),e.params.dynamicNavbar&&(c=i.router.findElement(".navbar-inner",i.router.temporaryDom,e))}function s(){if(!p||0===p.length)return void(e.allowPageChange=!0);if(e.params.dynamicNavbar&&"undefined"==typeof f&&(f=c&&0!==c.length?!0:!1),p.addClass("page-on-left").removeClass("cached"),f&&(u=k.find(".navbar"),m=k.find(".navbar-inner:not(.cached)"),c.addClass("navbar-on-left").removeClass("cached")),x){var t,r;if(t=o(P[P.length-2]),f&&(r=o(t[0]&&t[0].f7RelatedNavbar||m[m.length-2])),e.params.domCache&&e.initialPages.indexOf(t[0])>=0)t.length&&t[0]!==p[0]&&t.addClass("cached"),f&&r.length&&r[0]!==c[0]&&r.addClass("cached");else{var s=f&&r.length;t.length?(i.pageRemoveCallback(e,t[0],"right"),s&&i.navbarRemoveCallback(e,t[0],u[0],r[0]),t.remove(),s&&r.remove()):s&&(i.navbarRemoveCallback(e,t[0],u[0],r[0]),r.remove())}P=S.children(".page:not(.cached)"),f&&(m=k.find(".navbar-inner:not(.cached)")),e.history.indexOf(h)>=0?e.history=e.history.slice(0,e.history.indexOf(h)+2):e.history[[e.history.length-2]]?e.history[e.history.length-2]=h:e.history.unshift(h)}if(l=o(P[P.length-1]),e.params.domCache&&l[0]===p[0]&&(l=S.children(".page.page-on-center"),0===l.length&&e.activePage&&(l=o(e.activePage.container))),f&&!d&&(d=o(m[m.length-1]),e.params.domCache&&(d[0]===c[0]&&(d=u.children(".navbar-inner.navbar-on-center:not(.cached)")),0===d.length&&(d=u.children('.navbar-inner[data-page="'+l.attr("data-page")+'"]'))),(0===d.length||c[0]===d[0])&&(f=!1)),f&&(M&&c.insertBefore(d),c[0].f7RelatedPage=p[0],p[0].f7RelatedNavbar=c[0]),M&&p.insertBefore(l),i.pageInitCallback(e,{pageContainer:p[0],url:h,position:"left",navbarInnerContainer:f?c[0]:void 0,oldNavbarInnerContainer:f?d&&d[0]:void 0,context:v.context,query:a.query,fromPage:l&&l.length&&l[0].f7PageData,preloadOnly:C}),f&&i.navbarInitCallback(e,p[0],u[0],c[0],h,"right"),f&&c.hasClass("navbar-on-left")&&w&&i.router.prepareNavbar(c,d,"left"),C)return void(e.allowPageChange=!0);e.url=h;p[0].clientLeft;n(),i.params.pushState&&e.main&&("undefined"==typeof y&&(y=!0),!C&&history.state&&y&&history.back())}a=a||{};var l,p,d,c,u,m,f,h=a.url,g=a.content,v={content:a.content},b=a.template,w=a.animatePages,C=a.preloadOnly,y=a.pushState,x=(a.ignoreCache,a.force),T=a.pageName,k=o(e.container),S=o(e.pagesContainer),P=S.children(".page:not(.cached)"),M=!0;return"undefined"==typeof w&&(w=e.params.animatePages),i.pluginHook("routerBack",e,a),(i.params.template7Pages&&"string"==typeof g||b)&&(v=i.router.template7Render(e,a),v.content&&!g&&(g=v.content)),P.length>1&&!x?C?void(e.allowPageChange=!0):(e.url=e.history[e.history.length-2],h=e.url,p=o(P[P.length-2]),l=o(P[P.length-1]),e.params.dynamicNavbar&&(f=!0,m=k.find(".navbar-inner:not(.cached)"),c=o(m[0]),d=o(m[1]),(0===c.length||0===d.length||d[0]===c[0])&&(f=!1)),M=!1,void s()):x?h&&h===e.url||T&&e.activePage&&e.activePage.name===T?void(e.allowPageChange=!0):g?(r(),void s()):T&&e.params.domCache?(T&&(h="#"+T),p=o(k).find('.page[data-page="'+T+'"]'),p[0].f7PageData&&p[0].f7PageData.url&&(h=p[0].f7PageData.url),e.params.dynamicNavbar&&(c=o(k).find('.navbar-inner[data-page="'+T+'"]'),0===c.length&&(c=o(p[0].f7RelatedNavbar))),void s()):void(e.allowPageChange=!0):(C||(e.url=e.history[e.history.length-2],h=e.url),g?(r(),void s()):T?(p=o(k).find('.page[data-page="'+T+'"]'),e.params.dynamicNavbar&&(c=o(k).find('.navbar-inner[data-page="'+T+'"]')),void s()):void(e.allowPageChange=!0))},i.router.back=function(e,a){function t(t){i.router.preprocess(e,t,n,function(t){a.content=t,i.router._back(e,a)})}if(i.router.preroute(e,a))return!1;a=a||{};var n=a.url,r=a.content,s=a.pageName;s&&s.indexOf("?")>0&&(a.query=o.parseUrlQuery(s),a.pageName=s=s.split("?")[0]);var l=a.force;if(!e.allowPageChange)return!1;e.allowPageChange=!1,i.xhr&&e.xhr&&e.xhr===i.xhr&&(i.xhr.abort(),i.xhr=!1);var p=o(e.pagesContainer).find(".page:not(.cached)");if(p.length>1&&!l)return void i.router._back(e,a);if(l){if(!n&&r)return void t(r);if(!n&&s)return s&&(n="#"+s),void t();if(n)return void i.get(a.url,e,a.ignoreCache,function(a,n){return n?void(e.allowPageChange=!0):void t(a)})}else{if(n=a.url=e.history[e.history.length-2],!n)return void(e.allowPageChange=!0);if(0===n.indexOf("#")&&e.contentCache[n])return void t(e.contentCache[n]);if(0===n.indexOf("#")&&e.params.domCache)return s||(a.pageName=n.split("#")[1]),void t();if(0!==n.indexOf("#"))return void i.get(a.url,e,a.ignoreCache,function(a,n){return n?void(e.allowPageChange=!0):void t(a)})}e.allowPageChange=!0},i.router.afterBack=function(e,a,t){a=o(a),t=o(t),e.params.domCache&&e.initialPages.indexOf(a[0])>=0?a.removeClass("page-from-center-to-right").addClass("cached"):(i.pageRemoveCallback(e,a[0],"right"),a.remove()),t.removeClass("page-from-left-to-center page-on-left").addClass("page-on-center"),e.allowPageChange=!0;var n,r=e.history.pop();if(e.params.dynamicNavbar){var s=o(e.container).find(".navbar-inner:not(.cached)"),l=o(a[0].f7RelatedNavbar||s[1]);e.params.domCache&&e.initialNavbars.indexOf(l[0])>=0?l.removeClass("navbar-from-center-to-right").addClass("cached"):(i.navbarRemoveCallback(e,a[0],void 0,l[0]),l.remove()),n=o(s[0]).removeClass("navbar-on-left navbar-from-left-to-center").addClass("navbar-on-center")}if(e.params.domCache&&o(e.container).find(".page.cached").each(function(){var a=o(this),t=(a.index(),a[0].f7PageData&&a[0].f7PageData.url);t&&e.history.indexOf(t)<0&&e.initialPages.indexOf(this)<0&&(i.pageRemoveCallback(e,a[0],"right"),a[0].f7RelatedNavbar&&e.params.dynamicNavbar&&i.navbarRemoveCallback(e,a[0],void 0,a[0].f7RelatedNavbar),a.remove(),a[0].f7RelatedNavbar&&e.params.dynamicNavbar&&o(a[0].f7RelatedNavbar).remove())}),!e.params.domCache&&r&&r.indexOf("#")>-1&&r in e.contentCache&&(e.contentCache[r]=null,delete e.contentCache[r]),i.params.pushState&&e.main&&i.pushStateClearQueue(),e.params.preloadPreviousPage)if(e.params.domCache&&e.history.length>1){var p,d,c=e.history[e.history.length-2];c&&e.pagesCache[c]?(p=o(e.container).find('.page[data-page="'+e.pagesCache[c]+'"]'),p.next(".page")[0]!==t[0]&&p.insertBefore(t),n&&(d=o(e.container).find('.navbar-inner[data-page="'+e.pagesCache[c]+'"]'),d&&0!==d.length||(d=n.prev(".navbar-inner.cached")),d.next(".navbar-inner")[0]!==n[0]&&d.insertBefore(n))):(p=t.prev(".page.cached"),n&&(d=n.prev(".navbar-inner.cached"))),p&&p.length>0&&p.removeClass("cached page-on-right page-on-center").addClass("page-on-left"),d&&d.length>0&&d.removeClass("cached navbar-on-right navbar-on-center").addClass("navbar-on-left")}else i.router.back(e,{preloadOnly:!0})};var f=document.createElement("div");i.modalStack=[],i.modalStackClearQueue=function(){i.modalStack.length&&i.modalStack.shift()()},i.modal=function(e){e=e||{};var a="";if(i.params.modalTemplate)i._compiledTemplates.modal||(i._compiledTemplates.modal=l.compile(i.params.modalTemplate)),a=i._compiledTemplates.modal(e);else{var t="";if(e.buttons&&e.buttons.length>0)for(var n=0;n<e.buttons.length;n++)t+='<span class="modal-button'+(e.buttons[n].bold?" modal-button-bold":"")+'">'+e.buttons[n].text+"</span>";var r=e.title?'<div class="modal-title">'+e.title+"</div>":"",s=e.text?'<div class="modal-text">'+e.text+"</div>":"",p=e.afterText?e.afterText:"",d=e.buttons&&0!==e.buttons.length?"":"modal-no-buttons",c=e.verticalButtons?"modal-buttons-vertical":"";a='<div class="modal '+d+" "+(e.cssClass||"")+'"><div class="modal-inner">'+(r+s+p)+'</div><div class="modal-buttons '+c+'">'+t+"</div></div>"}f.innerHTML=a;var u=o(f).children();return o("body").append(u[0]),u.find(".modal-button").each(function(a,t){o(t).on("click",function(t){e.buttons[a].close!==!1&&i.closeModal(u),e.buttons[a].onClick&&e.buttons[a].onClick(u,t),e.onClick&&e.onClick(u,a)})}),i.openModal(u),u[0]},i.alert=function(e,a,t){return"function"==typeof a&&(t=arguments[1],a=void 0),i.modal({text:e||"",title:"undefined"==typeof a?i.params.modalTitle:a,buttons:[{text:i.params.modalButtonOk,bold:!0,onClick:t}]})},i.confirm=function(e,a,t,n){return"function"==typeof a&&(n=arguments[2],t=arguments[1],a=void 0),i.modal({text:e||"",title:"undefined"==typeof a?i.params.modalTitle:a,buttons:[{text:i.params.modalButtonCancel,onClick:n},{text:i.params.modalButtonOk,bold:!0,onClick:t}]})},i.prompt=function(e,a,t,n){return"function"==typeof a&&(n=arguments[2],t=arguments[1],a=void 0),i.modal({text:e||"",title:"undefined"==typeof a?i.params.modalTitle:a,afterText:'<div class="input-field"><input type="text" class="modal-text-input"></div>',buttons:[{text:i.params.modalButtonCancel},{text:i.params.modalButtonOk,bold:!0}],onClick:function(e,a){0===a&&n&&n(o(e).find(".modal-text-input").val()),1===a&&t&&t(o(e).find(".modal-text-input").val())}})},i.modalLogin=function(e,a,t,n){return"function"==typeof a&&(n=arguments[2],t=arguments[1],a=void 0),i.modal({text:e||"",title:"undefined"==typeof a?i.params.modalTitle:a,afterText:'<div class="input-field modal-input-double"><input type="text" name="modal-username" placeholder="'+i.params.modalUsernamePlaceholder+'" class="modal-text-input"></div><div class="input-field modal-input-double"><input type="password" name="modal-password" placeholder="'+i.params.modalPasswordPlaceholder+'" class="modal-text-input"></div>',buttons:[{text:i.params.modalButtonCancel},{text:i.params.modalButtonOk,bold:!0}],onClick:function(e,a){var r=o(e).find('.modal-text-input[name="modal-username"]').val(),i=o(e).find('.modal-text-input[name="modal-password"]').val();0===a&&n&&n(r,i),1===a&&t&&t(r,i)}})},i.modalPassword=function(e,a,t,n){return"function"==typeof a&&(n=arguments[2],t=arguments[1],a=void 0),i.modal({text:e||"",title:"undefined"==typeof a?i.params.modalTitle:a,afterText:'<div class="input-field"><input type="password" name="modal-password" placeholder="'+i.params.modalPasswordPlaceholder+'" class="modal-text-input"></div>',buttons:[{text:i.params.modalButtonCancel},{text:i.params.modalButtonOk,bold:!0}],onClick:function(e,a){var r=o(e).find('.modal-text-input[name="modal-password"]').val();0===a&&n&&n(r),1===a&&t&&t(r)}})},i.showPreloader=function(e){return i.modal({title:e||i.params.modalPreloaderTitle,text:'<div class="preloader">'+(i.params.material?i.params.materialPreloaderSvg:"")+"</div>",cssClass:"modal-preloader"})},i.hidePreloader=function(){i.closeModal(".modal.modal-in")},i.showIndicator=function(){o("body").append('<div class="preloader-indicator-overlay"></div><div class="preloader-indicator-modal"><span class="preloader preloader-white">'+(i.params.material?i.params.materialPreloaderSvg:"")+"</span></div>")},i.hideIndicator=function(){o(".preloader-indicator-overlay, .preloader-indicator-modal").remove()},i.actions=function(e,a){var t,n,r,s=!1;1===arguments.length?a=e:i.device.ios?i.device.ipad&&(s=!0):o(window).width()>=768&&(s=!0),a=a||[],a.length>0&&!o.isArray(a[0])&&(a=[a]);var p;if(s){var d=i.params.modalActionsToPopoverTemplate||'<div class="popover actions-popover"><div class="popover-inner">{{#each this}}<div class="list-block"><ul>{{#each this}}{{#if label}}<li class="actions-popover-label {{#if color}}color-{{color}}{{/if}} {{#if bold}}actions-popover-bold{{/if}}">{{text}}</li>{{else}}<li><a href="#" class="item-link list-button {{#if color}}color-{{color}}{{/if}} {{#if bg}}bg-{{bg}}{{/if}} {{#if bold}}actions-popover-bold{{/if}} {{#if disabled}}disabled{{/if}}">{{text}}</a></li>{{/if}}{{/each}}</ul></div>{{/each}}</div></div>';i._compiledTemplates.actionsToPopover||(i._compiledTemplates.actionsToPopover=l.compile(d));var c=i._compiledTemplates.actionsToPopover(a);t=o(i.popover(c,e,!0)),n=".list-block ul",r=".list-button"}else{if(i.params.modalActionsTemplate)i._compiledTemplates.actions||(i._compiledTemplates.actions=l.compile(i.params.modalActionsTemplate)),p=i._compiledTemplates.actions(a);else{for(var u="",m=0;m<a.length;m++)for(var h=0;h<a[m].length;h++){0===h&&(u+='<div class="actions-modal-group">');var g=a[m][h],v=g.label?"actions-modal-label":"actions-modal-button";g.bold&&(v+=" actions-modal-button-bold"),g.color&&(v+=" color-"+g.color),g.bg&&(v+=" bg-"+g.bg),g.disabled&&(v+=" disabled"),u+='<div class="'+v+'">'+g.text+"</div>",h===a[m].length-1&&(u+="</div>")}p='<div class="actions-modal">'+u+"</div>"}f.innerHTML=p,t=o(f).children(),o("body").append(t[0]),n=".actions-modal-group",r=".actions-modal-button"}var b=t.find(n);return b.each(function(e,n){var l=e;o(n).children().each(function(e,n){var p,d=e,c=a[l][d];!s&&o(n).is(r)&&(p=o(n)),s&&o(n).find(r).length>0&&(p=o(n).find(r)),p&&p.on("click",function(e){c.close!==!1&&i.closeModal(t),c.onClick&&c.onClick(t,e)})})}),s||i.openModal(t),t[0]},i.popover=function(e,a,t){function n(){e.css({left:"",top:""});var t,n,r,i=e.width(),l=e.height(),p=0;s?e.removeClass("popover-on-left popover-on-right popover-on-top popover-on-bottom").css({left:"",top:""}):(t=e.find(".popover-angle"),p=t.width()/2,t.removeClass("on-left on-right on-top on-bottom").css({left:"",top:""}));var d=a.outerWidth(),c=a.outerHeight(),u=a.offset(),m=a.parents(".page");m.length>0&&(u.top=u.top-m[0].scrollTop);var f=o(window).height(),h=o(window).width(),g=0,v=0,b=0,w=s?"bottom":"top";s?(l<f-u.top-c?(w="bottom",g=u.top):l<u.top?(g=u.top-l+c,w="top"):(w="bottom",g=u.top),0>=g?g=8:g+l>=f&&(g=f-l-8),v=u.left,v+i>=h-8&&(v=u.left+d-i-8),8>v&&(v=8),"top"===w&&e.addClass("popover-on-top"),"bottom"===w&&e.addClass("popover-on-bottom")):(l+p<u.top?g=u.top-l-p:l+p<f-u.top-c?(w="bottom",g=u.top+c+p):(w="middle",g=c/2+u.top-l/2,b=g,0>=g?g=5:g+l>=f&&(g=f-l-5),b-=g),"top"===w||"bottom"===w?(v=d/2+u.left-i/2,b=v,5>v&&(v=5),v+i>h&&(v=h-i-5),"top"===w&&t.addClass("on-bottom"),"bottom"===w&&t.addClass("on-top"),b-=v,n=i/2-p+b,n=Math.max(Math.min(n,i-2*p-6),6),t.css({left:n+"px"})):"middle"===w&&(v=u.left-i-p,t.addClass("on-right"),(5>v||v+i>h)&&(5>v&&(v=u.left+d+p),v+i>h&&(v=h-i-5),t.removeClass("on-right").addClass("on-left")),r=l/2-p+b,r=Math.max(Math.min(r,l-2*p-6),6),t.css({top:r+"px"}))),e.css({top:g+"px",left:v+"px"})}if("undefined"==typeof t&&(t=!0),"string"==typeof e&&e.indexOf("<")>=0){var r=document.createElement("div");if(r.innerHTML=e.trim(),!(r.childNodes.length>0))return!1;e=r.childNodes[0],t&&e.classList.add("remove-on-close"),o("body").append(e)}if(e=o(e),a=o(a),0===e.length||0===a.length)return!1;0!==e.find(".popover-angle").length||i.params.material||e.append('<div class="popover-angle"></div>'),e.show();var s=i.params.material;return n(),o(window).on("resize",n),e.on("close",function(){o(window).off("resize",n)}),i.openModal(e),e[0]},i.popup=function(e,a){if("undefined"==typeof a&&(a=!0),"string"==typeof e&&e.indexOf("<")>=0){var t=document.createElement("div");if(t.innerHTML=e.trim(),!(t.childNodes.length>0))return!1;e=t.childNodes[0],a&&e.classList.add("remove-on-close"),o("body").append(e)}return e=o(e),0===e.length?!1:(e.show(),i.openModal(e),e[0])},i.pickerModal=function(e,a){if("undefined"==typeof a&&(a=!0),"string"==typeof e&&e.indexOf("<")>=0){if(e=o(e),!(e.length>0))return!1;a&&e.addClass("remove-on-close"),o("body").append(e[0])}return e=o(e),0===e.length?!1:(e.show(),i.openModal(e),e[0])},i.loginScreen=function(e){return e||(e=".login-screen"),e=o(e),0===e.length?!1:(e.show(),i.openModal(e),e[0])},i.openModal=function(e){e=o(e);var a=e.hasClass("modal");if(o(".modal.modal-in:not(.modal-out)").length&&i.params.modalStack&&a)return void i.modalStack.push(function(){i.openModal(e)});if(!0!==e.data("f7-modal-shown")){e.data("f7-modal-shown",!0),e.once("close",function(){e.removeData("f7-modal-shown")});var t=(e.hasClass("popover"),e.hasClass("popup")),n=e.hasClass("login-screen"),r=e.hasClass("picker-modal");a&&(e.show(),e.css({marginTop:-Math.round(e.outerHeight()/2)+"px"}));var s;n||r||(0!==o(".modal-overlay").length||t||o("body").append('<div class="modal-overlay"></div>'),0===o(".popup-overlay").length&&t&&o("body").append('<div class="popup-overlay"></div>'),s=o(t?".popup-overlay":".modal-overlay")),i.params.material&&r&&e.hasClass("picker-calendar")&&(0!==o(".picker-modal-overlay").length||t||o("body").append('<div class="picker-modal-overlay"></div>'),s=o(".picker-modal-overlay"));{e[0].clientLeft}return e.trigger("open"),r&&o("body").addClass("with-picker-modal"),e.find("."+i.params.viewClass).length>0&&(e.find(".page").each(function(){i.initPageWithCallback(this)}),e.find(".navbar").each(function(){i.initNavbarWithCallback(this);

})),n||r||s.addClass("modal-overlay-visible"),i.params.material&&r&&s&&s.addClass("modal-overlay-visible"),e.removeClass("modal-out").addClass("modal-in").transitionEnd(function(a){e.trigger(e.hasClass("modal-out")?"closed":"opened")}),!0}},i.closeModal=function(e){if(e=o(e||".modal-in"),"undefined"==typeof e||0!==e.length){var a=e.hasClass("modal"),t=e.hasClass("popover"),n=e.hasClass("popup"),r=e.hasClass("login-screen"),s=e.hasClass("picker-modal"),l=e.hasClass("remove-on-close"),p=o(n?".popup-overlay":s&&i.params.material?".picker-modal-overlay":".modal-overlay");return n?e.length===o(".popup.modal-in").length&&p.removeClass("modal-overlay-visible"):p&&p.length>0&&p.removeClass("modal-overlay-visible"),e.trigger("close"),s&&(o("body").removeClass("with-picker-modal"),o("body").addClass("picker-modal-closing")),!t||i.params.material?(e.removeClass("modal-in").addClass("modal-out").transitionEnd(function(a){e.trigger(e.hasClass("modal-out")?"closed":"opened"),s&&o("body").removeClass("picker-modal-closing"),n||r||s||t?(e.removeClass("modal-out").hide(),l&&e.length>0&&e.remove()):e.remove()}),a&&i.params.modalStack&&i.modalStackClearQueue()):(e.removeClass("modal-in modal-out").trigger("closed").hide(),l&&e.remove()),!0}},i.allowPanelOpen=!0,i.openPanel=function(e){function a(){r.transitionEnd(function(e){o(e.target).is(r)?(t.trigger(t.hasClass("active")?"opened":"closed"),i.params.material&&o(".panel-overlay").css({display:""}),i.allowPanelOpen=!0):a()})}if(!i.allowPanelOpen)return!1;var t=o(".panel-"+e);if(0===t.length||t.hasClass("active"))return!1;i.closePanel(),i.allowPanelOpen=!1;var n=t.hasClass("panel-reveal")?"reveal":"cover";t.css({display:"block"}).addClass("active"),t.trigger("open"),i.params.material&&o(".panel-overlay").show(),t.find("."+i.params.viewClass).length>0&&i.sizeNavbars&&i.sizeNavbars(t.find("."+i.params.viewClass)[0]);var r=(t[0].clientLeft,"reveal"===n?o("."+i.params.viewsClass):t);return a(),o("body").addClass("with-panel-"+e+"-"+n),!0},i.closePanel=function(){var e=o(".panel.active");if(0===e.length)return!1;var a=e.hasClass("panel-reveal")?"reveal":"cover",t=e.hasClass("panel-left")?"left":"right";e.removeClass("active");var n="reveal"===a?o("."+i.params.viewsClass):e;e.trigger("close"),i.allowPanelOpen=!1,n.transitionEnd(function(){e.hasClass("active")||(e.css({display:""}),e.trigger("closed"),o("body").removeClass("panel-closing"),i.allowPanelOpen=!0)}),o("body").addClass("panel-closing").removeClass("with-panel-"+t+"-"+a)},i.initSwipePanels=function(){function e(e){if(i.allowPanelOpen&&(i.params.swipePanel||i.params.swipePanelOnlyClose)&&!s&&!(o(".modal-in, .photo-browser-in").length>0||!i.params.swipePanelCloseOpposite&&!i.params.swipePanelOnlyClose&&o(".panel.active").length>0&&!n.hasClass("active"))){if(w.x="touchstart"===e.type?e.targetTouches[0].pageX:e.pageX,w.y="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY,i.params.swipePanelCloseOpposite||i.params.swipePanelOnlyClose){if(o(".panel.active").length>0)r=o(".panel.active").hasClass("panel-left")?"left":"right";else{if(i.params.swipePanelOnlyClose)return;r=i.params.swipePanel}if(!r)return}if(n=o(".panel.panel-"+r),f=n.hasClass("active"),i.params.swipePanelActiveArea&&!f){if("left"===r&&w.x>i.params.swipePanelActiveArea)return;if("right"===r&&w.x<window.innerWidth-i.params.swipePanelActiveArea)return}l=!1,s=!0,p=void 0,d=(new Date).getTime(),v=void 0}}function a(e){if(s&&!e.f7PreventPanelSwipe){var a="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,t="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY;if("undefined"==typeof p&&(p=!!(p||Math.abs(t-w.y)>Math.abs(a-w.x))),p)return void(s=!1);if(!v&&(v=a>w.x?"to-right":"to-left","left"===r&&"to-left"===v&&!n.hasClass("active")||"right"===r&&"to-right"===v&&!n.hasClass("active")))return void(s=!1);if(i.params.swipePanelNoFollow){var o=(new Date).getTime()-d;return 300>o&&("to-left"===v&&("right"===r&&i.openPanel(r),"left"===r&&n.hasClass("active")&&i.closePanel()),"to-right"===v&&("left"===r&&i.openPanel(r),"right"===r&&n.hasClass("active")&&i.closePanel())),s=!1,void(l=!1)}l||(g=n.hasClass("panel-cover")?"cover":"reveal",f||(n.show(),b.show()),h=n[0].offsetWidth,n.transition(0),n.find("."+i.params.viewClass).length>0&&i.sizeNavbars&&i.sizeNavbars(n.find("."+i.params.viewClass)[0])),l=!0,e.preventDefault();var y=f?0:-i.params.swipePanelThreshold;"right"===r&&(y=-y),c=a-w.x+y,"right"===r?(u=c-(f?h:0),u>0&&(u=0),-h>u&&(u=-h)):(u=c+(f?h:0),0>u&&(u=0),u>h&&(u=h)),"reveal"===g?(C.transform("translate3d("+u+"px,0,0)").transition(0),b.transform("translate3d("+u+"px,0,0)").transition(0),i.pluginHook("swipePanelSetTransform",C[0],n[0],Math.abs(u/h))):(n.transform("translate3d("+u+"px,0,0)").transition(0),i.params.material&&(b.transition(0),m=Math.abs(u/h),b.css({opacity:m})),i.pluginHook("swipePanelSetTransform",C[0],n[0],Math.abs(u/h)))}}function t(e){if(!s||!l)return s=!1,void(l=!1);s=!1,l=!1;var a,t=(new Date).getTime()-d,p=0===u||Math.abs(u)===h;if(a=f?u===-h?"reset":300>t&&Math.abs(u)>=0||t>=300&&Math.abs(u)<=h/2?"left"===r&&u===h?"reset":"swap":"reset":0===u?"reset":300>t&&Math.abs(u)>0||t>=300&&Math.abs(u)>=h/2?"swap":"reset","swap"===a&&(i.allowPanelOpen=!0,f?(i.closePanel(),p&&(n.css({display:""}),o("body").removeClass("panel-closing"))):i.openPanel(r),p&&(i.allowPanelOpen=!0)),"reset"===a)if(f)i.allowPanelOpen=!0,i.openPanel(r);else if(i.closePanel(),p)i.allowPanelOpen=!0,n.css({display:""});else{var c="reveal"===g?C:n;o("body").addClass("panel-closing"),c.transitionEnd(function(){i.allowPanelOpen=!0,n.css({display:""}),o("body").removeClass("panel-closing")})}"reveal"===g&&(C.transition(""),C.transform("")),n.transition("").transform(""),b.css({display:""}).transform("").transition("").css("opacity","")}var n,r;if(i.params.swipePanel){if(n=o(".panel.panel-"+i.params.swipePanel),r=i.params.swipePanel,0===n.length)return}else{if(!i.params.swipePanelOnlyClose)return;if(0===o(".panel").length)return}var s,l,p,d,c,u,m,f,h,g,v,b=o(".panel-overlay"),w={},C=o("."+i.params.viewsClass);o(document).on(i.touchEvents.start,e),o(document).on(i.touchEvents.move,a),o(document).on(i.touchEvents.end,t)},i.initImagesLazyLoad=function(e){function a(e){function t(){e.removeClass("lazy").addClass("lazy-loaded"),n?e.css("background-image","url("+r+")"):e.attr("src",r),i.params.imagesLazyLoadSequential&&(u=!1,c.length>0&&a(c.shift()))}e=o(e);var n=e.attr("data-background"),r=n?n:e.attr("data-src");if(r){if(i.params.imagesLazyLoadSequential&&u)return void(c.indexOf(e[0])<0&&c.push(e[0]));u=!0;var s=new Image;s.onload=t,s.onerror=t,s.src=r}}function t(){l=e.find(".lazy"),l.each(function(e,t){t=o(t),n(t[0])&&a(t)})}function n(e){var a=e.getBoundingClientRect(),t=i.params.imagesLazyLoadThreshold||0;return a.top>=0-t&&a.left>=0-t&&a.top<=window.innerHeight+t&&a.left<=window.innerWidth+t}function r(a){var n=a?"off":"on";l[n]("lazy",t),e[n]("lazy",t),p[n]("lazy",t),p[n]("scroll",t),o(window)[n]("resize",t)}function s(){r(!0)}e=o(e);var l;if(e.hasClass("lazy")?(l=e,e=l.parents(".page")):l=e.find(".lazy"),0!==l.length){var p;if(e.hasClass("page-content")?(p=e,e=e.parents(".page")):p=e.find(".page-content"),0!==p.length){var d="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEXCwsK592mkAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==";"string"==typeof i.params.imagesLazyLoadPlaceholder&&(d=i.params.imagesLazyLoadPlaceholder),i.params.imagesLazyLoadPlaceholder!==!1&&l.each(function(){o(this).attr("data-src")&&o(this).attr("src",d)});var c=[],u=!1;e[0].f7DestroyImagesLazyLoad=s,r(),e.hasClass("page")&&e.once("pageBeforeRemove",s),t(),e.once("pageAfterAnimation",t)}}},i.destroyImagesLazyLoad=function(e){e=o(e),e.length>0&&e[0].f7DestroyImagesLazyLoad&&e[0].f7DestroyLazyLoad()},i.reinitImagesLazyLoad=function(e){e=o(e),e.length>0&&e.trigger("lazy")},i.initPageMaterialPreloader=function(e){o(e).find(".preloader").each(function(){0===o(this).children("svg").length&&o(this).html(i.params.materialPreloaderSvg)})};var h=function(e,a){var t={autoLayout:!0,newMessagesFirst:!1,messageTemplate:'{{#if day}}<div class="messages-date">{{day}} {{#if time}}, <span>{{time}}</span>{{/if}}</div>{{/if}}<div class="message message-{{type}} {{#if hasImage}}message-pic{{/if}} {{#if avatar}}message-with-avatar{{/if}} {{#if position}}message-appear-from-{{position}}{{/if}}">{{#if name}}<div class="message-name">{{name}}</div>{{/if}}<div class="message-text">{{text}}{{#if date}}<div class="message-date">{{date}}</div>{{/if}}</div>{{#if avatar}}<div class="message-avatar" style="background-image:url({{avatar}})"></div>{{/if}}{{#if label}}<div class="message-label">{{label}}</div>{{/if}}</div>'};a=a||{};for(var n in t)("undefined"==typeof a[n]||null===a[n])&&(a[n]=t[n]);var r=this;return r.params=a,r.container=o(e),0!==r.container.length?(r.params.autoLayout&&r.container.addClass("messages-auto-layout"),r.params.newMessagesFirst&&r.container.addClass("messages-new-first"),r.pageContainer=r.container.parents(".page").eq(0),r.pageContent=r.pageContainer.find(".page-content"),r.template=Template7.compile(r.params.messageTemplate),r.layout=function(){r.container.hasClass("messages-auto-layout")||r.container.addClass("messages-auto-layout"),r.container.find(".message").each(function(){var e=o(this);e.find(".message-text img").length>0&&e.addClass("message-pic"),e.find(".message-avatar").length>0&&e.addClass("message-with-avatar")}),r.container.find(".message").each(function(){var e=o(this),a=e.hasClass("message-sent"),t=e.next(".message-"+(a?"sent":"received")),n=e.prev(".message-"+(a?"sent":"received"));0===t.length?e.addClass("message-last message-with-tail"):e.removeClass("message-last message-with-tail"),0===n.length?e.addClass("message-first"):e.removeClass("message-first"),n.length>0&&n.find(".message-name").length>0&&e.find(".message-name").length>0&&n.find(".message-name").text()!==e.find(".message-name").text()&&(n.addClass("message-last message-with-tail"),e.addClass("message-first"))})},r.appendMessage=function(e,a){return r.addMessage(e,"append",a)},r.prependMessage=function(e,a){return r.addMessage(e,"prepend",a)},r.addMessage=function(e,a,t){return r.addMessages([e],a,t)},r.addMessages=function(e,a,t){"undefined"==typeof t&&(t=!0),"undefined"==typeof a&&(a=r.params.newMessagesFirst?"prepend":"append");var n,i="";for(n=0;n<e.length;n++){var s=e[n]||{};s.type=s.type||"sent",s.text&&(s.hasImage=s.text.indexOf("<img")>=0,t&&(s.position="append"===a?"bottom":"top"),i+=r.template(s))}var o,l;"prepend"===a&&(o=r.pageContent[0].scrollHeight,l=r.pageContent[0].scrollTop),r.container[a](i),r.params.autoLayout&&r.layout(),"prepend"===a&&(r.pageContent[0].scrollTop=l+(r.pageContent[0].scrollHeight-o)),("append"===a&&!r.params.newMessagesFirst||"prepend"===a&&r.params.newMessagesFirst)&&r.scrollMessages(t?void 0:0);var p=r.container.find(".message");if(1===e.length)return"append"===a?p[p.length-1]:p[0];var d=[];if("append"===a)for(n=p.length-e.length;n<p.length;n++)d.push(p[n]);else for(n=0;n<e.length;n++)d.push(p[n]);return d},r.removeMessage=function(e){return e=o(e),0===e.length?!1:(e.remove(),r.params.autoLayout&&r.layout(),!0)},r.removeMessages=function(e){r.removeMessage(e)},r.clean=function(){r.container.html("")},r.scrollMessages=function(e,a){"undefined"==typeof e&&(e=400);var t,n=r.pageContent[0].scrollTop;if("undefined"!=typeof a)t=a;else if(t=r.params.newMessagesFirst?0:r.pageContent[0].scrollHeight-r.pageContent[0].offsetHeight,t===n)return;r.pageContent.scrollTop(t,e)},r.init=function(){r.params.messages?r.addMessages(r.params.messages,void 0,!1):(r.params.autoLayout&&r.layout(),r.scrollMessages(0))},r.destroy=function(){r=null},r.init(),r.container[0].f7Messages=r,r):void 0};i.messages=function(e,a){return new h(e,a)},i.initPageMessages=function(e){function a(){n.destroy(),e.off("pageBeforeRemove",a)}e=o(e);var t=e.find(".messages");if(0!==t.length&&t.hasClass("messages-init")){var n=i.messages(t,t.dataset());e.hasClass("page")&&e.on("pageBeforeRemove",a)}},i.swipeoutOpenedEl=void 0,i.allowSwipeout=!0,i.initSwipeout=function(e){function a(e){i.allowSwipeout&&(s=!1,r=!0,l=void 0,O.x="touchstart"===e.type?e.targetTouches[0].pageX:e.pageX,O.y="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY,p=(new Date).getTime())}function t(e){if(r){var a="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,t="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY;if("undefined"==typeof l&&(l=!!(l||Math.abs(t-O.y)>Math.abs(a-O.x))),l)return void(r=!1);if(!s){if(o(".list-block.sortable-opened").length>0)return;c=o(this),u=c.find(".swipeout-content"),m=c.find(".swipeout-actions-right"),f=c.find(".swipeout-actions-left"),h=g=C=y=k=T=null,M=f.hasClass("swipeout-actions-no-fold")||i.params.swipeoutActionsNoFold,I=m.hasClass("swipeout-actions-no-fold")||i.params.swipeoutActionsNoFold,f.length>0&&(h=f.outerWidth(),C=f.children("a"),T=f.find(".swipeout-overswipe")),m.length>0&&(g=m.outerWidth(),y=m.children("a"),k=m.find(".swipeout-overswipe")),b=c.hasClass("swipeout-opened"),b&&(w=c.find(".swipeout-actions-left.swipeout-actions-opened").length>0?"left":"right"),c.removeClass("transitioning"),i.params.swipeoutNoFollow||(c.find(".swipeout-actions-opened").removeClass("swipeout-actions-opened"),c.removeClass("swipeout-opened"))}if(s=!0,e.preventDefault(),d=a-O.x,v=d,b&&("right"===w?v-=g:v+=h),v>0&&0===f.length||0>v&&0===m.length){if(!b)return r=s=!1,u.transform(""),y&&y.length>0&&y.transform(""),void(C&&C.length>0&&C.transform(""));v=0}x=0>v?"to-left":v>0?"to-right":x?x:"to-left";var n,p,E;if(e.f7PreventPanelSwipe=!0,i.params.swipeoutNoFollow)return b?("right"===w&&d>0&&i.swipeoutClose(c),"left"===w&&0>d&&i.swipeoutClose(c)):(0>d&&m.length>0&&i.swipeoutOpen(c,"right"),d>0&&f.length>0&&i.swipeoutOpen(c,"left")),r=!1,void(s=!1);S=!1,P=!1;var L;if(m.length>0)for(E=v/g,-g>v&&(v=-g-Math.pow(-v-g,.8),k.length>0&&(P=!0)),n=0;n<y.length;n++)"undefined"==typeof y[n]._buttonOffset&&(y[n]._buttonOffset=y[n].offsetLeft),p=y[n]._buttonOffset,L=o(y[n]),k.length>0&&L.hasClass("swipeout-overswipe")&&L.css({left:(P?-p:0)+"px"}),L.transform("translate3d("+(v-p*(1+Math.max(E,-1)))+"px,0,0)");if(f.length>0)for(E=v/h,v>h&&(v=h+Math.pow(v-h,.8),T.length>0&&(S=!0)),n=0;n<C.length;n++)"undefined"==typeof C[n]._buttonOffset&&(C[n]._buttonOffset=h-C[n].offsetLeft-C[n].offsetWidth),p=C[n]._buttonOffset,L=o(C[n]),T.length>0&&L.hasClass("swipeout-overswipe")&&L.css({left:(S?p:0)+"px"}),C.length>1&&L.css("z-index",C.length-n),L.transform("translate3d("+(v+p*(1-Math.min(E,1)))+"px,0,0)");u.transform("translate3d("+v+"px,0,0)")}}function n(e){if(!r||!s)return r=!1,void(s=!1);r=!1,s=!1;var a,t,n,l,w,T,k=(new Date).getTime()-p;if(T="to-left"===x?I:M,n="to-left"===x?m:f,t="to-left"===x?g:h,a=300>k&&(-10>d&&"to-left"===x||d>10&&"to-right"===x)||k>=300&&Math.abs(v)>t/2?"open":"close",300>k&&(0===Math.abs(v)&&(a="close"),Math.abs(v)===t&&(a="open")),"open"===a){i.swipeoutOpenedEl=c,c.trigger("open"),c.addClass("swipeout-opened transitioning");var O="to-left"===x?-t:t;if(u.transform("translate3d("+O+"px,0,0)"),n.addClass("swipeout-actions-opened"),l="to-left"===x?y:C)for(w=0;w<l.length;w++)o(l[w]).transform("translate3d("+O+"px,0,0)");P&&m.find(".swipeout-overswipe")[0].click(),S&&f.find(".swipeout-overswipe")[0].click()}else c.trigger("close"),i.swipeoutOpenedEl=void 0,c.addClass("transitioning").removeClass("swipeout-opened"),u.transform(""),n.removeClass("swipeout-actions-opened");var E;if(C&&C.length>0&&C!==l)for(w=0;w<C.length;w++)E=C[w]._buttonOffset,"undefined"==typeof E&&(C[w]._buttonOffset=h-C[w].offsetLeft-C[w].offsetWidth),o(C[w]).transform("translate3d("+E+"px,0,0)");if(y&&y.length>0&&y!==l)for(w=0;w<y.length;w++)E=y[w]._buttonOffset,"undefined"==typeof E&&(y[w]._buttonOffset=y[w].offsetLeft),o(y[w]).transform("translate3d("+-E+"px,0,0)");u.transitionEnd(function(e){b&&"open"===a||closed&&"close"===a||(c.trigger("open"===a?"opened":"closed"),b&&"close"===a&&(m.length>0&&y.transform(""),f.length>0&&C.transform("")))})}var r,s,l,p,d,c,u,m,f,h,g,v,b,w,C,y,x,T,k,S,P,M,I,O={};o(document).on(i.touchEvents.start,function(e){if(i.swipeoutOpenedEl){var a=o(e.target);i.swipeoutOpenedEl.is(a[0])||a.parents(".swipeout").is(i.swipeoutOpenedEl)||a.hasClass("modal-in")||a.hasClass("modal-overlay")||a.hasClass("actions-modal")||a.parents(".actions-modal.modal-in, .modal.modal-in").length>0||i.swipeoutClose(i.swipeoutOpenedEl)}}),e?(o(e).on(i.touchEvents.start,a),o(e).on(i.touchEvents.move,t),o(e).on(i.touchEvents.end,n)):(o(document).on(i.touchEvents.start,".list-block li.swipeout",a),o(document).on(i.touchEvents.move,".list-block li.swipeout",t),o(document).on(i.touchEvents.end,".list-block li.swipeout",n))},i.swipeoutOpen=function(e,a,t){if(e=o(e),2===arguments.length&&"function"==typeof arguments[1]&&(t=a),0!==e.length&&(e.length>1&&(e=o(e[0])),e.hasClass("swipeout")&&!e.hasClass("swipeout-opened"))){a||(a=e.find(".swipeout-actions-right").length>0?"right":"left");var n=e.find(".swipeout-actions-"+a);if(0!==n.length){{n.hasClass("swipeout-actions-no-fold")||i.params.swipeoutActionsNoFold}e.trigger("open").addClass("swipeout-opened").removeClass("transitioning"),n.addClass("swipeout-actions-opened");var r,s=n.children("a"),l=n.outerWidth(),p="right"===a?-l:l;if(s.length>1){for(r=0;r<s.length;r++)"right"===a?o(s[r]).transform("translate3d("+-s[r].offsetLeft+"px,0,0)"):o(s[r]).css("z-index",s.length-r).transform("translate3d("+(l-s[r].offsetWidth-s[r].offsetLeft)+"px,0,0)");{s[1].clientLeft}}for(e.addClass("transitioning"),r=0;r<s.length;r++)o(s[r]).transform("translate3d("+p+"px,0,0)");e.find(".swipeout-content").transform("translate3d("+p+"px,0,0)").transitionEnd(function(){e.trigger("opened"),t&&t.call(e[0])}),i.swipeoutOpenedEl=e}}},i.swipeoutClose=function(e,a){function t(){i.allowSwipeout=!0,s.transform(""),e.trigger("closed"),a&&a.call(e[0]),p&&clearTimeout(p)}if(e=o(e),0!==e.length&&e.hasClass("swipeout-opened")){var n=e.find(".swipeout-actions-opened").hasClass("swipeout-actions-right")?"right":"left",r=e.find(".swipeout-actions-opened").removeClass("swipeout-actions-opened"),s=(r.hasClass("swipeout-actions-no-fold")||i.params.swipeoutActionsNoFold,r.children("a")),l=r.outerWidth();i.allowSwipeout=!1,e.trigger("close"),e.removeClass("swipeout-opened").addClass("transitioning");var p;e.find(".swipeout-content").transform("translate3d(0px,0,0)").transitionEnd(t),p=setTimeout(t,500);for(var d=0;d<s.length;d++)o(s[d]).transform("right"===n?"translate3d("+-s[d].offsetLeft+"px,0,0)":"translate3d("+(l-s[d].offsetWidth-s[d].offsetLeft)+"px,0,0)"),o(s[d]).css({left:"0px"});i.swipeoutOpenedEl&&i.swipeoutOpenedEl[0]===e[0]&&(i.swipeoutOpenedEl=void 0)}},i.swipeoutDelete=function(e,a){if(e=o(e),0!==e.length){e.length>1&&(e=o(e[0])),i.swipeoutOpenedEl=void 0,e.trigger("delete"),e.css({height:e.outerHeight()+"px"});{e[0].clientLeft}e.css({height:"0px"}).addClass("deleting transitioning").transitionEnd(function(){if(e.trigger("deleted"),a&&a.call(e[0]),e.parents(".virtual-list").length>0){var t=e.parents(".virtual-list")[0].f7VirtualList,n=e[0].f7VirtualListIndex;t&&"undefined"!=typeof n&&t.deleteItem(n)}else e.remove()});var t="-100%";e.find(".swipeout-content").transform("translate3d("+t+",0,0)")}},i.sortableToggle=function(e){return e=o(e),0===e.length&&(e=o(".list-block.sortable")),e.toggleClass("sortable-opened"),e.trigger(e.hasClass("sortable-opened")?"open":"close"),e},i.sortableOpen=function(e){return e=o(e),0===e.length&&(e=o(".list-block.sortable")),e.addClass("sortable-opened"),e.trigger("open"),e},i.sortableClose=function(e){return e=o(e),0===e.length&&(e=o(".list-block.sortable")),e.removeClass("sortable-opened"),e.trigger("close"),e},i.initSortable=function(){function e(e){r=!1,n=!0,s="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY,p=o(this).parent(),c=p.parent().find("li"),g=p.parents(".sortable"),e.preventDefault(),i.allowPanelOpen=i.allowSwipeout=!1}function a(e){if(n&&p){var a=("touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,"touchmove"===e.type?e.targetTouches[0].pageY:e.pageY);r||(p.addClass("sorting"),g.addClass("sortable-sorting"),u=p[0].offsetTop,m=p.parent().height()-p[0].offsetTop-p.height(),d=p[0].offsetHeight),r=!0,e.preventDefault(),e.f7PreventPanelSwipe=!0,l=a-s;var t=l;-u>t&&(t=-u),t>m&&(t=m),p.transform("translate3d(0,"+t+"px,0)"),h=f=void 0,c.each(function(){var e=o(this);if(e[0]!==p[0]){var a=e[0].offsetTop,n=e.height(),r=p[0].offsetTop+t;r>=a-n/2&&p.index()<e.index()?(e.transform("translate3d(0, "+-d+"px,0)"),f=e,h=void 0):a+n/2>=r&&p.index()>e.index()?(e.transform("translate3d(0, "+d+"px,0)"),f=void 0,h||(h=e)):o(this).transform("translate3d(0, 0%,0)")}})}}function t(e){if(i.allowPanelOpen=i.allowSwipeout=!0,!n||!r)return n=!1,void(r=!1);e.preventDefault(),c.transform(""),p.removeClass("sorting"),g.removeClass("sortable-sorting");var a,t,s;f&&(p.insertAfter(f),p.trigger("sort")),h&&(p.insertBefore(h),p.trigger("sort")),(f||h)&&g.hasClass("virtual-list")&&(a=g[0].f7VirtualList,t=p[0].f7VirtualListIndex,s=h?h[0].f7VirtualListIndex:f[0].f7VirtualListIndex,a&&a.moveItem(t,s)),f=h=void 0,n=!1,r=!1}var n,r,s,l,p,d,c,u,m,f,h,g;o(document).on(i.touchEvents.start,".list-block.sortable .sortable-handler",e),i.support.touch?(o(document).on(i.touchEvents.move,".list-block.sortable .sortable-handler",a),o(document).on(i.touchEvents.end,".list-block.sortable .sortable-handler",t)):(o(document).on(i.touchEvents.move,a),o(document).on(i.touchEvents.end,t))},i.initSmartSelects=function(e){e=o(e);var a;a=e.is(".smart-select")?e:e.find(".smart-select"),0!==a.length&&a.each(function(){var e=o(this),a=e.find("select");if(0!==a.length){var t=a[0];if(0!==t.length){for(var n=[],r=0;r<t.length;r++)t[r].selected&&n.push(t[r].textContent.trim());var i=e.find(".item-after");if(0===i.length)e.find(".item-inner").append('<div class="item-after">'+n.join(", ")+"</div>");else{var s=i.text();if(i.hasClass("smart-select-value"))for(r=0;r<t.length;r++)t[r].selected=t[r].textContent.trim()===s.trim();else i.text(n.join(", "))}}}})},i.smartSelectAddOption=function(e,a,t){e=o(e);var n=e.parents(".smart-select");"undefined"==typeof t?e.append(a):o(a).insertBefore(e.find("option").eq(t)),i.initSmartSelects(n);var r=n.find("select").attr("name"),s=o('.page.smart-select-page[data-select-name="'+r+'"]').length>0;s&&i.smartSelectOpen(n,!0)},i.smartSelectOpen=function(e,a){function t(a){if(g){var t=i.virtualList(o(a).find(".virtual-list"),{items:B,template:V,height:v||void 0,searchByItem:function(e,a,t){return t.text.toLowerCase().indexOf(e.trim().toLowerCase())>=0?!0:!1}});o(a).once("popup"===s?"closed":"pageBeforeRemove",function(){t&&t.destroy&&t.destroy()})}o(a).on("change",'input[name="'+A+'"]',function(){var a=this,t=a.value,n=[];if("checkbox"===a.type)for(var o=0;o<w.options.length;o++){var l=w.options[o];l.value===t&&(l.selected=a.checked),l.selected&&n.push(l.textContent.trim())}else n=[e.find('option[value="'+t+'"]').text()],w.value=t;C.trigger("change"),e.find(".item-after").text(n.join(", ")),m&&"radio"===z&&("popup"===s?i.closeModal(K):r.router.back())})}function n(e){var a=e.detail.page;a.name===U&&t(a.container)}if(e=o(e),0!==e.length){var r=e.parents("."+i.params.viewClass);if(0!==r.length){r=r[0].f7View;var s=e.attr("data-open-in");if(s||(s=i.params.smartSelectInPopup?"popup":"page"),"popup"===s){if(o(".popup.smart-select-popup").length>0)return}else if(!r)return;var p=e.dataset(),d=p.pageTitle||e.find(".item-title").text(),c=p.backText||i.params.smartSelectBackText,u=p.popupCloseText||p.backText||i.params.smartSelectPopupCloseText,m=void 0!==p.backOnSelect?p.backOnSelect:i.params.smartSelectBackOnSelect,f=p.formTheme||i.params.smartSelectFormTheme,h=p.navbarTheme||i.params.smartSelectNavbarTheme,g=p.virtualList,v=p.virtualListHeight,b=i.params.material,w=e.find("select")[0],C=o(w),y=C.dataset();if(!(w.disabled||e.hasClass("disabled")||C.hasClass("disabled"))){for(var x,T,k,S,P,M,I,O,E,L,D,B=[],N=(new Date).getTime(),z=w.multiple?"checkbox":"radio",A=z+"-"+N,H=w.name,R=0;R<w.length;R++)x=o(w[R]),x[0].disabled||(D=x.dataset(),k=D.optionImage||y.optionImage,S=D.optionIcon||y.optionIcon,T=k||S||"checkbox"===z,b&&(T=k||S),E=D.optionColor,L=D.optionClass,P=x.parent("optgroup")[0],M=P&&P.label,I=!1,P&&P!==O&&(I=!0,O=P,B.push({groupLabel:M,isLabel:I})),B.push({value:x[0].value,text:x[0].textContent.trim(),selected:x[0].selected,group:P,groupLabel:M,image:k,icon:S,color:E,className:L,disabled:x[0].disabled,inputType:z,id:N,hasMedia:T,checkbox:"checkbox"===z,inputName:A,material:i.params.material}));i._compiledTemplates.smartSelectItem||(i._compiledTemplates.smartSelectItem=l.compile(i.params.smartSelectItemTemplate||'{{#if isLabel}}<li class="item-divider">{{groupLabel}}</li>{{else}}<li{{#if className}} class="{{className}}"{{/if}}><label class="label-{{inputType}} item-content"><input type="{{inputType}}" name="{{inputName}}" value="{{value}}" {{#if selected}}checked{{/if}}>{{#if material}}{{#if hasMedia}}<div class="item-media">{{#if icon}}<i class="icon {{icon}}"></i>{{/if}}{{#if image}}<img src="{{image}}">{{/if}}</div><div class="item-inner"><div class="item-title{{#if color}} color-{{color}}{{/if}}">{{text}}</div></div><div class="item-after"><i class="icon icon-form-{{inputType}}"></i></div>{{else}}<div class="item-media"><i class="icon icon-form-{{inputType}}"></i></div><div class="item-inner"><div class="item-title{{#if color}} color-{{color}}{{/if}}">{{text}}</div></div>{{/if}}{{else}}{{#if hasMedia}}<div class="item-media">{{#if checkbox}}<i class="icon icon-form-checkbox"></i>{{/if}}{{#if icon}}<i class="icon {{icon}}"></i>{{/if}}{{#if image}}<img src="{{image}}">{{/if}}</div>{{/if}}<div class="item-inner"><div class="item-title{{#if color}} color-{{color}}{{/if}}">{{text}}</div></div>{{/if}}</label></li>{{/if}}'));var V=i._compiledTemplates.smartSelectItem,q="";if(!g)for(var F=0;F<B.length;F++)q+=V(B[F]);i._compiledTemplates.smartSelectNavbar||(i._compiledTemplates.smartSelectNavbar=l.compile(i.params.smartSelectNavbarTemplate||'<div class="navbar {{#if navbarTheme}}theme-{{navbarTheme}}{{/if}}"><div class="navbar-inner">{{leftTemplate}}<div class="center sliding">{{pageTitle}}</div></div></div>'));var Y,G=i._compiledTemplates.smartSelectNavbar({pageTitle:d,backText:c,closeText:u,openIn:s,navbarTheme:h,inPopup:"popup"===s,inPage:"page"===s,leftTemplate:"popup"===s?(i.params.smartSelectPopupCloseTemplate||(b?'<div class="left"><a href="#" class="link close-popup icon-only"><i class="icon icon-back"></i></a></div>':'<div class="left"><a href="#" class="link close-popup"><i class="icon icon-back"></i><span>{{closeText}}</span></a></div>')).replace(/{{closeText}}/g,u):(i.params.smartSelectBackTemplate||(b?'<div class="left"><a href="#" class="back link icon-only"><i class="icon icon-back"></i></a></div>':'<div class="left sliding"><a href="#" class="back link"><i class="icon icon-back"></i><span>{{backText}}</span></a></div>')).replace(/{{backText}}/g,c)}),W="",j="";"page"===s?(Y="static",e.parents(".navbar-through").length>0&&(Y="through"),e.parents(".navbar-fixed").length>0&&(Y="fixed"),j=e.parents(".page").hasClass("no-toolbar")?"no-toolbar":"",W=e.parents(".page").hasClass("no-navbar")?"no-navbar":"navbar-"+Y):Y="fixed";var _,X,U="smart-select-"+A,J="undefined"==typeof e.data("searchbar")?i.params.smartSelectSearchbar:"true"===e.data("searchbar")?!0:!1;J&&(_=e.data("searchbar-placeholder")||"Search",X=e.data("searchbar-cancel")||"Cancel");var K,Q='<form class="searchbar searchbar-init" data-search-list=".smart-select-list-'+N+'" data-search-in=".item-title"><div class="searchbar-input"><input type="search" placeholder="'+_+'"><a href="#" class="searchbar-clear"></a></div>'+(b?"":'<a href="#" class="searchbar-cancel">'+X+"</a>")+'</form><div class="searchbar-overlay"></div>',Z=("through"===Y?G:"")+'<div class="pages">  <div data-page="'+U+'" data-select-name="'+H+'" class="page smart-select-page '+W+" "+j+'">'+("fixed"===Y?G:"")+(J?Q:"")+'    <div class="page-content">'+("static"===Y?G:"")+'      <div class="list-block '+(g?"virtual-list":"")+" smart-select-list-"+N+" "+(f?"theme-"+f:"")+'">        <ul>'+(g?"":q)+"        </ul>      </div>    </div>  </div></div>";"popup"===s?(a?(K=o(".popup.smart-select-popup .view"),K.html(Z)):(K=i.popup('<div class="popup smart-select-popup smart-select-popup-'+A+'"><div class="view navbar-fixed">'+Z+"</div></div>"),K=o(K)),i.initPage(K.find(".page")),t(K)):(o(document).once("pageInit",".smart-select-page",n),r.router.load({content:Z,reload:a?!0:void 0}))}}}};var g=function(e,a){var t={cols:1,height:i.params.material?48:44,cache:!0,dynamicHeightBufferSize:1};a=a||{};for(var n in t)"undefined"==typeof a[n]&&(a[n]=t[n]);var r=this;r.listBlock=o(e),r.params=a,r.items=a.items,a.template&&("string"==typeof a.template?r.template=l.compile(a.template):"function"==typeof a.template&&(r.template=a.template)),r.pageContent=r.listBlock.parents(".page-content");var s;"undefined"!=typeof r.params.updatableScroll?s=r.params.updatableScroll:(s=!0,i.device.ios&&i.device.osVersion.split(".")[0]<8&&(s=!1)),r.ul=r.params.ul?o(r.params.ul):r.listBlock.children("ul"),0===r.ul.length&&(r.listBlock.append("<ul></ul>"),r.ul=r.listBlock.children("ul")),r.domCache={},r.displayDomCache={},r.tempDomElement=document.createElement("ul"),r.lastRepaintY=null,r.fragment=document.createDocumentFragment(),r.filterItems=function(e,a){r.filteredItems=[];for(var t=(e[0],e[e.length-1],0);t<e.length;t++)r.filteredItems.push(r.items[e[t]]);"undefined"==typeof a&&(a=!0),a&&(r.pageContent[0].scrollTop=0),r.update()},r.resetFilter=function(){r.filteredItems=null,delete r.filteredItems,r.update()};var p,d,c,u,m,f,h=0,g="function"==typeof r.params.height;return r.setListSize=function(){var e=r.filteredItems||r.items;if(p=r.pageContent[0].offsetHeight,g){f=0,r.heights=[];for(var a=0;a<e.length;a++){var t=r.params.height(e[a]);f+=t,r.heights.push(t)}}else f=e.length*r.params.height/r.params.cols,d=Math.ceil(p/r.params.height),c=r.params.rowsBefore||2*d,u=r.params.rowsAfter||d,m=d+c+u,h=c/2*r.params.height;s&&r.ul.css({height:f+"px"})},r.render=function(e,a){e&&(r.lastRepaintY=null);var t=-(r.listBlock[0].getBoundingClientRect().top+r.pageContent[0].getBoundingClientRect().top);if("undefined"!=typeof a&&(t=a),null===r.lastRepaintY||Math.abs(t-r.lastRepaintY)>h||!s&&r.pageContent[0].scrollTop+p>=r.pageContent[0].scrollHeight){r.lastRepaintY=t;var n,i,o=r.filteredItems||r.items,l=0,d=0;if(g){var u,f,v=0;for(h=p,u=0;u<r.heights.length;u++)f=r.heights[u],"undefined"==typeof n&&(v+f>=t-2*p*r.params.dynamicHeightBufferSize?n=u:l+=f),"undefined"==typeof i&&((v+f>=t+2*p*r.params.dynamicHeightBufferSize||u===r.heights.length-1)&&(i=u+1),d+=f),v+=f;i=Math.min(i,o.length)}else n=(parseInt(t/r.params.height)-c)*r.params.cols,0>n&&(n=0),i=Math.min(n+m*r.params.cols,o.length);var b;r.reachEnd=!1;for(var w=n;i>w;w++){var C,y;y=r.items.indexOf(o[w]),w===n&&(r.currentFromIndex=y),w===i-1&&(r.currentToIndex=y),y===r.items.length-1&&(r.reachEnd=!0),r.domCache[y]?C=r.domCache[y]:(r.tempDomElement.innerHTML=r.template?r.template(o[w],{index:y}):r.params.renderItem?r.params.renderItem(y,o[w]):o[w],C=r.tempDomElement.childNodes[0],r.params.cache&&(r.domCache[y]=C)),C.f7VirtualListIndex=y,w===n&&(b=g?l:w*r.params.height/r.params.cols),C.style.top=b+"px",r.params.onItemBeforeInsert&&r.params.onItemBeforeInsert(r,C),r.fragment.appendChild(C)}s||(r.ul[0].style.height=g?d+"px":w*r.params.height/r.params.cols+"px"),r.params.onBeforeClear&&r.params.onBeforeClear(r,r.fragment),r.ul[0].innerHTML="",r.params.onItemsBeforeInsert&&r.params.onItemsBeforeInsert(r,r.fragment),r.ul[0].appendChild(r.fragment),r.params.onItemsAfterInsert&&r.params.onItemsAfterInsert(r,r.fragment),"undefined"!=typeof a&&e&&r.pageContent.scrollTop(a,0)}},r.scrollToItem=function(e){if(e>r.items.length)return!1;var a,t=0;if(g)for(var n=0;e>n;n++)t+=r.heights[n];else t=e*r.params.height;return a=r.listBlock[0].offsetTop,r.render(!0,a+t-parseInt(r.pageContent.css("padding-top"),10)),
!0},r.handleScroll=function(e){r.render()},r.handleResize=function(e){r.setListSize(),r.render(!0)},r.attachEvents=function(e){var a=e?"off":"on";r.pageContent[a]("scroll",r.handleScroll),o(window)[a]("resize",r.handleResize)},r.init=function(){r.attachEvents(),r.setListSize(),r.render()},r.appendItems=function(e){for(var a=0;a<e.length;a++)r.items.push(e[a]);r.update()},r.appendItem=function(e){r.appendItems([e])},r.replaceAllItems=function(e){r.items=e,delete r.filteredItems,r.domCache={},r.update()},r.replaceItem=function(e,a){r.items[e]=a,r.params.cache&&delete r.domCache[e],r.update()},r.prependItems=function(e){for(var a=e.length-1;a>=0;a--)r.items.unshift(e[a]);if(r.params.cache){var t={};for(var n in r.domCache)t[parseInt(n,10)+e.length]=r.domCache[n];r.domCache=t}r.update()},r.prependItem=function(e){r.prependItems([e])},r.moveItem=function(e,a){if(e!==a){var t=r.items.splice(e,1)[0];if(a>=r.items.length?(r.items.push(t),a=r.items.length-1):r.items.splice(a,0,t),r.params.cache){var n={};for(var i in r.domCache){var s=parseInt(i,10),o=a>e?e:a,l=a>e?a:e,p=a>e?-1:1;(o>s||s>l)&&(n[s]=r.domCache[s]),s===o&&(n[l]=r.domCache[s]),s>o&&l>=s&&(n[s+p]=r.domCache[s])}r.domCache=n}r.update()}},r.insertItemBefore=function(e,a){if(0===e)return void r.prependItem(a);if(e>=r.items.length)return void r.appendItem(a);if(r.items.splice(e,0,a),r.params.cache){var t={};for(var n in r.domCache){var i=parseInt(n,10);i>=e&&(t[i+1]=r.domCache[i])}r.domCache=t}r.update()},r.deleteItems=function(e){for(var a,t=0,n=0;n<e.length;n++){var i=e[n];"undefined"!=typeof a&&i>a&&(t=-n),i+=t,a=e[n];var s=r.items.splice(i,1)[0];if(r.filteredItems&&r.filteredItems.indexOf(s)>=0&&r.filteredItems.splice(r.filteredItems.indexOf(s),1),r.params.cache){var o={};for(var l in r.domCache){var p=parseInt(l,10);p===i?delete r.domCache[i]:parseInt(l,10)>i?o[p-1]=r.domCache[l]:o[p]=r.domCache[l]}r.domCache=o}}r.update()},r.deleteAllItems=function(){r.items=[],delete r.filteredItems,r.params.cache&&(r.domCache={}),r.update()},r.deleteItem=function(e){r.deleteItems([e])},r.clearCache=function(){r.domCache={}},r.update=function(){r.setListSize(),r.render(!0)},r.destroy=function(){r.attachEvents(!0),delete r.items,delete r.domCache},r.init(),r.listBlock[0].f7VirtualList=r,r};i.virtualList=function(e,a){return new g(e,a)},i.reinitVirtualList=function(e){var a=o(e),t=a.find(".virtual-list");if(0!==t.length)for(var n=0;n<t.length;n++){var r=t[n].f7VirtualList;r&&r.update()}},i.initPullToRefresh=function(e){function a(e){if(d){if("android"!==i.device.os)return;if("targetTouches"in e&&e.targetTouches.length>1)return}c=!1,d=!0,u=void 0,b=void 0,"touchstart"===e.type&&(p=e.targetTouches[0].identifier),y.x="touchstart"===e.type?e.targetTouches[0].pageX:e.pageX,y.y="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY,f=(new Date).getTime(),h=o(this)}function t(e){if(d){var a,t,n;if("touchmove"===e.type){if(p&&e.touches)for(var r=0;r<e.touches.length;r++)e.touches[r].identifier===p&&(n=e.touches[r]);n||(n=e.targetTouches[0]),a=n.pageX,t=n.pageY}else a=e.pageX,t=e.pageY;if(a&&t){if("undefined"==typeof u&&(u=!!(u||Math.abs(t-y.y)>Math.abs(a-y.x))),!u)return void(d=!1);if(v=h[0].scrollTop,"undefined"==typeof b&&0!==v&&(b=!0),!c){if(h.removeClass("transitioning"),v>h[0].offsetHeight)return void(d=!1);C&&(w=h.attr("data-ptr-distance"),w.indexOf("%")>=0&&(w=h[0].offsetHeight*parseInt(w,10)/100)),k=h.hasClass("refreshing")?w:0,T=h[0].scrollHeight===h[0].offsetHeight||"ios"!==i.device.os?!0:!1}return c=!0,m=t-y.y,m>0&&0>=v||0>v?("ios"===i.device.os&&parseInt(i.device.osVersion.split(".")[0],10)>7&&0===v&&!b&&(T=!0),T&&(e.preventDefault(),g=Math.pow(m,.85)+k,h.transform("translate3d(0,"+g+"px,0)")),T&&Math.pow(m,.85)>w||!T&&m>=2*w?(x=!0,h.addClass("pull-up").removeClass("pull-down")):(x=!1,h.removeClass("pull-up").addClass("pull-down")),void 0):(h.removeClass("pull-up pull-down"),void(x=!1))}}}function n(e){if(!("touchend"===e.type&&e.changedTouches&&e.changedTouches.length>0&&p&&e.changedTouches[0].identifier!==p)){if(!d||!c)return d=!1,void(c=!1);g&&(h.addClass("transitioning"),g=0),h.transform(""),x?(h.addClass("refreshing"),h.trigger("refresh",{done:function(){i.pullToRefreshDone(h)}})):h.removeClass("pull-down"),d=!1,c=!1}}function r(){l.off(i.touchEvents.start,a),l.off(i.touchEvents.move,t),l.off(i.touchEvents.end,n)}function s(){r(),S.off("pageBeforeRemove",s)}var l=o(e);if(l.hasClass("pull-to-refresh-content")||(l=l.find(".pull-to-refresh-content")),l&&0!==l.length){var p,d,c,u,m,f,h,g,v,b,w,C,y={},x=!1,T=!1,k=0,S=l.hasClass("page")?l:l.parents(".page"),P=!1;(S.find(".navbar").length>0||S.parents(".navbar-fixed, .navbar-through").length>0||S.hasClass("navbar-fixed")||S.hasClass("navbar-through"))&&(P=!0),S.hasClass("no-navbar")&&(P=!1),P||l.addClass("pull-to-refresh-no-navbar"),h=l,h.attr("data-ptr-distance")?C=!0:w=44,l.on(i.touchEvents.start,a),l.on(i.touchEvents.move,t),l.on(i.touchEvents.end,n),0!==S.length&&(l[0].f7DestroyPullToRefresh=r,S.on("pageBeforeRemove",s))}},i.pullToRefreshDone=function(e){e=o(e),0===e.length&&(e=o(".pull-to-refresh-content.refreshing")),e.removeClass("refreshing").addClass("transitioning"),e.transitionEnd(function(){e.removeClass("transitioning pull-up pull-down")})},i.pullToRefreshTrigger=function(e){e=o(e),0===e.length&&(e=o(".pull-to-refresh-content")),e.hasClass("refreshing")||(e.addClass("transitioning refreshing"),e.trigger("refresh",{done:function(){i.pullToRefreshDone(e)}}))},i.destroyPullToRefresh=function(e){e=o(e);var a=e.hasClass("pull-to-refresh-content")?e:e.find(".pull-to-refresh-content");0!==a.length&&a[0].f7DestroyPullToRefresh&&a[0].f7DestroyPullToRefresh()},i.attachInfiniteScroll=function(e){o(e).on("scroll",n)},i.detachInfiniteScroll=function(e){o(e).off("scroll",n)},i.initInfiniteScroll=function(e){function a(){i.detachInfiniteScroll(t),e.off("pageBeforeRemove",a)}e=o(e);var t=e.find(".infinite-scroll");0!==t.length&&(i.attachInfiniteScroll(t),e.on("pageBeforeRemove",a))},i.initScrollToolbars=function(e){function a(a){e.hasClass("page-on-left")||(m=t[0].scrollTop,v=t[0].scrollHeight,b=t[0].offsetHeight,w=i.params.showBarsOnPageScrollEnd&&m+b>=v-P,y=d.hasClass("navbar-hidden"),x=c.hasClass("toolbar-hidden"),T=p&&p.hasClass("toolbar-hidden"),C=w?"show":u>m?i.params.showBarsOnPageScrollTop||44>=m?"show":"hide":m>44?"hide":"show","show"===C?(f&&n&&y&&(i.showNavbar(d),e.removeClass("no-navbar-by-scroll"),y=!1),h&&r&&x&&(i.showToolbar(c),e.removeClass("no-toolbar-by-scroll"),x=!1),g&&s&&T&&(i.showToolbar(p),e.removeClass("no-tabbar-by-scroll"),T=!1)):(f&&n&&!y&&(i.hideNavbar(d),e.addClass("no-navbar-by-scroll"),y=!0),h&&r&&!x&&(i.hideToolbar(c),e.addClass("no-toolbar-by-scroll"),x=!0),g&&s&&!T&&(i.hideToolbar(p),e.addClass("no-tabbar-by-scroll"),T=!0)),u=m)}e=o(e);var t=e.find(".page-content");if(0!==t.length){var n=(i.params.hideNavbarOnPageScroll||t.hasClass("hide-navbar-on-scroll")||t.hasClass("hide-bars-on-scroll"))&&!(t.hasClass("keep-navbar-on-scroll")||t.hasClass("keep-bars-on-scroll")),r=(i.params.hideToolbarOnPageScroll||t.hasClass("hide-toolbar-on-scroll")||t.hasClass("hide-bars-on-scroll"))&&!(t.hasClass("keep-toolbar-on-scroll")||t.hasClass("keep-bars-on-scroll")),s=(i.params.hideTabbarOnPageScroll||t.hasClass("hide-tabbar-on-scroll"))&&!t.hasClass("keep-tabbar-on-scroll");if(n||r||s){var l=t.parents("."+i.params.viewClass);if(0!==l.length){var p,d=l.find(".navbar"),c=l.find(".toolbar");s&&(p=l.find(".tabbar"),0===p.length&&(p=l.parents("."+i.params.viewsClass).find(".tabbar")));var u,m,f=d.length>0,h=c.length>0,g=p&&p.length>0;u=m=t[0].scrollTop;var v,b,w,C,y,x,T,k=h&&r?c[0].offsetHeight:0,S=g&&s?p[0].offsetHeight:0,P=S||k;t.on("scroll",a),t[0].f7ScrollToolbarsHandler=a}}}},i.destroyScrollToolbars=function(e){e=o(e);var a=e.find(".page-content");if(0!==a.length){var t=a[0].f7ScrollToolbarsHandler;t&&a.off("scroll",a[0].f7ScrollToolbarsHandler)}},i.initPageMaterialTabbar=function(e){e=o(e);var a=o(e).find(".tabbar");if(0===a.find(".tab-link-highlight").length){a.find(".toolbar-inner").append('<span class="tab-link-highlight"></span>');var t=1/a.find(".tab-link").length*100;a.find(".tab-link-highlight").css({width:t+"%"}).transform("translate3d("+100*a.find(".tab-link.active").index()+"%,0,0)")}},i.showTab=function(e,a,t){var n=o(e);if(2===arguments.length&&"boolean"==typeof a&&(t=a),0===n.length)return!1;if(n.hasClass("active"))return t&&n.trigger("show"),!1;var r=n.parent(".tabs");if(0===r.length)return!1;i.allowSwipeout=!0;var s=r.parent().hasClass("tabs-animated-wrap");s&&r.transform("translate3d("+100*-n.index()+"%,0,0)");var l=r.children(".tab.active").removeClass("active");if(n.addClass("active"),n.trigger("show"),!s&&n.find(".navbar").length>0){var p;p=n.hasClass(i.params.viewClass)?n[0]:n.parents("."+i.params.viewClass)[0],i.sizeNavbars(p)}if(a?a=o(a):(a=o("string"==typeof e?'.tab-link[href="'+e+'"]':'.tab-link[href="#'+n.attr("id")+'"]'),(!a||a&&0===a.length)&&o("[data-tab]").each(function(){n.is(o(this).attr("data-tab"))&&(a=o(this))})),0!==a.length){var d;if(l&&l.length>0){var c=l.attr("id");c&&(d=o('.tab-link[href="#'+c+'"]')),(!d||d&&0===d.length)&&o("[data-tab]").each(function(){l.is(o(this).attr("data-tab"))&&(d=o(this))})}if(a&&a.length>0&&(a.addClass("active"),i.params.material)){var u=a.parents(".tabbar");if(u.length>0){if(0===u.find(".tab-link-highlight").length){u.find(".toolbar-inner").append('<span class="tab-link-highlight"></span>');{u[0].clientLeft}}var m=1/u.find(".tab-link").length*100;u.find(".tab-link-highlight").css({width:m+"%"}).transform("translate3d("+100*a.index()+"%,0,0)")}}return d&&d.length>0&&d.removeClass("active"),!0}},i.accordionToggle=function(e){e=o(e),0!==e.length&&(e.hasClass("accordion-item-expanded")?i.accordionClose(e):i.accordionOpen(e))},i.accordionOpen=function(e){e=o(e);var a=e.parents(".accordion-list").eq(0),t=e.children(".accordion-item-content");0===t.length&&(t=e.find(".accordion-item-content"));var n=a.length>0&&e.parent().children(".accordion-item-expanded");n.length>0&&i.accordionClose(n),t.css("height",t[0].scrollHeight+"px").transitionEnd(function(){if(e.hasClass("accordion-item-expanded")){t.transition(0),t.css("height","auto");{t[0].clientLeft}t.transition(""),e.trigger("opened")}else t.css("height",""),e.trigger("closed")}),e.trigger("open"),e.addClass("accordion-item-expanded")},i.accordionClose=function(e){e=o(e);var a=e.children(".accordion-item-content");0===a.length&&(a=e.find(".accordion-item-content")),e.removeClass("accordion-item-expanded"),a.transition(0),a.css("height",a[0].scrollHeight+"px");a[0].clientLeft;a.transition(""),a.css("height","").transitionEnd(function(){if(e.hasClass("accordion-item-expanded")){a.transition(0),a.css("height","auto");{a[0].clientLeft}a.transition(""),e.trigger("opened")}else a.css("height",""),e.trigger("closed")}),e.trigger("close")},i.initFastClicks=function(){function e(e){var a,t=o(e),n=t.parents(i.params.activeStateElements);return t.is(i.params.activeStateElements)&&(a=t),n.length>0&&(a=a?a.add(n):n),a?a:t}function a(e){var a=e.parents(".page-content, .panel");return 0===a.length?!1:("yes"!==a.prop("scrollHandlerSet")&&(a.on("scroll",function(){clearTimeout(H),clearTimeout(G)}),a.prop("scrollHandlerSet","yes")),!0)}function t(){A.addClass("active-state")}function n(e){A.removeClass("active-state")}function r(e){var a="input select textarea label".split(" ");return e.nodeName&&a.indexOf(e.nodeName.toLowerCase())>=0?!0:!1}function s(e){var a="button input textarea select".split(" ");return document.activeElement&&e!==document.activeElement&&document.activeElement!==document.body?a.indexOf(e.nodeName.toLowerCase())>=0?!1:!0:!1}function l(e){var a=o(e);return"input"===e.nodeName.toLowerCase()&&"file"===e.type?!1:a.hasClass("no-fastclick")||a.parents(".no-fastclick").length>0?!1:!0}function p(e){if(document.activeElement===e)return!1;var a=e.nodeName.toLowerCase(),t="button checkbox file image radio submit".split(" ");return e.disabled||e.readOnly?!1:"textarea"===a?!0:"select"===a?i.device.android?!1:!0:"input"===a&&t.indexOf(e.type)<0?!0:void 0}function d(e){e=o(e);var a=!0;return(e.is("label")||e.parents("label").length>0)&&(a=i.device.android?!1:i.device.ios&&e.is("input")?!0:!1),a}function c(a){e(a.target).addClass("active-state"),"which"in a&&3===a.which&&setTimeout(function(){o(".active-state").removeClass("active-state")},0),i.params.material&&i.params.materialRipple&&(S=a.pageX,P=a.pageY,v(a.target,a.pageX,a.pageY))}function u(e){o(".active-state").removeClass("active-state"),i.params.material&&i.params.materialRipple&&b()}function m(e){o(".active-state").removeClass("active-state"),i.params.material&&i.params.materialRipple&&w()}function f(e){var a=i.params.materialRippleElements,t=o(e);return t.is(a)?t:t.parents(a).length>0?t.parents(a).eq(0):!1}function h(e,a,t){var n=t[0].getBoundingClientRect(),r={x:e-n.left,y:a-n.top},i=n.height,s=n.width,l=Math.max(Math.pow(Math.pow(i,2)+Math.pow(s,2),.5),48);q=o('<div class="ripple-wave" style="width: '+l+"px; height: "+l+"px; margin-top:-"+l/2+"px; margin-left:-"+l/2+"px; left:"+r.x+"px; top:"+r.y+'px;"></div>'),t.prepend(q);q[0].clientLeft;Y="translate3d("+(-r.x+s/2)+"px, "+(-r.y+i/2)+"px, 0) scale(1)",q.transform(Y)}function g(){q&&(q.addClass("ripple-wave-fill").transform(Y.replace("scale(1)","scale(1.01)")).transitionEnd(function(){var e=o(this).addClass("ripple-wave-out").transform(Y.replace("scale(1)","scale(1.01)"));setTimeout(function(){e.transitionEnd(function(){o(this).remove()})},0)}),q=F=void 0)}function v(e,t,n){return F=f(e),F&&0!==F.length?void(a(F)?G=setTimeout(function(){h(S,P,F)},80):h(S,P,F)):void(F=void 0)}function b(){clearTimeout(G),g()}function w(){q?g():F&&!B?(clearTimeout(G),h(S,P,F),setTimeout(g,0)):g()}function C(n){if(B=!1,N=!1,n.targetTouches.length>1)return!0;if(i.params.tapHold&&(z&&clearTimeout(z),z=setTimeout(function(){N=!0,n.preventDefault(),o(n.target).trigger("taphold")},i.params.tapHoldDelay)),V&&clearTimeout(V),R=l(n.target),!R)return O=!1,!0;if(i.device.ios){var r=window.getSelection();if(r.rangeCount&&r.focusNode!==document.body&&(!r.isCollapsed||document.activeElement===r.focusNode))return E=!0,!0;E=!1}i.device.android&&s(n.target)&&document.activeElement.blur(),O=!0,I=n.target,M=(new Date).getTime(),S=n.targetTouches[0].pageX,P=n.targetTouches[0].pageY,i.device.ios&&(L=void 0,o(I).parents().each(function(){var e=this;e.scrollHeight>e.offsetHeight&&!L&&(L=e,L.f7ScrollTop=L.scrollTop)})),n.timeStamp-D<i.params.fastClicksDelayBetweenClicks&&n.preventDefault(),i.params.activeState&&(A=e(I),a(A)?H=setTimeout(t,80):t()),i.params.material&&i.params.materialRipple&&v(I,S,P)}function y(e){if(O){var a=!1,t=i.params.fastClicksDistanceThreshold;if(t){var r=e.targetTouches[0].pageX,s=e.targetTouches[0].pageY;(Math.abs(r-S)>t||Math.abs(s-P)>t)&&(a=!0)}else a=!0;a&&(O=!1,I=null,B=!0,i.params.tapHold&&clearTimeout(z),i.params.activeState&&(clearTimeout(H),n()),i.params.material&&i.params.materialRipple&&b())}}function x(e){if(clearTimeout(H),clearTimeout(z),!O)return!E&&R&&(!i.device.android||e.cancelable)&&e.preventDefault(),!0;if(document.activeElement===e.target)return!0;if(E||e.preventDefault(),e.timeStamp-D<i.params.fastClicksDelayBetweenClicks)return setTimeout(n,0),!0;if(D=e.timeStamp,O=!1,i.device.ios&&L&&L.scrollTop!==L.f7ScrollTop)return!1;i.params.activeState&&(t(),setTimeout(n,0)),i.params.material&&i.params.materialRipple&&w(),p(I)&&I.focus(),document.activeElement&&I!==document.activeElement&&document.activeElement!==document.body&&"label"!==I.nodeName.toLowerCase()&&document.activeElement.blur(),e.preventDefault();var a=e.changedTouches[0],r=document.createEvent("MouseEvents"),s="click";return i.device.android&&"select"===I.nodeName.toLowerCase()&&(s="mousedown"),r.initMouseEvent(s,!0,!0,window,1,a.screenX,a.screenY,a.clientX,a.clientY,!1,!1,!1,!1,0,null),r.forwardedTouchEvent=!0,I.dispatchEvent(r),!1}function T(e){O=!1,I=null,clearTimeout(H),clearTimeout(z),i.params.activeState&&n(),i.params.material&&i.params.materialRipple&&w()}function k(e){var a=!1;return O?(I=null,O=!1,!0):"submit"===e.target.type&&0===e.detail?!0:(I||r(e.target)||(a=!0),R||(a=!0),document.activeElement===I&&(a=!0),e.forwardedTouchEvent&&(a=!0),e.cancelable||(a=!0),i.params.tapHold&&i.params.tapHoldPreventClicks&&N&&(a=!1),a||(e.stopImmediatePropagation(),e.stopPropagation(),I?(d(I)||B)&&e.preventDefault():e.preventDefault(),I=null),V=setTimeout(function(){R=!1},i.device.ios||i.device.androidChrome?100:400),i.params.tapHold&&(z=setTimeout(function(){N=!1},i.device.ios||i.device.androidChrome?100:400)),a)}i.params.activeState&&o("html").addClass("watch-active-state"),i.device.ios&&i.device.webView&&window.addEventListener("touchstart",function(){});var S,P,M,I,O,E,L,D,B,N,z,A,H,R,V,q,F,Y,G;i.support.touch?(document.addEventListener("click",k,!0),document.addEventListener("touchstart",C),document.addEventListener("touchmove",y),document.addEventListener("touchend",x),document.addEventListener("touchcancel",T)):i.params.activeState&&(document.addEventListener("mousedown",c),document.addEventListener("mousemove",u),document.addEventListener("mouseup",m))},i.initClickEvents=function(){function e(e){var a=o(this),t=o(e.target),n="a"===a[0].nodeName.toLowerCase()||a.parents("a").length>0||"a"===t[0].nodeName.toLowerCase()||t.parents("a").length>0;if(!n){var r;if(i.params.scrollTopOnNavbarClick&&a.is(".navbar .center")){var s=a.parents(".navbar");r=s.parents(".page-content"),0===r.length&&(s.parents(".page").length>0&&(r=s.parents(".page").find(".page-content")),0===r.length&&s.nextAll(".pages").length>0&&(r=s.nextAll(".pages").find(".page:not(.page-on-left):not(.page-on-right):not(.cached)").find(".page-content")))}i.params.scrollTopOnStatusbarClick&&a.is(".statusbar-overlay")&&(r=o(".popup.modal-in").length>0?o(".popup.modal-in").find(".page:not(.page-on-left):not(.page-on-right):not(.cached)").find(".page-content"):o(".panel.active").length>0?o(".panel.active").find(".page:not(.page-on-left):not(.page-on-right):not(.cached)").find(".page-content"):o(".views > .view.active").length>0?o(".views > .view.active").find(".page:not(.page-on-left):not(.page-on-right):not(.cached)").find(".page-content"):o(".views").find(".page:not(.page-on-left):not(.page-on-right):not(.cached)").find(".page-content")),r&&r.length>0&&(r.hasClass("tab")&&(r=r.parent(".tabs").children(".page-content.active")),r.length>0&&r.scrollTop(0,300))}}function a(e){var a=o(this),t=a.attr("href"),n="a"===a[0].nodeName.toLowerCase();if(n&&(a.is(i.params.externalLinks)||t.indexOf("javascript:")>=0))return void("_system"===a.attr("target")&&(e.preventDefault(),window.open(t,"_system")));var r=a.dataset();if(a.hasClass("smart-select")&&i.smartSelectOpen&&i.smartSelectOpen(a),a.hasClass("open-panel")&&i.openPanel(1===o(".panel").length?o(".panel").hasClass("panel-left")?"left":"right":"right"===r.panel?"right":"left"),a.hasClass("close-panel")&&i.closePanel(),a.hasClass("panel-overlay")&&i.params.panelsCloseByOutside&&i.closePanel(),a.hasClass("open-popover")){var s;s=r.popover?r.popover:".popover",i.popover(s,a)}a.hasClass("close-popover")&&i.closeModal(".popover.modal-in");var d;a.hasClass("open-popup")&&(d=r.popup?r.popup:".popup",i.popup(d)),a.hasClass("close-popup")&&(d=r.popup?r.popup:".popup.modal-in",i.closeModal(d));var c;if(a.hasClass("open-login-screen")&&(c=r.loginScreen?r.loginScreen:".login-screen",i.loginScreen(c)),a.hasClass("close-login-screen")&&i.closeModal(".login-screen.modal-in"),a.hasClass("modal-overlay")&&(o(".modal.modal-in").length>0&&i.params.modalCloseByOutside&&i.closeModal(".modal.modal-in"),o(".actions-modal.modal-in").length>0&&i.params.actionsCloseByOutside&&i.closeModal(".actions-modal.modal-in"),o(".popover.modal-in").length>0&&i.closeModal(".popover.modal-in")),a.hasClass("popup-overlay")&&o(".popup.modal-in").length>0&&i.params.popupCloseByOutside&&i.closeModal(".popup.modal-in"),a.hasClass("picker-modal-overlay")&&o(".picker-modal.modal-in").length>0&&i.closeModal(".picker-modal.modal-in"),a.hasClass("close-picker")){var u=o(".picker-modal.modal-in");u.length>0?i.closeModal(u):(u=o(".popover.modal-in .picker-modal"),u.length>0&&i.closeModal(u.parents(".popover")))}if(a.hasClass("open-picker")){var m;m=r.picker?r.picker:".picker-modal",i.pickerModal(m,a)}var f;if(a.hasClass("tab-link")&&(f=!0,i.showTab(r.tab||a.attr("href"),a)),a.hasClass("swipeout-close")&&i.swipeoutClose(a.parents(".swipeout-opened")),a.hasClass("swipeout-delete"))if(r.confirm){var h=r.confirm,g=r.confirmTitle;g?i.confirm(h,g,function(){i.swipeoutDelete(a.parents(".swipeout"))}):i.confirm(h,function(){i.swipeoutDelete(a.parents(".swipeout"))})}else i.swipeoutDelete(a.parents(".swipeout"));if(a.hasClass("toggle-sortable")&&i.sortableToggle(r.sortable),a.hasClass("open-sortable")&&i.sortableOpen(r.sortable),a.hasClass("close-sortable")&&i.sortableClose(r.sortable),a.hasClass("accordion-item-toggle")||a.hasClass("item-link")&&a.parent().hasClass("accordion-item")){var v=a.parent(".accordion-item");0===v.length&&(v=a.parents(".accordion-item")),0===v.length&&(v=a.parents("li")),i.accordionToggle(v)}if((!i.params.ajaxLinks||a.is(i.params.ajaxLinks))&&n&&i.params.router){n&&e.preventDefault();var b=t&&t.length>0&&"#"!==t&&!f,w=r.template;if(b||a.hasClass("back")||w){var C;if(r.view?C=o(r.view)[0].f7View:(C=a.parents("."+i.params.viewClass)[0]&&a.parents("."+i.params.viewClass)[0].f7View,C&&C.params.linksView&&("string"==typeof C.params.linksView?C=o(C.params.linksView)[0].f7View:C.params.linksView instanceof p&&(C=C.params.linksView))),C||i.mainView&&(C=i.mainView),!C)return;var y;if(w)t=void 0;else{if(0===t.indexOf("#")&&"#"!==t){if(!C.params.domCache)return;y=t.split("#")[1],t=void 0}if("#"===t&&!a.hasClass("back"))return}var x;"undefined"!=typeof r.animatePages?x=r.animatePages:(a.hasClass("with-animation")&&(x=!0),a.hasClass("no-animation")&&(x=!1));var T={animatePages:x,ignoreCache:r.ignoreCache,force:r.force,reload:r.reload,reloadPrevious:r.reloadPrevious,pageName:y,pushState:r.pushState,url:t};if(i.params.template7Pages){T.contextName=r.contextName;var k=r.context;k&&(T.context=JSON.parse(k))}w&&w in l.templates&&(T.template=l.templates[w]),a.hasClass("back")?C.router.back(T):C.router.load(T)}}}function t(e){e.preventDefault()}o(document).on("click","a, .open-panel, .close-panel, .panel-overlay, .modal-overlay, .popup-overlay, .swipeout-delete, .swipeout-close, .close-popup, .open-popup, .open-popover, .open-login-screen, .close-login-screen .smart-select, .toggle-sortable, .open-sortable, .close-sortable, .accordion-item-toggle, .close-picker, .picker-modal-overlay",a),(i.params.scrollTopOnNavbarClick||i.params.scrollTopOnStatusbarClick)&&o(document).on("click",".statusbar-overlay, .navbar .center",e),i.support.touch&&!i.device.android&&o(document).on(i.params.fastClicks?"touchstart":"touchmove",".panel-overlay, .modal-overlay, .preloader-indicator-overlay, .popup-overlay, .searchbar-overlay",t)},i.initResize=function(){o(window).on("resize",i.resize),o(window).on("orientationchange",i.orientationchange)},i.resize=function(){i.sizeNavbars&&i.sizeNavbars(),r()},i.orientationchange=function(){i.device&&i.device.minimalUi&&(90===window.orientation||-90===window.orientation)&&(document.body.scrollTop=0),r()},i.formsData={},i.formStoreData=function(e,a){i.formsData[e]=a,i.ls["f7form-"+e]=JSON.stringify(a)},i.formDeleteData=function(e){i.formsData[e]&&(i.formsData[e]="",delete i.formsData[e]),i.ls["f7form-"+e]&&(i.ls["f7form-"+e]="",i.ls.removeItem("f7form-"+e))},i.formGetData=function(e){return i.ls["f7form-"+e]?JSON.parse(i.ls["f7form-"+e]):i.formsData[e]?i.formsData[e]:void 0},i.formToJSON=function(e){if(e=o(e),1!==e.length)return!1;var a={},t=["submit","image","button","file"],n=[];return e.find("input, select, textarea").each(function(){var r=o(this),i=r.attr("name"),s=r.attr("type"),l=this.nodeName.toLowerCase();if(!(t.indexOf(s)>=0||n.indexOf(i)>=0||!i))if("select"===l&&r.attr("multiple"))n.push(i),a[i]=[],e.find('select[name="'+i+'"] option').each(function(){this.selected&&a[i].push(this.value)});else switch(s){case"checkbox":n.push(i),a[i]=[],e.find('input[name="'+i+'"]').each(function(){this.checked&&a[i].push(this.value)});break;case"radio":n.push(i),e.find('input[name="'+i+'"]').each(function(){this.checked&&(a[i]=this.value)});break;default:a[i]=r.val()}}),e.trigger("formToJSON",{formData:a}),a},i.formFromJSON=function(e,a){if(e=o(e),1!==e.length)return!1;var t=["submit","image","button","file"],n=[];e.find("input, select, textarea").each(function(){var r=o(this),i=r.attr("name"),s=r.attr("type"),l=this.nodeName.toLowerCase();if(a[i]&&!(t.indexOf(s)>=0||n.indexOf(i)>=0||!i))if("select"===l&&r.attr("multiple"))n.push(i),e.find('select[name="'+i+'"] option').each(function(){this.selected=a[i].indexOf(this.value)>=0?!0:!1});else switch(s){case"checkbox":n.push(i),e.find('input[name="'+i+'"]').each(function(){this.checked=a[i].indexOf(this.value)>=0?!0:!1});break;case"radio":n.push(i),e.find('input[name="'+i+'"]').each(function(){this.checked=a[i]===this.value?!0:!1});break;default:r.val(a[i])}}),e.trigger("formFromJSON",{formData:a})},i.initFormsStorage=function(e){function a(){var e=o(this),a=e[0].id;if(a){var t=i.formToJSON(e);t&&(i.formStoreData(a,t),e.trigger("store",{data:t}))}}function t(){n.off("change submit",a),e.off("pageBeforeRemove",t)}e=o(e);var n=e.find("form.store-data");0!==n.length&&(n.each(function(){var e=this.getAttribute("id");if(e){var a=i.formGetData(e);a&&i.formFromJSON(this,a)}}),n.on("change submit",a),e.on("pageBeforeRemove",t))},o(document).on("submit change","form.ajax-submit, form.ajax-submit-onchange",function(e){var a=o(this);if("change"!==e.type||a.hasClass("ajax-submit-onchange")){"submit"===e.type&&e.preventDefault();var t=a.attr("method")||"GET",n=a.prop("enctype")||a.attr("enctype"),r=a.attr("action");if(r){var s;s="POST"===t?new FormData(a[0]):o.serializeObject(i.formToJSON(a[0]));var l=o.ajax({method:t,url:r,contentType:n,data:s,beforeSend:function(e){a.trigger("beforeSubmit",{data:s,xhr:e})},error:function(e){a.trigger("submitError",{data:s,xhr:e})},success:function(e){a.trigger("submitted",{data:e,xhr:l})}})}}}),i.resizeTextarea=function(e){if(e=o(e),e.hasClass("resizable")){e.css({height:""});var a=e[0].offsetHeight,t=a-e[0].clientHeight,n=e[0].scrollHeight;if(n+t>a){var r=n+t;e.css("height",r+"px")}}},i.resizableTextarea=function(e){function a(){clearTimeout(t),t=setTimeout(function(){i.resizeTextarea(e)},0)}if(e=o(e),0!==e.length){var t;return e.on("change keydown keypress keyup paste cut",a)}},i.initPageResizableTextareas=function(e){e=o(e);var a=e.find("textarea.resizable");a.each(function(){i.resizableTextarea(this)})},i.initPageMaterialInputs=function(e){e=o(e);e.find("textarea.resizable");e.find(".item-input").each(function(){var e=o(this),a=["checkbox","button","submit","range","radio","image"];e.find("input, select, textarea").each(function(){a.indexOf(o(this).attr("type"))<0&&e.addClass("item-input-field")}),e.parents(".input-item, .inputs-list").length>0||e.parents(".list-block").eq(0).addClass("inputs-list")})},i.initMaterialWatchInputs=function(){function e(e){var a=o(this),n=a.attr("type");if(!(t.indexOf(n)>=0)){var r=a.add(a.parents(".item-input, .input-field")).add(a.parents(".item-inner").eq(0));r.addClass("focus-state")}}function a(e){var a=o(this),n=a.val(),r=a.attr("type");if(!(t.indexOf(r)>=0)){var i=a.add(a.parents(".item-input, .input-field")).add(a.parents(".item-inner").eq(0));i.removeClass("focus-state"),n&&""!==n.trim()?i.addClass("not-empty-state"):i.removeClass("not-empty-state")}}var t=["checkbox","button","submit","range","radio","image"];o(document).on("focus",".item-input input, .item-input select, .item-input textarea, input, textarea, select",e,!0),o(document).on("blur",".item-input input, .item-input select, .item-input textarea, input, textarea, select",a,!0)},i.pushStateQueue=[],i.pushStateClearQueue=function(){if(0!==i.pushStateQueue.length){var e,a=i.pushStateQueue.pop();i.params.pushStateNoAnimation===!0&&(e=!1),"back"===a.action&&i.router.back(a.view,{animatePages:e}),"loadPage"===a.action&&i.router.load(a.view,{url:a.stateUrl,animatePages:e,pushState:!1}),"loadContent"===a.action&&i.router.load(a.view,{content:a.stateContent,animatePages:e,pushState:!1}),"loadPageName"===a.action&&i.router.load(a.view,{pageName:a.statePageName,animatePages:e,pushState:!1})}},i.initPushState=function(){function e(e){if(!a){var t=i.mainView;if(t){var n=e.state;if(n||(n={viewIndex:i.views.indexOf(t),url:t.history[0]}),!(n.viewIndex<0)){var r,s=i.views[n.viewIndex],o=n&&n.url||void 0,l=n&&n.content||void 0,p=n&&n.pageName||void 0;i.params.pushStateNoAnimation===!0&&(r=!1),o!==s.url&&(s.history.indexOf(o)>=0?s.allowPageChange?i.router.back(s,{url:void 0,animatePages:r,pushState:!1,preloadOnly:!1}):i.pushStateQueue.push({action:"back",view:s}):l?s.allowPageChange?i.router.load(s,{content:l,animatePages:r,pushState:!1}):i.pushStateQueue.unshift({action:"loadContent",stateContent:l,view:s}):p?s.allowPageChange?i.router.load(s,{pageName:p,animatePages:r,pushState:!1}):i.pushStateQueue.unshift({action:"loadPageName",statePageName:p,view:s}):s.allowPageChange?i.router.load(s,{url:o,animatePages:r,pushState:!1}):i.pushStateQueue.unshift({action:"loadPage",stateUrl:o,view:s}))}}}}var a;i.params.pushStatePreventOnLoad&&(a=!0,o(window).on("load",function(){setTimeout(function(){a=!1},0)})),o(window).on("popstate",e)},i.swiper=function(e,a){return new Swiper(e,a)},i.initPageSwiper=function(e){function a(a){function t(){a.destroy(),e.off("pageBeforeRemove",t)}e.on("pageBeforeRemove",t)}e=o(e);var t=e.find(".swiper-init");if(0!==t.length)for(var n=0;n<t.length;n++){var r,s=t.eq(n);r=s.data("swiper")?JSON.parse(s.data("swiper")):s.dataset();var l=i.swiper(s[0],r);a(l)}},i.reinitPageSwiper=function(e){e=o(e);var a=e.find(".swiper-init");if(0!==a.length)for(var t=0;t<a.length;t++){var n=a[0].swiper;n&&n.update(!0)}};var v=function(e){var a=this,t={photos:[],initialSlide:0,spaceBetween:20,speed:300,zoom:!0,maxZoom:3,minZoom:1,exposition:!0,expositionHideCaptions:!1,type:"standalone",navbar:!0,toolbar:!0,theme:"light",swipeToClose:!0,backLinkText:"Close",ofText:"of",loop:!1,lazyLoading:!1,lazyLoadingInPrevNext:!1,lazyLoadingOnTransitionStart:!1,material:i.params.material,materialPreloaderSvg:i.params.materialPreloaderSvg};e=e||{},!e.backLinkText&&i.params.material&&(t.backLinkText="");for(var n in t)"undefined"==typeof e[n]&&(e[n]=t[n]);a.params=e,a.params.iconsColorClass=a.params.iconsColor?"color-"+a.params.iconsColor:"dark"===a.params.theme?"color-white":"",a.params.preloaderColorClass="dark"===a.params.theme?"preloader-white":"";var r=a.params.photoTemplate||'<div class="photo-browser-slide swiper-slide"><span class="photo-browser-zoom-container"><img src="{{js "this.url || this"}}"></span></div>',s=a.params.lazyPhotoTemplate||'<div class="photo-browser-slide photo-browser-slide-lazy swiper-slide"><div class="preloader {{@root.preloaderColorClass}}">{{#if @root.material}}{{@root.materialPreloaderSvg}}{{/if}}</div><span class="photo-browser-zoom-container"><img data-src="{{js "this.url || this"}}" class="swiper-lazy"></span></div>',p=a.params.objectTemplate||'<div class="photo-browser-slide photo-browser-object-slide swiper-slide">{{js "this.html || this"}}</div>',d=a.params.captionTemplate||'<div class="photo-browser-caption" data-caption-index="{{@index}}">{{caption}}</div>',c=a.params.navbarTemplate||'<div class="navbar"><div class="navbar-inner"><div class="left sliding"><a href="#" class="link close-popup photo-browser-close-link {{#unless backLinkText}}icon-only{{/unless}} {{js "this.type === \'page\' ? \'back\' : \'\'"}}"><i class="icon icon-back {{iconsColorClass}}"></i>{{#if backLinkText}}<span>{{backLinkText}}</span>{{/if}}</a></div><div class="center sliding"><span class="photo-browser-current"></span> <span class="photo-browser-of">{{ofText}}</span> <span class="photo-browser-total"></span></div><div class="right"></div></div></div>',u=a.params.toolbarTemplate||'<div class="toolbar tabbar"><div class="toolbar-inner"><a href="#" class="link photo-browser-prev"><i class="icon icon-prev {{iconsColorClass}}"></i></a><a href="#" class="link photo-browser-next"><i class="icon icon-next {{iconsColorClass}}"></i></a></div></div>',m=l.compile('<div class="photo-browser photo-browser-{{theme}}"><div class="view navbar-fixed toolbar-fixed">{{#unless material}}{{#if navbar}}'+c+'{{/if}}{{/unless}}<div class="page no-toolbar {{#unless navbar}}no-navbar{{/unless}} toolbar-fixed navbar-fixed" data-page="photo-browser-slides">{{#if material}}{{#if navbar}}'+c+"{{/if}}{{/if}}{{#if toolbar}}"+u+'{{/if}}<div class="photo-browser-captions photo-browser-captions-{{js "this.captionsTheme || this.theme"}}">{{#each photos}}{{#if caption}}'+d+"{{/if}}{{/each}}</div><div class=\"photo-browser-swiper-container swiper-container\"><div class=\"photo-browser-swiper-wrapper swiper-wrapper\">{{#each photos}}{{#js_compare \"this.html || ((typeof this === 'string' || this instanceof String) && (this.indexOf('<') >= 0 || this.indexOf('>') >= 0))\"}}"+p+"{{else}}{{#if @root.lazyLoading}}"+s+"{{else}}"+r+"{{/if}}{{/js_compare}}{{/each}}</div></div></div></div></div>")(a.params);

a.activeIndex=a.params.initialSlide,a.openIndex=a.activeIndex,a.opened=!1,a.open=function(e){return"undefined"==typeof e&&(e=a.activeIndex),e=parseInt(e,10),a.opened&&a.swiper?void a.swiper.slideTo(e):(a.opened=!0,a.openIndex=e,"standalone"===a.params.type&&o("body").append(m),"popup"===a.params.type&&(a.popup=i.popup('<div class="popup photo-browser-popup">'+m+"</div>"),o(a.popup).on("closed",a.onPopupClose)),"page"===a.params.type?(o(document).on("pageBeforeInit",a.onPageBeforeInit),o(document).on("pageBeforeRemove",a.onPageBeforeRemove),a.params.view||(a.params.view=i.mainView),void a.params.view.loadContent(m)):(a.layout(a.openIndex),void(a.params.onOpen&&a.params.onOpen(a))))},a.close=function(){a.opened=!1,a.swiperContainer&&0!==a.swiperContainer.length&&(a.params.onClose&&a.params.onClose(a),a.attachEvents(!0),"standalone"===a.params.type&&a.container.removeClass("photo-browser-in").addClass("photo-browser-out").animationEnd(function(){a.container.remove()}),a.swiper.destroy(),a.swiper=a.swiperContainer=a.swiperWrapper=a.slides=f=h=g=void 0)},a.onPopupClose=function(e){a.close(),o(a.popup).off("pageBeforeInit",a.onPopupClose)},a.onPageBeforeInit=function(e){"photo-browser-slides"===e.detail.page.name&&a.layout(a.openIndex),o(document).off("pageBeforeInit",a.onPageBeforeInit)},a.onPageBeforeRemove=function(e){"photo-browser-slides"===e.detail.page.name&&a.close(),o(document).off("pageBeforeRemove",a.onPageBeforeRemove)},a.onSliderTransitionStart=function(e){a.activeIndex=e.activeIndex;var t=e.activeIndex+1,n=e.slides.length;if(a.params.loop&&(n-=2,t-=e.loopedSlides,1>t&&(t=n+t),t>n&&(t-=n)),a.container.find(".photo-browser-current").text(t),a.container.find(".photo-browser-total").text(n),o(".photo-browser-prev, .photo-browser-next").removeClass("photo-browser-link-inactive"),e.isBeginning&&!a.params.loop&&o(".photo-browser-prev").addClass("photo-browser-link-inactive"),e.isEnd&&!a.params.loop&&o(".photo-browser-next").addClass("photo-browser-link-inactive"),a.captions.length>0){a.captionsContainer.find(".photo-browser-caption-active").removeClass("photo-browser-caption-active");var r=a.params.loop?e.slides.eq(e.activeIndex).attr("data-swiper-slide-index"):a.activeIndex;a.captionsContainer.find('[data-caption-index="'+r+'"]').addClass("photo-browser-caption-active")}var i=e.slides.eq(e.previousIndex).find("video");i.length>0&&"pause"in i[0]&&i[0].pause(),a.params.onTransitionStart&&a.params.onTransitionStart(e)},a.onSliderTransitionEnd=function(e){a.params.zoom&&f&&e.previousIndex!==e.activeIndex&&(h.transform("translate3d(0,0,0) scale(1)"),g.transform("translate3d(0,0,0)"),f=h=g=void 0,v=b=1),a.params.onTransitionEnd&&a.params.onTransitionEnd(e)},a.layout=function(e){a.container="page"===a.params.type?o(".photo-browser-swiper-container").parents(".view"):o(".photo-browser"),"standalone"===a.params.type&&(a.container.addClass("photo-browser-in"),i.sizeNavbars(a.container)),a.swiperContainer=a.container.find(".photo-browser-swiper-container"),a.swiperWrapper=a.container.find(".photo-browser-swiper-wrapper"),a.slides=a.container.find(".photo-browser-slide"),a.captionsContainer=a.container.find(".photo-browser-captions"),a.captions=a.container.find(".photo-browser-caption");var t={nextButton:a.params.nextButton||".photo-browser-next",prevButton:a.params.prevButton||".photo-browser-prev",indexButton:a.params.indexButton,initialSlide:e,spaceBetween:a.params.spaceBetween,speed:a.params.speed,loop:a.params.loop,lazyLoading:a.params.lazyLoading,lazyLoadingInPrevNext:a.params.lazyLoadingInPrevNext,lazyLoadingOnTransitionStart:a.params.lazyLoadingOnTransitionStart,preloadImages:a.params.lazyLoading?!1:!0,onTap:function(e,t){a.params.onTap&&a.params.onTap(e,t)},onClick:function(e,t){a.params.exposition&&a.toggleExposition(),a.params.onClick&&a.params.onClick(e,t)},onDoubleTap:function(e,t){a.toggleZoom(o(t.target).parents(".photo-browser-slide")),a.params.onDoubleTap&&a.params.onDoubleTap(e,t)},onTransitionStart:function(e){a.onSliderTransitionStart(e)},onTransitionEnd:function(e){a.onSliderTransitionEnd(e)},onSlideChangeStart:a.params.onSlideChangeStart,onSlideChangeEnd:a.params.onSlideChangeEnd,onLazyImageLoad:function(e,t,n){a.params.onLazyImageLoad&&a.params.onLazyImageLoad(a,t,n)},onLazyImageReady:function(e,t,n){o(t).removeClass("photo-browser-slide-lazy"),a.params.onLazyImageReady&&a.params.onLazyImageReady(a,t,n)}};a.params.swipeToClose&&"page"!==a.params.type&&(t.onTouchStart=a.swipeCloseTouchStart,t.onTouchMoveOpposite=a.swipeCloseTouchMove,t.onTouchEnd=a.swipeCloseTouchEnd),a.swiper=i.swiper(a.swiperContainer,t),0===e&&a.onSliderTransitionStart(a.swiper),a.attachEvents()},a.attachEvents=function(e){var t=e?"off":"on";if(a.params.zoom){var n=a.params.loop?a.swiper.slides:a.slides;n[t]("gesturestart",a.onSlideGestureStart),n[t]("gesturechange",a.onSlideGestureChange),n[t]("gestureend",a.onSlideGestureEnd),n[t](i.touchEvents.start,a.onSlideTouchStart),n[t](i.touchEvents.move,a.onSlideTouchMove),n[t](i.touchEvents.end,a.onSlideTouchEnd)}a.container.find(".photo-browser-close-link")[t]("click",a.close)};a.exposed=!1,a.toggleExposition=function(){a.container&&a.container.toggleClass("photo-browser-exposed"),a.params.expositionHideCaptions&&a.captionsContainer.toggleClass("photo-browser-captions-exposed"),a.exposed=!a.exposed},a.enableExposition=function(){a.container&&a.container.addClass("photo-browser-exposed"),a.params.expositionHideCaptions&&a.captionsContainer.addClass("photo-browser-captions-exposed"),a.exposed=!0},a.disableExposition=function(){a.container&&a.container.removeClass("photo-browser-exposed"),a.params.expositionHideCaptions&&a.captionsContainer.removeClass("photo-browser-captions-exposed"),a.exposed=!1};var f,h,g,v=1,b=1,w=!1;a.onSlideGestureStart=function(e){return f&&f.length||(f=o(this),0===f.length&&(f=a.swiper.slides.eq(a.swiper.activeIndex)),h=f.find("img, svg, canvas"),g=h.parent(".photo-browser-zoom-container"),0!==g.length)?(h.transition(0),void(w=!0)):void(h=void 0)},a.onSlideGestureChange=function(e){h&&0!==h.length&&(v=e.scale*b,v>a.params.maxZoom&&(v=a.params.maxZoom-1+Math.pow(v-a.params.maxZoom+1,.5)),v<a.params.minZoom&&(v=a.params.minZoom+1-Math.pow(a.params.minZoom-v+1,.5)),h.transform("translate3d(0,0,0) scale("+v+")"))},a.onSlideGestureEnd=function(e){h&&0!==h.length&&(v=Math.max(Math.min(v,a.params.maxZoom),a.params.minZoom),h.transition(a.params.speed).transform("translate3d(0,0,0) scale("+v+")"),b=v,w=!1,1===v&&(f=void 0))},a.toggleZoom=function(){f||(f=a.swiper.slides.eq(a.swiper.activeIndex),h=f.find("img, svg, canvas"),g=h.parent(".photo-browser-zoom-container")),h&&0!==h.length&&(g.transition(300).transform("translate3d(0,0,0)"),v&&1!==v?(v=b=1,h.transition(300).transform("translate3d(0,0,0) scale(1)"),f=void 0):(v=b=a.params.maxZoom,h.transition(300).transform("translate3d(0,0,0) scale("+v+")")))};var C,y,x,T,k,S,P,M,I,O,E,L,D,B,N,z,A,H={},R={};a.onSlideTouchStart=function(e){h&&0!==h.length&&(C||("android"===i.device.os&&e.preventDefault(),C=!0,H.x="touchstart"===e.type?e.targetTouches[0].pageX:e.pageX,H.y="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY))},a.onSlideTouchMove=function(e){if(h&&0!==h.length&&(a.swiper.allowClick=!1,C&&f)){y||(I=h[0].offsetWidth,O=h[0].offsetHeight,E=o.getTranslate(g[0],"x")||0,L=o.getTranslate(g[0],"y")||0,g.transition(0));var t=I*v,n=O*v;if(!(t<a.swiper.width&&n<a.swiper.height)){if(k=Math.min(a.swiper.width/2-t/2,0),P=-k,S=Math.min(a.swiper.height/2-n/2,0),M=-S,R.x="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,R.y="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY,!y&&!w&&(Math.floor(k)===Math.floor(E)&&R.x<H.x||Math.floor(P)===Math.floor(E)&&R.x>H.x))return void(C=!1);e.preventDefault(),e.stopPropagation(),y=!0,x=R.x-H.x+E,T=R.y-H.y+L,k>x&&(x=k+1-Math.pow(k-x+1,.8)),x>P&&(x=P-1+Math.pow(x-P+1,.8)),S>T&&(T=S+1-Math.pow(S-T+1,.8)),T>M&&(T=M-1+Math.pow(T-M+1,.8)),D||(D=R.x),z||(z=R.y),B||(B=Date.now()),N=(R.x-D)/(Date.now()-B)/2,A=(R.y-z)/(Date.now()-B)/2,Math.abs(R.x-D)<2&&(N=0),Math.abs(R.y-z)<2&&(A=0),D=R.x,z=R.y,B=Date.now(),g.transform("translate3d("+x+"px, "+T+"px,0)")}}},a.onSlideTouchEnd=function(e){if(h&&0!==h.length){if(!C||!y)return C=!1,void(y=!1);C=!1,y=!1;var t=300,n=300,r=N*t,i=x+r,s=A*n,o=T+s;0!==N&&(t=Math.abs((i-x)/N)),0!==A&&(n=Math.abs((o-T)/A));var l=Math.max(t,n);x=i,T=o;var p=I*v,d=O*v;k=Math.min(a.swiper.width/2-p/2,0),P=-k,S=Math.min(a.swiper.height/2-d/2,0),M=-S,x=Math.max(Math.min(x,P),k),T=Math.max(Math.min(T,M),S),g.transition(l).transform("translate3d("+x+"px, "+T+"px,0)")}};var V,q,F,Y,G,W=!1,j=!0,_=!1;return a.swipeCloseTouchStart=function(e,a){j&&(W=!0)},a.swipeCloseTouchMove=function(e,t){if(W){_||(_=!0,q="touchmove"===t.type?t.targetTouches[0].pageY:t.pageY,Y=a.swiper.slides.eq(a.swiper.activeIndex),G=(new Date).getTime()),t.preventDefault(),F="touchmove"===t.type?t.targetTouches[0].pageY:t.pageY,V=q-F;var n=1-Math.abs(V)/300;Y.transform("translate3d(0,"+-V+"px,0)"),a.swiper.container.css("opacity",n).transition(0)}},a.swipeCloseTouchEnd=function(e,t){if(W=!1,!_)return void(_=!1);_=!1,j=!1;var n=Math.abs(V),r=(new Date).getTime()-G;return 300>r&&n>20||r>=300&&n>100?void setTimeout(function(){"standalone"===a.params.type&&a.close(),"popup"===a.params.type&&i.closeModal(a.popup),a.params.onSwipeToClose&&a.params.onSwipeToClose(a),j=!0},0):(0!==n?Y.addClass("transitioning").transitionEnd(function(){j=!0,Y.removeClass("transitioning")}):j=!0,a.swiper.container.css("opacity","").transition(""),void Y.transform(""))},a};i.photoBrowser=function(e){return new v(e)};var b=function(e){function a(){var e=!1;return p.params.convertToPopover||p.params.onlyInPopover?(!p.inline&&p.params.input&&(p.params.onlyInPopover?e=!0:i.device.ios?e=i.device.ipad?!0:!1:o(window).width()>=768&&(e=!0)),e):e}function t(){return p.opened&&p.container&&p.container.length>0&&p.container.parents(".popover").length>0?!0:!1}function n(){if(p.opened)for(var e=0;e<p.cols.length;e++)p.cols[e].divider||(p.cols[e].calcSize(),p.cols[e].setValue(p.cols[e].value,0,!1))}function r(e){if(e.preventDefault(),!p.opened&&(p.open(),p.params.scrollToInput&&!a())){var t=p.input.parents(".page-content");if(0===t.length)return;var n,r=parseInt(t.css("padding-top"),10),i=parseInt(t.css("padding-bottom"),10),s=t[0].offsetHeight-r-p.container.height(),o=t[0].scrollHeight-r-p.container.height(),l=p.input.offset().top-r+p.input[0].offsetHeight;if(l>s){var d=t.scrollTop()+l-s;d+s>o&&(n=d+s-o+i,s===o&&(n=p.container.height()),t.css({"padding-bottom":n+"px"})),t.scrollTop(d,300)}}}function s(e){t()||(p.input&&p.input.length>0?e.target!==p.input[0]&&0===o(e.target).parents(".picker-modal").length&&p.close():0===o(e.target).parents(".picker-modal").length&&p.close())}function l(){p.opened=!1,p.input&&p.input.length>0&&(p.input.parents(".page-content").css({"padding-bottom":""}),i.params.material&&p.input.trigger("blur")),p.params.onClose&&p.params.onClose(p),p.container.find(".picker-items-col").each(function(){p.destroyPickerCol(this)})}var p=this,d={updateValuesOnMomentum:!1,updateValuesOnTouchmove:!0,rotateEffect:!1,momentumRatio:7,freeMode:!1,scrollToInput:!0,inputReadOnly:!0,convertToPopover:!0,onlyInPopover:!1,toolbar:!0,toolbarCloseText:"Done",toolbarTemplate:'<div class="toolbar"><div class="toolbar-inner"><div class="left"></div><div class="right"><a href="#" class="link close-picker">{{closeText}}</a></div></div></div>'};e=e||{};for(var c in d)"undefined"==typeof e[c]&&(e[c]=d[c]);p.params=e,p.cols=[],p.initialized=!1,p.inline=p.params.container?!0:!1;var u=i.device.ios||navigator.userAgent.toLowerCase().indexOf("safari")>=0&&navigator.userAgent.toLowerCase().indexOf("chrome")<0&&!i.device.android;return p.setValue=function(e,a){for(var t=0,n=0;n<p.cols.length;n++)p.cols[n]&&!p.cols[n].divider&&(p.cols[n].setValue(e[t],a),t++)},p.updateValue=function(){for(var e=[],a=[],t=0;t<p.cols.length;t++)p.cols[t].divider||(e.push(p.cols[t].value),a.push(p.cols[t].displayValue));e.indexOf(void 0)>=0||(p.value=e,p.displayValue=a,p.params.onChange&&p.params.onChange(p,p.value,p.displayValue),p.input&&p.input.length>0&&(o(p.input).val(p.params.formatValue?p.params.formatValue(p,p.value,p.displayValue):p.value.join(" ")),o(p.input).trigger("change")))},p.initPickerCol=function(e,a){function t(){w=o.requestAnimationFrame(function(){m.updateItems(void 0,void 0,0),t()})}function n(e){y||C||(e.preventDefault(),C=!0,x=T="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY,k=(new Date).getTime(),D=!0,P=I=o.getTranslate(m.wrapper[0],"y"))}function r(e){if(C){e.preventDefault(),D=!1,T="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY,y||(o.cancelAnimationFrame(w),y=!0,P=I=o.getTranslate(m.wrapper[0],"y"),m.wrapper.transition(0)),e.preventDefault();var a=T-x;I=P+a,M=void 0,v>I&&(I=v-Math.pow(v-I,.8),M="min"),I>b&&(I=b+Math.pow(I-b,.8),M="max"),m.wrapper.transform("translate3d(0,"+I+"px,0)"),m.updateItems(void 0,I,0,p.params.updateValuesOnTouchmove),E=I-O||I,L=(new Date).getTime(),O=I}}function s(e){if(!C||!y)return void(C=y=!1);C=y=!1,m.wrapper.transition(""),M&&m.wrapper.transform("min"===M?"translate3d(0,"+v+"px,0)":"translate3d(0,"+b+"px,0)"),S=(new Date).getTime();var a,n;S-k>300?n=I:(a=Math.abs(E/(S-L)),n=I+E*p.params.momentumRatio),n=Math.max(Math.min(n,b),v);var r=-Math.floor((n-b)/h);p.params.freeMode||(n=-r*h+b),m.wrapper.transform("translate3d(0,"+parseInt(n,10)+"px,0)"),m.updateItems(r,n,"",!0),p.params.updateValuesOnMomentum&&(t(),m.wrapper.transitionEnd(function(){o.cancelAnimationFrame(w)})),setTimeout(function(){D=!0},100)}function l(e){if(D){o.cancelAnimationFrame(w);var a=o(this).attr("data-picker-value");m.setValue(a)}}var d=o(e),c=d.index(),m=p.cols[c];if(!m.divider){m.container=d,m.wrapper=m.container.find(".picker-items-col-wrapper"),m.items=m.wrapper.find(".picker-item");var f,h,g,v,b;m.replaceValues=function(e,a){m.destroyEvents(),m.values=e,m.displayValues=a;var t=p.columnHTML(m,!0);m.wrapper.html(t),m.items=m.wrapper.find(".picker-item"),m.calcSize(),m.setValue(m.values[0],0,!0),m.initEvents()},m.calcSize=function(){p.params.rotateEffect&&(m.container.removeClass("picker-items-col-absolute"),m.width||m.container.css({width:""}));var e,a;e=0,a=m.container[0].offsetHeight,f=m.wrapper[0].offsetHeight,h=m.items[0].offsetHeight,g=h*m.items.length,v=a/2-g+h/2,b=a/2-h/2,m.width&&(e=m.width,parseInt(e,10)===e&&(e+="px"),m.container.css({width:e})),p.params.rotateEffect&&(m.width||(m.items.each(function(){var a=o(this);a.css({width:"auto"}),e=Math.max(e,a[0].offsetWidth),a.css({width:""})}),m.container.css({width:e+2+"px"})),m.container.addClass("picker-items-col-absolute"))},m.calcSize(),m.wrapper.transform("translate3d(0,"+b+"px,0)").transition(0);var w;m.setValue=function(e,a,n){"undefined"==typeof a&&(a="");var r=m.wrapper.find('.picker-item[data-picker-value="'+e+'"]').index();if("undefined"!=typeof r&&-1!==r){var i=-r*h+b;m.wrapper.transition(a),m.wrapper.transform("translate3d(0,"+i+"px,0)"),p.params.updateValuesOnMomentum&&m.activeIndex&&m.activeIndex!==r&&(o.cancelAnimationFrame(w),m.wrapper.transitionEnd(function(){o.cancelAnimationFrame(w)}),t()),m.updateItems(r,i,a,n)}},m.updateItems=function(e,a,t,n){"undefined"==typeof a&&(a=o.getTranslate(m.wrapper[0],"y")),"undefined"==typeof e&&(e=-Math.round((a-b)/h)),0>e&&(e=0),e>=m.items.length&&(e=m.items.length-1);var r=m.activeIndex;m.activeIndex=e,m.wrapper.find(".picker-selected, .picker-after-selected, .picker-before-selected").removeClass("picker-selected picker-after-selected picker-before-selected"),m.items.transition(t);{var i=m.items.eq(e).addClass("picker-selected").transform("");i.prevAll().addClass("picker-before-selected"),i.nextAll().addClass("picker-after-selected")}if(p.params.rotateEffect){{(a-(Math.floor((a-b)/h)*h+b))/h}m.items.each(function(){var e=o(this),t=e.index()*h,n=b-a,r=t-n,i=r/h,s=Math.ceil(m.height/h/2)+1,l=-18*i;l>180&&(l=180),-180>l&&(l=-180),Math.abs(i)>s?e.addClass("picker-item-far"):e.removeClass("picker-item-far"),e.transform("translate3d(0, "+(-a+b)+"px, "+(u?-110:0)+"px) rotateX("+l+"deg)")})}(n||"undefined"==typeof n)&&(m.value=i.attr("data-picker-value"),m.displayValue=m.displayValues?m.displayValues[e]:m.value,r!==e&&(m.onChange&&m.onChange(p,m.value,m.displayValue),p.updateValue()))},a&&m.updateItems(0,b,0);var C,y,x,T,k,S,P,M,I,O,E,L,D=!0;m.initEvents=function(e){var a=e?"off":"on";m.container[a](i.touchEvents.start,n),m.container[a](i.touchEvents.move,r),m.container[a](i.touchEvents.end,s),m.items[a]("click",l)},m.destroyEvents=function(){m.initEvents(!0)},m.container[0].f7DestroyPickerCol=function(){m.destroyEvents()},m.initEvents()}},p.destroyPickerCol=function(e){e=o(e),"f7DestroyPickerCol"in e[0]&&e[0].f7DestroyPickerCol()},o(window).on("resize",n),p.columnHTML=function(e,a){var t="",n="";if(e.divider)n+='<div class="picker-items-col picker-items-col-divider '+(e.textAlign?"picker-items-col-"+e.textAlign:"")+" "+(e.cssClass||"")+'">'+e.content+"</div>";else{for(var r=0;r<e.values.length;r++)t+='<div class="picker-item" data-picker-value="'+e.values[r]+'">'+(e.displayValues?e.displayValues[r]:e.values[r])+"</div>";n+='<div class="picker-items-col '+(e.textAlign?"picker-items-col-"+e.textAlign:"")+" "+(e.cssClass||"")+'"><div class="picker-items-col-wrapper">'+t+"</div></div>"}return a?t:n},p.layout=function(){var e,a="",t="";p.cols=[];var n="";for(e=0;e<p.params.cols.length;e++){var r=p.params.cols[e];n+=p.columnHTML(p.params.cols[e]),p.cols.push(r)}t="picker-modal picker-columns "+(p.params.cssClass||"")+(p.params.rotateEffect?" picker-3d":""),a='<div class="'+t+'">'+(p.params.toolbar?p.params.toolbarTemplate.replace(/{{closeText}}/g,p.params.toolbarCloseText):"")+'<div class="picker-modal-inner picker-items">'+n+'<div class="picker-center-highlight"></div></div></div>',p.pickerHTML=a},p.params.input&&(p.input=o(p.params.input),p.input.length>0&&(p.params.inputReadOnly&&p.input.prop("readOnly",!0),p.inline||p.input.on("click",r),p.params.inputReadOnly&&p.input.on("focus mousedown",function(e){e.preventDefault()}))),p.inline||o("html").on("click",s),p.opened=!1,p.open=function(){var e=a();p.opened||(p.layout(),e?(p.pickerHTML='<div class="popover popover-picker-columns"><div class="popover-inner">'+p.pickerHTML+"</div></div>",p.popover=i.popover(p.pickerHTML,p.params.input,!0),p.container=o(p.popover).find(".picker-modal"),o(p.popover).on("close",function(){l()})):p.inline?(p.container=o(p.pickerHTML),p.container.addClass("picker-modal-inline"),o(p.params.container).append(p.container)):(p.container=o(i.pickerModal(p.pickerHTML)),o(p.container).on("close",function(){l()})),p.container[0].f7Picker=p,p.container.find(".picker-items-col").each(function(){var e=!0;(!p.initialized&&p.params.value||p.initialized&&p.value)&&(e=!1),p.initPickerCol(this,e)}),p.initialized?p.value&&p.setValue(p.value,0):p.params.value&&p.setValue(p.params.value,0),p.input&&p.input.length>0&&i.params.material&&p.input.trigger("focus")),p.opened=!0,p.initialized=!0,p.params.onOpen&&p.params.onOpen(p)},p.close=function(){return p.opened&&!p.inline?t()?void i.closeModal(p.popover):void i.closeModal(p.container):void 0},p.destroy=function(){p.close(),p.params.input&&p.input.length>0&&p.input.off("click focus",r),o("html").off("click",s),o(window).off("resize",n)},p.inline&&p.open(),p};i.picker=function(e){return new b(e)};var w=function(e){function a(){var e=!1;return p.params.convertToPopover||p.params.onlyInPopover?(!p.inline&&p.params.input&&(p.params.onlyInPopover?e=!0:i.device.ios?e=i.device.ipad?!0:!1:o(window).width()>=768&&(e=!0)),e):e}function t(){return p.opened&&p.container&&p.container.length>0&&p.container.parents(".popover").length>0?!0:!1}function n(e){e=new Date(e);var a=e.getFullYear(),t=e.getMonth(),n=t+1,r=e.getDate(),i=e.getDay();return p.params.dateFormat.replace(/yyyy/g,a).replace(/yy/g,(a+"").substring(2)).replace(/mm/g,10>n?"0"+n:n).replace(/m(\W+)/g,n+"$1").replace(/MM/g,p.params.monthNames[t]).replace(/M(\W+)/g,p.params.monthNamesShort[t]+"$1").replace(/dd/g,10>r?"0"+r:r).replace(/d(\W+)/g,r+"$1").replace(/DD/g,p.params.dayNames[i]).replace(/D(\W+)/g,p.params.dayNamesShort[i]+"$1")}function r(e){if(e.preventDefault(),!p.opened&&(p.open(),p.params.scrollToInput&&!a()&&!i.params.material)){var t=p.input.parents(".page-content");if(0===t.length)return;var n,r=parseInt(t.css("padding-top"),10),s=parseInt(t.css("padding-bottom"),10),o=t[0].offsetHeight-r-p.container.height(),l=t[0].scrollHeight-r-p.container.height(),d=p.input.offset().top-r+p.input[0].offsetHeight;if(d>o){var c=t.scrollTop()+d-o;c+o>l&&(n=c+o-l+s,o===l&&(n=p.container.height()),t.css({"padding-bottom":n+"px"})),t.scrollTop(c,300)}}}function s(e){t()||(p.input&&p.input.length>0?e.target!==p.input[0]&&0===o(e.target).parents(".picker-modal").length&&p.close():0===o(e.target).parents(".picker-modal").length&&p.close())}function l(){p.opened=!1,p.input&&p.input.length>0&&(p.input.parents(".page-content").css({"padding-bottom":""}),i.params.material&&p.input.trigger("blur")),p.params.onClose&&p.params.onClose(p),p.destroyCalendarEvents()}var p=this,d={monthNames:["January","February","March","April","May","June","July","August","September","October","November","December"],monthNamesShort:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],dayNames:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],dayNamesShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],firstDay:1,weekendDays:[0,6],multiple:!1,dateFormat:"yyyy-mm-dd",direction:"horizontal",minDate:null,maxDate:null,touchMove:!0,animate:!0,closeOnSelect:!1,monthPicker:!0,monthPickerTemplate:'<div class="picker-calendar-month-picker"><a href="#" class="link icon-only picker-calendar-prev-month"><i class="icon icon-prev"></i></a><span class="current-month-value"></span><a href="#" class="link icon-only picker-calendar-next-month"><i class="icon icon-next"></i></a></div>',yearPicker:!0,yearPickerTemplate:'<div class="picker-calendar-year-picker"><a href="#" class="link icon-only picker-calendar-prev-year"><i class="icon icon-prev"></i></a><span class="current-year-value"></span><a href="#" class="link icon-only picker-calendar-next-year"><i class="icon icon-next"></i></a></div>',weekHeader:!0,scrollToInput:!0,inputReadOnly:!0,convertToPopover:!0,onlyInPopover:!1,toolbar:!0,toolbarCloseText:"Done",headerPlaceholder:"Select date",header:i.params.material,footer:i.params.material,toolbarTemplate:'<div class="toolbar"><div class="toolbar-inner">{{monthPicker}}{{yearPicker}}</div></div>',headerTemplate:'<div class="picker-header"><div class="picker-calendar-selected-date">{{placeholder}}</div></div>',footerTemplate:'<div class="picker-footer"><a href="#" class="button close-picker">{{closeText}}</a></div>'};e=e||{};for(var c in d)"undefined"==typeof e[c]&&(e[c]=d[c]);p.params=e,p.initialized=!1,p.inline=p.params.container?!0:!1,p.isH="horizontal"===p.params.direction;var u=p.isH&&i.rtl?-1:1;return p.animating=!1,p.addValue=function(e){if(p.params.multiple){p.value||(p.value=[]);for(var a,t=0;t<p.value.length;t++)new Date(e).getTime()===new Date(p.value[t]).getTime()&&(a=t);"undefined"==typeof a?p.value.push(e):p.value.splice(a,1),p.updateValue()}else p.value=[e],p.updateValue()},p.setValue=function(e){p.value=e,p.updateValue()},p.updateValue=function(e){p.wrapper.find(".picker-calendar-day-selected").removeClass("picker-calendar-day-selected");var a,t;for(a=0;a<p.value.length;a++){var r=new Date(p.value[a]);p.wrapper.find('.picker-calendar-day[data-date="'+r.getFullYear()+"-"+r.getMonth()+"-"+r.getDate()+'"]').addClass("picker-calendar-day-selected")}if(p.params.onChange&&p.params.onChange(p,p.value),p.input&&p.input.length>0||i.params.material&&p.params.header){if(p.params.formatValue)t=p.params.formatValue(p,p.value);else{for(t=[],a=0;a<p.value.length;a++)t.push(n(p.value[a]));t=t.join(", ")}i.params.material&&p.params.header&&p.container.find(".picker-calendar-selected-date").text(t),p.input&&p.input.length>0&&!e&&(o(p.input).val(t),o(p.input).trigger("change"))}},p.initCalendarEvents=function(){function e(e){s||r||(r=!0,l=m="touchstart"===e.type?e.targetTouches[0].pageX:e.pageX,d=m="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY,f=(new Date).getTime(),C=0,T=!0,x=void 0,g=v=p.monthsTranslate)}function a(e){if(r){if(c="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,m="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY,"undefined"==typeof x&&(x=!!(x||Math.abs(m-d)>Math.abs(c-l))),p.isH&&x)return void(r=!1);if(e.preventDefault(),p.animating)return void(r=!1);T=!1,s||(s=!0,b=p.wrapper[0].offsetWidth,w=p.wrapper[0].offsetHeight,p.wrapper.transition(0)),e.preventDefault(),y=p.isH?c-l:m-d,C=y/(p.isH?b:w),v=100*(p.monthsTranslate*u+C),p.wrapper.transform("translate3d("+(p.isH?v:0)+"%, "+(p.isH?0:v)+"%, 0)")}}function t(e){return r&&s?(r=s=!1,h=(new Date).getTime(),300>h-f?Math.abs(y)<10?p.resetMonth():y>=10?i.rtl?p.nextMonth():p.prevMonth():i.rtl?p.prevMonth():p.nextMonth():-.5>=C?i.rtl?p.prevMonth():p.nextMonth():C>=.5?i.rtl?p.nextMonth():p.prevMonth():p.resetMonth(),void setTimeout(function(){T=!0},100)):void(r=s=!1)}function n(e){if(T){var a=o(e.target).parents(".picker-calendar-day");if(0===a.length&&o(e.target).hasClass("picker-calendar-day")&&(a=o(e.target)),0!==a.length&&(!a.hasClass("picker-calendar-day-selected")||p.params.multiple)&&!a.hasClass("picker-calendar-day-disabled")){a.hasClass("picker-calendar-day-next")&&p.nextMonth(),a.hasClass("picker-calendar-day-prev")&&p.prevMonth();var t=a.attr("data-year"),n=a.attr("data-month"),r=a.attr("data-day");p.params.onDayClick&&p.params.onDayClick(p,a[0],t,n,r),p.addValue(new Date(t,n,r).getTime()),p.params.closeOnSelect&&p.close()}}}var r,s,l,d,c,m,f,h,g,v,b,w,C,y,x,T=!0;p.container.find(".picker-calendar-prev-month").on("click",p.prevMonth),p.container.find(".picker-calendar-next-month").on("click",p.nextMonth),p.container.find(".picker-calendar-prev-year").on("click",p.prevYear),p.container.find(".picker-calendar-next-year").on("click",p.nextYear),p.wrapper.on("click",n),p.params.touchMove&&(p.wrapper.on(i.touchEvents.start,e),p.wrapper.on(i.touchEvents.move,a),p.wrapper.on(i.touchEvents.end,t)),p.container[0].f7DestroyCalendarEvents=function(){p.container.find(".picker-calendar-prev-month").off("click",p.prevMonth),p.container.find(".picker-calendar-next-month").off("click",p.nextMonth),p.container.find(".picker-calendar-prev-year").off("click",p.prevYear),p.container.find(".picker-calendar-next-year").off("click",p.nextYear),p.wrapper.off("click",n),p.params.touchMove&&(p.wrapper.off(i.touchEvents.start,e),p.wrapper.off(i.touchEvents.move,a),p.wrapper.off(i.touchEvents.end,t))}},p.destroyCalendarEvents=function(e){"f7DestroyCalendarEvents"in p.container[0]&&p.container[0].f7DestroyCalendarEvents()},p.daysInMonth=function(e){var a=new Date(e);return new Date(a.getFullYear(),a.getMonth()+1,0).getDate()},p.monthHTML=function(e,a){e=new Date(e);{var t=e.getFullYear(),n=e.getMonth();e.getDate()}"next"===a&&(e=11===n?new Date(t+1,0):new Date(t,n+1,1)),"prev"===a&&(e=0===n?new Date(t-1,11):new Date(t,n-1,1)),("next"===a||"prev"===a)&&(n=e.getMonth(),t=e.getFullYear());var r=p.daysInMonth(new Date(e.getFullYear(),e.getMonth()).getTime()-864e6),i=p.daysInMonth(e),s=new Date(e.getFullYear(),e.getMonth()).getDay();0===s&&(s=7);var o,l,d,c=[],u=6,m=7,f="",h=0+(p.params.firstDay-1),g=(new Date).setHours(0,0,0,0),v=p.params.minDate?new Date(p.params.minDate).getTime():null,b=p.params.maxDate?new Date(p.params.maxDate).getTime():null;if(p.value&&p.value.length)for(l=0;l<p.value.length;l++)c.push(new Date(p.value[l]).setHours(0,0,0,0));for(l=1;u>=l;l++){var w="";for(d=1;m>=d;d++){var C=d;h++;var y=h-s,x="";0>y?(y=r+y+1,x+=" picker-calendar-day-prev",o=new Date(0>n-1?t-1:t,0>n-1?11:n-1,y).getTime()):(y+=1,y>i?(y-=i,x+=" picker-calendar-day-next",o=new Date(n+1>11?t+1:t,n+1>11?0:n+1,y).getTime()):o=new Date(t,n,y).getTime()),o===g&&(x+=" picker-calendar-day-today"),c.indexOf(o)>=0&&(x+=" picker-calendar-day-selected"),p.params.weekendDays.indexOf(C-1)>=0&&(x+=" picker-calendar-day-weekend"),(v&&v>o||b&&o>b)&&(x+=" picker-calendar-day-disabled"),o=new Date(o);var T=o.getFullYear(),k=o.getMonth();w+='<div data-year="'+T+'" data-month="'+k+'" data-day="'+y+'" class="picker-calendar-day'+x+'" data-date="'+(T+"-"+k+"-"+y)+'"><span>'+y+"</span></div>"}f+='<div class="picker-calendar-row">'+w+"</div>"}return f='<div class="picker-calendar-month" data-year="'+t+'" data-month="'+n+'">'+f+"</div>"},p.animating=!1,p.updateCurrentMonthYear=function(e){"undefined"==typeof e?(p.currentMonth=parseInt(p.months.eq(1).attr("data-month"),10),p.currentYear=parseInt(p.months.eq(1).attr("data-year"),10)):(p.currentMonth=parseInt(p.months.eq("next"===e?p.months.length-1:0).attr("data-month"),10),p.currentYear=parseInt(p.months.eq("next"===e?p.months.length-1:0).attr("data-year"),10)),p.container.find(".current-month-value").text(p.params.monthNames[p.currentMonth]),p.container.find(".current-year-value").text(p.currentYear)},p.onMonthChangeStart=function(e){p.updateCurrentMonthYear(e),p.months.removeClass("picker-calendar-month-current picker-calendar-month-prev picker-calendar-month-next");var a="next"===e?p.months.length-1:0;p.months.eq(a).addClass("picker-calendar-month-current"),p.months.eq("next"===e?a-1:a+1).addClass("next"===e?"picker-calendar-month-prev":"picker-calendar-month-next"),p.params.onMonthYearChangeStart&&p.params.onMonthYearChangeStart(p,p.currentYear,p.currentMonth)},p.onMonthChangeEnd=function(e,a){p.animating=!1;var t,n,r;p.wrapper.find(".picker-calendar-month:not(.picker-calendar-month-prev):not(.picker-calendar-month-current):not(.picker-calendar-month-next)").remove(),"undefined"==typeof e&&(e="next",a=!0),a?(p.wrapper.find(".picker-calendar-month-next, .picker-calendar-month-prev").remove(),n=p.monthHTML(new Date(p.currentYear,p.currentMonth),"prev"),t=p.monthHTML(new Date(p.currentYear,p.currentMonth),"next")):r=p.monthHTML(new Date(p.currentYear,p.currentMonth),e),("next"===e||a)&&p.wrapper.append(r||t),("prev"===e||a)&&p.wrapper.prepend(r||n),p.months=p.wrapper.find(".picker-calendar-month"),p.setMonthsTranslate(p.monthsTranslate),p.params.onMonthAdd&&p.params.onMonthAdd(p,"next"===e?p.months.eq(p.months.length-1)[0]:p.months.eq(0)[0]),p.params.onMonthYearChangeEnd&&p.params.onMonthYearChangeEnd(p,p.currentYear,p.currentMonth)},p.setMonthsTranslate=function(e){e=e||p.monthsTranslate||0,"undefined"==typeof p.monthsTranslate&&(p.monthsTranslate=e),p.months.removeClass("picker-calendar-month-current picker-calendar-month-prev picker-calendar-month-next");var a=100*-(e+1)*u,t=100*-e*u,n=100*-(e-1)*u;p.months.eq(0).transform("translate3d("+(p.isH?a:0)+"%, "+(p.isH?0:a)+"%, 0)").addClass("picker-calendar-month-prev"),p.months.eq(1).transform("translate3d("+(p.isH?t:0)+"%, "+(p.isH?0:t)+"%, 0)").addClass("picker-calendar-month-current"),p.months.eq(2).transform("translate3d("+(p.isH?n:0)+"%, "+(p.isH?0:n)+"%, 0)").addClass("picker-calendar-month-next")},p.nextMonth=function(e){("undefined"==typeof e||"object"==typeof e)&&(e="",p.params.animate||(e=0));var a=parseInt(p.months.eq(p.months.length-1).attr("data-month"),10),t=parseInt(p.months.eq(p.months.length-1).attr("data-year"),10),n=new Date(t,a),r=n.getTime(),i=p.animating?!1:!0;if(p.params.maxDate&&r>new Date(p.params.maxDate).getTime())return p.resetMonth();if(p.monthsTranslate--,a===p.currentMonth){var s=100*-p.monthsTranslate*u,l=o(p.monthHTML(r,"next")).transform("translate3d("+(p.isH?s:0)+"%, "+(p.isH?0:s)+"%, 0)").addClass("picker-calendar-month-next");p.wrapper.append(l[0]),p.months=p.wrapper.find(".picker-calendar-month"),p.params.onMonthAdd&&p.params.onMonthAdd(p,p.months.eq(p.months.length-1)[0])}p.animating=!0,p.onMonthChangeStart("next");var d=100*p.monthsTranslate*u;p.wrapper.transition(e).transform("translate3d("+(p.isH?d:0)+"%, "+(p.isH?0:d)+"%, 0)"),i&&p.wrapper.transitionEnd(function(){p.onMonthChangeEnd("next")}),p.params.animate||p.onMonthChangeEnd("next");

},p.prevMonth=function(e){("undefined"==typeof e||"object"==typeof e)&&(e="",p.params.animate||(e=0));var a=parseInt(p.months.eq(0).attr("data-month"),10),t=parseInt(p.months.eq(0).attr("data-year"),10),n=new Date(t,a+1,-1),r=n.getTime(),i=p.animating?!1:!0;if(p.params.minDate&&r<new Date(p.params.minDate).getTime())return p.resetMonth();if(p.monthsTranslate++,a===p.currentMonth){var s=100*-p.monthsTranslate*u,l=o(p.monthHTML(r,"prev")).transform("translate3d("+(p.isH?s:0)+"%, "+(p.isH?0:s)+"%, 0)").addClass("picker-calendar-month-prev");p.wrapper.prepend(l[0]),p.months=p.wrapper.find(".picker-calendar-month"),p.params.onMonthAdd&&p.params.onMonthAdd(p,p.months.eq(0)[0])}p.animating=!0,p.onMonthChangeStart("prev");var d=100*p.monthsTranslate*u;p.wrapper.transition(e).transform("translate3d("+(p.isH?d:0)+"%, "+(p.isH?0:d)+"%, 0)"),i&&p.wrapper.transitionEnd(function(){p.onMonthChangeEnd("prev")}),p.params.animate||p.onMonthChangeEnd("prev")},p.resetMonth=function(e){"undefined"==typeof e&&(e="");var a=100*p.monthsTranslate*u;p.wrapper.transition(e).transform("translate3d("+(p.isH?a:0)+"%, "+(p.isH?0:a)+"%, 0)")},p.setYearMonth=function(e,a,t){"undefined"==typeof e&&(e=p.currentYear),"undefined"==typeof a&&(a=p.currentMonth),("undefined"==typeof t||"object"==typeof t)&&(t="",p.params.animate||(t=0));var n;if(n=e<p.currentYear?new Date(e,a+1,-1).getTime():new Date(e,a).getTime(),p.params.maxDate&&n>new Date(p.params.maxDate).getTime())return!1;if(p.params.minDate&&n<new Date(p.params.minDate).getTime())return!1;var r=new Date(p.currentYear,p.currentMonth).getTime(),i=n>r?"next":"prev",s=p.monthHTML(new Date(e,a));p.monthsTranslate=p.monthsTranslate||0;var o,l,d=p.monthsTranslate,c=p.animating?!1:!0;n>r?(p.monthsTranslate--,p.animating||p.months.eq(p.months.length-1).remove(),p.wrapper.append(s),p.months=p.wrapper.find(".picker-calendar-month"),o=100*-(d-1)*u,p.months.eq(p.months.length-1).transform("translate3d("+(p.isH?o:0)+"%, "+(p.isH?0:o)+"%, 0)").addClass("picker-calendar-month-next")):(p.monthsTranslate++,p.animating||p.months.eq(0).remove(),p.wrapper.prepend(s),p.months=p.wrapper.find(".picker-calendar-month"),o=100*-(d+1)*u,p.months.eq(0).transform("translate3d("+(p.isH?o:0)+"%, "+(p.isH?0:o)+"%, 0)").addClass("picker-calendar-month-prev")),p.params.onMonthAdd&&p.params.onMonthAdd(p,"next"===i?p.months.eq(p.months.length-1)[0]:p.months.eq(0)[0]),p.animating=!0,p.onMonthChangeStart(i),l=100*p.monthsTranslate*u,p.wrapper.transition(t).transform("translate3d("+(p.isH?l:0)+"%, "+(p.isH?0:l)+"%, 0)"),c&&p.wrapper.transitionEnd(function(){p.onMonthChangeEnd(i,!0)}),p.params.animate||p.onMonthChangeEnd(i)},p.nextYear=function(){p.setYearMonth(p.currentYear+1)},p.prevYear=function(){p.setYearMonth(p.currentYear-1)},p.layout=function(){var e,a="",t="",n=p.value&&p.value.length?p.value[0]:(new Date).setHours(0,0,0,0),r=p.monthHTML(n,"prev"),i=p.monthHTML(n),s=p.monthHTML(n,"next"),o='<div class="picker-calendar-months"><div class="picker-calendar-months-wrapper">'+(r+i+s)+"</div></div>",l="";if(p.params.weekHeader){for(e=0;7>e;e++){var d=e+p.params.firstDay>6?e-7+p.params.firstDay:e+p.params.firstDay,c=p.params.dayNamesShort[d];l+='<div class="picker-calendar-week-day '+(p.params.weekendDays.indexOf(d)>=0?"picker-calendar-week-day-weekend":"")+'"> '+c+"</div>"}l='<div class="picker-calendar-week-days">'+l+"</div>"}t="picker-modal picker-calendar "+(p.params.cssClass||"");var u=p.params.toolbar?p.params.toolbarTemplate.replace(/{{closeText}}/g,p.params.toolbarCloseText):"";p.params.toolbar&&(u=p.params.toolbarTemplate.replace(/{{closeText}}/g,p.params.toolbarCloseText).replace(/{{monthPicker}}/g,p.params.monthPicker?p.params.monthPickerTemplate:"").replace(/{{yearPicker}}/g,p.params.yearPicker?p.params.yearPickerTemplate:""));var m=p.params.header?p.params.headerTemplate.replace(/{{closeText}}/g,p.params.toolbarCloseText).replace(/{{placeholder}}/g,p.params.headerPlaceholder):"",f=p.params.footer?p.params.footerTemplate.replace(/{{closeText}}/g,p.params.toolbarCloseText):"";a='<div class="'+t+'">'+m+f+u+'<div class="picker-modal-inner">'+l+o+"</div></div>",p.pickerHTML=a},p.params.input&&(p.input=o(p.params.input),p.input.length>0&&(p.params.inputReadOnly&&p.input.prop("readOnly",!0),p.inline||p.input.on("click",r),p.params.inputReadOnly&&p.input.on("focus mousedown",function(e){e.preventDefault()}))),p.inline||o("html").on("click",s),p.opened=!1,p.open=function(){var e=a(),t=!1;p.opened||(p.value||p.params.value&&(p.value=p.params.value,t=!0),p.layout(),e?(p.pickerHTML='<div class="popover popover-picker-calendar"><div class="popover-inner">'+p.pickerHTML+"</div></div>",p.popover=i.popover(p.pickerHTML,p.params.input,!0),p.container=o(p.popover).find(".picker-modal"),o(p.popover).on("close",function(){l()})):p.inline?(p.container=o(p.pickerHTML),p.container.addClass("picker-modal-inline"),o(p.params.container).append(p.container)):(p.container=o(i.pickerModal(p.pickerHTML)),o(p.container).on("close",function(){l()})),p.container[0].f7Calendar=p,p.wrapper=p.container.find(".picker-calendar-months-wrapper"),p.months=p.wrapper.find(".picker-calendar-month"),p.updateCurrentMonthYear(),p.monthsTranslate=0,p.setMonthsTranslate(),p.initCalendarEvents(),t?p.updateValue():i.params.material&&p.value&&p.updateValue(!0),p.input&&p.input.length>0&&i.params.material&&p.input.trigger("focus")),p.opened=!0,p.initialized=!0,p.params.onMonthAdd&&p.months.each(function(){p.params.onMonthAdd(p,this)}),p.params.onOpen&&p.params.onOpen(p)},p.close=function(){return p.opened&&!p.inline?t()?void i.closeModal(p.popover):void i.closeModal(p.container):void 0},p.destroy=function(){p.close(),p.params.input&&p.input.length>0&&p.input.off("click focus",r),o("html").off("click",s)},p.inline&&p.open(),p};i.calendar=function(e){return new w(e)};var C;i.addNotification=function(e){if(e){"undefined"==typeof e.media&&(e.media=i.params.notificationMedia),"undefined"==typeof e.title&&(e.title=i.params.notificationTitle),"undefined"==typeof e.subtitle&&(e.subtitle=i.params.notificationSubtitle),"undefined"==typeof e.closeIcon&&(e.closeIcon=i.params.notificationCloseIcon),"undefined"==typeof e.hold&&(e.hold=i.params.notificationHold),"undefined"==typeof e.closeOnClick&&(e.closeOnClick=i.params.notificationCloseOnClick),"undefined"==typeof e.button&&(e.button=i.params.notificationCloseButtonText&&{text:i.params.notificationCloseButtonText,close:!0}),C||(C=document.createElement("div")),e.material=i.params.material;var a=o(".notifications");0===a.length&&(o("body").append('<div class="notifications list-block'+(e.material?"":" media-list")+'"><ul></ul></div>'),a=o(".notifications"));var t=a.children("ul"),n=i.params.notificationTemplate||'{{#if custom}}<li>{{custom}}</li>{{else}}<li class="notification-item notification-hidden"><div class="item-content">{{#if material}}<div class="item-inner"><div class="item-title">{{js "this.message || this.title || this.subtitle"}}</div>{{#if ../button}}{{#button}}<div class="item-after"><a href="#" class="button {{#if color}}color-{{color}}{{/if}} {{#js_compare "this.close !== false"}}close-notification{{/js_compare}}">{{text}}</a></div>{{/button}}{{/if}}</div>{{else}}{{#if media}}<div class="item-media">{{media}}</div>{{/if}}<div class="item-inner"><div class="item-title-row">{{#if title}}<div class="item-title">{{title}}</div>{{/if}}{{#if closeIcon}}<div class="item-after"><a href="#" class="close-notification"><span></span></a></div>{{/if}}</div>{{#if subtitle}}<div class="item-subtitle">{{subtitle}}</div>{{/if}}{{#if message}}<div class="item-text">{{message}}</div></div>{{/if}}{{/if}}</div></li>{{/if}}';i._compiledTemplates.notification||(i._compiledTemplates.notification=l.compile(n)),C.innerHTML=i._compiledTemplates.notification(e);var r=o(C).children();r.on("click",function(a){var t=!1,n=o(a.target);e.material&&n.hasClass("button")&&e.button&&e.button.onClick&&e.button.onClick.call(n[0],a,r[0]),n.is(".close-notification")||o(a.target).parents(".close-notification").length>0?t=!0:(e.onClick&&e.onClick(a,r[0]),e.closeOnClick&&(t=!0)),t&&i.closeNotification(r[0])}),e.onClose&&r.data("f7NotificationOnClose",function(){e.onClose(r[0])}),e.additionalClass&&r.addClass(e.additionalClass),e.hold&&setTimeout(function(){r.length>0&&i.closeNotification(r[0])},e.hold),t[e.material?"append":"prepend"](r[0]),a.show();var s,p=r.outerHeight();return e.material?(a.transform("translate3d(0, "+p+"px, 0)"),a.transition(0),s=r[0].clientLeft,a.transform("translate3d(0, 0, 0)"),a.transition("")):(r.css("marginTop",-p+"px"),r.transition(0),s=r[0].clientLeft,r.transition(""),r.css("marginTop","0px")),a.transform("translate3d(0, 0,0)"),r.removeClass("notification-hidden"),r[0]}},i.closeNotification=function(e){if(e=o(e),0!==e.length&&!e.hasClass("notification-item-removing")){var a=o(".notifications"),t=e.outerHeight();e.css("height",t+"px").transition(0);{e[0].clientLeft}e.css("height","0px").transition("").addClass("notification-item-removing"),e.data("f7NotificationOnClose")&&e.data("f7NotificationOnClose")(),0===a.find(".notification-item:not(.notification-item-removing)").length&&a.transform(""),e.addClass("notification-hidden").transitionEnd(function(){e.remove(),0===a.find(".notification-item").length&&a.hide()})}},i.initTemplate7Templates=function(){window.Template7&&(Template7.templates=Template7.templates||i.params.templates||{},Template7.data=Template7.data||i.params.template7Data||{},Template7.cache=Template7.cache||{},i.templates=Template7.templates,i.template7Data=Template7.data,i.template7Cache=Template7.cache,i.params.precompileTemplates&&o('script[type="text/template7"]').each(function(){var e=o(this).attr("id");e&&(Template7.templates[e]=Template7.compile(o(this).html()))}))};var y=[];return i.initPlugins=function(){for(var e in i.plugins){var a=i.plugins[e](i,i.params[e]);a&&y.push(a)}},i.pluginHook=function(e){for(var a=0;a<y.length;a++)y[a].hooks&&e in y[a].hooks&&y[a].hooks[e](arguments[1],arguments[2],arguments[3],arguments[4],arguments[5])},i.pluginPrevent=function(e){for(var a=!1,t=0;t<y.length;t++)y[t].prevents&&e in y[t].prevents&&y[t].prevents[e](arguments[1],arguments[2],arguments[3],arguments[4],arguments[5])&&(a=!0);return a},i.pluginProcess=function(e,a){for(var t=a,n=0;n<y.length;n++)y[n].preprocess&&process in y[n].preprocess&&(t=y[n].preprocess[process](a,arguments[2],arguments[3],arguments[4],arguments[5],arguments[6]));return t},i.init=function(){i.initTemplate7Templates&&i.initTemplate7Templates(),i.initPlugins&&i.initPlugins(),i.getDeviceInfo&&i.getDeviceInfo(),i.initFastClicks&&i.params.fastClicks&&i.initFastClicks(),i.initClickEvents&&i.initClickEvents(),o(".page:not(.cached)").each(function(){i.initPageWithCallback(this)}),o(".navbar:not(.cached)").each(function(){i.initNavbarWithCallback(this)}),i.initResize&&i.initResize(),i.initPushState&&i.params.pushState&&i.initPushState(),i.initSwipeout&&i.params.swipeout&&i.initSwipeout(),i.initSortable&&i.params.sortable&&i.initSortable(),i.initSwipePanels&&(i.params.swipePanel||i.params.swipePanelOnlyClose)&&i.initSwipePanels(),i.params.material&&i.initMaterialWatchInputs&&i.initMaterialWatchInputs(),i.params.onAppInit&&i.params.onAppInit(),i.pluginHook("appInit")},i.params.init&&i.init(),i};var e=function(){var e=function(e){var a=this,t=0;for(t=0;t<e.length;t++)a[t]=e[t];return a.length=e.length,this},a=function(a,t){var n=[],r=0;if(a&&!t&&a instanceof e)return a;if(a)if("string"==typeof a){var i,s,o=a.trim();if(o.indexOf("<")>=0&&o.indexOf(">")>=0){var l="div";for(0===o.indexOf("<li")&&(l="ul"),0===o.indexOf("<tr")&&(l="tbody"),(0===o.indexOf("<td")||0===o.indexOf("<th"))&&(l="tr"),0===o.indexOf("<tbody")&&(l="table"),0===o.indexOf("<option")&&(l="select"),s=document.createElement(l),s.innerHTML=a,r=0;r<s.childNodes.length;r++)n.push(s.childNodes[r])}else for(i=t||"#"!==a[0]||a.match(/[ .<>:~]/)?(t||document).querySelectorAll(a):[document.getElementById(a.split("#")[1])],r=0;r<i.length;r++)i[r]&&n.push(i[r])}else if(a.nodeType||a===window||a===document)n.push(a);else if(a.length>0&&a[0].nodeType)for(r=0;r<a.length;r++)n.push(a[r]);return new e(n)};e.prototype={addClass:function(e){if("undefined"==typeof e)return this;for(var a=e.split(" "),t=0;t<a.length;t++)for(var n=0;n<this.length;n++)"undefined"!=typeof this[n].classList&&this[n].classList.add(a[t]);return this},removeClass:function(e){for(var a=e.split(" "),t=0;t<a.length;t++)for(var n=0;n<this.length;n++)"undefined"!=typeof this[n].classList&&this[n].classList.remove(a[t]);return this},hasClass:function(e){return this[0]?this[0].classList.contains(e):!1},toggleClass:function(e){for(var a=e.split(" "),t=0;t<a.length;t++)for(var n=0;n<this.length;n++)"undefined"!=typeof this[n].classList&&this[n].classList.toggle(a[t]);return this},attr:function(e,a){if(1===arguments.length&&"string"==typeof e)return this[0]?this[0].getAttribute(e):void 0;for(var t=0;t<this.length;t++)if(2===arguments.length)this[t].setAttribute(e,a);else for(var n in e)this[t][n]=e[n],this[t].setAttribute(n,e[n]);return this},removeAttr:function(e){for(var a=0;a<this.length;a++)this[a].removeAttribute(e);return this},prop:function(e,a){if(1===arguments.length&&"string"==typeof e)return this[0]?this[0][e]:void 0;for(var t=0;t<this.length;t++)if(2===arguments.length)this[t][e]=a;else for(var n in e)this[t][n]=e[n];return this},data:function(e,a){if("undefined"==typeof a){if(this[0]){var t=this[0].getAttribute("data-"+e);return t?t:this[0].dom7ElementDataStorage&&e in this[0].dom7ElementDataStorage?this[0].dom7ElementDataStorage[e]:void 0}return void 0}for(var n=0;n<this.length;n++){var r=this[n];r.dom7ElementDataStorage||(r.dom7ElementDataStorage={}),r.dom7ElementDataStorage[e]=a}return this},removeData:function(e){for(var a=0;a<this.length;a++){var t=this[a];t.dom7ElementDataStorage&&t.dom7ElementDataStorage[e]&&(t.dom7ElementDataStorage[e]=null,delete t.dom7ElementDataStorage[e])}},dataset:function(){var e=this[0];if(e){var t={};if(e.dataset)for(var n in e.dataset)t[n]=e.dataset[n];else for(var r=0;r<e.attributes.length;r++){var i=e.attributes[r];i.name.indexOf("data-")>=0&&(t[a.toCamelCase(i.name.split("data-")[1])]=i.value)}for(var s in t)"false"===t[s]?t[s]=!1:"true"===t[s]?t[s]=!0:parseFloat(t[s])===1*t[s]&&(t[s]=1*t[s]);return t}return void 0},val:function(e){if("undefined"==typeof e)return this[0]?this[0].value:void 0;for(var a=0;a<this.length;a++)this[a].value=e;return this},transform:function(e){for(var a=0;a<this.length;a++){var t=this[a].style;t.webkitTransform=t.MsTransform=t.msTransform=t.MozTransform=t.OTransform=t.transform=e}return this},transition:function(e){"string"!=typeof e&&(e+="ms");for(var a=0;a<this.length;a++){var t=this[a].style;t.webkitTransitionDuration=t.MsTransitionDuration=t.msTransitionDuration=t.MozTransitionDuration=t.OTransitionDuration=t.transitionDuration=e}return this},on:function(e,t,n,r){function i(e){var r=e.target;if(a(r).is(t))n.call(r,e);else for(var i=a(r).parents(),s=0;s<i.length;s++)a(i[s]).is(t)&&n.call(i[s],e)}var s,o,l=e.split(" ");for(s=0;s<this.length;s++)if("function"==typeof t||t===!1)for("function"==typeof t&&(n=arguments[1],r=arguments[2]||!1),o=0;o<l.length;o++)this[s].addEventListener(l[o],n,r);else for(o=0;o<l.length;o++)this[s].dom7LiveListeners||(this[s].dom7LiveListeners=[]),this[s].dom7LiveListeners.push({listener:n,liveListener:i}),this[s].addEventListener(l[o],i,r);return this},off:function(e,a,t,n){for(var r=e.split(" "),i=0;i<r.length;i++)for(var s=0;s<this.length;s++)if("function"==typeof a||a===!1)"function"==typeof a&&(t=arguments[1],n=arguments[2]||!1),this[s].removeEventListener(r[i],t,n);else if(this[s].dom7LiveListeners)for(var o=0;o<this[s].dom7LiveListeners.length;o++)this[s].dom7LiveListeners[o].listener===t&&this[s].removeEventListener(r[i],this[s].dom7LiveListeners[o].liveListener,n);return this},once:function(e,a,t,n){function r(s){t(s),i.off(e,a,r,n)}var i=this;"function"==typeof a&&(a=!1,t=arguments[1],n=arguments[2]),i.on(e,a,r,n)},trigger:function(e,a){for(var t=0;t<this.length;t++){var n;try{n=new CustomEvent(e,{detail:a,bubbles:!0,cancelable:!0})}catch(r){n=document.createEvent("Event"),n.initEvent(e,!0,!0),n.detail=a}this[t].dispatchEvent(n)}return this},transitionEnd:function(e){function a(i){if(i.target===this)for(e.call(this,i),t=0;t<n.length;t++)r.off(n[t],a)}var t,n=["webkitTransitionEnd","transitionend","oTransitionEnd","MSTransitionEnd","msTransitionEnd"],r=this;if(e)for(t=0;t<n.length;t++)r.on(n[t],a);return this},animationEnd:function(e){function a(i){for(e(i),t=0;t<n.length;t++)r.off(n[t],a)}var t,n=["webkitAnimationEnd","OAnimationEnd","MSAnimationEnd","animationend"],r=this;if(e)for(t=0;t<n.length;t++)r.on(n[t],a);return this},width:function(){return this[0]===window?window.innerWidth:this.length>0?parseFloat(this.css("width")):null},outerWidth:function(e){if(this.length>0){if(e){var a=this.styles();return this[0].offsetWidth+parseFloat(a.getPropertyValue("margin-right"))+parseFloat(a.getPropertyValue("margin-left"))}return this[0].offsetWidth}return null},height:function(){return this[0]===window?window.innerHeight:this.length>0?parseFloat(this.css("height")):null},outerHeight:function(e){if(this.length>0){if(e){var a=this.styles();return this[0].offsetHeight+parseFloat(a.getPropertyValue("margin-top"))+parseFloat(a.getPropertyValue("margin-bottom"))}return this[0].offsetHeight}return null},offset:function(){if(this.length>0){var e=this[0],a=e.getBoundingClientRect(),t=document.body,n=e.clientTop||t.clientTop||0,r=e.clientLeft||t.clientLeft||0,i=window.pageYOffset||e.scrollTop,s=window.pageXOffset||e.scrollLeft;return{top:a.top+i-n,left:a.left+s-r}}return null},hide:function(){for(var e=0;e<this.length;e++)this[e].style.display="none";return this},show:function(){for(var e=0;e<this.length;e++)this[e].style.display="block";return this},styles:function(){return this[0]?window.getComputedStyle(this[0],null):void 0},css:function(e,a){var t;if(1===arguments.length){if("string"!=typeof e){for(t=0;t<this.length;t++)for(var n in e)this[t].style[n]=e[n];return this}if(this[0])return window.getComputedStyle(this[0],null).getPropertyValue(e)}if(2===arguments.length&&"string"==typeof e){for(t=0;t<this.length;t++)this[t].style[e]=a;return this}return this},each:function(e){for(var a=0;a<this.length;a++)e.call(this[a],a,this[a]);return this},filter:function(a){for(var t=[],n=this,r=0;r<n.length;r++)a.call(n[r],r,n[r])&&t.push(n[r]);return new e(t)},html:function(e){if("undefined"==typeof e)return this[0]?this[0].innerHTML:void 0;for(var a=0;a<this.length;a++)this[a].innerHTML=e;return this},text:function(e){if("undefined"==typeof e)return this[0]?this[0].textContent.trim():null;for(var a=0;a<this.length;a++)this[a].textContent=e},is:function(t){if(!this[0]||"undefined"==typeof t)return!1;var n,r;if("string"==typeof t){var i=this[0];if(i===document)return t===document;if(i===window)return t===window;if(i.matches)return i.matches(t);if(i.webkitMatchesSelector)return i.webkitMatchesSelector(t);if(i.mozMatchesSelector)return i.mozMatchesSelector(t);if(i.msMatchesSelector)return i.msMatchesSelector(t);for(n=a(t),r=0;r<n.length;r++)if(n[r]===this[0])return!0;return!1}if(t===document)return this[0]===document;if(t===window)return this[0]===window;if(t.nodeType||t instanceof e){for(n=t.nodeType?[t]:t,r=0;r<n.length;r++)if(n[r]===this[0])return!0;return!1}return!1},indexOf:function(e){for(var a=0;a<this.length;a++)if(this[a]===e)return a},index:function(){if(this[0]){for(var e=this[0],a=0;null!==(e=e.previousSibling);)1===e.nodeType&&a++;return a}return void 0},eq:function(a){if("undefined"==typeof a)return this;var t,n=this.length;return a>n-1?new e([]):0>a?(t=n+a,new e(0>t?[]:[this[t]])):new e([this[a]])},append:function(a){var t,n;for(t=0;t<this.length;t++)if("string"==typeof a){var r=document.createElement("div");for(r.innerHTML=a;r.firstChild;)this[t].appendChild(r.firstChild)}else if(a instanceof e)for(n=0;n<a.length;n++)this[t].appendChild(a[n]);else this[t].appendChild(a);return this},prepend:function(a){var t,n;for(t=0;t<this.length;t++)if("string"==typeof a){var r=document.createElement("div");for(r.innerHTML=a,n=r.childNodes.length-1;n>=0;n--)this[t].insertBefore(r.childNodes[n],this[t].childNodes[0])}else if(a instanceof e)for(n=0;n<a.length;n++)this[t].insertBefore(a[n],this[t].childNodes[0]);else this[t].insertBefore(a,this[t].childNodes[0]);return this},insertBefore:function(e){for(var t=a(e),n=0;n<this.length;n++)if(1===t.length)t[0].parentNode.insertBefore(this[n],t[0]);else if(t.length>1)for(var r=0;r<t.length;r++)t[r].parentNode.insertBefore(this[n].cloneNode(!0),t[r])},insertAfter:function(e){for(var t=a(e),n=0;n<this.length;n++)if(1===t.length)t[0].parentNode.insertBefore(this[n],t[0].nextSibling);else if(t.length>1)for(var r=0;r<t.length;r++)t[r].parentNode.insertBefore(this[n].cloneNode(!0),t[r].nextSibling)},next:function(t){return new e(this.length>0?t?this[0].nextElementSibling&&a(this[0].nextElementSibling).is(t)?[this[0].nextElementSibling]:[]:this[0].nextElementSibling?[this[0].nextElementSibling]:[]:[])},nextAll:function(t){var n=[],r=this[0];if(!r)return new e([]);for(;r.nextElementSibling;){var i=r.nextElementSibling;t?a(i).is(t)&&n.push(i):n.push(i),r=i}return new e(n)},prev:function(t){return new e(this.length>0?t?this[0].previousElementSibling&&a(this[0].previousElementSibling).is(t)?[this[0].previousElementSibling]:[]:this[0].previousElementSibling?[this[0].previousElementSibling]:[]:[])},prevAll:function(t){var n=[],r=this[0];if(!r)return new e([]);for(;r.previousElementSibling;){var i=r.previousElementSibling;t?a(i).is(t)&&n.push(i):n.push(i),r=i}return new e(n)},parent:function(e){for(var t=[],n=0;n<this.length;n++)e?a(this[n].parentNode).is(e)&&t.push(this[n].parentNode):t.push(this[n].parentNode);return a(a.unique(t))},parents:function(e){for(var t=[],n=0;n<this.length;n++)for(var r=this[n].parentNode;r;)e?a(r).is(e)&&t.push(r):t.push(r),r=r.parentNode;return a(a.unique(t))},find:function(a){for(var t=[],n=0;n<this.length;n++)for(var r=this[n].querySelectorAll(a),i=0;i<r.length;i++)t.push(r[i]);return new e(t)},children:function(t){for(var n=[],r=0;r<this.length;r++)for(var i=this[r].childNodes,s=0;s<i.length;s++)t?1===i[s].nodeType&&a(i[s]).is(t)&&n.push(i[s]):1===i[s].nodeType&&n.push(i[s]);return new e(a.unique(n))},remove:function(){for(var e=0;e<this.length;e++)this[e].parentNode&&this[e].parentNode.removeChild(this[e]);return this},detach:function(){return this.remove()},add:function(){var e,t,n=this;for(e=0;e<arguments.length;e++){var r=a(arguments[e]);for(t=0;t<r.length;t++)n[n.length]=r[t],n.length++}return n}},function(){function t(t){e.prototype[t]=function(e){var n;if("undefined"==typeof e){for(n=0;n<this.length;n++)r.indexOf(t)<0&&(t in this[n]?this[n][t]():a(this[n]).trigger(t));return this}return this.on(t,e)}}for(var n="click blur focus focusin focusout keyup keydown keypress submit change mousedown mousemove mouseup mouseenter mouseleave mouseout mouseover touchstart touchend touchmove resize scroll".split(" "),r="resize scroll".split(" "),i=0;i<n.length;i++)t(n[i])}();var t={};a.ajaxSetup=function(e){e.type&&(e.method=e.type),a.each(e,function(e,a){t[e]=a})};var n=0;return a.ajax=function(e){function r(n,r,i){var s=arguments;n&&a(document).trigger(n,r),i&&(i in t&&t[i](s[3],s[4],s[5],s[6]),e[i]&&e[i](s[3],s[4],s[5],s[6]))}var i={method:"GET",data:!1,async:!0,cache:!0,user:"",password:"",headers:{},xhrFields:{},statusCode:{},processData:!0,dataType:"text",contentType:"application/x-www-form-urlencoded",timeout:0},s=["beforeSend","error","complete","success","statusCode"];e.type&&(e.method=e.type),a.each(t,function(e,a){s.indexOf(e)<0&&(i[e]=a)}),a.each(i,function(a,t){a in e||(e[a]=t)}),e.url||(e.url=window.location.toString());var o=e.url.indexOf("?")>=0?"&":"?",l=e.method.toUpperCase();if(("GET"===l||"HEAD"===l)&&e.data){var p;p="string"==typeof e.data?e.data.indexOf("?")>=0?e.data.split("?")[1]:e.data:a.serializeObject(e.data),e.url+=o+p}if("json"===e.dataType&&e.url.indexOf("callback=")>=0){var d,c="f7jsonp_"+Date.now()+n++,u=e.url.split("callback="),m=u[0]+"callback="+c;if(u[1].indexOf("&")>=0){var f=u[1].split("&").filter(function(e){return e.indexOf("=")>0}).join("&");f.length>0&&(m+="&"+f)}var h=document.createElement("script");return h.type="text/javascript",h.onerror=function(){clearTimeout(d),r(void 0,void 0,"error",null,"scripterror")},h.src=m,window[c]=function(e){clearTimeout(d),r(void 0,void 0,"success",e),h.parentNode.removeChild(h),h=null,delete window[c]},document.querySelector("head").appendChild(h),void(e.timeout>0&&(d=setTimeout(function(){h.parentNode.removeChild(h),h=null,r(void 0,void 0,"error",null,"timeout")},e.timeout)))}("GET"===l||"HEAD"===l)&&e.cache===!1&&(e.url+=o+"_nocache="+Date.now());var g=new XMLHttpRequest;g.requestUrl=e.url,g.requestParameters=e,g.open(l,e.url,e.async,e.user,e.password);var v=null;if(("POST"===l||"PUT"===l)&&e.data)if(e.processData){var b=[ArrayBuffer,Blob,Document,FormData];if(b.indexOf(e.data.constructor)>=0)v=e.data;else{var w="---------------------------"+Date.now().toString(16);"multipart/form-data"===e.contentType?g.setRequestHeader("Content-Type","multipart/form-data; boundary="+w):g.setRequestHeader("Content-Type",e.contentType),v="";var C=a.serializeObject(e.data);if("multipart/form-data"===e.contentType){w="---------------------------"+Date.now().toString(16),C=C.split("&");for(var y=[],x=0;x<C.length;x++)y.push('Content-Disposition: form-data; name="'+C[x].split("=")[0]+'"\r\n\r\n'+C[x].split("=")[1]+"\r\n");v="--"+w+"\r\n"+y.join("--"+w+"\r\n")+"--"+w+"--\r\n"}else v="application/x-www-form-urlencoded"===e.contentType?C:C.replace(/&/g,"\r\n")}}else v=e.data;e.headers&&a.each(e.headers,function(e,a){g.setRequestHeader(e,a)}),"undefined"==typeof e.crossDomain&&(e.crossDomain=/^([\w-]+:)?\/\/([^\/]+)/.test(e.url)&&RegExp.$2!==window.location.host),e.crossDomain||g.setRequestHeader("X-Requested-With","XMLHttpRequest"),e.xhrFields&&a.each(e.xhrFields,function(e,a){g[e]=a});var T;return g.onload=function(a){if(T&&clearTimeout(T),g.status>=200&&g.status<300||0===g.status){var n;if("json"===e.dataType)try{n=JSON.parse(g.responseText),r("ajaxSuccess",{xhr:g},"success",n,g.status,g)}catch(i){r("ajaxError",{xhr:g,parseerror:!0},"error",g,"parseerror")}else r("ajaxSuccess",{xhr:g},"success",g.responseText,g.status,g)}else r("ajaxError",{xhr:g},"error",g,g.status);e.statusCode&&(t.statusCode&&t.statusCode[g.status]&&t.statusCode[g.status](g),e.statusCode[g.status]&&e.statusCode[g.status](g)),r("ajaxComplete",{xhr:g},"complete",g,g.status)},g.onerror=function(e){T&&clearTimeout(T),r("ajaxError",{xhr:g},"error",g,g.status)},r("ajaxStart",{xhr:g},"start",g),r(void 0,void 0,"beforeSend",g),g.send(v),e.timeout>0&&(T=setTimeout(function(){g.abort(),r("ajaxError",{xhr:g,timeout:!0},"error",g,"timeout"),r("ajaxComplete",{xhr:g,timeout:!0},"complete",g,"timeout")},e.timeout)),g},function(){function e(e){a[e]=function(t,n,r){return a.ajax({url:t,method:"post"===e?"POST":"GET",data:"function"==typeof n?void 0:n,success:"function"==typeof n?n:r,dataType:"getJSON"===e?"json":void 0})}}for(var t="get post getJSON".split(" "),n=0;n<t.length;n++)e(t[n])}(),a.parseUrlQuery=function(e){var a,t,n,r={};if(!(e.indexOf("?")>=0))return r;for(e=e.split("?")[1],t=e.split("&"),a=0;a<t.length;a++)n=t[a].split("="),r[n[0]]=n[1];return r},a.isArray=function(e){return"[object Array]"===Object.prototype.toString.apply(e)?!0:!1},a.each=function(t,n){if("object"==typeof t&&n){var r,i;if(a.isArray(t)||t instanceof e)for(r=0;r<t.length;r++)n(r,t[r]);else for(i in t)t.hasOwnProperty(i)&&n(i,t[i])}},a.unique=function(e){for(var a=[],t=0;t<e.length;t++)-1===a.indexOf(e[t])&&a.push(e[t]);return a},a.serializeObject=function(e){if("string"==typeof e)return e;var t=[],n="&";for(var r in e)if(e.hasOwnProperty(r))if(a.isArray(e[r])){for(var i=[],s=0;s<e[r].length;s++)i.push(encodeURIComponent(r)+"="+encodeURIComponent(e[r][s]));i.length>0&&t.push(i.join(n))}else t.push(encodeURIComponent(r)+"="+encodeURIComponent(e[r]));return t.join(n)},a.toCamelCase=function(e){return e.toLowerCase().replace(/-(.)/g,function(e,a){return a.toUpperCase()})},a.dataset=function(e){return a(e).dataset()},a.getTranslate=function(e,a){var t,n,r,i;return"undefined"==typeof a&&(a="x"),r=window.getComputedStyle(e,null),window.WebKitCSSMatrix?i=new WebKitCSSMatrix("none"===r.webkitTransform?"":r.webkitTransform):(i=r.MozTransform||r.OTransform||r.MsTransform||r.msTransform||r.transform||r.getPropertyValue("transform").replace("translate(","matrix(1, 0, 0, 1,"),t=i.toString().split(",")),"x"===a&&(n=window.WebKitCSSMatrix?i.m41:parseFloat(16===t.length?t[12]:t[4])),"y"===a&&(n=window.WebKitCSSMatrix?i.m42:parseFloat(16===t.length?t[13]:t[5])),n||0},a.requestAnimationFrame=function(e){return window.requestAnimationFrame?window.requestAnimationFrame(e):window.webkitRequestAnimationFrame?window.webkitRequestAnimationFrame(e):window.mozRequestAnimationFrame?window.mozRequestAnimationFrame(e):window.setTimeout(e,1e3/60)},a.cancelAnimationFrame=function(e){return window.cancelAnimationFrame?window.cancelAnimationFrame(e):window.webkitCancelAnimationFrame?window.webkitCancelAnimationFrame(e):window.mozCancelAnimationFrame?window.mozCancelAnimationFrame(e):window.clearTimeout(e)},a.supportTouch=!!("ontouchstart"in window||window.DocumentTouch&&document instanceof DocumentTouch),a.fn=e.prototype,a.fn.scrollTo=function(e,t,n,r,i){return 4===arguments.length&&"function"==typeof r&&(i=r,r=void 0),this.each(function(){function s(e){void 0===e&&(e=(new Date).getTime()),null===b&&(b=e);var t,p=Math.max(Math.min((e-b)/n,1),0),d="linear"===r?p:.5-Math.cos(p*Math.PI)/2;return g&&(m=o+d*(c-o)),v&&(f=l+d*(u-l)),g&&c>o&&m>=c&&(h.scrollTop=c,t=!0),g&&o>c&&c>=m&&(h.scrollTop=c,t=!0),v&&u>l&&f>=u&&(h.scrollLeft=u,t=!0),v&&l>u&&u>=f&&(h.scrollLeft=u,t=!0),t?void(i&&i()):(g&&(h.scrollTop=m),v&&(h.scrollLeft=f),void a.requestAnimationFrame(s))}var o,l,p,d,c,u,m,f,h=this,g=t>0||0===t,v=e>0||0===e;if("undefined"==typeof r&&(r="swing"),g&&(o=h.scrollTop,n||(h.scrollTop=t)),v&&(l=h.scrollLeft,n||(h.scrollLeft=e)),n){g&&(p=h.scrollHeight-h.offsetHeight,c=Math.max(Math.min(t,p),0)),v&&(d=h.scrollWidth-h.offsetWidth,u=Math.max(Math.min(e,d),0));var b=null;g&&c===o&&(g=!1),v&&u===l&&(v=!1),a.requestAnimationFrame(s)}})},a.fn.scrollTop=function(e,a,t,n){3===arguments.length&&"function"==typeof t&&(n=t,t=void 0);var r=this;return"undefined"==typeof e?r.length>0?r[0].scrollTop:null:r.scrollTo(void 0,e,a,t,n)},a.fn.scrollLeft=function(e,a,t,n){3===arguments.length&&"function"==typeof t&&(n=t,t=void 0);var r=this;return"undefined"==typeof e?r.length>0?r[0].scrollLeft:null:r.scrollTo(e,void 0,a,t,n)},a}();Framework7.$=e;var a=e;window.Dom7=e,Framework7.prototype.support=function(){var e={touch:!!("ontouchstart"in window||window.DocumentTouch&&document instanceof DocumentTouch)};return e}(),Framework7.prototype.device=function(){var a={},t=navigator.userAgent,n=e,r=t.match(/(Android);?[\s\/]+([\d.]+)?/),i=t.match(/(iPad).*OS\s([\d_]+)/),s=t.match(/(iPod)(.*OS\s([\d_]+))?/),o=!i&&t.match(/(iPhone\sOS)\s([\d_]+)/);if(a.ios=a.android=a.iphone=a.ipad=a.androidChrome=!1,r&&(a.os="android",a.osVersion=r[2],a.android=!0,a.androidChrome=t.toLowerCase().indexOf("chrome")>=0),(i||o||s)&&(a.os="ios",a.ios=!0),o&&!s&&(a.osVersion=o[2].replace(/_/g,"."),a.iphone=!0),i&&(a.osVersion=i[2].replace(/_/g,"."),a.ipad=!0),s&&(a.osVersion=s[3]?s[3].replace(/_/g,"."):null,a.iphone=!0),a.ios&&a.osVersion&&t.indexOf("Version/")>=0&&"10"===a.osVersion.split(".")[0]&&(a.osVersion=t.toLowerCase().split("version/")[1].split(" ")[0]),a.webView=(o||i||s)&&t.match(/.*AppleWebKit(?!.*Safari)/i),a.os&&"ios"===a.os){var l=a.osVersion.split(".");a.minimalUi=!a.webView&&(s||o)&&(1*l[0]===7?1*l[1]>=1:1*l[0]>7)&&n('meta[name="viewport"]').length>0&&n('meta[name="viewport"]').attr("content").indexOf("minimal-ui")>=0}var p=n(window).width(),d=n(window).height();

a.statusBar=!1,a.statusBar=a.webView&&p*d===screen.width*screen.height?!0:!1;var c=[];if(a.pixelRatio=window.devicePixelRatio||1,c.push("pixel-ratio-"+Math.floor(a.pixelRatio)),a.pixelRatio>=2&&c.push("retina"),a.os&&(c.push(a.os,a.os+"-"+a.osVersion.split(".")[0],a.os+"-"+a.osVersion.replace(/\./g,"-")),"ios"===a.os))for(var u=parseInt(a.osVersion.split(".")[0],10),m=u-1;m>=6;m--)c.push("ios-gt-"+m);return a.statusBar?c.push("with-statusbar-overlay"):n("html").removeClass("with-statusbar-overlay"),c.length>0&&n("html").addClass(c.join(" ")),a}(),Framework7.prototype.plugins={},window.Template7=function(){function e(e){return"[object Array]"===Object.prototype.toString.apply(e)}function a(e){return"function"==typeof e}function t(e){var a,t,n,r=e.replace(/[{}#}]/g,"").split(" "),i=[];for(t=0;t<r.length;t++){var s=r[t];if(0===t)i.push(s);else if(0===s.indexOf('"'))if(2===s.match(/"/g).length)i.push(s);else{for(a=0,n=t+1;n<r.length;n++)if(s+=" "+r[n],r[n].indexOf('"')>=0){a=n,i.push(s);break}a&&(t=a)}else if(s.indexOf("=")>0){var o=s.split("="),l=o[0],p=o[1];if(2!==p.match(/"/g).length){for(a=0,n=t+1;n<r.length;n++)if(p+=" "+r[n],r[n].indexOf('"')>=0){a=n;break}a&&(t=a)}var d=[l,p.replace(/"/g,"")];i.push(d)}else i.push(s)}return i}function n(a){var n,r,i=[];if(!a)return[];var s=a.split(/({{[^{^}]*}})/);for(n=0;n<s.length;n++){var o=s[n];if(""!==o)if(o.indexOf("{{")<0)i.push({type:"plain",content:o});else{if(o.indexOf("{/")>=0)continue;if(o.indexOf("{#")<0&&o.indexOf(" ")<0&&o.indexOf("else")<0){i.push({type:"variable",contextName:o.replace(/[{}]/g,"")});continue}var l=t(o),p=l[0],d=">"===p,c=[],u={};for(r=1;r<l.length;r++){var m=l[r];e(m)?u[m[0]]="false"===m[1]?!1:m[1]:c.push(m)}if(o.indexOf("{#")>=0){var f,h="",g="",v=0,b=!1,w=!1,C=0;for(r=n+1;r<s.length;r++)if(s[r].indexOf("{{#")>=0&&C++,s[r].indexOf("{{/")>=0&&C--,s[r].indexOf("{{#"+p)>=0)h+=s[r],w&&(g+=s[r]),v++;else if(s[r].indexOf("{{/"+p)>=0){if(!(v>0)){f=r,b=!0;break}v--,h+=s[r],w&&(g+=s[r])}else s[r].indexOf("else")>=0&&0===C?w=!0:(w||(h+=s[r]),w&&(g+=s[r]));b&&(f&&(n=f),i.push({type:"helper",helperName:p,contextName:c,content:h,inverseContent:g,hash:u}))}else o.indexOf(" ")>0&&(d&&(p="_partial",c[0]&&(c[0]='"'+c[0].replace(/"|'/g,"")+'"')),i.push({type:"helper",helperName:p,contextName:c,hash:u}))}}return i}var r=function(e){function a(e,a){return e.content?s(e.content,a):function(){return""}}function t(e,a){return e.inverseContent?s(e.inverseContent,a):function(){return""}}function r(e,a){var t,n,r=0;if(0===e.indexOf("../")){r=e.split("../").length-1;var i=a.split("_")[1]-r;a="ctx_"+(i>=1?i:1),n=e.split("../")[r].split(".")}else 0===e.indexOf("@global")?(a="Template7.global",n=e.split("@global.")[1].split(".")):0===e.indexOf("@root")?(a="ctx_1",n=e.split("@root.")[1].split(".")):n=e.split(".");t=a;for(var s=0;s<n.length;s++){var o=n[s];0===o.indexOf("@")?s>0?t+="[(data && data."+o.replace("@","")+")]":t="(data && data."+e.replace("@","")+")":isFinite(o)?t+="["+o+"]":0===o.indexOf("this")?t=o.replace("this",a):t+="."+o}return t}function i(e,a){for(var t=[],n=0;n<e.length;n++)t.push(0===e[n].indexOf('"')?e[n]:r(e[n],a));return t.join(", ")}function s(e,s){if(s=s||1,e=e||o.template,"string"!=typeof e)throw new Error("Template7: Template must be a string");var l=n(e);if(0===l.length)return function(){return""};var p="ctx_"+s,d="(function ("+p+", data) {\n";1===s&&(d+="function isArray(arr){return Object.prototype.toString.apply(arr) === '[object Array]';}\n",d+="function isFunction(func){return (typeof func === 'function');}\n",d+='function c(val, ctx) {if (typeof val !== "undefined") {if (isFunction(val)) {return val.call(ctx);} else return val;} else return "";}\n'),d+="var r = '';\n";var c;for(c=0;c<l.length;c++){var u=l[c];if("plain"!==u.type){var m,f;if("variable"===u.type&&(m=r(u.contextName,p),d+="r += c("+m+", "+p+");"),"helper"===u.type)if(u.helperName in o.helpers)f=i(u.contextName,p),d+="r += (Template7.helpers."+u.helperName+").call("+p+", "+(f&&f+", ")+"{hash:"+JSON.stringify(u.hash)+", data: data || {}, fn: "+a(u,s+1)+", inverse: "+t(u,s+1)+", root: ctx_1});";else{if(u.contextName.length>0)throw new Error('Template7: Missing helper: "'+u.helperName+'"');m=r(u.helperName,p),d+="if ("+m+") {",d+="if (isArray("+m+")) {",d+="r += (Template7.helpers.each).call("+p+", "+m+", {hash:"+JSON.stringify(u.hash)+", data: data || {}, fn: "+a(u,s+1)+", inverse: "+t(u,s+1)+", root: ctx_1});",d+="}else {",d+="r += (Template7.helpers.with).call("+p+", "+m+", {hash:"+JSON.stringify(u.hash)+", data: data || {}, fn: "+a(u,s+1)+", inverse: "+t(u,s+1)+", root: ctx_1});",d+="}}"}}else d+="r +='"+u.content.replace(/\r/g,"\\r").replace(/\n/g,"\\n").replace(/'/g,"\\'")+"';"}return d+="\nreturn r;})",eval.call(window,d)}var o=this;o.template=e,o.compile=function(e){return o.compiled||(o.compiled=s(e)),o.compiled}};r.prototype={options:{},partials:{},helpers:{_partial:function(e,a){var t=r.prototype.partials[e];if(!t||t&&!t.template)return"";t.compiled||(t.compiled=i.compile(t.template));var n=this;for(var s in a.hash)n[s]=a.hash[s];return t.compiled(n)},escape:function(e,a){if("string"!=typeof e)throw new Error('Template7: Passed context to "escape" helper should be a string');return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")},"if":function(e,t){return a(e)&&(e=e.call(this)),e?t.fn(this,t.data):t.inverse(this,t.data)},unless:function(e,t){return a(e)&&(e=e.call(this)),e?t.inverse(this,t.data):t.fn(this,t.data)},each:function(t,n){var r="",i=0;if(a(t)&&(t=t.call(this)),e(t)){for(n.hash.reverse&&(t=t.reverse()),i=0;i<t.length;i++)r+=n.fn(t[i],{first:0===i,last:i===t.length-1,index:i});n.hash.reverse&&(t=t.reverse())}else for(var s in t)i++,r+=n.fn(t[s],{key:s});return i>0?r:n.inverse(this)},"with":function(e,t){return a(e)&&(e=e.call(this)),t.fn(e)},join:function(e,t){return a(e)&&(e=e.call(this)),e.join(t.hash.delimiter||t.hash.delimeter)},js:function(e,a){var t;return t=e.indexOf("return")>=0?"(function(){"+e+"})":"(function(){return ("+e+")})",eval.call(this,t).call(this)},js_compare:function(e,a){var t;t=e.indexOf("return")>=0?"(function(){"+e+"})":"(function(){return ("+e+")})";var n=eval.call(this,t).call(this);return n?a.fn(this,a.data):a.inverse(this,a.data)}}};var i=function(e,a){if(2===arguments.length){var t=new r(e),n=t.compile()(a);return t=null,n}return new r(e)};return i.registerHelper=function(e,a){r.prototype.helpers[e]=a},i.unregisterHelper=function(e){r.prototype.helpers[e]=void 0,delete r.prototype.helpers[e]},i.registerPartial=function(e,a){r.prototype.partials[e]={template:a}},i.unregisterPartial=function(e,a){r.prototype.partials[e]&&(r.prototype.partials[e]=void 0,delete r.prototype.partials[e])},i.compile=function(e,a){var t=new r(e,a);return t.compile()},i.options=r.prototype.options,i.helpers=r.prototype.helpers,i.partials=r.prototype.partials,i}(),window.Swiper=function(t,n){function r(){return"horizontal"===h.params.direction}function i(e){return Math.floor(e)}function s(){h.autoplayTimeoutId=setTimeout(function(){h.params.loop?(h.fixLoop(),h._slideNext()):h.isEnd?n.autoplayStopOnLast?h.stopAutoplay():h._slideTo(0):h._slideNext()},h.params.autoplay)}function o(e,t){var n=a(e.target);if(!n.is(t))if("string"==typeof t)n=n.parents(t);else if(t.nodeType){var r;return n.parents().each(function(e,a){a===t&&(r=t)}),r?t:void 0}return 0===n.length?void 0:n[0]}function l(e,a){a=a||{};var t=window.MutationObserver||window.WebkitMutationObserver,n=new t(function(e){e.forEach(function(e){h.onResize(!0),h.emit("onObserverUpdate",h,e)})});n.observe(e,{attributes:"undefined"==typeof a.attributes?!0:a.attributes,childList:"undefined"==typeof a.childList?!0:a.childList,characterData:"undefined"==typeof a.characterData?!0:a.characterData}),h.observers.push(n)}function p(e,t){e=a(e);var n,i,s;n=e.attr("data-swiper-parallax")||"0",i=e.attr("data-swiper-parallax-x"),s=e.attr("data-swiper-parallax-y"),i||s?(i=i||"0",s=s||"0"):r()?(i=n,s="0"):(s=n,i="0"),i=i.indexOf("%")>=0?parseInt(i,10)*t+"%":i*t+"px",s=s.indexOf("%")>=0?parseInt(s,10)*t+"%":s*t+"px",e.transform("translate3d("+i+", "+s+",0px)")}function d(e){return 0!==e.indexOf("on")&&(e=e[0]!==e[0].toUpperCase()?"on"+e[0].toUpperCase()+e.substring(1):"on"+e),e}if(!(this instanceof Swiper))return new Swiper(t,n);var c={direction:"horizontal",touchEventsTarget:"container",initialSlide:0,speed:300,autoplay:!1,autoplayDisableOnInteraction:!0,freeMode:!1,freeModeMomentum:!0,freeModeMomentumRatio:1,freeModeMomentumBounce:!0,freeModeMomentumBounceRatio:1,freeModeSticky:!1,setWrapperSize:!1,virtualTranslate:!1,effect:"slide",coverflow:{rotate:50,stretch:0,depth:100,modifier:1,slideShadows:!0},cube:{slideShadows:!0,shadow:!0,shadowOffset:20,shadowScale:.94},fade:{crossFade:!1},parallax:!1,scrollbar:null,scrollbarHide:!0,keyboardControl:!1,mousewheelControl:!1,mousewheelReleaseOnEdges:!1,mousewheelInvert:!1,mousewheelForceToAxis:!1,hashnav:!1,spaceBetween:0,slidesPerView:1,slidesPerColumn:1,slidesPerColumnFill:"column",slidesPerGroup:1,centeredSlides:!1,slidesOffsetBefore:0,slidesOffsetAfter:0,roundLengths:!1,touchRatio:1,touchAngle:45,simulateTouch:!0,shortSwipes:!0,longSwipes:!0,longSwipesRatio:.5,longSwipesMs:300,followFinger:!0,onlyExternal:!1,threshold:0,touchMoveStopPropagation:!0,pagination:null,paginationElement:"span",paginationClickable:!1,paginationHide:!1,paginationBulletRender:null,resistance:!0,resistanceRatio:.85,nextButton:null,prevButton:null,watchSlidesProgress:!1,watchSlidesVisibility:!1,grabCursor:!1,preventClicks:!0,preventClicksPropagation:!0,slideToClickedSlide:!1,lazyLoading:!1,lazyLoadingInPrevNext:!1,lazyLoadingOnTransitionStart:!1,preloadImages:!0,updateOnImagesReady:!0,loop:!1,loopAdditionalSlides:0,loopedSlides:null,control:void 0,controlInverse:!1,controlBy:"slide",allowSwipeToPrev:!0,allowSwipeToNext:!0,swipeHandler:null,noSwiping:!0,noSwipingClass:"swiper-no-swiping",slideClass:"swiper-slide",slideActiveClass:"swiper-slide-active",slideVisibleClass:"swiper-slide-visible",slideDuplicateClass:"swiper-slide-duplicate",slideNextClass:"swiper-slide-next",slidePrevClass:"swiper-slide-prev",wrapperClass:"swiper-wrapper",bulletClass:"swiper-pagination-bullet",bulletActiveClass:"swiper-pagination-bullet-active",buttonDisabledClass:"swiper-button-disabled",paginationHiddenClass:"swiper-pagination-hidden",observer:!1,observeParents:!1,a11y:!1,prevSlideMessage:"Previous slide",nextSlideMessage:"Next slide",firstSlideMessage:"This is the first slide",lastSlideMessage:"This is the last slide",paginationBulletMessage:"Go to slide {{index}}",runCallbacksOnInit:!0},u=n&&n.virtualTranslate;n=n||{};for(var m in c)if("undefined"==typeof n[m])n[m]=c[m];else if("object"==typeof n[m])for(var f in c[m])"undefined"==typeof n[m][f]&&(n[m][f]=c[m][f]);var h=this;if(h.version="3.1.0",h.params=n,h.classNames=[],"undefined"!=typeof a&&"undefined"!=typeof e&&(a=e),("undefined"!=typeof a||(a="undefined"==typeof e?window.Dom7||window.Zepto||window.jQuery:e))&&(h.$=a,h.container=a(t),0!==h.container.length)){if(h.container.length>1)return void h.container.each(function(){new Swiper(this,n)});h.container[0].swiper=h,h.container.data("swiper",h),h.classNames.push("swiper-container-"+h.params.direction),h.params.freeMode&&h.classNames.push("swiper-container-free-mode"),h.support.flexbox||(h.classNames.push("swiper-container-no-flexbox"),h.params.slidesPerColumn=1),(h.params.parallax||h.params.watchSlidesVisibility)&&(h.params.watchSlidesProgress=!0),["cube","coverflow"].indexOf(h.params.effect)>=0&&(h.support.transforms3d?(h.params.watchSlidesProgress=!0,h.classNames.push("swiper-container-3d")):h.params.effect="slide"),"slide"!==h.params.effect&&h.classNames.push("swiper-container-"+h.params.effect),"cube"===h.params.effect&&(h.params.resistanceRatio=0,h.params.slidesPerView=1,h.params.slidesPerColumn=1,h.params.slidesPerGroup=1,h.params.centeredSlides=!1,h.params.spaceBetween=0,h.params.virtualTranslate=!0,h.params.setWrapperSize=!1),"fade"===h.params.effect&&(h.params.slidesPerView=1,h.params.slidesPerColumn=1,h.params.slidesPerGroup=1,h.params.watchSlidesProgress=!0,h.params.spaceBetween=0,"undefined"==typeof u&&(h.params.virtualTranslate=!0)),h.params.grabCursor&&h.support.touch&&(h.params.grabCursor=!1),h.wrapper=h.container.children("."+h.params.wrapperClass),h.params.pagination&&(h.paginationContainer=a(h.params.pagination),h.params.paginationClickable&&h.paginationContainer.addClass("swiper-pagination-clickable")),h.rtl=r()&&("rtl"===h.container[0].dir.toLowerCase()||"rtl"===h.container.css("direction")),h.rtl&&h.classNames.push("swiper-container-rtl"),h.rtl&&(h.wrongRTL="-webkit-box"===h.wrapper.css("display")),h.params.slidesPerColumn>1&&h.classNames.push("swiper-container-multirow"),h.device.android&&h.classNames.push("swiper-container-android"),h.container.addClass(h.classNames.join(" ")),h.translate=0,h.progress=0,h.velocity=0,h.lockSwipeToNext=function(){h.params.allowSwipeToNext=!1},h.lockSwipeToPrev=function(){h.params.allowSwipeToPrev=!1},h.lockSwipes=function(){h.params.allowSwipeToNext=h.params.allowSwipeToPrev=!1},h.unlockSwipeToNext=function(){h.params.allowSwipeToNext=!0},h.unlockSwipeToPrev=function(){h.params.allowSwipeToPrev=!0},h.unlockSwipes=function(){h.params.allowSwipeToNext=h.params.allowSwipeToPrev=!0},h.params.grabCursor&&(h.container[0].style.cursor="move",h.container[0].style.cursor="-webkit-grab",h.container[0].style.cursor="-moz-grab",h.container[0].style.cursor="grab"),h.imagesToLoad=[],h.imagesLoaded=0,h.loadImage=function(e,a,t,n){function r(){n&&n()}var i;e.complete&&t?r():a?(i=new window.Image,i.onload=r,i.onerror=r,i.src=a):r()},h.preloadImages=function(){function e(){"undefined"!=typeof h&&null!==h&&(void 0!==h.imagesLoaded&&h.imagesLoaded++,h.imagesLoaded===h.imagesToLoad.length&&(h.params.updateOnImagesReady&&h.update(),h.emit("onImagesReady",h)))}h.imagesToLoad=h.container.find("img");for(var a=0;a<h.imagesToLoad.length;a++)h.loadImage(h.imagesToLoad[a],h.imagesToLoad[a].currentSrc||h.imagesToLoad[a].getAttribute("src"),!0,e)},h.autoplayTimeoutId=void 0,h.autoplaying=!1,h.autoplayPaused=!1,h.startAutoplay=function(){return"undefined"!=typeof h.autoplayTimeoutId?!1:h.params.autoplay?h.autoplaying?!1:(h.autoplaying=!0,h.emit("onAutoplayStart",h),void s()):!1},h.stopAutoplay=function(e){h.autoplayTimeoutId&&(h.autoplayTimeoutId&&clearTimeout(h.autoplayTimeoutId),h.autoplaying=!1,h.autoplayTimeoutId=void 0,h.emit("onAutoplayStop",h))},h.pauseAutoplay=function(e){h.autoplayPaused||(h.autoplayTimeoutId&&clearTimeout(h.autoplayTimeoutId),h.autoplayPaused=!0,0===e?(h.autoplayPaused=!1,s()):h.wrapper.transitionEnd(function(){h&&(h.autoplayPaused=!1,h.autoplaying?s():h.stopAutoplay())}))},h.minTranslate=function(){return-h.snapGrid[0]},h.maxTranslate=function(){return-h.snapGrid[h.snapGrid.length-1]},h.updateContainerSize=function(){var e,a;e="undefined"!=typeof h.params.width?h.params.width:h.container[0].clientWidth,a="undefined"!=typeof h.params.height?h.params.height:h.container[0].clientHeight,0===e&&r()||0===a&&!r()||(e=e-parseInt(h.container.css("padding-left"),10)-parseInt(h.container.css("padding-right"),10),a=a-parseInt(h.container.css("padding-top"),10)-parseInt(h.container.css("padding-bottom"),10),h.width=e,h.height=a,h.size=r()?h.width:h.height)},h.updateSlidesSize=function(){h.slides=h.wrapper.children("."+h.params.slideClass),h.snapGrid=[],h.slidesGrid=[],h.slidesSizesGrid=[];var e,a=h.params.spaceBetween,t=-h.params.slidesOffsetBefore,n=0,s=0;"string"==typeof a&&a.indexOf("%")>=0&&(a=parseFloat(a.replace("%",""))/100*h.size),h.virtualSize=-a,h.slides.css(h.rtl?{marginLeft:"",marginTop:""}:{marginRight:"",marginBottom:""});var o;h.params.slidesPerColumn>1&&(o=Math.floor(h.slides.length/h.params.slidesPerColumn)===h.slides.length/h.params.slidesPerColumn?h.slides.length:Math.ceil(h.slides.length/h.params.slidesPerColumn)*h.params.slidesPerColumn);var l,p=h.params.slidesPerColumn,d=o/p,c=d-(h.params.slidesPerColumn*d-h.slides.length);for(e=0;e<h.slides.length;e++){l=0;var u=h.slides.eq(e);if(h.params.slidesPerColumn>1){var m,f,g;"column"===h.params.slidesPerColumnFill?(f=Math.floor(e/p),g=e-f*p,(f>c||f===c&&g===p-1)&&++g>=p&&(g=0,f++),m=f+g*o/p,u.css({"-webkit-box-ordinal-group":m,"-moz-box-ordinal-group":m,"-ms-flex-order":m,"-webkit-order":m,order:m})):(g=Math.floor(e/d),f=e-g*d),u.css({"margin-top":0!==g&&h.params.spaceBetween&&h.params.spaceBetween+"px"}).attr("data-swiper-column",f).attr("data-swiper-row",g)}"none"!==u.css("display")&&("auto"===h.params.slidesPerView?(l=r()?u.outerWidth(!0):u.outerHeight(!0),h.params.roundLengths&&(l=i(l))):(l=(h.size-(h.params.slidesPerView-1)*a)/h.params.slidesPerView,h.params.roundLengths&&(l=i(l)),r()?h.slides[e].style.width=l+"px":h.slides[e].style.height=l+"px"),h.slides[e].swiperSlideSize=l,h.slidesSizesGrid.push(l),h.params.centeredSlides?(t=t+l/2+n/2+a,0===e&&(t=t-h.size/2-a),Math.abs(t)<.001&&(t=0),s%h.params.slidesPerGroup===0&&h.snapGrid.push(t),h.slidesGrid.push(t)):(s%h.params.slidesPerGroup===0&&h.snapGrid.push(t),h.slidesGrid.push(t),t=t+l+a),h.virtualSize+=l+a,n=l,s++)}h.virtualSize=Math.max(h.virtualSize,h.size)+h.params.slidesOffsetAfter;var v;if(h.rtl&&h.wrongRTL&&("slide"===h.params.effect||"coverflow"===h.params.effect)&&h.wrapper.css({width:h.virtualSize+h.params.spaceBetween+"px"}),(!h.support.flexbox||h.params.setWrapperSize)&&h.wrapper.css(r()?{width:h.virtualSize+h.params.spaceBetween+"px"}:{height:h.virtualSize+h.params.spaceBetween+"px"}),h.params.slidesPerColumn>1&&(h.virtualSize=(l+h.params.spaceBetween)*o,h.virtualSize=Math.ceil(h.virtualSize/h.params.slidesPerColumn)-h.params.spaceBetween,h.wrapper.css({width:h.virtualSize+h.params.spaceBetween+"px"}),h.params.centeredSlides)){for(v=[],e=0;e<h.snapGrid.length;e++)h.snapGrid[e]<h.virtualSize+h.snapGrid[0]&&v.push(h.snapGrid[e]);h.snapGrid=v}if(!h.params.centeredSlides){for(v=[],e=0;e<h.snapGrid.length;e++)h.snapGrid[e]<=h.virtualSize-h.size&&v.push(h.snapGrid[e]);h.snapGrid=v,Math.floor(h.virtualSize-h.size)>Math.floor(h.snapGrid[h.snapGrid.length-1])&&h.snapGrid.push(h.virtualSize-h.size)}0===h.snapGrid.length&&(h.snapGrid=[0]),0!==h.params.spaceBetween&&h.slides.css(r()?h.rtl?{marginLeft:a+"px"}:{marginRight:a+"px"}:{marginBottom:a+"px"}),h.params.watchSlidesProgress&&h.updateSlidesOffset()},h.updateSlidesOffset=function(){for(var e=0;e<h.slides.length;e++)h.slides[e].swiperSlideOffset=r()?h.slides[e].offsetLeft:h.slides[e].offsetTop},h.updateSlidesProgress=function(e){if("undefined"==typeof e&&(e=h.translate||0),0!==h.slides.length){"undefined"==typeof h.slides[0].swiperSlideOffset&&h.updateSlidesOffset();var a=h.params.centeredSlides?-e+h.size/2:-e;h.rtl&&(a=h.params.centeredSlides?e-h.size/2:e);{h.container[0].getBoundingClientRect(),r()?"left":"top",r()?"right":"bottom"}h.slides.removeClass(h.params.slideVisibleClass);for(var t=0;t<h.slides.length;t++){var n=h.slides[t],i=h.params.centeredSlides===!0?n.swiperSlideSize/2:0,s=(a-n.swiperSlideOffset-i)/(n.swiperSlideSize+h.params.spaceBetween);if(h.params.watchSlidesVisibility){var o=-(a-n.swiperSlideOffset-i),l=o+h.slidesSizesGrid[t],p=o>=0&&o<h.size||l>0&&l<=h.size||0>=o&&l>=h.size;p&&h.slides.eq(t).addClass(h.params.slideVisibleClass)}n.progress=h.rtl?-s:s}}},h.updateProgress=function(e){"undefined"==typeof e&&(e=h.translate||0);var a=h.maxTranslate()-h.minTranslate();0===a?(h.progress=0,h.isBeginning=h.isEnd=!0):(h.progress=(e-h.minTranslate())/a,h.isBeginning=h.progress<=0,h.isEnd=h.progress>=1),h.isBeginning&&h.emit("onReachBeginning",h),h.isEnd&&h.emit("onReachEnd",h),h.params.watchSlidesProgress&&h.updateSlidesProgress(e),h.emit("onProgress",h,h.progress)},h.updateActiveIndex=function(){var e,a,t,n=h.rtl?h.translate:-h.translate;for(a=0;a<h.slidesGrid.length;a++)"undefined"!=typeof h.slidesGrid[a+1]?n>=h.slidesGrid[a]&&n<h.slidesGrid[a+1]-(h.slidesGrid[a+1]-h.slidesGrid[a])/2?e=a:n>=h.slidesGrid[a]&&n<h.slidesGrid[a+1]&&(e=a+1):n>=h.slidesGrid[a]&&(e=a);(0>e||"undefined"==typeof e)&&(e=0),t=Math.floor(e/h.params.slidesPerGroup),t>=h.snapGrid.length&&(t=h.snapGrid.length-1),e!==h.activeIndex&&(h.snapIndex=t,h.previousIndex=h.activeIndex,h.activeIndex=e,h.updateClasses())},h.updateClasses=function(){h.slides.removeClass(h.params.slideActiveClass+" "+h.params.slideNextClass+" "+h.params.slidePrevClass);var e=h.slides.eq(h.activeIndex);if(e.addClass(h.params.slideActiveClass),e.next("."+h.params.slideClass).addClass(h.params.slideNextClass),e.prev("."+h.params.slideClass).addClass(h.params.slidePrevClass),h.bullets&&h.bullets.length>0){h.bullets.removeClass(h.params.bulletActiveClass);var t;h.params.loop?(t=Math.ceil(h.activeIndex-h.loopedSlides)/h.params.slidesPerGroup,t>h.slides.length-1-2*h.loopedSlides&&(t-=h.slides.length-2*h.loopedSlides),t>h.bullets.length-1&&(t-=h.bullets.length)):t="undefined"!=typeof h.snapIndex?h.snapIndex:h.activeIndex||0,h.paginationContainer.length>1?h.bullets.each(function(){a(this).index()===t&&a(this).addClass(h.params.bulletActiveClass)}):h.bullets.eq(t).addClass(h.params.bulletActiveClass)}h.params.loop||(h.params.prevButton&&(h.isBeginning?(a(h.params.prevButton).addClass(h.params.buttonDisabledClass),h.params.a11y&&h.a11y&&h.a11y.disable(a(h.params.prevButton))):(a(h.params.prevButton).removeClass(h.params.buttonDisabledClass),h.params.a11y&&h.a11y&&h.a11y.enable(a(h.params.prevButton)))),h.params.nextButton&&(h.isEnd?(a(h.params.nextButton).addClass(h.params.buttonDisabledClass),h.params.a11y&&h.a11y&&h.a11y.disable(a(h.params.nextButton))):(a(h.params.nextButton).removeClass(h.params.buttonDisabledClass),h.params.a11y&&h.a11y&&h.a11y.enable(a(h.params.nextButton)))))},h.updatePagination=function(){if(h.params.pagination&&h.paginationContainer&&h.paginationContainer.length>0){for(var e="",a=h.params.loop?Math.ceil((h.slides.length-2*h.loopedSlides)/h.params.slidesPerGroup):h.snapGrid.length,t=0;a>t;t++)e+=h.params.paginationBulletRender?h.params.paginationBulletRender(t,h.params.bulletClass):"<"+h.params.paginationElement+' class="'+h.params.bulletClass+'"></'+h.params.paginationElement+">";h.paginationContainer.html(e),h.bullets=h.paginationContainer.find("."+h.params.bulletClass),h.params.paginationClickable&&h.params.a11y&&h.a11y&&h.a11y.initPagination()}},h.update=function(e){function a(){n=Math.min(Math.max(h.translate,h.maxTranslate()),h.minTranslate()),h.setWrapperTranslate(n),h.updateActiveIndex(),h.updateClasses()}if(h.updateContainerSize(),h.updateSlidesSize(),h.updateProgress(),h.updatePagination(),h.updateClasses(),h.params.scrollbar&&h.scrollbar&&h.scrollbar.set(),e){var t,n;h.controller&&h.controller.spline&&(h.controller.spline=void 0),h.params.freeMode?a():(t=("auto"===h.params.slidesPerView||h.params.slidesPerView>1)&&h.isEnd&&!h.params.centeredSlides?h.slideTo(h.slides.length-1,0,!1,!0):h.slideTo(h.activeIndex,0,!1,!0),t||a())}},h.onResize=function(e){var a=h.params.allowSwipeToPrev,t=h.params.allowSwipeToNext;if(h.params.allowSwipeToPrev=h.params.allowSwipeToNext=!0,h.updateContainerSize(),h.updateSlidesSize(),("auto"===h.params.slidesPerView||h.params.freeMode||e)&&h.updatePagination(),h.params.scrollbar&&h.scrollbar&&h.scrollbar.set(),h.controller&&h.controller.spline&&(h.controller.spline=void 0),h.params.freeMode){var n=Math.min(Math.max(h.translate,h.maxTranslate()),h.minTranslate());h.setWrapperTranslate(n),h.updateActiveIndex(),h.updateClasses()}else h.updateClasses(),("auto"===h.params.slidesPerView||h.params.slidesPerView>1)&&h.isEnd&&!h.params.centeredSlides?h.slideTo(h.slides.length-1,0,!1,!0):h.slideTo(h.activeIndex,0,!1,!0);h.params.allowSwipeToPrev=a,h.params.allowSwipeToNext=t};var g=["mousedown","mousemove","mouseup"];window.navigator.pointerEnabled?g=["pointerdown","pointermove","pointerup"]:window.navigator.msPointerEnabled&&(g=["MSPointerDown","MSPointerMove","MSPointerUp"]),h.touchEvents={start:h.support.touch||!h.params.simulateTouch?"touchstart":g[0],move:h.support.touch||!h.params.simulateTouch?"touchmove":g[1],end:h.support.touch||!h.params.simulateTouch?"touchend":g[2]},(window.navigator.pointerEnabled||window.navigator.msPointerEnabled)&&("container"===h.params.touchEventsTarget?h.container:h.wrapper).addClass("swiper-wp8-"+h.params.direction),h.initEvents=function(e){var t=e?"off":"on",r=e?"removeEventListener":"addEventListener",i="container"===h.params.touchEventsTarget?h.container[0]:h.wrapper[0],s=h.support.touch?i:document,o=h.params.nested?!0:!1;h.browser.ie?(i[r](h.touchEvents.start,h.onTouchStart,!1),s[r](h.touchEvents.move,h.onTouchMove,o),s[r](h.touchEvents.end,h.onTouchEnd,!1)):(h.support.touch&&(i[r](h.touchEvents.start,h.onTouchStart,!1),i[r](h.touchEvents.move,h.onTouchMove,o),i[r](h.touchEvents.end,h.onTouchEnd,!1)),!n.simulateTouch||h.device.ios||h.device.android||(i[r]("mousedown",h.onTouchStart,!1),document[r]("mousemove",h.onTouchMove,o),document[r]("mouseup",h.onTouchEnd,!1))),window[r]("resize",h.onResize),h.params.nextButton&&(a(h.params.nextButton)[t]("click",h.onClickNext),h.params.a11y&&h.a11y&&a(h.params.nextButton)[t]("keydown",h.a11y.onEnterKey)),h.params.prevButton&&(a(h.params.prevButton)[t]("click",h.onClickPrev),h.params.a11y&&h.a11y&&a(h.params.prevButton)[t]("keydown",h.a11y.onEnterKey)),h.params.pagination&&h.params.paginationClickable&&(a(h.paginationContainer)[t]("click","."+h.params.bulletClass,h.onClickIndex),h.params.a11y&&h.a11y&&a(h.paginationContainer)[t]("keydown","."+h.params.bulletClass,h.a11y.onEnterKey)),(h.params.preventClicks||h.params.preventClicksPropagation)&&i[r]("click",h.preventClicks,!0)},h.attachEvents=function(e){h.initEvents()},h.detachEvents=function(){h.initEvents(!0)},h.allowClick=!0,h.preventClicks=function(e){h.allowClick||(h.params.preventClicks&&e.preventDefault(),h.params.preventClicksPropagation&&h.animating&&(e.stopPropagation(),e.stopImmediatePropagation()))},h.onClickNext=function(e){e.preventDefault(),(!h.isEnd||h.params.loop)&&h.slideNext()},h.onClickPrev=function(e){e.preventDefault(),(!h.isBeginning||h.params.loop)&&h.slidePrev()},h.onClickIndex=function(e){e.preventDefault();var t=a(this).index()*h.params.slidesPerGroup;h.params.loop&&(t+=h.loopedSlides),h.slideTo(t)},h.updateClickedSlide=function(e){var t=o(e,"."+h.params.slideClass),n=!1;if(t)for(var r=0;r<h.slides.length;r++)h.slides[r]===t&&(n=!0);if(!t||!n)return h.clickedSlide=void 0,void(h.clickedIndex=void 0);if(h.clickedSlide=t,h.clickedIndex=a(t).index(),h.params.slideToClickedSlide&&void 0!==h.clickedIndex&&h.clickedIndex!==h.activeIndex){var i,s=h.clickedIndex;if(h.params.loop)if(i=a(h.clickedSlide).attr("data-swiper-slide-index"),s>h.slides.length-h.params.slidesPerView)h.fixLoop(),s=h.wrapper.children("."+h.params.slideClass+'[data-swiper-slide-index="'+i+'"]').eq(0).index(),setTimeout(function(){h.slideTo(s)},0);else if(s<h.params.slidesPerView-1){h.fixLoop();var l=h.wrapper.children("."+h.params.slideClass+'[data-swiper-slide-index="'+i+'"]');s=l.eq(l.length-1).index(),setTimeout(function(){h.slideTo(s)},0)}else h.slideTo(s);else h.slideTo(s)}};var v,b,w,C,y,x,T,k,S,P="input, select, textarea, button",M=Date.now(),I=[];h.animating=!1,h.touches={startX:0,startY:0,currentX:0,currentY:0,diff:0};var O,E;h.onTouchStart=function(e){if(e.originalEvent&&(e=e.originalEvent),O="touchstart"===e.type,O||!("which"in e)||3!==e.which){if(h.params.noSwiping&&o(e,"."+h.params.noSwipingClass))return void(h.allowClick=!0);if(!h.params.swipeHandler||o(e,h.params.swipeHandler)){if(v=!0,b=!1,C=void 0,E=void 0,h.touches.startX=h.touches.currentX="touchstart"===e.type?e.targetTouches[0].pageX:e.pageX,h.touches.startY=h.touches.currentY="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY,w=Date.now(),h.allowClick=!0,h.updateContainerSize(),h.swipeDirection=void 0,h.params.threshold>0&&(T=!1),"touchstart"!==e.type){var t=!0;a(e.target).is(P)&&(t=!1),document.activeElement&&a(document.activeElement).is(P)&&document.activeElement.blur(),t&&e.preventDefault()}h.emit("onTouchStart",h,e)}}},h.onTouchMove=function(e){if(e.originalEvent&&(e=e.originalEvent),!(O&&"mousemove"===e.type||e.preventedByNestedSwiper)){if(h.params.onlyExternal)return h.allowClick=!1,void(v&&(h.touches.startX=h.touches.currentX="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,h.touches.startY=h.touches.currentY="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY,w=Date.now()));if(O&&document.activeElement&&e.target===document.activeElement&&a(e.target).is(P))return b=!0,void(h.allowClick=!1);if(h.emit("onTouchMove",h,e),!(e.targetTouches&&e.targetTouches.length>1)){if(h.touches.currentX="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,h.touches.currentY="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY,"undefined"==typeof C){var t=180*Math.atan2(Math.abs(h.touches.currentY-h.touches.startY),Math.abs(h.touches.currentX-h.touches.startX))/Math.PI;C=r()?t>h.params.touchAngle:90-t>h.params.touchAngle}if(C&&h.emit("onTouchMoveOpposite",h,e),"undefined"==typeof E&&h.browser.ieTouch&&(h.touches.currentX!==h.touches.startX||h.touches.currentY!==h.touches.startY)&&(E=!0),v){if(C)return void(v=!1);if(E||!h.browser.ieTouch){h.allowClick=!1,h.emit("onSliderMove",h,e),e.preventDefault(),h.params.touchMoveStopPropagation&&!h.params.nested&&e.stopPropagation(),b||(n.loop&&h.fixLoop(),x=h.getWrapperTranslate(),h.setWrapperTransition(0),h.animating&&h.wrapper.trigger("webkitTransitionEnd transitionend oTransitionEnd MSTransitionEnd msTransitionEnd"),h.params.autoplay&&h.autoplaying&&(h.params.autoplayDisableOnInteraction?h.stopAutoplay():h.pauseAutoplay()),S=!1,h.params.grabCursor&&(h.container[0].style.cursor="move",h.container[0].style.cursor="-webkit-grabbing",h.container[0].style.cursor="-moz-grabbin",h.container[0].style.cursor="grabbing")),b=!0;var i=h.touches.diff=r()?h.touches.currentX-h.touches.startX:h.touches.currentY-h.touches.startY;i*=h.params.touchRatio,h.rtl&&(i=-i),h.swipeDirection=i>0?"prev":"next",y=i+x;var s=!0;if(i>0&&y>h.minTranslate()?(s=!1,h.params.resistance&&(y=h.minTranslate()-1+Math.pow(-h.minTranslate()+x+i,h.params.resistanceRatio))):0>i&&y<h.maxTranslate()&&(s=!1,h.params.resistance&&(y=h.maxTranslate()+1-Math.pow(h.maxTranslate()-x-i,h.params.resistanceRatio))),s&&(e.preventedByNestedSwiper=!0),!h.params.allowSwipeToNext&&"next"===h.swipeDirection&&x>y&&(y=x),!h.params.allowSwipeToPrev&&"prev"===h.swipeDirection&&y>x&&(y=x),h.params.followFinger){if(h.params.threshold>0){if(!(Math.abs(i)>h.params.threshold||T))return void(y=x);if(!T)return T=!0,h.touches.startX=h.touches.currentX,h.touches.startY=h.touches.currentY,y=x,void(h.touches.diff=r()?h.touches.currentX-h.touches.startX:h.touches.currentY-h.touches.startY)}(h.params.freeMode||h.params.watchSlidesProgress)&&h.updateActiveIndex(),h.params.freeMode&&(0===I.length&&I.push({position:h.touches[r()?"startX":"startY"],time:w}),I.push({position:h.touches[r()?"currentX":"currentY"],time:(new window.Date).getTime()})),h.updateProgress(y),h.setWrapperTranslate(y)}}}}}},h.onTouchEnd=function(e){if(e.originalEvent&&(e=e.originalEvent),h.emit("onTouchEnd",h,e),v){h.params.grabCursor&&b&&v&&(h.container[0].style.cursor="move",h.container[0].style.cursor="-webkit-grab",h.container[0].style.cursor="-moz-grab",h.container[0].style.cursor="grab");var t=Date.now(),n=t-w;if(h.allowClick&&(h.updateClickedSlide(e),h.emit("onTap",h,e),300>n&&t-M>300&&(k&&clearTimeout(k),k=setTimeout(function(){h&&(h.params.paginationHide&&h.paginationContainer.length>0&&!a(e.target).hasClass(h.params.bulletClass)&&h.paginationContainer.toggleClass(h.params.paginationHiddenClass),h.emit("onClick",h,e))},300)),300>n&&300>t-M&&(k&&clearTimeout(k),h.emit("onDoubleTap",h,e))),M=Date.now(),setTimeout(function(){h&&(h.allowClick=!0)},0),!v||!b||!h.swipeDirection||0===h.touches.diff||y===x)return void(v=b=!1);v=b=!1;var r;if(r=h.params.followFinger?h.rtl?h.translate:-h.translate:-y,h.params.freeMode){if(r<-h.minTranslate())return void h.slideTo(h.activeIndex);if(r>-h.maxTranslate())return void h.slideTo(h.slides.length<h.snapGrid.length?h.snapGrid.length-1:h.slides.length-1);

if(h.params.freeModeMomentum){if(I.length>1){var i=I.pop(),s=I.pop(),o=i.position-s.position,l=i.time-s.time;h.velocity=o/l,h.velocity=h.velocity/2,Math.abs(h.velocity)<.02&&(h.velocity=0),(l>150||(new window.Date).getTime()-i.time>300)&&(h.velocity=0)}else h.velocity=0;I.length=0;var p=1e3*h.params.freeModeMomentumRatio,d=h.velocity*p,c=h.translate+d;h.rtl&&(c=-c);var u,m=!1,f=20*Math.abs(h.velocity)*h.params.freeModeMomentumBounceRatio;if(c<h.maxTranslate())h.params.freeModeMomentumBounce?(c+h.maxTranslate()<-f&&(c=h.maxTranslate()-f),u=h.maxTranslate(),m=!0,S=!0):c=h.maxTranslate();else if(c>h.minTranslate())h.params.freeModeMomentumBounce?(c-h.minTranslate()>f&&(c=h.minTranslate()+f),u=h.minTranslate(),m=!0,S=!0):c=h.minTranslate();else if(h.params.freeModeSticky){var g,C=0;for(C=0;C<h.snapGrid.length;C+=1)if(h.snapGrid[C]>-c){g=C;break}c=Math.abs(h.snapGrid[g]-c)<Math.abs(h.snapGrid[g-1]-c)||"next"===h.swipeDirection?h.snapGrid[g]:h.snapGrid[g-1],h.rtl||(c=-c)}if(0!==h.velocity)p=Math.abs(h.rtl?(-c-h.translate)/h.velocity:(c-h.translate)/h.velocity);else if(h.params.freeModeSticky)return void h.slideReset();h.params.freeModeMomentumBounce&&m?(h.updateProgress(u),h.setWrapperTransition(p),h.setWrapperTranslate(c),h.onTransitionStart(),h.animating=!0,h.wrapper.transitionEnd(function(){h&&S&&(h.emit("onMomentumBounce",h),h.setWrapperTransition(h.params.speed),h.setWrapperTranslate(u),h.wrapper.transitionEnd(function(){h&&h.onTransitionEnd()}))})):h.velocity?(h.updateProgress(c),h.setWrapperTransition(p),h.setWrapperTranslate(c),h.onTransitionStart(),h.animating||(h.animating=!0,h.wrapper.transitionEnd(function(){h&&h.onTransitionEnd()}))):h.updateProgress(c),h.updateActiveIndex()}return void((!h.params.freeModeMomentum||n>=h.params.longSwipesMs)&&(h.updateProgress(),h.updateActiveIndex()))}var T,P=0,O=h.slidesSizesGrid[0];for(T=0;T<h.slidesGrid.length;T+=h.params.slidesPerGroup)"undefined"!=typeof h.slidesGrid[T+h.params.slidesPerGroup]?r>=h.slidesGrid[T]&&r<h.slidesGrid[T+h.params.slidesPerGroup]&&(P=T,O=h.slidesGrid[T+h.params.slidesPerGroup]-h.slidesGrid[T]):r>=h.slidesGrid[T]&&(P=T,O=h.slidesGrid[h.slidesGrid.length-1]-h.slidesGrid[h.slidesGrid.length-2]);var E=(r-h.slidesGrid[P])/O;if(n>h.params.longSwipesMs){if(!h.params.longSwipes)return void h.slideTo(h.activeIndex);"next"===h.swipeDirection&&h.slideTo(E>=h.params.longSwipesRatio?P+h.params.slidesPerGroup:P),"prev"===h.swipeDirection&&h.slideTo(E>1-h.params.longSwipesRatio?P+h.params.slidesPerGroup:P)}else{if(!h.params.shortSwipes)return void h.slideTo(h.activeIndex);"next"===h.swipeDirection&&h.slideTo(P+h.params.slidesPerGroup),"prev"===h.swipeDirection&&h.slideTo(P)}}},h._slideTo=function(e,a){return h.slideTo(e,a,!0,!0)},h.slideTo=function(e,a,t,n){"undefined"==typeof t&&(t=!0),"undefined"==typeof e&&(e=0),0>e&&(e=0),h.snapIndex=Math.floor(e/h.params.slidesPerGroup),h.snapIndex>=h.snapGrid.length&&(h.snapIndex=h.snapGrid.length-1);var i=-h.snapGrid[h.snapIndex];if(!h.params.allowSwipeToNext&&i<h.translate&&i<h.minTranslate())return!1;if(!h.params.allowSwipeToPrev&&i>h.translate&&i>h.maxTranslate())return!1;h.params.autoplay&&h.autoplaying&&(n||!h.params.autoplayDisableOnInteraction?h.pauseAutoplay(a):h.stopAutoplay()),h.updateProgress(i);for(var s=0;s<h.slidesGrid.length;s++)-Math.floor(100*i)>=Math.floor(100*h.slidesGrid[s])&&(e=s);if("undefined"==typeof a&&(a=h.params.speed),h.previousIndex=h.activeIndex||0,h.activeIndex=e,i===h.translate)return h.updateClasses(),!1;h.updateClasses(),h.onTransitionStart(t);r()?i:0,r()?0:i;return 0===a?(h.setWrapperTransition(0),h.setWrapperTranslate(i),h.onTransitionEnd(t)):(h.setWrapperTransition(a),h.setWrapperTranslate(i),h.animating||(h.animating=!0,h.wrapper.transitionEnd(function(){h&&h.onTransitionEnd(t)}))),!0},h.onTransitionStart=function(e){"undefined"==typeof e&&(e=!0),h.lazy&&h.lazy.onTransitionStart(),e&&(h.emit("onTransitionStart",h),h.activeIndex!==h.previousIndex&&h.emit("onSlideChangeStart",h))},h.onTransitionEnd=function(e){h.animating=!1,h.setWrapperTransition(0),"undefined"==typeof e&&(e=!0),h.lazy&&h.lazy.onTransitionEnd(),e&&(h.emit("onTransitionEnd",h),h.activeIndex!==h.previousIndex&&h.emit("onSlideChangeEnd",h)),h.params.hashnav&&h.hashnav&&h.hashnav.setHash()},h.slideNext=function(e,a,t){if(h.params.loop){if(h.animating)return!1;h.fixLoop();{h.container[0].clientLeft}return h.slideTo(h.activeIndex+h.params.slidesPerGroup,a,e,t)}return h.slideTo(h.activeIndex+h.params.slidesPerGroup,a,e,t)},h._slideNext=function(e){return h.slideNext(!0,e,!0)},h.slidePrev=function(e,a,t){if(h.params.loop){if(h.animating)return!1;h.fixLoop();{h.container[0].clientLeft}return h.slideTo(h.activeIndex-1,a,e,t)}return h.slideTo(h.activeIndex-1,a,e,t)},h._slidePrev=function(e){return h.slidePrev(!0,e,!0)},h.slideReset=function(e,a,t){return h.slideTo(h.activeIndex,a,e)},h.setWrapperTransition=function(e,a){h.wrapper.transition(e),"slide"!==h.params.effect&&h.effects[h.params.effect]&&h.effects[h.params.effect].setTransition(e),h.params.parallax&&h.parallax&&h.parallax.setTransition(e),h.params.scrollbar&&h.scrollbar&&h.scrollbar.setTransition(e),h.params.control&&h.controller&&h.controller.setTransition(e,a),h.emit("onSetTransition",h,e)},h.setWrapperTranslate=function(e,a,t){var n=0,i=0,s=0;r()?n=h.rtl?-e:e:i=e,h.params.virtualTranslate||h.wrapper.transform(h.support.transforms3d?"translate3d("+n+"px, "+i+"px, "+s+"px)":"translate("+n+"px, "+i+"px)"),h.translate=r()?n:i,a&&h.updateActiveIndex(),"slide"!==h.params.effect&&h.effects[h.params.effect]&&h.effects[h.params.effect].setTranslate(h.translate),h.params.parallax&&h.parallax&&h.parallax.setTranslate(h.translate),h.params.scrollbar&&h.scrollbar&&h.scrollbar.setTranslate(h.translate),h.params.control&&h.controller&&h.controller.setTranslate(h.translate,t),h.emit("onSetTranslate",h,h.translate)},h.getTranslate=function(e,a){var t,n,r,i;return"undefined"==typeof a&&(a="x"),h.params.virtualTranslate?h.rtl?-h.translate:h.translate:(r=window.getComputedStyle(e,null),window.WebKitCSSMatrix?i=new window.WebKitCSSMatrix("none"===r.webkitTransform?"":r.webkitTransform):(i=r.MozTransform||r.OTransform||r.MsTransform||r.msTransform||r.transform||r.getPropertyValue("transform").replace("translate(","matrix(1, 0, 0, 1,"),t=i.toString().split(",")),"x"===a&&(n=window.WebKitCSSMatrix?i.m41:parseFloat(16===t.length?t[12]:t[4])),"y"===a&&(n=window.WebKitCSSMatrix?i.m42:parseFloat(16===t.length?t[13]:t[5])),h.rtl&&n&&(n=-n),n||0)},h.getWrapperTranslate=function(e){return"undefined"==typeof e&&(e=r()?"x":"y"),h.getTranslate(h.wrapper[0],e)},h.observers=[],h.initObservers=function(){if(h.params.observeParents)for(var e=h.container.parents(),a=0;a<e.length;a++)l(e[a]);l(h.container[0],{childList:!1}),l(h.wrapper[0],{attributes:!1})},h.disconnectObservers=function(){for(var e=0;e<h.observers.length;e++)h.observers[e].disconnect();h.observers=[]},h.createLoop=function(){h.wrapper.children("."+h.params.slideClass+"."+h.params.slideDuplicateClass).remove();var e=h.wrapper.children("."+h.params.slideClass);h.loopedSlides=parseInt(h.params.loopedSlides||h.params.slidesPerView,10),h.loopedSlides=h.loopedSlides+h.params.loopAdditionalSlides,h.loopedSlides>e.length&&(h.loopedSlides=e.length);var t,n=[],r=[];for(e.each(function(t,i){var s=a(this);t<h.loopedSlides&&r.push(i),t<e.length&&t>=e.length-h.loopedSlides&&n.push(i),s.attr("data-swiper-slide-index",t)}),t=0;t<r.length;t++)h.wrapper.append(a(r[t].cloneNode(!0)).addClass(h.params.slideDuplicateClass));for(t=n.length-1;t>=0;t--)h.wrapper.prepend(a(n[t].cloneNode(!0)).addClass(h.params.slideDuplicateClass))},h.destroyLoop=function(){h.wrapper.children("."+h.params.slideClass+"."+h.params.slideDuplicateClass).remove(),h.slides.removeAttr("data-swiper-slide-index")},h.fixLoop=function(){var e;h.activeIndex<h.loopedSlides?(e=h.slides.length-3*h.loopedSlides+h.activeIndex,e+=h.loopedSlides,h.slideTo(e,0,!1,!0)):("auto"===h.params.slidesPerView&&h.activeIndex>=2*h.loopedSlides||h.activeIndex>h.slides.length-2*h.params.slidesPerView)&&(e=-h.slides.length+h.activeIndex+h.loopedSlides,e+=h.loopedSlides,h.slideTo(e,0,!1,!0))},h.appendSlide=function(e){if(h.params.loop&&h.destroyLoop(),"object"==typeof e&&e.length)for(var a=0;a<e.length;a++)e[a]&&h.wrapper.append(e[a]);else h.wrapper.append(e);h.params.loop&&h.createLoop(),h.params.observer&&h.support.observer||h.update(!0)},h.prependSlide=function(e){h.params.loop&&h.destroyLoop();var a=h.activeIndex+1;if("object"==typeof e&&e.length){for(var t=0;t<e.length;t++)e[t]&&h.wrapper.prepend(e[t]);a=h.activeIndex+e.length}else h.wrapper.prepend(e);h.params.loop&&h.createLoop(),h.params.observer&&h.support.observer||h.update(!0),h.slideTo(a,0,!1)},h.removeSlide=function(e){h.params.loop&&(h.destroyLoop(),h.slides=h.wrapper.children("."+h.params.slideClass));var a,t=h.activeIndex;if("object"==typeof e&&e.length){for(var n=0;n<e.length;n++)a=e[n],h.slides[a]&&h.slides.eq(a).remove(),t>a&&t--;t=Math.max(t,0)}else a=e,h.slides[a]&&h.slides.eq(a).remove(),t>a&&t--,t=Math.max(t,0);h.params.loop&&h.createLoop(),h.params.observer&&h.support.observer||h.update(!0),h.params.loop?h.slideTo(t+h.loopedSlides,0,!1):h.slideTo(t,0,!1)},h.removeAllSlides=function(){for(var e=[],a=0;a<h.slides.length;a++)e.push(a);h.removeSlide(e)},h.effects={fade:{setTranslate:function(){for(var e=0;e<h.slides.length;e++){var a=h.slides.eq(e),t=a[0].swiperSlideOffset,n=-t;h.params.virtualTranslate||(n-=h.translate);var i=0;r()||(i=n,n=0);var s=h.params.fade.crossFade?Math.max(1-Math.abs(a[0].progress),0):1+Math.min(Math.max(a[0].progress,-1),0);a.css({opacity:s}).transform("translate3d("+n+"px, "+i+"px, 0px)")}},setTransition:function(e){if(h.slides.transition(e),h.params.virtualTranslate&&0!==e){var a=!1;h.slides.transitionEnd(function(){if(!a&&h){a=!0,h.animating=!1;for(var e=["webkitTransitionEnd","transitionend","oTransitionEnd","MSTransitionEnd","msTransitionEnd"],t=0;t<e.length;t++)h.wrapper.trigger(e[t])}})}}},cube:{setTranslate:function(){var e,t=0;h.params.cube.shadow&&(r()?(e=h.wrapper.find(".swiper-cube-shadow"),0===e.length&&(e=a('<div class="swiper-cube-shadow"></div>'),h.wrapper.append(e)),e.css({height:h.width+"px"})):(e=h.container.find(".swiper-cube-shadow"),0===e.length&&(e=a('<div class="swiper-cube-shadow"></div>'),h.container.append(e))));for(var n=0;n<h.slides.length;n++){var i=h.slides.eq(n),s=90*n,o=Math.floor(s/360);h.rtl&&(s=-s,o=Math.floor(-s/360));var l=Math.max(Math.min(i[0].progress,1),-1),p=0,d=0,c=0;n%4===0?(p=4*-o*h.size,c=0):(n-1)%4===0?(p=0,c=4*-o*h.size):(n-2)%4===0?(p=h.size+4*o*h.size,c=h.size):(n-3)%4===0&&(p=-h.size,c=3*h.size+4*h.size*o),h.rtl&&(p=-p),r()||(d=p,p=0);var u="rotateX("+(r()?0:-s)+"deg) rotateY("+(r()?s:0)+"deg) translate3d("+p+"px, "+d+"px, "+c+"px)";if(1>=l&&l>-1&&(t=90*n+90*l,h.rtl&&(t=90*-n-90*l)),i.transform(u),h.params.cube.slideShadows){var m=i.find(r()?".swiper-slide-shadow-left":".swiper-slide-shadow-top"),f=i.find(r()?".swiper-slide-shadow-right":".swiper-slide-shadow-bottom");0===m.length&&(m=a('<div class="swiper-slide-shadow-'+(r()?"left":"top")+'"></div>'),i.append(m)),0===f.length&&(f=a('<div class="swiper-slide-shadow-'+(r()?"right":"bottom")+'"></div>'),i.append(f));{i[0].progress}m.length&&(m[0].style.opacity=-i[0].progress),f.length&&(f[0].style.opacity=i[0].progress)}}if(h.wrapper.css({"-webkit-transform-origin":"50% 50% -"+h.size/2+"px","-moz-transform-origin":"50% 50% -"+h.size/2+"px","-ms-transform-origin":"50% 50% -"+h.size/2+"px","transform-origin":"50% 50% -"+h.size/2+"px"}),h.params.cube.shadow)if(r())e.transform("translate3d(0px, "+(h.width/2+h.params.cube.shadowOffset)+"px, "+-h.width/2+"px) rotateX(90deg) rotateZ(0deg) scale("+h.params.cube.shadowScale+")");else{var g=Math.abs(t)-90*Math.floor(Math.abs(t)/90),v=1.5-(Math.sin(2*g*Math.PI/360)/2+Math.cos(2*g*Math.PI/360)/2),b=h.params.cube.shadowScale,w=h.params.cube.shadowScale/v,C=h.params.cube.shadowOffset;e.transform("scale3d("+b+", 1, "+w+") translate3d(0px, "+(h.height/2+C)+"px, "+-h.height/2/w+"px) rotateX(-90deg)")}var y=h.isSafari||h.isUiWebView?-h.size/2:0;h.wrapper.transform("translate3d(0px,0,"+y+"px) rotateX("+(r()?0:t)+"deg) rotateY("+(r()?-t:0)+"deg)")},setTransition:function(e){h.slides.transition(e).find(".swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left").transition(e),h.params.cube.shadow&&!r()&&h.container.find(".swiper-cube-shadow").transition(e)}},coverflow:{setTranslate:function(){for(var e=h.translate,t=r()?-e+h.width/2:-e+h.height/2,n=r()?h.params.coverflow.rotate:-h.params.coverflow.rotate,i=h.params.coverflow.depth,s=0,o=h.slides.length;o>s;s++){var l=h.slides.eq(s),p=h.slidesSizesGrid[s],d=l[0].swiperSlideOffset,c=(t-d-p/2)/p*h.params.coverflow.modifier,u=r()?n*c:0,m=r()?0:n*c,f=-i*Math.abs(c),g=r()?0:h.params.coverflow.stretch*c,v=r()?h.params.coverflow.stretch*c:0;Math.abs(v)<.001&&(v=0),Math.abs(g)<.001&&(g=0),Math.abs(f)<.001&&(f=0),Math.abs(u)<.001&&(u=0),Math.abs(m)<.001&&(m=0);var b="translate3d("+v+"px,"+g+"px,"+f+"px)  rotateX("+m+"deg) rotateY("+u+"deg)";if(l.transform(b),l[0].style.zIndex=-Math.abs(Math.round(c))+1,h.params.coverflow.slideShadows){var w=l.find(r()?".swiper-slide-shadow-left":".swiper-slide-shadow-top"),C=l.find(r()?".swiper-slide-shadow-right":".swiper-slide-shadow-bottom");0===w.length&&(w=a('<div class="swiper-slide-shadow-'+(r()?"left":"top")+'"></div>'),l.append(w)),0===C.length&&(C=a('<div class="swiper-slide-shadow-'+(r()?"right":"bottom")+'"></div>'),l.append(C)),w.length&&(w[0].style.opacity=c>0?c:0),C.length&&(C[0].style.opacity=-c>0?-c:0)}}if(h.browser.ie){var y=h.wrapper[0].style;y.perspectiveOrigin=t+"px 50%"}},setTransition:function(e){h.slides.transition(e).find(".swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left").transition(e)}}},h.lazy={initialImageLoaded:!1,loadImageInSlide:function(e,t){if("undefined"!=typeof e&&("undefined"==typeof t&&(t=!0),0!==h.slides.length)){var n=h.slides.eq(e),r=n.find(".swiper-lazy:not(.swiper-lazy-loaded):not(.swiper-lazy-loading)");!n.hasClass("swiper-lazy")||n.hasClass("swiper-lazy-loaded")||n.hasClass("swiper-lazy-loading")||r.add(n[0]),0!==r.length&&r.each(function(){var e=a(this);e.addClass("swiper-lazy-loading");var r=e.attr("data-background"),i=e.attr("data-src");h.loadImage(e[0],i||r,!1,function(){if(r?(e.css("background-image","url("+r+")"),e.removeAttr("data-background")):(e.attr("src",i),e.removeAttr("data-src")),e.addClass("swiper-lazy-loaded").removeClass("swiper-lazy-loading"),n.find(".swiper-lazy-preloader, .preloader").remove(),h.params.loop&&t){var a=n.attr("data-swiper-slide-index");if(n.hasClass(h.params.slideDuplicateClass)){var s=h.wrapper.children('[data-swiper-slide-index="'+a+'"]:not(.'+h.params.slideDuplicateClass+")");h.lazy.loadImageInSlide(s.index(),!1)}else{var o=h.wrapper.children("."+h.params.slideDuplicateClass+'[data-swiper-slide-index="'+a+'"]');h.lazy.loadImageInSlide(o.index(),!1)}}h.emit("onLazyImageReady",h,n[0],e[0])}),h.emit("onLazyImageLoad",h,n[0],e[0])})}},load:function(){var e;if(h.params.watchSlidesVisibility)h.wrapper.children("."+h.params.slideVisibleClass).each(function(){h.lazy.loadImageInSlide(a(this).index())});else if(h.params.slidesPerView>1)for(e=h.activeIndex;e<h.activeIndex+h.params.slidesPerView;e++)h.slides[e]&&h.lazy.loadImageInSlide(e);else h.lazy.loadImageInSlide(h.activeIndex);if(h.params.lazyLoadingInPrevNext)if(h.params.slidesPerView>1){for(e=h.activeIndex+h.params.slidesPerView;e<h.activeIndex+h.params.slidesPerView+h.params.slidesPerView;e++)h.slides[e]&&h.lazy.loadImageInSlide(e);for(e=h.activeIndex-h.params.slidesPerView;e<h.activeIndex;e++)h.slides[e]&&h.lazy.loadImageInSlide(e)}else{var t=h.wrapper.children("."+h.params.slideNextClass);t.length>0&&h.lazy.loadImageInSlide(t.index());var n=h.wrapper.children("."+h.params.slidePrevClass);n.length>0&&h.lazy.loadImageInSlide(n.index())}},onTransitionStart:function(){h.params.lazyLoading&&(h.params.lazyLoadingOnTransitionStart||!h.params.lazyLoadingOnTransitionStart&&!h.lazy.initialImageLoaded)&&h.lazy.load()},onTransitionEnd:function(){h.params.lazyLoading&&!h.params.lazyLoadingOnTransitionStart&&h.lazy.load()}},h.scrollbar={set:function(){if(h.params.scrollbar){var e=h.scrollbar;e.track=a(h.params.scrollbar),e.drag=e.track.find(".swiper-scrollbar-drag"),0===e.drag.length&&(e.drag=a('<div class="swiper-scrollbar-drag"></div>'),e.track.append(e.drag)),e.drag[0].style.width="",e.drag[0].style.height="",e.trackSize=r()?e.track[0].offsetWidth:e.track[0].offsetHeight,e.divider=h.size/h.virtualSize,e.moveDivider=e.divider*(e.trackSize/h.size),e.dragSize=e.trackSize*e.divider,r()?e.drag[0].style.width=e.dragSize+"px":e.drag[0].style.height=e.dragSize+"px",e.track[0].style.display=e.divider>=1?"none":"",h.params.scrollbarHide&&(e.track[0].style.opacity=0)}},setTranslate:function(){if(h.params.scrollbar){var e,a=h.scrollbar,t=(h.translate||0,a.dragSize);e=(a.trackSize-a.dragSize)*h.progress,h.rtl&&r()?(e=-e,e>0?(t=a.dragSize-e,e=0):-e+a.dragSize>a.trackSize&&(t=a.trackSize+e)):0>e?(t=a.dragSize+e,e=0):e+a.dragSize>a.trackSize&&(t=a.trackSize-e),r()?(a.drag.transform(h.support.transforms3d?"translate3d("+e+"px, 0, 0)":"translateX("+e+"px)"),a.drag[0].style.width=t+"px"):(a.drag.transform(h.support.transforms3d?"translate3d(0px, "+e+"px, 0)":"translateY("+e+"px)"),a.drag[0].style.height=t+"px"),h.params.scrollbarHide&&(clearTimeout(a.timeout),a.track[0].style.opacity=1,a.timeout=setTimeout(function(){a.track[0].style.opacity=0,a.track.transition(400)},1e3))}},setTransition:function(e){h.params.scrollbar&&h.scrollbar.drag.transition(e)}},h.controller={LinearSpline:function(e,a){this.x=e,this.y=a,this.lastIndex=e.length-1;{var t,n;this.x.length}this.interpolate=function(e){return e?(n=r(this.x,e),t=n-1,(e-this.x[t])*(this.y[n]-this.y[t])/(this.x[n]-this.x[t])+this.y[t]):0};var r=function(){var e,a,t;return function(n,r){for(a=-1,e=n.length;e-a>1;)n[t=e+a>>1]<=r?a=t:e=t;return e}}()},getInterpolateFunction:function(e){h.controller.spline||(h.controller.spline=h.params.loop?new h.controller.LinearSpline(h.slidesGrid,e.slidesGrid):new h.controller.LinearSpline(h.snapGrid,e.snapGrid))},setTranslate:function(e,a){function t(a){e=a.rtl&&"horizontal"===a.params.direction?-h.translate:h.translate,"slide"===h.params.controlBy&&(h.controller.getInterpolateFunction(a),r=-h.controller.spline.interpolate(-e)),r&&"container"!==h.params.controlBy||(n=(a.maxTranslate()-a.minTranslate())/(h.maxTranslate()-h.minTranslate()),r=(e-h.minTranslate())*n+a.minTranslate()),h.params.controlInverse&&(r=a.maxTranslate()-r),a.updateProgress(r),a.setWrapperTranslate(r,!1,h),a.updateActiveIndex()}var n,r,i=h.params.control;if(h.isArray(i))for(var s=0;s<i.length;s++)i[s]!==a&&i[s]instanceof Swiper&&t(i[s]);else i instanceof Swiper&&a!==i&&t(i)},setTransition:function(e,a){function t(a){a.setWrapperTransition(e,h),0!==e&&(a.onTransitionStart(),a.wrapper.transitionEnd(function(){r&&(a.params.loop&&"slide"===h.params.controlBy&&a.fixLoop(),a.onTransitionEnd())}))}var n,r=h.params.control;if(h.isArray(r))for(n=0;n<r.length;n++)r[n]!==a&&r[n]instanceof Swiper&&t(r[n]);else r instanceof Swiper&&a!==r&&t(r)}},h.parallax={setTranslate:function(){h.container.children("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function(){p(this,h.progress)}),h.slides.each(function(){var e=a(this);e.find("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function(){var a=Math.min(Math.max(e[0].progress,-1),1);p(this,a)})})},setTransition:function(e){"undefined"==typeof e&&(e=h.params.speed),h.container.find("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function(){var t=a(this),n=parseInt(t.attr("data-swiper-parallax-duration"),10)||e;0===e&&(n=0),t.transition(n)})}},h._plugins=[];for(var L in h.plugins){var D=h.plugins[L](h,h.params[L]);D&&h._plugins.push(D)}return h.callPlugins=function(e){for(var a=0;a<h._plugins.length;a++)e in h._plugins[a]&&h._plugins[a][e](arguments[1],arguments[2],arguments[3],arguments[4],arguments[5])},h.emitterEventListeners={},h.emit=function(e){h.params[e]&&h.params[e](arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);var a;if(h.emitterEventListeners[e])for(a=0;a<h.emitterEventListeners[e].length;a++)h.emitterEventListeners[e][a](arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);h.callPlugins&&h.callPlugins(e,arguments[1],arguments[2],arguments[3],arguments[4],arguments[5])},h.on=function(e,a){return e=d(e),h.emitterEventListeners[e]||(h.emitterEventListeners[e]=[]),h.emitterEventListeners[e].push(a),h},h.off=function(e,a){var t;if(e=d(e),"undefined"==typeof a)return h.emitterEventListeners[e]=[],h;if(h.emitterEventListeners[e]&&0!==h.emitterEventListeners[e].length){for(t=0;t<h.emitterEventListeners[e].length;t++)h.emitterEventListeners[e][t]===a&&h.emitterEventListeners[e].splice(t,1);return h}},h.once=function(e,a){e=d(e);var t=function(){a(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]),h.off(e,t)};return h.on(e,t),h},h.a11y={makeFocusable:function(e){return e.attr("tabIndex","0"),e},addRole:function(e,a){return e.attr("role",a),e},addLabel:function(e,a){return e.attr("aria-label",a),e},disable:function(e){return e.attr("aria-disabled",!0),e},enable:function(e){return e.attr("aria-disabled",!1),e},onEnterKey:function(e){13===e.keyCode&&(a(e.target).is(h.params.nextButton)?(h.onClickNext(e),h.a11y.notify(h.isEnd?h.params.lastSlideMessage:h.params.nextSlideMessage)):a(e.target).is(h.params.prevButton)&&(h.onClickPrev(e),h.a11y.notify(h.isBeginning?h.params.firstSlideMessage:h.params.prevSlideMessage)),a(e.target).is("."+h.params.bulletClass)&&a(e.target)[0].click())},liveRegion:a('<span class="swiper-notification" aria-live="assertive" aria-atomic="true"></span>'),notify:function(e){var a=h.a11y.liveRegion;0!==a.length&&(a.html(""),a.html(e))},init:function(){if(h.params.nextButton){var e=a(h.params.nextButton);h.a11y.makeFocusable(e),h.a11y.addRole(e,"button"),h.a11y.addLabel(e,h.params.nextSlideMessage)}if(h.params.prevButton){var t=a(h.params.prevButton);h.a11y.makeFocusable(t),h.a11y.addRole(t,"button"),h.a11y.addLabel(t,h.params.prevSlideMessage)}a(h.container).append(h.a11y.liveRegion)},initPagination:function(){h.params.pagination&&h.params.paginationClickable&&h.bullets&&h.bullets.length&&h.bullets.each(function(){var e=a(this);h.a11y.makeFocusable(e),h.a11y.addRole(e,"button"),h.a11y.addLabel(e,h.params.paginationBulletMessage.replace(/{{index}}/,e.index()+1))})},destroy:function(){h.a11y.liveRegion&&h.a11y.liveRegion.length>0&&h.a11y.liveRegion.remove()}},h.init=function(){h.params.loop&&h.createLoop(),h.updateContainerSize(),h.updateSlidesSize(),h.updatePagination(),h.params.scrollbar&&h.scrollbar&&h.scrollbar.set(),"slide"!==h.params.effect&&h.effects[h.params.effect]&&(h.params.loop||h.updateProgress(),h.effects[h.params.effect].setTranslate()),h.params.loop?h.slideTo(h.params.initialSlide+h.loopedSlides,0,h.params.runCallbacksOnInit):(h.slideTo(h.params.initialSlide,0,h.params.runCallbacksOnInit),0===h.params.initialSlide&&(h.parallax&&h.params.parallax&&h.parallax.setTranslate(),h.lazy&&h.params.lazyLoading&&(h.lazy.load(),h.lazy.initialImageLoaded=!0))),h.attachEvents(),h.params.observer&&h.support.observer&&h.initObservers(),h.params.preloadImages&&!h.params.lazyLoading&&h.preloadImages(),h.params.autoplay&&h.startAutoplay(),h.params.keyboardControl&&h.enableKeyboardControl&&h.enableKeyboardControl(),h.params.mousewheelControl&&h.enableMousewheelControl&&h.enableMousewheelControl(),h.params.hashnav&&h.hashnav&&h.hashnav.init(),h.params.a11y&&h.a11y&&h.a11y.init(),h.emit("onInit",h)},h.cleanupStyles=function(){h.container.removeClass(h.classNames.join(" ")).removeAttr("style"),h.wrapper.removeAttr("style"),h.slides&&h.slides.length&&h.slides.removeClass([h.params.slideVisibleClass,h.params.slideActiveClass,h.params.slideNextClass,h.params.slidePrevClass].join(" ")).removeAttr("style").removeAttr("data-swiper-column").removeAttr("data-swiper-row"),h.paginationContainer&&h.paginationContainer.length&&h.paginationContainer.removeClass(h.params.paginationHiddenClass),h.bullets&&h.bullets.length&&h.bullets.removeClass(h.params.bulletActiveClass),h.params.prevButton&&a(h.params.prevButton).removeClass(h.params.buttonDisabledClass),h.params.nextButton&&a(h.params.nextButton).removeClass(h.params.buttonDisabledClass),h.params.scrollbar&&h.scrollbar&&(h.scrollbar.track&&h.scrollbar.track.length&&h.scrollbar.track.removeAttr("style"),h.scrollbar.drag&&h.scrollbar.drag.length&&h.scrollbar.drag.removeAttr("style"))},h.destroy=function(e,a){h.detachEvents(),h.stopAutoplay(),h.params.loop&&h.destroyLoop(),a&&h.cleanupStyles(),h.disconnectObservers(),h.params.keyboardControl&&h.disableKeyboardControl&&h.disableKeyboardControl(),h.params.mousewheelControl&&h.disableMousewheelControl&&h.disableMousewheelControl(),h.params.a11y&&h.a11y&&h.a11y.destroy(),h.emit("onDestroy"),e!==!1&&(h=null)},h.init(),h}},Swiper.prototype={isSafari:function(){var e=navigator.userAgent.toLowerCase();return e.indexOf("safari")>=0&&e.indexOf("chrome")<0&&e.indexOf("android")<0}(),isUiWebView:/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent),isArray:function(e){return"[object Array]"===Object.prototype.toString.apply(e)},browser:{ie:window.navigator.pointerEnabled||window.navigator.msPointerEnabled,ieTouch:window.navigator.msPointerEnabled&&window.navigator.msMaxTouchPoints>1||window.navigator.pointerEnabled&&window.navigator.maxTouchPoints>1},device:function(){var e=navigator.userAgent,a=e.match(/(Android);?[\s\/]+([\d.]+)?/),t=e.match(/(iPad).*OS\s([\d_]+)/),n=e.match(/(iPod)(.*OS\s([\d_]+))?/),r=!t&&e.match(/(iPhone\sOS)\s([\d_]+)/);return{ios:t||r||n,android:a}}(),support:{touch:window.Modernizr&&Modernizr.touch===!0||function(){return!!("ontouchstart"in window||window.DocumentTouch&&document instanceof DocumentTouch)}(),transforms3d:window.Modernizr&&Modernizr.csstransforms3d===!0||function(){var e=document.createElement("div").style;return"webkitPerspective"in e||"MozPerspective"in e||"OPerspective"in e||"MsPerspective"in e||"perspective"in e}(),flexbox:function(){for(var e=document.createElement("div").style,a="alignItems webkitAlignItems webkitBoxAlign msFlexAlign mozBoxAlign webkitFlexDirection msFlexDirection mozBoxDirection mozBoxOrient webkitBoxDirection webkitBoxOrient".split(" "),t=0;t<a.length;t++)if(a[t]in e)return!0}(),observer:function(){return"MutationObserver"in window||"WebkitMutationObserver"in window}()},plugins:{}}}();
//# sourceMappingURL=framework7.min.js.map
/*! jQuery v2.1.4 | (c) 2005, 2015 jQuery Foundation, Inc. | jquery.org/license */
!function(a,b){"object"==typeof module&&"object"==typeof module.exports?module.exports=a.document?b(a,!0):function(a){if(!a.document)throw new Error("jQuery requires a window with a document");return b(a)}:b(a)}("undefined"!=typeof window?window:this,function(a,b){var c=[],d=c.slice,e=c.concat,f=c.push,g=c.indexOf,h={},i=h.toString,j=h.hasOwnProperty,k={},l=a.document,m="2.1.4",n=function(a,b){return new n.fn.init(a,b)},o=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,p=/^-ms-/,q=/-([\da-z])/gi,r=function(a,b){return b.toUpperCase()};n.fn=n.prototype={jquery:m,constructor:n,selector:"",length:0,toArray:function(){return d.call(this)},get:function(a){return null!=a?0>a?this[a+this.length]:this[a]:d.call(this)},pushStack:function(a){var b=n.merge(this.constructor(),a);return b.prevObject=this,b.context=this.context,b},each:function(a,b){return n.each(this,a,b)},map:function(a){return this.pushStack(n.map(this,function(b,c){return a.call(b,c,b)}))},slice:function(){return this.pushStack(d.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(a){var b=this.length,c=+a+(0>a?b:0);return this.pushStack(c>=0&&b>c?[this[c]]:[])},end:function(){return this.prevObject||this.constructor(null)},push:f,sort:c.sort,splice:c.splice},n.extend=n.fn.extend=function(){var a,b,c,d,e,f,g=arguments[0]||{},h=1,i=arguments.length,j=!1;for("boolean"==typeof g&&(j=g,g=arguments[h]||{},h++),"object"==typeof g||n.isFunction(g)||(g={}),h===i&&(g=this,h--);i>h;h++)if(null!=(a=arguments[h]))for(b in a)c=g[b],d=a[b],g!==d&&(j&&d&&(n.isPlainObject(d)||(e=n.isArray(d)))?(e?(e=!1,f=c&&n.isArray(c)?c:[]):f=c&&n.isPlainObject(c)?c:{},g[b]=n.extend(j,f,d)):void 0!==d&&(g[b]=d));return g},n.extend({expando:"jQuery"+(m+Math.random()).replace(/\D/g,""),isReady:!0,error:function(a){throw new Error(a)},noop:function(){},isFunction:function(a){return"function"===n.type(a)},isArray:Array.isArray,isWindow:function(a){return null!=a&&a===a.window},isNumeric:function(a){return!n.isArray(a)&&a-parseFloat(a)+1>=0},isPlainObject:function(a){return"object"!==n.type(a)||a.nodeType||n.isWindow(a)?!1:a.constructor&&!j.call(a.constructor.prototype,"isPrototypeOf")?!1:!0},isEmptyObject:function(a){var b;for(b in a)return!1;return!0},type:function(a){return null==a?a+"":"object"==typeof a||"function"==typeof a?h[i.call(a)]||"object":typeof a},globalEval:function(a){var b,c=eval;a=n.trim(a),a&&(1===a.indexOf("use strict")?(b=l.createElement("script"),b.text=a,l.head.appendChild(b).parentNode.removeChild(b)):c(a))},camelCase:function(a){return a.replace(p,"ms-").replace(q,r)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toLowerCase()===b.toLowerCase()},each:function(a,b,c){var d,e=0,f=a.length,g=s(a);if(c){if(g){for(;f>e;e++)if(d=b.apply(a[e],c),d===!1)break}else for(e in a)if(d=b.apply(a[e],c),d===!1)break}else if(g){for(;f>e;e++)if(d=b.call(a[e],e,a[e]),d===!1)break}else for(e in a)if(d=b.call(a[e],e,a[e]),d===!1)break;return a},trim:function(a){return null==a?"":(a+"").replace(o,"")},makeArray:function(a,b){var c=b||[];return null!=a&&(s(Object(a))?n.merge(c,"string"==typeof a?[a]:a):f.call(c,a)),c},inArray:function(a,b,c){return null==b?-1:g.call(b,a,c)},merge:function(a,b){for(var c=+b.length,d=0,e=a.length;c>d;d++)a[e++]=b[d];return a.length=e,a},grep:function(a,b,c){for(var d,e=[],f=0,g=a.length,h=!c;g>f;f++)d=!b(a[f],f),d!==h&&e.push(a[f]);return e},map:function(a,b,c){var d,f=0,g=a.length,h=s(a),i=[];if(h)for(;g>f;f++)d=b(a[f],f,c),null!=d&&i.push(d);else for(f in a)d=b(a[f],f,c),null!=d&&i.push(d);return e.apply([],i)},guid:1,proxy:function(a,b){var c,e,f;return"string"==typeof b&&(c=a[b],b=a,a=c),n.isFunction(a)?(e=d.call(arguments,2),f=function(){return a.apply(b||this,e.concat(d.call(arguments)))},f.guid=a.guid=a.guid||n.guid++,f):void 0},now:Date.now,support:k}),n.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(a,b){h["[object "+b+"]"]=b.toLowerCase()});function s(a){var b="length"in a&&a.length,c=n.type(a);return"function"===c||n.isWindow(a)?!1:1===a.nodeType&&b?!0:"array"===c||0===b||"number"==typeof b&&b>0&&b-1 in a}var t=function(a){var b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u="sizzle"+1*new Date,v=a.document,w=0,x=0,y=ha(),z=ha(),A=ha(),B=function(a,b){return a===b&&(l=!0),0},C=1<<31,D={}.hasOwnProperty,E=[],F=E.pop,G=E.push,H=E.push,I=E.slice,J=function(a,b){for(var c=0,d=a.length;d>c;c++)if(a[c]===b)return c;return-1},K="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",L="[\\x20\\t\\r\\n\\f]",M="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",N=M.replace("w","w#"),O="\\["+L+"*("+M+")(?:"+L+"*([*^$|!~]?=)"+L+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+N+"))|)"+L+"*\\]",P=":("+M+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+O+")*)|.*)\\)|)",Q=new RegExp(L+"+","g"),R=new RegExp("^"+L+"+|((?:^|[^\\\\])(?:\\\\.)*)"+L+"+$","g"),S=new RegExp("^"+L+"*,"+L+"*"),T=new RegExp("^"+L+"*([>+~]|"+L+")"+L+"*"),U=new RegExp("="+L+"*([^\\]'\"]*?)"+L+"*\\]","g"),V=new RegExp(P),W=new RegExp("^"+N+"$"),X={ID:new RegExp("^#("+M+")"),CLASS:new RegExp("^\\.("+M+")"),TAG:new RegExp("^("+M.replace("w","w*")+")"),ATTR:new RegExp("^"+O),PSEUDO:new RegExp("^"+P),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+L+"*(even|odd|(([+-]|)(\\d*)n|)"+L+"*(?:([+-]|)"+L+"*(\\d+)|))"+L+"*\\)|)","i"),bool:new RegExp("^(?:"+K+")$","i"),needsContext:new RegExp("^"+L+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+L+"*((?:-\\d)?\\d*)"+L+"*\\)|)(?=[^-]|$)","i")},Y=/^(?:input|select|textarea|button)$/i,Z=/^h\d$/i,$=/^[^{]+\{\s*\[native \w/,_=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,aa=/[+~]/,ba=/'|\\/g,ca=new RegExp("\\\\([\\da-f]{1,6}"+L+"?|("+L+")|.)","ig"),da=function(a,b,c){var d="0x"+b-65536;return d!==d||c?b:0>d?String.fromCharCode(d+65536):String.fromCharCode(d>>10|55296,1023&d|56320)},ea=function(){m()};try{H.apply(E=I.call(v.childNodes),v.childNodes),E[v.childNodes.length].nodeType}catch(fa){H={apply:E.length?function(a,b){G.apply(a,I.call(b))}:function(a,b){var c=a.length,d=0;while(a[c++]=b[d++]);a.length=c-1}}}function ga(a,b,d,e){var f,h,j,k,l,o,r,s,w,x;if((b?b.ownerDocument||b:v)!==n&&m(b),b=b||n,d=d||[],k=b.nodeType,"string"!=typeof a||!a||1!==k&&9!==k&&11!==k)return d;if(!e&&p){if(11!==k&&(f=_.exec(a)))if(j=f[1]){if(9===k){if(h=b.getElementById(j),!h||!h.parentNode)return d;if(h.id===j)return d.push(h),d}else if(b.ownerDocument&&(h=b.ownerDocument.getElementById(j))&&t(b,h)&&h.id===j)return d.push(h),d}else{if(f[2])return H.apply(d,b.getElementsByTagName(a)),d;if((j=f[3])&&c.getElementsByClassName)return H.apply(d,b.getElementsByClassName(j)),d}if(c.qsa&&(!q||!q.test(a))){if(s=r=u,w=b,x=1!==k&&a,1===k&&"object"!==b.nodeName.toLowerCase()){o=g(a),(r=b.getAttribute("id"))?s=r.replace(ba,"\\$&"):b.setAttribute("id",s),s="[id='"+s+"'] ",l=o.length;while(l--)o[l]=s+ra(o[l]);w=aa.test(a)&&pa(b.parentNode)||b,x=o.join(",")}if(x)try{return H.apply(d,w.querySelectorAll(x)),d}catch(y){}finally{r||b.removeAttribute("id")}}}return i(a.replace(R,"$1"),b,d,e)}function ha(){var a=[];function b(c,e){return a.push(c+" ")>d.cacheLength&&delete b[a.shift()],b[c+" "]=e}return b}function ia(a){return a[u]=!0,a}function ja(a){var b=n.createElement("div");try{return!!a(b)}catch(c){return!1}finally{b.parentNode&&b.parentNode.removeChild(b),b=null}}function ka(a,b){var c=a.split("|"),e=a.length;while(e--)d.attrHandle[c[e]]=b}function la(a,b){var c=b&&a,d=c&&1===a.nodeType&&1===b.nodeType&&(~b.sourceIndex||C)-(~a.sourceIndex||C);if(d)return d;if(c)while(c=c.nextSibling)if(c===b)return-1;return a?1:-1}function ma(a){return function(b){var c=b.nodeName.toLowerCase();return"input"===c&&b.type===a}}function na(a){return function(b){var c=b.nodeName.toLowerCase();return("input"===c||"button"===c)&&b.type===a}}function oa(a){return ia(function(b){return b=+b,ia(function(c,d){var e,f=a([],c.length,b),g=f.length;while(g--)c[e=f[g]]&&(c[e]=!(d[e]=c[e]))})})}function pa(a){return a&&"undefined"!=typeof a.getElementsByTagName&&a}c=ga.support={},f=ga.isXML=function(a){var b=a&&(a.ownerDocument||a).documentElement;return b?"HTML"!==b.nodeName:!1},m=ga.setDocument=function(a){var b,e,g=a?a.ownerDocument||a:v;return g!==n&&9===g.nodeType&&g.documentElement?(n=g,o=g.documentElement,e=g.defaultView,e&&e!==e.top&&(e.addEventListener?e.addEventListener("unload",ea,!1):e.attachEvent&&e.attachEvent("onunload",ea)),p=!f(g),c.attributes=ja(function(a){return a.className="i",!a.getAttribute("className")}),c.getElementsByTagName=ja(function(a){return a.appendChild(g.createComment("")),!a.getElementsByTagName("*").length}),c.getElementsByClassName=$.test(g.getElementsByClassName),c.getById=ja(function(a){return o.appendChild(a).id=u,!g.getElementsByName||!g.getElementsByName(u).length}),c.getById?(d.find.ID=function(a,b){if("undefined"!=typeof b.getElementById&&p){var c=b.getElementById(a);return c&&c.parentNode?[c]:[]}},d.filter.ID=function(a){var b=a.replace(ca,da);return function(a){return a.getAttribute("id")===b}}):(delete d.find.ID,d.filter.ID=function(a){var b=a.replace(ca,da);return function(a){var c="undefined"!=typeof a.getAttributeNode&&a.getAttributeNode("id");return c&&c.value===b}}),d.find.TAG=c.getElementsByTagName?function(a,b){return"undefined"!=typeof b.getElementsByTagName?b.getElementsByTagName(a):c.qsa?b.querySelectorAll(a):void 0}:function(a,b){var c,d=[],e=0,f=b.getElementsByTagName(a);if("*"===a){while(c=f[e++])1===c.nodeType&&d.push(c);return d}return f},d.find.CLASS=c.getElementsByClassName&&function(a,b){return p?b.getElementsByClassName(a):void 0},r=[],q=[],(c.qsa=$.test(g.querySelectorAll))&&(ja(function(a){o.appendChild(a).innerHTML="<a id='"+u+"'></a><select id='"+u+"-\f]' msallowcapture=''><option selected=''></option></select>",a.querySelectorAll("[msallowcapture^='']").length&&q.push("[*^$]="+L+"*(?:''|\"\")"),a.querySelectorAll("[selected]").length||q.push("\\["+L+"*(?:value|"+K+")"),a.querySelectorAll("[id~="+u+"-]").length||q.push("~="),a.querySelectorAll(":checked").length||q.push(":checked"),a.querySelectorAll("a#"+u+"+*").length||q.push(".#.+[+~]")}),ja(function(a){var b=g.createElement("input");b.setAttribute("type","hidden"),a.appendChild(b).setAttribute("name","D"),a.querySelectorAll("[name=d]").length&&q.push("name"+L+"*[*^$|!~]?="),a.querySelectorAll(":enabled").length||q.push(":enabled",":disabled"),a.querySelectorAll("*,:x"),q.push(",.*:")})),(c.matchesSelector=$.test(s=o.matches||o.webkitMatchesSelector||o.mozMatchesSelector||o.oMatchesSelector||o.msMatchesSelector))&&ja(function(a){c.disconnectedMatch=s.call(a,"div"),s.call(a,"[s!='']:x"),r.push("!=",P)}),q=q.length&&new RegExp(q.join("|")),r=r.length&&new RegExp(r.join("|")),b=$.test(o.compareDocumentPosition),t=b||$.test(o.contains)?function(a,b){var c=9===a.nodeType?a.documentElement:a,d=b&&b.parentNode;return a===d||!(!d||1!==d.nodeType||!(c.contains?c.contains(d):a.compareDocumentPosition&&16&a.compareDocumentPosition(d)))}:function(a,b){if(b)while(b=b.parentNode)if(b===a)return!0;return!1},B=b?function(a,b){if(a===b)return l=!0,0;var d=!a.compareDocumentPosition-!b.compareDocumentPosition;return d?d:(d=(a.ownerDocument||a)===(b.ownerDocument||b)?a.compareDocumentPosition(b):1,1&d||!c.sortDetached&&b.compareDocumentPosition(a)===d?a===g||a.ownerDocument===v&&t(v,a)?-1:b===g||b.ownerDocument===v&&t(v,b)?1:k?J(k,a)-J(k,b):0:4&d?-1:1)}:function(a,b){if(a===b)return l=!0,0;var c,d=0,e=a.parentNode,f=b.parentNode,h=[a],i=[b];if(!e||!f)return a===g?-1:b===g?1:e?-1:f?1:k?J(k,a)-J(k,b):0;if(e===f)return la(a,b);c=a;while(c=c.parentNode)h.unshift(c);c=b;while(c=c.parentNode)i.unshift(c);while(h[d]===i[d])d++;return d?la(h[d],i[d]):h[d]===v?-1:i[d]===v?1:0},g):n},ga.matches=function(a,b){return ga(a,null,null,b)},ga.matchesSelector=function(a,b){if((a.ownerDocument||a)!==n&&m(a),b=b.replace(U,"='$1']"),!(!c.matchesSelector||!p||r&&r.test(b)||q&&q.test(b)))try{var d=s.call(a,b);if(d||c.disconnectedMatch||a.document&&11!==a.document.nodeType)return d}catch(e){}return ga(b,n,null,[a]).length>0},ga.contains=function(a,b){return(a.ownerDocument||a)!==n&&m(a),t(a,b)},ga.attr=function(a,b){(a.ownerDocument||a)!==n&&m(a);var e=d.attrHandle[b.toLowerCase()],f=e&&D.call(d.attrHandle,b.toLowerCase())?e(a,b,!p):void 0;return void 0!==f?f:c.attributes||!p?a.getAttribute(b):(f=a.getAttributeNode(b))&&f.specified?f.value:null},ga.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)},ga.uniqueSort=function(a){var b,d=[],e=0,f=0;if(l=!c.detectDuplicates,k=!c.sortStable&&a.slice(0),a.sort(B),l){while(b=a[f++])b===a[f]&&(e=d.push(f));while(e--)a.splice(d[e],1)}return k=null,a},e=ga.getText=function(a){var b,c="",d=0,f=a.nodeType;if(f){if(1===f||9===f||11===f){if("string"==typeof a.textContent)return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=e(a)}else if(3===f||4===f)return a.nodeValue}else while(b=a[d++])c+=e(b);return c},d=ga.selectors={cacheLength:50,createPseudo:ia,match:X,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(a){return a[1]=a[1].replace(ca,da),a[3]=(a[3]||a[4]||a[5]||"").replace(ca,da),"~="===a[2]&&(a[3]=" "+a[3]+" "),a.slice(0,4)},CHILD:function(a){return a[1]=a[1].toLowerCase(),"nth"===a[1].slice(0,3)?(a[3]||ga.error(a[0]),a[4]=+(a[4]?a[5]+(a[6]||1):2*("even"===a[3]||"odd"===a[3])),a[5]=+(a[7]+a[8]||"odd"===a[3])):a[3]&&ga.error(a[0]),a},PSEUDO:function(a){var b,c=!a[6]&&a[2];return X.CHILD.test(a[0])?null:(a[3]?a[2]=a[4]||a[5]||"":c&&V.test(c)&&(b=g(c,!0))&&(b=c.indexOf(")",c.length-b)-c.length)&&(a[0]=a[0].slice(0,b),a[2]=c.slice(0,b)),a.slice(0,3))}},filter:{TAG:function(a){var b=a.replace(ca,da).toLowerCase();return"*"===a?function(){return!0}:function(a){return a.nodeName&&a.nodeName.toLowerCase()===b}},CLASS:function(a){var b=y[a+" "];return b||(b=new RegExp("(^|"+L+")"+a+"("+L+"|$)"))&&y(a,function(a){return b.test("string"==typeof a.className&&a.className||"undefined"!=typeof a.getAttribute&&a.getAttribute("class")||"")})},ATTR:function(a,b,c){return function(d){var e=ga.attr(d,a);return null==e?"!="===b:b?(e+="","="===b?e===c:"!="===b?e!==c:"^="===b?c&&0===e.indexOf(c):"*="===b?c&&e.indexOf(c)>-1:"$="===b?c&&e.slice(-c.length)===c:"~="===b?(" "+e.replace(Q," ")+" ").indexOf(c)>-1:"|="===b?e===c||e.slice(0,c.length+1)===c+"-":!1):!0}},CHILD:function(a,b,c,d,e){var f="nth"!==a.slice(0,3),g="last"!==a.slice(-4),h="of-type"===b;return 1===d&&0===e?function(a){return!!a.parentNode}:function(b,c,i){var j,k,l,m,n,o,p=f!==g?"nextSibling":"previousSibling",q=b.parentNode,r=h&&b.nodeName.toLowerCase(),s=!i&&!h;if(q){if(f){while(p){l=b;while(l=l[p])if(h?l.nodeName.toLowerCase()===r:1===l.nodeType)return!1;o=p="only"===a&&!o&&"nextSibling"}return!0}if(o=[g?q.firstChild:q.lastChild],g&&s){k=q[u]||(q[u]={}),j=k[a]||[],n=j[0]===w&&j[1],m=j[0]===w&&j[2],l=n&&q.childNodes[n];while(l=++n&&l&&l[p]||(m=n=0)||o.pop())if(1===l.nodeType&&++m&&l===b){k[a]=[w,n,m];break}}else if(s&&(j=(b[u]||(b[u]={}))[a])&&j[0]===w)m=j[1];else while(l=++n&&l&&l[p]||(m=n=0)||o.pop())if((h?l.nodeName.toLowerCase()===r:1===l.nodeType)&&++m&&(s&&((l[u]||(l[u]={}))[a]=[w,m]),l===b))break;return m-=e,m===d||m%d===0&&m/d>=0}}},PSEUDO:function(a,b){var c,e=d.pseudos[a]||d.setFilters[a.toLowerCase()]||ga.error("unsupported pseudo: "+a);return e[u]?e(b):e.length>1?(c=[a,a,"",b],d.setFilters.hasOwnProperty(a.toLowerCase())?ia(function(a,c){var d,f=e(a,b),g=f.length;while(g--)d=J(a,f[g]),a[d]=!(c[d]=f[g])}):function(a){return e(a,0,c)}):e}},pseudos:{not:ia(function(a){var b=[],c=[],d=h(a.replace(R,"$1"));return d[u]?ia(function(a,b,c,e){var f,g=d(a,null,e,[]),h=a.length;while(h--)(f=g[h])&&(a[h]=!(b[h]=f))}):function(a,e,f){return b[0]=a,d(b,null,f,c),b[0]=null,!c.pop()}}),has:ia(function(a){return function(b){return ga(a,b).length>0}}),contains:ia(function(a){return a=a.replace(ca,da),function(b){return(b.textContent||b.innerText||e(b)).indexOf(a)>-1}}),lang:ia(function(a){return W.test(a||"")||ga.error("unsupported lang: "+a),a=a.replace(ca,da).toLowerCase(),function(b){var c;do if(c=p?b.lang:b.getAttribute("xml:lang")||b.getAttribute("lang"))return c=c.toLowerCase(),c===a||0===c.indexOf(a+"-");while((b=b.parentNode)&&1===b.nodeType);return!1}}),target:function(b){var c=a.location&&a.location.hash;return c&&c.slice(1)===b.id},root:function(a){return a===o},focus:function(a){return a===n.activeElement&&(!n.hasFocus||n.hasFocus())&&!!(a.type||a.href||~a.tabIndex)},enabled:function(a){return a.disabled===!1},disabled:function(a){return a.disabled===!0},checked:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&!!a.checked||"option"===b&&!!a.selected},selected:function(a){return a.parentNode&&a.parentNode.selectedIndex,a.selected===!0},empty:function(a){for(a=a.firstChild;a;a=a.nextSibling)if(a.nodeType<6)return!1;return!0},parent:function(a){return!d.pseudos.empty(a)},header:function(a){return Z.test(a.nodeName)},input:function(a){return Y.test(a.nodeName)},button:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&"button"===a.type||"button"===b},text:function(a){var b;return"input"===a.nodeName.toLowerCase()&&"text"===a.type&&(null==(b=a.getAttribute("type"))||"text"===b.toLowerCase())},first:oa(function(){return[0]}),last:oa(function(a,b){return[b-1]}),eq:oa(function(a,b,c){return[0>c?c+b:c]}),even:oa(function(a,b){for(var c=0;b>c;c+=2)a.push(c);return a}),odd:oa(function(a,b){for(var c=1;b>c;c+=2)a.push(c);return a}),lt:oa(function(a,b,c){for(var d=0>c?c+b:c;--d>=0;)a.push(d);return a}),gt:oa(function(a,b,c){for(var d=0>c?c+b:c;++d<b;)a.push(d);return a})}},d.pseudos.nth=d.pseudos.eq;for(b in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})d.pseudos[b]=ma(b);for(b in{submit:!0,reset:!0})d.pseudos[b]=na(b);function qa(){}qa.prototype=d.filters=d.pseudos,d.setFilters=new qa,g=ga.tokenize=function(a,b){var c,e,f,g,h,i,j,k=z[a+" "];if(k)return b?0:k.slice(0);h=a,i=[],j=d.preFilter;while(h){(!c||(e=S.exec(h)))&&(e&&(h=h.slice(e[0].length)||h),i.push(f=[])),c=!1,(e=T.exec(h))&&(c=e.shift(),f.push({value:c,type:e[0].replace(R," ")}),h=h.slice(c.length));for(g in d.filter)!(e=X[g].exec(h))||j[g]&&!(e=j[g](e))||(c=e.shift(),f.push({value:c,type:g,matches:e}),h=h.slice(c.length));if(!c)break}return b?h.length:h?ga.error(a):z(a,i).slice(0)};function ra(a){for(var b=0,c=a.length,d="";c>b;b++)d+=a[b].value;return d}function sa(a,b,c){var d=b.dir,e=c&&"parentNode"===d,f=x++;return b.first?function(b,c,f){while(b=b[d])if(1===b.nodeType||e)return a(b,c,f)}:function(b,c,g){var h,i,j=[w,f];if(g){while(b=b[d])if((1===b.nodeType||e)&&a(b,c,g))return!0}else while(b=b[d])if(1===b.nodeType||e){if(i=b[u]||(b[u]={}),(h=i[d])&&h[0]===w&&h[1]===f)return j[2]=h[2];if(i[d]=j,j[2]=a(b,c,g))return!0}}}function ta(a){return a.length>1?function(b,c,d){var e=a.length;while(e--)if(!a[e](b,c,d))return!1;return!0}:a[0]}function ua(a,b,c){for(var d=0,e=b.length;e>d;d++)ga(a,b[d],c);return c}function va(a,b,c,d,e){for(var f,g=[],h=0,i=a.length,j=null!=b;i>h;h++)(f=a[h])&&(!c||c(f,d,e))&&(g.push(f),j&&b.push(h));return g}function wa(a,b,c,d,e,f){return d&&!d[u]&&(d=wa(d)),e&&!e[u]&&(e=wa(e,f)),ia(function(f,g,h,i){var j,k,l,m=[],n=[],o=g.length,p=f||ua(b||"*",h.nodeType?[h]:h,[]),q=!a||!f&&b?p:va(p,m,a,h,i),r=c?e||(f?a:o||d)?[]:g:q;if(c&&c(q,r,h,i),d){j=va(r,n),d(j,[],h,i),k=j.length;while(k--)(l=j[k])&&(r[n[k]]=!(q[n[k]]=l))}if(f){if(e||a){if(e){j=[],k=r.length;while(k--)(l=r[k])&&j.push(q[k]=l);e(null,r=[],j,i)}k=r.length;while(k--)(l=r[k])&&(j=e?J(f,l):m[k])>-1&&(f[j]=!(g[j]=l))}}else r=va(r===g?r.splice(o,r.length):r),e?e(null,g,r,i):H.apply(g,r)})}function xa(a){for(var b,c,e,f=a.length,g=d.relative[a[0].type],h=g||d.relative[" "],i=g?1:0,k=sa(function(a){return a===b},h,!0),l=sa(function(a){return J(b,a)>-1},h,!0),m=[function(a,c,d){var e=!g&&(d||c!==j)||((b=c).nodeType?k(a,c,d):l(a,c,d));return b=null,e}];f>i;i++)if(c=d.relative[a[i].type])m=[sa(ta(m),c)];else{if(c=d.filter[a[i].type].apply(null,a[i].matches),c[u]){for(e=++i;f>e;e++)if(d.relative[a[e].type])break;return wa(i>1&&ta(m),i>1&&ra(a.slice(0,i-1).concat({value:" "===a[i-2].type?"*":""})).replace(R,"$1"),c,e>i&&xa(a.slice(i,e)),f>e&&xa(a=a.slice(e)),f>e&&ra(a))}m.push(c)}return ta(m)}function ya(a,b){var c=b.length>0,e=a.length>0,f=function(f,g,h,i,k){var l,m,o,p=0,q="0",r=f&&[],s=[],t=j,u=f||e&&d.find.TAG("*",k),v=w+=null==t?1:Math.random()||.1,x=u.length;for(k&&(j=g!==n&&g);q!==x&&null!=(l=u[q]);q++){if(e&&l){m=0;while(o=a[m++])if(o(l,g,h)){i.push(l);break}k&&(w=v)}c&&((l=!o&&l)&&p--,f&&r.push(l))}if(p+=q,c&&q!==p){m=0;while(o=b[m++])o(r,s,g,h);if(f){if(p>0)while(q--)r[q]||s[q]||(s[q]=F.call(i));s=va(s)}H.apply(i,s),k&&!f&&s.length>0&&p+b.length>1&&ga.uniqueSort(i)}return k&&(w=v,j=t),r};return c?ia(f):f}return h=ga.compile=function(a,b){var c,d=[],e=[],f=A[a+" "];if(!f){b||(b=g(a)),c=b.length;while(c--)f=xa(b[c]),f[u]?d.push(f):e.push(f);f=A(a,ya(e,d)),f.selector=a}return f},i=ga.select=function(a,b,e,f){var i,j,k,l,m,n="function"==typeof a&&a,o=!f&&g(a=n.selector||a);if(e=e||[],1===o.length){if(j=o[0]=o[0].slice(0),j.length>2&&"ID"===(k=j[0]).type&&c.getById&&9===b.nodeType&&p&&d.relative[j[1].type]){if(b=(d.find.ID(k.matches[0].replace(ca,da),b)||[])[0],!b)return e;n&&(b=b.parentNode),a=a.slice(j.shift().value.length)}i=X.needsContext.test(a)?0:j.length;while(i--){if(k=j[i],d.relative[l=k.type])break;if((m=d.find[l])&&(f=m(k.matches[0].replace(ca,da),aa.test(j[0].type)&&pa(b.parentNode)||b))){if(j.splice(i,1),a=f.length&&ra(j),!a)return H.apply(e,f),e;break}}}return(n||h(a,o))(f,b,!p,e,aa.test(a)&&pa(b.parentNode)||b),e},c.sortStable=u.split("").sort(B).join("")===u,c.detectDuplicates=!!l,m(),c.sortDetached=ja(function(a){return 1&a.compareDocumentPosition(n.createElement("div"))}),ja(function(a){return a.innerHTML="<a href='#'></a>","#"===a.firstChild.getAttribute("href")})||ka("type|href|height|width",function(a,b,c){return c?void 0:a.getAttribute(b,"type"===b.toLowerCase()?1:2)}),c.attributes&&ja(function(a){return a.innerHTML="<input/>",a.firstChild.setAttribute("value",""),""===a.firstChild.getAttribute("value")})||ka("value",function(a,b,c){return c||"input"!==a.nodeName.toLowerCase()?void 0:a.defaultValue}),ja(function(a){return null==a.getAttribute("disabled")})||ka(K,function(a,b,c){var d;return c?void 0:a[b]===!0?b.toLowerCase():(d=a.getAttributeNode(b))&&d.specified?d.value:null}),ga}(a);n.find=t,n.expr=t.selectors,n.expr[":"]=n.expr.pseudos,n.unique=t.uniqueSort,n.text=t.getText,n.isXMLDoc=t.isXML,n.contains=t.contains;var u=n.expr.match.needsContext,v=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,w=/^.[^:#\[\.,]*$/;function x(a,b,c){if(n.isFunction(b))return n.grep(a,function(a,d){return!!b.call(a,d,a)!==c});if(b.nodeType)return n.grep(a,function(a){return a===b!==c});if("string"==typeof b){if(w.test(b))return n.filter(b,a,c);b=n.filter(b,a)}return n.grep(a,function(a){return g.call(b,a)>=0!==c})}n.filter=function(a,b,c){var d=b[0];return c&&(a=":not("+a+")"),1===b.length&&1===d.nodeType?n.find.matchesSelector(d,a)?[d]:[]:n.find.matches(a,n.grep(b,function(a){return 1===a.nodeType}))},n.fn.extend({find:function(a){var b,c=this.length,d=[],e=this;if("string"!=typeof a)return this.pushStack(n(a).filter(function(){for(b=0;c>b;b++)if(n.contains(e[b],this))return!0}));for(b=0;c>b;b++)n.find(a,e[b],d);return d=this.pushStack(c>1?n.unique(d):d),d.selector=this.selector?this.selector+" "+a:a,d},filter:function(a){return this.pushStack(x(this,a||[],!1))},not:function(a){return this.pushStack(x(this,a||[],!0))},is:function(a){return!!x(this,"string"==typeof a&&u.test(a)?n(a):a||[],!1).length}});var y,z=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,A=n.fn.init=function(a,b){var c,d;if(!a)return this;if("string"==typeof a){if(c="<"===a[0]&&">"===a[a.length-1]&&a.length>=3?[null,a,null]:z.exec(a),!c||!c[1]&&b)return!b||b.jquery?(b||y).find(a):this.constructor(b).find(a);if(c[1]){if(b=b instanceof n?b[0]:b,n.merge(this,n.parseHTML(c[1],b&&b.nodeType?b.ownerDocument||b:l,!0)),v.test(c[1])&&n.isPlainObject(b))for(c in b)n.isFunction(this[c])?this[c](b[c]):this.attr(c,b[c]);return this}return d=l.getElementById(c[2]),d&&d.parentNode&&(this.length=1,this[0]=d),this.context=l,this.selector=a,this}return a.nodeType?(this.context=this[0]=a,this.length=1,this):n.isFunction(a)?"undefined"!=typeof y.ready?y.ready(a):a(n):(void 0!==a.selector&&(this.selector=a.selector,this.context=a.context),n.makeArray(a,this))};A.prototype=n.fn,y=n(l);var B=/^(?:parents|prev(?:Until|All))/,C={children:!0,contents:!0,next:!0,prev:!0};n.extend({dir:function(a,b,c){var d=[],e=void 0!==c;while((a=a[b])&&9!==a.nodeType)if(1===a.nodeType){if(e&&n(a).is(c))break;d.push(a)}return d},sibling:function(a,b){for(var c=[];a;a=a.nextSibling)1===a.nodeType&&a!==b&&c.push(a);return c}}),n.fn.extend({has:function(a){var b=n(a,this),c=b.length;return this.filter(function(){for(var a=0;c>a;a++)if(n.contains(this,b[a]))return!0})},closest:function(a,b){for(var c,d=0,e=this.length,f=[],g=u.test(a)||"string"!=typeof a?n(a,b||this.context):0;e>d;d++)for(c=this[d];c&&c!==b;c=c.parentNode)if(c.nodeType<11&&(g?g.index(c)>-1:1===c.nodeType&&n.find.matchesSelector(c,a))){f.push(c);break}return this.pushStack(f.length>1?n.unique(f):f)},index:function(a){return a?"string"==typeof a?g.call(n(a),this[0]):g.call(this,a.jquery?a[0]:a):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(a,b){return this.pushStack(n.unique(n.merge(this.get(),n(a,b))))},addBack:function(a){return this.add(null==a?this.prevObject:this.prevObject.filter(a))}});function D(a,b){while((a=a[b])&&1!==a.nodeType);return a}n.each({parent:function(a){var b=a.parentNode;return b&&11!==b.nodeType?b:null},parents:function(a){return n.dir(a,"parentNode")},parentsUntil:function(a,b,c){return n.dir(a,"parentNode",c)},next:function(a){return D(a,"nextSibling")},prev:function(a){return D(a,"previousSibling")},nextAll:function(a){return n.dir(a,"nextSibling")},prevAll:function(a){return n.dir(a,"previousSibling")},nextUntil:function(a,b,c){return n.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return n.dir(a,"previousSibling",c)},siblings:function(a){return n.sibling((a.parentNode||{}).firstChild,a)},children:function(a){return n.sibling(a.firstChild)},contents:function(a){return a.contentDocument||n.merge([],a.childNodes)}},function(a,b){n.fn[a]=function(c,d){var e=n.map(this,b,c);return"Until"!==a.slice(-5)&&(d=c),d&&"string"==typeof d&&(e=n.filter(d,e)),this.length>1&&(C[a]||n.unique(e),B.test(a)&&e.reverse()),this.pushStack(e)}});var E=/\S+/g,F={};function G(a){var b=F[a]={};return n.each(a.match(E)||[],function(a,c){b[c]=!0}),b}n.Callbacks=function(a){a="string"==typeof a?F[a]||G(a):n.extend({},a);var b,c,d,e,f,g,h=[],i=!a.once&&[],j=function(l){for(b=a.memory&&l,c=!0,g=e||0,e=0,f=h.length,d=!0;h&&f>g;g++)if(h[g].apply(l[0],l[1])===!1&&a.stopOnFalse){b=!1;break}d=!1,h&&(i?i.length&&j(i.shift()):b?h=[]:k.disable())},k={add:function(){if(h){var c=h.length;!function g(b){n.each(b,function(b,c){var d=n.type(c);"function"===d?a.unique&&k.has(c)||h.push(c):c&&c.length&&"string"!==d&&g(c)})}(arguments),d?f=h.length:b&&(e=c,j(b))}return this},remove:function(){return h&&n.each(arguments,function(a,b){var c;while((c=n.inArray(b,h,c))>-1)h.splice(c,1),d&&(f>=c&&f--,g>=c&&g--)}),this},has:function(a){return a?n.inArray(a,h)>-1:!(!h||!h.length)},empty:function(){return h=[],f=0,this},disable:function(){return h=i=b=void 0,this},disabled:function(){return!h},lock:function(){return i=void 0,b||k.disable(),this},locked:function(){return!i},fireWith:function(a,b){return!h||c&&!i||(b=b||[],b=[a,b.slice?b.slice():b],d?i.push(b):j(b)),this},fire:function(){return k.fireWith(this,arguments),this},fired:function(){return!!c}};return k},n.extend({Deferred:function(a){var b=[["resolve","done",n.Callbacks("once memory"),"resolved"],["reject","fail",n.Callbacks("once memory"),"rejected"],["notify","progress",n.Callbacks("memory")]],c="pending",d={state:function(){return c},always:function(){return e.done(arguments).fail(arguments),this},then:function(){var a=arguments;return n.Deferred(function(c){n.each(b,function(b,f){var g=n.isFunction(a[b])&&a[b];e[f[1]](function(){var a=g&&g.apply(this,arguments);a&&n.isFunction(a.promise)?a.promise().done(c.resolve).fail(c.reject).progress(c.notify):c[f[0]+"With"](this===d?c.promise():this,g?[a]:arguments)})}),a=null}).promise()},promise:function(a){return null!=a?n.extend(a,d):d}},e={};return d.pipe=d.then,n.each(b,function(a,f){var g=f[2],h=f[3];d[f[1]]=g.add,h&&g.add(function(){c=h},b[1^a][2].disable,b[2][2].lock),e[f[0]]=function(){return e[f[0]+"With"](this===e?d:this,arguments),this},e[f[0]+"With"]=g.fireWith}),d.promise(e),a&&a.call(e,e),e},when:function(a){var b=0,c=d.call(arguments),e=c.length,f=1!==e||a&&n.isFunction(a.promise)?e:0,g=1===f?a:n.Deferred(),h=function(a,b,c){return function(e){b[a]=this,c[a]=arguments.length>1?d.call(arguments):e,c===i?g.notifyWith(b,c):--f||g.resolveWith(b,c)}},i,j,k;if(e>1)for(i=new Array(e),j=new Array(e),k=new Array(e);e>b;b++)c[b]&&n.isFunction(c[b].promise)?c[b].promise().done(h(b,k,c)).fail(g.reject).progress(h(b,j,i)):--f;return f||g.resolveWith(k,c),g.promise()}});var H;n.fn.ready=function(a){return n.ready.promise().done(a),this},n.extend({isReady:!1,readyWait:1,holdReady:function(a){a?n.readyWait++:n.ready(!0)},ready:function(a){(a===!0?--n.readyWait:n.isReady)||(n.isReady=!0,a!==!0&&--n.readyWait>0||(H.resolveWith(l,[n]),n.fn.triggerHandler&&(n(l).triggerHandler("ready"),n(l).off("ready"))))}});function I(){l.removeEventListener("DOMContentLoaded",I,!1),a.removeEventListener("load",I,!1),n.ready()}n.ready.promise=function(b){return H||(H=n.Deferred(),"complete"===l.readyState?setTimeout(n.ready):(l.addEventListener("DOMContentLoaded",I,!1),a.addEventListener("load",I,!1))),H.promise(b)},n.ready.promise();var J=n.access=function(a,b,c,d,e,f,g){var h=0,i=a.length,j=null==c;if("object"===n.type(c)){e=!0;for(h in c)n.access(a,b,h,c[h],!0,f,g)}else if(void 0!==d&&(e=!0,n.isFunction(d)||(g=!0),j&&(g?(b.call(a,d),b=null):(j=b,b=function(a,b,c){return j.call(n(a),c)})),b))for(;i>h;h++)b(a[h],c,g?d:d.call(a[h],h,b(a[h],c)));return e?a:j?b.call(a):i?b(a[0],c):f};n.acceptData=function(a){return 1===a.nodeType||9===a.nodeType||!+a.nodeType};function K(){Object.defineProperty(this.cache={},0,{get:function(){return{}}}),this.expando=n.expando+K.uid++}K.uid=1,K.accepts=n.acceptData,K.prototype={key:function(a){if(!K.accepts(a))return 0;var b={},c=a[this.expando];if(!c){c=K.uid++;try{b[this.expando]={value:c},Object.defineProperties(a,b)}catch(d){b[this.expando]=c,n.extend(a,b)}}return this.cache[c]||(this.cache[c]={}),c},set:function(a,b,c){var d,e=this.key(a),f=this.cache[e];if("string"==typeof b)f[b]=c;else if(n.isEmptyObject(f))n.extend(this.cache[e],b);else for(d in b)f[d]=b[d];return f},get:function(a,b){var c=this.cache[this.key(a)];return void 0===b?c:c[b]},access:function(a,b,c){var d;return void 0===b||b&&"string"==typeof b&&void 0===c?(d=this.get(a,b),void 0!==d?d:this.get(a,n.camelCase(b))):(this.set(a,b,c),void 0!==c?c:b)},remove:function(a,b){var c,d,e,f=this.key(a),g=this.cache[f];if(void 0===b)this.cache[f]={};else{n.isArray(b)?d=b.concat(b.map(n.camelCase)):(e=n.camelCase(b),b in g?d=[b,e]:(d=e,d=d in g?[d]:d.match(E)||[])),c=d.length;while(c--)delete g[d[c]]}},hasData:function(a){return!n.isEmptyObject(this.cache[a[this.expando]]||{})},discard:function(a){a[this.expando]&&delete this.cache[a[this.expando]]}};var L=new K,M=new K,N=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,O=/([A-Z])/g;function P(a,b,c){var d;if(void 0===c&&1===a.nodeType)if(d="data-"+b.replace(O,"-$1").toLowerCase(),c=a.getAttribute(d),"string"==typeof c){try{c="true"===c?!0:"false"===c?!1:"null"===c?null:+c+""===c?+c:N.test(c)?n.parseJSON(c):c}catch(e){}M.set(a,b,c)}else c=void 0;return c}n.extend({hasData:function(a){return M.hasData(a)||L.hasData(a)},data:function(a,b,c){
return M.access(a,b,c)},removeData:function(a,b){M.remove(a,b)},_data:function(a,b,c){return L.access(a,b,c)},_removeData:function(a,b){L.remove(a,b)}}),n.fn.extend({data:function(a,b){var c,d,e,f=this[0],g=f&&f.attributes;if(void 0===a){if(this.length&&(e=M.get(f),1===f.nodeType&&!L.get(f,"hasDataAttrs"))){c=g.length;while(c--)g[c]&&(d=g[c].name,0===d.indexOf("data-")&&(d=n.camelCase(d.slice(5)),P(f,d,e[d])));L.set(f,"hasDataAttrs",!0)}return e}return"object"==typeof a?this.each(function(){M.set(this,a)}):J(this,function(b){var c,d=n.camelCase(a);if(f&&void 0===b){if(c=M.get(f,a),void 0!==c)return c;if(c=M.get(f,d),void 0!==c)return c;if(c=P(f,d,void 0),void 0!==c)return c}else this.each(function(){var c=M.get(this,d);M.set(this,d,b),-1!==a.indexOf("-")&&void 0!==c&&M.set(this,a,b)})},null,b,arguments.length>1,null,!0)},removeData:function(a){return this.each(function(){M.remove(this,a)})}}),n.extend({queue:function(a,b,c){var d;return a?(b=(b||"fx")+"queue",d=L.get(a,b),c&&(!d||n.isArray(c)?d=L.access(a,b,n.makeArray(c)):d.push(c)),d||[]):void 0},dequeue:function(a,b){b=b||"fx";var c=n.queue(a,b),d=c.length,e=c.shift(),f=n._queueHooks(a,b),g=function(){n.dequeue(a,b)};"inprogress"===e&&(e=c.shift(),d--),e&&("fx"===b&&c.unshift("inprogress"),delete f.stop,e.call(a,g,f)),!d&&f&&f.empty.fire()},_queueHooks:function(a,b){var c=b+"queueHooks";return L.get(a,c)||L.access(a,c,{empty:n.Callbacks("once memory").add(function(){L.remove(a,[b+"queue",c])})})}}),n.fn.extend({queue:function(a,b){var c=2;return"string"!=typeof a&&(b=a,a="fx",c--),arguments.length<c?n.queue(this[0],a):void 0===b?this:this.each(function(){var c=n.queue(this,a,b);n._queueHooks(this,a),"fx"===a&&"inprogress"!==c[0]&&n.dequeue(this,a)})},dequeue:function(a){return this.each(function(){n.dequeue(this,a)})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,b){var c,d=1,e=n.Deferred(),f=this,g=this.length,h=function(){--d||e.resolveWith(f,[f])};"string"!=typeof a&&(b=a,a=void 0),a=a||"fx";while(g--)c=L.get(f[g],a+"queueHooks"),c&&c.empty&&(d++,c.empty.add(h));return h(),e.promise(b)}});var Q=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,R=["Top","Right","Bottom","Left"],S=function(a,b){return a=b||a,"none"===n.css(a,"display")||!n.contains(a.ownerDocument,a)},T=/^(?:checkbox|radio)$/i;!function(){var a=l.createDocumentFragment(),b=a.appendChild(l.createElement("div")),c=l.createElement("input");c.setAttribute("type","radio"),c.setAttribute("checked","checked"),c.setAttribute("name","t"),b.appendChild(c),k.checkClone=b.cloneNode(!0).cloneNode(!0).lastChild.checked,b.innerHTML="<textarea>x</textarea>",k.noCloneChecked=!!b.cloneNode(!0).lastChild.defaultValue}();var U="undefined";k.focusinBubbles="onfocusin"in a;var V=/^key/,W=/^(?:mouse|pointer|contextmenu)|click/,X=/^(?:focusinfocus|focusoutblur)$/,Y=/^([^.]*)(?:\.(.+)|)$/;function Z(){return!0}function $(){return!1}function _(){try{return l.activeElement}catch(a){}}n.event={global:{},add:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,o,p,q,r=L.get(a);if(r){c.handler&&(f=c,c=f.handler,e=f.selector),c.guid||(c.guid=n.guid++),(i=r.events)||(i=r.events={}),(g=r.handle)||(g=r.handle=function(b){return typeof n!==U&&n.event.triggered!==b.type?n.event.dispatch.apply(a,arguments):void 0}),b=(b||"").match(E)||[""],j=b.length;while(j--)h=Y.exec(b[j])||[],o=q=h[1],p=(h[2]||"").split(".").sort(),o&&(l=n.event.special[o]||{},o=(e?l.delegateType:l.bindType)||o,l=n.event.special[o]||{},k=n.extend({type:o,origType:q,data:d,handler:c,guid:c.guid,selector:e,needsContext:e&&n.expr.match.needsContext.test(e),namespace:p.join(".")},f),(m=i[o])||(m=i[o]=[],m.delegateCount=0,l.setup&&l.setup.call(a,d,p,g)!==!1||a.addEventListener&&a.addEventListener(o,g,!1)),l.add&&(l.add.call(a,k),k.handler.guid||(k.handler.guid=c.guid)),e?m.splice(m.delegateCount++,0,k):m.push(k),n.event.global[o]=!0)}},remove:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,o,p,q,r=L.hasData(a)&&L.get(a);if(r&&(i=r.events)){b=(b||"").match(E)||[""],j=b.length;while(j--)if(h=Y.exec(b[j])||[],o=q=h[1],p=(h[2]||"").split(".").sort(),o){l=n.event.special[o]||{},o=(d?l.delegateType:l.bindType)||o,m=i[o]||[],h=h[2]&&new RegExp("(^|\\.)"+p.join("\\.(?:.*\\.|)")+"(\\.|$)"),g=f=m.length;while(f--)k=m[f],!e&&q!==k.origType||c&&c.guid!==k.guid||h&&!h.test(k.namespace)||d&&d!==k.selector&&("**"!==d||!k.selector)||(m.splice(f,1),k.selector&&m.delegateCount--,l.remove&&l.remove.call(a,k));g&&!m.length&&(l.teardown&&l.teardown.call(a,p,r.handle)!==!1||n.removeEvent(a,o,r.handle),delete i[o])}else for(o in i)n.event.remove(a,o+b[j],c,d,!0);n.isEmptyObject(i)&&(delete r.handle,L.remove(a,"events"))}},trigger:function(b,c,d,e){var f,g,h,i,k,m,o,p=[d||l],q=j.call(b,"type")?b.type:b,r=j.call(b,"namespace")?b.namespace.split("."):[];if(g=h=d=d||l,3!==d.nodeType&&8!==d.nodeType&&!X.test(q+n.event.triggered)&&(q.indexOf(".")>=0&&(r=q.split("."),q=r.shift(),r.sort()),k=q.indexOf(":")<0&&"on"+q,b=b[n.expando]?b:new n.Event(q,"object"==typeof b&&b),b.isTrigger=e?2:3,b.namespace=r.join("."),b.namespace_re=b.namespace?new RegExp("(^|\\.)"+r.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,b.result=void 0,b.target||(b.target=d),c=null==c?[b]:n.makeArray(c,[b]),o=n.event.special[q]||{},e||!o.trigger||o.trigger.apply(d,c)!==!1)){if(!e&&!o.noBubble&&!n.isWindow(d)){for(i=o.delegateType||q,X.test(i+q)||(g=g.parentNode);g;g=g.parentNode)p.push(g),h=g;h===(d.ownerDocument||l)&&p.push(h.defaultView||h.parentWindow||a)}f=0;while((g=p[f++])&&!b.isPropagationStopped())b.type=f>1?i:o.bindType||q,m=(L.get(g,"events")||{})[b.type]&&L.get(g,"handle"),m&&m.apply(g,c),m=k&&g[k],m&&m.apply&&n.acceptData(g)&&(b.result=m.apply(g,c),b.result===!1&&b.preventDefault());return b.type=q,e||b.isDefaultPrevented()||o._default&&o._default.apply(p.pop(),c)!==!1||!n.acceptData(d)||k&&n.isFunction(d[q])&&!n.isWindow(d)&&(h=d[k],h&&(d[k]=null),n.event.triggered=q,d[q](),n.event.triggered=void 0,h&&(d[k]=h)),b.result}},dispatch:function(a){a=n.event.fix(a);var b,c,e,f,g,h=[],i=d.call(arguments),j=(L.get(this,"events")||{})[a.type]||[],k=n.event.special[a.type]||{};if(i[0]=a,a.delegateTarget=this,!k.preDispatch||k.preDispatch.call(this,a)!==!1){h=n.event.handlers.call(this,a,j),b=0;while((f=h[b++])&&!a.isPropagationStopped()){a.currentTarget=f.elem,c=0;while((g=f.handlers[c++])&&!a.isImmediatePropagationStopped())(!a.namespace_re||a.namespace_re.test(g.namespace))&&(a.handleObj=g,a.data=g.data,e=((n.event.special[g.origType]||{}).handle||g.handler).apply(f.elem,i),void 0!==e&&(a.result=e)===!1&&(a.preventDefault(),a.stopPropagation()))}return k.postDispatch&&k.postDispatch.call(this,a),a.result}},handlers:function(a,b){var c,d,e,f,g=[],h=b.delegateCount,i=a.target;if(h&&i.nodeType&&(!a.button||"click"!==a.type))for(;i!==this;i=i.parentNode||this)if(i.disabled!==!0||"click"!==a.type){for(d=[],c=0;h>c;c++)f=b[c],e=f.selector+" ",void 0===d[e]&&(d[e]=f.needsContext?n(e,this).index(i)>=0:n.find(e,this,null,[i]).length),d[e]&&d.push(f);d.length&&g.push({elem:i,handlers:d})}return h<b.length&&g.push({elem:this,handlers:b.slice(h)}),g},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(a,b){return null==a.which&&(a.which=null!=b.charCode?b.charCode:b.keyCode),a}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,b){var c,d,e,f=b.button;return null==a.pageX&&null!=b.clientX&&(c=a.target.ownerDocument||l,d=c.documentElement,e=c.body,a.pageX=b.clientX+(d&&d.scrollLeft||e&&e.scrollLeft||0)-(d&&d.clientLeft||e&&e.clientLeft||0),a.pageY=b.clientY+(d&&d.scrollTop||e&&e.scrollTop||0)-(d&&d.clientTop||e&&e.clientTop||0)),a.which||void 0===f||(a.which=1&f?1:2&f?3:4&f?2:0),a}},fix:function(a){if(a[n.expando])return a;var b,c,d,e=a.type,f=a,g=this.fixHooks[e];g||(this.fixHooks[e]=g=W.test(e)?this.mouseHooks:V.test(e)?this.keyHooks:{}),d=g.props?this.props.concat(g.props):this.props,a=new n.Event(f),b=d.length;while(b--)c=d[b],a[c]=f[c];return a.target||(a.target=l),3===a.target.nodeType&&(a.target=a.target.parentNode),g.filter?g.filter(a,f):a},special:{load:{noBubble:!0},focus:{trigger:function(){return this!==_()&&this.focus?(this.focus(),!1):void 0},delegateType:"focusin"},blur:{trigger:function(){return this===_()&&this.blur?(this.blur(),!1):void 0},delegateType:"focusout"},click:{trigger:function(){return"checkbox"===this.type&&this.click&&n.nodeName(this,"input")?(this.click(),!1):void 0},_default:function(a){return n.nodeName(a.target,"a")}},beforeunload:{postDispatch:function(a){void 0!==a.result&&a.originalEvent&&(a.originalEvent.returnValue=a.result)}}},simulate:function(a,b,c,d){var e=n.extend(new n.Event,c,{type:a,isSimulated:!0,originalEvent:{}});d?n.event.trigger(e,null,b):n.event.dispatch.call(b,e),e.isDefaultPrevented()&&c.preventDefault()}},n.removeEvent=function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)},n.Event=function(a,b){return this instanceof n.Event?(a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||void 0===a.defaultPrevented&&a.returnValue===!1?Z:$):this.type=a,b&&n.extend(this,b),this.timeStamp=a&&a.timeStamp||n.now(),void(this[n.expando]=!0)):new n.Event(a,b)},n.Event.prototype={isDefaultPrevented:$,isPropagationStopped:$,isImmediatePropagationStopped:$,preventDefault:function(){var a=this.originalEvent;this.isDefaultPrevented=Z,a&&a.preventDefault&&a.preventDefault()},stopPropagation:function(){var a=this.originalEvent;this.isPropagationStopped=Z,a&&a.stopPropagation&&a.stopPropagation()},stopImmediatePropagation:function(){var a=this.originalEvent;this.isImmediatePropagationStopped=Z,a&&a.stopImmediatePropagation&&a.stopImmediatePropagation(),this.stopPropagation()}},n.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(a,b){n.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c,d=this,e=a.relatedTarget,f=a.handleObj;return(!e||e!==d&&!n.contains(d,e))&&(a.type=f.origType,c=f.handler.apply(this,arguments),a.type=b),c}}}),k.focusinBubbles||n.each({focus:"focusin",blur:"focusout"},function(a,b){var c=function(a){n.event.simulate(b,a.target,n.event.fix(a),!0)};n.event.special[b]={setup:function(){var d=this.ownerDocument||this,e=L.access(d,b);e||d.addEventListener(a,c,!0),L.access(d,b,(e||0)+1)},teardown:function(){var d=this.ownerDocument||this,e=L.access(d,b)-1;e?L.access(d,b,e):(d.removeEventListener(a,c,!0),L.remove(d,b))}}}),n.fn.extend({on:function(a,b,c,d,e){var f,g;if("object"==typeof a){"string"!=typeof b&&(c=c||b,b=void 0);for(g in a)this.on(g,b,c,a[g],e);return this}if(null==c&&null==d?(d=b,c=b=void 0):null==d&&("string"==typeof b?(d=c,c=void 0):(d=c,c=b,b=void 0)),d===!1)d=$;else if(!d)return this;return 1===e&&(f=d,d=function(a){return n().off(a),f.apply(this,arguments)},d.guid=f.guid||(f.guid=n.guid++)),this.each(function(){n.event.add(this,a,d,c,b)})},one:function(a,b,c,d){return this.on(a,b,c,d,1)},off:function(a,b,c){var d,e;if(a&&a.preventDefault&&a.handleObj)return d=a.handleObj,n(a.delegateTarget).off(d.namespace?d.origType+"."+d.namespace:d.origType,d.selector,d.handler),this;if("object"==typeof a){for(e in a)this.off(e,b,a[e]);return this}return(b===!1||"function"==typeof b)&&(c=b,b=void 0),c===!1&&(c=$),this.each(function(){n.event.remove(this,a,c,b)})},trigger:function(a,b){return this.each(function(){n.event.trigger(a,b,this)})},triggerHandler:function(a,b){var c=this[0];return c?n.event.trigger(a,b,c,!0):void 0}});var aa=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,ba=/<([\w:]+)/,ca=/<|&#?\w+;/,da=/<(?:script|style|link)/i,ea=/checked\s*(?:[^=]|=\s*.checked.)/i,fa=/^$|\/(?:java|ecma)script/i,ga=/^true\/(.*)/,ha=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,ia={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ia.optgroup=ia.option,ia.tbody=ia.tfoot=ia.colgroup=ia.caption=ia.thead,ia.th=ia.td;function ja(a,b){return n.nodeName(a,"table")&&n.nodeName(11!==b.nodeType?b:b.firstChild,"tr")?a.getElementsByTagName("tbody")[0]||a.appendChild(a.ownerDocument.createElement("tbody")):a}function ka(a){return a.type=(null!==a.getAttribute("type"))+"/"+a.type,a}function la(a){var b=ga.exec(a.type);return b?a.type=b[1]:a.removeAttribute("type"),a}function ma(a,b){for(var c=0,d=a.length;d>c;c++)L.set(a[c],"globalEval",!b||L.get(b[c],"globalEval"))}function na(a,b){var c,d,e,f,g,h,i,j;if(1===b.nodeType){if(L.hasData(a)&&(f=L.access(a),g=L.set(b,f),j=f.events)){delete g.handle,g.events={};for(e in j)for(c=0,d=j[e].length;d>c;c++)n.event.add(b,e,j[e][c])}M.hasData(a)&&(h=M.access(a),i=n.extend({},h),M.set(b,i))}}function oa(a,b){var c=a.getElementsByTagName?a.getElementsByTagName(b||"*"):a.querySelectorAll?a.querySelectorAll(b||"*"):[];return void 0===b||b&&n.nodeName(a,b)?n.merge([a],c):c}function pa(a,b){var c=b.nodeName.toLowerCase();"input"===c&&T.test(a.type)?b.checked=a.checked:("input"===c||"textarea"===c)&&(b.defaultValue=a.defaultValue)}n.extend({clone:function(a,b,c){var d,e,f,g,h=a.cloneNode(!0),i=n.contains(a.ownerDocument,a);if(!(k.noCloneChecked||1!==a.nodeType&&11!==a.nodeType||n.isXMLDoc(a)))for(g=oa(h),f=oa(a),d=0,e=f.length;e>d;d++)pa(f[d],g[d]);if(b)if(c)for(f=f||oa(a),g=g||oa(h),d=0,e=f.length;e>d;d++)na(f[d],g[d]);else na(a,h);return g=oa(h,"script"),g.length>0&&ma(g,!i&&oa(a,"script")),h},buildFragment:function(a,b,c,d){for(var e,f,g,h,i,j,k=b.createDocumentFragment(),l=[],m=0,o=a.length;o>m;m++)if(e=a[m],e||0===e)if("object"===n.type(e))n.merge(l,e.nodeType?[e]:e);else if(ca.test(e)){f=f||k.appendChild(b.createElement("div")),g=(ba.exec(e)||["",""])[1].toLowerCase(),h=ia[g]||ia._default,f.innerHTML=h[1]+e.replace(aa,"<$1></$2>")+h[2],j=h[0];while(j--)f=f.lastChild;n.merge(l,f.childNodes),f=k.firstChild,f.textContent=""}else l.push(b.createTextNode(e));k.textContent="",m=0;while(e=l[m++])if((!d||-1===n.inArray(e,d))&&(i=n.contains(e.ownerDocument,e),f=oa(k.appendChild(e),"script"),i&&ma(f),c)){j=0;while(e=f[j++])fa.test(e.type||"")&&c.push(e)}return k},cleanData:function(a){for(var b,c,d,e,f=n.event.special,g=0;void 0!==(c=a[g]);g++){if(n.acceptData(c)&&(e=c[L.expando],e&&(b=L.cache[e]))){if(b.events)for(d in b.events)f[d]?n.event.remove(c,d):n.removeEvent(c,d,b.handle);L.cache[e]&&delete L.cache[e]}delete M.cache[c[M.expando]]}}}),n.fn.extend({text:function(a){return J(this,function(a){return void 0===a?n.text(this):this.empty().each(function(){(1===this.nodeType||11===this.nodeType||9===this.nodeType)&&(this.textContent=a)})},null,a,arguments.length)},append:function(){return this.domManip(arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=ja(this,a);b.appendChild(a)}})},prepend:function(){return this.domManip(arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=ja(this,a);b.insertBefore(a,b.firstChild)}})},before:function(){return this.domManip(arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this)})},after:function(){return this.domManip(arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this.nextSibling)})},remove:function(a,b){for(var c,d=a?n.filter(a,this):this,e=0;null!=(c=d[e]);e++)b||1!==c.nodeType||n.cleanData(oa(c)),c.parentNode&&(b&&n.contains(c.ownerDocument,c)&&ma(oa(c,"script")),c.parentNode.removeChild(c));return this},empty:function(){for(var a,b=0;null!=(a=this[b]);b++)1===a.nodeType&&(n.cleanData(oa(a,!1)),a.textContent="");return this},clone:function(a,b){return a=null==a?!1:a,b=null==b?a:b,this.map(function(){return n.clone(this,a,b)})},html:function(a){return J(this,function(a){var b=this[0]||{},c=0,d=this.length;if(void 0===a&&1===b.nodeType)return b.innerHTML;if("string"==typeof a&&!da.test(a)&&!ia[(ba.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(aa,"<$1></$2>");try{for(;d>c;c++)b=this[c]||{},1===b.nodeType&&(n.cleanData(oa(b,!1)),b.innerHTML=a);b=0}catch(e){}}b&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(){var a=arguments[0];return this.domManip(arguments,function(b){a=this.parentNode,n.cleanData(oa(this)),a&&a.replaceChild(b,this)}),a&&(a.length||a.nodeType)?this:this.remove()},detach:function(a){return this.remove(a,!0)},domManip:function(a,b){a=e.apply([],a);var c,d,f,g,h,i,j=0,l=this.length,m=this,o=l-1,p=a[0],q=n.isFunction(p);if(q||l>1&&"string"==typeof p&&!k.checkClone&&ea.test(p))return this.each(function(c){var d=m.eq(c);q&&(a[0]=p.call(this,c,d.html())),d.domManip(a,b)});if(l&&(c=n.buildFragment(a,this[0].ownerDocument,!1,this),d=c.firstChild,1===c.childNodes.length&&(c=d),d)){for(f=n.map(oa(c,"script"),ka),g=f.length;l>j;j++)h=c,j!==o&&(h=n.clone(h,!0,!0),g&&n.merge(f,oa(h,"script"))),b.call(this[j],h,j);if(g)for(i=f[f.length-1].ownerDocument,n.map(f,la),j=0;g>j;j++)h=f[j],fa.test(h.type||"")&&!L.access(h,"globalEval")&&n.contains(i,h)&&(h.src?n._evalUrl&&n._evalUrl(h.src):n.globalEval(h.textContent.replace(ha,"")))}return this}}),n.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){n.fn[a]=function(a){for(var c,d=[],e=n(a),g=e.length-1,h=0;g>=h;h++)c=h===g?this:this.clone(!0),n(e[h])[b](c),f.apply(d,c.get());return this.pushStack(d)}});var qa,ra={};function sa(b,c){var d,e=n(c.createElement(b)).appendTo(c.body),f=a.getDefaultComputedStyle&&(d=a.getDefaultComputedStyle(e[0]))?d.display:n.css(e[0],"display");return e.detach(),f}function ta(a){var b=l,c=ra[a];return c||(c=sa(a,b),"none"!==c&&c||(qa=(qa||n("<iframe frameborder='0' width='0' height='0'/>")).appendTo(b.documentElement),b=qa[0].contentDocument,b.write(),b.close(),c=sa(a,b),qa.detach()),ra[a]=c),c}var ua=/^margin/,va=new RegExp("^("+Q+")(?!px)[a-z%]+$","i"),wa=function(b){return b.ownerDocument.defaultView.opener?b.ownerDocument.defaultView.getComputedStyle(b,null):a.getComputedStyle(b,null)};function xa(a,b,c){var d,e,f,g,h=a.style;return c=c||wa(a),c&&(g=c.getPropertyValue(b)||c[b]),c&&(""!==g||n.contains(a.ownerDocument,a)||(g=n.style(a,b)),va.test(g)&&ua.test(b)&&(d=h.width,e=h.minWidth,f=h.maxWidth,h.minWidth=h.maxWidth=h.width=g,g=c.width,h.width=d,h.minWidth=e,h.maxWidth=f)),void 0!==g?g+"":g}function ya(a,b){return{get:function(){return a()?void delete this.get:(this.get=b).apply(this,arguments)}}}!function(){var b,c,d=l.documentElement,e=l.createElement("div"),f=l.createElement("div");if(f.style){f.style.backgroundClip="content-box",f.cloneNode(!0).style.backgroundClip="",k.clearCloneStyle="content-box"===f.style.backgroundClip,e.style.cssText="border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;position:absolute",e.appendChild(f);function g(){f.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute",f.innerHTML="",d.appendChild(e);var g=a.getComputedStyle(f,null);b="1%"!==g.top,c="4px"===g.width,d.removeChild(e)}a.getComputedStyle&&n.extend(k,{pixelPosition:function(){return g(),b},boxSizingReliable:function(){return null==c&&g(),c},reliableMarginRight:function(){var b,c=f.appendChild(l.createElement("div"));return c.style.cssText=f.style.cssText="-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0",c.style.marginRight=c.style.width="0",f.style.width="1px",d.appendChild(e),b=!parseFloat(a.getComputedStyle(c,null).marginRight),d.removeChild(e),f.removeChild(c),b}})}}(),n.swap=function(a,b,c,d){var e,f,g={};for(f in b)g[f]=a.style[f],a.style[f]=b[f];e=c.apply(a,d||[]);for(f in b)a.style[f]=g[f];return e};var za=/^(none|table(?!-c[ea]).+)/,Aa=new RegExp("^("+Q+")(.*)$","i"),Ba=new RegExp("^([+-])=("+Q+")","i"),Ca={position:"absolute",visibility:"hidden",display:"block"},Da={letterSpacing:"0",fontWeight:"400"},Ea=["Webkit","O","Moz","ms"];function Fa(a,b){if(b in a)return b;var c=b[0].toUpperCase()+b.slice(1),d=b,e=Ea.length;while(e--)if(b=Ea[e]+c,b in a)return b;return d}function Ga(a,b,c){var d=Aa.exec(b);return d?Math.max(0,d[1]-(c||0))+(d[2]||"px"):b}function Ha(a,b,c,d,e){for(var f=c===(d?"border":"content")?4:"width"===b?1:0,g=0;4>f;f+=2)"margin"===c&&(g+=n.css(a,c+R[f],!0,e)),d?("content"===c&&(g-=n.css(a,"padding"+R[f],!0,e)),"margin"!==c&&(g-=n.css(a,"border"+R[f]+"Width",!0,e))):(g+=n.css(a,"padding"+R[f],!0,e),"padding"!==c&&(g+=n.css(a,"border"+R[f]+"Width",!0,e)));return g}function Ia(a,b,c){var d=!0,e="width"===b?a.offsetWidth:a.offsetHeight,f=wa(a),g="border-box"===n.css(a,"boxSizing",!1,f);if(0>=e||null==e){if(e=xa(a,b,f),(0>e||null==e)&&(e=a.style[b]),va.test(e))return e;d=g&&(k.boxSizingReliable()||e===a.style[b]),e=parseFloat(e)||0}return e+Ha(a,b,c||(g?"border":"content"),d,f)+"px"}function Ja(a,b){for(var c,d,e,f=[],g=0,h=a.length;h>g;g++)d=a[g],d.style&&(f[g]=L.get(d,"olddisplay"),c=d.style.display,b?(f[g]||"none"!==c||(d.style.display=""),""===d.style.display&&S(d)&&(f[g]=L.access(d,"olddisplay",ta(d.nodeName)))):(e=S(d),"none"===c&&e||L.set(d,"olddisplay",e?c:n.css(d,"display"))));for(g=0;h>g;g++)d=a[g],d.style&&(b&&"none"!==d.style.display&&""!==d.style.display||(d.style.display=b?f[g]||"":"none"));return a}n.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=xa(a,"opacity");return""===c?"1":c}}}},cssNumber:{columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(a,b,c,d){if(a&&3!==a.nodeType&&8!==a.nodeType&&a.style){var e,f,g,h=n.camelCase(b),i=a.style;return b=n.cssProps[h]||(n.cssProps[h]=Fa(i,h)),g=n.cssHooks[b]||n.cssHooks[h],void 0===c?g&&"get"in g&&void 0!==(e=g.get(a,!1,d))?e:i[b]:(f=typeof c,"string"===f&&(e=Ba.exec(c))&&(c=(e[1]+1)*e[2]+parseFloat(n.css(a,b)),f="number"),null!=c&&c===c&&("number"!==f||n.cssNumber[h]||(c+="px"),k.clearCloneStyle||""!==c||0!==b.indexOf("background")||(i[b]="inherit"),g&&"set"in g&&void 0===(c=g.set(a,c,d))||(i[b]=c)),void 0)}},css:function(a,b,c,d){var e,f,g,h=n.camelCase(b);return b=n.cssProps[h]||(n.cssProps[h]=Fa(a.style,h)),g=n.cssHooks[b]||n.cssHooks[h],g&&"get"in g&&(e=g.get(a,!0,c)),void 0===e&&(e=xa(a,b,d)),"normal"===e&&b in Da&&(e=Da[b]),""===c||c?(f=parseFloat(e),c===!0||n.isNumeric(f)?f||0:e):e}}),n.each(["height","width"],function(a,b){n.cssHooks[b]={get:function(a,c,d){return c?za.test(n.css(a,"display"))&&0===a.offsetWidth?n.swap(a,Ca,function(){return Ia(a,b,d)}):Ia(a,b,d):void 0},set:function(a,c,d){var e=d&&wa(a);return Ga(a,c,d?Ha(a,b,d,"border-box"===n.css(a,"boxSizing",!1,e),e):0)}}}),n.cssHooks.marginRight=ya(k.reliableMarginRight,function(a,b){return b?n.swap(a,{display:"inline-block"},xa,[a,"marginRight"]):void 0}),n.each({margin:"",padding:"",border:"Width"},function(a,b){n.cssHooks[a+b]={expand:function(c){for(var d=0,e={},f="string"==typeof c?c.split(" "):[c];4>d;d++)e[a+R[d]+b]=f[d]||f[d-2]||f[0];return e}},ua.test(a)||(n.cssHooks[a+b].set=Ga)}),n.fn.extend({css:function(a,b){return J(this,function(a,b,c){var d,e,f={},g=0;if(n.isArray(b)){for(d=wa(a),e=b.length;e>g;g++)f[b[g]]=n.css(a,b[g],!1,d);return f}return void 0!==c?n.style(a,b,c):n.css(a,b)},a,b,arguments.length>1)},show:function(){return Ja(this,!0)},hide:function(){return Ja(this)},toggle:function(a){return"boolean"==typeof a?a?this.show():this.hide():this.each(function(){S(this)?n(this).show():n(this).hide()})}});function Ka(a,b,c,d,e){return new Ka.prototype.init(a,b,c,d,e)}n.Tween=Ka,Ka.prototype={constructor:Ka,init:function(a,b,c,d,e,f){this.elem=a,this.prop=c,this.easing=e||"swing",this.options=b,this.start=this.now=this.cur(),this.end=d,this.unit=f||(n.cssNumber[c]?"":"px")},cur:function(){var a=Ka.propHooks[this.prop];return a&&a.get?a.get(this):Ka.propHooks._default.get(this)},run:function(a){var b,c=Ka.propHooks[this.prop];return this.options.duration?this.pos=b=n.easing[this.easing](a,this.options.duration*a,0,1,this.options.duration):this.pos=b=a,this.now=(this.end-this.start)*b+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),c&&c.set?c.set(this):Ka.propHooks._default.set(this),this}},Ka.prototype.init.prototype=Ka.prototype,Ka.propHooks={_default:{get:function(a){var b;return null==a.elem[a.prop]||a.elem.style&&null!=a.elem.style[a.prop]?(b=n.css(a.elem,a.prop,""),b&&"auto"!==b?b:0):a.elem[a.prop]},set:function(a){n.fx.step[a.prop]?n.fx.step[a.prop](a):a.elem.style&&(null!=a.elem.style[n.cssProps[a.prop]]||n.cssHooks[a.prop])?n.style(a.elem,a.prop,a.now+a.unit):a.elem[a.prop]=a.now}}},Ka.propHooks.scrollTop=Ka.propHooks.scrollLeft={set:function(a){a.elem.nodeType&&a.elem.parentNode&&(a.elem[a.prop]=a.now)}},n.easing={linear:function(a){return a},swing:function(a){return.5-Math.cos(a*Math.PI)/2}},n.fx=Ka.prototype.init,n.fx.step={};var La,Ma,Na=/^(?:toggle|show|hide)$/,Oa=new RegExp("^(?:([+-])=|)("+Q+")([a-z%]*)$","i"),Pa=/queueHooks$/,Qa=[Va],Ra={"*":[function(a,b){var c=this.createTween(a,b),d=c.cur(),e=Oa.exec(b),f=e&&e[3]||(n.cssNumber[a]?"":"px"),g=(n.cssNumber[a]||"px"!==f&&+d)&&Oa.exec(n.css(c.elem,a)),h=1,i=20;if(g&&g[3]!==f){f=f||g[3],e=e||[],g=+d||1;do h=h||".5",g/=h,n.style(c.elem,a,g+f);while(h!==(h=c.cur()/d)&&1!==h&&--i)}return e&&(g=c.start=+g||+d||0,c.unit=f,c.end=e[1]?g+(e[1]+1)*e[2]:+e[2]),c}]};function Sa(){return setTimeout(function(){La=void 0}),La=n.now()}function Ta(a,b){var c,d=0,e={height:a};for(b=b?1:0;4>d;d+=2-b)c=R[d],e["margin"+c]=e["padding"+c]=a;return b&&(e.opacity=e.width=a),e}function Ua(a,b,c){for(var d,e=(Ra[b]||[]).concat(Ra["*"]),f=0,g=e.length;g>f;f++)if(d=e[f].call(c,b,a))return d}function Va(a,b,c){var d,e,f,g,h,i,j,k,l=this,m={},o=a.style,p=a.nodeType&&S(a),q=L.get(a,"fxshow");c.queue||(h=n._queueHooks(a,"fx"),null==h.unqueued&&(h.unqueued=0,i=h.empty.fire,h.empty.fire=function(){h.unqueued||i()}),h.unqueued++,l.always(function(){l.always(function(){h.unqueued--,n.queue(a,"fx").length||h.empty.fire()})})),1===a.nodeType&&("height"in b||"width"in b)&&(c.overflow=[o.overflow,o.overflowX,o.overflowY],j=n.css(a,"display"),k="none"===j?L.get(a,"olddisplay")||ta(a.nodeName):j,"inline"===k&&"none"===n.css(a,"float")&&(o.display="inline-block")),c.overflow&&(o.overflow="hidden",l.always(function(){o.overflow=c.overflow[0],o.overflowX=c.overflow[1],o.overflowY=c.overflow[2]}));for(d in b)if(e=b[d],Na.exec(e)){if(delete b[d],f=f||"toggle"===e,e===(p?"hide":"show")){if("show"!==e||!q||void 0===q[d])continue;p=!0}m[d]=q&&q[d]||n.style(a,d)}else j=void 0;if(n.isEmptyObject(m))"inline"===("none"===j?ta(a.nodeName):j)&&(o.display=j);else{q?"hidden"in q&&(p=q.hidden):q=L.access(a,"fxshow",{}),f&&(q.hidden=!p),p?n(a).show():l.done(function(){n(a).hide()}),l.done(function(){var b;L.remove(a,"fxshow");for(b in m)n.style(a,b,m[b])});for(d in m)g=Ua(p?q[d]:0,d,l),d in q||(q[d]=g.start,p&&(g.end=g.start,g.start="width"===d||"height"===d?1:0))}}function Wa(a,b){var c,d,e,f,g;for(c in a)if(d=n.camelCase(c),e=b[d],f=a[c],n.isArray(f)&&(e=f[1],f=a[c]=f[0]),c!==d&&(a[d]=f,delete a[c]),g=n.cssHooks[d],g&&"expand"in g){f=g.expand(f),delete a[d];for(c in f)c in a||(a[c]=f[c],b[c]=e)}else b[d]=e}function Xa(a,b,c){var d,e,f=0,g=Qa.length,h=n.Deferred().always(function(){delete i.elem}),i=function(){if(e)return!1;for(var b=La||Sa(),c=Math.max(0,j.startTime+j.duration-b),d=c/j.duration||0,f=1-d,g=0,i=j.tweens.length;i>g;g++)j.tweens[g].run(f);return h.notifyWith(a,[j,f,c]),1>f&&i?c:(h.resolveWith(a,[j]),!1)},j=h.promise({elem:a,props:n.extend({},b),opts:n.extend(!0,{specialEasing:{}},c),originalProperties:b,originalOptions:c,startTime:La||Sa(),duration:c.duration,tweens:[],createTween:function(b,c){var d=n.Tween(a,j.opts,b,c,j.opts.specialEasing[b]||j.opts.easing);return j.tweens.push(d),d},stop:function(b){var c=0,d=b?j.tweens.length:0;if(e)return this;for(e=!0;d>c;c++)j.tweens[c].run(1);return b?h.resolveWith(a,[j,b]):h.rejectWith(a,[j,b]),this}}),k=j.props;for(Wa(k,j.opts.specialEasing);g>f;f++)if(d=Qa[f].call(j,a,k,j.opts))return d;return n.map(k,Ua,j),n.isFunction(j.opts.start)&&j.opts.start.call(a,j),n.fx.timer(n.extend(i,{elem:a,anim:j,queue:j.opts.queue})),j.progress(j.opts.progress).done(j.opts.done,j.opts.complete).fail(j.opts.fail).always(j.opts.always)}n.Animation=n.extend(Xa,{tweener:function(a,b){n.isFunction(a)?(b=a,a=["*"]):a=a.split(" ");for(var c,d=0,e=a.length;e>d;d++)c=a[d],Ra[c]=Ra[c]||[],Ra[c].unshift(b)},prefilter:function(a,b){b?Qa.unshift(a):Qa.push(a)}}),n.speed=function(a,b,c){var d=a&&"object"==typeof a?n.extend({},a):{complete:c||!c&&b||n.isFunction(a)&&a,duration:a,easing:c&&b||b&&!n.isFunction(b)&&b};return d.duration=n.fx.off?0:"number"==typeof d.duration?d.duration:d.duration in n.fx.speeds?n.fx.speeds[d.duration]:n.fx.speeds._default,(null==d.queue||d.queue===!0)&&(d.queue="fx"),d.old=d.complete,d.complete=function(){n.isFunction(d.old)&&d.old.call(this),d.queue&&n.dequeue(this,d.queue)},d},n.fn.extend({fadeTo:function(a,b,c,d){return this.filter(S).css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){var e=n.isEmptyObject(a),f=n.speed(b,c,d),g=function(){var b=Xa(this,n.extend({},a),f);(e||L.get(this,"finish"))&&b.stop(!0)};return g.finish=g,e||f.queue===!1?this.each(g):this.queue(f.queue,g)},stop:function(a,b,c){var d=function(a){var b=a.stop;delete a.stop,b(c)};return"string"!=typeof a&&(c=b,b=a,a=void 0),b&&a!==!1&&this.queue(a||"fx",[]),this.each(function(){var b=!0,e=null!=a&&a+"queueHooks",f=n.timers,g=L.get(this);if(e)g[e]&&g[e].stop&&d(g[e]);else for(e in g)g[e]&&g[e].stop&&Pa.test(e)&&d(g[e]);for(e=f.length;e--;)f[e].elem!==this||null!=a&&f[e].queue!==a||(f[e].anim.stop(c),b=!1,f.splice(e,1));(b||!c)&&n.dequeue(this,a)})},finish:function(a){return a!==!1&&(a=a||"fx"),this.each(function(){var b,c=L.get(this),d=c[a+"queue"],e=c[a+"queueHooks"],f=n.timers,g=d?d.length:0;for(c.finish=!0,n.queue(this,a,[]),e&&e.stop&&e.stop.call(this,!0),b=f.length;b--;)f[b].elem===this&&f[b].queue===a&&(f[b].anim.stop(!0),f.splice(b,1));for(b=0;g>b;b++)d[b]&&d[b].finish&&d[b].finish.call(this);delete c.finish})}}),n.each(["toggle","show","hide"],function(a,b){var c=n.fn[b];n.fn[b]=function(a,d,e){return null==a||"boolean"==typeof a?c.apply(this,arguments):this.animate(Ta(b,!0),a,d,e)}}),n.each({slideDown:Ta("show"),slideUp:Ta("hide"),slideToggle:Ta("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){n.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),n.timers=[],n.fx.tick=function(){var a,b=0,c=n.timers;for(La=n.now();b<c.length;b++)a=c[b],a()||c[b]!==a||c.splice(b--,1);c.length||n.fx.stop(),La=void 0},n.fx.timer=function(a){n.timers.push(a),a()?n.fx.start():n.timers.pop()},n.fx.interval=13,n.fx.start=function(){Ma||(Ma=setInterval(n.fx.tick,n.fx.interval))},n.fx.stop=function(){clearInterval(Ma),Ma=null},n.fx.speeds={slow:600,fast:200,_default:400},n.fn.delay=function(a,b){return a=n.fx?n.fx.speeds[a]||a:a,b=b||"fx",this.queue(b,function(b,c){var d=setTimeout(b,a);c.stop=function(){clearTimeout(d)}})},function(){var a=l.createElement("input"),b=l.createElement("select"),c=b.appendChild(l.createElement("option"));a.type="checkbox",k.checkOn=""!==a.value,k.optSelected=c.selected,b.disabled=!0,k.optDisabled=!c.disabled,a=l.createElement("input"),a.value="t",a.type="radio",k.radioValue="t"===a.value}();var Ya,Za,$a=n.expr.attrHandle;n.fn.extend({attr:function(a,b){return J(this,n.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){n.removeAttr(this,a)})}}),n.extend({attr:function(a,b,c){var d,e,f=a.nodeType;if(a&&3!==f&&8!==f&&2!==f)return typeof a.getAttribute===U?n.prop(a,b,c):(1===f&&n.isXMLDoc(a)||(b=b.toLowerCase(),d=n.attrHooks[b]||(n.expr.match.bool.test(b)?Za:Ya)),
void 0===c?d&&"get"in d&&null!==(e=d.get(a,b))?e:(e=n.find.attr(a,b),null==e?void 0:e):null!==c?d&&"set"in d&&void 0!==(e=d.set(a,c,b))?e:(a.setAttribute(b,c+""),c):void n.removeAttr(a,b))},removeAttr:function(a,b){var c,d,e=0,f=b&&b.match(E);if(f&&1===a.nodeType)while(c=f[e++])d=n.propFix[c]||c,n.expr.match.bool.test(c)&&(a[d]=!1),a.removeAttribute(c)},attrHooks:{type:{set:function(a,b){if(!k.radioValue&&"radio"===b&&n.nodeName(a,"input")){var c=a.value;return a.setAttribute("type",b),c&&(a.value=c),b}}}}}),Za={set:function(a,b,c){return b===!1?n.removeAttr(a,c):a.setAttribute(c,c),c}},n.each(n.expr.match.bool.source.match(/\w+/g),function(a,b){var c=$a[b]||n.find.attr;$a[b]=function(a,b,d){var e,f;return d||(f=$a[b],$a[b]=e,e=null!=c(a,b,d)?b.toLowerCase():null,$a[b]=f),e}});var _a=/^(?:input|select|textarea|button)$/i;n.fn.extend({prop:function(a,b){return J(this,n.prop,a,b,arguments.length>1)},removeProp:function(a){return this.each(function(){delete this[n.propFix[a]||a]})}}),n.extend({propFix:{"for":"htmlFor","class":"className"},prop:function(a,b,c){var d,e,f,g=a.nodeType;if(a&&3!==g&&8!==g&&2!==g)return f=1!==g||!n.isXMLDoc(a),f&&(b=n.propFix[b]||b,e=n.propHooks[b]),void 0!==c?e&&"set"in e&&void 0!==(d=e.set(a,c,b))?d:a[b]=c:e&&"get"in e&&null!==(d=e.get(a,b))?d:a[b]},propHooks:{tabIndex:{get:function(a){return a.hasAttribute("tabindex")||_a.test(a.nodeName)||a.href?a.tabIndex:-1}}}}),k.optSelected||(n.propHooks.selected={get:function(a){var b=a.parentNode;return b&&b.parentNode&&b.parentNode.selectedIndex,null}}),n.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){n.propFix[this.toLowerCase()]=this});var ab=/[\t\r\n\f]/g;n.fn.extend({addClass:function(a){var b,c,d,e,f,g,h="string"==typeof a&&a,i=0,j=this.length;if(n.isFunction(a))return this.each(function(b){n(this).addClass(a.call(this,b,this.className))});if(h)for(b=(a||"").match(E)||[];j>i;i++)if(c=this[i],d=1===c.nodeType&&(c.className?(" "+c.className+" ").replace(ab," "):" ")){f=0;while(e=b[f++])d.indexOf(" "+e+" ")<0&&(d+=e+" ");g=n.trim(d),c.className!==g&&(c.className=g)}return this},removeClass:function(a){var b,c,d,e,f,g,h=0===arguments.length||"string"==typeof a&&a,i=0,j=this.length;if(n.isFunction(a))return this.each(function(b){n(this).removeClass(a.call(this,b,this.className))});if(h)for(b=(a||"").match(E)||[];j>i;i++)if(c=this[i],d=1===c.nodeType&&(c.className?(" "+c.className+" ").replace(ab," "):"")){f=0;while(e=b[f++])while(d.indexOf(" "+e+" ")>=0)d=d.replace(" "+e+" "," ");g=a?n.trim(d):"",c.className!==g&&(c.className=g)}return this},toggleClass:function(a,b){var c=typeof a;return"boolean"==typeof b&&"string"===c?b?this.addClass(a):this.removeClass(a):this.each(n.isFunction(a)?function(c){n(this).toggleClass(a.call(this,c,this.className,b),b)}:function(){if("string"===c){var b,d=0,e=n(this),f=a.match(E)||[];while(b=f[d++])e.hasClass(b)?e.removeClass(b):e.addClass(b)}else(c===U||"boolean"===c)&&(this.className&&L.set(this,"__className__",this.className),this.className=this.className||a===!1?"":L.get(this,"__className__")||"")})},hasClass:function(a){for(var b=" "+a+" ",c=0,d=this.length;d>c;c++)if(1===this[c].nodeType&&(" "+this[c].className+" ").replace(ab," ").indexOf(b)>=0)return!0;return!1}});var bb=/\r/g;n.fn.extend({val:function(a){var b,c,d,e=this[0];{if(arguments.length)return d=n.isFunction(a),this.each(function(c){var e;1===this.nodeType&&(e=d?a.call(this,c,n(this).val()):a,null==e?e="":"number"==typeof e?e+="":n.isArray(e)&&(e=n.map(e,function(a){return null==a?"":a+""})),b=n.valHooks[this.type]||n.valHooks[this.nodeName.toLowerCase()],b&&"set"in b&&void 0!==b.set(this,e,"value")||(this.value=e))});if(e)return b=n.valHooks[e.type]||n.valHooks[e.nodeName.toLowerCase()],b&&"get"in b&&void 0!==(c=b.get(e,"value"))?c:(c=e.value,"string"==typeof c?c.replace(bb,""):null==c?"":c)}}}),n.extend({valHooks:{option:{get:function(a){var b=n.find.attr(a,"value");return null!=b?b:n.trim(n.text(a))}},select:{get:function(a){for(var b,c,d=a.options,e=a.selectedIndex,f="select-one"===a.type||0>e,g=f?null:[],h=f?e+1:d.length,i=0>e?h:f?e:0;h>i;i++)if(c=d[i],!(!c.selected&&i!==e||(k.optDisabled?c.disabled:null!==c.getAttribute("disabled"))||c.parentNode.disabled&&n.nodeName(c.parentNode,"optgroup"))){if(b=n(c).val(),f)return b;g.push(b)}return g},set:function(a,b){var c,d,e=a.options,f=n.makeArray(b),g=e.length;while(g--)d=e[g],(d.selected=n.inArray(d.value,f)>=0)&&(c=!0);return c||(a.selectedIndex=-1),f}}}}),n.each(["radio","checkbox"],function(){n.valHooks[this]={set:function(a,b){return n.isArray(b)?a.checked=n.inArray(n(a).val(),b)>=0:void 0}},k.checkOn||(n.valHooks[this].get=function(a){return null===a.getAttribute("value")?"on":a.value})}),n.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(a,b){n.fn[b]=function(a,c){return arguments.length>0?this.on(b,null,a,c):this.trigger(b)}}),n.fn.extend({hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)},bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return 1===arguments.length?this.off(a,"**"):this.off(b,a||"**",c)}});var cb=n.now(),db=/\?/;n.parseJSON=function(a){return JSON.parse(a+"")},n.parseXML=function(a){var b,c;if(!a||"string"!=typeof a)return null;try{c=new DOMParser,b=c.parseFromString(a,"text/xml")}catch(d){b=void 0}return(!b||b.getElementsByTagName("parsererror").length)&&n.error("Invalid XML: "+a),b};var eb=/#.*$/,fb=/([?&])_=[^&]*/,gb=/^(.*?):[ \t]*([^\r\n]*)$/gm,hb=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,ib=/^(?:GET|HEAD)$/,jb=/^\/\//,kb=/^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,lb={},mb={},nb="*/".concat("*"),ob=a.location.href,pb=kb.exec(ob.toLowerCase())||[];function qb(a){return function(b,c){"string"!=typeof b&&(c=b,b="*");var d,e=0,f=b.toLowerCase().match(E)||[];if(n.isFunction(c))while(d=f[e++])"+"===d[0]?(d=d.slice(1)||"*",(a[d]=a[d]||[]).unshift(c)):(a[d]=a[d]||[]).push(c)}}function rb(a,b,c,d){var e={},f=a===mb;function g(h){var i;return e[h]=!0,n.each(a[h]||[],function(a,h){var j=h(b,c,d);return"string"!=typeof j||f||e[j]?f?!(i=j):void 0:(b.dataTypes.unshift(j),g(j),!1)}),i}return g(b.dataTypes[0])||!e["*"]&&g("*")}function sb(a,b){var c,d,e=n.ajaxSettings.flatOptions||{};for(c in b)void 0!==b[c]&&((e[c]?a:d||(d={}))[c]=b[c]);return d&&n.extend(!0,a,d),a}function tb(a,b,c){var d,e,f,g,h=a.contents,i=a.dataTypes;while("*"===i[0])i.shift(),void 0===d&&(d=a.mimeType||b.getResponseHeader("Content-Type"));if(d)for(e in h)if(h[e]&&h[e].test(d)){i.unshift(e);break}if(i[0]in c)f=i[0];else{for(e in c){if(!i[0]||a.converters[e+" "+i[0]]){f=e;break}g||(g=e)}f=f||g}return f?(f!==i[0]&&i.unshift(f),c[f]):void 0}function ub(a,b,c,d){var e,f,g,h,i,j={},k=a.dataTypes.slice();if(k[1])for(g in a.converters)j[g.toLowerCase()]=a.converters[g];f=k.shift();while(f)if(a.responseFields[f]&&(c[a.responseFields[f]]=b),!i&&d&&a.dataFilter&&(b=a.dataFilter(b,a.dataType)),i=f,f=k.shift())if("*"===f)f=i;else if("*"!==i&&i!==f){if(g=j[i+" "+f]||j["* "+f],!g)for(e in j)if(h=e.split(" "),h[1]===f&&(g=j[i+" "+h[0]]||j["* "+h[0]])){g===!0?g=j[e]:j[e]!==!0&&(f=h[0],k.unshift(h[1]));break}if(g!==!0)if(g&&a["throws"])b=g(b);else try{b=g(b)}catch(l){return{state:"parsererror",error:g?l:"No conversion from "+i+" to "+f}}}return{state:"success",data:b}}n.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:ob,type:"GET",isLocal:hb.test(pb[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":nb,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":n.parseJSON,"text xml":n.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(a,b){return b?sb(sb(a,n.ajaxSettings),b):sb(n.ajaxSettings,a)},ajaxPrefilter:qb(lb),ajaxTransport:qb(mb),ajax:function(a,b){"object"==typeof a&&(b=a,a=void 0),b=b||{};var c,d,e,f,g,h,i,j,k=n.ajaxSetup({},b),l=k.context||k,m=k.context&&(l.nodeType||l.jquery)?n(l):n.event,o=n.Deferred(),p=n.Callbacks("once memory"),q=k.statusCode||{},r={},s={},t=0,u="canceled",v={readyState:0,getResponseHeader:function(a){var b;if(2===t){if(!f){f={};while(b=gb.exec(e))f[b[1].toLowerCase()]=b[2]}b=f[a.toLowerCase()]}return null==b?null:b},getAllResponseHeaders:function(){return 2===t?e:null},setRequestHeader:function(a,b){var c=a.toLowerCase();return t||(a=s[c]=s[c]||a,r[a]=b),this},overrideMimeType:function(a){return t||(k.mimeType=a),this},statusCode:function(a){var b;if(a)if(2>t)for(b in a)q[b]=[q[b],a[b]];else v.always(a[v.status]);return this},abort:function(a){var b=a||u;return c&&c.abort(b),x(0,b),this}};if(o.promise(v).complete=p.add,v.success=v.done,v.error=v.fail,k.url=((a||k.url||ob)+"").replace(eb,"").replace(jb,pb[1]+"//"),k.type=b.method||b.type||k.method||k.type,k.dataTypes=n.trim(k.dataType||"*").toLowerCase().match(E)||[""],null==k.crossDomain&&(h=kb.exec(k.url.toLowerCase()),k.crossDomain=!(!h||h[1]===pb[1]&&h[2]===pb[2]&&(h[3]||("http:"===h[1]?"80":"443"))===(pb[3]||("http:"===pb[1]?"80":"443")))),k.data&&k.processData&&"string"!=typeof k.data&&(k.data=n.param(k.data,k.traditional)),rb(lb,k,b,v),2===t)return v;i=n.event&&k.global,i&&0===n.active++&&n.event.trigger("ajaxStart"),k.type=k.type.toUpperCase(),k.hasContent=!ib.test(k.type),d=k.url,k.hasContent||(k.data&&(d=k.url+=(db.test(d)?"&":"?")+k.data,delete k.data),k.cache===!1&&(k.url=fb.test(d)?d.replace(fb,"$1_="+cb++):d+(db.test(d)?"&":"?")+"_="+cb++)),k.ifModified&&(n.lastModified[d]&&v.setRequestHeader("If-Modified-Since",n.lastModified[d]),n.etag[d]&&v.setRequestHeader("If-None-Match",n.etag[d])),(k.data&&k.hasContent&&k.contentType!==!1||b.contentType)&&v.setRequestHeader("Content-Type",k.contentType),v.setRequestHeader("Accept",k.dataTypes[0]&&k.accepts[k.dataTypes[0]]?k.accepts[k.dataTypes[0]]+("*"!==k.dataTypes[0]?", "+nb+"; q=0.01":""):k.accepts["*"]);for(j in k.headers)v.setRequestHeader(j,k.headers[j]);if(k.beforeSend&&(k.beforeSend.call(l,v,k)===!1||2===t))return v.abort();u="abort";for(j in{success:1,error:1,complete:1})v[j](k[j]);if(c=rb(mb,k,b,v)){v.readyState=1,i&&m.trigger("ajaxSend",[v,k]),k.async&&k.timeout>0&&(g=setTimeout(function(){v.abort("timeout")},k.timeout));try{t=1,c.send(r,x)}catch(w){if(!(2>t))throw w;x(-1,w)}}else x(-1,"No Transport");function x(a,b,f,h){var j,r,s,u,w,x=b;2!==t&&(t=2,g&&clearTimeout(g),c=void 0,e=h||"",v.readyState=a>0?4:0,j=a>=200&&300>a||304===a,f&&(u=tb(k,v,f)),u=ub(k,u,v,j),j?(k.ifModified&&(w=v.getResponseHeader("Last-Modified"),w&&(n.lastModified[d]=w),w=v.getResponseHeader("etag"),w&&(n.etag[d]=w)),204===a||"HEAD"===k.type?x="nocontent":304===a?x="notmodified":(x=u.state,r=u.data,s=u.error,j=!s)):(s=x,(a||!x)&&(x="error",0>a&&(a=0))),v.status=a,v.statusText=(b||x)+"",j?o.resolveWith(l,[r,x,v]):o.rejectWith(l,[v,x,s]),v.statusCode(q),q=void 0,i&&m.trigger(j?"ajaxSuccess":"ajaxError",[v,k,j?r:s]),p.fireWith(l,[v,x]),i&&(m.trigger("ajaxComplete",[v,k]),--n.active||n.event.trigger("ajaxStop")))}return v},getJSON:function(a,b,c){return n.get(a,b,c,"json")},getScript:function(a,b){return n.get(a,void 0,b,"script")}}),n.each(["get","post"],function(a,b){n[b]=function(a,c,d,e){return n.isFunction(c)&&(e=e||d,d=c,c=void 0),n.ajax({url:a,type:b,dataType:e,data:c,success:d})}}),n._evalUrl=function(a){return n.ajax({url:a,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})},n.fn.extend({wrapAll:function(a){var b;return n.isFunction(a)?this.each(function(b){n(this).wrapAll(a.call(this,b))}):(this[0]&&(b=n(a,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstElementChild)a=a.firstElementChild;return a}).append(this)),this)},wrapInner:function(a){return this.each(n.isFunction(a)?function(b){n(this).wrapInner(a.call(this,b))}:function(){var b=n(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=n.isFunction(a);return this.each(function(c){n(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(){return this.parent().each(function(){n.nodeName(this,"body")||n(this).replaceWith(this.childNodes)}).end()}}),n.expr.filters.hidden=function(a){return a.offsetWidth<=0&&a.offsetHeight<=0},n.expr.filters.visible=function(a){return!n.expr.filters.hidden(a)};var vb=/%20/g,wb=/\[\]$/,xb=/\r?\n/g,yb=/^(?:submit|button|image|reset|file)$/i,zb=/^(?:input|select|textarea|keygen)/i;function Ab(a,b,c,d){var e;if(n.isArray(b))n.each(b,function(b,e){c||wb.test(a)?d(a,e):Ab(a+"["+("object"==typeof e?b:"")+"]",e,c,d)});else if(c||"object"!==n.type(b))d(a,b);else for(e in b)Ab(a+"["+e+"]",b[e],c,d)}n.param=function(a,b){var c,d=[],e=function(a,b){b=n.isFunction(b)?b():null==b?"":b,d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};if(void 0===b&&(b=n.ajaxSettings&&n.ajaxSettings.traditional),n.isArray(a)||a.jquery&&!n.isPlainObject(a))n.each(a,function(){e(this.name,this.value)});else for(c in a)Ab(c,a[c],b,e);return d.join("&").replace(vb,"+")},n.fn.extend({serialize:function(){return n.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var a=n.prop(this,"elements");return a?n.makeArray(a):this}).filter(function(){var a=this.type;return this.name&&!n(this).is(":disabled")&&zb.test(this.nodeName)&&!yb.test(a)&&(this.checked||!T.test(a))}).map(function(a,b){var c=n(this).val();return null==c?null:n.isArray(c)?n.map(c,function(a){return{name:b.name,value:a.replace(xb,"\r\n")}}):{name:b.name,value:c.replace(xb,"\r\n")}}).get()}}),n.ajaxSettings.xhr=function(){try{return new XMLHttpRequest}catch(a){}};var Bb=0,Cb={},Db={0:200,1223:204},Eb=n.ajaxSettings.xhr();a.attachEvent&&a.attachEvent("onunload",function(){for(var a in Cb)Cb[a]()}),k.cors=!!Eb&&"withCredentials"in Eb,k.ajax=Eb=!!Eb,n.ajaxTransport(function(a){var b;return k.cors||Eb&&!a.crossDomain?{send:function(c,d){var e,f=a.xhr(),g=++Bb;if(f.open(a.type,a.url,a.async,a.username,a.password),a.xhrFields)for(e in a.xhrFields)f[e]=a.xhrFields[e];a.mimeType&&f.overrideMimeType&&f.overrideMimeType(a.mimeType),a.crossDomain||c["X-Requested-With"]||(c["X-Requested-With"]="XMLHttpRequest");for(e in c)f.setRequestHeader(e,c[e]);b=function(a){return function(){b&&(delete Cb[g],b=f.onload=f.onerror=null,"abort"===a?f.abort():"error"===a?d(f.status,f.statusText):d(Db[f.status]||f.status,f.statusText,"string"==typeof f.responseText?{text:f.responseText}:void 0,f.getAllResponseHeaders()))}},f.onload=b(),f.onerror=b("error"),b=Cb[g]=b("abort");try{f.send(a.hasContent&&a.data||null)}catch(h){if(b)throw h}},abort:function(){b&&b()}}:void 0}),n.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(a){return n.globalEval(a),a}}}),n.ajaxPrefilter("script",function(a){void 0===a.cache&&(a.cache=!1),a.crossDomain&&(a.type="GET")}),n.ajaxTransport("script",function(a){if(a.crossDomain){var b,c;return{send:function(d,e){b=n("<script>").prop({async:!0,charset:a.scriptCharset,src:a.url}).on("load error",c=function(a){b.remove(),c=null,a&&e("error"===a.type?404:200,a.type)}),l.head.appendChild(b[0])},abort:function(){c&&c()}}}});var Fb=[],Gb=/(=)\?(?=&|$)|\?\?/;n.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var a=Fb.pop()||n.expando+"_"+cb++;return this[a]=!0,a}}),n.ajaxPrefilter("json jsonp",function(b,c,d){var e,f,g,h=b.jsonp!==!1&&(Gb.test(b.url)?"url":"string"==typeof b.data&&!(b.contentType||"").indexOf("application/x-www-form-urlencoded")&&Gb.test(b.data)&&"data");return h||"jsonp"===b.dataTypes[0]?(e=b.jsonpCallback=n.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,h?b[h]=b[h].replace(Gb,"$1"+e):b.jsonp!==!1&&(b.url+=(db.test(b.url)?"&":"?")+b.jsonp+"="+e),b.converters["script json"]=function(){return g||n.error(e+" was not called"),g[0]},b.dataTypes[0]="json",f=a[e],a[e]=function(){g=arguments},d.always(function(){a[e]=f,b[e]&&(b.jsonpCallback=c.jsonpCallback,Fb.push(e)),g&&n.isFunction(f)&&f(g[0]),g=f=void 0}),"script"):void 0}),n.parseHTML=function(a,b,c){if(!a||"string"!=typeof a)return null;"boolean"==typeof b&&(c=b,b=!1),b=b||l;var d=v.exec(a),e=!c&&[];return d?[b.createElement(d[1])]:(d=n.buildFragment([a],b,e),e&&e.length&&n(e).remove(),n.merge([],d.childNodes))};var Hb=n.fn.load;n.fn.load=function(a,b,c){if("string"!=typeof a&&Hb)return Hb.apply(this,arguments);var d,e,f,g=this,h=a.indexOf(" ");return h>=0&&(d=n.trim(a.slice(h)),a=a.slice(0,h)),n.isFunction(b)?(c=b,b=void 0):b&&"object"==typeof b&&(e="POST"),g.length>0&&n.ajax({url:a,type:e,dataType:"html",data:b}).done(function(a){f=arguments,g.html(d?n("<div>").append(n.parseHTML(a)).find(d):a)}).complete(c&&function(a,b){g.each(c,f||[a.responseText,b,a])}),this},n.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(a,b){n.fn[b]=function(a){return this.on(b,a)}}),n.expr.filters.animated=function(a){return n.grep(n.timers,function(b){return a===b.elem}).length};var Ib=a.document.documentElement;function Jb(a){return n.isWindow(a)?a:9===a.nodeType&&a.defaultView}n.offset={setOffset:function(a,b,c){var d,e,f,g,h,i,j,k=n.css(a,"position"),l=n(a),m={};"static"===k&&(a.style.position="relative"),h=l.offset(),f=n.css(a,"top"),i=n.css(a,"left"),j=("absolute"===k||"fixed"===k)&&(f+i).indexOf("auto")>-1,j?(d=l.position(),g=d.top,e=d.left):(g=parseFloat(f)||0,e=parseFloat(i)||0),n.isFunction(b)&&(b=b.call(a,c,h)),null!=b.top&&(m.top=b.top-h.top+g),null!=b.left&&(m.left=b.left-h.left+e),"using"in b?b.using.call(a,m):l.css(m)}},n.fn.extend({offset:function(a){if(arguments.length)return void 0===a?this:this.each(function(b){n.offset.setOffset(this,a,b)});var b,c,d=this[0],e={top:0,left:0},f=d&&d.ownerDocument;if(f)return b=f.documentElement,n.contains(b,d)?(typeof d.getBoundingClientRect!==U&&(e=d.getBoundingClientRect()),c=Jb(f),{top:e.top+c.pageYOffset-b.clientTop,left:e.left+c.pageXOffset-b.clientLeft}):e},position:function(){if(this[0]){var a,b,c=this[0],d={top:0,left:0};return"fixed"===n.css(c,"position")?b=c.getBoundingClientRect():(a=this.offsetParent(),b=this.offset(),n.nodeName(a[0],"html")||(d=a.offset()),d.top+=n.css(a[0],"borderTopWidth",!0),d.left+=n.css(a[0],"borderLeftWidth",!0)),{top:b.top-d.top-n.css(c,"marginTop",!0),left:b.left-d.left-n.css(c,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||Ib;while(a&&!n.nodeName(a,"html")&&"static"===n.css(a,"position"))a=a.offsetParent;return a||Ib})}}),n.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(b,c){var d="pageYOffset"===c;n.fn[b]=function(e){return J(this,function(b,e,f){var g=Jb(b);return void 0===f?g?g[c]:b[e]:void(g?g.scrollTo(d?a.pageXOffset:f,d?f:a.pageYOffset):b[e]=f)},b,e,arguments.length,null)}}),n.each(["top","left"],function(a,b){n.cssHooks[b]=ya(k.pixelPosition,function(a,c){return c?(c=xa(a,b),va.test(c)?n(a).position()[b]+"px":c):void 0})}),n.each({Height:"height",Width:"width"},function(a,b){n.each({padding:"inner"+a,content:b,"":"outer"+a},function(c,d){n.fn[d]=function(d,e){var f=arguments.length&&(c||"boolean"!=typeof d),g=c||(d===!0||e===!0?"margin":"border");return J(this,function(b,c,d){var e;return n.isWindow(b)?b.document.documentElement["client"+a]:9===b.nodeType?(e=b.documentElement,Math.max(b.body["scroll"+a],e["scroll"+a],b.body["offset"+a],e["offset"+a],e["client"+a])):void 0===d?n.css(b,c,g):n.style(b,c,d,g)},b,f?d:void 0,f,null)}})}),n.fn.size=function(){return this.length},n.fn.andSelf=n.fn.addBack,"function"==typeof define&&define.amd&&define("jquery",[],function(){return n});var Kb=a.jQuery,Lb=a.$;return n.noConflict=function(b){return a.$===n&&(a.$=Lb),b&&a.jQuery===n&&(a.jQuery=Kb),n},typeof b===U&&(a.jQuery=a.$=n),n});
//# sourceMappingURL=jquery.min.map
/* WebUploader 0.1.5 */!function(a,b){var c,d={},e=function(a,b){var c,d,e;if("string"==typeof a)return h(a);for(c=[],d=a.length,e=0;d>e;e++)c.push(h(a[e]));return b.apply(null,c)},f=function(a,b,c){2===arguments.length&&(c=b,b=null),e(b||[],function(){g(a,c,arguments)})},g=function(a,b,c){var f,g={exports:b};"function"==typeof b&&(c.length||(c=[e,g.exports,g]),f=b.apply(null,c),void 0!==f&&(g.exports=f)),d[a]=g.exports},h=function(b){var c=d[b]||a[b];if(!c)throw new Error("`"+b+"` is undefined");return c},i=function(a){var b,c,e,f,g,h;h=function(a){return a&&a.charAt(0).toUpperCase()+a.substr(1)};for(b in d)if(c=a,d.hasOwnProperty(b)){for(e=b.split("/"),g=h(e.pop());f=h(e.shift());)c[f]=c[f]||{},c=c[f];c[g]=d[b]}return a},j=function(c){return a.__dollar=c,i(b(a,f,e))};"object"==typeof module&&"object"==typeof module.exports?module.exports=j():"function"==typeof define&&define.amd?define(["jquery"],j):(c=a.WebUploader,a.WebUploader=j(),a.WebUploader.noConflict=function(){a.WebUploader=c})}(window,function(a,b,c){return b("dollar-third",[],function(){var b=a.__dollar||a.jQuery||a.Zepto;if(!b)throw new Error("jQuery or Zepto not found!");return b}),b("dollar",["dollar-third"],function(a){return a}),b("promise-third",["dollar"],function(a){return{Deferred:a.Deferred,when:a.when,isPromise:function(a){return a&&"function"==typeof a.then}}}),b("promise",["promise-third"],function(a){return a}),b("base",["dollar","promise"],function(b,c){function d(a){return function(){return h.apply(a,arguments)}}function e(a,b){return function(){return a.apply(b,arguments)}}function f(a){var b;return Object.create?Object.create(a):(b=function(){},b.prototype=a,new b)}var g=function(){},h=Function.call;return{version:"0.1.5",$:b,Deferred:c.Deferred,isPromise:c.isPromise,when:c.when,browser:function(a){var b={},c=a.match(/WebKit\/([\d.]+)/),d=a.match(/Chrome\/([\d.]+)/)||a.match(/CriOS\/([\d.]+)/),e=a.match(/MSIE\s([\d\.]+)/)||a.match(/(?:trident)(?:.*rv:([\w.]+))?/i),f=a.match(/Firefox\/([\d.]+)/),g=a.match(/Safari\/([\d.]+)/),h=a.match(/OPR\/([\d.]+)/);return c&&(b.webkit=parseFloat(c[1])),d&&(b.chrome=parseFloat(d[1])),e&&(b.ie=parseFloat(e[1])),f&&(b.firefox=parseFloat(f[1])),g&&(b.safari=parseFloat(g[1])),h&&(b.opera=parseFloat(h[1])),b}(navigator.userAgent),os:function(a){var b={},c=a.match(/(?:Android);?[\s\/]+([\d.]+)?/),d=a.match(/(?:iPad|iPod|iPhone).*OS\s([\d_]+)/);return c&&(b.android=parseFloat(c[1])),d&&(b.ios=parseFloat(d[1].replace(/_/g,"."))),b}(navigator.userAgent),inherits:function(a,c,d){var e;return"function"==typeof c?(e=c,c=null):e=c&&c.hasOwnProperty("constructor")?c.constructor:function(){return a.apply(this,arguments)},b.extend(!0,e,a,d||{}),e.__super__=a.prototype,e.prototype=f(a.prototype),c&&b.extend(!0,e.prototype,c),e},noop:g,bindFn:e,log:function(){return a.console?e(console.log,console):g}(),nextTick:function(){return function(a){setTimeout(a,1)}}(),slice:d([].slice),guid:function(){var a=0;return function(b){for(var c=(+new Date).toString(32),d=0;5>d;d++)c+=Math.floor(65535*Math.random()).toString(32);return(b||"wu_")+c+(a++).toString(32)}}(),formatSize:function(a,b,c){var d;for(c=c||["B","K","M","G","TB"];(d=c.shift())&&a>1024;)a/=1024;return("B"===d?a:a.toFixed(b||2))+d}}}),b("mediator",["base"],function(a){function b(a,b,c,d){return f.grep(a,function(a){return!(!a||b&&a.e!==b||c&&a.cb!==c&&a.cb._cb!==c||d&&a.ctx!==d)})}function c(a,b,c){f.each((a||"").split(h),function(a,d){c(d,b)})}function d(a,b){for(var c,d=!1,e=-1,f=a.length;++e<f;)if(c=a[e],c.cb.apply(c.ctx2,b)===!1){d=!0;break}return!d}var e,f=a.$,g=[].slice,h=/\s+/;return e={on:function(a,b,d){var e,f=this;return b?(e=this._events||(this._events=[]),c(a,b,function(a,b){var c={e:a};c.cb=b,c.ctx=d,c.ctx2=d||f,c.id=e.length,e.push(c)}),this):this},once:function(a,b,d){var e=this;return b?(c(a,b,function(a,b){var c=function(){return e.off(a,c),b.apply(d||e,arguments)};c._cb=b,e.on(a,c,d)}),e):e},off:function(a,d,e){var g=this._events;return g?a||d||e?(c(a,d,function(a,c){f.each(b(g,a,c,e),function(){delete g[this.id]})}),this):(this._events=[],this):this},trigger:function(a){var c,e,f;return this._events&&a?(c=g.call(arguments,1),e=b(this._events,a),f=b(this._events,"all"),d(e,c)&&d(f,arguments)):this}},f.extend({installTo:function(a){return f.extend(a,e)}},e)}),b("uploader",["base","mediator"],function(a,b){function c(a){this.options=d.extend(!0,{},c.options,a),this._init(this.options)}var d=a.$;return c.options={},b.installTo(c.prototype),d.each({upload:"start-upload",stop:"stop-upload",getFile:"get-file",getFiles:"get-files",addFile:"add-file",addFiles:"add-file",sort:"sort-files",removeFile:"remove-file",cancelFile:"cancel-file",skipFile:"skip-file",retry:"retry",isInProgress:"is-in-progress",makeThumb:"make-thumb",md5File:"md5-file",getDimension:"get-dimension",addButton:"add-btn",predictRuntimeType:"predict-runtime-type",refresh:"refresh",disable:"disable",enable:"enable",reset:"reset"},function(a,b){c.prototype[a]=function(){return this.request(b,arguments)}}),d.extend(c.prototype,{state:"pending",_init:function(a){var b=this;b.request("init",a,function(){b.state="ready",b.trigger("ready")})},option:function(a,b){var c=this.options;return arguments.length>1?(d.isPlainObject(b)&&d.isPlainObject(c[a])?d.extend(c[a],b):c[a]=b,void 0):a?c[a]:c},getStats:function(){var a=this.request("get-stats");return a?{successNum:a.numOfSuccess,progressNum:a.numOfProgress,cancelNum:a.numOfCancel,invalidNum:a.numOfInvalid,uploadFailNum:a.numOfUploadFailed,queueNum:a.numOfQueue,interruptNum:a.numofInterrupt}:{}},trigger:function(a){var c=[].slice.call(arguments,1),e=this.options,f="on"+a.substring(0,1).toUpperCase()+a.substring(1);return b.trigger.apply(this,arguments)===!1||d.isFunction(e[f])&&e[f].apply(this,c)===!1||d.isFunction(this[f])&&this[f].apply(this,c)===!1||b.trigger.apply(b,[this,a].concat(c))===!1?!1:!0},destroy:function(){this.request("destroy",arguments),this.off()},request:a.noop}),a.create=c.create=function(a){return new c(a)},a.Uploader=c,c}),b("runtime/runtime",["base","mediator"],function(a,b){function c(b){this.options=d.extend({container:document.body},b),this.uid=a.guid("rt_")}var d=a.$,e={},f=function(a){for(var b in a)if(a.hasOwnProperty(b))return b;return null};return d.extend(c.prototype,{getContainer:function(){var a,b,c=this.options;return this._container?this._container:(a=d(c.container||document.body),b=d(document.createElement("div")),b.attr("id","rt_"+this.uid),b.css({position:"absolute",top:"0px",left:"0px",width:"100%",height:"100%",overflow:"hidden"}),a.append(b),a.addClass("webuploader-container"),this._container=b,this._parent=a,b)},init:a.noop,exec:a.noop,destroy:function(){this._container&&this._container.remove(),this._parent&&this._parent.removeClass("webuploader-container"),this.off()}}),c.orders="html5,flash",c.addRuntime=function(a,b){e[a]=b},c.hasRuntime=function(a){return!!(a?e[a]:f(e))},c.create=function(a,b){var g,h;if(b=b||c.orders,d.each(b.split(/\s*,\s*/g),function(){return e[this]?(g=this,!1):void 0}),g=g||f(e),!g)throw new Error("Runtime Error");return h=new e[g](a)},b.installTo(c.prototype),c}),b("runtime/client",["base","mediator","runtime/runtime"],function(a,b,c){function d(b,d){var f,g=a.Deferred();this.uid=a.guid("client_"),this.runtimeReady=function(a){return g.done(a)},this.connectRuntime=function(b,h){if(f)throw new Error("already connected!");return g.done(h),"string"==typeof b&&e.get(b)&&(f=e.get(b)),f=f||e.get(null,d),f?(a.$.extend(f.options,b),f.__promise.then(g.resolve),f.__client++):(f=c.create(b,b.runtimeOrder),f.__promise=g.promise(),f.once("ready",g.resolve),f.init(),e.add(f),f.__client=1),d&&(f.__standalone=d),f},this.getRuntime=function(){return f},this.disconnectRuntime=function(){f&&(f.__client--,f.__client<=0&&(e.remove(f),delete f.__promise,f.destroy()),f=null)},this.exec=function(){if(f){var c=a.slice(arguments);return b&&c.unshift(b),f.exec.apply(this,c)}},this.getRuid=function(){return f&&f.uid},this.destroy=function(a){return function(){a&&a.apply(this,arguments),this.trigger("destroy"),this.off(),this.exec("destroy"),this.disconnectRuntime()}}(this.destroy)}var e;return e=function(){var a={};return{add:function(b){a[b.uid]=b},get:function(b,c){var d;if(b)return a[b];for(d in a)if(!c||!a[d].__standalone)return a[d];return null},remove:function(b){delete a[b.uid]}}}(),b.installTo(d.prototype),d}),b("lib/dnd",["base","mediator","runtime/client"],function(a,b,c){function d(a){a=this.options=e.extend({},d.options,a),a.container=e(a.container),a.container.length&&c.call(this,"DragAndDrop")}var e=a.$;return d.options={accept:null,disableGlobalDnd:!1},a.inherits(c,{constructor:d,init:function(){var a=this;a.connectRuntime(a.options,function(){a.exec("init"),a.trigger("ready")})}}),b.installTo(d.prototype),d}),b("widgets/widget",["base","uploader"],function(a,b){function c(a){if(!a)return!1;var b=a.length,c=e.type(a);return 1===a.nodeType&&b?!0:"array"===c||"function"!==c&&"string"!==c&&(0===b||"number"==typeof b&&b>0&&b-1 in a)}function d(a){this.owner=a,this.options=a.options}var e=a.$,f=b.prototype._init,g=b.prototype.destroy,h={},i=[];return e.extend(d.prototype,{init:a.noop,invoke:function(a,b){var c=this.responseMap;return c&&a in c&&c[a]in this&&e.isFunction(this[c[a]])?this[c[a]].apply(this,b):h},request:function(){return this.owner.request.apply(this.owner,arguments)}}),e.extend(b.prototype,{_init:function(){var a=this,b=a._widgets=[],c=a.options.disableWidgets||"";return e.each(i,function(d,e){(!c||!~c.indexOf(e._name))&&b.push(new e(a))}),f.apply(a,arguments)},request:function(b,d,e){var f,g,i,j,k=0,l=this._widgets,m=l&&l.length,n=[],o=[];for(d=c(d)?d:[d];m>k;k++)f=l[k],g=f.invoke(b,d),g!==h&&(a.isPromise(g)?o.push(g):n.push(g));return e||o.length?(i=a.when.apply(a,o),j=i.pipe?"pipe":"then",i[j](function(){var b=a.Deferred(),c=arguments;return 1===c.length&&(c=c[0]),setTimeout(function(){b.resolve(c)},1),b.promise()})[e?j:"done"](e||a.noop)):n[0]},destroy:function(){g.apply(this,arguments),this._widgets=null}}),b.register=d.register=function(b,c){var f,g={init:"init",destroy:"destroy",name:"anonymous"};return 1===arguments.length?(c=b,e.each(c,function(a){return"_"===a[0]||"name"===a?("name"===a&&(g.name=c.name),void 0):(g[a.replace(/[A-Z]/g,"-$&").toLowerCase()]=a,void 0)})):g=e.extend(g,b),c.responseMap=g,f=a.inherits(d,c),f._name=g.name,i.push(f),f},b.unRegister=d.unRegister=function(a){if(a&&"anonymous"!==a)for(var b=i.length;b--;)i[b]._name===a&&i.splice(b,1)},d}),b("widgets/filednd",["base","uploader","lib/dnd","widgets/widget"],function(a,b,c){var d=a.$;return b.options.dnd="",b.register({name:"dnd",init:function(b){if(b.dnd&&"html5"===this.request("predict-runtime-type")){var e,f=this,g=a.Deferred(),h=d.extend({},{disableGlobalDnd:b.disableGlobalDnd,container:b.dnd,accept:b.accept});return this.dnd=e=new c(h),e.once("ready",g.resolve),e.on("drop",function(a){f.request("add-file",[a])}),e.on("accept",function(a){return f.owner.trigger("dndAccept",a)}),e.init(),g.promise()}},destroy:function(){this.dnd&&this.dnd.destroy()}})}),b("lib/filepaste",["base","mediator","runtime/client"],function(a,b,c){function d(a){a=this.options=e.extend({},a),a.container=e(a.container||document.body),c.call(this,"FilePaste")}var e=a.$;return a.inherits(c,{constructor:d,init:function(){var a=this;a.connectRuntime(a.options,function(){a.exec("init"),a.trigger("ready")})}}),b.installTo(d.prototype),d}),b("widgets/filepaste",["base","uploader","lib/filepaste","widgets/widget"],function(a,b,c){var d=a.$;return b.register({name:"paste",init:function(b){if(b.paste&&"html5"===this.request("predict-runtime-type")){var e,f=this,g=a.Deferred(),h=d.extend({},{container:b.paste,accept:b.accept});return this.paste=e=new c(h),e.once("ready",g.resolve),e.on("paste",function(a){f.owner.request("add-file",[a])}),e.init(),g.promise()}},destroy:function(){this.paste&&this.paste.destroy()}})}),b("lib/blob",["base","runtime/client"],function(a,b){function c(a,c){var d=this;d.source=c,d.ruid=a,this.size=c.size||0,this.type=!c.type&&this.ext&&~"jpg,jpeg,png,gif,bmp".indexOf(this.ext)?"image/"+("jpg"===this.ext?"jpeg":this.ext):c.type||"application/octet-stream",b.call(d,"Blob"),this.uid=c.uid||this.uid,a&&d.connectRuntime(a)}return a.inherits(b,{constructor:c,slice:function(a,b){return this.exec("slice",a,b)},getSource:function(){return this.source}}),c}),b("lib/file",["base","lib/blob"],function(a,b){function c(a,c){var f;this.name=c.name||"untitled"+d++,f=e.exec(c.name)?RegExp.$1.toLowerCase():"",!f&&c.type&&(f=/\/(jpg|jpeg|png|gif|bmp)$/i.exec(c.type)?RegExp.$1.toLowerCase():"",this.name+="."+f),this.ext=f,this.lastModifiedDate=c.lastModifiedDate||(new Date).toLocaleString(),b.apply(this,arguments)}var d=1,e=/\.([^.]+)$/;return a.inherits(b,c)}),b("lib/filepicker",["base","runtime/client","lib/file"],function(b,c,d){function e(a){if(a=this.options=f.extend({},e.options,a),a.container=f(a.id),!a.container.length)throw new Error("按钮指定错误");a.innerHTML=a.innerHTML||a.label||a.container.html()||"",a.button=f(a.button||document.createElement("div")),a.button.html(a.innerHTML),a.container.html(a.button),c.call(this,"FilePicker",!0)}var f=b.$;return e.options={button:null,container:null,label:null,innerHTML:null,multiple:!0,accept:null,name:"file"},b.inherits(c,{constructor:e,init:function(){var c=this,e=c.options,g=e.button;g.addClass("webuploader-pick"),c.on("all",function(a){var b;switch(a){case"mouseenter":g.addClass("webuploader-pick-hover");break;case"mouseleave":g.removeClass("webuploader-pick-hover");break;case"change":b=c.exec("getFiles"),c.trigger("select",f.map(b,function(a){return a=new d(c.getRuid(),a),a._refer=e.container,a}),e.container)}}),c.connectRuntime(e,function(){c.refresh(),c.exec("init",e),c.trigger("ready")}),this._resizeHandler=b.bindFn(this.refresh,this),f(a).on("resize",this._resizeHandler)},refresh:function(){var a=this.getRuntime().getContainer(),b=this.options.button,c=b.outerWidth?b.outerWidth():b.width(),d=b.outerHeight?b.outerHeight():b.height(),e=b.offset();c&&d&&a.css({bottom:"auto",right:"auto",width:c+"px",height:d+"px"}).offset(e)},enable:function(){var a=this.options.button;a.removeClass("webuploader-pick-disable"),this.refresh()},disable:function(){var a=this.options.button;this.getRuntime().getContainer().css({top:"-99999px"}),a.addClass("webuploader-pick-disable")},destroy:function(){var b=this.options.button;f(a).off("resize",this._resizeHandler),b.removeClass("webuploader-pick-disable webuploader-pick-hover webuploader-pick")}}),e}),b("widgets/filepicker",["base","uploader","lib/filepicker","widgets/widget"],function(a,b,c){var d=a.$;return d.extend(b.options,{pick:null,accept:null}),b.register({name:"picker",init:function(a){return this.pickers=[],a.pick&&this.addBtn(a.pick)},refresh:function(){d.each(this.pickers,function(){this.refresh()})},addBtn:function(b){var e=this,f=e.options,g=f.accept,h=[];if(b)return d.isPlainObject(b)||(b={id:b}),d(b.id).each(function(){var i,j,k;k=a.Deferred(),i=d.extend({},b,{accept:d.isPlainObject(g)?[g]:g,swf:f.swf,runtimeOrder:f.runtimeOrder,id:this}),j=new c(i),j.once("ready",k.resolve),j.on("select",function(a){e.owner.request("add-file",[a])}),j.init(),e.pickers.push(j),h.push(k.promise())}),a.when.apply(a,h)},disable:function(){d.each(this.pickers,function(){this.disable()})},enable:function(){d.each(this.pickers,function(){this.enable()})},destroy:function(){d.each(this.pickers,function(){this.destroy()}),this.pickers=null}})}),b("lib/image",["base","runtime/client","lib/blob"],function(a,b,c){function d(a){this.options=e.extend({},d.options,a),b.call(this,"Image"),this.on("load",function(){this._info=this.exec("info"),this._meta=this.exec("meta")})}var e=a.$;return d.options={quality:90,crop:!1,preserveHeaders:!1,allowMagnify:!1},a.inherits(b,{constructor:d,info:function(a){return a?(this._info=a,this):this._info},meta:function(a){return a?(this._meta=a,this):this._meta},loadFromBlob:function(a){var b=this,c=a.getRuid();this.connectRuntime(c,function(){b.exec("init",b.options),b.exec("loadFromBlob",a)})},resize:function(){var b=a.slice(arguments);return this.exec.apply(this,["resize"].concat(b))},crop:function(){var b=a.slice(arguments);return this.exec.apply(this,["crop"].concat(b))},getAsDataUrl:function(a){return this.exec("getAsDataUrl",a)},getAsBlob:function(a){var b=this.exec("getAsBlob",a);return new c(this.getRuid(),b)}}),d}),b("widgets/image",["base","uploader","lib/image","widgets/widget"],function(a,b,c){var d,e=a.$;return d=function(a){var b=0,c=[],d=function(){for(var d;c.length&&a>b;)d=c.shift(),b+=d[0],d[1]()};return function(a,e,f){c.push([e,f]),a.once("destroy",function(){b-=e,setTimeout(d,1)}),setTimeout(d,1)}}(5242880),e.extend(b.options,{thumb:{width:110,height:110,quality:70,allowMagnify:!0,crop:!0,preserveHeaders:!1,type:"image/jpeg"},compress:{width:1600,height:1600,quality:90,allowMagnify:!1,crop:!1,preserveHeaders:!0}}),b.register({name:"image",makeThumb:function(a,b,f,g){var h,i;return a=this.request("get-file",a),a.type.match(/^image/)?(h=e.extend({},this.options.thumb),e.isPlainObject(f)&&(h=e.extend(h,f),f=null),f=f||h.width,g=g||h.height,i=new c(h),i.once("load",function(){a._info=a._info||i.info(),a._meta=a._meta||i.meta(),1>=f&&f>0&&(f=a._info.width*f),1>=g&&g>0&&(g=a._info.height*g),i.resize(f,g)}),i.once("complete",function(){b(!1,i.getAsDataUrl(h.type)),i.destroy()}),i.once("error",function(a){b(a||!0),i.destroy()}),d(i,a.source.size,function(){a._info&&i.info(a._info),a._meta&&i.meta(a._meta),i.loadFromBlob(a.source)}),void 0):(b(!0),void 0)},beforeSendFile:function(b){var d,f,g=this.options.compress||this.options.resize,h=g&&g.compressSize||0,i=g&&g.noCompressIfLarger||!1;return b=this.request("get-file",b),!g||!~"image/jpeg,image/jpg".indexOf(b.type)||b.size<h||b._compressed?void 0:(g=e.extend({},g),f=a.Deferred(),d=new c(g),f.always(function(){d.destroy(),d=null}),d.once("error",f.reject),d.once("load",function(){var a=g.width,c=g.height;b._info=b._info||d.info(),b._meta=b._meta||d.meta(),1>=a&&a>0&&(a=b._info.width*a),1>=c&&c>0&&(c=b._info.height*c),d.resize(a,c)}),d.once("complete",function(){var a,c;try{a=d.getAsBlob(g.type),c=b.size,(!i||a.size<c)&&(b.source=a,b.size=a.size,b.trigger("resize",a.size,c)),b._compressed=!0,f.resolve()}catch(e){f.resolve()}}),b._info&&d.info(b._info),b._meta&&d.meta(b._meta),d.loadFromBlob(b.source),f.promise())}})}),b("file",["base","mediator"],function(a,b){function c(){return f+g++}function d(a){this.name=a.name||"Untitled",this.size=a.size||0,this.type=a.type||"application/octet-stream",this.lastModifiedDate=a.lastModifiedDate||1*new Date,this.id=c(),this.ext=h.exec(this.name)?RegExp.$1:"",this.statusText="",i[this.id]=d.Status.INITED,this.source=a,this.loaded=0,this.on("error",function(a){this.setStatus(d.Status.ERROR,a)})}var e=a.$,f="WU_FILE_",g=0,h=/\.([^.]+)$/,i={};return e.extend(d.prototype,{setStatus:function(a,b){var c=i[this.id];"undefined"!=typeof b&&(this.statusText=b),a!==c&&(i[this.id]=a,this.trigger("statuschange",a,c))},getStatus:function(){return i[this.id]},getSource:function(){return this.source},destroy:function(){this.off(),delete i[this.id]}}),b.installTo(d.prototype),d.Status={INITED:"inited",QUEUED:"queued",PROGRESS:"progress",ERROR:"error",COMPLETE:"complete",CANCELLED:"cancelled",INTERRUPT:"interrupt",INVALID:"invalid"},d}),b("queue",["base","mediator","file"],function(a,b,c){function d(){this.stats={numOfQueue:0,numOfSuccess:0,numOfCancel:0,numOfProgress:0,numOfUploadFailed:0,numOfInvalid:0,numofDeleted:0,numofInterrupt:0},this._queue=[],this._map={}}var e=a.$,f=c.Status;return e.extend(d.prototype,{append:function(a){return this._queue.push(a),this._fileAdded(a),this},prepend:function(a){return this._queue.unshift(a),this._fileAdded(a),this},getFile:function(a){return"string"!=typeof a?a:this._map[a]},fetch:function(a){var b,c,d=this._queue.length;for(a=a||f.QUEUED,b=0;d>b;b++)if(c=this._queue[b],a===c.getStatus())return c;return null},sort:function(a){"function"==typeof a&&this._queue.sort(a)},getFiles:function(){for(var a,b=[].slice.call(arguments,0),c=[],d=0,f=this._queue.length;f>d;d++)a=this._queue[d],(!b.length||~e.inArray(a.getStatus(),b))&&c.push(a);return c},removeFile:function(a){var b=this._map[a.id];b&&(delete this._map[a.id],a.destroy(),this.stats.numofDeleted++)},_fileAdded:function(a){var b=this,c=this._map[a.id];c||(this._map[a.id]=a,a.on("statuschange",function(a,c){b._onFileStatusChange(a,c)}))},_onFileStatusChange:function(a,b){var c=this.stats;switch(b){case f.PROGRESS:c.numOfProgress--;break;case f.QUEUED:c.numOfQueue--;break;case f.ERROR:c.numOfUploadFailed--;break;case f.INVALID:c.numOfInvalid--;break;case f.INTERRUPT:c.numofInterrupt--}switch(a){case f.QUEUED:c.numOfQueue++;break;case f.PROGRESS:c.numOfProgress++;break;case f.ERROR:c.numOfUploadFailed++;break;case f.COMPLETE:c.numOfSuccess++;break;case f.CANCELLED:c.numOfCancel++;break;case f.INVALID:c.numOfInvalid++;break;case f.INTERRUPT:c.numofInterrupt++}}}),b.installTo(d.prototype),d}),b("widgets/queue",["base","uploader","queue","file","lib/file","runtime/client","widgets/widget"],function(a,b,c,d,e,f){var g=a.$,h=/\.\w+$/,i=d.Status;return b.register({name:"queue",init:function(b){var d,e,h,i,j,k,l,m=this;if(g.isPlainObject(b.accept)&&(b.accept=[b.accept]),b.accept){for(j=[],h=0,e=b.accept.length;e>h;h++)i=b.accept[h].extensions,i&&j.push(i);j.length&&(k="\\."+j.join(",").replace(/,/g,"$|\\.").replace(/\*/g,".*")+"$"),m.accept=new RegExp(k,"i")}return m.queue=new c,m.stats=m.queue.stats,"html5"===this.request("predict-runtime-type")?(d=a.Deferred(),this.placeholder=l=new f("Placeholder"),l.connectRuntime({runtimeOrder:"html5"},function(){m._ruid=l.getRuid(),d.resolve()}),d.promise()):void 0},_wrapFile:function(a){if(!(a instanceof d)){if(!(a instanceof e)){if(!this._ruid)throw new Error("Can't add external files.");a=new e(this._ruid,a)}a=new d(a)}return a},acceptFile:function(a){var b=!a||!a.size||this.accept&&h.exec(a.name)&&!this.accept.test(a.name);return!b},_addFile:function(a){var b=this;return a=b._wrapFile(a),b.owner.trigger("beforeFileQueued",a)?b.acceptFile(a)?(b.queue.append(a),b.owner.trigger("fileQueued",a),a):(b.owner.trigger("error","Q_TYPE_DENIED",a),void 0):void 0},getFile:function(a){return this.queue.getFile(a)},addFile:function(a){var b=this;a.length||(a=[a]),a=g.map(a,function(a){return b._addFile(a)}),b.owner.trigger("filesQueued",a),b.options.auto&&setTimeout(function(){b.request("start-upload")},20)},getStats:function(){return this.stats},removeFile:function(a,b){var c=this;a=a.id?a:c.queue.getFile(a),this.request("cancel-file",a),b&&this.queue.removeFile(a)},getFiles:function(){return this.queue.getFiles.apply(this.queue,arguments)},fetchFile:function(){return this.queue.fetch.apply(this.queue,arguments)},retry:function(a,b){var c,d,e,f=this;if(a)return a=a.id?a:f.queue.getFile(a),a.setStatus(i.QUEUED),b||f.request("start-upload"),void 0;for(c=f.queue.getFiles(i.ERROR),d=0,e=c.length;e>d;d++)a=c[d],a.setStatus(i.QUEUED);f.request("start-upload")},sortFiles:function(){return this.queue.sort.apply(this.queue,arguments)},reset:function(){this.owner.trigger("reset"),this.queue=new c,this.stats=this.queue.stats},destroy:function(){this.reset(),this.placeholder&&this.placeholder.destroy()}})}),b("widgets/runtime",["uploader","runtime/runtime","widgets/widget"],function(a,b){return a.support=function(){return b.hasRuntime.apply(b,arguments)},a.register({name:"runtime",init:function(){if(!this.predictRuntimeType())throw Error("Runtime Error")},predictRuntimeType:function(){var a,c,d=this.options.runtimeOrder||b.orders,e=this.type;if(!e)for(d=d.split(/\s*,\s*/g),a=0,c=d.length;c>a;a++)if(b.hasRuntime(d[a])){this.type=e=d[a];break}return e}})}),b("lib/transport",["base","runtime/client","mediator"],function(a,b,c){function d(a){var c=this;a=c.options=e.extend(!0,{},d.options,a||{}),b.call(this,"Transport"),this._blob=null,this._formData=a.formData||{},this._headers=a.headers||{},this.on("progress",this._timeout),this.on("load error",function(){c.trigger("progress",1),clearTimeout(c._timer)})}var e=a.$;return d.options={server:"",method:"POST",withCredentials:!1,fileVal:"file",timeout:12e4,formData:{},headers:{},sendAsBinary:!1},e.extend(d.prototype,{appendBlob:function(a,b,c){var d=this,e=d.options;d.getRuid()&&d.disconnectRuntime(),d.connectRuntime(b.ruid,function(){d.exec("init")}),d._blob=b,e.fileVal=a||e.fileVal,e.filename=c||e.filename},append:function(a,b){"object"==typeof a?e.extend(this._formData,a):this._formData[a]=b},setRequestHeader:function(a,b){"object"==typeof a?e.extend(this._headers,a):this._headers[a]=b},send:function(a){this.exec("send",a),this._timeout()},abort:function(){return clearTimeout(this._timer),this.exec("abort")},destroy:function(){this.trigger("destroy"),this.off(),this.exec("destroy"),this.disconnectRuntime()},getResponse:function(){return this.exec("getResponse")},getResponseAsJson:function(){return this.exec("getResponseAsJson")},getStatus:function(){return this.exec("getStatus")},_timeout:function(){var a=this,b=a.options.timeout;b&&(clearTimeout(a._timer),a._timer=setTimeout(function(){a.abort(),a.trigger("error","timeout")},b))}}),c.installTo(d.prototype),d}),b("widgets/upload",["base","uploader","file","lib/transport","widgets/widget"],function(a,b,c,d){function e(a,b){var c,d,e=[],f=a.source,g=f.size,h=b?Math.ceil(g/b):1,i=0,j=0;for(d={file:a,has:function(){return!!e.length},shift:function(){return e.shift()},unshift:function(a){e.unshift(a)}};h>j;)c=Math.min(b,g-i),e.push({file:a,start:i,end:b?i+c:g,total:g,chunks:h,chunk:j++,cuted:d}),i+=c;return a.blocks=e.concat(),a.remaning=e.length,d}var f=a.$,g=a.isPromise,h=c.Status;f.extend(b.options,{prepareNextFile:!1,chunked:!1,chunkSize:5242880,chunkRetry:2,threads:3,formData:{}}),b.register({name:"upload",init:function(){var b=this.owner,c=this;this.runing=!1,this.progress=!1,b.on("startUpload",function(){c.progress=!0}).on("uploadFinished",function(){c.progress=!1}),this.pool=[],this.stack=[],this.pending=[],this.remaning=0,this.__tick=a.bindFn(this._tick,this),b.on("uploadComplete",function(a){a.blocks&&f.each(a.blocks,function(a,b){b.transport&&(b.transport.abort(),b.transport.destroy()),delete b.transport}),delete a.blocks,delete a.remaning})},reset:function(){this.request("stop-upload",!0),this.runing=!1,this.pool=[],this.stack=[],this.pending=[],this.remaning=0,this._trigged=!1,this._promise=null},startUpload:function(b){var c=this;if(f.each(c.request("get-files",h.INVALID),function(){c.request("remove-file",this)}),b)if(b=b.id?b:c.request("get-file",b),b.getStatus()===h.INTERRUPT)f.each(c.pool,function(a,c){c.file===b&&c.transport&&c.transport.send()}),b.setStatus(h.QUEUED);else{if(b.getStatus()===h.PROGRESS)return;b.setStatus(h.QUEUED)}else f.each(c.request("get-files",[h.INITED]),function(){this.setStatus(h.QUEUED)});if(!c.runing){c.runing=!0;var d=[];f.each(c.pool,function(a,b){var e=b.file;e.getStatus()===h.INTERRUPT&&(d.push(e),c._trigged=!1,b.transport&&b.transport.send())});for(var b;b=d.shift();)b.setStatus(h.PROGRESS);b||f.each(c.request("get-files",h.INTERRUPT),function(){this.setStatus(h.PROGRESS)}),c._trigged=!1,a.nextTick(c.__tick),c.owner.trigger("startUpload")}},stopUpload:function(b,c){var d=this;if(b===!0&&(c=b,b=null),d.runing!==!1){if(b){if(b=b.id?b:d.request("get-file",b),b.getStatus()!==h.PROGRESS&&b.getStatus()!==h.QUEUED)return;return b.setStatus(h.INTERRUPT),f.each(d.pool,function(a,c){c.file===b&&(c.transport&&c.transport.abort(),d._putback(c),d._popBlock(c))}),a.nextTick(d.__tick)}d.runing=!1,this._promise&&this._promise.file&&this._promise.file.setStatus(h.INTERRUPT),c&&f.each(d.pool,function(a,b){b.transport&&b.transport.abort(),b.file.setStatus(h.INTERRUPT)}),d.owner.trigger("stopUpload")}},cancelFile:function(a){a=a.id?a:this.request("get-file",a),a.blocks&&f.each(a.blocks,function(a,b){var c=b.transport;c&&(c.abort(),c.destroy(),delete b.transport)}),a.setStatus(h.CANCELLED),this.owner.trigger("fileDequeued",a)},isInProgress:function(){return!!this.progress},_getStats:function(){return this.request("get-stats")},skipFile:function(a,b){a=a.id?a:this.request("get-file",a),a.setStatus(b||h.COMPLETE),a.skipped=!0,a.blocks&&f.each(a.blocks,function(a,b){var c=b.transport;c&&(c.abort(),c.destroy(),delete b.transport)}),this.owner.trigger("uploadSkip",a)},_tick:function(){var b,c,d=this,e=d.options;return d._promise?d._promise.always(d.__tick):(d.pool.length<e.threads&&(c=d._nextBlock())?(d._trigged=!1,b=function(b){d._promise=null,b&&b.file&&d._startSend(b),a.nextTick(d.__tick)},d._promise=g(c)?c.always(b):b(c)):d.remaning||d._getStats().numOfQueue||d._getStats().numofInterrupt||(d.runing=!1,d._trigged||a.nextTick(function(){d.owner.trigger("uploadFinished")}),d._trigged=!0),void 0)},_putback:function(a){var b;a.cuted.unshift(a),b=this.stack.indexOf(a.cuted),~b||this.stack.unshift(a.cuted)},_getStack:function(){for(var a,b=0;a=this.stack[b++];){if(a.has()&&a.file.getStatus()===h.PROGRESS)return a;(!a.has()||a.file.getStatus()!==h.PROGRESS&&a.file.getStatus()!==h.INTERRUPT)&&this.stack.splice(--b,1)}return null},_nextBlock:function(){var a,b,c,d,f=this,h=f.options;return(a=this._getStack())?(h.prepareNextFile&&!f.pending.length&&f._prepareNextFile(),a.shift()):f.runing?(!f.pending.length&&f._getStats().numOfQueue&&f._prepareNextFile(),b=f.pending.shift(),c=function(b){return b?(a=e(b,h.chunked?h.chunkSize:0),f.stack.push(a),a.shift()):null},g(b)?(d=b.file,b=b[b.pipe?"pipe":"then"](c),b.file=d,b):c(b)):void 0},_prepareNextFile:function(){var a,b=this,c=b.request("fetch-file"),d=b.pending;c&&(a=b.request("before-send-file",c,function(){return c.getStatus()===h.PROGRESS||c.getStatus()===h.INTERRUPT?c:b._finishFile(c)}),b.owner.trigger("uploadStart",c),c.setStatus(h.PROGRESS),a.file=c,a.done(function(){var b=f.inArray(a,d);~b&&d.splice(b,1,c)}),a.fail(function(a){c.setStatus(h.ERROR,a),b.owner.trigger("uploadError",c,a),b.owner.trigger("uploadComplete",c)}),d.push(a))},_popBlock:function(a){var b=f.inArray(a,this.pool);this.pool.splice(b,1),a.file.remaning--,this.remaning--},_startSend:function(b){var c,d=this,e=b.file;return e.getStatus()!==h.PROGRESS?(e.getStatus()===h.INTERRUPT&&d._putback(b),void 0):(d.pool.push(b),d.remaning++,b.blob=1===b.chunks?e.source:e.source.slice(b.start,b.end),c=d.request("before-send",b,function(){e.getStatus()===h.PROGRESS?d._doSend(b):(d._popBlock(b),a.nextTick(d.__tick))}),c.fail(function(){1===e.remaning?d._finishFile(e).always(function(){b.percentage=1,d._popBlock(b),d.owner.trigger("uploadComplete",e),a.nextTick(d.__tick)}):(b.percentage=1,d.updateFileProgress(e),d._popBlock(b),a.nextTick(d.__tick))}),void 0)},_doSend:function(b){var c,e,g=this,i=g.owner,j=g.options,k=b.file,l=new d(j),m=f.extend({},j.formData),n=f.extend({},j.headers);b.transport=l,l.on("destroy",function(){delete b.transport,g._popBlock(b),a.nextTick(g.__tick)}),l.on("progress",function(a){b.percentage=a,g.updateFileProgress(k)}),c=function(a){var c;return e=l.getResponseAsJson()||{},e._raw=l.getResponse(),c=function(b){a=b},i.trigger("uploadAccept",b,e,c)||(a=a||"server"),a},l.on("error",function(a,d){b.retried=b.retried||0,b.chunks>1&&~"http,abort".indexOf(a)&&b.retried<j.chunkRetry?(b.retried++,l.send()):(d||"server"!==a||(a=c(a)),k.setStatus(h.ERROR,a),i.trigger("uploadError",k,a),i.trigger("uploadComplete",k))}),l.on("load",function(){var a;return(a=c())?(l.trigger("error",a,!0),void 0):(1===k.remaning?g._finishFile(k,e):l.destroy(),void 0)}),m=f.extend(m,{id:k.id,name:k.name,type:k.type,lastModifiedDate:k.lastModifiedDate,size:k.size}),b.chunks>1&&f.extend(m,{chunks:b.chunks,chunk:b.chunk}),i.trigger("uploadBeforeSend",b,m,n),l.appendBlob(j.fileVal,b.blob,k.name),l.append(m),l.setRequestHeader(n),l.send()},_finishFile:function(a,b,c){var d=this.owner;return d.request("after-send-file",arguments,function(){a.setStatus(h.COMPLETE),d.trigger("uploadSuccess",a,b,c)}).fail(function(b){a.getStatus()===h.PROGRESS&&a.setStatus(h.ERROR,b),d.trigger("uploadError",a,b)
}).always(function(){d.trigger("uploadComplete",a)})},updateFileProgress:function(a){var b=0,c=0;a.blocks&&(f.each(a.blocks,function(a,b){c+=(b.percentage||0)*(b.end-b.start)}),b=c/a.size,this.owner.trigger("uploadProgress",a,b||0))}})}),b("widgets/validator",["base","uploader","file","widgets/widget"],function(a,b,c){var d,e=a.$,f={};return d={addValidator:function(a,b){f[a]=b},removeValidator:function(a){delete f[a]}},b.register({name:"validator",init:function(){var b=this;a.nextTick(function(){e.each(f,function(){this.call(b.owner)})})}}),d.addValidator("fileNumLimit",function(){var a=this,b=a.options,c=0,d=parseInt(b.fileNumLimit,10),e=!0;d&&(a.on("beforeFileQueued",function(a){return c>=d&&e&&(e=!1,this.trigger("error","Q_EXCEED_NUM_LIMIT",d,a),setTimeout(function(){e=!0},1)),c>=d?!1:!0}),a.on("fileQueued",function(){c++}),a.on("fileDequeued",function(){c--}),a.on("reset",function(){c=0}))}),d.addValidator("fileSizeLimit",function(){var a=this,b=a.options,c=0,d=parseInt(b.fileSizeLimit,10),e=!0;d&&(a.on("beforeFileQueued",function(a){var b=c+a.size>d;return b&&e&&(e=!1,this.trigger("error","Q_EXCEED_SIZE_LIMIT",d,a),setTimeout(function(){e=!0},1)),b?!1:!0}),a.on("fileQueued",function(a){c+=a.size}),a.on("fileDequeued",function(a){c-=a.size}),a.on("reset",function(){c=0}))}),d.addValidator("fileSingleSizeLimit",function(){var a=this,b=a.options,d=b.fileSingleSizeLimit;d&&a.on("beforeFileQueued",function(a){return a.size>d?(a.setStatus(c.Status.INVALID,"exceed_size"),this.trigger("error","F_EXCEED_SIZE",d,a),!1):void 0})}),d.addValidator("duplicate",function(){function a(a){for(var b,c=0,d=0,e=a.length;e>d;d++)b=a.charCodeAt(d),c=b+(c<<6)+(c<<16)-c;return c}var b=this,c=b.options,d={};c.duplicate||(b.on("beforeFileQueued",function(b){var c=b.__hash||(b.__hash=a(b.name+b.size+b.lastModifiedDate));return d[c]?(this.trigger("error","F_DUPLICATE",b),!1):void 0}),b.on("fileQueued",function(a){var b=a.__hash;b&&(d[b]=!0)}),b.on("fileDequeued",function(a){var b=a.__hash;b&&delete d[b]}),b.on("reset",function(){d={}}))}),d}),b("runtime/compbase",[],function(){function a(a,b){this.owner=a,this.options=a.options,this.getRuntime=function(){return b},this.getRuid=function(){return b.uid},this.trigger=function(){return a.trigger.apply(a,arguments)}}return a}),b("runtime/html5/runtime",["base","runtime/runtime","runtime/compbase"],function(b,c,d){function e(){var a={},d=this,e=this.destroy;c.apply(d,arguments),d.type=f,d.exec=function(c,e){var f,h=this,i=h.uid,j=b.slice(arguments,2);return g[c]&&(f=a[i]=a[i]||new g[c](h,d),f[e])?f[e].apply(f,j):void 0},d.destroy=function(){return e&&e.apply(this,arguments)}}var f="html5",g={};return b.inherits(c,{constructor:e,init:function(){var a=this;setTimeout(function(){a.trigger("ready")},1)}}),e.register=function(a,c){var e=g[a]=b.inherits(d,c);return e},a.Blob&&a.FileReader&&a.DataView&&c.addRuntime(f,e),e}),b("runtime/html5/blob",["runtime/html5/runtime","lib/blob"],function(a,b){return a.register("Blob",{slice:function(a,c){var d=this.owner.source,e=d.slice||d.webkitSlice||d.mozSlice;return d=e.call(d,a,c),new b(this.getRuid(),d)}})}),b("runtime/html5/dnd",["base","runtime/html5/runtime","lib/file"],function(a,b,c){var d=a.$,e="webuploader-dnd-";return b.register("DragAndDrop",{init:function(){var b=this.elem=this.options.container;this.dragEnterHandler=a.bindFn(this._dragEnterHandler,this),this.dragOverHandler=a.bindFn(this._dragOverHandler,this),this.dragLeaveHandler=a.bindFn(this._dragLeaveHandler,this),this.dropHandler=a.bindFn(this._dropHandler,this),this.dndOver=!1,b.on("dragenter",this.dragEnterHandler),b.on("dragover",this.dragOverHandler),b.on("dragleave",this.dragLeaveHandler),b.on("drop",this.dropHandler),this.options.disableGlobalDnd&&(d(document).on("dragover",this.dragOverHandler),d(document).on("drop",this.dropHandler))},_dragEnterHandler:function(a){var b,c=this,d=c._denied||!1;return a=a.originalEvent||a,c.dndOver||(c.dndOver=!0,b=a.dataTransfer.items,b&&b.length&&(c._denied=d=!c.trigger("accept",b)),c.elem.addClass(e+"over"),c.elem[d?"addClass":"removeClass"](e+"denied")),a.dataTransfer.dropEffect=d?"none":"copy",!1},_dragOverHandler:function(a){var b=this.elem.parent().get(0);return b&&!d.contains(b,a.currentTarget)?!1:(clearTimeout(this._leaveTimer),this._dragEnterHandler.call(this,a),!1)},_dragLeaveHandler:function(){var a,b=this;return a=function(){b.dndOver=!1,b.elem.removeClass(e+"over "+e+"denied")},clearTimeout(b._leaveTimer),b._leaveTimer=setTimeout(a,100),!1},_dropHandler:function(a){var b,f,g=this,h=g.getRuid(),i=g.elem.parent().get(0);if(i&&!d.contains(i,a.currentTarget))return!1;a=a.originalEvent||a,b=a.dataTransfer;try{f=b.getData("text/html")}catch(j){}return g.dndOver=!1,g.elem.removeClass(e+"over"),!f&&b?(g._getTansferFiles(b,function(a){g.trigger("drop",d.map(a,function(a){return new c(h,a)}))}),!1):void 0},_getTansferFiles:function(b,c){var d,e,f,g,h,i,j,k=[],l=[];for(d=b.items,e=b.files,j=!(!d||!d[0].webkitGetAsEntry),h=0,i=e.length;i>h;h++)f=e[h],g=d&&d[h],j&&g.webkitGetAsEntry().isDirectory?l.push(this._traverseDirectoryTree(g.webkitGetAsEntry(),k)):k.push(f);a.when.apply(a,l).done(function(){k.length&&c(k)})},_traverseDirectoryTree:function(b,c){var d=a.Deferred(),e=this;return b.isFile?b.file(function(a){c.push(a),d.resolve()}):b.isDirectory&&b.createReader().readEntries(function(b){var f,g=b.length,h=[],i=[];for(f=0;g>f;f++)h.push(e._traverseDirectoryTree(b[f],i));a.when.apply(a,h).then(function(){c.push.apply(c,i),d.resolve()},d.reject)}),d.promise()},destroy:function(){var a=this.elem;a&&(a.off("dragenter",this.dragEnterHandler),a.off("dragover",this.dragOverHandler),a.off("dragleave",this.dragLeaveHandler),a.off("drop",this.dropHandler),this.options.disableGlobalDnd&&(d(document).off("dragover",this.dragOverHandler),d(document).off("drop",this.dropHandler)))}})}),b("runtime/html5/filepaste",["base","runtime/html5/runtime","lib/file"],function(a,b,c){return b.register("FilePaste",{init:function(){var b,c,d,e,f=this.options,g=this.elem=f.container,h=".*";if(f.accept){for(b=[],c=0,d=f.accept.length;d>c;c++)e=f.accept[c].mimeTypes,e&&b.push(e);b.length&&(h=b.join(","),h=h.replace(/,/g,"|").replace(/\*/g,".*"))}this.accept=h=new RegExp(h,"i"),this.hander=a.bindFn(this._pasteHander,this),g.on("paste",this.hander)},_pasteHander:function(a){var b,d,e,f,g,h=[],i=this.getRuid();for(a=a.originalEvent||a,b=a.clipboardData.items,f=0,g=b.length;g>f;f++)d=b[f],"file"===d.kind&&(e=d.getAsFile())&&h.push(new c(i,e));h.length&&(a.preventDefault(),a.stopPropagation(),this.trigger("paste",h))},destroy:function(){this.elem.off("paste",this.hander)}})}),b("runtime/html5/filepicker",["base","runtime/html5/runtime"],function(a,b){var c=a.$;return b.register("FilePicker",{init:function(){var a,b,d,e,f=this.getRuntime().getContainer(),g=this,h=g.owner,i=g.options,j=this.label=c(document.createElement("label")),k=this.input=c(document.createElement("input"));if(k.attr("type","file"),k.attr("name",i.name),k.addClass("webuploader-element-invisible"),j.on("click",function(){k.trigger("click")}),j.css({opacity:0,width:"100%",height:"100%",display:"block",cursor:"pointer",background:"#ffffff"}),i.multiple&&k.attr("multiple","multiple"),i.accept&&i.accept.length>0){for(a=[],b=0,d=i.accept.length;d>b;b++)a.push(i.accept[b].mimeTypes);k.attr("accept",a.join(","))}f.append(k),f.append(j),e=function(a){h.trigger(a.type)},k.on("change",function(a){var b,d=arguments.callee;g.files=a.target.files,b=this.cloneNode(!0),b.value=null,this.parentNode.replaceChild(b,this),k.off(),k=c(b).on("change",d).on("mouseenter mouseleave",e),h.trigger("change")}),j.on("mouseenter mouseleave",e)},getFiles:function(){return this.files},destroy:function(){this.input.off(),this.label.off()}})}),b("runtime/html5/util",["base"],function(b){var c=a.createObjectURL&&a||a.URL&&URL.revokeObjectURL&&URL||a.webkitURL,d=b.noop,e=d;return c&&(d=function(){return c.createObjectURL.apply(c,arguments)},e=function(){return c.revokeObjectURL.apply(c,arguments)}),{createObjectURL:d,revokeObjectURL:e,dataURL2Blob:function(a){var b,c,d,e,f,g;for(g=a.split(","),b=~g[0].indexOf("base64")?atob(g[1]):decodeURIComponent(g[1]),d=new ArrayBuffer(b.length),c=new Uint8Array(d),e=0;e<b.length;e++)c[e]=b.charCodeAt(e);return f=g[0].split(":")[1].split(";")[0],this.arrayBufferToBlob(d,f)},dataURL2ArrayBuffer:function(a){var b,c,d,e;for(e=a.split(","),b=~e[0].indexOf("base64")?atob(e[1]):decodeURIComponent(e[1]),c=new Uint8Array(b.length),d=0;d<b.length;d++)c[d]=b.charCodeAt(d);return c.buffer},arrayBufferToBlob:function(b,c){var d,e=a.BlobBuilder||a.WebKitBlobBuilder;return e?(d=new e,d.append(b),d.getBlob(c)):new Blob([b],c?{type:c}:{})},canvasToDataUrl:function(a,b,c){return a.toDataURL(b,c/100)},parseMeta:function(a,b){b(!1,{})},updateImageHead:function(a){return a}}}),b("runtime/html5/imagemeta",["runtime/html5/util"],function(a){var b;return b={parsers:{65505:[]},maxMetaDataSize:262144,parse:function(a,b){var c=this,d=new FileReader;d.onload=function(){b(!1,c._parse(this.result)),d=d.onload=d.onerror=null},d.onerror=function(a){b(a.message),d=d.onload=d.onerror=null},a=a.slice(0,c.maxMetaDataSize),d.readAsArrayBuffer(a.getSource())},_parse:function(a,c){if(!(a.byteLength<6)){var d,e,f,g,h=new DataView(a),i=2,j=h.byteLength-4,k=i,l={};if(65496===h.getUint16(0)){for(;j>i&&(d=h.getUint16(i),d>=65504&&65519>=d||65534===d)&&(e=h.getUint16(i+2)+2,!(i+e>h.byteLength));){if(f=b.parsers[d],!c&&f)for(g=0;g<f.length;g+=1)f[g].call(b,h,i,e,l);i+=e,k=i}k>6&&(l.imageHead=a.slice?a.slice(2,k):new Uint8Array(a).subarray(2,k))}return l}},updateImageHead:function(a,b){var c,d,e,f=this._parse(a,!0);return e=2,f.imageHead&&(e=2+f.imageHead.byteLength),d=a.slice?a.slice(e):new Uint8Array(a).subarray(e),c=new Uint8Array(b.byteLength+2+d.byteLength),c[0]=255,c[1]=216,c.set(new Uint8Array(b),2),c.set(new Uint8Array(d),b.byteLength+2),c.buffer}},a.parseMeta=function(){return b.parse.apply(b,arguments)},a.updateImageHead=function(){return b.updateImageHead.apply(b,arguments)},b}),b("runtime/html5/imagemeta/exif",["base","runtime/html5/imagemeta"],function(a,b){var c={};return c.ExifMap=function(){return this},c.ExifMap.prototype.map={Orientation:274},c.ExifMap.prototype.get=function(a){return this[a]||this[this.map[a]]},c.exifTagTypes={1:{getValue:function(a,b){return a.getUint8(b)},size:1},2:{getValue:function(a,b){return String.fromCharCode(a.getUint8(b))},size:1,ascii:!0},3:{getValue:function(a,b,c){return a.getUint16(b,c)},size:2},4:{getValue:function(a,b,c){return a.getUint32(b,c)},size:4},5:{getValue:function(a,b,c){return a.getUint32(b,c)/a.getUint32(b+4,c)},size:8},9:{getValue:function(a,b,c){return a.getInt32(b,c)},size:4},10:{getValue:function(a,b,c){return a.getInt32(b,c)/a.getInt32(b+4,c)},size:8}},c.exifTagTypes[7]=c.exifTagTypes[1],c.getExifValue=function(b,d,e,f,g,h){var i,j,k,l,m,n,o=c.exifTagTypes[f];if(!o)return a.log("Invalid Exif data: Invalid tag type."),void 0;if(i=o.size*g,j=i>4?d+b.getUint32(e+8,h):e+8,j+i>b.byteLength)return a.log("Invalid Exif data: Invalid data offset."),void 0;if(1===g)return o.getValue(b,j,h);for(k=[],l=0;g>l;l+=1)k[l]=o.getValue(b,j+l*o.size,h);if(o.ascii){for(m="",l=0;l<k.length&&(n=k[l],"\0"!==n);l+=1)m+=n;return m}return k},c.parseExifTag=function(a,b,d,e,f){var g=a.getUint16(d,e);f.exif[g]=c.getExifValue(a,b,d,a.getUint16(d+2,e),a.getUint32(d+4,e),e)},c.parseExifTags=function(b,c,d,e,f){var g,h,i;if(d+6>b.byteLength)return a.log("Invalid Exif data: Invalid directory offset."),void 0;if(g=b.getUint16(d,e),h=d+2+12*g,h+4>b.byteLength)return a.log("Invalid Exif data: Invalid directory size."),void 0;for(i=0;g>i;i+=1)this.parseExifTag(b,c,d+2+12*i,e,f);return b.getUint32(h,e)},c.parseExifData=function(b,d,e,f){var g,h,i=d+10;if(1165519206===b.getUint32(d+4)){if(i+8>b.byteLength)return a.log("Invalid Exif data: Invalid segment size."),void 0;if(0!==b.getUint16(d+8))return a.log("Invalid Exif data: Missing byte alignment offset."),void 0;switch(b.getUint16(i)){case 18761:g=!0;break;case 19789:g=!1;break;default:return a.log("Invalid Exif data: Invalid byte alignment marker."),void 0}if(42!==b.getUint16(i+2,g))return a.log("Invalid Exif data: Missing TIFF marker."),void 0;h=b.getUint32(i+4,g),f.exif=new c.ExifMap,h=c.parseExifTags(b,i,i+h,g,f)}},b.parsers[65505].push(c.parseExifData),c}),b("runtime/html5/image",["base","runtime/html5/runtime","runtime/html5/util"],function(a,b,c){var d="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D";return b.register("Image",{modified:!1,init:function(){var a=this,b=new Image;b.onload=function(){a._info={type:a.type,width:this.width,height:this.height},a._metas||"image/jpeg"!==a.type?a.owner.trigger("load"):c.parseMeta(a._blob,function(b,c){a._metas=c,a.owner.trigger("load")})},b.onerror=function(){a.owner.trigger("error")},a._img=b},loadFromBlob:function(a){var b=this,d=b._img;b._blob=a,b.type=a.type,d.src=c.createObjectURL(a.getSource()),b.owner.once("load",function(){c.revokeObjectURL(d.src)})},resize:function(a,b){var c=this._canvas||(this._canvas=document.createElement("canvas"));this._resize(this._img,c,a,b),this._blob=null,this.modified=!0,this.owner.trigger("complete","resize")},crop:function(a,b,c,d,e){var f=this._canvas||(this._canvas=document.createElement("canvas")),g=this.options,h=this._img,i=h.naturalWidth,j=h.naturalHeight,k=this.getOrientation();e=e||1,f.width=c,f.height=d,g.preserveHeaders||this._rotate2Orientaion(f,k),this._renderImageToCanvas(f,h,-a,-b,i*e,j*e),this._blob=null,this.modified=!0,this.owner.trigger("complete","crop")},getAsBlob:function(a){var b,d=this._blob,e=this.options;if(a=a||this.type,this.modified||this.type!==a){if(b=this._canvas,"image/jpeg"===a){if(d=c.canvasToDataUrl(b,a,e.quality),e.preserveHeaders&&this._metas&&this._metas.imageHead)return d=c.dataURL2ArrayBuffer(d),d=c.updateImageHead(d,this._metas.imageHead),d=c.arrayBufferToBlob(d,a)}else d=c.canvasToDataUrl(b,a);d=c.dataURL2Blob(d)}return d},getAsDataUrl:function(a){var b=this.options;return a=a||this.type,"image/jpeg"===a?c.canvasToDataUrl(this._canvas,a,b.quality):this._canvas.toDataURL(a)},getOrientation:function(){return this._metas&&this._metas.exif&&this._metas.exif.get("Orientation")||1},info:function(a){return a?(this._info=a,this):this._info},meta:function(a){return a?(this._meta=a,this):this._meta},destroy:function(){var a=this._canvas;this._img.onload=null,a&&(a.getContext("2d").clearRect(0,0,a.width,a.height),a.width=a.height=0,this._canvas=null),this._img.src=d,this._img=this._blob=null},_resize:function(a,b,c,d){var e,f,g,h,i,j=this.options,k=a.width,l=a.height,m=this.getOrientation();~[5,6,7,8].indexOf(m)&&(c^=d,d^=c,c^=d),e=Math[j.crop?"max":"min"](c/k,d/l),j.allowMagnify||(e=Math.min(1,e)),f=k*e,g=l*e,j.crop?(b.width=c,b.height=d):(b.width=f,b.height=g),h=(b.width-f)/2,i=(b.height-g)/2,j.preserveHeaders||this._rotate2Orientaion(b,m),this._renderImageToCanvas(b,a,h,i,f,g)},_rotate2Orientaion:function(a,b){var c=a.width,d=a.height,e=a.getContext("2d");switch(b){case 5:case 6:case 7:case 8:a.width=d,a.height=c}switch(b){case 2:e.translate(c,0),e.scale(-1,1);break;case 3:e.translate(c,d),e.rotate(Math.PI);break;case 4:e.translate(0,d),e.scale(1,-1);break;case 5:e.rotate(.5*Math.PI),e.scale(1,-1);break;case 6:e.rotate(.5*Math.PI),e.translate(0,-d);break;case 7:e.rotate(.5*Math.PI),e.translate(c,-d),e.scale(-1,1);break;case 8:e.rotate(-.5*Math.PI),e.translate(-c,0)}},_renderImageToCanvas:function(){function b(a,b,c){var d,e,f,g=document.createElement("canvas"),h=g.getContext("2d"),i=0,j=c,k=c;for(g.width=1,g.height=c,h.drawImage(a,0,0),d=h.getImageData(0,0,1,c).data;k>i;)e=d[4*(k-1)+3],0===e?j=k:i=k,k=j+i>>1;return f=k/c,0===f?1:f}function c(a){var b,c,d=a.naturalWidth,e=a.naturalHeight;return d*e>1048576?(b=document.createElement("canvas"),b.width=b.height=1,c=b.getContext("2d"),c.drawImage(a,-d+1,0),0===c.getImageData(0,0,1,1).data[3]):!1}return a.os.ios?a.os.ios>=7?function(a,c,d,e,f,g){var h=c.naturalWidth,i=c.naturalHeight,j=b(c,h,i);return a.getContext("2d").drawImage(c,0,0,h*j,i*j,d,e,f,g)}:function(a,d,e,f,g,h){var i,j,k,l,m,n,o,p=d.naturalWidth,q=d.naturalHeight,r=a.getContext("2d"),s=c(d),t="image/jpeg"===this.type,u=1024,v=0,w=0;for(s&&(p/=2,q/=2),r.save(),i=document.createElement("canvas"),i.width=i.height=u,j=i.getContext("2d"),k=t?b(d,p,q):1,l=Math.ceil(u*g/p),m=Math.ceil(u*h/q/k);q>v;){for(n=0,o=0;p>n;)j.clearRect(0,0,u,u),j.drawImage(d,-n,-v),r.drawImage(i,0,0,u,u,e+o,f+w,l,m),n+=u,o+=l;v+=u,w+=m}r.restore(),i=j=null}:function(b){var c=a.slice(arguments,1),d=b.getContext("2d");d.drawImage.apply(d,c)}}()})}),b("runtime/html5/transport",["base","runtime/html5/runtime"],function(a,b){var c=a.noop,d=a.$;return b.register("Transport",{init:function(){this._status=0,this._response=null},send:function(){var b,c,e,f=this.owner,g=this.options,h=this._initAjax(),i=f._blob,j=g.server;g.sendAsBinary?(j+=(/\?/.test(j)?"&":"?")+d.param(f._formData),c=i.getSource()):(b=new FormData,d.each(f._formData,function(a,c){b.append(a,c)}),b.append(g.fileVal,i.getSource(),g.filename||f._formData.name||"")),g.withCredentials&&"withCredentials"in h?(h.open(g.method,j,!0),h.withCredentials=!0):h.open(g.method,j),this._setRequestHeader(h,g.headers),c?(h.overrideMimeType&&h.overrideMimeType("application/octet-stream"),a.os.android?(e=new FileReader,e.onload=function(){h.send(this.result),e=e.onload=null},e.readAsArrayBuffer(c)):h.send(c)):h.send(b)},getResponse:function(){return this._response},getResponseAsJson:function(){return this._parseJson(this._response)},getStatus:function(){return this._status},abort:function(){var a=this._xhr;a&&(a.upload.onprogress=c,a.onreadystatechange=c,a.abort(),this._xhr=a=null)},destroy:function(){this.abort()},_initAjax:function(){var a=this,b=new XMLHttpRequest,d=this.options;return!d.withCredentials||"withCredentials"in b||"undefined"==typeof XDomainRequest||(b=new XDomainRequest),b.upload.onprogress=function(b){var c=0;return b.lengthComputable&&(c=b.loaded/b.total),a.trigger("progress",c)},b.onreadystatechange=function(){return 4===b.readyState?(b.upload.onprogress=c,b.onreadystatechange=c,a._xhr=null,a._status=b.status,b.status>=200&&b.status<300?(a._response=b.responseText,a.trigger("load")):b.status>=500&&b.status<600?(a._response=b.responseText,a.trigger("error","server")):a.trigger("error",a._status?"http":"abort")):void 0},a._xhr=b,b},_setRequestHeader:function(a,b){d.each(b,function(b,c){a.setRequestHeader(b,c)})},_parseJson:function(a){var b;try{b=JSON.parse(a)}catch(c){b={}}return b}})}),b("preset/html5only",["base","widgets/filednd","widgets/filepaste","widgets/filepicker","widgets/image","widgets/queue","widgets/runtime","widgets/upload","widgets/validator","runtime/html5/blob","runtime/html5/dnd","runtime/html5/filepaste","runtime/html5/filepicker","runtime/html5/imagemeta/exif","runtime/html5/image","runtime/html5/transport"],function(a){return a}),b("webuploader",["preset/html5only"],function(a){return a}),c("webuploader")});