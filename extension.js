const { GObject, Clutter, St, PangoCairo, Pango } = imports.gi;

const Cairo = imports.cairo;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

//~ const debug = false;
const debug = true;
function lg(s) {
	if (debug) log("===" + Me.metadata['gettext-domain'] + "===>" + s);
}

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
	_init() {
		super._init(0.0, _('Cairo Clock'));

		this.add_child(new St.Icon({
			icon_name: 'gnome-panel-clock',
			style_class: 'system-status-icon',
		}));

//~ new Clutter.cc -> set_content -> new Clutter.Canvas -> ctx
		const canvas = new Clutter.Canvas({ height: 400, width: 400 });
		canvas.connect('draw', (c, ctx, width, height) => {
			ctx.setSourceRGB(0,255,0);
			ctx.arc(128, 128, 76.8, 0, 45*Math.PI/180);
			ctx.fill();
		})

		canvas.invalidate();

		this.cc = new Clutter.Actor();
		this.cc.set_content(canvas);
		this.cc.set_x_expand(true);
		this.cc.set_y_expand(true);

		Main.layoutManager.addChrome(this.cc);
		//~ global.stage.add_actor(this.cc);	//脱离面板的顶层透明显示。
		this.cc.set_position(200,200);
		this.cc.set_clip(0, 0, 400, 400);
		this.cc.visible  = true;
		this.cc.opacity = 255;
		this.cc.reactive = true;

	}

	destroy() {
		Main.layoutManager.removeChrome(this.cc);
	}

});

class Extension {
	constructor(uuid) {
		this._uuid = uuid;

		ExtensionUtils.initTranslations();
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
