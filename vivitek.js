const { InstanceBase, InstanceStatus, TCPHelper, Regex, runEntrypoint } = require('@companion-module/base')

const UpgradeScripts = require('./src/upgrades')

class vivitekInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		Object.assign(this, {
		
		})
	}

	async init(config) {
		this.configUpdated(config);
	}

	async configUpdated(config) {
		this.config = config

		this.initActions();

		this.init_tcp();
		this.updateStatus(InstanceStatus.Connecting);
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module will control Vivitek Projectors.'
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				regex: Regex.IP
			}
		]
	}

	async destroy() {
		//close out any connections

		if (this.socket !== undefined) {
			this.socket.destroy();
			delete this.socket;
		}

		this.debug('destroy', this.id);
	}

	initActions() {
		let actions = {};
	
		actions['powerOn'] = {
			name: 'Power On Projector',
			options: [],
			callback: (action) => {
				let cmd = 'op power.on';
				this.send(cmd);
			}
		}
	
		actions['powerOff'] = {
			name: 'Power Off Projector',
			options: [],
			callback: (action) => {
				let cmd = 'op power.off';
				this.send(cmd);
			}
		}
	
		actions['shutterOpen'] = {
			name: 'Open Shutter',
			options: [],
			callback: (action) => {
				let cmd = 'op shutter -\rop blank 0';
				this.send(cmd);
			}
		}
	
		actions['shutterClose'] = {
			name: 'Close Shutter',
			options: [],
			callback: (action) => {
				let cmd = 'op shutter +\rop blank 1';
				this.send(cmd);
			}
		}

		actions['blankOn'] = {
			name: 'Blank On',
			options: [],
			callback: (action) => {
				let cmd = 'op blank 1';
				this.send(cmd);
			}
		}

		actions['blankOff'] = {
			name: 'Blank Off',
			options: [],
			callback: (action) => {
				let cmd = 'op blank 0';
				this.send(cmd);
			}
		}
	
		this.setActionDefinitions(actions);
	}

	init_tcp () {
		let self = this;

		if (this.socket !== undefined) {
			this.socket.destroy();
			delete this.socket;
		}
	
		if (this.config.host) {
			this.socket = new TCPHelper(this.config.host, 7000);
	
			this.socket.on('connect', function () {
				self.updateStatus(InstanceStatus.Ok);
				self.log('debug', "Connected");
				self.send('op status ?');
			});

			this.socket.on('data', function (data) {
				self.log('debug', "Received: " + data);
			});

			this.socket.on('error', function (err) {
				self.updateStatus(InstanceStatus.Error, err);
				self.log('error', "Network error: " + err);
			});
		}
	}

	send(cmd) {
		if (this.socket !== undefined && this.socket.isConnected) {
			this.socket.send(cmd+"\r");
			this.log('debug',"Cmd Sent: " + cmd);
		}
		else {
			this.log('debug', 'Socket not connected :(');
		}
	}
}

runEntrypoint(vivitekInstance, UpgradeScripts);