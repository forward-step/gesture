// GestureLock
window.CanvasLock = (function() {
    // 判单设备是否为手机
    function isMobile() {
        return /Mobile/i.test(
            window.navigator.userAgent
        );
    }
    
    // 默认选项
    const defaultOptions = {
        // 文本
        text: {
            title: '请解锁',     // 原始标题
            offset_x: null,     // 文本的X轴上的偏移位置 ; 默认居中
            offset_y: 100,      // 文本的Y轴上的偏移位置
            text_max_width: 1000 // 文本的最大宽度
        },
        // 圆圈
        circle: {
            num: 3,           // 圆圈的数量: num * num
            offset_y: 200,    // 圆圈在Y轴上的偏移位置
        },
        // 样式
        normalStyle: 'white', // 正常状态下的主题颜色
        errorStyle: 'red',    // 错误状态下的主题颜色
        fontSize: '20px',     // font size
        // 其他
        validate: () => {},   // 校验手势是否成功
        success: () => {},// 成功的回调
        error: (res, unlockTimes) => {},  // 失败的回调
    };

    // TODO: 将回调函数改为异步的形式
    function CanvasLock(elem, options, successFunc, errorFunc) {
        if (!(this instanceof CanvasLock)) {
            return new CanvasLock(elem, options, successFunc, errorFunc);
        }
        // options
        this.options = {
            ...defaultOptions,
            ...options,
            text: {
              ...defaultOptions.text,
              ...options.text
            },
            circle: {
              ...defaultOptions.circle,
              ...options.circle,
            }
        }
        // canvas
        this.canvas = this._getCanvas(elem); // 获取canvas对象
        this.ctx = this.canvas.getContext('2d'); // ctx

        // computed data
        this.title = this.options.text.title; // 绘制文本的标题,不使用options.text.title是因为title是经常变化的
        this.radius = null; // 圆圈的半径
        this.circle_xy_arr = []; // 存储圆心坐标位置
        this.res = []; // 绘制密码
        this.open = true; // 手势解锁是否能用
        this.unlockTimes = 0; // 解锁失败的次数
    }
    // 初始化画布
    CanvasLock.prototype.init = function () {
        this._setSize(); // 设置画布大小
        this._reset(); // 重新绘制
        this._registerEvent(); // 注册事件
    };
    // 重新开始
    CanvasLock.prototype._reset = function(){
        this._clearCanvas(); // 清空canvas
        this._drawText(); // 绘制文本
        this._createCircle(); // 绘制圆圈
    };
    // 清空屏幕
    CanvasLock.prototype._clearCanvas = function(){
        const { ctx,canvas } = this;
        ctx.beginPath();
        ctx.clearRect(0,0,canvas.width,canvas.height)
    };
    // 获取canvas画布
    CanvasLock.prototype._getCanvas = function (elem) {
        const canvas = document.createElement('canvas');
        // 将elem的属性复制到canvas中
        for (const attr of elem.attributes) {
            canvas.setAttribute(attr.name, attr.value);
        }
        // 使用canvas替换elem
        elem.replaceWith(canvas);
        return canvas;
    };
    // 设置canvas画布的宽高为父元素的宽高
    CanvasLock.prototype._setSize = function () {
        const parent = this.canvas.parentElement;
        let width = parent.clientWidth;
        let height = parent.clientHeight;
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
    };
    // 绘制文本
    CanvasLock.prototype._drawText = function(text, color){
        const { ctx,canvas } = this;
        const { normalStyle, fontSize } = this.options;
        const { offset_x, offset_y, text_max_width } = this.options.text;

        text = text || this.title;
        color = color || normalStyle;

        ctx.fillStyle = color;
        ctx.font = `${fontSize} Arial`;

        // 获取文本的宽度
        // center: canvas.width / 2 - text.width / 2
        const x = offset_x || (canvas.width - ctx.measureText(text).width) >> 1;
        ctx.fillText(text,x,offset_y,text_max_width);
    };
    // 绘制一个圆
    CanvasLock.prototype._drawCricle = function(circle,r,ctrl,color){
        const { ctx } = this;
        const { normalStyle } =  this.options;

        ctrl = ctrl || 'stroke';
        color = color || normalStyle;

        ctx.beginPath();
        ctx.lineWidth = '2px';
        ctx.lineWidth = 1;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        r = r || this.radius;
        ctx.arc(
            circle['x'],circle['y'],
            r,
            0 , 2*Math.PI
        );
        if(ctx[ctrl]){
            ctx[ctrl].call(ctx);
        }
    };
    // 绘制多个圆圈
    CanvasLock.prototype._createCircle = function(){
        const { canvas } = this;
        const { offset_y, num } = this.options.circle;

        // 绘制圆圈
        // 三个圆有14个半径，四个圆有18个半径
        this.radius = parseInt(canvas.width) / (2 + 4 * num); // 圆圈的半径

        // 避免重新绘制
        if(this.circle_xy_arr.length != 0){
            for(let xy of this.circle_xy_arr){
                this._drawCricle(xy); // 绘制一个圆
            }
        }else{
            let index = 0;
            for(let i=0;i<num;i++){
                for(let j=0;j<num;j++){
                    let xy = {
                        index,
                        x: j * 4 * this.radius + 3 * this.radius,
                        y: i * 4 * this.radius + 3 * this.radius + offset_y,
                    };
                    this.circle_xy_arr.push(xy);
                    this._drawCricle(xy); // 绘制一个圆
                    index++;
                }
            }
        }
    };
    // 绘制一条线条
    CanvasLock.prototype._drawLine = function(xy1,xy2,color){
        const { ctx } = this;
        const { normalStyle } = this.options;

        color = color || normalStyle;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.moveTo(xy1.x,xy1.y);
        ctx.lineTo(xy2.x,xy2.y);
        ctx.closePath();
        ctx.save();
        ctx.restore();
        ctx.stroke();
    };
    // 记忆化
    CanvasLock.prototype._memory = function(color){
        color = color || this.options.normalStyle;

        this._reset();
        // 画上之前的圆圈
        // 画上之前的连线
        let lastXY = null;
        for(let index of this.res){
            const xy = this.circle_xy_arr[index];
            this._drawCricle(xy,this.radius,'stroke',color);
            this._drawCricle(xy,this.radius/2,'fill',color); // 绘制实心

            if(lastXY != null){
                this._drawLine(lastXY,xy,color);
            }
            lastXY = xy;
        }
    };

    /*
    * 事件、操作逻辑
    * */
    // 注册canvas事件
    CanvasLock.prototype._registerEvent = function(){
        const { canvas } = this;
        if (isMobile()){
            // mobile
            canvas.addEventListener('touchmove',this._touchmove.bind(this));
            canvas.addEventListener('touchend',this._touchEnd.bind(this));
        }else{
            // pc
            const self = this;
            canvas.addEventListener('mousedown',function() {
                canvas.onmousemove = self._touchmove.bind(self);
            });
            canvas.addEventListener('mouseup',function() {
                canvas.onmousemove = null;
                self._touchEnd();
            });
        }
    };
    // 根据MouseEvent or TouchEvent 获取点击的坐标(canvas画布左上角为原点)
    CanvasLock.prototype._getPosition = function(e){
        if(isMobile()){
            // mobile
            CanvasLock.prototype._getPosition = function(e) {
                const rect = e.target.getBoundingClientRect();
                return {
                    x: e.touches[0].clientX - rect.left,
                    y: e.touches[0].clientY - rect.top
                }
            }
        }else{
            // pc
            CanvasLock.prototype._getPosition = function(e) {
                return {
                    x: e.offsetX,
                    y: e.offsetY
                }
            }
        }
        return this._getPosition(e);
    };
    // 触摸绘制
    CanvasLock.prototype._touchmove = function(e) {
        if(this.open){
            // canvas绘制动画的要领：先删除，再绘制
            this._memory();
            // 绘制实心圆圈
            const position = this._getPosition(e);
            for(let xy of this.circle_xy_arr){
                if(
                    !this.res.includes(xy.index) &&
                    Math.abs(position.x - xy.x) < this.radius &&
                    Math.abs((position.y - xy.y)) < this.radius
                ){
                    this._drawCricle(xy); // 绘制外圈
                    this._drawCricle(xy,this.radius/2,'fill'); // 绘制实心
                    this.res.push(xy.index);
                }
            }
            // 绘制连线
            if(this.res.length != 0){
                const lastXY = this.circle_xy_arr[this.res[this.res.length-1]];
                this._drawLine(lastXY,position);
            }
        }
    };
    CanvasLock.prototype._touchEnd = function() {
        const { validate, error, success } = this.options;
        // 防止碰到屏幕都算一次
        if(this.open && this.res.length != 0){
            this._memory();
            const res = validate(this.res); // 校验是否成功
            if(!res){
                const res = error(this.res,++this.unlockTimes); // 返回失败的提示
                this.title = res.title;
                // 是否禁用
                if(res.seconds) this.open = false;
                else this.open = true;
                // 时间
                let seconds = res.seconds || 0;
                // 颜色
                let style;
                if(res.style == 'normal') style = this.options.normalStyle;
                else if(res.style != undefined) style = res.style;
                else style = this.options.errorStyle;
                if(this.open == false && seconds != 0){
                    const temp = this.title;
                    this.title = this.title.replace(/\{seconds\}/i,seconds);
                    this.resetUnLockTimes(temp,seconds);
                }
                this._memory(style);
            }else{
                this.title = success(); // 解锁成功
                this._reset();
            }
            this.res = [];
        }else{
            this._reset();
        }
    };
    // 可以继续尝试解锁
    CanvasLock.prototype.resetUnLockTimes = function(title,time = 0) {
        const self = this;
        const { title: textTile } = this.options.text;
        let seconds = time; // 执行的秒数
        let timer = setInterval(function() {
            if(seconds <= 0){
                self.unlockTimes = 0;
                self.open = true;
                self.title = textTile;
                clearInterval(timer);
            }else{
                self.title = title.replace(/\{seconds\}/i,--seconds);
            }
            self._reset();
        },1000)
    };

    return CanvasLock;
})();