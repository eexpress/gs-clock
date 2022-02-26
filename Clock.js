const Cairo = imports.cairo;
const { Clutter, GObject, GLib, PangoCairo, Pango } = imports.gi;

let size = 400;

var Clock = GObject.registerClass({
	Properties : {},
	Signals : {}
},
class Clock extends Clutter.Actor {
	_init(x) {
		super._init();

		if(x) size =x;
		this.degree =0;
		this.alarm_degree = 0;

		this._canvas = new Clutter.Canvas();
		this._canvas.connect('draw', this.on_draw.bind(this));
		this._canvas.invalidate();
		this._canvas.set_size(size, size);
		this.set_size(size, size);
		this.set_content(this._canvas);
		this.reactive = true;
		this.connect("motion-event",this.hover.bind(this));
		this.connect("button-press-event",this.click.bind(this));
	}

	get_coords(){
		const MIN = size/10;
		const [x, y] = global.get_pointer();
		const [x0, y0] = this.get_transformed_position();
		if(!x0) {return false;}
		const X = x - x0 - size/2; const Y = y - y0 - size/2;
		const distant = Math.sqrt(X*X+Y*Y);
		if(distant > MIN)
		this.degree=Math.ceil(Math.atan2(Y, X)/(Math.PI/180))+90;
		if(!this.degree) {return false;}
		if(this.degree<0) this.degree+=360;
		return true;
	}

	hover(actor, event){
		if(!this.get_coords()) return Clutter.EVENT_PROPAGATE;
		this._canvas.invalidate();
		return Clutter.EVENT_STOP;
	}

	click(actor, event){
		if(!this.degree) return Clutter.EVENT_PROPAGATE;
		this.alarm_degree = this.degree;
		this._canvas.invalidate();
		return Clutter.EVENT_STOP;
	}

	draw_line(ctx, color, width, angle, len){
		ctx.save();
		ctx.rotate(angle);
		//~ this.setcolor(ctx, shadow_color, 1);	//阴影
		//~ ctx.setLineWidth (width+4);
		//~ ctx.moveTo (0, 0); ctx.lineTo(0, len); ctx.stroke();
		this.setcolor(ctx, color, 1);	//指针颜色
		ctx.setLineWidth (width);
		ctx.moveTo (0, 0); ctx.lineTo(0, len); ctx.stroke();
		if(color == "white"){
			this.setcolor(ctx, 'red', 1);
			ctx.arc(0,len,width/2*0.6,0,2*Math.PI);
			ctx.fill();
		}
		ctx.restore();	//消除旋转的角度
	}

	align_show(ctx, showtext){
		// API没有绑定这个函数。 Cairo.TextExtents is not a constructor
		//~ https://gitlab.gnome.org/GNOME/gjs/-/merge_requests/720
		//~ let ex = new Cairo.TextExtents();
		//~ ctx.textExtents (showtext, ex);
		//~ ctx.relMoveTo(-ex.width/2,ex.height/2);
		//~ ctx.showText(showtext);
		let pl = PangoCairo.create_layout(ctx);
		pl.set_text(showtext, -1);
		pl.set_font_description(Pango.FontDescription.from_string("Sans Bold 20"));
		PangoCairo.update_layout(ctx, pl);
		let [w,h] = pl.get_pixel_size();
		ctx.relMoveTo(-w/2,0);
		PangoCairo.show_layout (ctx, pl);
		ctx.relMoveTo(w/2,0);
	}

	setcolor(ctx, colorstr, alpha){
		const [,cc] = Clutter.Color.from_string(colorstr);
		ctx.setSourceRGBA(cc.red, cc.green, cc.blue, alpha);
	}

	on_draw(canvas, ctx, width, height){
		const back_color="light gray";
		const hand_color='black';
		const MAX = size/2-size/12;

		//~ ctx.selectFontFace("Sans Bold 27", Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
		//~ Seems all font class in cairo are disable.

		ctx.translate(size/2, size/2);	//窗口中心为坐标原点。
		ctx.setLineCap (Cairo.LineCap.ROUND);
		ctx.setOperator (Cairo.Operator.SOURCE);

		this.setcolor(ctx, back_color, 0.8);	//底色
		ctx.arc(0,0,size/2-size/20,0,2*Math.PI);
		ctx.fill();
		ctx.setLineWidth(size/100);
		this.setcolor(ctx, hand_color, 1);
		ctx.arc(0,0,size/2-size/20,0,2*Math.PI);
		ctx.stroke();
		ctx.setLineWidth(size/200);
		this.setcolor(ctx, 'white', 1);
		ctx.arc(0,0,size/2-size/7.5,0,2*Math.PI);
		ctx.stroke();

		ctx.save();	//刻度
		const scale = 60; let kp = false;
		for(let i=0;i<scale;i++){
			ctx.moveTo(0,-MAX);
			if(i%5==0){
				if(i%15==0){
					ctx.setOperator(Cairo.Operator.SOURCE);
					this.setcolor(ctx, hand_color, 1);
					this.align_show(ctx, (i/5).toString());
					ctx.setLineWidth(size/30);
				}
				else {
					ctx.setOperator(Cairo.Operator.ATOP);
					this.setcolor(ctx, back_color, 1);
					ctx.setLineWidth(size/50);
				}
				ctx.relMoveTo(0,-size/35);
				ctx.relLineTo(0,size/70);
			}
			ctx.stroke();
			ctx.rotate((360/scale)*(Math.PI/180));	//6度一个刻度
		}
		ctx.restore();

		const angle = this.degree*Math.PI/180;
		if(angle){
			//~ ctx.setOperator (Cairo.Operator.SOURCE);
			this.setcolor(ctx, 'red', 1);	//hover 指示
			ctx.rotate(-Math.PI/2);
			ctx.setLineWidth (20);
			ctx.moveTo(0,0);
			ctx.arc(0,0,size/4,0,angle);
			ctx.fill();
			ctx.rotate(Math.PI/2);

			ctx.moveTo(0,size/4);
			const at = this.degree * 2;
			const ah = parseInt(at / 60);
			const am = parseInt((at - ah * 60) / 5) * 5;
			this.align_show(ctx, ah+" : "+am);
			//~ this.align_show(ctx, (this.degree).toString());
			ctx.moveTo(0,0);
		}

		const d0 = new Date();	//时间
		const h = d0.getHours();
		const m = d0.getMinutes();
		this.draw_line(ctx, "white", size/25, this.alarm_degree*Math.PI/180, -Math.floor(size/4));	//闹铃，30度1小时
		this.draw_line(ctx, hand_color, size/20, (h*30+m*30/60)*(Math.PI/180),-Math.floor(size/3.7));	//时针，30度1小时
		this.draw_line(ctx, hand_color, size/33, m*6*(Math.PI/180),-Math.floor(size/2.7));	//分针，6度1分钟
		this.setcolor(ctx, hand_color, 1);
		ctx.arc(0,0,size/20,0,2*Math.PI);
		ctx.fill();
		this.setcolor(ctx, 'red', 1);
		ctx.arc(0,0,size/33,0,2*Math.PI);
		ctx.fill();
		ctx.$dispose();	// 释放context，有用？
	}

});
