const { GObject, Clutter, GLib, St, PangoCairo, Pango } = imports.gi;

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

const xClock = Me.imports.Clock.xClock;
const size = 400;
let xc = null;
let menu = null;

const Indicator = GObject.registerClass(
	class Indicator extends PanelMenu.Button {
		_init() {
			super._init(0.0, _('Cairo Clock'));

			this.add_child(new St.Icon({
				icon_name : 'gnome-panel-clock',
				style_class : 'system-status-icon',
			}));

			xc = new xClock(400);
			menu = this.menu;
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
			item.reactive = false;
			item.actor.add_child(xc);
			this.menu.addMenuItem(item);
		}

		destroy() {
			//~ Main.layoutManager.removeChrome(this.cc);
			//~ this.cc.destroy();
			//~ global.stage.remove_child(this.cc);
			//~ delete this.cc;
			super.destroy();
		}
	});

let timeoutId = null;

class Extension {
	constructor(uuid) {
		this._uuid = uuid;

		ExtensionUtils.initTranslations();
	}

	enable() {
		timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
			const [h, m] = xc.get_alarm();
			if (h && m) {
				const d0 = new Date(); //时间
				let h0 = d0.getHours();
				h0 %= 12;
				const m0 = d0.getMinutes();
				if (h == h0 && m == m0) {
					const player = global.display.get_sound_player();
					player.play_from_theme('complete', 'countdown', null);
					if (menu) menu.open();
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
