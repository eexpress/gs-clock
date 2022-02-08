const GETTEXT_DOMAIN = 'cairo';
function lg(s){log("==="+GETTEXT_DOMAIN+"===>"+s)};

imports.cairo.versions = '1.0';
const Cairo = imports.cairo;

const { GObject, Clutter, St, PangoCairo, Pango } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const size = 400;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
	_init() {
		super._init(0.0, _('Cairo Clock'));
		this.degree;
		this.alarm_degree = 0;

		this.add_child(new St.Icon({
			icon_name: 'gnome-panel-clock',
			style_class: 'system-status-icon',
		}));

		//~ let item = new PopupMenu.PopupBaseMenuItem({reactive: false});
//~ Can disable the close action of PopupMenu when click it, not use `reactive: false` attribute.
		let item = new PopupMenu.PopupBaseMenuItem();
		this.da = new St.DrawingArea({
			width: size, height: size
		});
		this.da.connect("repaint", this.on_draw.bind(this));
		item.actor.add_child(this.da);

		item.connect("button-press-event",this.click.bind(this));
		item.connect("motion-event",this.hover.bind(this));
//~ In vala, `motion_notify_event` event.x and event.y is relative coordinate. But GJS here, event.get_coords() show absolute one.
		//~ item.connect("show",this.open.bind(this));
		//~ this.da.connect("button-press-event",this.click.bind(this));
		//~ this.da.connect("motion-event",this.hover.bind(this));
//~ Since St.DrawingArea's signals are inherited from Clutter.Actor, Why DrawingArea conect "motion-event", no response when hover over?

		//~ this.clickId = global.stage.connect('button-release-event', this.click.bind(this));
		//~ this.hoverId = global.stage.connect("motion-event",this.hover.bind(this));
		//~ global.stage.add_actor(this.da);
		//~ global.stage.add_actor(item);	//脱离面板的顶层透明显示。

		this.menu.addMenuItem(item);
	}

	pickactor(){
		const [x, y] = global.get_pointer();
		const a = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, x, y);
		lg(a);
		return a;
	}

	open(actor, event){
		lg("open: transformed"+this.da.get_transformed_position());
	}

	get_coords(){
		const [x, y] = global.get_pointer();
		const [x0, y0] = this.da.get_transformed_position();
		if(!x0) {return false;}
		const X = x - x0 - size/2; const Y = y - y0 - size/2;
		this.degree=Math.ceil(Math.atan2(Y, X)/(Math.PI/180))+90;
		if(!this.degree) {return false;}
		if(this.degree<0) this.degree+=360;
		//~ lg(X+"x"+Y+" degree:"+this.degree);
		return true;
	}

	hover(actor, event){
		//~ if(!this.menu.isOpen) return Clutter.EVENT_PROPAGATE;
		if(!this.get_coords()) return Clutter.EVENT_PROPAGATE;
		this.da.queue_redraw();
//~ Actor(St.DrawingArea).queue_redraw() seems no work? Can force redraw?
		return Clutter.EVENT_STOP;
	}

	click(actor, event){
		if(!this.menu.isOpen) return Clutter.EVENT_PROPAGATE;
		if(!this.degree) return Clutter.EVENT_PROPAGATE;
		this.alarm_degree = this.degree;
		this.da.queue_redraw();
		return Clutter.EVENT_STOP;
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

	destroy() {
		if (this.hoverId != null) {
			global.stage.disconnect(this.hoverId);
			this.hoverId = null;
		}
		if (this.clickId != null) {
			global.stage.disconnect(this.clickId);
			this.clickId = null;
		}
		if (this._actor) this._actor.destroy();
		super.destroy();
	}

});

class Extension {
	constructor(uuid) {
		this._uuid = uuid;

		ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
	}

	enable() {
		lg("start");
		this._indicator = new Indicator();
		Main.panel.addToStatusArea(this._uuid, this._indicator);
	}

	disable() {
		lg("stop");
		this._indicator.destroy();
		this._indicator = null;
	}
}

function init(meta) {
	return new Extension(meta.uuid);
}
