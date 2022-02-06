const GETTEXT_DOMAIN = 'cairo';
function lg(s){log("==="+GETTEXT_DOMAIN+"===>"+s)};

imports.cairo.versions = '1.0';
const Cairo = imports.cairo;
 //~ How to determine the version of the imported module? Like `Gdk` or `cairo`.

imports.gi.versions.Gdk = '4.4';
const { GObject, Clutter, Gdk, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const size = 320;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
	_init() {
		super._init(0.0, _('Cairo Clock'));

		this.add_child(new St.Icon({
			icon_name: 'gnome-panel-clock',
			style_class: 'system-status-icon',
		}));

		let item = new PopupMenu.PopupBaseMenuItem();
		const da = new St.DrawingArea({
			width: size, height: size
		});
		da.connect("repaint", this.on_draw.bind(this));
		item.actor.add_child(da);

		this.menu.addMenuItem(item);
	}

	align_show(ctx, showtext, size){
		ctx.setFontSize(size);
		//~ Cairo.TextExtents ex;
		//~ let ex = Cairo.TextExtents.textExtents(showtext);
		//~ let ex = new Cairo.TextExtents();	// Cairo.TextExtents is not a constructor
//~ Where is the cairo.js source code? I got msg: `Cairo.TextExtents is not a constructor`.
		//~ ctx.textExtents (showtext, ex);
		//~ ctx.relMoveTo(-ex.width/2,ex.height/2);
		ctx.relMoveTo(-4,0);
		ctx.showText(showtext);
	}

	setcolor(ctx, colorstr, alpha){
		//~ const cc = Clutter.Color.from_string(colorstr);
//~ Need a example of `Clutter.Color.from_string`.
		const cc = new Gdk.RGBA();
		cc.parse(colorstr);
		ctx.setSourceRGBA(cc.red, cc.green, cc.blue, alpha);
	};

	on_draw(area){
		const back_color="#CECECE";
		const hand_color='black';
		const MIN = size/10;
		const MAX = size/2-size/12;

		let ctx = area.get_context();

		//~ ctx.rectangle (0, 0, size, size);
		//~ this.setcolor(ctx, 'white', 0.8);
		//~ ctx.fill();

		ctx.translate(size/2, size/2);	//窗口中心为坐标原点。
		ctx.setLineCap (Cairo.LineCap.ROUND);
		ctx.setOperator (Cairo.Operator.SOURCE);
//---------------------底色
		this.setcolor(ctx, back_color, 0.8);
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
//---------------------刻度
		ctx.save();
		const scale = 60; let kp = false;
		for(let i=0;i<scale;i++){
			ctx.moveTo(0,-MAX);
			//~ if(i%5==0){
				//~ ctx.relLineTo(0,15);
				//~ ctx.relMoveTo(0,20);
				//~ this.align_show(ctx, (i/5).toString(), size/20);
			//~ }else{ ctx.relLineTo(0,5); }
			if(i%5==0){
				if(i%15==0){
					ctx.setOperator(Cairo.Operator.SOURCE);
					this.setcolor(ctx, hand_color, 1);
					ctx.setLineWidth(size/30);
				}
				else {
					//~ https://www.cairographics.org/operators/
					ctx.setOperator(Cairo.Operator.ATOP);
					this.setcolor(ctx, back_color, 1);
					ctx.setLineWidth(size/50);
				}
				ctx.relMoveTo(0,-size/35);
				ctx.relLineTo(0,size/70);
			}
			//~ if(i%(scale/4)==0){
				//~ ctx.relMoveTo(0,20);
				//~ this.align_show(ctx, (i/5).toString(), size/20);
				//~ }
			ctx.stroke();
			ctx.rotate((360/scale)*(Math.PI/180));	//6度一个刻度
		}
		ctx.restore();
//---------------------时间
ctx.setOperator(Cairo.Operator.SOURCE);
		const d0 = new Date();
		const h = d0.getHours();
		const m = d0.getMinutes();
		this.draw_line(ctx, hand_color, size/20, (h*30+m*30/60)*(Math.PI/180),-parseInt(size/3.7));	//时针，30度1小时
		this.draw_line(ctx, hand_color, size/33, m*6*(Math.PI/180),-parseInt(size/2.7));	//分针，6度1分钟
		this.setcolor(ctx, hand_color, 1);
		ctx.arc(0,0,size/20,0,2*Math.PI);
		ctx.fill();
		this.setcolor(ctx, 'red', 1);
		ctx.arc(0,0,size/33,0,2*Math.PI);
		ctx.fill();
	};

	draw_line(ctx, color, width, angle, len){
		ctx.save();
		ctx.rotate(angle);
		//~ this.setcolor(ctx, shadow_color, 1);	//阴影
		//~ ctx.setLineWidth (width+4);
		//~ ctx.moveTo (0, 0); ctx.lineTo(0, len); ctx.stroke();
		this.setcolor(ctx, color, 1);	//指针颜色
		ctx.setLineWidth (width);
		ctx.moveTo (0, 0); ctx.lineTo(0, len); ctx.stroke();
		ctx.restore();	//消除旋转的角度
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
