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

const Indicator = GObject.registerClass(
	class Indicator extends PanelMenu.Button {
		_init() {
			super._init(0.0, _('Cairo Clock'));

			this.add_child(new St.Icon({
				icon_name : 'gnome-panel-clock',
				style_class : 'system-status-icon',
			}));

			xc = new xClock(400);
			global.stage.add_child(xc);
			//~ Main.layoutManager.addChrome(this.cc);
			xc.set_position(100,100);
			//~ this.cc.set_clip(0, 0, 400, 400);
			xc.visible  = true;
			//~ this.cc.visible  = false;
			//~ this.cc.opacity = 200;
			xc.reactive = true;
			//~ this.cc.queue_redraw();

			//~ let item = new PopupMenu.PopupBaseMenuItem();
			//~ item.reactive = false;
			//~ item.actor.add_child(xc);
			//~ this.menu.addMenuItem(item);
			this.connect("button-press-event", (actor, event)=>{
				const [x, y] = global.get_pointer();
				xc.set_position(x - size / 2, y + 50);
				xc.visible  = !xc.visible;
			});
		}

		destroy() {
			//~ Main.layoutManager.removeChrome(this.cc);
			//~ global.stage.remove_child(this.cc);
			//~ xc.destroy();
			//~ delete xc;
			super.destroy(); //Extension point conflict if no destroy.
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
