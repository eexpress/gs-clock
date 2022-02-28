const Cairo = imports.cairo;
const { GObject, Clutter, GLib, St, PangoCairo, Pango } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

const debug = false;
//~ const debug = true;
function lg(s) {
	if (debug) log("===" + Me.metadata['gettext-domain'] + "===>" + s);
}

const size = 400;
let alarm_h = null;
let alarm_m = null;
let timeoutId = null;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
	_init() {
		super._init(0.0, _('Cairo Clock'));
		this.hover_degree = 0;
		this.alarm_degree = 0;
		this.IsCenter = false;
		this.alarm_active = false;

		this.add_child(new St.Icon({ icon_name: 'gnome-panel-clock' }));

		this.da = new St.DrawingArea({
			width: size, height: size
		});
		this.da.connect("repaint", this.on_draw.bind(this));
		this.da.reactive = true;	//开，才能连信号
		this.da.connect("button-press-event",this.click.bind(this));
		this.da.connect("motion-event",this.hover.bind(this));
		this.da.connect("leave-event", ()=>{
			this.hover_degree = 0;
			this.da.queue_repaint();
		});

		const item = new PopupMenu.PopupBaseMenuItem();
		item.actor.add_child(this.da);
		item.reactive = false;
		this.menu.addMenuItem(item);
	}

	get_coords(){
		const MIN = size / 10;
		const [x, y] = global.get_pointer();
		const [op, x0, y0] = this.da.transform_stage_point(x, y);
		if(!op) return false;
		const X = x0 - size / 2;
		const Y = y0 - size / 2;
		const distant = Math.sqrt(X * X + Y * Y);
		this.IsCenter = distant > MIN ? false : true;
		if (!this.IsCenter)
		this.hover_degree=Math.ceil(Math.atan2(Y, X)/(Math.PI/180))+90;
		if(!this.hover_degree) {return false;}
		if(this.hover_degree<0) this.hover_degree+=360;
		return true;
	}

	hover(actor, event){
		if(!this.menu.isOpen) return Clutter.EVENT_PROPAGATE;
		if (!this.get_coords() || this.alarm_active) return Clutter.EVENT_PROPAGATE;
		this.da.queue_repaint();
		return Clutter.EVENT_STOP;
	}

	click(actor, event){
		if(!this.menu.isOpen) return Clutter.EVENT_PROPAGATE;
		if(!this.hover_degree) return Clutter.EVENT_PROPAGATE;
		if (!this.IsCenter)
		this.alarm_degree = this.hover_degree;
		else
			this.alarm_active = !this.alarm_active;
		if (this.alarm_active) {
			[alarm_h, alarm_m] = this.degree2time(this.alarm_degree);
		} else {
			alarm_h = null;
			alarm_m = null;
		}
		this.da.queue_repaint();
		return Clutter.EVENT_STOP;
	}

	draw_line(ctx, color, width, angle, len) {
		ctx.save();
		ctx.rotate(angle);
		//~ this.setcolor(ctx, shadow_color, 1);	//阴影
		//~ ctx.setLineWidth (width+4);
		//~ ctx.moveTo (0, 0); ctx.lineTo(0, len); ctx.stroke();
		this.setcolor(ctx, color, 1); //指针颜色
		ctx.setLineWidth(width);
		ctx.moveTo(0, 0);
		ctx.lineTo(0, len);
		ctx.stroke();
		if (color == "white") {
			this.setcolor(ctx, 'red', 1);
			ctx.arc(0, len, width / 2 * 0.6, 0, 2 * Math.PI);
			ctx.fill();
		}
		ctx.restore(); //消除旋转的角度
	}

	align_show(ctx, showtext, font = "Sans Bold 20"){
		// API没有绑定这个函数。 Cairo.TextExtents is not a constructor
		//~ https://gitlab.gnome.org/GNOME/gjs/-/merge_requests/720
		//~ let ex = new Cairo.TextExtents();
		//~ ctx.textExtents (showtext, ex);
		//~ ctx.relMoveTo(-ex.width/2,ex.height/2);
		//~ ctx.showText(showtext);
		let pl = PangoCairo.create_layout(ctx);
		pl.set_text(showtext, -1);
		pl.set_font_description(Pango.FontDescription.from_string(font));
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

	on_draw(area){
		const back_color="light gray";
		const hand_color='black';
		const MIN = size/10;
		const MAX = size/2-size/12;


		let ctx = area.get_context();
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
		const scale = 60;
		for(let i=0;i<scale;i++){
			ctx.moveTo(0,-MAX);
			if(i%5==0){
				if(i%15==0){
					ctx.setOperator(Cairo.Operator.SOURCE);
					this.setcolor(ctx, hand_color, 1);
					this.align_show(ctx, (i/5).toString());
					ctx.setLineWidth(size/30);
				} else {
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

		const d0 = new Date();	//时间
		const h0 = d0.getHours();
		const m0 = d0.getMinutes();

		if (this.hover_degree && !this.alarm_active) {
			const angle = this.hover_degree*Math.PI/180;
			//~ ctx.setOperator (Cairo.Operator.SOURCE);
			this.setcolor(ctx, 'red', 1);	//hover 指示
			ctx.rotate(-Math.PI/2);
			ctx.setLineWidth (20);
			ctx.moveTo(0,0);
			ctx.arc(0,0,size/4,0,angle);
			ctx.fill();
			ctx.rotate(Math.PI/2);

			ctx.moveTo(0, size / 4);
			const [ah, am] = this.degree2time(this.hover_degree);
			this.align_show(ctx, '%02s : %02s'.format(ah, am));
		} else {
			this.setcolor(ctx, 'black', 1);
			ctx.moveTo(0, size / 7);
			this.align_show(ctx, '%02s : %02s'.format(h0, m0), "DejaVuSerif Bold 24");
		}
		if (this.alarm_active) {
			this.setcolor(ctx, 'blue', 1);
			ctx.moveTo(0, -size / 5);
			this.align_show(ctx, '%02s : %02s'.format(alarm_h, alarm_m), "DejaVuSerif Bold 24");
		}

		ctx.moveTo(0, 0);
		this.draw_line(ctx, "white", size/25, this.alarm_degree*Math.PI/180, -Math.floor(size/4));	//闹铃，30度1小时
		this.draw_line(ctx, hand_color, size / 20, (h0 * 30 + m0 * 30 / 60) * (Math.PI / 180), -Math.floor(size / 3.7)); //时针，30度1小时
		this.draw_line(ctx, hand_color, size / 33, m0 * 6 * (Math.PI / 180), -Math.floor(size / 2.7)); //分针，6度1分钟
		this.setcolor(ctx, hand_color, 1);
		ctx.arc(0,0,size/20,0,2*Math.PI);
		ctx.fill();
		this.setcolor(ctx, this.alarm_active ? 'blue' : 'red', 1);
		ctx.arc(0,0,size/33,0,2*Math.PI);
		ctx.fill();
		ctx.$dispose();	// 释放context，有用？
	}

	degree2time(degree) {
		const at = degree * 2;
		const ah = parseInt(at / 60);
		const am = parseInt((at - ah * 60) / 5) * 5;
		return [ ah, am ];
	};

	destroy() {
		super.destroy();
	}

});

class Extension {
	constructor(uuid) {
		this._uuid = uuid;

		ExtensionUtils.initTranslations();
	}

	enable() {
		timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
			if(this._indicator.menu.isOpen){
				this._indicator.da.queue_repaint();
			}
			const [h, m] = [alarm_h, alarm_m];
			if (h && m) {
				const d0 = new Date();
				let h0 = d0.getHours();
				h0 %= 12;
				const m0 = d0.getMinutes();
				if (h == h0 && m == m0) {
					const player = global.display.get_sound_player();
					player.play_from_theme('complete', 'countdown', null);
					this._indicator.menu.open();
				}
			}
			return GLib.SOURCE_CONTINUE;
		});
		lg("start");
		this._indicator = new Indicator();
		Main.panel.addToStatusArea(this._uuid, this._indicator);
	}

	disable() {
		if (timeoutId) {
			GLib.Source.remove(timeoutId);
			timeoutId = null;
		}
		lg("stop");
		this._indicator.destroy();
		this._indicator = null;
	}
}

function init(meta) {
	return new Extension(meta.uuid);
}
