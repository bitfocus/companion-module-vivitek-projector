var tcp = require('../../tcp');
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


	self.init_tcp();
	// Initial connect to check status
	self.send('op status ?');
};

instance.prototype.init_tcp = function () {
	var self = this;

	// var connected = false;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	if (self.config.host) {
		self.socket = new tcp(self.config.host, 7000);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			self.log('debug', "Network error", err);
			self.status(self.STATE_ERROR, err);
			self.log('error', "Network error: " + err.message);
		});

		self.socket.on('connect', function () {
			self.status(self.STATE_OK);
			self.log('debug', "Connected");
		});
	}
};

instance.prototype.send = function(cmd) {
	var self = this;

	if (self.socket !== undefined && self.socket.connected) {
		self.socket.send(cmd+"\r");
		self.log('debug',"Cmd Sent: " + cmd);
	}
	else {
		self.log('debug', 'Socket not connected :(');
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
		'shutterClose':   { label: 'Close Shutter' },
		'Blank':		  { label: 'Blank Image' },
		'BlankRestore':   { label: 'Restore Image' }

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
			//Some projectors require the shutter command and some use blank
			cmd = 'op shutter -\rop blank 0';
			break;

		case 'shutterClose':
			//Some projectors require the shutter command and some use blank
			cmd = 'op shutter +\rop blank 1';
			break;
		
		case 'Blank':
			//DU7098Z does not react to cmd syntax in the shutterOpen and shutterClose case.  Created for explict function
			cmd = 'OP BLANK=1';
			break;

		case 'BlankRestore':
			cmd = 'OP BLANK=0';
			break;

	}

	if (cmd !== undefined) {
		self.send(cmd);
	}

	// debug('action():', action);

};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
