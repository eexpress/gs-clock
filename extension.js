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

const Clock = Me.imports.Clock.Clock;

const size = 400;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
	_init() {
		super._init(0.0, _('Cairo Clock'));

		this.add_child(new St.Icon({
			icon_name: 'gnome-panel-clock',
			style_class: 'system-status-icon',
		}));

		this.cc = new Clock(400);
		//~ global.stage.add_child(this.cc);

		//~ Main.layoutManager.addChrome(this.cc);
		//~ this.cc.set_position(100,100);
		//~ this.cc.set_clip(0, 0, 400, 400);
		//~ this.cc.visible  = true;
		//~ this.cc.visible  = false;
		//~ this.cc.opacity = 200;
		//~ this.cc.reactive = true;
		//~ this.cc.queue_redraw();
		let item = new PopupMenu.PopupBaseMenuItem();
		item.actor.add_child(this.cc);
		this.menu.addMenuItem(item);
	}

	destroy() {
		//~ Main.layoutManager.removeChrome(this.cc);
		this.cc.destroy();
		global.stage.remove_child(this.cc);
		delete this.cc;
		super.destroy();
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
