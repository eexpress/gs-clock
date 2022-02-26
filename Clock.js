const Cairo = imports.cairo;
const { Clutter, Gio, GObject, GLib, Gtk } = imports.gi;

var Clock = GObject.registerClass({
	Properties : {},
	Signals : {
		"child-hovered-event" : { param_types : [ GObject.TYPE_INT ] },
	}
},
class Clock extends Clutter.Actor {
	_init(params = {}) {
		super._init(params);
		const canvas = new Clutter.Canvas({ height: 400, width: 400 });
		canvas.connect('draw', (c, ctx, width, height) => {
			ctx.setSourceRGB(0,255,0);
			ctx.arc(128, 128, 76.8, 0, 45*Math.PI/180);
			ctx.fill();
		})

		canvas.invalidate();

		const actor = new Clutter.Actor();
		actor.set_content(canvas);
		actor.set_x_expand(true);
		actor.set_y_expand(true);

		//~ return actor;
	}

});
