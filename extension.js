const { GObject, Clutter, GLib, St, PangoCairo, Pango } = imports.gi;

const Cairo = imports.cairo;
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

const xClock = Me.imports.Clock.xClock;
const size = 400;
let xc = null;
let pop_per_hour = false; //整点弹出报时。
let pt = null;

const Indicator = GObject.registerClass(
	class Indicator extends PanelMenu.Button {
		_init() {
			super._init(0.0, _('Cairo Clock'));

			this.add_child(new St.Icon({
				icon_name : 'gnome-panel-clock',
				style_class : 'system-status-icon',
			}));

			xc = new xClock(400);
			//~ global.stage.add_child(xc);
			Main.layoutManager.addChrome(xc);
			xc.visible = false;
			xc.reactive = true;

			this.width = 50;
			this.background_color = Clutter.Color.from_string("gray")[1];
			this.connect("button-press-event", (actor, event) => {
				const altkey = event.get_state() & Clutter.ModifierType.MOD1_MASK;
				const ctrlkey = event.get_state() & Clutter.ModifierType.CONTROL_MASK;
				if (altkey) {
					pop_per_hour = !pop_per_hour;
					this.background_color = Clutter.Color.from_string(pop_per_hour ? "green" : "gray")[1];
					return Clutter.EVENT_STOP;
				}
				if (ctrlkey) {
					this.alarm();
					return Clutter.EVENT_STOP;
				}
				const [x, y] = global.get_pointer();
				xc.set_position(x - size / 2 + 10, y + 30);
				xc.visible = !xc.visible;
				if (xc.visible) this.pt();

				return Clutter.EVENT_STOP;
			});
		}

		pt() {
			const pn = [ 'rotation-angle-x', 'rotation-angle-y', 'rotation-angle-z' ];
			const pname = pn[Math.floor(Math.random() * 12) % pn.length];
			pt = new Clutter.PropertyTransition({ property_name : pname, remove_on_complete : true });
			pt.set_from(180); // Clutter.Transition
			pt.set_to(0);
			pt.set_duration(300); // Clutter.Timeline
			pt.set_progress_mode(Clutter.AnimationMode.LINEAR);
			//~ https://gjs-docs.gnome.org/clutter9~9_api/clutter.animationmode
			xc.add_transition(pname, pt);
			pt.start();
		};

		alarm() {
			const player = global.display.get_sound_player();
			player.play_from_theme('complete', 'countdown', null);
			xc.visible = true;
			xc.swing();
		}

		destroy() {
			Main.layoutManager.removeChrome(xc);
			//~ global.stage.remove_child(xc);
			xc.destroy();
			super.destroy(); // Extension point conflict if no destroy.
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
			const d0 = new Date();
			const m0 = d0.getMinutes();
			if (h && m) {
				let h0 = d0.getHours();
				h0 %= 12;
				if (h == h0 && m == m0) this._indicator.alarm();
			}
			if (pop_per_hour) { //整点弹出报时
				const s0 = d0.getSeconds();
				if (m0 == 0 && s0 < 10)
					//~ if(s0 < 10)//1分钟测试用
					this._indicator.alarm();
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
