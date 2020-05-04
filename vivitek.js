var net = require('net');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;
	self.init_tcp();
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.status(self.STATUS_UNKNOWN, 'Connecting');

	// Initial connect to check status
	self.send('op status ?');
};

instance.prototype.init_tcp = function(cb) {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.host) {
		self.connecting = true;
		self.socket = new net.Socket();
		self.socket.setNoDelay(true);

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.status(self.STATE_ERROR, err);
			self.log('error',"Network error: " + err.message);
			self.connected = false;
			self.connecting = false;
			delete self.socket;
		});

		self.socket.on('connect', function () {
			if (self.currentStatus != self.STATUS_OK) {
				self.status(self.STATUS_OK, 'Connected');
			}

			self.connected = true;
		})

		self.socket.on('end', function () {
			self.connected = false;
			self.connecting = false;
		});

		self.socket.connect(7000, self.config.host);
	}
};

instance.prototype.send = function(cmd) {
	var self = this;

	if (self.connecting) {
		self.socket.write(cmd + "\r");
		self.log('debug',"Cmd Sent: " + cmd);
	} else {
		self.init_tcp(function () {
			self.socket.write(cmd + "\r");
			self.log('debug',"Cmd Sent: " + cmd);
		});
	}
};


// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 6,
			regex: self.REGEX_IP
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}
};


instance.prototype.actions = function(system) {
	var self = this;

	self.system.emit('instance_actions', self.id, {
		'powerOn':        { label: 'Power On Projector' },
		'powerOff':       { label: 'Power Off Projector' },
		'shutterOpen':    { label: 'Open Shutter' },
		'shutterClose':   { label: 'Close Shutter' }

	});
};

instance.prototype.action = function(action) {
	var self = this;
	var id = action.action;
	var cmd

	switch (id){

		case 'powerOn':
			cmd = 'op power.on';
			break;

		case 'powerOff':
			cmd = 'op power.off';
			break;

		case 'shutterOpen':
			cmd = 'op shutter -';
			break;

		case 'shutterClose':
			cmd = 'op shutter +';
			break;

	}

	if (cmd !== undefined) {
		self.send(cmd);
	}

	// debug('action():', action);

};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
